import type { Bar } from '../../../tealscript/src/runtime/context';
import type { CanvasContext } from './CanvasContext';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { parse } from '../../../tealscript/src/parser';
import { executeCompiled, tryCompile } from '../../../tealscript/src/runtime/codegen/execute';
import { checkProgram } from '../../../tealscript/src/semantic/checker';
import { clearChartStoreCache } from '../state/chartState';
import { TealchartRenderer } from '../TealchartRenderer';

const directory = 'v93/captures/v93/';
const oracleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tealscript/oracle-probes');
const bytes = (path: string) => readFileSync(join(oracleRoot, path));
const read = (path: string) => bytes(path).toString('utf8');
const json = (path: string) => JSON.parse(read(path));
const proof = (path: string) => ({ path, bytes: bytes(path).length, sha256: createHash('sha256').update(bytes(path)).digest('hex') });
const csv = (path: string) => {
  const [columns, ...rows] = read(path).trimEnd().split(/\r?\n/).map(line => line.split(','));
  return { columns, rows };
};
const inventory = json(directory + 'attempt-inventory-v1.json');
const attempts = inventory.attempts.filter((attempt: any) => attempt.source.item === 1);
const controls = json(directory + 'numeric-controls-v1.json').results.filter((control: any) => control.sourceId.startsWith('v93-zorder-'));
const facets = json(directory + 'facet-capabilities-v1.json').facets.filter((facet: any) => facet.item === 1);
const entries = attempts.map((attempt: any) => {
  const source = attempt.source;
  const session = attempt.sessions[0];
  const prefix = source.executed.path.replace('executed-v1.pine', '');
  return { source, session, prefix, data: csv(session.csv.path), mask: csv(session.closureMask.path),
    regions: json(prefix + 'session-mode0-v1/derived-region-map-v1.json') };
});
const paths = ['RESPONSE-v93-v1.md', 'artifact-integrity-v1.json', 'validation-result-v1.json',
  'attempt-inventory-v1.json', 'numeric-controls-v1.json', 'facet-capabilities-v1.json'].map(file => directory + file)
  .concat(entries.flatMap((entry: any) => ['executed-v1.pine', 'save-request-v1.txt', 'save-response-v1.json',
    'add-response-v1.json', 'observation-v1.json', 'capture-receipt-v1.json',
    ...['chart-native-v1.csv', 'row-closure-mask-v1.csv', 'column-bindings-v1.json', 'row-set-observation-v1.json',
      'derived-region-map-v1.json', 'render-v1.png'].map(file => 'session-mode0-v1/' + file)].map(file => entry.prefix + file)));

type Entry = typeof entries[number];
function execute(entry: Entry) {
  const ast = parse(read(entry.source.executed.path));
  expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Captured z-order source must compile');
  // Chart volume is unexposed. It is not read by these sources; never fabricate
  // a native volume value or supply the original's unobserved execution prefix.
  const bars: Bar[] = entry.data.rows.map((row: string[]) => ({ time: Number(row[0]) * 1000,
    open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number.NaN }));
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true }, syminfo: { tickerid: 'BINANCE:BTCUSDT' } },
  })!;
  expect(result.errors).toEqual([]);
  return { result, bars };
}
type Paint = { kind: 'fill' | 'stroke' | 'text'; color: string; text?: string };
function trace(entry: Entry) {
  const { result, bars } = execute(entry);
  const levels = entry.source.sourceId.includes('groups')
    ? [['GREEN_HLINE', 8], ['LOWER_HLINE', 6]] as const : [['GREEN_SEVEN', 7]] as const;
  for (const [title, price] of levels) expect(result.plots.find(plot => plot.title === title)!.price).toBe(price);
  const paints: Paint[] = [];
  const stack: Partial<CanvasContext>[] = [];
  const noop = () => {};
  const ctx: CanvasContext = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top',
    lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    arc: noop, rect: noop, roundRect: noop, closePath: noop, clip: noop, scale: noop, translate: noop,
    fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle) }),
    fillRect: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle) }),
    stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle) }),
    strokeRect: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle) }),
    fillText: text => paints.push({ kind: 'text', color: String(ctx.fillStyle), text }),
    save: () => stack.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth,
      font: ctx.font, textAlign: ctx.textAlign, textBaseline: ctx.textBaseline, globalAlpha: ctx.globalAlpha }),
    restore: () => Object.assign(ctx, stack.pop()), setLineDash: noop, getLineDash: () => [],
    measureText: text => ({ width: text.length * 7 }) as TextMetrics,
  };
  const renderer = new TealchartRenderer(ctx, { width: 1706, height: 993, showVolume: false });
  const plots = result.plots.map(plot => ({ ...plot, scriptId: 'captured' }));
  renderer.renderWithLayoutPasses({ bars,
    viewport: { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: 80000, priceMax: 84000 },
    layout: { timeAxisHeight: 25, panes: [
      { id: 'main', type: 'main', heightRatio: 0.6, yMin: 80000, yMax: 84000, fixedRange: false },
      { id: 'study', type: 'indicator', heightRatio: 0.4, yMin: 0, yMax: 10, fixedRange: true, indicatorIds: ['captured'] },
    ] }, plots, drawings: result.drawings.map(drawing => ({ ...drawing, scriptId: 'captured' })),
    indicatorPaneInfo: { captured: { overlay: false, explicitPlotZOrder: result.declaration.explicitPlotZOrder } },
    passes: ['indicator-price-content', 'indicator-content'],
  });
  const color = (title: string) => {
    const plot = result.plots.find(plot => plot.title === title)!;
    expect(plot).toBeDefined();
    return Array.isArray(plot.color) ? plot.color.find(value => value !== null) : plot.color;
  };
  const paintIndex = (kind: Paint['kind'], color: unknown, text?: string, last = false) => {
    const match = (paint: Paint) => paint.kind === kind && (text ? paint.text === text : paint.color === color);
    const index = last ? paints.findLastIndex(match) : paints.findIndex(match);
    expect(index, `Missing ${kind}:${String(color)}:${text ?? ''}`).toBeGreaterThanOrEqual(0);
    return index;
  };
  const fillTitle = entry.source.sourceId.includes('groups') ? 'RED_FILL' : 'RED_BAND';
  const blueTitle = entry.source.sourceId.includes('groups') ? 'BLUE_PLOT' : 'BLUE_SEVEN';
  const greenTitle = entry.source.sourceId.includes('groups') ? 'GREEN_HLINE' : 'GREEN_SEVEN';
  const positions: Record<string, () => number> = {
    fill: () => paintIndex('fill', color(fillTitle)),
    plot: () => paintIndex('stroke', color(blueTitle)),
    hline: () => paintIndex('stroke', color(greenTitle)),
    background: () => paintIndex('fill', color(result.plots.find(plot => plot.type === 'bgcolor')!.title)),
    lowerPlot: () => paintIndex('stroke', color('LOWER_PLOT'), undefined, true),
    lowerHline: () => paintIndex('stroke', color('LOWER_HLINE'), undefined, true),
    linefill: () => paintIndex('fill', result.drawings.find(drawing => drawing.type === 'linefill')?.color),
    line: () => paintIndex('stroke', result.drawings.filter(drawing => drawing.type === 'line').find(drawing => drawing.width === 12)?.color),
    box: () => paintIndex('fill', result.drawings.find(drawing => drawing.type === 'box')?.bgcolor),
    label: () => paintIndex('text', undefined, 'LABEL'),
    table: () => paintIndex('fill', result.drawings.find(drawing => drawing.type === 'table')?.bgcolor),
  };
  return { positions, result };
}

// Only observed intersections are asserted. No table-vs-object-cluster pair,
// generic nine-group order, pixels, fonts, DPI or cross-version raster equality.
const pairs: Record<string, [string, string][]> = {
  'hline over plot and fill at y7': [['hline', 'plot'], ['hline', 'fill'], ['plot', 'fill']],
  'later fill over earlier plot/hline at y7': [['fill', 'plot'], ['fill', 'hline']],
  'hline over plot/fill': [['hline', 'plot'], ['hline', 'fill'], ['fill', 'background']],
  'linefill over lower hline': [['linefill', 'lowerHline'], ['linefill', 'lowerPlot']],
  'line over linefill': [['line', 'linefill']],
  'box over line': [['box', 'line']],
  'label over box': [['label', 'box']],
  'table over intersected fill': [['table', 'fill']],
};
afterEach(clearChartStoreCache);

describe('v93 z-order native screenshots/regions and independent numeric controls', () => {
  it('SHA-binds all 78 relied-on artifacts, including PNG bytes, native integrity and validation', () => {
    const lock = JSON.parse(readFileSync(join(oracleRoot, '../oracle-fixtures.json'), 'utf8'));
    const integrity = json(directory + 'artifact-integrity-v1.json');
    expect(paths).toHaveLength(78);
    expect(new Set(paths).size).toBe(78);
    for (const path of paths) {
      const actual = proof(path);
      expect(lock.files.find((file: any) => file.path === path)).toEqual(actual);
      if (!path.endsWith('/artifact-integrity-v1.json')) expect(integrity.files.find((file: any) => file.path === path)).toEqual(actual);
    }
    expect(json(directory + 'validation-result-v1.json')).toMatchObject({ status: 'PASS;12-source progress checkpoint only', exactPrivateSaveAddRuns: 12, pendingSources: 26 });
    expect(entries).toHaveLength(6);
    expect(controls).toHaveLength(32);
  });

  for (const entry of entries) {
    const id = entry.source.sourceId;
    it(`authenticates unchanged source, native compiler ownership, numeric rows and region limits: ${id}`, () => {
      const { source, session, data, mask, regions } = entry;
      expect(source.executed).toEqual(proof(source.executed.path));
      expect(source.sourceSha256).toBe(source.executed.sha256);
      expect(json(entry.prefix + 'observation-v1.json')).toEqual(source);
      expect(read(entry.prefix + 'save-request-v1.txt').replace(/\r\n/g, '\n').split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(read(source.executed.path));
      const binding = json(session.columnBindings.path);
      expect(binding.csv).toEqual(session.csv);
      expect(binding.source).toEqual(source);
      expect(binding.chartVolumeColumn).toBeNull();
      expect(binding.columns.map((column: any) => column.originalHeader)).toEqual(data.columns);
      for (const body of [source.saveBody, source.addBody]) {
        expect(body).toEqual(proof(body.path));
        const compiler = json(body.path);
        expect(compiler.success).toBe(true);
        for (const column of binding.columns.slice(5)) {
          expect(column.owner).toBe(source.privateScriptId);
          expect(column.sourceSha256).toBe(source.sourceSha256);
          expect(compiler.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      expect(data.rows).toHaveLength(session.dataRows);
      expect(json(entry.prefix + 'session-mode0-v1/row-set-observation-v1.json')).toEqual(session);
      expect(data.columns.slice(0, 5)).toEqual(['time', 'open', 'high', 'low', 'close']);
      expect(mask.rows).toHaveLength(session.dataRows);
      expect(mask.rows.filter((row: string[]) => row[8] === '1')).toHaveLength(session.independentlyClosedRows);
      data.rows.forEach((row: string[], index: number) => {
        const field = (title: string) => row[data.columns.indexOf(title)];
        const record = mask.rows[index];
        expect(record.slice(0, 7)).toEqual([session.csv.sha256, String(index + 1), row[0], field('INPUT_TIME'), field('INPUT_INDEX'), field('CHART_CONFIRMED'), session.nativeObservationUtc]);
        expect(record[7]).toBe(String(Number(row[0]) + 120));
        const closed = field('CHART_CONFIRMED') === '1' && (Number(row[0]) + 120) * 1000 <= Date.parse(session.nativeObservationUtc);
        expect(record[8]).toBe(closed ? '1' : '0');
        expect(record[9]).toBe(closed ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        expect(record[10]).toBe('[]');
        if (!closed) expect(record[11]).not.toBe('');
        if (index) expect(Number(row[0]) - Number(data.rows[index - 1][0])).toBe(120);
      });
      expect(regions.screenshot).toEqual(session.nativeScreenshot);
      expect(regions.sourceSha256).toBe(source.sourceSha256);
      expect(regions.privateScriptId).toBe(source.privateScriptId);
      expect(regions.csv).toEqual(session.csv);
      const png = bytes(regions.screenshot.path);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual(regions.screenshot.dimensionsPixels);
      const facet = facets.find((facet: any) => facet.sourceId === id);
      expect(facet.properties).toEqual(regions.properties);
      expect(facet.renderingCompileCredit).toBe(false);
      expect(regions.precisionLimit).toContain('not official object bounds or generic pixel parity');
      expect([regions.viewport.zoom, regions.viewport.dpi]).toEqual([null, null]);
      const held = regions.properties.filter((property: any) => property.criterionVerdict === 'NOT OBSERVED');
      expect(held.length).toBe(id.includes('groups') ? 1 : 0);
      for (const property of held) expect([property.hypothesis, property.pixelRegionXYXY]).toEqual(['UNDECIDED', null]);
    });

    it(`matches every closed constant control and all 32-cell numeric receipts, excluding developing rows: ${id}`, () => {
      const { result } = execute(entry);
      const selected = controls.filter((control: any) => control.sourceId === id);
      expect(selected).toHaveLength(id.includes('groups') ? 6 : 5);
      let assertions = 0;
      for (const control of selected) {
        expect([control.criterionVerdict, control.hypothesis]).toEqual(['CAPTURED', 'SUPPORTED']);
        expect(control.nativeCellPointers).toHaveLength(32);
        const plot = result.plots.find(plot => plot.title === control.property)!;
        for (const [offset, pointer] of control.nativeCellPointers.entries()) {
          const row = entry.data.rows[pointer.rowOrdinal - 1];
          expect(pointer.csvSha256).toBe(entry.session.csv.sha256);
          expect([row[0], row[pointer.columnOrdinal - 1]]).toEqual([pointer.timeRaw, pointer.raw]);
          expect(entry.data.columns[pointer.columnOrdinal - 1]).toBe(pointer.title);
          expect(pointer.title).toBe(control.property);
          expect(pointer.rowOrdinal).toBe(control.nativeCellPointers[0].rowOrdinal + offset);
          expect(pointer.raw).toBe(pointer.frozenExpected);
          expect(entry.mask.rows[pointer.rowOrdinal - 1][8]).toBe('1');
        }
        entry.data.rows.forEach((row: string[], index: number) => {
          if (entry.mask.rows[index][8] !== '1') return;
          expect(plot.values[index]).toBe(Number(row[entry.data.columns.indexOf(control.property)]));
          assertions++;
        });
      }
      expect(assertions).toBe(selected.length * entry.session.independentlyClosedRows);
      expect(entry.mask.rows.filter((row: string[]) => row[8] === '0')).toHaveLength(1);
      // Native INPUT_INDEX is OBSERVED from a nonzero original execution prefix,
      // not a seed for this replay. Only time/confirmation are independently replayable.
      expect(Number(entry.data.rows[0][entry.data.columns.indexOf('INPUT_INDEX')])).toBeGreaterThan(0);
      entry.data.rows.forEach((row: string[], index: number) => {
        if (entry.mask.rows[index][8] !== '1') return;
        expect(result.plots.find(plot => plot.title === 'INPUT_TIME')!.values[index]).toBe(Number(row[0]) * 1000);
        expect(result.plots.find(plot => plot.title === 'CHART_CONFIRMED')!.values[index]).toBe(1);
      });
    });

    for (const property of entry.regions.properties.filter((property: any) => property.criterionVerdict === 'CAPTURED')) {
      it(`encodes observed painter precedence ${property.property}: ${id}`, () => {
        expect(property.hypothesis).toBe('SUPPORTED');
        expect(property.pixelRegionXYXY).toHaveLength(4);
        const { positions, result } = trace(entry);
        expect(result.declaration.explicitPlotZOrder === true).toBe(id.includes('-true-'));
        const observedPairs = pairs[property.property];
        expect(observedPairs).toBeDefined();
        for (const [above, below] of observedPairs) expect(positions[above](), `${id}: ${above} over ${below}`).toBeGreaterThan(positions[below]());
      });
    }
  }
});
