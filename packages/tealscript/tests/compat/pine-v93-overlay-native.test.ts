import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof {
  path: string;
  bytes: number;
  sha256: string;
}
interface Source {
  sourceId: string;
  item: number;
  pineVersion: number;
  sourceSha256: string;
  requestSource: string;
  executed: Proof;
  privateScriptId: string;
  privateVersion: string;
  nativeCompileSuccess: boolean;
  separateMarkerArrays: null;
  saveBody: Proof;
  addBody: Proof;
}
interface Session {
  sourceId: string;
  csv: Proof;
  dataRows: number;
  independentlyClosedRows: number;
  nativeObservationUtc: string;
  closureMask: Proof;
  columnBindings: Proof;
  nativeScreenshot: Proof & { dimensionsPixels: number[] };
}
interface Property {
  property: string;
  criterionVerdict: string;
  hypothesis: string;
  pixelRegionXYXY: number[];
  nativeVisualObservation: string;
}
interface RegionMap {
  artifactKind: string;
  source: string;
  sourceSha256: string;
  privateScriptId: string;
  screenshot: Session['nativeScreenshot'];
  csv: Proof;
  paneBoundsPixels: { main: number[]; indicator: number[] };
  properties: Property[];
  viewport: { zoom: null; dpi: null; horizontalOrVerticalScalingActions: number; paneResizingActions: number };
  precisionLimit: string;
  currentBarLimit: string;
}
interface NumericControl {
  sourceId: string;
  property: string;
  criterionVerdict: string;
  hypothesis: string;
  renderingClaim: boolean;
  nativeCellPointers: {
    csvSha256: string;
    rowOrdinal: number;
    timeRaw: string;
    columnOrdinal: number;
    title: string;
    raw: string;
    frozenExpected: string;
  }[];
}

const base = 'v93/captures/v93/';
const sourceIds = ['plot-bg', 'objects', 'table-polyline'].flatMap((family) =>
  [5, 6].map((version) => `v93-overlay-${family}-v${version}`),
);
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  // Captured numeric rows have no quoted commas; only the mask's final cause can be blank.
  return { headers: header.split(','), rows: lines.map((line) => line.split(',')) };
}
const inventory = json<{
  capturedSources: number;
  reservedSources: number;
  attempts: { source: Source; status: string; removed: boolean; sessions: Session[] }[];
}>(base + 'attempt-inventory-v1.json');
const numeric = json<{ results: NumericControl[] }>(base + 'numeric-controls-v1.json').results.filter((control) =>
  sourceIds.includes(control.sourceId),
);
const facets = json<{
  facets: {
    sourceId: string;
    item: number;
    properties: Property[];
    nativeScreenshot: Session['nativeScreenshot'];
    derivedRegionMap: string;
  }[];
}>(base + 'facet-capabilities-v1.json').facets.filter((facet) => facet.item === 2);
const attempts = sourceIds.map((id) => {
  const attempt = inventory.attempts.find((entry) => entry.source.sourceId === id)!;
  const session = attempt.sessions[0];
  const folder = base + id + '/attempt-v1/session-mode0-v1/';
  return {
    id,
    attempt,
    session,
    folder,
    data: csv(session.csv.path),
    mask: csv(session.closureMask.path),
    regions: json<RegionMap>(folder + 'derived-region-map-v1.json'),
  };
});
const artifactPaths = [
  base + 'RESPONSE-v93-v1.md',
  base + 'artifact-integrity-v1.json',
  base + 'validation-result-v1.json',
  base + 'attempt-inventory-v1.json',
  base + 'facet-capabilities-v1.json',
  base + 'numeric-controls-v1.json',
  'v93/REQUEST-v93-v1.md',
  ...sourceIds.flatMap((id) => [
    'v93/sources/' + id + '.pine',
    ...[
      'executed-v1.pine',
      'observation-v1.json',
      'capture-receipt-v1.json',
      'save-response-v1.json',
      'add-response-v1.json',
    ].map((file) => base + id + '/attempt-v1/' + file),
    ...[
      'chart-native-v1.csv',
      'column-bindings-v1.json',
      'row-closure-mask-v1.csv',
      'row-set-observation-v1.json',
      'render-v1.png',
      'derived-region-map-v1.json',
      'session-receipt-v1.json',
    ].map((file) => base + id + '/attempt-v1/session-mode0-v1/' + file),
  ]),
];

function replay(entry: (typeof attempts)[number]) {
  const ast = parse(read(entry.attempt.source.executed.path));
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Unchanged native overlay source must compile');
  // No volume was exported. These sources never read it; no absent input is invented.
  const bars: Bar[] = entry.data.rows.map((row) => ({
    time: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: NaN,
  }));
  const result = executeCompiled(compiled, bars, undefined, {
    realtimeLastBar: { isNew: true },
    runtime: {
      syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
    },
  })!;
  expect(result.errors).toEqual([]);
  expect(result.indicatorOverlay).toBe(false);
  return result;
}

describe('v93 native overlay routing encodings, without pixel or held-table credit', () => {
  it('authenticates only item 2 sources and all relied-on native/derived artifacts', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      files: Proof[];
    };
    const integrity = json<{ selfExcluded: boolean; files: Proof[] }>(base + 'artifact-integrity-v1.json');
    expect(integrity.selfExcluded).toBe(true);
    expect(new Set(artifactPaths).size).toBe(85);
    for (const path of artifactPaths) {
      const raw = bytes(path);
      const actual = { path, bytes: raw.length, sha256: hash(raw) };
      expect(
        lock.files.find((file) => file.path === path),
        path,
      ).toEqual(actual);
      if (!path.endsWith('/artifact-integrity-v1.json'))
        expect(
          integrity.files.find((file) => file.path === path),
          path,
        ).toEqual(actual);
    }
    expect(json(base + 'validation-result-v1.json')).toMatchObject({
      status: 'PASS;12-source progress checkpoint only',
      exactPrivateSaveAddRuns: 12,
      completeCompilerBodies: 24,
      nativeCsvAndPngBindings: 12,
      pendingSources: 26,
    });
    expect([inventory.reservedSources, inventory.capturedSources]).toEqual([38, 12]);
    expect(attempts.map((entry) => entry.attempt.source.sourceSha256)).toEqual([
      'bbb2d94b1de5d10241501b9c243bb58cecfd682deba970116a12a796a61557e1',
      '6e144d69bc0f0b1c7f06338050969132f898b25a374085d39290f5df4516e578',
      'a2709a8288ecf97944ab6d47b59cbe93ceed1f81b7c54f05e36158b156ed451c',
      '651157f6e4107625c99e7912dfd2035a6e852f0917dd35be3ff867d9426a7624',
      'bf230c95f49da347e87cd867652b470c498985f31cdb1aefb8f57541c9c69470',
      'cd5efd5e7d511efc38821ffb0a0e0cf48cced3abfc5fbf2f2b25c94d5d7dccf0',
    ]);
    for (const { attempt, session, data } of attempts) {
      const source = attempt.source;
      expect([attempt.status, attempt.removed, source.nativeCompileSuccess, source.item]).toEqual([
        'CAPTURED',
        true,
        true,
        2,
      ]);
      expect(hash(read(source.executed.path))).toBe(source.sourceSha256);
      expect(read(source.requestSource)).toBe(read(source.executed.path));
      expect(source.separateMarkerArrays).toBeNull();
      for (const response of [source.saveBody, source.addBody])
        expect(json<{ success: boolean }>(response.path).success).toBe(true);
      const binding = json<{
        source: Source;
        columns: {
          columnOrdinal: number;
          originalHeader: string;
          owner: string;
          sourceSha256?: string;
          privateVersion?: string;
        }[];
        chartVolumeColumn: null;
      }>(session.columnBindings.path);
      expect(binding.source).toEqual(source);
      expect(binding.chartVolumeColumn).toBeNull();
      expect(data.headers).not.toContain('Volume');
      expect(binding.columns.map((column) => column.originalHeader)).toEqual(data.headers);
      for (const column of binding.columns.slice(5)) {
        expect([column.owner, column.sourceSha256, column.privateVersion]).toEqual([
          source.privateScriptId,
          source.sourceSha256,
          source.privateVersion,
        ]);
      }
    }
  });

  it('keeps checkpoint-wide counts separate from this six-source overlay family', () => {
    expect(attempts).toHaveLength(6);
    expect(numeric).toHaveLength(20);
    expect(numeric.reduce((sum, control) => sum + control.nativeCellPointers.length, 0)).toBe(640);
    expect(facets).toHaveLength(6);
    expect(
      facets.flatMap((facet) => facet.properties).filter((property) => property.criterionVerdict === 'CAPTURED'),
    ).toHaveLength(26);
    expect(
      facets.flatMap((facet) => facet.properties).filter((property) => property.criterionVerdict === 'NOT OBSERVED'),
    ).toHaveLength(2);
    expect(attempts.reduce((sum, entry) => sum + entry.data.rows.length, 0)).toBe(1878);
    expect(attempts.reduce((sum, entry) => sum + entry.session.independentlyClosedRows, 0)).toBe(1872);
  });

  for (const entry of attempts) {
    it(`${entry.id}: independently closes CSV rows and retains every observed exclusion`, () => {
      const { data, mask, session } = entry;
      expect(data.rows.length).toBe(session.dataRows);
      expect(mask.rows).toHaveLength(data.rows.length);
      const m = (row: string[], field: string) => row[mask.headers.indexOf(field)];
      let closed = 0;
      data.rows.forEach((row, index) => {
        const nativeTime = Number(row[0]);
        const confirmed = row[data.headers.indexOf('CHART_CONFIRMED')];
        const independentlyClosed =
          (nativeTime + 120) * 1000 <= Date.parse(session.nativeObservationUtc) && confirmed === '1';
        const provenance = mask.rows[index];
        expect([m(provenance, 'csv_sha256'), m(provenance, 'row_ordinal'), m(provenance, 'time_raw_seconds')]).toEqual([
          session.csv.sha256,
          String(index + 1),
          row[0],
        ]);
        expect(m(provenance, 'closed_numeric_eligible')).toBe(independentlyClosed ? '1' : '0');
        expect(m(provenance, 'present_cell_status')).toBe(independentlyClosed ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(row).toHaveLength(data.headers.length);
        expect(row.every((value) => value !== '')).toBe(true);
        expect(row[data.headers.indexOf('INPUT_TIME')]).toBe(String(nativeTime * 1000));
        expect(Number(row[data.headers.indexOf('INPUT_INDEX')])).toBe(23232 + index);
        if (independentlyClosed) closed++;
        else expect(m(provenance, 'exclusion_cause')).toBe('PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_NOT_REACHED');
        if (index > 0) expect(nativeTime - Number(data.rows[index - 1][0])).toBe(120);
      });
      expect(closed).toBe(session.independentlyClosedRows);
      expect(closed).toBeGreaterThanOrEqual(300);
      expect(data.rows.length - closed).toBe(1);
      const observed = json<{ rawFirstRow: string[]; rawLastRow: string[] }>(
        entry.folder + 'row-set-observation-v1.json',
      );
      expect(observed.rawFirstRow).toEqual(data.rows[0]);
      expect(observed.rawLastRow).toEqual(data.rows.at(-1));
      // Absolute INPUT_INDEX and first-row predecessor anchors are present but lack
      // a retained calculation prefix. They are not zero, missing or seeded inputs.
      expect(Number(data.rows[0][data.headers.indexOf('INPUT_INDEX')])).toBe(23232);
      if (!entry.id.includes('plot-bg')) {
        expect(data.rows[0][data.headers.indexOf('ANCHOR_CLOSE')]).toBe('82094');
        expect(data.rows[0][data.headers.indexOf('ANCHOR_TIME')]).toBe('1792131720000');
      }
    });

    it(`${entry.id}: exactly replays closed numeric controls without importing an absolute-index seed`, () => {
      const result = replay(entry);
      const { data, mask } = entry;
      const controls = numeric.filter((control) => control.sourceId === entry.id);
      expect(controls).toHaveLength(entry.id.includes('plot-bg') ? 2 : 4);
      for (const control of controls) {
        expect([control.criterionVerdict, control.hypothesis, control.renderingClaim]).toEqual([
          'CAPTURED',
          'SUPPORTED',
          false,
        ]);
        expect(control.nativeCellPointers).toHaveLength(32);
        for (const [pointerIndex, pointer] of control.nativeCellPointers.entries()) {
          const row = data.rows[pointer.rowOrdinal - 1];
          expect(pointer.rowOrdinal).toBe(control.nativeCellPointers[0].rowOrdinal + pointerIndex);
          expect(mask.rows[pointer.rowOrdinal - 1][mask.headers.indexOf('closed_numeric_eligible')]).toBe('1');
          expect([pointer.csvSha256, pointer.timeRaw, pointer.title, pointer.raw, pointer.frozenExpected]).toEqual([
            entry.session.csv.sha256,
            row[0],
            data.headers[pointer.columnOrdinal - 1],
            row[pointer.columnOrdinal - 1],
            row[pointer.columnOrdinal - 1],
          ]);
        }
      }
      let comparisons = 0;
      data.rows.forEach((row, index) => {
        if (mask.rows[index][mask.headers.indexOf('closed_numeric_eligible')] !== '1') return;
        for (const control of [...controls.map((control) => control.property), 'INPUT_TIME', 'CHART_CONFIRMED']) {
          if (index === 0 && control.startsWith('ANCHOR_')) continue;
          const plot = result.plots.find((plot) => plot.title === control)!;
          expect(plot, control).toBeDefined();
          expect(plot.values[index], `${entry.id}:${index + 1}:${control}`).toBe(
            Number(row[data.headers.indexOf(control)]),
          );
          comparisons++;
        }
        if (index > 0 && !entry.id.includes('plot-bg')) {
          expect(row[data.headers.indexOf('ANCHOR_CLOSE')]).toBe(data.rows[index - 1][4]);
          expect(row[data.headers.indexOf('ANCHOR_TIME')]).toBe(String(Number(data.rows[index - 1][0]) * 1000));
        }
      });
      expect(comparisons).toBe(
        entry.session.independentlyClosedRows * (controls.length + 2) - (controls.length === 4 ? 2 : 0),
      );
      expect(result.plots.find((plot) => plot.title === 'INPUT_INDEX')!.values[0]).toBe(0);
      expect(result.plots.find((plot) => plot.title === 'INPUT_INDEX')!.values.at(-1)).toBe(data.rows.length - 1);
    });

    it(`${entry.id}: encodes each visibly witnessed target pane and keeps red MAIN table held`, () => {
      const result = replay(entry);
      const regions = entry.regions;
      const facet = facets.find((facet) => facet.sourceId === entry.id)!;
      expect(regions.source).toBe(entry.id);
      expect(regions.sourceSha256).toBe(entry.attempt.source.sourceSha256);
      expect(regions.privateScriptId).toBe(entry.attempt.source.privateScriptId);
      expect(regions.csv).toEqual(entry.session.csv);
      expect(regions.screenshot).toEqual(entry.session.nativeScreenshot);
      expect(regions.screenshot.dimensionsPixels).toEqual([1706, 993]);
      expect(regions.artifactKind).toContain('DERIVED');
      expect(regions.properties).toEqual(facet.properties);
      expect(regions.viewport).toMatchObject({
        zoom: null,
        dpi: null,
        horizontalOrVerticalScalingActions: 0,
        paneResizingActions: 0,
      });
      let witnessed = 0;
      for (const property of regions.properties) {
        const [kind, force] = property.property.split(' force_overlay=');
        if (kind === 'table' && force === 'true') {
          expect([property.criterionVerdict, property.hypothesis]).toEqual(['NOT OBSERVED', 'UNDECIDED']);
          expect(property.nativeVisualObservation).toContain('not independently visible');
          continue;
        }
        expect([property.criterionVerdict, property.hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
        const main = force === 'true';
        const pane = main ? regions.paneBoundsPixels.main : regions.paneBoundsPixels.indicator;
        const [x1, y1, x2, y2] = property.pixelRegionXYXY;
        expect(x1).toBeGreaterThanOrEqual(pane[0]);
        expect(x2).toBeLessThanOrEqual(pane[2]);
        expect(y1).toBeGreaterThanOrEqual(pane[1]);
        expect(y2).toBeLessThanOrEqual(pane[3]);
        if (kind === 'plot' || kind === 'bgcolor') {
          const title = kind === 'plot' ? (main ? 'MAIN_RED' : 'PANE_BLUE') : main ? 'MAIN_BG' : 'PANE_BG';
          const plot = result.plots.find((plot) => plot.title === title)!;
          expect(plot.type).toBe(kind);
          expect(plot.forceOverlay, property.property).toBe(main);
        } else {
          const drawings = result.drawings.filter((drawing) => drawing.type === kind);
          const drawing =
            kind === 'table'
              ? drawings.find(
                  (drawing) => drawing.type === 'table' && drawing.cells.some((cell) => cell.text === 'PANE'),
                )!
              : drawings[main ? 1 : 0];
          expect(drawing, property.property).toBeDefined();
          if (drawing.type === 'linefill') throw new Error('Linefill is outside the witnessed overlay object set');
          expect(drawing.forceOverlay, property.property).toBe(main);
          expect(drawing.type).toBe(kind);
        }
        witnessed++;
      }
      expect(witnessed).toBe(entry.id.includes('plot-bg') ? 4 : entry.id.includes('objects') ? 6 : 3);
      expect(facet.nativeScreenshot).toEqual(regions.screenshot);
      expect(facet.derivedRegionMap).toBe(entry.folder + 'derived-region-map-v1.json');
    });
  }
});

describe('local table replacement and capacity guards; no additional native credit', () => {
  function tables(overlay: boolean, secondForce: boolean, full: boolean) {
    const ast = parse(`//@version=6
indicator("Local pane ownership", overlay=${overlay})
first = table.new(position.top_left, ${full ? '100, 100' : '1, 1'}, force_overlay=false)
table.cell(first, 0, 0, "first")
second = table.new(position.top_left, 1, 1, force_overlay=${secondForce})
table.cell(second, 0, 0, "second")`);
    const compiled = tryCompile(ast);
    if (!compiled.success) throw new Error('Local table guard must compile');
    const row = attempts[0].data.rows[0];
    return executeCompiled(compiled, [
      {
        time: Number(row[0]) * 1000,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: NaN,
      },
    ])!;
  }

  for (const overlay of [false, true]) {
    for (const secondForce of [false, true]) {
      it(`preserves existing replacement policy at overlay=${overlay}, second force_overlay=${secondForce}`, () => {
        const result = tables(overlay, secondForce, false);
        expect(result.errors).toEqual([]);
        expect(result.drawings.filter((drawing) => drawing.type === 'table')).toHaveLength(
          !overlay && secondForce ? 2 : 1,
        );
      });
    }

    it(`accounts for the retained first table before admitting another allocation at overlay=${overlay}`, () => {
      const result = tables(overlay, true, true);
      expect(result.drawings).toHaveLength(1);
      if (overlay) {
        expect(result.errors).toEqual([]);
        expect(result.drawings[0]).toMatchObject({ cells: [{ text: 'second' }] });
      } else {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Too many table cells');
        expect(result.drawings[0]).toMatchObject({ cells: [{ text: 'first' }] });
      }
    });
  }
});
