import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar } from '../../types';
import type { NativeIndicatorPlotTailDiff, NativeIndicatorTail, NativeIndicatorTailPoint } from './nativeIndicatorTail';

import { getNativeIndicatorPlotKey } from './nativeIndicatorTail';
import { canDrawNativeIndicatorTailColor, getNativeIndicatorTailPoint } from './NativeIndicatorPlotLayer';

/** What the chart last committed, against which an indicator result decides whether it can skip React. */
export interface NativeIndicatorTailCommit {
  bars: readonly Bar[];
  /** Live branches are on screen and the bar tail is live for the same market. */
  drawingLive: boolean;
  market: string;
  plotsByKey: ReadonlyMap<string, PlotOutput>;
  /** Readouts the live channel cannot redraw yet; any visible one sends the result through React. */
  readoutsShown: boolean;
}

function isNativeTailSeries(plot: PlotOutput): boolean {
  return plot.type === 'plot' && (plot.offset ?? 0) === 0;
}

/**
 * The live points a worker result publishes, and whether they painted it completely.
 *
 * With a diff, only the moved plots are published and the result skips React when every
 * one can be drawn by its committed paths. Without one the result renders anyway, and the
 * newest points are published so no earlier tail for this bar outlives it.
 */
export function resolveNativeIndicatorTail({
  commit,
  diff,
  styledPlots,
}: {
  commit: NativeIndicatorTailCommit | null;
  diff: NativeIndicatorPlotTailDiff | null;
  styledPlots: readonly PlotOutput[];
}): { painted: boolean; tail: NativeIndicatorTail | null } {
  const none = { painted: false, tail: null };
  if (!commit || !commit.market) return none;
  const lastIndex = commit.bars.length - 1;
  const bar = commit.bars[lastIndex];
  if (!bar) return none;

  const plotsByKey = new Map(styledPlots.map((plot) => [getNativeIndicatorPlotKey(plot), plot]));
  const points: Record<string, NativeIndicatorTailPoint> = {};

  if (diff) {
    if (diff.index !== lastIndex) return none;
    let drawable = true;
    for (const key of diff.keys) {
      const plot = plotsByKey.get(key);
      const committed = commit.plotsByKey.get(key);
      if (!plot || !committed) return none;
      const point = getNativeIndicatorTailPoint(plot, lastIndex);
      if (!canDrawNativeIndicatorTailColor(committed, point.color)) drawable = false;
      points[key] = point;
    }
    const tail = { market: commit.market, time: bar.time, points };
    return { painted: drawable && commit.drawingLive && !commit.readoutsShown, tail };
  }

  // Every series, drawable by the outgoing paths or not: a key left out would keep an
  // older tail that then overrides the incoming commit's own last point.
  for (const [key, plot] of plotsByKey) {
    if (!isNativeTailSeries(plot) || plot.values.length - 1 !== lastIndex) continue;
    points[key] = getNativeIndicatorTailPoint(plot, lastIndex);
  }
  return { painted: false, tail: { market: commit.market, time: bar.time, points } };
}
