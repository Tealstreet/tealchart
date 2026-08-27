import type { PlotOutput } from '@tealstreet/tealscript';

type TealchartPlotDebugGlobal = typeof globalThis & {
  __TEALCHART_DEBUG_PLOTS?: boolean;
  localStorage?: { getItem?: (key: string) => string | null };
};

export function isTealchartPlotDebugEnabled(): boolean {
  const debugGlobal = globalThis as TealchartPlotDebugGlobal;
  if (debugGlobal.__TEALCHART_DEBUG_PLOTS) return true;
  try {
    return debugGlobal.localStorage?.getItem?.('__TEALCHART_DEBUG_PLOTS') === 'true';
  } catch {
    return false;
  }
}

export function summarizePlotsForDebug(plots: PlotOutput[]): Array<{
  scriptId: string;
  id: string;
  title: string;
  type: PlotOutput['type'];
  length: number;
  finiteCount: number;
  nonZeroCount: number;
  firstFiniteIndex: number;
  lastFiniteIndex: number;
  min: number | null;
  max: number | null;
  lastFinite: number | null;
}> {
  return plots.map((plot) => {
    let finiteCount = 0;
    let nonZeroCount = 0;
    let firstFiniteIndex = -1;
    let lastFiniteIndex = -1;
    let min: number | null = null;
    let max: number | null = null;
    let lastFinite: number | null = null;

    for (let i = 0; i < plot.values.length; i += 1) {
      const value = plot.values[i];
      if (typeof value === 'number' && Number.isFinite(value)) {
        finiteCount += 1;
        if (value !== 0) nonZeroCount += 1;
        if (firstFiniteIndex === -1) firstFiniteIndex = i;
        lastFiniteIndex = i;
        min = min === null ? value : Math.min(min, value);
        max = max === null ? value : Math.max(max, value);
        lastFinite = value;
      }
    }

    return {
      scriptId: plot.scriptId ?? 'unknown',
      id: plot.id,
      title: plot.title,
      type: plot.type,
      length: plot.values.length,
      finiteCount,
      nonZeroCount,
      firstFiniteIndex,
      lastFiniteIndex,
      min,
      max,
      lastFinite,
    };
  });
}
