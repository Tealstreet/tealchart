import type { PlotOutput } from './context';
import type { DrawingOutput } from './drawings/types';
import type { ExecutionResult } from './types';

export const CALCULATED_BARS_INPUT_ID = '__indicator_calc_bars_count';

function offsetCoordinate(value: number | null, offset: number): number | null {
  return value === null ? null : value + offset;
}

function projectDrawing(drawing: DrawingOutput, offset: number): DrawingOutput {
  const projected = { ...drawing, barIndex: drawing.barIndex + offset };
  if (!('xloc' in projected) || projected.xloc !== 'bar_index') return projected;
  switch (projected.type) {
    case 'label': return { ...projected, x: offsetCoordinate(projected.x, offset) };
    case 'line': return { ...projected, x1: offsetCoordinate(projected.x1, offset), x2: offsetCoordinate(projected.x2, offset) };
    case 'box': return { ...projected, left: offsetCoordinate(projected.left, offset), right: offsetCoordinate(projected.right, offset) };
    case 'polyline': return { ...projected, points: projected.points.map((point) => ({ ...point, index: offsetCoordinate(point.index, offset) })) };
  }
  return projected;
}

function projectPlot(plot: PlotOutput, offset: number): PlotOutput {
  const projected = { ...plot };
  for (const [name, values] of Object.entries(plot)) {
    if (Array.isArray(values) && values.length > 0) {
      Object.assign(projected, { [name]: [...Array(offset).fill(null), ...values] });
    }
  }
  return projected;
}

export function projectCalculatedBarOutputs(result: ExecutionResult, offset: number): ExecutionResult {
  return {
    ...result,
    plots: result.plots.map((plot) => projectPlot(plot, offset)),
    drawings: result.drawings.map((drawing) => projectDrawing(drawing, offset)),
    alerts: result.alerts.map((alert) => ({
      ...alert,
      values: alert.values.length > 0 ? [...Array(offset).fill(null), ...alert.values] : alert.values,
      renderedMessages: alert.renderedMessages && alert.renderedMessages.length > 0
        ? [...Array(offset).fill(null), ...alert.renderedMessages] : alert.renderedMessages,
      events: alert.events.map((event) => ({ ...event, barIndex: event.barIndex + offset })),
    })),
  };
}
