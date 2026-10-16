import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof { path: string; bytes: number; sha256: string }
interface Source {
  sourceId: string; item: number; pineVersion: number; requestSource: string; sourceSha256: string;
  executed: Proof; privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean;
  saveBody: Proof; addBody: Proof; receipt: Proof;
}
interface RowSet {
  sourceId: string; csv: Proof; dataRows: number; columnCount: number; independentlyClosedRows: number;
  nativeObservationUtc: string; closureMask: Proof; columnBindings: Proof;
  rawFirstRow: string[]; rawLastRow: string[]; required32RowCriterion: string;
  nativeScreenshot: Proof & { dimensionsPixels: number[] };
}
interface Cell {
  csvSha256: string; rowOrdinal: number; columnOrdinal: number; timeRaw: string;
  title: string; raw: string; frozenExpected: string; expectedNativeMissing: boolean;
}
interface Property {
  sourceId: string; inputMode: number; property: string; criterionVerdict: string; hypothesis: string;
  nativeCellPointers?: Cell[]; pixelRegionXYXY?: number[]; nativeVisualObservation?: string;
}
interface Region {
  sourceId: string; sourceSha256: string; privateScriptId: string; privateVersion: string; inputMode: number;
  screenshot: RowSet['nativeScreenshot']; csv: Proof; sessionReceipt: Proof;
  properties: Property[]; currentActualNumericContext: Array<{ rowOrdinal: number; columnOrdinal: number; raw: string; cellStatus: string }>;
  nativeColorGetter: null; crossSessionIdentityOrIntrabarTransitionClaim: boolean;
  crossVersionPixelEqualityClaim: boolean;
  visibleClosed32BarRun: { rowOrdinals: number[]; notAnAssertionOfHistoricObjectIdentity: boolean };
}

const root = 'v93/captures/v93/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
const proof = (path: string): Proof => ({ path, bytes: bytes(path).length,
  sha256: createHash('sha256').update(bytes(path)).digest('hex') });
const csv = (path: string) => {
  const [columns, ...rows] = read(path).trimEnd().split(/\r?\n/).map(line => line.split(','));
  return { columns, rows };
};
const common = ['RESPONSE-v93-v7.md', 'attempt-inventory-v7.json', 'facet-capabilities-v7.json',
  'numeric-controls-v7.json', 'artifact-integrity-v7.json', 'validation-result-v7.json'];
const sourceFiles = ['executed-v1.pine', 'observation-v1.json', 'save-request-v1.txt',
  'save-response-v1.json', 'add-response-v1.json', 'capture-receipt-v3.json'];
const sessionFiles = ['chart-native-v1.csv', 'row-closure-mask-v1.csv', 'column-bindings-v1.json',
  'row-set-observation-v1.json', 'render-v1.png', 'derived-region-map-v1.json', 'session-receipt-v1.json'];
const inventory = json<{ attempts: Array<{ source: Source; sessions: RowSet[] }> }>(root + 'attempt-inventory-v7.json');
const attempts = inventory.attempts.filter(attempt => attempt.source.item === 9);
const facets = json<{ facets: Array<{ item: number; sourceId: string; inputMode: number;
  nativeScreenshot: RowSet['nativeScreenshot']; derivedRegionMap: string; properties: Property[]; boundary: string }> }>(root + 'facet-capabilities-v7.json')
  .facets.filter(facet => facet.item === 9);
const numeric = json<{ results: Property[] }>(root + 'numeric-controls-v7.json').results
  .filter(property => property.sourceId.startsWith('v93-linefill-state-'));
const paths = common.map(file => root + file).concat(attempts.flatMap(({ source }) => {
  const directory = root + source.sourceId + '/attempt-v1/';
  return [source.requestSource, ...sourceFiles.map(file => directory + file),
    ...[0, 1, 2].flatMap(mode => sessionFiles.map(file => `${directory}session-mode${mode}-v1/${file}`))];
}));
const sessions = attempts.flatMap(({ source, sessions: rowSets }) => rowSets.map((rowSet, mode) => {
  const directory = `${root}${source.sourceId}/attempt-v1/session-mode${mode}-v1/`;
  return { source, mode, rowSet, directory, data: csv(rowSet.csv.path), mask: csv(rowSet.closureMask.path),
    region: json<Region>(directory + 'derived-region-map-v1.json') };
}));
const titles = ['FILL_MODE', 'BASELINE_COUNT', 'CREATED_COUNT', 'LINE1_IDENTITY', 'LINE2_IDENTITY',
  'FOLLOW_Y1', 'FOLLOW_Y2', 'RETAINED_COUNT', 'SCALE_ZERO', 'SCALE_FORTY', 'INPUT_INDEX', 'INPUT_TIME', 'CHART_CONFIRMED'];
const vector = (mode: number) => [mode, 0, 1, 1, 1, mode === 0 ? 10 : 20, mode === 0 ? 20 : 30, mode === 2 ? 0 : 1, 0, 40];

function replay(session: typeof sessions[number]) {
  const ast = parse(read(session.source.executed.path));
  expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success, JSON.stringify(compiled.unsupported)).toBe(true);
  if (!compiled.success) throw new Error('Exact native linefill source must compile');
  const closed = session.data.rows.filter((_, index) => session.mask.rows[index][8] === '1');
  // Volume is absent and unused. No synthetic history or absolute bar-index seed.
  const bars: Bar[] = closed.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]),
    high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number.NaN }));
  const defaults = executeCompiled(compiled, bars.slice(0, 1))!;
  const input = defaults.inputs.find(input => input.title === 'FILL_MODE')!;
  expect(input).toBeDefined();
  const result = executeCompiled(compiled, bars, new Map([[input.id, session.mode]]))!;
  expect(result.errors).toEqual([]);
  expect(result.plots.map(plot => plot.title)).toEqual(titles);
  return { closed, result };
}

describe('v93 linefill same-execution native contracts, with recalculation identity held', () => {
  it('binds only this family and the v7 inventory/integrity/validation by immutable SHA', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { files: Proof[] };
    const integrity = json<{ selfExcluded: boolean; files: Proof[] }>(root + 'artifact-integrity-v7.json');
    expect([paths.length, new Set(paths).size, attempts.length, sessions.length]).toEqual([62, 62, 2, 6]);
    expect(integrity.selfExcluded).toBe(true);
    for (const path of paths) {
      expect(lock.files.find(file => file.path === path)).toEqual(proof(path));
      if (!path.endsWith('/artifact-integrity-v7.json')) expect(integrity.files.find(file => file.path === path)).toEqual(proof(path));
    }
    expect(json(root + 'validation-result-v7.json')).toMatchObject({ version: 'v7',
      exactPrivateSaveAttempts: 38, nativeAddAttempts: 36, saveRefusals: 2, nativeCsvBindings: 44,
      nativePngBindings: 31, pendingSources: 0 });
    expect(read(root + 'RESPONSE-v93-v7.md')).toContain('No color getter, inherited object identity across recalculations, or full all-object deletion claim.');
  });

  it('authenticates exact v5/v6 sources and separate mode0/1/2 calculation sessions', () => {
    expect(attempts.map(attempt => attempt.source.pineVersion)).toEqual([5, 6]);
    for (const { source, sessions: rowSets } of attempts) {
      expect(source.executed).toEqual(proof(source.executed.path));
      expect(proof(source.requestSource).sha256).toBe(source.sourceSha256);
      expect(source.executed.sha256).toBe(source.sourceSha256);
      expect(json(root + source.sourceId + '/attempt-v1/observation-v1.json')).toEqual({ version: 'v1', ...source });
      const form = read(root + source.sourceId + '/attempt-v1/save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(form.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      for (const body of [source.saveBody, source.addBody]) {
        expect(body).toEqual(proof(body.path));
        expect(json(body.path)).toMatchObject({ success: true, result: { metaInfo: { warnings: [] } } });
      }
      const receipt = json<{ privateId: string; privateVersion: string; sessions: Array<{ inputMode: number; startedAtUtc: string }>; removed: boolean }>(source.receipt.path);
      expect(source.receipt).toEqual(proof(source.receipt.path));
      expect([receipt.privateId, receipt.privateVersion, receipt.removed]).toEqual([source.privateScriptId, '1.0', true]);
      expect(receipt.sessions.map(session => session.inputMode)).toEqual([0, 1, 2]);
      expect(receipt.sessions.map(session => session.startedAtUtc)).toEqual(receipt.sessions.map(session => session.startedAtUtc).sort());
      expect(rowSets).toHaveLength(3);
    }
  });

  it('re-derives every closure and pins all present exclusions without absolute-index or developing credit', () => {
    let physical = 0, closed = 0, maskedPlotCells = 0, indexCells = 0;
    for (const session of sessions) {
      const { source, mode, rowSet, directory, data, mask } = session;
      expect(json(directory + 'row-set-observation-v1.json')).toEqual(rowSet);
      expect(data.columns).toEqual(['time', 'open', 'high', 'low', 'close', ...titles]);
      expect([data.rows.length, data.columns.length]).toEqual([rowSet.dataRows, rowSet.columnCount]);
      expect([data.rows[0], data.rows.at(-1)]).toEqual([rowSet.rawFirstRow, rowSet.rawLastRow]);
      const binding = json<{ source: Source; inputMode: number; columns: Array<{ columnOrdinal: number; originalHeader: string; owner: string; sourceSha256?: string; nativePlotId?: string }> }>(rowSet.columnBindings.path);
      expect(binding.source).toEqual(source);
      expect(binding.inputMode).toBe(mode);
      for (const [ordinal, column] of binding.columns.entries()) {
        expect([column.columnOrdinal, column.originalHeader]).toEqual([ordinal + 1, data.columns[ordinal]]);
        if (ordinal < 5) continue;
        expect([column.owner, column.sourceSha256, column.nativePlotId]).toEqual([source.privateScriptId, source.sourceSha256, `plot_${ordinal - 5}`]);
        for (const body of [source.saveBody, source.addBody]) {
          const compiled = json<{ result: { metaInfo: { styles: Record<string, { title: string }> } } }>(body.path);
          expect(compiled.result.metaInfo.styles[column.nativePlotId!].title).toBe(data.columns[ordinal]);
        }
      }
      expect(mask.rows).toHaveLength(data.rows.length);
      let closedInSession = 0;
      data.rows.forEach((row, index) => {
        expect(row).toHaveLength(18);
        expect(row.every(raw => raw !== '')).toBe(true);
        expect(row.slice(5, 15)).toEqual(vector(mode).map(String));
        expect([row[15], row[16]]).toEqual([String(23232 + index), String(Number(row[0]) * 1000)]);
        const end = Number(row[0]) + 120;
        const eligible = row[17] === '1' && end * 1000 <= Date.parse(rowSet.nativeObservationUtc);
        const record = mask.rows[index];
        expect(record.slice(0, 10)).toEqual([rowSet.csv.sha256, String(index + 1), row[0], row[16], row[15], row[17], rowSet.nativeObservationUtc, String(end), eligible ? '1' : '0', eligible ? 'OBSERVED' : 'OBSERVED / EXCLUDED']);
        expect(record[10]).toBe('[]');
        expect(record[11]).toBe(eligible ? '' : 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        if (index > 0) expect(Number(row[0]) - Number(data.rows[index - 1][0])).toBe(120);
        physical++; closed += Number(eligible); closedInSession += Number(eligible); indexCells++;
        if (!eligible) maskedPlotCells += row.slice(5).length;
      });
      expect(closedInSession).toBe(rowSet.independentlyClosedRows);
      expect(closedInSession).toBeGreaterThanOrEqual(32);
    }
    expect([physical, closed, maskedPlotCells, indexCells]).toEqual([2214, 2208, 78, 2214]);
  });

  it('joins all 60 numeric properties to their 1920 original closed raw-cell pointers', () => {
    expect(numeric).toHaveLength(60);
    let pointers = 0;
    for (const property of numeric) {
      const session = sessions.find(session => session.source.sourceId === property.sourceId && session.mode === property.inputMode)!;
      expect([property.criterionVerdict, property.hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
      expect(property.nativeCellPointers).toHaveLength(32);
      for (const cell of property.nativeCellPointers!) {
        const row = session.data.rows[cell.rowOrdinal - 1];
        expect([cell.csvSha256, cell.timeRaw, cell.title, cell.raw, cell.frozenExpected, cell.expectedNativeMissing])
          .toEqual([session.rowSet.csv.sha256, row[0], session.data.columns[cell.columnOrdinal - 1], row[cell.columnOrdinal - 1], row[cell.columnOrdinal - 1], false]);
        expect(session.mask.rows[cell.rowOrdinal - 1][8]).toBe('1');
        pointers++;
      }
    }
    expect(pointers).toBe(1920);
  });

  for (const session of sessions) {
    const name = `${session.source.sourceId} mode${session.mode}`;
    it(`${name}: exactly replays all closed columns except the observed absolute index`, () => {
      const { closed, result } = replay(session);
      let comparisons = 0;
      closed.forEach((row, index) => {
        titles.forEach((title, ordinal) => {
          if (title === 'INPUT_INDEX') return;
          expect(result.plots[ordinal].values[index], `${name}:${row[0]}:${title}`).toBe(Number(row[ordinal + 5]));
          comparisons++;
        });
      });
      expect(comparisons).toBe(session.rowSet.independentlyClosedRows * 12);
      expect(result.plots[10].values).toEqual(closed.map((_, index) => index));
    });

    it(`${name}: encodes the PNG-bound fill color/endpoints or bounded deletion, without a native color getter`, () => {
      const { region, rowSet, source, mode } = session;
      const facet = facets.find(facet => facet.sourceId === source.sourceId && facet.inputMode === mode)!;
      expect(facet.derivedRegionMap).toBe(session.directory + 'derived-region-map-v1.json');
      expect([region.sourceId, region.sourceSha256, region.privateScriptId, region.privateVersion, region.inputMode])
        .toEqual([source.sourceId, source.sourceSha256, source.privateScriptId, '1.0', mode]);
      expect(region.csv).toEqual(rowSet.csv);
      expect(region.screenshot).toEqual(rowSet.nativeScreenshot);
      expect(facet.nativeScreenshot).toEqual(region.screenshot);
      const png = bytes(region.screenshot.path);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1706, 993]);
      expect(region.sessionReceipt).toEqual(proof(region.sessionReceipt.path));
      const receipt = json<{ inputMode: number; sourceSpecificExecutionIdentity: null; sessionIdentity: string }>(region.sessionReceipt.path);
      expect([receipt.inputMode, receipt.sourceSpecificExecutionIdentity]).toEqual([mode, null]);
      expect(receipt.sessionIdentity).toContain('no cross-session continuity implied');
      expect([region.nativeColorGetter, region.crossSessionIdentityOrIntrabarTransitionClaim, region.crossVersionPixelEqualityClaim]).toEqual([null, false, false]);
      expect(region.visibleClosed32BarRun.rowOrdinals).toHaveLength(32);
      expect(region.visibleClosed32BarRun.notAnAssertionOfHistoricObjectIdentity).toBe(true);
      for (const ordinal of region.visibleClosed32BarRun.rowOrdinals) expect(session.mask.rows[ordinal - 1][8]).toBe('1');
      expect(region.currentActualNumericContext).toHaveLength(10);
      for (const context of region.currentActualNumericContext) {
        expect(context.raw).toBe(session.data.rows[context.rowOrdinal - 1][context.columnOrdinal - 1]);
        expect(context.cellStatus).toContain('OBSERVED / EXCLUDED');
        expect(session.mask.rows[context.rowOrdinal - 1][8]).toBe('0');
      }
      expect(region.properties).toHaveLength(mode === 2 ? 1 : 2);
      expect(facet.properties.filter(property => property.pixelRegionXYXY)).toEqual(region.properties);
      for (const property of region.properties) expect([property.criterionVerdict, property.hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
      expect(facet.boundary).toContain('No color getter or inherited object identity');
      const { result } = replay(session);
      const fills = result.drawings.filter(drawing => drawing.type === 'linefill');
      if (mode === 2) {
        expect(fills).toEqual([]);
        expect(region.properties[0].nativeVisualObservation).toContain('no all-object deletion is claimed');
        return;
      }
      expect(fills).toHaveLength(1);
      const fill = fills[0];
      // These are rendering fields, not a native color-getter or exact raster comparison.
      expect(fill.color).toBe(mode === 0 ? source.pineVersion === 5 ? '#FF5252' : '#F23645' : '#2962FF');
      for (const [id, y] of [[fill.line1, mode === 0 ? 10 : 20], [fill.line2, mode === 0 ? 20 : 30]] as const) {
        expect(result.drawings.find(drawing => drawing.id === id)).toMatchObject({ type: 'line', y1: y, y2: y, extend: 'both' });
      }
    });
  }
});
