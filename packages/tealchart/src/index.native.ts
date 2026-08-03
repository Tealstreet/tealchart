/**
 * @tealstreet/tealchart - React Native entry point
 *
 * This file is automatically resolved by Metro bundler for React Native apps.
 * Keep this surface native-safe. Do not re-export ./index because Metro resolves
 * it back through this file and web-only exports pull Konva into React Native.
 */

export { TealchartApi } from './TealchartApi';

export {
  DEFAULT_BUY_CANDLE_COLOR,
  DEFAULT_SELL_CANDLE_COLOR,
  DEFAULT_TRADE_LINE_BUY_COLOR,
  DEFAULT_TRADE_LINE_COLOR,
  DEFAULT_TRADE_LINE_LABEL_FONT,
  DEFAULT_TRADE_LINE_SELL_COLOR,
  POSITIVE_PNL_COLOR,
  STOP_LOSS_COLOR,
  TAKE_PROFIT_COLOR,
} from './constants';

export {
  AVAILABLE_TIMEFRAMES,
  DEFAULT_CHART_SETTINGS,
  formatPriceWithPrecision,
  getDecimalPlacesFromPrecision,
  getResolutionLabel,
  resolutionToMs,
} from './state/chartState';
export type { ChartSettings, IndicatorInstance, TimeframeOption } from './state/chartState';
export {
  BUILTIN_CHART_THEMES,
  DARK_CHART_THEME,
  LIGHT_CHART_THEME,
  chartThemeToRenderOptions,
  mergeChartThemeRenderOptions,
  resolveChartTheme,
} from './theme';
export type { ChartTheme, ChartThemeInput, ChartThemeName, ChartThemeRenderOptions } from './theme';
export * from './types';

// React Native Skia component
export { SkiaTealchart } from './SkiaTealchart';
export type { SkiaTealchartHandle, SkiaTealchartProps } from './SkiaTealchart';
export { createAsyncStorageKeyValueStorage, StorageSaveLoadAdapter } from './transformer/storageSaveLoadAdapter';
export type { ISaveLoadAdapter, LayoutMetadata } from './transformer/saveLoadIntegration';
export type { AsyncStorageLike, TealchartKeyValueStorage } from './transformer/storageSaveLoadAdapter';

// Native passive chart exports.
export { AVAILABLE_TIMEFRAMES as MOBILE_TIMEFRAMES } from './state/chartState';
export type { TimeframeOption as MobileTimeframeOption } from './state/chartState';
