/**
 * @tealstreet/tealchart
 * Custom OHLCV candlestick chart with TradingView-compatible API
 */

// Main widget class and factory
export { TealchartWidget, createTealchartWidget } from './TealchartWidget';

// Per-chart API
export { TealchartApi, type StudyCreateCallback } from './TealchartApi';

// React Native Skia component - import from '@tealstreet/tealchart/native' for React Native
// NOT exported here to avoid breaking web builds with RN dependencies

// Chart API context (for accessing chartApi in custom components)
export { ChartApiContext, useChartApi, useChartApiOptional } from './state/ChartApiContext';

// Jotai state management (for per-chart persistent settings)
export {
  getChartSettingsAtom,
  createChartFocusAtoms,
  createIntervalMsAtom,
  resolutionToMs,
  getResolutionLabel,
  getDecimalPlacesFromPrecision,
  formatPriceWithPrecision,
  AVAILABLE_TIMEFRAMES,
  DEFAULT_CHART_SETTINGS,
} from './state/chartState';
export type { ChartSettings, TimeframeOption, IndicatorInstance } from './state/chartState';

// Indicator CRUD actions
export {
  createAddIndicatorAtom,
  createRemoveIndicatorAtom,
  createUpdateIndicatorInputsAtom,
  createToggleIndicatorVisibilityAtom,
  createUpdateIndicatorNameAtom,
  createIndicatorActionsAtoms,
  generateIndicatorId,
} from './state/indicatorActions';

// Safe deep merge utilities
export { safeDeepMerge, migrateChartSettings, CHART_SETTINGS_VERSION } from './state/safeDeepMerge';

// Renderer (for advanced usage)
export { TealchartRenderer } from './TealchartRenderer';

// Gap detection (for advanced usage)
export { GapDetectionManager } from './GapDetectionManager';

// Debug logging
export { TealchartLogger, LogLevel, LogCategory } from './debug';
export type { LogEntry, LogCategoryType, TealchartLoggerOptions } from './debug';
// Event system
export { EventEmitter, Subscription } from './events/EventEmitter';
export type { EventCallback } from './events/EventEmitter';

// Types
export type {
  // Core chart types
  Bar,
  Viewport,
  RenderOptions,
  ChartOverrides,
  ChartMargins,
  InteractionState,
  CrosshairState,
  DragMode,
  // Price line system
  PriceLine,
  PriceLineLabel,
  PriceLineLabelBounds,
  ExecutionLineRenderData,
  // TradingView-compatible types
  WidgetEvent,
  ResolutionString,
  CrossHairMovedEventParams,
  EnhancedCrossHairState,
  ISubscription,
  ContextMenuItem,
  ContextMenuCallback,
  ITimeScaleApi,
  // Order/Position line types
  ExecutionDirection,
  IExecutionLineAdapter,
  OrderLineOptions,
  IOrderLineAdapter,
  PositionLineOptions,
  IPositionLineAdapter,
  // Study types
  StudyInfo,
  IStudyApi,
  // Datafeed types
  IBasicDataFeed,
  DatafeedConfiguration,
  LibrarySymbolInfo,
  PeriodParams,
  // Widget options
  TealchartWidgetOptions,
  // Gap detection types
  GapDetectionOptions,
  GapDetectionEvent,
  GapDetectionReason,
} from './types';

// Default values
export { DEFAULT_RENDER_OPTIONS, DEFAULT_MARGINS } from './types';

// Tealscript integration
export {
  TealscriptManager,
  useTealscript,
  type TealscriptManagerOptions,
  type UseTealscriptOptions,
  type UseTealscriptReturn,
} from './tealscript';
export type { PlotOutput, PlotStyle, InputDefinition, TealscriptBar, WorkerResult, WorkerError } from './tealscript';

// Built-in indicators
export {
  BUILTIN_INDICATORS,
  INDICATOR_CATEGORIES,
  getIndicatorsByCategory,
  getIndicatorById,
  searchIndicators,
} from './indicators';
export type { BuiltinIndicator } from './indicators';

// Pane management (for multi-pane indicator rendering)
export { PaneManager } from './rendering/PaneManager';
export type { PaneOffset, AddIndicatorOptions } from './rendering/PaneManager';
export type { IndicatorPane, PaneLayout } from './types';
export { DEFAULT_PANE_LAYOUT, DEFAULT_INDICATOR_PANE_HEIGHT, MIN_PANE_HEIGHT } from './types';

// TradingView Layout Transformer
// For saving/loading Custom Chart layouts in TradingView format
export {
  // Transform functions
  toTvFormat,
  fromTvFormat,
  // SaveLoad integration
  saveTealchartLayout,
  updateTealchartLayout,
  loadAsTealchart,
  isTealchartLayout,
  getAllLayouts,
  deleteLayout,
  migrateFromLocalStorage,
  // Indicator mapping utilities
  findMappingByCustomId,
  findMappingByTvStudyId,
  isCustomIdSupported,
  isTvStudyIdSupported,
  INDICATOR_MAPPINGS,
  // Migration utilities
  migrateSettings,
  needsMigration,
  CURRENT_VERSION as TRANSFORMER_CURRENT_VERSION,
} from './transformer';
export type {
  TransformResult,
  TvChartData,
  TvChartContent,
  IndicatorMapping,
  ISaveLoadAdapter,
  LayoutMetadata,
} from './transformer';

// Internationalization support
export { TranslationProvider, useChartTranslations, getTranslation, DEFAULT_TRANSLATIONS } from './i18n';
export type { ChartTranslations, PartialChartTranslations, TranslationProviderProps } from './i18n';

// Core widget logic (platform-agnostic)
export { ChartWidgetCore, getIntervalMs, INITIAL_BAR_COUNT } from './core';
export type { ChartWidgetCoreOptions, IIndicatorManager } from './core';

// React hook for core widget (works on web and mobile)
export { useTealchartCore } from './core/useTealchartCore';
export type {
  UseTealchartCoreOptions,
  TealchartCoreState,
  TealchartCoreActions,
  UseTealchartCoreReturn,
} from './core/useTealchartCore';
