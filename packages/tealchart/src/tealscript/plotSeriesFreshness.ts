import type { PlotOutput } from '@tealstreet/tealscript';

function plotSeriesLength(plot: PlotOutput): number {
  return Array.isArray(plot.values) ? plot.values.length : 0;
}

function plotSeriesKey(plot: PlotOutput): string {
  return `${plot.scriptId ?? ''}:${plot.id}:${plot.type}`;
}

export function preserveLongerCurrentPlotSeries(current: PlotOutput[], next: PlotOutput[]): PlotOutput[] {
  if (current.length === 0 || next.length === 0) return next;

  const currentByKey = new Map(current.map((plot) => [plotSeriesKey(plot), plot]));
  let preservedAny = false;
  const resolved = next.map((plot) => {
    const previous = currentByKey.get(plotSeriesKey(plot));
    if (!previous) return plot;

    if (plotSeriesLength(plot) < plotSeriesLength(previous)) {
      preservedAny = true;
      return previous;
    }

    return plot;
  });

  return preservedAny ? resolved : next;
}
