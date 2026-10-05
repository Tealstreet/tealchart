import type { PlotOutput } from '@tealstreet/tealscript';

type OhlcFields = Pick<PlotOutput, 'openValues' | 'highValues' | 'lowValues' | 'closeValues'>;

/** Preserve the geometry formerly supplied by the runtime, without changing raw readouts. */
export function getPlotOhlcGeometry(plot: OhlcFields, index: number) {
  const open = plot.openValues?.[index];
  const high = plot.highValues?.[index];
  const low = plot.lowValues?.[index];
  const close = plot.closeValues?.[index];
  if (
    typeof open !== 'number' ||
    !Number.isFinite(open) ||
    typeof high !== 'number' ||
    !Number.isFinite(high) ||
    typeof low !== 'number' ||
    !Number.isFinite(low) ||
    typeof close !== 'number' ||
    !Number.isFinite(close)
  )
    return null;
  return { open, high: Math.max(open, high, low, close), low: Math.min(open, high, low, close), close };
}
