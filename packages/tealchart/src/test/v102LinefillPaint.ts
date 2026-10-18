import type { CanvasContext } from '../rendering/CanvasContext';
import type { LinefillEntry } from '../../../tealscript/tests/fixtures/v102Linefill';
import type { ComputedPane } from '../types';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { executeLinefill } from '../../../tealscript/tests/fixtures/v102Linefill';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';

export interface LinefillPaint { kind: 'fill' | 'stroke'; color: string; width: number; points: { x: number; y: number }[] }
export function traceLinefill(entry: LinefillEntry, channel: 'web' | 'native') {
  const { result, bars } = executeLinefill(entry);
  const paints: LinefillPaint[] = [];
  let points: { x: number; y: number }[] = [];
  const states: Partial<CanvasContext>[] = [];
  const noop = () => {};
  const ctx: CanvasContext = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top',
    lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath: () => { points = []; }, moveTo: (x, y) => { points.push({ x, y }); }, lineTo: (x, y) => { points.push({ x, y }); },
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, rect: noop, roundRect: noop, closePath: noop, clip: noop, scale: noop, translate: noop,
    fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, points: [...points] }),
    fillRect: (_x, y) => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, points: [{ x: _x, y }] }),
    stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, points: [...points] }),
    strokeRect: (_x, y) => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, points: [{ x: _x, y }] }),
    fillText: noop,
    save: () => states.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha, font: ctx.font }),
    restore: () => Object.assign(ctx, states.pop()), setLineDash: noop, getLineDash: () => [],
    measureText: text => ({ width: text.length * 7 }) as TextMetrics,
  };
  const margins = { left: 0, right: 0, top: 0, bottom: 0 };
  const viewport = { startTime: bars[0].time, endTime: bars[bars.length - 1].time, priceMin: 0, priceMax: 100 };
  const pane: ComputedPane = { id: 'study', type: 'indicator', indicatorIds: ['captured'], heightRatio: 1, fixedRange: true,
    yMin: 0, yMax: 100, top: 0, bottom: 100, height: 100 };
  const drawings = result.drawings.map(drawing => ({ ...drawing, scriptId: 'captured' }));
  if (channel === 'web') {
    new TealScriptDrawingRenderer({ ctx, options: { ...DEFAULT_RENDER_OPTIONS, width: 1000 }, margins, font: 'sans-serif',
      coordinateResolvers: { timeToX: time => (time - viewport.startTime) / (viewport.endTime - viewport.startTime) * 1000, valueToY: value => 100 - value },
      getTextWidth: (active, text) => active.measureText(text).width,
    }).render(partitionTealScriptDrawings(drawings), bars, viewport, pane);
  } else if (channel === 'native') {
    paintNativeTealScriptDrawings({ ctx, drawings, bars, viewport, panes: [pane], width: 1000, margins });
  }
  return { paints, result, bars };
}
