import { Session } from 'node:inspector';

import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

function bars(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    time: (index + 1) * 60000,
    open: index,
    high: index + 1,
    low: index - 1,
    close: index,
    volume: 100,
  }));
}

function run(expression: string, requested: ReturnType<typeof bars>, chart = requested, certificate = true) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("requested settled tail")
plot(request.security("OTHER", "1", ${expression}))`),
  );
  expect(compiled.success).toBe(true);
  if (!certificate) for (const script of compiled.securityScripts.values()) script.fixedEmaProgram = undefined;
  return executeCompiled(compiled, chart, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '1', bars: requested }]),
  })!;
}

it('publishes a certified constant tail without individually appending every settled value', () => {
  const requested = bars(20000);
  const compiled = tryCompile(
    parse(`//@version=6
indicator("settled publication")
plot(request.security("OTHER", "2", ta.ema(7.0, 3)))`),
  );
  expect(compiled.success).toBe(true);
  const originalPush = Array.prototype.push;
  let publications = 0;
  let result: ReturnType<typeof executeCompiled>;
  try {
    Array.prototype.push = function (...values: unknown[]) {
      if (values.length === 1 && Object.is(values[0], 7)) publications++;
      return originalPush.apply(this, values);
    };
    result = executeCompiled(compiled, requested.slice(-1), undefined, {
      runtime: { timeframe: { period: '1' } },
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '2', bars: requested }]),
    });
  } finally {
    Array.prototype.push = originalPush;
  }
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0]!.values).toEqual([7]);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(publications).toBeLessThan(100);
});

it('retains finite, signed-zero and missing outputs when the certificate is disabled', () => {
  const requested = bars(40);
  for (const expression of ['ta.ema(7.0, 3)', 'ta.ema(-0.0, 3)', 'ta.ema(float(na), 3)']) {
    const actual = run(expression, requested);
    const reference = run(expression, requested, requested, false);
    expect(actual.errors).toEqual([]);
    expect(actual.plots.map((plot) => plot.values)).toEqual(reference.plots.map((plot) => plot.values));
  }
});

it('keeps live source requests and not-yet-settled EMA states active', () => {
  const requested = bars(40);
  for (const expression of ['ta.ema(close, 3)', 'ta.ema(7.0, 100)', 'ta.ema(close[1], 3)']) {
    const actual = run(expression, requested);
    const reference = run(expression, requested, requested, false);
    expect(actual.errors).toEqual([]);
    expect(actual.plots.map((plot) => plot.values)).toEqual(reference.plots.map((plot) => plot.values));
  }
});

it('extends only the selected incremental prefix and preserves earlier selections', () => {
  const requested = bars(1000);
  const chart = [0, 3, 20, 5, 100, 999].map((index) => requested[index]!);
  const originalFill = Array.prototype.fill;
  const filledLengths: number[] = [];
  let actual: ReturnType<typeof run>;
  try {
    Array.prototype.fill = function (value: unknown, start?: number, end?: number) {
      if (Object.is(value, 7)) filledLengths.push(this.length);
      return originalFill.call(this, value, start, end);
    };
    actual = run('ta.ema(7.0, 3)', requested, chart);
  } finally {
    Array.prototype.fill = originalFill;
  }
  const reference = run('ta.ema(7.0, 3)', requested, chart, false);
  expect(actual.errors).toEqual([]);
  expect(actual.plots.map((plot) => plot.values)).toEqual(reference.plots.map((plot) => plot.values));
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(filledLengths).toEqual([4, 21, 101, 1000]);
});

it('keeps settled values independent for separate request identities', () => {
  const requested = bars(40);
  const compiled = tryCompile(
    parse(`//@version=6
indicator("separate settled requests")
plot(request.security("OTHER", "1", ta.ema(7.0, 3)))
plot(request.security("OTHER", "1", ta.ema(9.0, 3)))`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, requested, undefined, {
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '1', bars: requested }]),
  })!;
  expect(result.errors).toEqual([]);
  expect(result.plots[0]!.values.slice(3)).toEqual(requested.slice(3).map(() => 7));
  expect(result.plots[1]!.values.slice(3)).toEqual(requested.slice(3).map(() => 9));
});

it('recreates an active requested cursor after adaptive history growth', () => {
  const requested = bars(620);
  const actual = run('ta.ema(close[bar_index > 600 ? 600 : 1], 3)', requested);
  const reference = run('ta.ema(close[bar_index > 600 ? 600 : 1], 3)', requested, requested, false);
  expect(actual.errors).toEqual([]);
  expect(actual.plots.map((plot) => plot.values)).toEqual(reference.plots.map((plot) => plot.values));
});

it('does not observe a settled certificate for live-source requested cursors', async () => {
  if (process.env.TEALSCRIPT_PERF_ASSERT !== '1') return;
  const session = new Session();
  session.connect();
  const post = <T>(method: string, params = {}) =>
    new Promise<T>((resolve, reject) => {
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result as T)));
    });
  try {
    await post('Profiler.enable');
    await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    const result = run('ta.ema(close, 3)', bars(300));
    expect(result.errors).toEqual([]);
    const coverage = await post<{
      result: Array<{ url: string; functions: Array<{ functionName: string; ranges: Array<{ count: number }> }> }>;
    }>('Profiler.takePreciseCoverage');
    const observations = coverage.result
      .filter((script) => script.url.endsWith('/codegen/execute.ts'))
      .flatMap((script) => script.functions)
      .filter((fn) => fn.functionName === 'get settled' || fn.functionName === 'isSettled')
      .reduce((count, fn) => count + fn.ranges[0]!.count, 0);
    expect(observations).toBe(0);
  } finally {
    await post('Profiler.stopPreciseCoverage');
    session.disconnect();
  }
});
