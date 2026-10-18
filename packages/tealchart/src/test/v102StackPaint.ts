import type { CanvasContext } from '../rendering/CanvasContext';
import type { StackEntry } from '../../../tealscript/tests/fixtures/v102Stack';
import type { ComputedPane } from '../types';
import { DEFAULT_RENDER_OPTIONS } from '../types';
import { executeStack } from '../../../tealscript/tests/fixtures/v102Stack';
import { TealchartRenderer } from '../TealchartRenderer';
import { TealScriptDrawingRenderer } from '../rendering/TealScriptDrawingRenderer';
import { partitionTealScriptDrawings } from '../rendering/TealScriptDrawingPartition';
import { paintNativeTealScriptDrawings } from '../mobile/render/nativeTealScriptDrawings';

export interface StackPaint { kind: 'fill' | 'stroke'; color: string; width: number; y?: number }
export function traceStack(entry: StackEntry, channel: 'web' | 'native' | 'plots') {
  const { result, bars } = executeStack(entry);
  const paints: StackPaint[] = [];
  let pathY: number | undefined;
  const states: Partial<CanvasContext>[] = [];
  const noop = () => {};
  const ctx: CanvasContext = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top',
    lineDashOffset: 0, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    beginPath: () => { pathY = undefined; }, moveTo: (_x, y) => { pathY ??= y; }, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, rect: noop, roundRect: noop, closePath: noop, clip: noop, scale: noop, translate: noop,
    fill: () => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, y: pathY }),
    fillRect: (_x, y) => paints.push({ kind: 'fill', color: String(ctx.fillStyle), width: ctx.lineWidth, y }),
    stroke: () => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, y: pathY }),
    strokeRect: (_x, y) => paints.push({ kind: 'stroke', color: String(ctx.strokeStyle), width: ctx.lineWidth, y }),
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
  } else {
    new TealchartRenderer(ctx, { width: 1706, height: 993, showVolume: false }).renderWithLayoutPasses({ bars, viewport,
      layout: { timeAxisHeight: 25, panes: [
        { id: 'main', type: 'main', heightRatio: 0.6, yMin: 80000, yMax: 84000, fixedRange: true },
        { id: 'study', type: 'indicator', heightRatio: 0.4, yMin: 0, yMax: 100, fixedRange: true, indicatorIds: ['captured'] },
      ] }, plots: result.plots.map(plot => ({ ...plot, scriptId: 'captured' })), drawings,
      indicatorPaneInfo: { captured: { overlay: false, explicitPlotZOrder: result.declaration.explicitPlotZOrder } },
      passes: ['indicator-price-content', 'indicator-content'],
    });
  }
  return { paints, result };
}
