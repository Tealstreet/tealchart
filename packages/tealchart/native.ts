/**
 * React Native entry point for @tealstreet/tealchart
 *
 * Import from '@tealstreet/tealchart/native' (web) or '@packages/tealchart/native' (mobile)
 * to get Skia-based components without breaking web builds.
 */

export { SkiaTealchart } from './src/SkiaTealchart';
export type { SkiaTealchartHandle, SkiaTealchartProps, SkiaTealscriptIndicatorOptions } from './src/SkiaTealchart';
export {
  BUILTIN_CHART_THEMES,
  DARK_CHART_THEME,
  LIGHT_CHART_THEME,
  chartThemeToRenderOptions,
  mergeChartThemeRenderOptions,
  resolveChartTheme,
} from './src/theme';
export type { ChartTheme, ChartThemeInput, ChartThemeName, ChartThemeRenderOptions } from './src/theme';
