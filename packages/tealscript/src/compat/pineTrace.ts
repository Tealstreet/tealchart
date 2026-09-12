import { parse } from '../parser/parser';
import { checkProgram } from '../semantic/checker';
import type { AlertEvent, Bar } from '../runtime/context';
import { executeCompiledScript } from '../runtime/codegen/execute';
import type { StrategyFill, StrategyOrder } from '../runtime/strategy';
import type { ExecutionResult, TealscriptExecutionOptions } from '../runtime/types';

export const PINE_TRACE_SCHEMA_VERSION = 1;

export interface PineTraceContext {
  symbol: string;
  timeframe: string;
  session?: string;
  timezone?: string;
  inputs: Record<string, unknown>;
}

export interface PineTracePlot {
  title: string;
  values: Array<number | null>;
}

export interface PineTraceAlert {
  title: string;
  values: Array<boolean | null>;
  events?: Array<Partial<AlertEvent>>;
}

export type PineTraceOrder = Partial<StrategyOrder>;
export type PineTraceFill = Partial<StrategyFill>;

export interface PineTraceExpected {
  plots: PineTracePlot[];
  alerts?: PineTraceAlert[];
  orders?: PineTraceOrder[];
  fills?: PineTraceFill[];
}

export interface PineTrace {
  schemaVersion: typeof PINE_TRACE_SCHEMA_VERSION;
  scriptId: string;
  declaredVersion: 3 | 4 | 5 | 6;
  kind: 'indicator' | 'strategy';
  source: string;
  context: PineTraceContext;
  bars: Bar[];
  expected: PineTraceExpected;
  tolerance?: number;
}

export type PineTraceStage = 'validation' | 'parse' | 'semantic' | 'compile' | 'runtime' | 'output';

export interface PineTraceMismatch {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface PineTraceReplay {
  scriptId: string;
  passed: boolean;
  stage: PineTraceStage;
  diagnostics: string[];
  mismatches: PineTraceMismatch[];
  result?: ExecutionResult;
}

export function validatePineTrace(trace: PineTrace): string[] {
  const errors: string[] = [];
  if (trace.schemaVersion !== PINE_TRACE_SCHEMA_VERSION) errors.push('unsupported trace schema version');
  if (trace.scriptId.trim() === '') errors.push('scriptId must not be empty');
  if (![3, 4, 5, 6].includes(trace.declaredVersion)) errors.push('declaredVersion must be 3, 4, 5, or 6');
  if (trace.context.symbol.trim() === '') errors.push('context.symbol must not be empty');
  if (trace.context.timeframe.trim() === '') errors.push('context.timeframe must not be empty');
  if (trace.bars.length === 0) errors.push('bars must not be empty');
  if (trace.kind === 'strategy' && (trace.expected.orders === undefined || trace.expected.fills === undefined)) {
    errors.push('strategy traces must include expected.orders and expected.fills');
  }
  const barCount = trace.bars.length;
  trace.expected.plots.forEach((plot, index) => {
    if (plot.values.length !== barCount) errors.push(`expected.plots[${index}].values must match bars length`);
  });
  trace.expected.alerts?.forEach((alert, index) => {
    if (alert.values.length !== barCount) errors.push(`expected.alerts[${index}].values must match bars length`);
  });
  if (trace.tolerance !== undefined && (!Number.isFinite(trace.tolerance) || trace.tolerance < 0)) {
    errors.push('tolerance must be a finite non-negative number');
  }
  return errors;
}

export function parsePineTraceJson(json: string): PineTrace {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`invalid Pine trace JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = validatePineTrace(value as PineTrace);
  if (errors.length > 0) throw new Error(`invalid Pine trace: ${errors.join('; ')}`);
  return value as PineTrace;
}

export function replayPineTrace(trace: PineTrace, options: TealscriptExecutionOptions = {}): PineTraceReplay {
  const validationErrors = validatePineTrace(trace);
  if (validationErrors.length > 0) {
    return failure(trace.scriptId, 'validation', validationErrors);
  }

  let ast;
  try {
    ast = parse(trace.source);
  } catch (error) {
    return failure(trace.scriptId, 'parse', [error instanceof Error ? error.message : String(error)]);
  }

  const semanticErrors = checkProgram(ast).diagnostics
    .filter((diagnostic) => diagnostic.severity === 'error')
    .map((diagnostic) => `${diagnostic.line ?? '?'}:${diagnostic.column ?? '?'}: ${diagnostic.code}: ${diagnostic.message}`);
  if (semanticErrors.length > 0) return failure(trace.scriptId, 'semantic', semanticErrors);

  const executionOptions: TealscriptExecutionOptions = {
    ...options,
    runtime: {
      ...options.runtime,
      syminfo: {
        ...options.runtime?.syminfo,
        ticker: trace.context.symbol,
        tickerid: trace.context.symbol,
        timezone: trace.context.timezone ?? options.runtime?.syminfo?.timezone,
      },
      timeframe: {
        ...options.runtime?.timeframe,
        period: trace.context.timeframe,
      },
    },
  };
  const inputs = new Map(Object.entries(trace.context.inputs));
  const execution = executeCompiledScript(ast, trace.bars, inputs, executionOptions);
  if (execution.status === 'failure') {
    return failure(trace.scriptId, execution.kind === 'runtime' ? 'runtime' : 'compile', [execution.reason]);
  }
  if (execution.result.errors.length > 0) {
    return failure(
      trace.scriptId,
      'runtime',
      execution.result.errors.map((error) => `${error.code ?? 'runtime'}: ${error.message}`),
      execution.result,
    );
  }

  const mismatches = compareTraceOutput(trace, execution.result);
  return {
    scriptId: trace.scriptId,
    passed: mismatches.length === 0,
    stage: mismatches.length === 0 ? 'output' : 'output',
    diagnostics: [],
    mismatches,
    result: execution.result,
  };
}

function compareTraceOutput(trace: PineTrace, result: ExecutionResult): PineTraceMismatch[] {
  const mismatches: PineTraceMismatch[] = [];
  const tolerance = trace.tolerance ?? 1e-9;
  if (result.plots.length !== trace.expected.plots.length) {
    mismatches.push({ path: 'plots.length', expected: trace.expected.plots.length, actual: result.plots.length });
  }
  trace.expected.plots.forEach((expectedPlot, plotIndex) => {
    const actualPlot = result.plots[plotIndex];
    if (!actualPlot) return;
    if (actualPlot.title !== expectedPlot.title) {
      mismatches.push({ path: `plots[${plotIndex}].title`, expected: expectedPlot.title, actual: actualPlot.title });
    }
    compareValues(expectedPlot.values, actualPlot.values, `plots[${plotIndex}].values`, tolerance, mismatches);
  });
  if (trace.expected.alerts !== undefined) {
    if (result.alerts.length !== trace.expected.alerts.length) {
      mismatches.push({ path: 'alerts.length', expected: trace.expected.alerts.length, actual: result.alerts.length });
    }
    trace.expected.alerts.forEach((expectedAlert, alertIndex) => {
      const actualAlert = result.alerts[alertIndex];
      if (!actualAlert) return;
      if (actualAlert.title !== expectedAlert.title) {
        mismatches.push({ path: `alerts[${alertIndex}].title`, expected: expectedAlert.title, actual: actualAlert.title });
      }
      compareValues(expectedAlert.values, actualAlert.values, `alerts[${alertIndex}].values`, tolerance, mismatches);
      if (expectedAlert.events !== undefined) {
        compareRecords(
          expectedAlert.events as Array<Record<string, unknown>>,
          actualAlert.events as unknown as Array<Record<string, unknown>>,
          `alerts[${alertIndex}].events`,
          tolerance,
          mismatches,
        );
      }
    });
  }
  if (trace.expected.orders !== undefined) {
    compareRecords(
      trace.expected.orders as Array<Record<string, unknown>>,
      result.strategy.orders as unknown as Array<Record<string, unknown>>,
      'orders',
      tolerance,
      mismatches,
    );
  }
  if (trace.expected.fills !== undefined) {
    compareRecords(
      trace.expected.fills as Array<Record<string, unknown>>,
      result.strategy.fills as unknown as Array<Record<string, unknown>>,
      'fills',
      tolerance,
      mismatches,
    );
  }
  return mismatches;
}

function compareRecords(
  expected: Array<Record<string, unknown>>,
  actual: Array<Record<string, unknown>>,
  path: string,
  tolerance: number,
  mismatches: PineTraceMismatch[],
): void {
  if (expected.length !== actual.length) {
    mismatches.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
  }
  expected.forEach((expectedRecord, index) => {
    const actualRecord = actual[index];
    if (!actualRecord) return;
    for (const [key, expectedValue] of Object.entries(expectedRecord)) {
      compareValue(expectedValue, actualRecord[key], `${path}[${index}].${key}`, tolerance, mismatches);
    }
  });
}

function compareValues(
  expected: unknown[],
  actual: unknown[],
  path: string,
  tolerance: number,
  mismatches: PineTraceMismatch[],
): void {
  if (expected.length !== actual.length) {
    mismatches.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
  }
  expected.forEach((expectedValue, index) => {
    compareValue(expectedValue, actual[index], `${path}[${index}]`, tolerance, mismatches);
  });
}

function compareValue(
  expected: unknown,
  actual: unknown,
  path: string,
  tolerance: number,
  mismatches: PineTraceMismatch[],
): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
      if (!(Number.isNaN(expected) && Number.isNaN(actual))) mismatches.push({ path, expected, actual });
      return;
    }
    if (Math.abs(expected - actual) > tolerance * Math.max(1, Math.abs(expected), Math.abs(actual))) {
      mismatches.push({ path, expected, actual });
    }
    return;
  }
  if (Number.isNaN(expected) && (actual === null || (typeof actual === 'number' && Number.isNaN(actual)))) return;
  if (expected !== actual) mismatches.push({ path, expected, actual });
}

function failure(scriptId: string, stage: PineTraceStage, diagnostics: string[], result?: ExecutionResult): PineTraceReplay {
  return { scriptId, passed: false, stage, diagnostics, mismatches: [], ...(result ? { result } : {}) };
}
