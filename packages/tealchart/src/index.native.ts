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
  DEFAULT_FAVORITE_TIMEFRAME_VALUES,
  DEFAULT_CHART_SETTINGS,
  TIMEFRAME_GROUPS,
  filterTimeframesBySupportedResolutions,
  formatPriceWithPrecision,
  getDecimalPlacesFromPrecision,
  getDefaultFavoriteTimeframeValues,
  getResolutionLabel,
  resolutionToMs,
} from './state/chartState';
export type {
  ChartSettings,
  IndicatorInstance,
  TimeframeGroup,
  TimeframeGroupDefinition,
  TimeframeOption,
} from './state/chartState';
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

// Chart settings controls (shared by the web modal and the native overlay)
export {
  CHART_SETTINGS_CONTROLS,
  CHART_SETTINGS_TABS,
  createChartPropertyControl,
  getChartSettingsControlsForTab,
  getPopulatedChartSettingsTabs,
  SHOW_VOLUME_CONTROL_ID,
} from './settings/chartSettingsControls';
export type {
  ChartSettingControl,
  ChartSettingControlKind,
  ChartSettingControlValue,
  ChartSettingsControlContext,
  ChartSettingsTab,
} from './settings/chartSettingsControls';

// Built-in indicators. Native resolves a builtin id to its code inside
// `setOnStudyCreate`, so a host passing `createStudy('macd')` needs this
// registry to build its picker - the web entry has always exported it.
export {
  BUILTIN_INDICATORS,
  INDICATOR_CATEGORIES,
  getIndicatorsByCategory,
  getIndicatorById,
  searchIndicators,
} from './indicators';
export type { BuiltinIndicator } from './indicators';

// React Native Skia component
export { SkiaTealchart } from './SkiaTealchart';
export type { SkiaTealchartHandle, SkiaTealchartProps } from './SkiaTealchart';
export { TealscriptWebViewWorkerBridge, useTealscriptWebViewWorkerBridge } from './mobile/TealscriptWebViewWorkerHost';
export {
  parseTealscriptWebViewBridgeMessage,
  stringifyTealscriptWebViewBridgeMessage,
} from './mobile/tealscriptWebViewBridgeCodec';
export { createAsyncStorageKeyValueStorage, StorageSaveLoadAdapter } from './transformer/storageSaveLoadAdapter';
export type { ISaveLoadAdapter, LayoutMetadata } from './transformer/saveLoadIntegration';
export type { AsyncStorageLike, TealchartKeyValueStorage } from './transformer/storageSaveLoadAdapter';

// Native passive chart exports.
export { AVAILABLE_TIMEFRAMES as MOBILE_TIMEFRAMES } from './state/chartState';
export type { TimeframeOption as MobileTimeframeOption } from './state/chartState';
export type { ITealchartWidget } from './widgetContract';
