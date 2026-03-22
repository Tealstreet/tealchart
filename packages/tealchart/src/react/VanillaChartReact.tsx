/**
 * VanillaChartReact - Thin React wrapper for vanilla chart components
 *
 * This component provides a React-friendly interface to the vanilla chart.
 * It handles the React lifecycle and provides ref-based access to the chart API.
 *
 * Usage:
 * ```tsx
 * import { VanillaChartReact } from '@tealstreet/tealchart/react';
 *
 * function MyChart() {
 *   const chartRef = useRef<VanillaChartHandle>(null);
 *
 *   useEffect(() => {
 *     // Access chart API
 *     chartRef.current?.setBars(myBars);
 *   }, []);
 *
 *   return (
 *     <VanillaChartReact
 *       ref={chartRef}
 *       symbol="BTCUSDT"
 *       onIntervalChange={(interval) => console.log(interval)}
 *     />
 *   );
 * }
 * ```
 */
import type { SimpleChartOptions } from '../TealchartVanilla';
import type { Bar, ResolutionString, Viewport } from '../types';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { createSimpleChart, SimpleChart } from '../TealchartVanilla';

// ============================================================================
// Types
// ============================================================================

export interface VanillaChartHandle {
  /** Set bar data */
  setBars: (bars: Bar[]) => void;
  /** Update a single bar */
  updateBar: (bar: Bar) => void;
  /** Set viewport */
  setViewport: (viewport: Viewport) => void;
  /** Set symbol */
  setSymbol: (symbol: string, exchangeName?: string) => void;
  /** Get current bars */
  getBars: () => Bar[];
  /** Get current interval */
  getInterval: () => ResolutionString;
  /** Force render */
  render: () => void;
  /** Get the underlying SimpleChart instance */
  getChart: () => SimpleChart | null;
}

export interface VanillaChartReactProps {
  /** Symbol to display */
  symbol: string;
  /** Exchange name */
  exchangeName?: string;
  /** Initial interval */
  interval?: ResolutionString;
  /** Chart key for state persistence */
  chartKey?: string;
  /** Show top bar */
  showTopBar?: boolean;
  /** Initial bars (optional) */
  bars?: Bar[];
  /** Callback when interval changes */
  onIntervalChange?: (interval: ResolutionString) => void;
  /** Callback when an indicator is added */
  onIndicatorAdd?: (indicator: { id: string; name: string }) => void;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

// ============================================================================
// Component
// ============================================================================

export const VanillaChartReact = forwardRef<VanillaChartHandle, VanillaChartReactProps>(
  (
    {
      symbol,
      exchangeName,
      interval = '1h' as ResolutionString,
      chartKey,
      showTopBar = true,
      bars,
      onIntervalChange,
      onIndicatorAdd,
      className,
      style,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<SimpleChart | null>(null);

    // Create chart on mount
    useEffect(() => {
      if (!containerRef.current) return;

      const chart = createSimpleChart({
        container: containerRef.current,
        symbol,
        exchangeName,
        interval,
        chartKey,
        showTopBar,
      });

      // Set initial bars if provided
      if (bars && bars.length > 0) {
        chart.setBars(bars);
      }

      // Set callbacks
      if (onIntervalChange) {
        chart.onIntervalChange(onIntervalChange);
      }
      if (onIndicatorAdd) {
        chart.onIndicatorAdd(onIndicatorAdd);
      }

      chartRef.current = chart;

      return () => {
        chart.dispose();
        chartRef.current = null;
      };
    }, []); // Only run on mount/unmount

    // Update bars when prop changes
    useEffect(() => {
      if (bars && chartRef.current) {
        chartRef.current.setBars(bars);
      }
    }, [bars]);

    // Update symbol when prop changes
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.setSymbol(symbol, exchangeName);
      }
    }, [symbol, exchangeName]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      setBars: (newBars: Bar[]) => {
        chartRef.current?.setBars(newBars);
      },
      updateBar: (bar: Bar) => {
        chartRef.current?.updateBar(bar);
      },
      setViewport: (viewport: Viewport) => {
        chartRef.current?.setViewport(viewport);
      },
      setSymbol: (newSymbol: string, newExchangeName?: string) => {
        chartRef.current?.setSymbol(newSymbol, newExchangeName);
      },
      getBars: () => chartRef.current?.getBars() ?? [],
      getInterval: () => chartRef.current?.getInterval() ?? ('1h' as ResolutionString),
      render: () => chartRef.current?.render(),
      getChart: () => chartRef.current,
    }));

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          ...style,
        }}
      />
    );
  },
);

VanillaChartReact.displayName = 'VanillaChartReact';

// ============================================================================
// Hook for more control
// ============================================================================

/**
 * Hook for using vanilla chart components in React with full control
 */
export function useVanillaChart(
  containerRef: React.RefObject<HTMLElement>,
  options: Omit<SimpleChartOptions, 'container'>,
): SimpleChart | null {
  const [chart, setChart] = useState<SimpleChart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const instance = createSimpleChart({
      ...options,
      container: containerRef.current,
    });

    setChart(instance);

    return () => {
      instance.dispose();
      setChart(null);
    };
  }, []);

  return chart;
}
