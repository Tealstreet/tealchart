/**
 * ChartApiContext - React context for passing TealchartApi to components
 * This enables components like ChartTopBar to call chartApi.setResolution()
 * which emits TradingView-compatible subscription callbacks.
 */

import { createContext, useContext } from 'react';
import { TealchartApi } from '../TealchartApi';

/**
 * Context for accessing the TealchartApi instance
 */
export const ChartApiContext = createContext<TealchartApi | null>(null);

/**
 * Hook to access the TealchartApi from context
 * @throws Error if used outside of ChartApiContext.Provider
 */
export function useChartApi(): TealchartApi {
  const api = useContext(ChartApiContext);
  if (!api) {
    throw new Error('useChartApi must be used within ChartApiContext.Provider');
  }
  return api;
}

/**
 * Hook to optionally access the TealchartApi (returns null if not in context)
 * Use this when the component might be rendered outside the widget context
 */
export function useChartApiOptional(): TealchartApi | null {
  return useContext(ChartApiContext);
}
