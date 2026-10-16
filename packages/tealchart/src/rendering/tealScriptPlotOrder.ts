import type { PlotOutput } from '@tealstreet/tealscript';

/** Back-to-front order within one script; explicit order affects plots/levels/fills. */
export function orderTealScriptPlots(plots: readonly PlotOutput[], explicitPlotZOrder = false): PlotOutput[] {
  const backgrounds = plots.filter(plot => plot.type === 'bgcolor');
  const foregrounds = plots.filter(plot => plot.type !== 'bgcolor');
  return backgrounds.concat(explicitPlotZOrder
    ? foregrounds.sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0))
    : [...foregrounds.filter(plot => plot.type === 'fill'),
      ...foregrounds.filter(plot => plot.type !== 'fill' && plot.type !== 'hline'),
      ...foregrounds.filter(plot => plot.type === 'hline')]);
}
