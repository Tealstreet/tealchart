import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { parse } from '../../src/parser';
import { executeScript, type Bar, type ExecutionResult } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed, type RequestDataContext } from '../../src/runtime/requestDatafeed';
import { getPlot, roundSeries } from './fixtures';

const behaviorBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 104, low: 99, close: 102, volume: 1_000 },
  { time: 1_700_000_060_000, open: 102, high: 103, low: 100, close: 101, volume: 1_100 },
  { time: 1_700_000_120_000, open: 101, high: 106, low: 100, close: 105, volume: 1_200 },
];

const requestedBars: Bar[] = [
  { time: 1_700_000_000_000, open: 200, high: 204, low: 199, close: 200, volume: 2_000 },
  { time: 1_700_000_060_000, open: 200, high: 205, low: 199, close: 201, volume: 2_100 },
  { time: 1_700_000_120_000, open: 201, high: 206, low: 200, close: 202, volume: 2_200 },
];

function requestContext(symbol: string, timeframe: string, bars: Bar[]): RequestDataContext {
  return {
    symbol,
    timeframe,
    bars,
    syminfo: {
      ticker: symbol,
      tickerid: symbol,
      currency: 'USD',
    },
  };
}

function runBoth(
  source: string,
  options: { datafeed?: InMemoryRequestDatafeed } = {},
): { interpreted: ExecutionResult; compiled: ExecutionResult } {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const interpreted = executeScript(ast, behaviorBars, undefined, { requestDatafeed: options.datafeed });
  const compiledResult = executeCompiled(compiled, behaviorBars, undefined, { requestDatafeed: options.datafeed });
  if (!compiledResult) {
    throw new Error('executeCompiled returned null');
  }

  expect(compiledResult.profile.executionMode).toBe('compiled');
  return { interpreted, compiled: compiledResult };
}

function expectClean(result: ExecutionResult): void {
  expect(result.errors).toEqual([]);
}

function alertByTitle(result: ExecutionResult, title: string) {
  const alert = result.alerts.find((candidate) => candidate.title === title);
  if (!alert) {
    throw new Error(`Expected alert "${title}" to exist. Found: ${result.alerts.map((candidate) => candidate.title).join(', ')}`);
  }
  return alert;
}

function expectError(result: ExecutionResult, message: string): void {
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).toMatchObject({
    code: 'runtime.error',
    message,
    runtimeError: {
      code: 'runtime.error',
      message,
    },
  });
}

function behaviorErrorSummary(result: ExecutionResult): Array<{ code: string | undefined; message: string }> {
  return result.errors.map((error) => ({
    code: error.code,
    message: error.message,
  }));
}

const officialAlertLogRuntimeNames = [
  ...PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.functions.filter((name) => (
    name === 'alert'
    || name === 'alertcondition'
    || name.startsWith('log.')
    || name === 'runtime.error'
  )),
  ...PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.constants.filter((name) => name.startsWith('alert.freq_')),
].sort();

const coveredAlertLogRuntimeNames = [
  'alert',
  'alert.freq_all',
  'alert.freq_once_per_bar',
  'alert.freq_once_per_bar_close',
  'alertcondition',
  'log.error',
  'log.info',
  'log.warning',
  'runtime.error',
].sort();

describe('Pine v6 alert, log, and runtime behavior', () => {
  it('has behavior coverage for every official alert/log/runtime name', () => {
    expect(coveredAlertLogRuntimeNames).toEqual(officialAlertLogRuntimeNames);
  });

  it('fires alert() according to each official frequency constant', () => {
    const source = `//@version=6
indicator("Alert frequency behavior")
fireAll() =>
    alert("all " + str.tostring(bar_index), alert.freq_all)
fireOnce() =>
    alert("once " + str.tostring(bar_index), alert.freq_once_per_bar)
fireClose() =>
    alert("close " + str.tostring(bar_index), alert.freq_once_per_bar_close)

if close > open
    fireAll()
    fireAll()
    fireOnce()
    fireOnce()
    fireClose()
    fireClose()`;

    const { interpreted, compiled } = runBoth(source);
    expectClean(interpreted);
    expectClean(compiled);
    expect(compiled.alerts).toEqual(interpreted.alerts);

    const allAlert = compiled.alerts.find((alert) => alert.frequency === 'all');
    const onceAlert = compiled.alerts.find((alert) => alert.frequency === 'once_per_bar');
    const closeAlert = compiled.alerts.find((alert) => alert.frequency === 'once_per_bar_close');

    expect(allAlert?.events.map((event) => [event.barIndex, event.message])).toEqual([
      [0, 'all 0'],
      [0, 'all 0'],
      [2, 'all 2'],
      [2, 'all 2'],
    ]);
    expect(onceAlert?.events.map((event) => [event.barIndex, event.message])).toEqual([
      [0, 'once 0'],
      [2, 'once 2'],
    ]);
    expect(closeAlert?.events.map((event) => [event.barIndex, event.message])).toEqual([
      [0, 'close 0'],
      [2, 'close 2'],
    ]);
  });

  it('records alertcondition values and renders placeholders per triggered bar', () => {
    const source = `//@version=6
indicator("Alertcondition behavior", timeframe="15")
basis = close + 1
plot(basis, title="Basis")
alertcondition(close > open, title="Green", message='{{ticker}} {{interval}} {{open}} {{close}} basis={{plot("Basis")}} missing={{plot_9}}')`;

    const { interpreted, compiled } = runBoth(source);
    expectClean(interpreted);
    expectClean(compiled);
    expect(compiled.alerts).toEqual(interpreted.alerts);

    const alert = alertByTitle(compiled, 'Green');
    expect(alert.values).toEqual([true, null, true]);
    expect(alert.renderedMessages).toEqual([
      'BTCUSDT 15 100 102 basis=103 missing={{plot_9}}',
      null,
      'BTCUSDT 15 101 105 basis=106 missing={{plot_9}}',
    ]);
  });

  it('formats log.info, log.warning, and log.error placeholders', () => {
    const source = `//@version=6
indicator("Log behavior")
if bar_index == 0
    log.info("close {0} high {1}", close, high)
    log.warning(message="named {0} {1}", close, "warn")
    log.error("literal {0} missing {9}", "err")`;

    const { interpreted, compiled } = runBoth(source);
    expectClean(interpreted);
    expectClean(compiled);
    expect(compiled.logs).toEqual(interpreted.logs);
    expect(compiled.logs.map((log) => [log.level, log.barIndex, log.message])).toEqual([
      ['info', 0, 'close 102 high 104'],
      ['warning', 0, 'named 102 warn'],
      ['error', 0, 'literal err missing NaN'],
    ]);
  });

  it('halts runtime.error inside a UDF after preserving prior output', () => {
    const source = `//@version=6
indicator("Runtime UDF halt")
stop() =>
    runtime.error("stop at " + str.tostring(bar_index))
plot(close, title="Before")
if bar_index == 1
    stop()
plot(open, title="After")`;

    const { interpreted, compiled } = runBoth(source);
    expect(behaviorErrorSummary(compiled)).toEqual(behaviorErrorSummary(interpreted));
    expectError(compiled, 'stop at 1');
    expect(roundSeries(getPlot(compiled, 'Before').values, 6)).toEqual([102, 101]);
    expect(roundSeries(getPlot(compiled, 'After').values, 6)).toEqual([100]);
  });

  it('halts runtime.error inside a request.security expression', () => {
    const source = `//@version=6
indicator("Runtime request halt")
guard() =>
    if close > 201
        runtime.error("request stop " + str.tostring(close))
    close
requested = request.security("NASDAQ:AAPL", "1", guard(), lookahead=barmerge.lookahead_on)
plot(requested, title="Requested")
plot(close, title="After")`;
    const datafeed = new InMemoryRequestDatafeed([
      requestContext('NASDAQ:AAPL', '1', requestedBars),
    ]);

    const { interpreted, compiled } = runBoth(source, { datafeed });
    expect(behaviorErrorSummary(compiled)).toEqual(behaviorErrorSummary(interpreted));
    expectError(compiled, 'request stop 202');
    expect(compiled.plots).toEqual([]);
    expect(interpreted.plots).toEqual([]);
  });
});
