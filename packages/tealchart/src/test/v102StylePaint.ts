import type { CanvasContext } from '../rendering/CanvasContext';
import type { StyleEntry } from '../../../tealscript/tests/fixtures/v102Style';
import type { ComputedPane } from '../types';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { executeStyle } from '../../../tealscript/tests/fixtures/v102Style';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';

export interface StylePaint { kind: 'fill' | 'stroke'; color: string; width: number; dash: number[]; points: { x: number; y: number }[] }
export function traceStyle(entry: StyleEntry, channel: 'web' | 'native') {
  const { result, bars } = executeStyle(entry);
  const paints: StylePaint[] = [];
  let points: { x: number; y: number }[] = [];
  let dash: number[] = [];
  const states: Partial<CanvasContext>[] = [];
  const noop = () => {};
  const ctx: CanvasContext = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top',
    lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath: () => { points = []; }, moveTo: (x, y) => { points.push({ x, y }); }, lineTo: (x, y) => { points.push({ x, y }); },
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, rect: (x, y, w, h) => { points.push({ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }); }, roundRect: noop, closePath: noop, clip: noop, scale: noop, translate: noop,
    fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, dash: [...dash], points: [...points] }),
    fillRect: (x, y, w, h) => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, dash: [...dash], points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] }),
    stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, dash: [...dash], points: [...points] }),
    strokeRect: (x, y, w, h) => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, dash: [...dash], points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] }),
    fillText: noop,
    save: () => states.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha, font: ctx.font }),
    restore: () => Object.assign(ctx, states.pop()), setLineDash: values => { dash = [...values]; }, getLineDash: () => [...dash],
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
