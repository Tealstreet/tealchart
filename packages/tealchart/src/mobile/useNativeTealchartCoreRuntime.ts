import type {
  Program,
  RequestDatafeed,
  TealscriptExecutionBackend,
  TealscriptRuntimeOptions,
  WorkerError,
} from '@tealstreet/tealscript';
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
  createTealscriptWorker?: () => Worker;
  tealscriptExecutionBackend?: TealscriptExecutionBackend;
  getTealscriptLibraries?: () => Map<string, Program> | undefined;
  getTealscriptRequestDatafeed?: () => RequestDatafeed | undefined;
  propInterval: string;
  propSymbol: string;
  realtimeUpdateThrottleMs?: number;
  theme: ChartThemeInput;
}

export function useNativeTealchartCoreRuntime({
  datafeed,
  onLayoutDirty,
  onIntervalChange,
  onSymbolChange,
  onTealscriptError,
  createTealscriptWorker,
  tealscriptExecutionBackend,
  getTealscriptLibraries,
  getTealscriptRequestDatafeed,
  propInterval,
  propSymbol,
  realtimeUpdateThrottleMs,
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
    indicatorManagerRef.current = new MobileIndicatorManager({
      tealscriptExecutionBackend,
      createWorker: createTealscriptWorker,
      getRuntimeOptions: () => createNativeTealscriptRuntimeOptions(propSymbol, propInterval, tealscriptExecutionBackend),
      getLibraries: getTealscriptLibraries,
      getRequestDatafeed: getTealscriptRequestDatafeed,
    });
    indicatorManagerRef.current.setOnUpdate(forceUpdate);
  }

  const coreResult = useTealchartCore({
    datafeed,
    symbol: propSymbol,
    interval: propInterval,
    indicatorManager: indicatorManagerRef.current as unknown as IIndicatorManager,
    realtimeUpdateThrottleMs,
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
    chartApi.setOnStudyVisibilityChange((studyId, isVisible) => {
      indicatorManagerRef.current?.setIndicatorVisibility(studyId, isVisible);
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
    indicatorManagerRef.current?.setRuntimeOptionsProvider(() =>
      createNativeTealscriptRuntimeOptions(propSymbol, propInterval, tealscriptExecutionBackend),
    );
  }, [propInterval, propSymbol, tealscriptExecutionBackend]);

  useEffect(() => {
    indicatorManagerRef.current?.setLibrariesProvider(getTealscriptLibraries);
  }, [getTealscriptLibraries]);

  useEffect(() => {
    indicatorManagerRef.current?.setRequestDatafeedProvider(getTealscriptRequestDatafeed);
  }, [getTealscriptRequestDatafeed]);

  useEffect(() => {
    indicatorManagerRef.current?.setTealscriptBackendSelection({
      tealscriptExecutionBackend,
    });
  }, [tealscriptExecutionBackend]);

  // Keyed on the PROP, in a layout effect, so `chartApi.symbol()` answers with
  // the market the host asked for in the same commit the host asked for it.
  //
  // TradingView is imperative — a host calls chart(i).setSymbol() and reads
  // chart(i).symbol() back immediately — and hosts wire their trading layer on
  // that guarantee. Going through core state instead put the api two commits
  // behind: prop -> core.setSymbol -> symbolChanged dispatch -> re-render ->
  // apply. Anything reading the api inside that window, such as a host
  // rebuilding line managers when the market changes, bound to the market the
  // chart had just left.
  useLayoutEffect(() => {
    if (propSymbol && chartApi.symbol() !== propSymbol) chartApi.setSymbol(propSymbol);
  }, [chartApi, propSymbol]);

  // The core's own symbol still drives data loading, and reaches the api by the
  // path above once it settles. Kept so a symbol changed from inside the chart
  // converges too; a no-op whenever the layout effect already applied it.
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

function createNativeTealscriptRuntimeOptions(
  symbol: string,
  interval: string,
  tealscriptExecutionBackend: TealscriptExecutionBackend | undefined,
): TealscriptRuntimeOptions {
  return {
    backend: {
      executionBackendOverride: tealscriptExecutionBackend,
    },
    syminfo: {
      ticker: symbol,
      description: symbol,
      timezone: 'UTC',
    },
    timeframe: createNativeTealscriptTimeframeInfo(interval),
  };
}

function createNativeTealscriptTimeframeInfo(period: string): TealscriptRuntimeOptions['timeframe'] {
  const normalized = String(period).trim().toUpperCase();
  const numericMinutes = Number(normalized);
  if (Number.isFinite(numericMinutes) && numericMinutes > 0) {
    return {
      period: String(period),
      multiplier: numericMinutes,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    };
  }

  const match = /^(\d+)?([STDWM])$/.exec(normalized);
  const multiplier = match?.[1] === undefined ? 1 : Number(match[1]);
  const unit = match?.[2];
  return {
    period: String(period),
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    isminutes: false,
    isdaily: unit === 'D',
    isweekly: unit === 'W',
    ismonthly: unit === 'M',
    isintraday: unit === 'S' || unit === 'T',
    isseconds: unit === 'S',
    isticks: unit === 'T',
  };
}
