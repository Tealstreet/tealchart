import type { PlotOutput } from '@tealstreet/tealscript';
import type { PlotStyleOverride } from '../state/chartState';

function withOpacity(color: string, opacity: number | undefined): string {
  if (opacity === undefined || opacity >= 100 || !/^#[\da-f]{6}([\da-f]{2})?$/i.test(color)) return color;
  return (
    color.slice(0, 7) +
    Math.round(Math.max(0, opacity) * 2.55)
      .toString(16)
      .padStart(2, '0')
  );
}
export function applyNativeIndicatorStyle(plot: PlotOutput, override?: PlotStyleOverride): PlotOutput {
  if (!override || plot.editable === false) return plot;
  // The candle barcolor consumer requires aligned colors and keeps na slots inert.
  const sourceColor =
    plot.type === 'barcolor' && Array.isArray(plot.color) && override.color !== undefined
      ? plot.color.map((value) => (value === null ? null : override.color!))
      : (override.color ?? plot.color);
  const color = Array.isArray(sourceColor)
    ? sourceColor.map((value) => (value === null ? null : withOpacity(value, override.opacity)))
    : withOpacity(sourceColor, override.opacity);
  return {
    ...plot,
    color,
    linewidth: override.linewidth ?? plot.linewidth,
    lineStyle: override.lineStyle ?? plot.lineStyle,
    gradient:
      override.color === undefined && plot.gradient
        ? {
            ...plot.gradient,
            topColors: plot.gradient.topColors.map((value) =>
              value === null ? null : withOpacity(value, override.opacity),
            ),
            bottomColors: plot.gradient.bottomColors.map((value) =>
              value === null ? null : withOpacity(value, override.opacity),
            ),
          }
        : undefined,
    wickColor: Array.isArray(plot.wickColor)
      ? plot.wickColor.map((value) => (value === null ? null : withOpacity(value, override.opacity)))
      : plot.wickColor
        ? withOpacity(plot.wickColor, override.opacity)
        : undefined,
    borderColor: Array.isArray(plot.borderColor)
      ? plot.borderColor.map((value) => (value === null ? null : withOpacity(value, override.opacity)))
      : plot.borderColor
        ? withOpacity(plot.borderColor, override.opacity)
        : undefined,
    textColor: Array.isArray(plot.textColor)
      ? plot.textColor.map((value) => (value === null ? null : withOpacity(value, override.opacity)))
      : plot.textColor
        ? withOpacity(plot.textColor, override.opacity)
        : undefined,
  };
}
export function filterNativeIndicatorStyles(
  plots: readonly PlotOutput[],
  overrides: readonly PlotStyleOverride[],
): PlotStyleOverride[] {
  return overrides.filter((override) => plots.find((plot) => plot.id === override.plotId)?.editable !== false);
}
