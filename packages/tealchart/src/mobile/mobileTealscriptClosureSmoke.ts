import type {
  DrawingOutput,
  PlotOutput,
  Program,
  RequestDatafeed,
  RuntimeProfile,
} from '@tealstreet/tealscript';
import type { Bar } from '../types';

import { MobileIndicatorManager } from './MobileIndicatorManager';

export interface MobileTealscriptClosureSmokeExpectedOutput {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
}

export interface MobileTealscriptClosureSmokeCase {
  id: string;
  source: string;
  bars: Bar[];
  expectedOutput: MobileTealscriptClosureSmokeExpectedOutput;
  inputs?: Record<string, unknown>;
}

export interface MobileTealscriptClosureSmokeOptions {
  cases: MobileTealscriptClosureSmokeCase[];
  getLibraries?: (testCase: MobileTealscriptClosureSmokeCase) => Map<string, Program> | undefined;
  getRequestDatafeed?: (testCase: MobileTealscriptClosureSmokeCase) => RequestDatafeed | undefined;
  now?: () => number;
}

export interface MobileTealscriptClosureSmokeCaseResult {
  id: string;
  status: 'matched' | 'mismatched' | 'failed';
  elapsedMs: number;
  output: {
    plots: number;
    drawings: number;
    errors: number;
  };
  firstDifference?: string;
  firstError?: string;
  runtimeProfile?: RuntimeProfile;
  selectedBackend?: RuntimeProfile['selectedBackend'];
  executionMode?: RuntimeProfile['executionMode'];
  plots: PlotOutput[];
  drawings: DrawingOutput[];
}

export interface MobileTealscriptClosureSmokeResult {
  environment: {
    hermes: boolean;
  };
  total: number;
  matched: number;
  mismatched: number;
  failed: number;
  elapsedMs: number;
  results: MobileTealscriptClosureSmokeCaseResult[];
}

export function runMobileTealscriptClosureSmoke(
  options: MobileTealscriptClosureSmokeOptions,
): MobileTealscriptClosureSmokeResult {
  const now = options.now ?? defaultNow;
  const startedAt = now();
  const results = options.cases.map((testCase) => runSmokeCase(testCase, options, now));
  return {
    environment: {
      hermes: isHermesRuntime(),
    },
    total: results.length,
    matched: results.filter((result) => result.status === 'matched').length,
    mismatched: results.filter((result) => result.status === 'mismatched').length,
    failed: results.filter((result) => result.status === 'failed').length,
    elapsedMs: now() - startedAt,
    results,
  };
}

function runSmokeCase(
  testCase: MobileTealscriptClosureSmokeCase,
  options: MobileTealscriptClosureSmokeOptions,
  now: () => number,
): MobileTealscriptClosureSmokeCaseResult {
  const errors: string[] = [];
  const startedAt = now();
  const manager = new MobileIndicatorManager({
    tealscriptExecutionBackend: 'closure',
    getLibraries: () => options.getLibraries?.(testCase),
    getRequestDatafeed: () => options.getRequestDatafeed?.(testCase),
  });
  manager.onErrorSubscribe((_, error) => {
    errors.push(error.message);
  });

  try {
    manager.setBars(testCase.bars);
    const instanceId = manager.addTealscriptIndicator({
      id: testCase.id,
      code: testCase.source,
      inputs: testCase.inputs,
    });
    const runtimeProfile = manager.getIndicator(instanceId)?.runtimeProfile;
    const plots = manager.getPlots().filter((plot) => plot.scriptId === instanceId);
    const drawings = manager.getDrawings().filter((drawing) => drawing.scriptId === instanceId);
    const firstDifference = findFirstSmokeDifference(
      normalizeRenderedOutput(testCase.expectedOutput),
      normalizeRenderedOutput({ plots, drawings }),
    );
    const backendMismatch =
      runtimeProfile?.executionMode !== 'closure'
        ? `Expected closure execution mode, received ${runtimeProfile?.executionMode ?? 'unknown'}`
        : undefined;
    const failure = backendMismatch ?? errors[0];
    const status = failure ? 'failed' : firstDifference ? 'mismatched' : 'matched';
    return {
      id: testCase.id,
      status,
      elapsedMs: now() - startedAt,
      output: {
        plots: plots.length,
        drawings: drawings.length,
        errors: errors.length + (backendMismatch ? 1 : 0),
      },
      firstDifference,
      firstError: failure,
      runtimeProfile,
      selectedBackend: runtimeProfile?.selectedBackend,
      executionMode: runtimeProfile?.executionMode,
      plots,
      drawings,
    };
  } catch (error) {
    return {
      id: testCase.id,
      status: 'failed',
      elapsedMs: now() - startedAt,
      output: {
        plots: 0,
        drawings: 0,
        errors: 1,
      },
      firstError: error instanceof Error ? error.message : String(error),
      plots: [],
      drawings: [],
    };
  }
}

function defaultNow(): number {
  const performance = globalThisWithPerformance().performance;
  return typeof performance?.now === 'function' ? performance.now() : Date.now();
}

function globalThisWithPerformance(): { performance?: { now?: () => number } } {
  return globalThis as unknown as { performance?: { now?: () => number } };
}

function isHermesRuntime(): boolean {
  return typeof (globalThis as unknown as { HermesInternal?: unknown }).HermesInternal === 'object'
    && (globalThis as unknown as { HermesInternal?: unknown }).HermesInternal !== null;
}

function normalizeRenderedOutput(output: MobileTealscriptClosureSmokeExpectedOutput): unknown {
  return stableSmokeValue({
    plots: output.plots.map((plot) => ({
      ...plot,
      scriptId: undefined,
      values: plot.values.map(normalizeSmokeNumber),
      openValues: plot.openValues?.map(normalizeSmokeNumber),
      highValues: plot.highValues?.map(normalizeSmokeNumber),
      lowValues: plot.lowValues?.map(normalizeSmokeNumber),
      closeValues: plot.closeValues?.map(normalizeSmokeNumber),
    })),
    drawings: output.drawings.map((drawing) => ({
      ...drawing,
      scriptId: undefined,
      persistent: undefined,
    })),
  });
}

function stableSmokeValue(value: unknown): unknown {
  if (typeof value === 'number') return normalizeSmokeNumber(value);
  if (Array.isArray(value)) return value.map(stableSmokeValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, stableSmokeValue(entryValue)]),
  );
}

function normalizeSmokeNumber(value: number | null): number | null | string {
  if (value === null) return null;
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  return Math.round(value * 1e8) / 1e8;
}

function findFirstSmokeDifference(expected: unknown, actual: unknown, path = '$'): string | undefined {
  if (Object.is(expected, actual)) return undefined;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return path;
    if (expected.length !== actual.length) return `${path}.length`;
    for (let index = 0; index < expected.length; index += 1) {
      const child = findFirstSmokeDifference(expected[index], actual[index], `${path}[${index}]`);
      if (child) return child;
    }
    return undefined;
  }
  if (isSmokeRecord(expected) || isSmokeRecord(actual)) {
    if (!isSmokeRecord(expected) || !isSmokeRecord(actual)) return path;
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    const keyDifference = findFirstSmokeDifference(expectedKeys, actualKeys, `${path}.keys`);
    if (keyDifference) return keyDifference;
    for (const key of expectedKeys) {
      const child = findFirstSmokeDifference(expected[key], actual[key], `${path}.${key}`);
      if (child) return child;
    }
    return undefined;
  }
  return path;
}

function isSmokeRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
