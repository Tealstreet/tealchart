import type { BoxDrawingOutput, TableDrawingOutput } from '../../src/runtime/context';
import type { Proof, Property, Source } from './boxTableV93';

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { pineColorConstant } from '../../src/pineColorConstants';
import { attempts, directory, entries, json, paths, proof, read, replay, sourceIds } from './boxTableV93';

interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; timeRaw: string; title: string; raw: string; frozenExpected: string; expectedNativeMissing: boolean }
const controls = json<{ results: (Property & { sourceId: string; nativeCellPointers: Pointer[] })[] }>(directory + 'numeric-controls-v6.json')
  .results.filter(property => sourceIds.includes(property.sourceId));
const facets = json<{ facets: { sourceId: string; properties: Property[] }[] }>(directory + 'facet-capabilities-v6.json')
  .facets.filter(facet => sourceIds.includes(facet.sourceId));

describe('v93 box text and table setters: native local-control contracts', () => {
  it('SHA-binds only four sources and the v6 evidence, including all PNGs and exclusions', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const integrity = json<{ version: string; selfExcluded: boolean; files: Proof[] }>(directory + 'artifact-integrity-v6.json');
    expect([integrity.version, integrity.selfExcluded]).toEqual(['v6', true]);
    expect(paths).toHaveLength(65);
    expect(new Set(paths).size).toBe(65);
    for (const path of paths) {
      expect(lock.files.find(file => file.path === path)).toEqual(proof(path));
      if (!path.endsWith('/artifact-integrity-v6.json')) expect(integrity.files.find(file => file.path === path)).toEqual(proof(path));
    }
    expect(json(directory + 'validation-result-v6.json')).toMatchObject({ version: 'v6',
      status: 'PASS;36-attempt and38-session progress snapshot; layout checkpoint remains12 sources',
      exactPrivateSaveAttempts: 36, nativeCsvBindings: 38, nativePngBindings: 25 });
  });

  it('authenticates four independent exact-source Save/Add/private-version bindings', () => {
    expect(attempts.map(attempt => attempt.source.sourceId)).toEqual(sourceIds);
    expect(new Set(entries.map(entry => entry.source.privateScriptId)).size).toBe(4);
    for (const { source, prefix, session, region } of entries) {
      expect(json(prefix + 'observation-v1.json')).toEqual(source);
      expect(source.executed).toEqual(proof(source.executed.path));
      expect(source.sourceSha256).toBe(source.executed.sha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      const form = read(prefix + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      expect([source.privateVersion, source.nativeCompileSuccess, source.nativeStudyInstanceId, source.separateMarkerArrays]).toEqual(['1.0', true, null, null]);
      expect(source.nativeWarningChannel).toEqual([]);
      for (const body of [source.saveBody, source.addBody]) {
        expect(body).toEqual(proof(body.path));
        expect(json(body.path)).toMatchObject({ success: true, result: { metaInfo: {
          id: `Script$${source.privateScriptId}@tv-scripting-101`, pine: { version: '1.0' }, warnings: [] } } });
      }
      expect(source.receipt).toEqual(proof(source.receipt.path));
      expect(json(source.receipt.path)).toMatchObject({ sourceExact: true, sourceSha256: source.sourceSha256, removed: true });
      expect(json(prefix + 'session-mode0-v1/row-set-observation-v1.json')).toEqual(session);
      expect(region.sessionReceipt).toEqual(proof(region.sessionReceipt.path));
      expect(json(region.sessionReceipt.path)).toMatchObject({ source: source.sourceId, sourceSha256: source.sourceSha256, inputMode: 0 });
      const binding = json<{ source: Source; csv: Proof; columns: { columnOrdinal: number; originalHeader: string; owner: string;
        sourceSha256?: string; privateVersion?: string; nativePlotTitle?: string; nativePlotId?: string }[] }>(session.columnBindings.path);
      expect(binding.source).toEqual(source);
      expect(binding.csv).toEqual(session.csv);
      const data = entries.find(entry => entry.source === source)!.data;
      binding.columns.forEach((column, ordinal) => {
        expect([column.columnOrdinal, column.originalHeader]).toEqual([ordinal + 1, data.columns[ordinal]]);
        if (ordinal >= 5) expect(column).toMatchObject({ owner: source.privateScriptId, privateVersion: '1.0',
          sourceSha256: source.sourceSha256, nativePlotTitle: data.columns[ordinal], nativePlotId: `plot_${ordinal - 5}` });
      });
    }
  });

  it('rederives every closed mask and excludes all developing values from numeric credit', () => {
    let rows = 0, closed = 0, excludedCells = 0;
    for (const { data, mask, session } of entries) {
      const cell = (row: string[], title: string) => row[data.columns.indexOf(title)];
      const pointers: typeof session.closedRunRawPointers = [];
      expect(mask.rows).toHaveLength(data.rows.length);
      data.rows.forEach((row, index) => {
        const close = Number(row[0]) + 120;
        const eligible = cell(row, 'CHART_CONFIRMED') === '1' && close * 1000 <= Date.parse(session.nativeObservationUtc);
        expect(mask.rows[index]).toEqual([session.csv.sha256, String(index + 1), row[0], cell(row, 'INPUT_TIME'),
          cell(row, 'INPUT_INDEX'), cell(row, 'CHART_CONFIRMED'), session.nativeObservationUtc, String(close),
          eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED', '[]',
          eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED']);
        rows++;
        if (eligible) { closed++; pointers.push({ rowOrdinal: index + 1, timeRaw: row[0], indexRaw: cell(row, 'INPUT_INDEX') }); }
        else { expect(row.slice(5).every(value => value !== '')).toBe(true); excludedCells += row.slice(5).length; }
      });
      expect(pointers).toEqual(session.closedRunRawPointers);
      expect(pointers).toHaveLength(session.independentlyClosedRows);
    }
    expect([rows, closed, excludedCells]).toEqual([1430, 1426, 20]);
  });

  for (const entry of entries) {
    const { source, data, session, mask, region } = entry;
    it(`${source.sourceId}: exact closed 0/100 or 0/10 geometry controls`, () => {
      const { result, checked } = replay(entry);
      expect(checked.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.plots.map(plot => plot.title)).toEqual(data.columns.slice(5));
      const properties = controls.filter(property => property.sourceId === source.sourceId);
      expect(properties).toHaveLength(2);
      const expected = source.item === 6 ? ['0', '100'] : ['0', '10'];
      for (const [ordinal, property] of properties.entries()) {
        const column = data.columns.indexOf(property.property);
        data.rows.forEach((row, index) => {
          expect(row[column]).toBe(expected[ordinal]);
          if (mask.rows[index][8] === '1') expect(result.plots[column - 5].values[index]).toBe(Number(row[column]));
        });
        expect(property.nativeCellPointers).toHaveLength(32);
        property.nativeCellPointers.forEach((pointer, index) => {
          expect(pointer).toEqual({ csvSha256: session.csv.sha256, rowOrdinal: index + 1, columnOrdinal: column + 1,
            timeRaw: data.rows[index][0], title: property.property, raw: expected[ordinal], frozenExpected: expected[ordinal], expectedNativeMissing: false });
          expect(mask.rows[index][8]).toBe('1');
        });
      }
    });

    it(`${source.sourceId}: binds the measured PNG and bounded observed/held properties`, () => {
      expect(region).toMatchObject({ sourceId: source.sourceId, sourceSha256: source.sourceSha256,
        privateScriptId: source.privateScriptId, privateVersion: '1.0', csv: session.csv,
        originalImageAltered: false, nativeFeedFrameAsOfClock: null });
      expect(region.screenshot).toMatchObject(proof(region.screenshot.path));
      expect(region.screenshot.dimensionsPixels).toEqual([1706, 993]);
      expect(session.nativeScreenshot.path).toBe(region.screenshot.path);
      const visible = region.visibleClosed32BarRun;
      expect(visible.rowOrdinals).toHaveLength(32);
      visible.rowOrdinals.forEach((ordinal, index) => {
        expect(ordinal).toBe(visible.rowOrdinals[0] + index);
        expect(mask.rows[ordinal - 1][8]).toBe('1');
      });
      const facet = facets.find(facet => facet.sourceId === source.sourceId)!;
      expect(facet.properties.slice(2)).toEqual(region.properties);
      if (source.item === 6) {
        expect(region.properties[0]).toMatchObject({ property: 'Full literal set_text string', criterionVerdict: 'NOT OBSERVED', hypothesis: 'UNDECIDED' });
        expect(region.properties.slice(1).every(property => property.criterionVerdict === 'CAPTURED' && property.hypothesis === 'SUPPORTED')).toBe(true);
        expect(region.namedNativeFontFamily).toBeNull();
        expect(region.clipping).toContain('Full rendered literal strings remain NOT OBSERVED');
        expect(region.currentSourceBar).toMatchObject({ csvRowOrdinal: data.rows.length, nativeConfirmedRaw: '0', strictClosedNumericCredit: 0 });
        expect(mask.rows.at(-1)![8]).toBe('0');
        const ranges = [[-28, -20], [-18, -10], [-8, 0]];
        region.currentFrontBoxes!.forEach((box, index) => {
          expect(box.sourceYBounds).toEqual([90, 10]);
          expect([box.leftTimeRawSeconds, box.rightTimeRawSeconds]).toEqual(ranges[index].map(offset => Number(data.rows.at(-1)![0]) + offset * 120));
        });
      } else {
        expect(region.properties.every(property => property.criterionVerdict === 'CAPTURED' && property.hypothesis === 'SUPPORTED')).toBe(true);
        expect(region.nativeTableGetterClaim).toBe(false);
        expect(region.captionOverlapLimit).toContain('Do not claim full first-row text readability');
      }
    });

    if (source.item === 6) {
      it(`${source.sourceId}: setter output matches its constructor's witnessed text attributes`, () => {
        const { result, bars } = replay(entry);
        const boxes = result.drawings.filter((drawing): drawing is BoxDrawingOutput => drawing.type === 'box');
        expect(boxes).toHaveLength(3);
        const [control, changed, sentinel] = boxes;
        const attributes = { textSize: 'normal', textColor: pineColorConstant('blue', source.pineVersion),
          textHalign: 'left', textValign: 'top', textWrap: 'auto', textFontFamily: 'monospace',
          textFormatting: source.pineVersion === 6 ? 'bolditalic' : 'none' };
        expect(control).toMatchObject(attributes);
        expect(changed).toMatchObject(attributes);
        expect(changed.text.startsWith('WRAP ME')).toBe(true);
        expect(changed.text.startsWith('OLD')).toBe(false);
        expect(sentinel).toMatchObject({ textColor: pineColorConstant('red', source.pineVersion), textWrap: 'none', textFormatting: 'none' });
        boxes.forEach((box, index) => expect([box.left, box.right, box.top, box.bottom]).toEqual([
          bars.length - 1 + [-28, -18, -8][index], bars.length - 1 + [-20, -10, 0][index], 90, 10]));
        // No full rendered literal, native text getter or OS font identity credit.
      });
    } else {
      it(`${source.sourceId}: only the final table position and local styling controls are encoded`, () => {
        const { result } = replay(entry);
        const tables = result.drawings.filter((drawing): drawing is TableDrawingOutput => drawing.type === 'table');
        expect(tables.map(table => table.position)).toEqual(['top_left', 'top_right']);
        const attributes = { columns: 2, rows: 2, bgcolor: pineColorConstant('yellow', source.pineVersion),
          frameColor: pineColorConstant('blue', source.pineVersion), frameWidth: 5,
          borderColor: pineColorConstant('red', source.pineVersion), borderWidth: 3 };
        tables.forEach(table => {
          expect(table).toMatchObject(attributes);
          expect(table.cells).toHaveLength(4);
          expect(table.cells.every(cell => cell.bgcolor === null)).toBe(true);
        });
        // No claim that either intermediate same-execution position was rendered.
      });
    }
  }

  it('retains the v5 prior-object strip exclusion and unresolved Control+ArrowUp zoom outcome', () => {
    const entry = entries[0];
    expect(entry.region.priorObjectFragments).toContain('Exclude strips x1013..1019,1073..1079,1133..1139');
    expect(entry.region.viewportActions).toHaveLength(1);
    expect(entry.region.viewportActions[0].observedOutcome).toContain('actual zoom increase is UNOBSERVED');
    expect(json(entry.prefix + 'viewport-action-observation-v1.json')).toMatchObject({
      actualZoomIncrease: 'UNOBSERVED', observedBeforeAfterBarSpacingApproxPixels: [6, 6], otherScalingOrPaneResizeActions: 0 });
  });
});
