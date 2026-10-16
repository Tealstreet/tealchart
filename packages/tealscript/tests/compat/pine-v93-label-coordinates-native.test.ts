import type { Proof, Source } from './labelCoordinatesV93';

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { attempts, directory, json, paths, proof, read, replay, sessions, sourceIds } from './labelCoordinatesV93';

interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; timeRaw: string;
  title: string; raw: string; frozenExpected: string | null }
interface Property { sourceId: string; inputMode: number; property: string; criterionVerdict: string;
  hypothesis: string; nativeCellPointers: Pointer[] }
const controls = json<{ results: Property[] }>(directory + 'numeric-controls-v5.json').results
  .filter(property => sourceIds.includes(property.sourceId));
const previous = ['INPUT_CLOSE', 'ANCHOR_TIME', 'ANCHOR_HIGH', 'ANCHOR_LOW'];

describe('v93 label coordinates: six independent native input sessions', () => {
  it('binds all six PNG/CSV pairs, exact sources and v5 integrity/validation by SHA', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const integrity = json<{ version: string; selfExcluded: boolean; files: Proof[] }>(directory + 'artifact-integrity-v5.json');
    expect([integrity.version, integrity.selfExcluded]).toEqual(['v5', true]);
    expect(paths).toHaveLength(62);
    expect(new Set(paths).size).toBe(62);
    for (const path of paths) {
      expect(lock.files.find(file => file.path === path)).toEqual(proof(path));
      if (!path.endsWith('/artifact-integrity-v5.json')) expect(integrity.files.find(file => file.path === path)).toEqual(proof(path));
    }
    expect(json(directory + 'validation-result-v5.json')).toMatchObject({ version: 'v5',
      status: 'PASS;28-attempt and31-session progress snapshot; layout checkpoint remains12 sources',
      exactPrivateSaveAttempts: 28, nativeCsvBindings: 31, nativePngBindings: 18 });
  });

  it('authenticates the two unchanged Save/Add runs and their separate 0→1→2 sessions', () => {
    expect(attempts.map(attempt => attempt.source.sourceId)).toEqual(sourceIds);
    expect(sessions).toHaveLength(6);
    expect(new Set(attempts.map(attempt => attempt.source.privateScriptId)).size).toBe(2);
    for (const attempt of attempts) {
      const source = attempt.source;
      const prefix = `${directory}${source.sourceId}/attempt-v1/`;
      expect(json(prefix + 'observation-v1.json')).toEqual(source);
      expect([source.item, source.nativeCompileSuccess, source.privateVersion, attempt.status, attempt.removed]).toEqual([5, true, '1.0', 'CAPTURED', true]);
      expect([source.nativeStudyInstanceId, source.separateMarkerArrays]).toEqual([null, null]);
      expect(source.nativeWarningChannel).toEqual([]);
      expect(source.executed).toEqual(proof(source.executed.path));
      expect(source.sourceSha256).toBe(source.executed.sha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      const form = read(prefix + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      for (const body of [source.saveBody, source.addBody]) {
        expect(body).toEqual(proof(body.path));
        expect(json(body.path)).toMatchObject({ success: true, result: { metaInfo: {
          id: `Script$${source.privateScriptId}@tv-scripting-101`, pine: { version: '1.0' }, warnings: [] } } });
      }
      const receipt = json<{ sessions: { inputMode: number; sourceSha256: string }[] }>(source.receipt.path);
      expect(source.receipt).toEqual(proof(source.receipt.path));
      expect(receipt.sessions.map(session => session.inputMode)).toEqual([0, 1, 2]);
      expect(receipt.sessions.every(session => session.sourceSha256 === source.sourceSha256)).toBe(true);
      for (const entry of sessions.filter(entry => entry.source === source)) {
        expect(json(entry.prefix + 'session-receipt-v1.json')).toEqual(receipt.sessions[entry.mode]);
        expect(json(entry.prefix + 'row-set-observation-v1.json')).toEqual(entry.session);
      }
    }
  });

  it('rederives all closure masks and preserves developing and predecessor-less native values without credit', () => {
    let rows = 0, closed = 0, developingCells = 0, firstPredecessorCells = 0;
    for (const { data, mask, session } of sessions) {
      const cell = (row: string[], title: string) => row[data.columns.indexOf(title)];
      const pointers: typeof session.closedRunRawPointers = [];
      expect(mask.rows).toHaveLength(data.rows.length);
      expect([data.rows.length, data.columns.length]).toEqual([session.dataRows, session.columnCount]);
      data.rows.forEach((row, index) => {
        const close = Number(row[0]) + 120;
        const eligible = cell(row, 'CHART_CONFIRMED') === '1' && close * 1000 <= Date.parse(session.nativeObservationUtc);
        expect(row).toHaveLength(17);
        expect(mask.rows[index]).toEqual([session.csv.sha256, String(index + 1), row[0], cell(row, 'INPUT_TIME'),
          cell(row, 'INPUT_INDEX'), cell(row, 'CHART_CONFIRMED'), session.nativeObservationUtc, String(close),
          eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED', '[]',
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        rows++;
        if (eligible) {
          closed++;
          pointers.push({ rowOrdinal: index + 1, timeRaw: row[0], indexRaw: cell(row, 'INPUT_INDEX') });
        } else {
          expect(row.slice(5).every(raw => raw !== '')).toBe(true);
          developingCells += row.slice(5).length;
        }
        if (index === 0) {
          // They are present observations, but their predecessor is not retained.
          for (const title of previous) expect(cell(row, title)).not.toBe('');
          firstPredecessorCells += previous.length;
        } else {
          expect(Number(row[0]) - Number(data.rows[index - 1][0])).toBe(120);
          expect(Number(cell(row, 'INPUT_INDEX')) - Number(cell(data.rows[index - 1], 'INPUT_INDEX'))).toBe(1);
        }
      });
      expect(pointers).toEqual(session.closedRunRawPointers);
      expect(pointers).toHaveLength(session.independentlyClosedRows);
    }
    expect([rows, closed, developingCells, firstPredecessorCells]).toEqual([2091, 2085, 72, 24]);
  });

  for (const entry of sessions) {
    const { source, mode, session, data, mask, region } = entry;
    it(`${source.sourceId} mode${mode}: exact closed getters and prior-candle controls`, () => {
      const { result, checked } = replay(entry);
      expect(checked.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.plots.map(plot => plot.title)).toEqual(data.columns.slice(5));
      const cell = (row: string[], title: string) => row[data.columns.indexOf(title)];
      const value = (title: string, index: number) => result.plots[data.columns.indexOf(title) - 5].values[index];
      let comparisons = 0;
      data.rows.forEach((row, index) => {
        if (mask.rows[index][8] !== '1') return;
        for (const [title, raw] of Object.entries({ YLOC_MODE: String(mode), TIME_X_DELTA: '0', RETURN_X_REL: '-1', POINT_X_REL: '-1' })) {
          expect(cell(row, title)).toBe(raw);
          expect(value(title, index), `${source.sourceId}:${mode}:${index}:${title}`).toBe(Number(raw));
          comparisons++;
        }
        if (mode === 0) expect(cell(row, 'LABEL_GET_Y')).toBe(cell(row, 'INPUT_CLOSE'));
        // Prior values and get_y need a retained predecessor for engine replay.
        // Modes1/2 get_y is actual numeric output only; it is never rendering proof.
        if (index === 0) return;
        const prior = data.rows[index - 1];
        const expected = [prior[4], String(Number(prior[0]) * 1000), prior[2], prior[3]];
        previous.forEach((title, ordinal) => {
          expect(cell(row, title)).toBe(expected[ordinal]);
          expect(value(title, index)).toBe(Number(cell(row, title)));
          comparisons++;
        });
        expect(value('LABEL_GET_Y', index)).toBe(Number(cell(row, 'LABEL_GET_Y')));
        comparisons++;
      });
      expect(comparisons).toBe(session.independentlyClosedRows * 4 + (session.independentlyClosedRows - 1) * 5);
      const properties = controls.filter(property => property.sourceId === source.sourceId && property.inputMode === mode);
      expect(properties).toHaveLength(9);
      for (const property of properties) {
        expect([property.criterionVerdict, property.hypothesis]).toEqual(['CAPTURED', property.property === 'LABEL_GET_Y' && mode !== 0 ? 'UNDECIDED' : 'SUPPORTED']);
        expect(property.nativeCellPointers).toHaveLength(32);
        property.nativeCellPointers.forEach((pointer, index) => {
          const rowIndex = pointer.rowOrdinal - 1;
          expect(rowIndex).toBe(index + (previous.includes(property.property) ? 1 : 0));
          expect(pointer.csvSha256).toBe(session.csv.sha256);
          expect(pointer.timeRaw).toBe(data.rows[rowIndex][0]);
          expect(pointer.columnOrdinal).toBe(data.columns.indexOf(property.property) + 1);
          expect(mask.rows[rowIndex][8]).toBe('1');
          expect(pointer.raw).toBe(cell(data.rows[rowIndex], property.property));
          expect(pointer.frozenExpected).toBe(property.property === 'LABEL_GET_Y' && mode !== 0
            ? null : cell(data.rows[rowIndex], property.property));
        });
      }
      const binding = json<{ csv: Proof; source: Source; inputMode: number; columns: { columnOrdinal: number;
        originalHeader: string; owner: string; sourceSha256?: string; privateVersion?: string; nativePlotId?: string; nativePlotTitle?: string }[] }>(session.columnBindings.path);
      expect(binding.csv).toEqual(session.csv);
      expect(binding.source).toEqual(source);
      expect(binding.inputMode).toBe(mode);
      binding.columns.forEach((column, ordinal) => {
        expect([column.columnOrdinal, column.originalHeader]).toEqual([ordinal + 1, data.columns[ordinal]]);
        if (ordinal >= 5) expect(column).toMatchObject({ owner: source.privateScriptId, sourceSha256: source.sourceSha256,
          privateVersion: '1.0', nativePlotId: `plot_${ordinal - 5}`, nativePlotTitle: data.columns[ordinal] });
      });
    });

    it(`${source.sourceId} mode${mode}: binds native screenshot placement to its closed preceding candle`, () => {
      expect([region.sourceId, region.sourceSha256, region.privateScriptId, region.privateVersion, region.inputMode, region.inputName])
        .toEqual([source.sourceId, source.sourceSha256, source.privateScriptId, '1.0', mode, 'YLOC_MODE']);
      expect(region.csv).toEqual(session.csv);
      expect(region.screenshot).toMatchObject(proof(region.screenshot.path));
      expect(session.nativeScreenshot).toMatchObject(proof(session.nativeScreenshot.path));
      expect(proof(region.screenshot.path)).toEqual(proof(session.nativeScreenshot.path));
      expect(region.sessionReceipt).toEqual(proof(entry.prefix + 'session-receipt-v1.json'));
      expect(region.screenshot.dimensionsPixels).toEqual([1706, 993]);
      expect(region.nativeFeedFrameAsOfClock).toBeNull();
      const anchor = region.anchor;
      const row = data.rows[anchor.currentSourceRowOrdinal - 1];
      const prior = data.rows[anchor.referencedChartRowOrdinal - 1];
      expect(anchor.referencedChartRowOrdinal).toBe(anchor.currentSourceRowOrdinal - 1);
      expect([anchor.sourceRowNativeConfirmedRaw, anchor.sourceRowStrictNumericCredit, anchor.referencedCandleIndependentlyClosed]).toEqual(['0', 0, true]);
      expect(mask.rows[anchor.currentSourceRowOrdinal - 1][8]).toBe('0');
      expect(mask.rows[anchor.referencedChartRowOrdinal - 1][8]).toBe('1');
      expect(prior[0]).toBe(anchor.referencedChartTimeRawSeconds);
      expect(prior.slice(1, 5)).toEqual(Object.values(anchor.referencedChartOHLC));
      for (const pointer of anchor.inputCellPointers) {
        expect(pointer.csvSha256).toBe(session.csv.sha256);
        expect(pointer.rowOrdinal).toBe(anchor.currentSourceRowOrdinal);
        expect(data.columns[pointer.columnOrdinal - 1]).toBe(pointer.title);
        expect(pointer.raw).toBe(row[pointer.columnOrdinal - 1]);
        expect(pointer.cellStatus).toContain('OBSERVED / EXCLUDED');
      }
      const visible = region.visibleTimeContext.atLeast32ClosedBars;
      expect(visible.rowOrdinals).toHaveLength(32);
      visible.rowOrdinals.forEach((ordinal, index) => {
        expect(mask.rows[ordinal - 1][8]).toBe('1');
        expect(ordinal).toBe(visible.rowOrdinals[0] + index);
      });
      const map = region.axisMapping;
      const y = (price: string) => map.price81300AtYPixel + (Number(price) - 81300) * (map.price81400AtYPixel - map.price81300AtYPixel) / 100;
      const [left, top, right, bottom] = region.properties[0].pixelRegionXYXY;
      expect([region.properties[0].criterionVerdict, region.properties[0].hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
      expect(left).toBeLessThan(anchor.nativeCandleXApproxPixels);
      expect(right).toBeGreaterThan(anchor.nativeCandleXApproxPixels);
      if (mode === 0) expect(Math.abs((top + bottom) / 2 - y(anchor.referencedChartOHLC.close))).toBeLessThanOrEqual(map.manualPixelUncertainty);
      if (mode === 1) expect(bottom + map.manualPixelUncertainty).toBeLessThan(y(anchor.referencedChartOHLC.high));
      if (mode === 2) expect(top - map.manualPixelUncertainty).toBeGreaterThan(y(anchor.referencedChartOHLC.low));
      // Native region inequalities establish topology, never exact renderer pixels.
    });
  }
});
