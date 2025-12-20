/**
 * Chart State Management with Jotai
 * Uses atomWithStorage for persistence with per-chart keys
 */

import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { focusAtom } from 'jotai-optics';
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

/**
 * Cache of dirty state atoms by chart key (not persisted)
 * Tracks whether there are unsaved changes to the layout
 */
const isDirtyAtomCache = new Map<string, ReturnType<typeof atom<boolean>>>();

/**
 * Get or create a dirty state atom for a specific chart key
 * This is NOT persisted - it's transient state that resets on page load
 */
export function getIsDirtyAtom(chartKey: string) {
  let dirtyAtom = isDirtyAtomCache.get(chartKey);

  if (!dirtyAtom) {
    dirtyAtom = atom(false);
    isDirtyAtomCache.set(chartKey, dirtyAtom);
  }

  return dirtyAtom;
}

/**
 * Save status for visual feedback
 */
export type SaveStatus = 'idle' | 'saving' | 'success' | 'success-fading' | 'error';

/**
 * Cache of save status atoms by chart key (not persisted)
 */
const saveStatusAtomCache = new Map<string, ReturnType<typeof atom<SaveStatus>>>();

/**
 * Get or create a save status atom for a specific chart key
 */
export function getSaveStatusAtom(chartKey: string) {
  let statusAtom = saveStatusAtomCache.get(chartKey);

  if (!statusAtom) {
    statusAtom = atom<SaveStatus>('idle');
    saveStatusAtomCache.set(chartKey, statusAtom);
  }

  return statusAtom;
}

// ============================================================================
// Storage Factory
// ============================================================================

/**
 * Create a storage key for a specific chart instance
 */
function getStorageKey(chartKey: string): string {
  return `tealstreet:tealchart:${chartKey}`;
}

/**
 * Safe JSON storage that handles SSR, errors, and applies migrations
 */
function createSafeMergeStorage() {
  const baseStorage = createJSONStorage<ChartSettings>(() => {
    if (typeof window === 'undefined') {
      // SSR fallback - return a no-op storage
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }
    return localStorage;
  });

  return {
    ...baseStorage,
    getItem: (key: string, initialValue: ChartSettings) => {
      const stored = baseStorage.getItem(key, initialValue);
      // Apply migrations and safe merge on read
      return migrateChartSettings(stored, DEFAULT_CHART_SETTINGS);
    },
  };
}

// ============================================================================
// Atom Factory for Per-Chart Settings
// ============================================================================

/**
 * Cache of chart settings atoms by key
 * This ensures we don't create duplicate atoms for the same chart
 */
const chartSettingsAtomCache = new Map<string, ReturnType<typeof atomWithStorage<ChartSettings>>>();

/**
 * Get or create a chart settings atom for a specific chart key
 * Uses atomWithStorage for automatic persistence
 */
export function getChartSettingsAtom(chartKey: string) {
  let settingsAtom = chartSettingsAtomCache.get(chartKey);

  if (!settingsAtom) {
    settingsAtom = atomWithStorage<ChartSettings>(
      getStorageKey(chartKey),
      DEFAULT_CHART_SETTINGS,
      createSafeMergeStorage(),
      { getOnInit: true }
    );
    chartSettingsAtomCache.set(chartKey, settingsAtom);
  }

  return settingsAtom;
}

// ============================================================================
// Current Layout Atom Factory
// ============================================================================

/**
 * Cache of current layout atoms by chart key
 */
const currentLayoutAtomCache = new Map<string, ReturnType<typeof atomWithStorage<CurrentLayoutState>>>();

/**
 * Get or create a current layout atom for a specific chart key
 * Tracks which saved layout is currently loaded (separate from settings)
 */
export function getCurrentLayoutAtom(chartKey: string) {
  let layoutAtom = currentLayoutAtomCache.get(chartKey);

  if (!layoutAtom) {
    layoutAtom = atomWithStorage<CurrentLayoutState>(
      `${getStorageKey(chartKey)}:layout`,
      DEFAULT_CURRENT_LAYOUT,
      createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      { getOnInit: true }
    );
    currentLayoutAtomCache.set(chartKey, layoutAtom);
  }

  return layoutAtom;
}

// ============================================================================
// Focus Atoms for Individual Settings
// ============================================================================

/**
 * Create focus atoms for a specific chart's settings
 * These allow accessing/updating individual settings without re-rendering
 * components that don't depend on them
 */
export function createChartFocusAtoms(chartKey: string) {
  const baseAtom = getChartSettingsAtom(chartKey);
  const layoutAtom = getCurrentLayoutAtom(chartKey);
  const dirtyAtom = getIsDirtyAtom(chartKey);
  const statusAtom = getSaveStatusAtom(chartKey);

  return {
    /** Base settings atom */
    settingsAtom: baseAtom,

    /** Current layout atom (separate from settings) */
    currentLayoutAtom: layoutAtom,

    /** Dirty state atom (not persisted) - true when there are unsaved changes */
    isDirtyAtom: dirtyAtom,

    /** Save status atom (not persisted) - tracks save operation state */
    saveStatusAtom: statusAtom,

    /** Interval/timeframe focus atom */
    intervalAtom: focusAtom(baseAtom, (optic) => optic.prop('interval')),

    /** Symbol focus atom */
    symbolAtom: focusAtom(baseAtom, (optic) => optic.prop('symbol')),

    /** Show volume toggle focus atom */
    showVolumeAtom: focusAtom(baseAtom, (optic) => optic.prop('showVolume')),

    /** Volume height focus atom */
    volumeHeightAtom: focusAtom(baseAtom, (optic) => optic.prop('volumeHeight')),

    /** Chart type focus atom */
    chartTypeAtom: focusAtom(baseAtom, (optic) => optic.prop('chartType')),

    /** Auto scale focus atom */
    autoScaleAtom: focusAtom(baseAtom, (optic) => optic.prop('autoScale')),

    /** Viewport focus atom */
    viewportAtom: focusAtom(baseAtom, (optic) => optic.prop('viewport')),

    /** Indicators array focus atom */
    indicatorsAtom: focusAtom(baseAtom, (optic) => optic.prop('indicators')),
  };
}

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * Create a derived atom that computes interval in milliseconds
 */
export function createIntervalMsAtom(chartKey: string) {
  const { intervalAtom } = createChartFocusAtoms(chartKey);

  return atom((get) => {
    const interval = get(intervalAtom);
    return resolutionToMs(interval);
  });
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
