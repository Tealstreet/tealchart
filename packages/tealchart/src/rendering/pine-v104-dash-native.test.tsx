import { createCanvas, loadImage } from '@napi-rs/canvas';
import { DashPathEffect } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';
import { parse } from '../../../tealscript/src/parser';
import { executeCompiled, tryCompile } from '../../../tealscript/src/runtime/codegen/execute';
import { dashRegions, executeDash } from '../../../tealscript/tests/fixtures/v104Dash';
import { raw } from '../../../tealscript/tests/fixtures/v104Fixture';
import { nativePlotHarness, nativePrimitives, testPlot } from '../test/nativePlotPaintHarness';
import { traceEntry } from '../test/v102Paint';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import type { CanvasContext } from './CanvasContext';
import type { ComputedPane } from '../types';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealchartRenderer } from '../TealchartRenderer';

vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof import('react')>(), useMemo: <T,>(f: () => T) => f() }));
const widths = [1, 4, 8], levels = [85, 65, 40];
function periods(occupied: boolean[]) {
  const starts = occupied.flatMap((ink, x) => ink && (x === 0 || !occupied[x - 1]) ? [x] : []);
  expect(starts.length).toBeGreaterThan(4);
  const differences = starts.slice(1).map((x, i) => x - starts[i]);
  expect(new Set(differences).size).toBe(1);
  return differences[0];
}
function paint(replay: ReturnType<typeof executeDash>, channel: 'web' | 'native') {
  const canvas = createCanvas(1280, 400), ctx = canvas.getContext('2d');
  const { bars, result } = replay;
  const viewport = { startTime: bars[bars.length - 33].time, endTime: bars[bars.length - 1].time, priceMin: 0, priceMax: 100 };
  const pane: ComputedPane = { id: 'study', type: 'indicator', indicatorIds: ['s'], heightRatio: 1, fixedRange: true,
    yMin: 0, yMax: 100, top: 0, bottom: 400, height: 400 };
  const margins = { left: 0, right: 0, top: 0, bottom: 0 };
  const drawings = result.drawings.map(d => ({ ...d, scriptId: 's' }));
  if (channel === 'web') new TealScriptDrawingRenderer({ ctx: ctx as unknown as CanvasContext,
    options: { ...DEFAULT_RENDER_OPTIONS, width: 1280 }, margins, font: 'sans-serif',
    coordinateResolvers: { timeToX: time => (time - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1280,
      valueToY: y => 400 - y * 4 }, getTextWidth: (active, value) => active.measureText(value).width,
  }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
  else paintNativeTealScriptDrawings({ ctx: ctx as unknown as CanvasContext, drawings, bars, viewport, panes: [pane], width: 1280, margins });
  return { ctx, pixels: ctx.getImageData(0, 0, 1280, 400).data };
}
function assertLanes(channel: 'web' | 'native') {
  const replay = executeDash();
  const { paints } = traceEntry(replay, channel);
  const lines = paints.filter(p => p.kind === 'stroke' && p.color === '#2962FF');
  expect(lines).toHaveLength(3);
  const { pixels } = paint(replay, channel);
  const measured: number[] = [];
  for (let lane = 0; lane < 3; lane++) {
    const line = lines.find(p => p.points.every(point => point.y === 100 - levels[lane]));
    expect(line, `source lane ${lane}`).toMatchObject({ width: widths[lane], color: '#2962FF' });
    expect(line!.points).toHaveLength(2);
    const x = (index: number) => (replay.bars[index].time - replay.bars[0].time) / (replay.bars.at(-1)!.time - replay.bars[0].time) * 1000;
    expect(line!.points).toEqual([{ x: x(replay.bars.length - 31), y: 100 - levels[lane] },
      { x: x(replay.bars.length - 2), y: 100 - levels[lane] }]);
    expect(line!.dash.length).toBe(2);
    expect(line!.dash.every(n => n > 0)).toBe(true);
    const y = 400 - levels[lane] * 4;
    const row = Array.from({ length: 1160 }, (_, x) => {
      const n = (y * 1280 + x + 80) * 4;
      return pixels[n + 3] > 100 && pixels[n + 2] > pixels[n] && pixels[n + 2] > pixels[n + 1];
    });
    measured.push(periods(row));
    const own = lines.find(p => p.points[0].y === 100 - levels[0])!;
    expect(line!.dash.map(n => n / widths[lane])).toEqual(own.dash);
  }
  expect(measured.map(n => n / measured[0])).toEqual(widths);
}

describe('v104 native width-period relation: source-owned blue lanes', () => {
  it('re-derives 1:4:8 periods from original PNG at each registered lane, independently of CSV', async () => {
    const image = await loadImage(raw(dashRegions.originalPng.path));
    expect([image.width, image.height]).toEqual([1706, 993]);
    const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const values = dashRegions.facets[0].manualFinding.actualSubjectRegionsPx.map(([x1, y1, x2, y2]: number[]) => {
      const w = x2 - x1, h = y2 - y1, pixels = ctx.getImageData(x1, y1, w, h).data;
      return periods(Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => {
        const i = (y * w + x) * 4;
        return pixels[i + 2] > 150 && pixels[i + 2] > pixels[i] * 2 && pixels[i + 2] > pixels[i + 1] * 1.5;
      }).some(Boolean)));
    });
    expect(values.map((n: number) => n / values[0])).toEqual(widths);
  });
  for (const channel of ['web', 'native'] as const) it(`${channel}: own width, location, visible ink and period in every lane`, () => assertLanes(channel));
});

describe('inferred shared Pine stroke recipe extensions, no new native facet credit', () => {
  for (const object of ['line', 'box', 'polyline'] as const) for (const style of ['dashed', 'dotted'] as const) {
    for (const channel of ['web', 'native'] as const) it(`${channel} ${object} ${style}: each width scales its own pattern`, () => {
      const replay = executeDash();
      const drawings = widths.map((width, i) => object === 'line'
        ? `line.new(bar_index-30,${levels[i]},bar_index-1,${levels[i]},width=${width},style=line.style_${style})`
        : object === 'box' ? `box.new(bar_index-30,${levels[i]},bar_index-1,${levels[i]-5},border_width=${width},border_style=line.style_${style},bgcolor=na)`
        : `polyline.new(array.from(chart.point.from_index(bar_index-30,${levels[i]}),chart.point.from_index(bar_index-1,${levels[i]})),line_width=${width},line_style=line.style_${style})`);
      const source = `//@version=6\nindicator("local recipe")\nif barstate.islastconfirmedhistory\n${drawings.map(s => '    '+s).join('\n')}\n`;
      const compiled = tryCompile(parse(source)); expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, replay.bars)!; expect(result.errors).toEqual([]);
      const { paints } = traceEntry({ result, bars: replay.bars }, channel, true);
      const strokes = paints.filter(p => p.kind === 'stroke'); expect(strokes).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        const stroke = strokes.find(p => p.points[0]?.y === 100 - levels[i])!;
        expect(stroke.width).toBe(widths[i]); expect(stroke.dash).toHaveLength(2);
        expect(stroke.dash.every(n => n > 0)).toBe(true);
        expect(stroke.dash.map(n => n / widths[i])).toEqual(strokes[0].dash);
        expect(style === 'dashed' ? stroke.dash[0] > stroke.dash[1] : stroke.dash[0] < stroke.dash[1]).toBe(true);
      }
    });
  }
  for (const type of ['plot', 'hline'] as const) for (const lineStyle of ['dashed', 'dotted'] as const) {
    for (const staticMode of [false, true]) it(`native ${type} ${lineStyle} static=${staticMode}: own effect per width`, () => {
      const patterns = widths.map((linewidth, i) => {
        const harness = nativePlotHarness([testPlot({ type, lineStyle, linewidth, price: levels[i] })], staticMode);
        const paths = harness.paths().filter(p => p.props.style === 'stroke'); expect(paths.length).toBeGreaterThan(0);
        return paths.map(path => {
          expect(path.props.strokeWidth).toBe(linewidth);
          const effect = nativePrimitives(path.props.children).find(p => p.type === DashPathEffect)!;
          expect(effect).toBeDefined(); return effect.props.intervals as number[];
        });
      });
      patterns.forEach((paths, i) => paths.forEach(pattern => expect(pattern.map(n => n / widths[i])).toEqual(patterns[0][0])));
    });
    it(`web ${type} ${lineStyle}: actual legacy, pane and unified paints scale by own width`, () => {
      const replay = executeDash();
      for (const mode of ['legacy', 'pane', 'unified']) {
        const patterns = widths.map((linewidth, i) => {
          const plot = testPlot({ type, lineStyle, linewidth, price: levels[i], values: replay.bars.map(() => levels[i]) });
          let dash: number[] = [], measured: number[] | undefined;
          const canvas = createCanvas(1280, 400), ctx = canvas.getContext('2d');
          const adapter = new Proxy(ctx, { get(target, key) {
            if (key === 'setLineDash') return (v: number[]) => { dash = [...v]; target.setLineDash(v); };
            if (key === 'stroke') return () => { if (String(target.strokeStyle).toLowerCase() === '#12345680') { expect(target.lineWidth).toBe(linewidth); measured = [...dash]; } target.stroke(); };
            const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
          }, set(target, key, value) { return Reflect.set(target, key, value, target); } });
          const renderer = new TealchartRenderer(adapter as unknown as CanvasContext, { width: 1280, height: 400, showVolume: false }, { left: 0, right: 0, top: 0, bottom: 0 });
          const viewport = { startTime: replay.bars[0].time, endTime: replay.bars.at(-1)!.time, priceMin: 0, priceMax: 100 };
          if (mode === 'legacy') renderer.renderPlots([plot], replay.bars, viewport);
          else if (mode === 'pane') renderer.renderPlots([{ ...plot, scriptId: 's' }], replay.bars, viewport,
            { mainPaneHeight: 0, volumePaneHeight: 0, indicatorPanes: [{ id: 'study', indicatorIds: ['s'], heightRatio: 1, fixedRange: true, yMin: 0, yMax: 100 }] }, { s: { overlay: false } });
          else renderer.renderWithLayoutPasses({ bars: replay.bars, viewport, plots: [{ ...plot, scriptId: 's' }],
            layout: { timeAxisHeight: 0, panes: [{ id: 'main', type: 'main', heightRatio: 1, yMin: 0, yMax: 100, fixedRange: true }] },
            indicatorPaneInfo: { s: { overlay: true } }, passes: ['main-overlay-content'] });
          expect(measured).toHaveLength(2); return measured!;
        });
        patterns.forEach((pattern, i) => expect(pattern.map(n => n / widths[i])).toEqual(patterns[0]));
      }
    });
  }
});
