import { vi } from 'vitest';

import {
  InMemoryRequestDatafeed,
  TealscriptEngine,
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  quandlRequestKey,
  type Bar,
  type ExecutionResult,
  type RequestCorporateActionQuery,
  type RequestCurrencyRateQuery,
  type RequestDatafeed,
  type RequestDatafeedQuery,
  type RequestEconomicSeriesQuery,
  type RequestFinancialMetricQuery,
  type RequestFootprintQuery,
  type RequestQuandlSeriesQuery,
  type TealscriptEngineOptions,
} from '../../src';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen';
import { executeClosure, tryCompileClosure } from '../../src/runtime/closure/execute';
import { analyzeCompiledRealtimeSafety } from '../../src/runtime/realtimeSafety';
import type {
  ErrorMessage,
  FromWorkerMessage,
  RequestDataMessage,
  RequestDataResultMessage,
  ResultMessage,
  SemanticErrorMessage,
  ParseErrorMessage,
  ToWorkerMessage,
} from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';

export interface ProductionWorkerCase {
  scriptId: string;
  source: string;
  bars: Bar[];
  engineOptions?: TealscriptEngineOptions;
  liveUpdateBars?: Bar[];
}

export interface ProductionWorkerMeasurement {
  scriptId: string;
  executionMode: string;
  fallbackReason?: string;
  error?: string;
  output?: RealtimeOutputSnapshot;
}

export interface ProductionWorkerLiveUpdateMeasurement extends ProductionWorkerMeasurement {
  updateIndex: number;
}

export interface ProductionWorkerSessionMeasurement {
  loadMeasurements: ProductionWorkerMeasurement[];
  updateMeasurements: ProductionWorkerLiveUpdateMeasurement[];
}

export interface RealtimeOutputSnapshot {
  plots: unknown;
  drawings: unknown;
  alerts: unknown;
  logs: unknown;
  strategy?: unknown;
}

export interface RealtimeParityMismatch {
  scriptId: string;
  updateIndex: number;
  path: 'worker' | 'closure' | 'interpreter';
  reason: string;
}

export type RealtimeParityBackend = 'worker' | 'closure';

export interface RealtimeParityGroupMeasurement {
  backend: RealtimeParityBackend;
  totalUpdates: number;
  workerMatched: number;
  workerMismatches: RealtimeParityMismatch[];
  interpreterMatched: number;
  interpreterMismatches: RealtimeParityMismatch[];
  closureMatched?: number;
  closureMismatches?: RealtimeParityMismatch[];
}

export type ForcedCompiledRealtimeClassification = 'genuine-divergence' | 'overtrigger-matched' | 'compiled-unavailable';

export interface ForcedCompiledRealtimeUpdateMeasurement {
  scriptId: string;
  updateIndex: number;
  fallbackReason: string;
  classification: ForcedCompiledRealtimeClassification;
  reason?: string;
}

export interface ForcedCompiledRealtimeScriptMeasurement {
  scriptId: string;
  fallbackReason: string;
  classification: ForcedCompiledRealtimeClassification;
  reason?: string;
}

export interface ForcedCompiledRealtimeSafetyMeasurement {
  scripts: ForcedCompiledRealtimeScriptMeasurement[];
  updates: ForcedCompiledRealtimeUpdateMeasurement[];
}

function isRequestDataMessage(message: FromWorkerMessage): message is RequestDataMessage {
  return message.type === 'requestData';
}

function isResultMessage(message: FromWorkerMessage): message is ResultMessage {
  return message.type === 'result';
}

function isErrorMessage(message: FromWorkerMessage): message is ErrorMessage | SemanticErrorMessage | ParseErrorMessage {
  return message.type === 'error' || message.type === 'parseError' || message.type === 'semanticError';
}

function isTerminalScriptMessage(message: FromWorkerMessage, scriptId: string): message is ResultMessage | ErrorMessage | SemanticErrorMessage | ParseErrorMessage {
  return (isResultMessage(message) || isErrorMessage(message)) && message.scriptId === scriptId;
}

function resolveRequestData(
  request: RequestDataMessage,
  datafeed: RequestDatafeed,
): RequestDataResultMessage {
  const base = {
    type: 'requestDataResult' as const,
    scriptId: request.scriptId,
    requestId: request.requestId,
    generation: request.generation,
    kind: request.kind,
  };

  if (request.kind === 'bars') {
    const query = request.query as RequestDatafeedQuery;
    const result = datafeed.getBars(query);
    return {
      ...base,
      ok: true,
      value: result.ok ? result.context : null,
    };
  }

  if (request.kind === 'currency_rate') {
    const query = request.query as RequestCurrencyRateQuery;
    const value = datafeed.getCurrencyRate?.(query);
    const key = currencyRateRequestKey(query.baseCurrency, query.quoteCurrency);
    const series = datafeed.getSeries?.({ family: 'currency_rate', key });
    return {
      ...base,
      ok: true,
      value: value ?? (series?.ok ? series.context.points : null),
    };
  }

  if (request.kind === 'corporate_action') {
    const query = request.query as RequestCorporateActionQuery;
    const value = datafeed.getCorporateAction?.(query);
    const key = corporateActionRequestKey(query.ticker, `${query.kind}.gross`, query.currency);
    const series = datafeed.getSeries?.({ family: query.kind, key });
    return {
      ...base,
      ok: true,
      value: value ?? (series?.ok ? series.context.points : null),
    };
  }

  if (request.kind === 'economic') {
    const query = request.query as RequestEconomicSeriesQuery;
    const value = datafeed.getEconomicSeries?.(query);
    const key = economicRequestKey(query.countryCode, query.field);
    const series = datafeed.getSeries?.({ family: 'economic', key });
    return {
      ...base,
      ok: true,
      value: value ?? (series?.ok ? series.context.points : null),
    };
  }

  if (request.kind === 'financial') {
    const query = request.query as RequestFinancialMetricQuery;
    const value = datafeed.getFinancialMetric?.(query);
    const key = financialRequestKey(query.symbol, query.financialId, query.period, query.currency);
    const series = datafeed.getSeries?.({ family: 'financial', key });
    return {
      ...base,
      ok: true,
      value: value ?? (series?.ok ? series.context.points : null),
    };
  }

  if (request.kind === 'quandl') {
    const query = request.query as RequestQuandlSeriesQuery;
    const value = datafeed.getQuandlSeries?.(query);
    const key = quandlRequestKey(query.ticker, query.column);
    const series = datafeed.getSeries?.({ family: 'quandl', key });
    return {
      ...base,
      ok: true,
      value: value ?? (series?.ok ? series.context.points : null),
    };
  }

  if (request.kind === 'footprint') {
    const query = request.query as RequestFootprintQuery;
    return {
      ...base,
      ok: true,
      value: datafeed.getFootprint?.(query) ?? null,
    };
  }

  return {
    ...base,
    ok: true,
    value: null,
  };
}

export async function measureProductionWorkerCases(cases: ProductionWorkerCase[]): Promise<ProductionWorkerMeasurement[]> {
  return (await measureProductionWorkerSessions(cases, { includeLiveUpdates: false })).loadMeasurements;
}

export async function measureProductionWorkerSessions(
  cases: ProductionWorkerCase[],
  options: { includeLiveUpdates?: boolean; includeOutputs?: boolean; includeStrategyOutput?: boolean } = {},
): Promise<ProductionWorkerSessionMeasurement> {
  const posted: FromWorkerMessage[] = [];
  const workerGlobal = {
    onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
    postMessage: (message: FromWorkerMessage) => {
      posted.push(message);
    },
  };
  vi.resetModules();
  vi.stubGlobal('self', workerGlobal);

  await import('../../src/worker/worker');

  const loadMeasurements: ProductionWorkerMeasurement[] = [];
  const updateMeasurements: ProductionWorkerLiveUpdateMeasurement[] = [];
  for (const testCase of cases) {
    const start = posted.length;
    const generation = start + 1;
    let requestId = generation;
    const datafeed = testCase.engineOptions?.requestDatafeed ?? new InMemoryRequestDatafeed([]);
    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: testCase.scriptId,
        script: testCase.source,
        bars: cloneBars(testCase.bars),
        inputs: {},
        runtime: testCase.engineOptions?.runtime,
        libraries: testCase.engineOptions?.libraries,
        metadata: { generation, requestId, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    loadMeasurements.push(await waitForTerminalMeasurement({
      posted,
      workerGlobal,
      datafeed,
      start,
      scriptId: testCase.scriptId,
      includeOutput: options.includeOutputs,
      includeStrategyOutput: options.includeStrategyOutput,
    }));

    if (options.includeLiveUpdates) {
      const ticks = liveUpdateBarsForCase(testCase);
      for (const [updateIndex, bar] of ticks.entries()) {
        const updateStart = posted.length;
        requestId += 1;
        workerGlobal.onmessage?.({
          data: {
            type: 'updateBar',
            bar,
            metadata: { generation, requestId, requestKind: 'incremental' },
          },
        } as MessageEvent<ToWorkerMessage>);
        const measurement = await waitForTerminalMeasurement({
          posted,
          workerGlobal,
          datafeed,
          start: updateStart,
          scriptId: testCase.scriptId,
          includeOutput: options.includeOutputs,
          includeStrategyOutput: options.includeStrategyOutput,
        });
        updateMeasurements.push({ ...measurement, updateIndex });
      }
    }

  }

  return { loadMeasurements, updateMeasurements };
}

async function waitForTerminalMeasurement(args: {
  posted: FromWorkerMessage[];
  workerGlobal: { onmessage: ((event: MessageEvent<ToWorkerMessage>) => void) | null };
  datafeed: RequestDatafeed;
  start: number;
  scriptId: string;
  includeOutput?: boolean;
  includeStrategyOutput?: boolean;
}): Promise<ProductionWorkerMeasurement> {
  const { posted, workerGlobal, datafeed, start, scriptId, includeOutput = false, includeStrategyOutput = false } = args;
  let cursor = start;
  for (let spin = 0; spin < 100; spin += 1) {
    const messages = posted.slice(cursor);
    cursor = posted.length;
    const terminal = posted.slice(start).find((message) => isTerminalScriptMessage(message, scriptId));
    if (terminal) {
      if (isResultMessage(terminal)) {
        return {
          scriptId,
          executionMode: terminal.profile?.executionMode ?? 'unknown',
          fallbackReason: terminal.profile?.fallbackReason,
          output: includeOutput ? normalizeWorkerResult(terminal, includeStrategyOutput) : undefined,
        };
      }
      return {
        scriptId,
        executionMode: 'error',
        error: terminal.message,
      };
    }

    for (const request of messages.filter((message): message is RequestDataMessage => (
      isRequestDataMessage(message) && message.scriptId === scriptId
    ))) {
      workerGlobal.onmessage?.({
        data: resolveRequestData(request, datafeed),
      } as MessageEvent<ToWorkerMessage>);
    }
  }

  return {
    scriptId,
    executionMode: 'error',
    error: 'Worker did not produce a terminal message',
  };
}

function createLiveUpdateBars(bars: Bar[]): Bar[] {
  const last = bars[bars.length - 1];
  if (!last) return [];
  return [0.25, -0.15, 0.4].map((delta, index) => {
    const close = last.close + delta;
    return {
      ...last,
      high: Math.max(last.high, close),
      low: Math.min(last.low, close),
      close,
      volume: last.volume + (index + 1) * 10,
    };
  });
}

function cloneBars(bars: Bar[]): Bar[] {
  return bars.map((bar) => ({ ...bar }));
}

function liveUpdateBarsForCase(testCase: ProductionWorkerCase): Bar[] {
  return testCase.liveUpdateBars ?? createLiveUpdateBars(testCase.bars);
}

export async function measureRealtimeReentryParity(
  cases: ProductionWorkerCase[],
  options: { includeStrategy?: boolean; backend?: RealtimeParityBackend } = {},
): Promise<RealtimeParityGroupMeasurement> {
  if (options.backend === 'closure') return measureClosureRealtimeReconstructionParity(cases, options);

  const includeStrategy = options.includeStrategy === true;
  const workerSession = await measureProductionWorkerSessions(cases.map((testCase) => ({
    ...testCase,
    bars: cloneBars(testCase.bars),
  })), {
    includeLiveUpdates: true,
    includeOutputs: true,
    includeStrategyOutput: includeStrategy,
  });
  const workerByScript = new Map<string, ProductionWorkerLiveUpdateMeasurement[]>();
  for (const measurement of workerSession.updateMeasurements) {
    const measurements = workerByScript.get(measurement.scriptId) ?? [];
    measurements.push(measurement);
    workerByScript.set(measurement.scriptId, measurements);
  }
  const freshWorkerCases = cases.flatMap((testCase) => (
    liveUpdateBarsForCase(testCase).map((bar, updateIndex) => ({
      ...testCase,
      scriptId: reentryCaseId(testCase.scriptId, updateIndex),
      bars: cloneBars(testCase.bars),
      liveUpdateBars: [{ ...bar }],
    }))
  ));
  const freshWorkerSession = await measureProductionWorkerSessions(freshWorkerCases, {
    includeLiveUpdates: true,
    includeOutputs: true,
    includeStrategyOutput: includeStrategy,
  });
  const freshWorkerByScript = new Map(freshWorkerSession.updateMeasurements.map((measurement) => [measurement.scriptId, measurement]));
  const workerMismatches: RealtimeParityMismatch[] = [];
  const interpreterMismatches: RealtimeParityMismatch[] = [];
  let totalUpdates = 0;

  for (const testCase of cases) {
    const ticks = liveUpdateBarsForCase(testCase);
    const interpreter = new TealscriptEngine(testCase.engineOptions);
    const ast = parse(testCase.source);
    interpreter.execute(ast, testCase.bars);

    for (const [updateIndex, bar] of ticks.entries()) {
      totalUpdates += 1;

      const workerUpdate = workerByScript.get(testCase.scriptId)?.find((measurement) => measurement.updateIndex === updateIndex);
      const workerExpected = freshWorkerByScript.get(reentryCaseId(testCase.scriptId, updateIndex));
      if (!workerExpected?.output) {
        workerMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'worker',
          reason: workerExpected?.error ?? 'fresh-worker-missing-output',
        });
      } else if (!workerUpdate?.output || !snapshotsEqual(workerUpdate.output, workerExpected.output)) {
        workerMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'worker',
          reason: workerUpdate?.error ?? firstSnapshotDifference(workerUpdate?.output, workerExpected.output),
        });
      }

      let interpreterOutput: RealtimeOutputSnapshot | undefined;
      try {
        const plots = interpreter.updateBar(ast, bar);
        interpreterOutput = normalizeExecutionSnapshot({
          plots,
          drawings: interpreter.getDrawings(),
          alerts: interpreter.getAlerts(),
          logs: interpreter.getLogs(),
          strategy: (interpreter as unknown as { ctx: { strategyLedger: unknown } }).ctx.strategyLedger,
        }, includeStrategy);
      } catch (error) {
        interpreterMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'interpreter',
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const freshInterpreter = new TealscriptEngine(testCase.engineOptions);
      freshInterpreter.execute(ast, cloneBars(testCase.bars));
      const freshPlots = freshInterpreter.updateBar(ast, { ...bar });
      const interpreterExpected = normalizeExecutionSnapshot({
        plots: freshPlots,
        drawings: freshInterpreter.getDrawings(),
        alerts: freshInterpreter.getAlerts(),
        logs: freshInterpreter.getLogs(),
        strategy: (freshInterpreter as unknown as { ctx: { strategyLedger: unknown } }).ctx.strategyLedger,
      }, includeStrategy);
      if (!snapshotsEqual(interpreterOutput, interpreterExpected)) {
        interpreterMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'interpreter',
          reason: firstSnapshotDifference(interpreterOutput, interpreterExpected),
        });
      }
    }
  }

  return {
    backend: 'worker',
    totalUpdates,
    workerMatched: totalUpdates - workerMismatches.length,
    workerMismatches,
    interpreterMatched: totalUpdates - interpreterMismatches.length,
    interpreterMismatches,
  };
}

function measureClosureRealtimeReconstructionParity(
  cases: ProductionWorkerCase[],
  options: { includeStrategy?: boolean } = {},
): RealtimeParityGroupMeasurement {
  const includeStrategy = options.includeStrategy === true;
  const closureMismatches: RealtimeParityMismatch[] = [];
  const interpreterMismatches: RealtimeParityMismatch[] = [];
  let totalUpdates = 0;

  for (const testCase of cases) {
    const ast = parse(testCase.source);
    const closure = tryCompileClosure(ast, { libraries: testCase.engineOptions?.libraries });
    if (!closure.success) {
      for (const [updateIndex] of liveUpdateBarsForCase(testCase).entries()) {
        totalUpdates += 1;
        closureMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'closure',
          reason: `closure-unsupported: ${closure.unsupported.join('; ')}`,
        });
      }
      continue;
    }

    for (const [updateIndex, bar] of liveUpdateBarsForCase(testCase).entries()) {
      totalUpdates += 1;
      const updatedBars = [...cloneBars(testCase.bars.slice(0, -1)), { ...bar }];
      const closureOptions: TealscriptEngineOptions = {
        ...testCase.engineOptions,
        realtimeLastBar: { isNew: false },
      };
      const closureUpdate = executeClosure(closure, updatedBars, undefined, closureOptions);
      if (closureUpdate.profile.executionMode !== 'closure') {
        closureMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'closure',
          reason: `closure-selected-sweep-used-${closureUpdate.profile.executionMode}`,
        });
        continue;
      }

      const closureFresh = executeClosure(closure, updatedBars, undefined, closureOptions);
      const closureOutput = normalizeExecutionResult(closureUpdate, includeStrategy);
      const closureExpected = normalizeExecutionResult(closureFresh, includeStrategy);
      if (!snapshotsEqual(closureOutput, closureExpected)) {
        closureMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'closure',
          reason: firstSnapshotDifference(closureOutput, closureExpected),
        });
      }

      const freshInterpreter = new TealscriptEngine(testCase.engineOptions);
      freshInterpreter.execute(ast, cloneBars(testCase.bars));
      const freshPlots = freshInterpreter.updateBar(ast, { ...bar });
      const interpreterExpected = normalizeExecutionSnapshot({
        plots: freshPlots,
        drawings: freshInterpreter.getDrawings(),
        alerts: freshInterpreter.getAlerts(),
        logs: freshInterpreter.getLogs(),
        strategy: (freshInterpreter as unknown as { ctx: { strategyLedger: unknown } }).ctx.strategyLedger,
      }, includeStrategy);
      if (!snapshotsEqual(closureOutput, interpreterExpected)) {
        interpreterMismatches.push({
          scriptId: testCase.scriptId,
          updateIndex,
          path: 'interpreter',
          reason: firstSnapshotDifference(closureOutput, interpreterExpected),
        });
      }
    }
  }

  return {
    backend: 'closure',
    totalUpdates,
    workerMatched: totalUpdates - closureMismatches.length,
    workerMismatches: closureMismatches,
    interpreterMatched: totalUpdates - interpreterMismatches.length,
    interpreterMismatches,
    closureMatched: totalUpdates - closureMismatches.length,
    closureMismatches,
  };
}

export function measureForcedCompiledRealtimeSafety(
  cases: ProductionWorkerCase[],
  options: { includeStrategy?: boolean; includeSafe?: boolean } = {},
): ForcedCompiledRealtimeSafetyMeasurement {
  const includeStrategy = options.includeStrategy === true;
  const includeSafe = options.includeSafe === true;
  const scripts: ForcedCompiledRealtimeScriptMeasurement[] = [];
  const updates: ForcedCompiledRealtimeUpdateMeasurement[] = [];

  for (const testCase of cases) {
    const ast = parse(testCase.source);
    const safety = analyzeCompiledRealtimeSafety(ast);
    if (!includeSafe && (safety.safe || !safety.fallbackReason)) continue;

    const fallbackReason = safety.fallbackReason ?? 'realtime-safe-after-detector-sharpening';
    const compiled = tryCompile(ast, undefined, { libraries: testCase.engineOptions?.libraries });
    const ticks = createLiveUpdateBars(testCase.bars);
    if (!compiled.success) {
      const reason = `compile-unsupported: ${compiled.unsupported.join('; ')}`;
      scripts.push({ scriptId: testCase.scriptId, fallbackReason, classification: 'compiled-unavailable', reason });
      updates.push(...ticks.map((_, updateIndex) => ({
        scriptId: testCase.scriptId,
        updateIndex,
        fallbackReason,
        classification: 'compiled-unavailable' as const,
        reason,
      })));
      continue;
    }

    const interpreter = new TealscriptEngine(testCase.engineOptions);
    interpreter.execute(ast, cloneBars(testCase.bars));
    let scriptClassification: ForcedCompiledRealtimeClassification = 'overtrigger-matched';
    const scriptReasons: string[] = [];

    for (const [updateIndex, bar] of ticks.entries()) {
      const compiledResult = executeCompiled(
        compiled,
        [...cloneBars(testCase.bars.slice(0, -1)), { ...bar }],
        undefined,
        {
          ...testCase.engineOptions,
          realtimeLastBar: { isNew: false },
        },
      );
      if (!compiledResult) {
        const reason = 'compiled execution returned null';
        scriptClassification = 'compiled-unavailable';
        scriptReasons.push(`#tick${updateIndex + 1}:${reason}`);
        updates.push({ scriptId: testCase.scriptId, updateIndex, fallbackReason, classification: 'compiled-unavailable', reason });
        continue;
      }

      const plots = interpreter.updateBar(ast, { ...bar });
      const interpreterOutput = normalizeExecutionSnapshot({
        plots,
        drawings: interpreter.getDrawings(),
        alerts: interpreter.getAlerts(),
        logs: interpreter.getLogs(),
        strategy: (interpreter as unknown as { ctx: { strategyLedger: unknown } }).ctx.strategyLedger,
      }, includeStrategy);
      const compiledOutput = normalizeExecutionResult(compiledResult, includeStrategy);
      if (snapshotsEqual(compiledOutput, interpreterOutput)) {
        updates.push({ scriptId: testCase.scriptId, updateIndex, fallbackReason, classification: 'overtrigger-matched' });
      } else {
        const reason = firstSnapshotDifference(compiledOutput, interpreterOutput);
        scriptClassification = scriptClassification === 'compiled-unavailable' ? scriptClassification : 'genuine-divergence';
        scriptReasons.push(`#tick${updateIndex + 1}:${reason}`);
        updates.push({ scriptId: testCase.scriptId, updateIndex, fallbackReason, classification: 'genuine-divergence', reason });
      }
    }

    scripts.push({
      scriptId: testCase.scriptId,
      fallbackReason,
      classification: scriptClassification,
      reason: scriptReasons.length > 0 ? scriptReasons.join('; ') : undefined,
    });
  }

  return { scripts, updates };
}

function reentryCaseId(scriptId: string, updateIndex: number): string {
  return `${scriptId}#fresh-tick${updateIndex + 1}`;
}

function normalizeWorkerResult(message: ResultMessage, includeStrategy = false): RealtimeOutputSnapshot {
  const output = getResultOutput(message);
  return normalizeExecutionSnapshot({
    plots: output.plots,
    drawings: output.drawings,
    alerts: output.alerts,
    logs: output.logs,
    strategy: output.strategy,
  }, includeStrategy);
}

function normalizeExecutionResult(result: ExecutionResult, includeStrategy = false): RealtimeOutputSnapshot {
  return normalizeExecutionSnapshot({
    plots: result.plots,
    drawings: result.drawings,
    alerts: result.alerts,
    logs: result.logs,
    strategy: result.strategy,
  }, includeStrategy);
}

function normalizeExecutionSnapshot(value: RealtimeOutputSnapshot, includeStrategy: boolean): RealtimeOutputSnapshot {
  return normalizeSnapshot({
    plots: normalizePlotDefaults(value.plots),
    drawings: value.drawings,
    alerts: value.alerts,
    logs: value.logs,
    strategy: includeStrategy ? value.strategy : undefined,
  });
}

function normalizePlotDefaults(plots: unknown): unknown {
  if (!Array.isArray(plots)) return plots;
  return plots.map((plot) => {
    if (!plot || typeof plot !== 'object') return plot;
    const candidate = plot as { type?: unknown; style?: unknown; linewidth?: unknown; offset?: unknown };
    const normalized = {
      ...candidate,
      offset: candidate.offset ?? 0,
    };
    if (candidate.type !== 'plot') return normalized;
    return {
      ...normalized,
      style: candidate.style ?? 'line',
      linewidth: candidate.linewidth ?? 1,
    };
  });
}

function normalizeSnapshot(value: RealtimeOutputSnapshot): RealtimeOutputSnapshot {
  return normalizeValue(value) as RealtimeOutputSnapshot;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return String(value);
    return Math.round(value * 1e9) / 1e9;
  }
  if (Array.isArray(value)) return value.map((entry) => normalizeValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => typeof entry !== 'function')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }
  return value;
}

function snapshotsEqual(left: RealtimeOutputSnapshot | undefined, right: RealtimeOutputSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function firstSnapshotDifference(left: RealtimeOutputSnapshot | undefined, right: RealtimeOutputSnapshot): string {
  if (!left) return 'missing-output';
  const plotDifference = firstPlotDifference(left.plots, right.plots);
  if (plotDifference) return plotDifference;
  for (const key of ['plots', 'drawings', 'alerts', 'logs', 'strategy'] as const) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      return `${key}-mismatch`;
    }
  }
  return 'output-mismatch';
}

function firstPlotDifference(left: unknown, right: unknown): string | null {
  if (JSON.stringify(left) === JSON.stringify(right)) return null;
  if (!Array.isArray(left) || !Array.isArray(right)) return 'plots-mismatch';

  for (let plotIndex = 0; plotIndex < Math.max(left.length, right.length); plotIndex += 1) {
    const leftPlot = left[plotIndex] as { title?: unknown; values?: unknown } | undefined;
    const rightPlot = right[plotIndex] as { title?: unknown; values?: unknown } | undefined;
    if (!leftPlot || !rightPlot) return `plots-mismatch:index:${plotIndex}`;
    if (JSON.stringify(leftPlot) === JSON.stringify(rightPlot)) continue;

    const title = String(rightPlot.title ?? leftPlot.title ?? plotIndex);
    if (!Array.isArray(leftPlot.values) || !Array.isArray(rightPlot.values)) {
      return firstObjectFieldDifference(leftPlot, rightPlot, `plots-mismatch:${title}`);
    }

    for (let valueIndex = 0; valueIndex < Math.max(leftPlot.values.length, rightPlot.values.length); valueIndex += 1) {
      if (JSON.stringify(leftPlot.values[valueIndex]) !== JSON.stringify(rightPlot.values[valueIndex])) {
        return `plots-mismatch:${title}:${valueIndex}:${String(leftPlot.values[valueIndex])}->${String(rightPlot.values[valueIndex])}`;
      }
    }

    return firstObjectFieldDifference(leftPlot, rightPlot, `plots-mismatch:${title}`);
  }

  return 'plots-mismatch';
}

function firstObjectFieldDifference(left: Record<string, unknown>, right: Record<string, unknown>, prefix: string): string {
  for (const key of Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort()) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      return `${prefix}:${key}:${String(left[key])}->${String(right[key])}`;
    }
  }
  return prefix;
}
