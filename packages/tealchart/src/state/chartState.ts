/**
 * Chart State Management with Nanostores
 * Uses persistent stores for localStorage with per-chart keys
 * Framework-agnostic - works with React, vanilla JS, or any other framework
 */

import { atom, map, computed, type MapStore, type WritableAtom } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';
import { ResolutionString } from '../types';
import { migrateChartSettings, CHART_SETTINGS_VERSION } from './safeDeepMerge';

// ============================================================================
// Indicator Instance Interface
// ============================================================================

/** Line style type for plot rendering */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/** Style override for a single plot */
export interface PlotStyleOverride {
  plotId: string;
  color?: string;
  linewidth?: number;
  lineStyle?: LineStyle;
  opacity?: number;
}

/**
 * A persisted indicator instance.
 * References built-in indicators by ID - code comes from builtinIndicators.ts
 */
export interface IndicatorInstance {
  /** Unique instance ID (e.g., "sma_1703001234567") */
  id: string;
  /** Display name (user-customizable) */
  name: string;
  /** Reference to BuiltinIndicator.id in builtinIndicators.ts */
  builtinId: string;
  /** User-configured input values */
  inputs: Record<string, unknown>;
  /** Style overrides for plots */
  styleOverrides?: PlotStyleOverride[];
  /** Visibility toggle */
  isVisible: boolean;
  /** For ordering */
  createdAt: number;
}

// ============================================================================
// Chart Settings Interface
// ============================================================================

export interface ChartSettings {
  /** Current interval/timeframe */
  interval: ResolutionString;
  /** Current symbol */
  symbol: string;
  /** Whether to show volume */
  showVolume: boolean;
  /** Volume pane height (0-1) */
  volumeHeight: number;
  /** Chart type (candle, line, etc.) - for future */
  chartType: 'candle' | 'line' | 'area';
  /** Whether to auto-scale price axis */
  autoScale: boolean;
  /** Last viewport state for restoration */
  viewport?: {
    startTime: number;
    endTime: number;
    priceMin: number;
    priceMax: number;
  };
  /** Persisted indicators */
  indicators: IndicatorInstance[];
  /** Schema version for migrations */
  version: number;
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  interval: '1h' as ResolutionString,
  symbol: 'BTCUSDT',
  showVolume: true,
  volumeHeight: 0.2,
  chartType: 'candle',
  autoScale: true,
  indicators: [],
  version: CHART_SETTINGS_VERSION,
};

// ============================================================================
// Current Layout State (separate from chart settings)
// ============================================================================

/**
 * Tracks which layout is currently loaded for a chart
 * Stored separately from ChartSettings to avoid circular save issues
 */
export interface CurrentLayoutState {
  layoutId: string | number | null;
  layoutName: string | null;
}

const DEFAULT_CURRENT_LAYOUT: CurrentLayoutState = {
  layoutId: null,
  layoutName: null,
};

// ============================================================================
// Chart Store - Combined state for a chart instance
// ============================================================================

export interface ChartStore {
  /** Persistent chart settings */
  settings: MapStore<ChartSettings>;
  /** Current layout state (persistent) */
  currentLayout: MapStore<CurrentLayoutState>;
  /** Dirty state (transient) - true when there are unsaved changes */
  isDirty: WritableAtom<boolean>;
  /** Save status (transient) - tracks save operation state */
  saveStatus: WritableAtom<SaveStatus>;
  /** Computed: interval in milliseconds */
  intervalMs: ReturnType<typeof computed>;
}

/**
 * Save status for visual feedback
 */
export type SaveStatus = 'idle' | 'saving' | 'success' | 'success-fading' | 'error';

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Create a storage key for a specific chart instance
 */
function getStorageKey(chartKey: string): string {
  return `tealstreet:tealchart:${chartKey}`;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Load and migrate settings from localStorage
 */
function loadSettings(chartKey: string): ChartSettings {
  if (!isBrowser()) return DEFAULT_CHART_SETTINGS;

  try {
    const key = getStorageKey(chartKey);
    const stored = localStorage.getItem(key);
    if (!stored) return DEFAULT_CHART_SETTINGS;

    const parsed = JSON.parse(stored);
    // Apply migrations and safe merge on read
    return migrateChartSettings(parsed, DEFAULT_CHART_SETTINGS);
  } catch {
    return DEFAULT_CHART_SETTINGS;
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings(chartKey: string, settings: ChartSettings): void {
  if (!isBrowser()) return;

  try {
    const key = getStorageKey(chartKey);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load layout state from localStorage
 */
function loadLayoutState(chartKey: string): CurrentLayoutState {
  if (!isBrowser()) return DEFAULT_CURRENT_LAYOUT;

  try {
    const key = `${getStorageKey(chartKey)}:layout`;
    const stored = localStorage.getItem(key);
    if (!stored) return DEFAULT_CURRENT_LAYOUT;
    return JSON.parse(stored);
  } catch {
    return DEFAULT_CURRENT_LAYOUT;
  }
}

/**
 * Save layout state to localStorage
 */
function saveLayoutState(chartKey: string, state: CurrentLayoutState): void {
  if (!isBrowser()) return;

  try {
    const key = `${getStorageKey(chartKey)}:layout`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Chart Store Factory
// ============================================================================

/**
 * Cache of chart stores by key
 * This ensures we don't create duplicate stores for the same chart
 */
const chartStoreCache = new Map<string, ChartStore>();

/**
 * Create a persistent map store with auto-save
 */
function createPersistentSettingsStore(chartKey: string): MapStore<ChartSettings> {
  const initialValue = loadSettings(chartKey);
  const store = map<ChartSettings>(initialValue);

  // Subscribe to changes and persist
  store.subscribe((value) => {
    saveSettings(chartKey, value);
  });

  return store;
}

/**
 * Create a persistent layout store with auto-save
 */
function createPersistentLayoutStore(chartKey: string): MapStore<CurrentLayoutState> {
  const initialValue = loadLayoutState(chartKey);
  const store = map<CurrentLayoutState>(initialValue);

  // Subscribe to changes and persist
  store.subscribe((value) => {
    saveLayoutState(chartKey, value);
  });

  return store;
}

/**
 * Get or create a chart store for a specific chart key
 */
export function getChartStore(chartKey: string): ChartStore {
  let store = chartStoreCache.get(chartKey);

  if (!store) {
    const settings = createPersistentSettingsStore(chartKey);
    const currentLayout = createPersistentLayoutStore(chartKey);
    const isDirty = atom(false);
    const saveStatus = atom<SaveStatus>('idle');

    // Computed interval in milliseconds
    const intervalMs = computed(settings, (s) => resolutionToMs(s.interval));

    store = {
      settings,
      currentLayout,
      isDirty,
      saveStatus,
      intervalMs,
    };

    chartStoreCache.set(chartKey, store);
  }

  return store;
}

// ============================================================================
// Convenience Getters (for backwards compatibility)
// ============================================================================

/**
 * Get the settings store for a chart
 * @deprecated Use getChartStore(chartKey).settings instead
 */
export function getChartSettingsAtom(chartKey: string): MapStore<ChartSettings> {
  return getChartStore(chartKey).settings;
}

/**
 * Get the current layout store for a chart
 * @deprecated Use getChartStore(chartKey).currentLayout instead
 */
export function getCurrentLayoutAtom(chartKey: string): MapStore<CurrentLayoutState> {
  return getChartStore(chartKey).currentLayout;
}

/**
 * Get the dirty state atom for a chart
 * @deprecated Use getChartStore(chartKey).isDirty instead
 */
export function getIsDirtyAtom(chartKey: string): WritableAtom<boolean> {
  return getChartStore(chartKey).isDirty;
}

/**
 * Get the save status atom for a chart
 * @deprecated Use getChartStore(chartKey).saveStatus instead
 */
export function getSaveStatusAtom(chartKey: string): WritableAtom<SaveStatus> {
  return getChartStore(chartKey).saveStatus;
}

// ============================================================================
// Store Update Helpers
// ============================================================================

/**
 * Update a single property in the settings store
 */
export function updateChartSetting<K extends keyof ChartSettings>(
  chartKey: string,
  key: K,
  value: ChartSettings[K]
): void {
  const store = getChartStore(chartKey).settings;
  store.setKey(key, value);
}

/**
 * Update multiple properties in the settings store
 */
export function updateChartSettings(
  chartKey: string,
  updates: Partial<ChartSettings>
): void {
  const store = getChartStore(chartKey).settings;
  const current = store.get();
  store.set({ ...current, ...updates });
}

/**
 * Get the current value of a setting
 */
export function getChartSetting<K extends keyof ChartSettings>(
  chartKey: string,
  key: K
): ChartSettings[K] {
  return getChartStore(chartKey).settings.get()[key];
}

/**
 * Subscribe to a specific setting
 */
export function subscribeToSetting<K extends keyof ChartSettings>(
  chartKey: string,
  key: K,
  callback: (value: ChartSettings[K]) => void
): () => void {
  const store = getChartStore(chartKey).settings;
  let prevValue = store.get()[key];

  return store.subscribe((settings) => {
    const newValue = settings[key];
    if (newValue !== prevValue) {
      prevValue = newValue;
      callback(newValue);
    }
  });
}

// ============================================================================
// Focus Atoms Compatibility Layer
// ============================================================================

/**
 * Create focus atoms for a specific chart's settings
 * This provides a similar API to the old Jotai focusAtom pattern
 * @deprecated Use getChartStore(chartKey) and direct property access instead
 */
export function createChartFocusAtoms(chartKey: string) {
  const store = getChartStore(chartKey);

  // Create computed stores for individual properties
  const intervalAtom = computed(store.settings, (s) => s.interval);
  const symbolAtom = computed(store.settings, (s) => s.symbol);
  const showVolumeAtom = computed(store.settings, (s) => s.showVolume);
  const volumeHeightAtom = computed(store.settings, (s) => s.volumeHeight);
  const chartTypeAtom = computed(store.settings, (s) => s.chartType);
  const autoScaleAtom = computed(store.settings, (s) => s.autoScale);
  const viewportAtom = computed(store.settings, (s) => s.viewport);
  const indicatorsAtom = computed(store.settings, (s) => s.indicators);

  return {
    /** Base settings store */
    settingsAtom: store.settings,

    /** Current layout store (separate from settings) */
    currentLayoutAtom: store.currentLayout,

    /** Dirty state atom (not persisted) - true when there are unsaved changes */
    isDirtyAtom: store.isDirty,

    /** Save status atom (not persisted) - tracks save operation state */
    saveStatusAtom: store.saveStatus,

    /** Interval/timeframe computed store */
    intervalAtom,

    /** Symbol computed store */
    symbolAtom,

    /** Show volume toggle computed store */
    showVolumeAtom,

    /** Volume height computed store */
    volumeHeightAtom,

    /** Chart type computed store */
    chartTypeAtom,

    /** Auto scale computed store */
    autoScaleAtom,

    /** Viewport computed store */
    viewportAtom,

    /** Indicators array computed store */
    indicatorsAtom,

    // Setters for individual properties
    setInterval: (value: ResolutionString) => updateChartSetting(chartKey, 'interval', value),
    setSymbol: (value: string) => updateChartSetting(chartKey, 'symbol', value),
    setShowVolume: (value: boolean) => updateChartSetting(chartKey, 'showVolume', value),
    setVolumeHeight: (value: number) => updateChartSetting(chartKey, 'volumeHeight', value),
    setChartType: (value: 'candle' | 'line' | 'area') => updateChartSetting(chartKey, 'chartType', value),
    setAutoScale: (value: boolean) => updateChartSetting(chartKey, 'autoScale', value),
    setViewport: (value: ChartSettings['viewport']) => updateChartSetting(chartKey, 'viewport', value),
    setIndicators: (value: IndicatorInstance[]) => updateChartSetting(chartKey, 'indicators', value),
  };
}

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Create a computed store that returns interval in milliseconds
 * @deprecated Use getChartStore(chartKey).intervalMs instead
 */
export function createIntervalMsAtom(chartKey: string) {
  return getChartStore(chartKey).intervalMs;
}

/**
 * Convert resolution string to milliseconds
 * TradingView-style resolutions:
 * - "5" = 5 minutes (no suffix means minutes)
 * - "60" = 60 minutes = 1 hour
 * - "1H" = 1 hour
 * - "1D" = 1 day
 * - "1W" = 1 week
 */
export function resolutionToMs(resolution: ResolutionString): number {
  const num = parseInt(resolution, 10) || 1;
  const unit = resolution.replace(/[0-9]/g, '').toUpperCase();

  switch (unit) {
    case 'S': return num * 1000;
    case '': // Minutes (no suffix) - TradingView standard
    case 'M': return num * 60 * 1000;
    case 'H': return num * 60 * 60 * 1000;
    case 'D': return num * 24 * 60 * 60 * 1000;
    case 'W': return num * 7 * 24 * 60 * 60 * 1000;
    default: return num * 60 * 1000; // Default to minutes for unknown suffixes
  }
}

// ============================================================================
// Available Timeframes
// ============================================================================

export interface TimeframeOption {
  value: ResolutionString;
  label: string;
  shortLabel: string;
}

export const AVAILABLE_TIMEFRAMES: TimeframeOption[] = [
  { value: '1' as ResolutionString, label: '1 minute', shortLabel: '1m' },
  { value: '3' as ResolutionString, label: '3 minutes', shortLabel: '3m' },
  { value: '5' as ResolutionString, label: '5 minutes', shortLabel: '5m' },
  { value: '15' as ResolutionString, label: '15 minutes', shortLabel: '15m' },
  { value: '30' as ResolutionString, label: '30 minutes', shortLabel: '30m' },
  { value: '60' as ResolutionString, label: '1 hour', shortLabel: '1h' },
  { value: '240' as ResolutionString, label: '4 hours', shortLabel: '4h' },
  { value: '1D' as ResolutionString, label: '1 day', shortLabel: '1D' },
  { value: '1W' as ResolutionString, label: '1 week', shortLabel: '1W' },
];

/**
 * Get display label for a resolution
 */
export function getResolutionLabel(resolution: ResolutionString): string {
  const option = AVAILABLE_TIMEFRAMES.find(tf => tf.value === resolution);
  return option?.shortLabel || resolution;
}

// ============================================================================
// Price Formatting Utilities
// ============================================================================

/**
 * Get number of decimal places from a precision value
 * E.g., 0.00001 -> 5, 0.01 -> 2, 0.1 -> 1
 *
 * This is equivalent to @tealstreet/math's getSigDigitsFromPrecision
 */
export function getDecimalPlacesFromPrecision(precision: number): number {
  if (precision <= 0 || !Number.isFinite(precision)) return 2;
  if (precision >= 1) return 0;

  let strNum = precision.toString();

  // Handle scientific notation (e.g., 1e-8)
  if (strNum.includes('e')) {
    const parts = strNum.split('e');
    const exp = parseInt(parts[1], 10);
    if (exp < 0) {
      // For negative exponents, the decimal places = -exp + (digits after decimal in mantissa)
      const mantissa = parts[0];
      const decimalIdx = mantissa.indexOf('.');
      const mantissaDecimals = decimalIdx >= 0 ? mantissa.length - decimalIdx - 1 : 0;
      return -exp + mantissaDecimals;
    }
    return 0;
  }

  // Count decimal places directly
  const decimalIdx = strNum.indexOf('.');
  if (decimalIdx < 0) return 0;

  // Count non-zero significant digits after decimal
  const afterDecimal = strNum.slice(decimalIdx + 1);
  return afterDecimal.length;
}

/**
 * Format a price with the given precision
 */
export function formatPriceWithPrecision(price: number, precision: number): string {
  const decimals = getDecimalPlacesFromPrecision(precision);
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
