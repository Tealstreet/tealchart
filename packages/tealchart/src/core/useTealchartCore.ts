/**
 * useTealchartCore - React hook wrapper for ChartWidgetCore
 *
 * Provides reactive state management for chart data.
 * Works on both web (React) and mobile (React Native).
 */

import { useRef, useState, useEffect, useCallback, useReducer } from 'react';
import { ChartWidgetCore, type ChartWidgetCoreOptions, type IIndicatorManager } from './ChartWidgetCore';
import type { Bar, IBasicDataFeed, UnifiedPaneLayout } from '../types';

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
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
}

export interface TealchartCoreState {
  bars: Bar[];
  isLoading: boolean;
  symbol: string;
  interval: string;
  unifiedLayout: UnifiedPaneLayout;
}

export interface TealchartCoreActions {
  setSymbol: (symbol: string) => void;
  setInterval: (interval: string) => void;
  setIndicatorManager: (manager: IIndicatorManager) => void;
}

export type UseTealchartCoreReturn = TealchartCoreState & TealchartCoreActions & {
  core: ChartWidgetCore | null;
  /** Whether the hook is enabled (datafeed was provided) */
  enabled: boolean;
};

// Default empty pane layout for disabled state
const EMPTY_PANE_LAYOUT: UnifiedPaneLayout = {
  mainPane: { top: 0, height: 0 },
  indicatorPanes: [],
  totalHeight: 0,
};

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

  // Whether the hook is enabled (datafeed provided)
  const enabled = !!options.datafeed;

  // Reactive state
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [symbol, setSymbolState] = useState(options.symbol);
  const [interval, setIntervalState] = useState(options.interval || '1h');

  // Create core on mount (only if enabled)
  if (enabled && !coreRef.current && options.datafeed) {
    coreRef.current = new ChartWidgetCore({
      datafeed: options.datafeed,
      symbol: options.symbol,
      interval: options.interval,
      indicatorManager: options.indicatorManager,
      scheduleRender: forceUpdate,
      onBarsChanged: (newBars) => setBars([...newBars]),
      onLoadingChanged: setIsLoading,
      onSymbolChange: (s) => {
        setSymbolState(s);
        options.onSymbolChange?.(s);
      },
      onIntervalChange: (i) => {
        setIntervalState(i);
        options.onIntervalChange?.(i);
      },
    });
  }

  const core = coreRef.current;

  // Initialize on mount (only if enabled)
  useEffect(() => {
    if (core) {
      core.initialize();
      return () => core.dispose();
    }
  }, [core]);

  // Handle symbol prop changes
  useEffect(() => {
    if (core && options.symbol !== symbol) {
      core.setSymbol(options.symbol);
    }
  }, [options.symbol, symbol, core]);

  // Handle interval prop changes
  useEffect(() => {
    if (core && options.interval && options.interval !== interval) {
      core.setInterval(options.interval);
    }
  }, [options.interval, interval, core]);

  // Handle indicator manager changes
  useEffect(() => {
    if (core && options.indicatorManager) {
      core.setIndicatorManager(options.indicatorManager);
    }
  }, [options.indicatorManager, core]);

  // Actions (no-op when disabled)
  const setSymbol = useCallback((s: string) => {
    core?.setSymbol(s);
  }, [core]);

  const setIntervalAction = useCallback((i: string) => {
    core?.setInterval(i);
  }, [core]);

  const setIndicatorManager = useCallback((manager: IIndicatorManager) => {
    core?.setIndicatorManager(manager);
  }, [core]);

  return {
    // State
    bars,
    isLoading,
    symbol,
    interval,
    unifiedLayout: core?.getUnifiedLayout() ?? EMPTY_PANE_LAYOUT,

    // Actions
    setSymbol,
    setInterval: setIntervalAction,
    setIndicatorManager,

    // Core instance (null when disabled)
    core,

    // Whether the hook is enabled
    enabled,
  };
}
