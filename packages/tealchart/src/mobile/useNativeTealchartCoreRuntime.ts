import type { WorkerError } from '@tealstreet/tealscript';
import type { IIndicatorManager } from '../core/ChartWidgetCore';
import type { ChartThemeInput } from '../theme';
import type { IBasicDataFeed } from '../types';

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import { useTealchartCore } from '../core/useTealchartCore';
import { getIndicatorById } from '../indicators/builtinIndicators';
import { TealchartApi } from '../TealchartApi';
import { MobileIndicatorManager } from './MobileIndicatorManager';

export interface NativeTealchartCoreRuntimeInput {
  datafeed?: IBasicDataFeed;
  onLayoutDirty?: () => void;
  onIntervalChange?: (interval: string) => void;
  onSymbolChange?: (symbol: string) => void;
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
  propInterval: string;
  propSymbol: string;
  theme: ChartThemeInput;
}

export function useNativeTealchartCoreRuntime({
  datafeed,
  onLayoutDirty,
  onIntervalChange,
  onSymbolChange,
  onTealscriptError,
  propInterval,
  propSymbol,
  theme,
}: NativeTealchartCoreRuntimeInput) {
  const [, forceUpdate] = useReducer((value: number) => value + 1, 0);
  const chartApiRef = useRef<TealchartApi | null>(null);
  if (!chartApiRef.current) {
    chartApiRef.current = new TealchartApi(propSymbol, propInterval);
    chartApiRef.current.setOnLinesChanged(forceUpdate);
  }
  const chartApi = chartApiRef.current;
  const [imperativeTheme, setImperativeTheme] = useState<ChartThemeInput | null>(null);
  const indicatorManagerRef = useRef<MobileIndicatorManager | null>(null);
  if (!indicatorManagerRef.current) {
    indicatorManagerRef.current = new MobileIndicatorManager();
    indicatorManagerRef.current.setOnUpdate(forceUpdate);
  }

  const coreResult = useTealchartCore({
    datafeed,
    symbol: propSymbol,
    interval: propInterval,
    indicatorManager: indicatorManagerRef.current as unknown as IIndicatorManager,
    onSymbolChange,
    onIntervalChange,
  });
  const { bars, barsContext, symbol, interval, isLoading, isLoadingMoreBars, requestMoreBars } = coreResult;

  useLayoutEffect(() => {
    chartApi.setOnLinesChanged(forceUpdate);
    chartApi.setOnOrderPriceChanged(forceUpdate);
    chartApi.setOnSymbolChange((nextSymbol) => coreResult.setSymbol(nextSymbol));
    chartApi.setOnIntervalChange((nextInterval) => coreResult.setInterval(nextInterval));
    chartApi.setOnStudyCreate(async (request) => {
      const indicator = getIndicatorById(request.name);
      const code = request.name.trim().startsWith('//@version') ? request.name : indicator?.code;
      if (!code) return false;
      indicatorManagerRef.current?.addTealscriptIndicator({
        id: request.studyId,
        code,
        builtinId: indicator?.id,
        name: request.options?.displayName ?? indicator?.name ?? request.displayName,
        overlay: request.forceOverlay || (indicator?.overlay ?? false),
        inputs: request.inputs,
        yAxisRange: indicator?.yAxisRange,
      });
      onLayoutDirty?.();
      return true;
    });
    chartApi.setOnStudyRemove((studyId) => {
      indicatorManagerRef.current?.removeIndicator(studyId);
      onLayoutDirty?.();
    });
  }, [chartApi, coreResult.setInterval, coreResult.setSymbol, forceUpdate, onLayoutDirty]);

  useEffect(() => {
    const manager = indicatorManagerRef.current;
    if (!manager || !onTealscriptError) return;
    manager.onErrorSubscribe(onTealscriptError);
    return () => {
      manager.onErrorUnsubscribe(onTealscriptError);
    };
  }, [onTealscriptError]);

  useEffect(() => {
    if (chartApi.symbol() !== symbol) chartApi.setSymbol(symbol);
  }, [chartApi, symbol]);

  useEffect(() => {
    if (chartApi.resolution() !== interval) chartApi.setResolution(interval);
  }, [chartApi, interval]);

  useEffect(() => {
    setImperativeTheme(null);
  }, [theme]);

  return {
    bars,
    barsContext,
    chartApi,
    forceUpdate,
    imperativeTheme,
    indicatorManager: indicatorManagerRef.current,
    interval,
    isLoading,
    isLoadingMoreBars,
    requestMoreBars,
    setImperativeTheme,
    symbol,
  };
}
