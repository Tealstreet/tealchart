/**
 * useTealchartCore - React hook wrapper for ChartWidgetCore
 *
 * Provides reactive state management for chart data.
 * Works on both web (React) and mobile (React Native).
 */

import type { Bar, IBasicDataFeed, UnifiedPaneLayout } from '../types';
import type { ChartWidgetBarsChangedContext, ChartWidgetDataContext, IIndicatorManager } from './ChartWidgetCore';
import type { HistoryBackfillDirection, HistoryBackfillRequestHint } from './historyBackfill';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { TIME_AXIS_HEIGHT } from '../types';
import { normalizeResolution } from '../utils/normalizeResolution';
import { ChartWidgetCore } from './ChartWidgetCore';

// Force re-render helper
function useForceUpdate() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  return forceUpdate;
}

export interface UseTealchartCoreOptions {
  /** Datafeed for fetching bars - when undefined, hook is disabled (no-op) */
  datafeed?: IBasicDataFeed;
  symbol: string;
  interval?: string;
  indicatorManager?: IIndicatorManager;
  realtimeUpdateThrottleMs?: number;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
}

export interface TealchartCoreState {
  bars: Bar[];
  barsContext: ChartWidgetBarsChangedContext | null;
  isLoading: boolean;
  isLoadingMoreBars: boolean;
  symbol: string;
  interval: string;
  unifiedLayout: UnifiedPaneLayout;
}

export interface TealchartCoreActions {
  setSymbol: (symbol: string) => void;
  setInterval: (interval: string) => void;
  setIndicatorManager: (manager: IIndicatorManager) => void;
  requestMoreBars: (direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint) => void;
}

export type UseTealchartCoreReturn = TealchartCoreState &
  TealchartCoreActions & {
    core: ChartWidgetCore | null;
    /** Whether the hook is enabled (datafeed was provided) */
    enabled: boolean;
  };

// Default empty pane layout for disabled state
const EMPTY_PANE_LAYOUT: UnifiedPaneLayout = {
  panes: [
    {
      id: 'main',
      type: 'main',
      heightRatio: 1.0,
      yMin: 0,
      yMax: 0,
      fixedRange: false,
    },
  ],
  timeAxisHeight: TIME_AXIS_HEIGHT,
};

type TealchartCoreStateAction =
  | {
      type: 'barsChanged';
      bars: Bar[];
      context: ChartWidgetBarsChangedContext;
    }
  | {
      type: 'loadingChanged';
      loading: boolean;
      context: ChartWidgetDataContext;
    }
  | {
      type: 'loadingMoreBarsChanged';
      loading: boolean;
      context: ChartWidgetDataContext;
    }
  | {
      type: 'symbolChanged';
      symbol: string;
    }
  | {
      type: 'intervalChanged';
      interval: string;
    }
  | {
      type: 'controlledDataContextChanged';
      symbol: string;
      interval: string;
    };

export function dataContextMatches(state: TealchartCoreState, context: ChartWidgetDataContext): boolean {
  return state.symbol === context.symbol && state.interval === context.interval;
}

export function tealchartCoreStateReducer(
  state: TealchartCoreState,
  action: TealchartCoreStateAction,
): TealchartCoreState {
  switch (action.type) {
    case 'barsChanged':
      if (!dataContextMatches(state, action.context)) return state;
      return {
        ...state,
        bars: [...action.bars],
        barsContext: action.context,
      };
    case 'loadingChanged':
      if (!dataContextMatches(state, action.context)) return state;
      return {
        ...state,
        isLoading: action.loading,
      };
    case 'loadingMoreBarsChanged':
      if (!dataContextMatches(state, action.context)) return state;
      return {
        ...state,
        isLoadingMoreBars: action.loading,
      };
    case 'symbolChanged':
      return {
        ...state,
        symbol: action.symbol,
        isLoading: true,
        isLoadingMoreBars: false,
      };
    case 'intervalChanged':
      return {
        ...state,
        interval: action.interval,
        isLoading: true,
        isLoadingMoreBars: false,
      };
    case 'controlledDataContextChanged':
      return {
        ...state,
        symbol: action.symbol,
        interval: action.interval,
        isLoading: true,
        isLoadingMoreBars: false,
      };
    default:
      return state;
  }
}

/**
 * React hook that wraps ChartWidgetCore for reactive state management.
 *
 * When datafeed is undefined, the hook is disabled and returns empty state.
 * This allows the hook to be called unconditionally while supporting controlled mode.
 *
 * Usage:
 * ```tsx
 * const { bars, isLoading, setSymbol, setInterval, core, enabled } = useTealchartCore({
 *   datafeed,
 *   symbol: 'BTC/USDT',
 *   interval: '15',
 * });
 *
 * // In controlled mode (no datafeed), use bars from props instead
 * const effectiveBars = enabled ? bars : controlledBars;
 * ```
 */
export function useTealchartCore(options: UseTealchartCoreOptions): UseTealchartCoreReturn {
  const forceUpdate = useForceUpdate();
  const coreRef = useRef<ChartWidgetCore | null>(null);
  const lastIntervalPropRef = useRef(options.interval);
  const lastSymbolPropRef = useRef(options.symbol);

  // Whether the hook is enabled (datafeed provided)
  const enabled = !!options.datafeed;

  const [coreState, dispatchCoreState] = useReducer(tealchartCoreStateReducer, {
    bars: [],
    barsContext: null,
    isLoading: enabled,
    isLoadingMoreBars: false,
    symbol: options.symbol,
    interval: normalizeResolution(options.interval, '1h'),
    unifiedLayout: EMPTY_PANE_LAYOUT,
  });

  const core = coreRef.current;

  // Create and initialize core in effect (only if enabled)
  useEffect(() => {
    if (!enabled || !options.datafeed) return;
    const interval = normalizeResolution(options.interval, '1h');
    lastSymbolPropRef.current = options.symbol;
    lastIntervalPropRef.current = options.interval;
    dispatchCoreState({ type: 'controlledDataContextChanged', symbol: options.symbol, interval });

    const instance = new ChartWidgetCore({
      datafeed: options.datafeed,
      symbol: options.symbol,
      interval: options.interval,
      indicatorManager: options.indicatorManager,
      realtimeUpdateThrottleMs: options.realtimeUpdateThrottleMs,
      scheduleRender: () => {},
      onBarsChanged: (newBars, context) => {
        dispatchCoreState({ type: 'barsChanged', bars: newBars, context });
      },
      onLoadingChanged: (loading, context) => {
        dispatchCoreState({ type: 'loadingChanged', loading, context });
      },
      onLoadingMoreBarsChanged: (loading, context) => {
        dispatchCoreState({ type: 'loadingMoreBarsChanged', loading, context });
      },
      onSymbolChange: (s) => {
        dispatchCoreState({ type: 'symbolChanged', symbol: s });
        options.onSymbolChange?.(s);
      },
      onIntervalChange: (i) => {
        dispatchCoreState({ type: 'intervalChanged', interval: i });
        options.onIntervalChange?.(i);
      },
    });
    coreRef.current = instance;
    instance.initialize();
    forceUpdate(); // trigger re-render so consumers see the core

    return () => {
      instance.dispose();
      coreRef.current = null;
    };
  }, [enabled, options.datafeed, options.realtimeUpdateThrottleMs]);

  // Handle symbol prop changes
  useEffect(() => {
    if (!core) {
      lastSymbolPropRef.current = options.symbol;
      return;
    }
    if (Object.is(lastSymbolPropRef.current, options.symbol)) return;
    lastSymbolPropRef.current = options.symbol;
    core.setSymbol(options.symbol);
  }, [options.symbol, core]);

  // Handle interval prop changes
  useEffect(() => {
    if (!core) {
      lastIntervalPropRef.current = options.interval;
      return;
    }
    if (Object.is(lastIntervalPropRef.current, options.interval)) return;
    lastIntervalPropRef.current = options.interval;
    if (options.interval) core.setInterval(options.interval);
  }, [options.interval, core]);

  // Handle indicator manager changes
  useEffect(() => {
    if (core && options.indicatorManager) {
      core.setIndicatorManager(options.indicatorManager);
    }
  }, [options.indicatorManager, core]);

  // Actions (no-op when disabled)
  const setSymbol = useCallback(
    (s: string) => {
      core?.setSymbol(s);
    },
    [core],
  );

  const setIntervalAction = useCallback(
    (i: string) => {
      core?.setInterval(i);
    },
    [core],
  );

  const setIndicatorManager = useCallback(
    (manager: IIndicatorManager) => {
      core?.setIndicatorManager(manager);
    },
    [core],
  );

  const requestMoreBars = useCallback(
    (direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint) => {
      core?.requestMoreBars(direction, hint);
    },
    [core],
  );

  return {
    // State
    bars: coreState.bars,
    barsContext: coreState.barsContext,
    isLoading: coreState.isLoading,
    isLoadingMoreBars: coreState.isLoadingMoreBars,
    symbol: coreState.symbol,
    interval: coreState.interval,
    unifiedLayout: core?.getUnifiedLayout() ?? coreState.unifiedLayout,

    // Actions
    setSymbol,
    setInterval: setIntervalAction,
    setIndicatorManager,
    requestMoreBars,

    // Core instance (null when disabled)
    core,

    // Whether the hook is enabled
    enabled,
  };
}
