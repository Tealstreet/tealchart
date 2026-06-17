/**
 * Custom Chart ↔ TradingView Transformer
 *
 * Provides bidirectional transformation between Custom Chart settings
 * and TradingView saved layout format for unified storage.
 */

// Types
export type {
  TransformResult,
  TvChartData,
  TvChartContent,
  TvSource,
  TvSourceState,
  TvPlot,
  TvPane,
  IndicatorMapping,
  IndicatorMappingRegistry,
  Migration,
} from './types';

export {
  TRANSFORMER_VERSION,
  TV_CHART_STYLES,
  CHART_TYPE_TO_TV_STYLE,
  TV_STYLE_TO_CHART_TYPE,
} from './types';

// Indicator Mapping
export {
  INDICATOR_MAPPINGS,
  findMappingByCustomId,
  findMappingByTvStudyId,
  getSupportedCustomIds,
  getSupportedTvStudyIds,
  isCustomIdSupported,
  isTvStudyIdSupported,
  mapInputsToTv,
  mapInputsFromTv,
} from './indicatorMapping';

// Transform Functions
export { toTvFormat } from './toTvFormat';
export { fromTvFormat } from './fromTvFormat';

// Migrations
export {
  migrateSettings,
  needsMigration,
  getSettingsVersion,
  validateAndFillDefaults,
  CURRENT_VERSION,
} from './migrations';

// SaveLoad Integration
export type { ISaveLoadAdapter, LayoutMetadata } from './saveLoadIntegration';
export {
  saveTealchartLayout,
  updateTealchartLayout,
  loadAsTealchart,
  isTealchartLayout,
  getAllLayouts,
  deleteLayout,
  migrateFromLocalStorage,
} from './saveLoadIntegration';

// Storage-backed SaveLoad adapter (default localStorage / AsyncStorage persistence)
export type {
  TealchartKeyValueStorage,
  AsyncStorageLike,
  StorageSaveLoadAdapterOptions,
} from './storageSaveLoadAdapter';
export {
  StorageSaveLoadAdapter,
  DEFAULT_LAYOUT_STORAGE_NAMESPACE,
  createLocalStorageKeyValueStorage,
  createAsyncStorageKeyValueStorage,
  createLocalStorageSaveLoadAdapter,
} from './storageSaveLoadAdapter';
