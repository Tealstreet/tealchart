import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar, type RequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Contracts independently derived from pine-v6-reference-v1.json (2026-10-03).
// Original 12 expected-reds failed unpatched and went green with documented
// patches in an isolated copy (discarded); added regressions were proved red.
const start = Date.UTC(2026, 8, 28);
function bars(closes: number[], step = 1): Bar[] {
  return closes.map((close, i) => ({ time: start + i * step * 60_000,
    open: close - 2, high: close + 4, low: close - 3, close, volume: 100,
  }));
}
const chart = bars([91, 83, 107, 88, 102]);
const remote = bars([41, -9, 16, 7, -12]);
function run(source: string, period = '1', datafeed: RequestDatafeed = new InMemoryRequestDatafeed([
  { symbol: 'REMOTE:ALT', timeframe: '1', bars: remote },
  { symbol: 'REMOTE:ALT', timeframe: '2', bars: bars([41, -9, 16], 2) },
  { symbol: 'LOCAL:HOME', timeframe: '1', bars: chart },
])) {
  return runCompatScript(`//@version=6\nindicator("Documented request defects")\n${source}`, {
    bars: period === '2' ? bars([91, 107, 102], 2) : chart,
    engineOptions: { requestDatafeed: datafeed, runtime: {
      syminfo: { ticker: 'HOME', tickerid: 'LOCAL:HOME', timezone: 'Etc/UTC' },
      timeframe: { period },
    } },
  });
}

describe('documented request context regressions', () => {
  // request.security_lower_tf description explicitly says lower than OR EQUAL.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
  // Rejects silently empty results, chart-source substitution, or HTF acceptance.
  it('LOWER-TF-EQUAL-REFUSAL: returns one intrabar on an equal timeframe', () => {
    const result = run(`values = request.security_lower_tf("REMOTE:ALT", "1", close)
plot(array.size(values), "Count")
plot(array.size(values) > 0 ? array.get(values, 0) : na, "Value")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Value').values).toEqual([41, -9, 16, 7, -12]);
  });

  it.each(['2', ''])('LOWER-TF-EQUAL-REFUSAL: accepts nested equal timeframe "%s"', (timeframe) => {
    const datafeed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: '2', bars: bars([41, -9, 16], 2) },
      { symbol: 'ALT', timeframe: '2', bars: bars([-17, 55, 8], 2) },
    ]);
    const result = run(`value = request.security("TEST", "2", array.sum(request.security_lower_tf("ALT", "${timeframe}", close)))
plot(value, "Value")`, '2', datafeed);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([-17, 55, 8]);
  });

  // Both ignore parameters explicitly require na, which differs from an empty
  // but valid array. Checking continuation also rejects a runtime refusal.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
  it.each([
    ['symbol', '"ABSENT", "1", close, ignore_invalid_symbol=true'],
    ['timeframe', '"REMOTE:ALT", "3", close, ignore_invalid_timeframe=true'],
  ])('LOWER-TF-IGNORED-INVALID-ARRAY: ignored invalid %s returns na', (_kind, args) => {
    const datafeed: RequestDatafeed = {
      getBars: () => ({ ok: false, code: 'invalid_symbol', message: 'Unknown fixture symbol' }),
    };
    const result = run(`values = request.security_lower_tf(${args})
plot(na(values) ? 1 : 0, "Missing")
plot(close, "Continued")`, '2', datafeed);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Continued').values).toEqual([91, 107, 102]);
  });

  it.each([
    ['symbol', '"ALT", "1", close, ignore_invalid_symbol=true', 'invalid_symbol'],
    ['timeframe', '"ALT", "3", close, ignore_invalid_timeframe=true', 'invalid_timeframe'],
    ['provider timeframe', '"ALT", "1", close, ignore_invalid_timeframe=true', 'invalid_timeframe'],
  ] as const)('LOWER-TF-IGNORED-INVALID-ARRAY: nested ignored %s returns na', (_kind, args, code) => {
    const parent = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '2', bars: bars([41, -9, 16], 2) }]);
    const datafeed: RequestDatafeed = {
      getBars: (query) => query.symbol === 'TEST' ? parent.getBars(query)
        : { ok: false, code, message: 'Invalid nested fixture context' },
    };
    const result = run(`missing = request.security("TEST", "2", na(request.security_lower_tf(${args})))
plot(missing ? 1 : 0, "Missing")
plot(close, "Continued")`, '2', datafeed);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Continued').values).toEqual([91, 107, 102]);
  });

  // Exact comparison rejects requested-period aliasing and string-length pins.
  // https://www.tradingview.com/pine-script-reference/v6/#var_timeframe.main_period
  it('REQUEST-MAIN-PERIOD-ALIASES-REQUESTED: keeps main_period inside a request', () => {
    const result = run(`identity = request.security("REMOTE:ALT", "2", timeframe.period == "2" and timeframe.main_period == "1", lookahead=barmerge.lookahead_on)
plot(identity ? 1 : 0, "Identity")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Identity').values).toEqual([1, 1, 1, 1, 1]);
  });

  it('REQUEST-MAIN-PERIOD-ALIASES-REQUESTED: preserves main_period through nesting', () => {
    const datafeed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: '2', bars: bars([41, -9, 16], 2) },
      { symbol: 'ALT', timeframe: '3', bars: bars([-17, 55], 3) },
    ]);
    const result = run(`identity = request.security("TEST", "2", request.security("ALT", "3", timeframe.period == "3" and timeframe.main_period == "1", lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on)
plot(identity ? 1 : 0, "Identity")`, '1', datafeed);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Identity').values).toEqual([1, 1, 1, 1, 1]);
  });

  it('REQUEST-MAIN-PERIOD-ALIASES-REQUESTED: keeps main_period inside lower_tf', () => {
    const result = run(`values = request.security_lower_tf("REMOTE:ALT", "1", timeframe.period == "1" and timeframe.main_period == "2")
plot(array.get(values, 0) ? 1 : 0, "Identity")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Identity').values).toEqual([1, 1, 1]);
  });

  it('REQUEST-MAIN-PERIOD-ALIASES-REQUESTED: uses the indicator declaration timeframe', () => {
    const result = runCompatScript(`//@version=6
indicator("Declared main period", timeframe="2")
identity = request.security("REMOTE:ALT", "1", timeframe.period == "1" and timeframe.main_period == "2")
plot(identity ? 1 : 0, "Identity")`, {
      bars: bars([91, 107, 102], 2),
      engineOptions: { requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'REMOTE:ALT', timeframe: '1', bars: remote },
      ]), runtime: { timeframe: { period: '1' } } },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Identity').values).toEqual([1, 1, 1]);
  });

  // The symbol parameter explicitly allows the empty string for chart symbol.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
  it('REQUEST-EMPTY-SYMBOL-NOT-INHERITED: resolves empty security symbol to chart', () => {
    const result = run('plot(request.security("", "", close), "Value")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([91, 83, 107, 88, 102]);
  });

  it('REQUEST-EMPTY-SYMBOL-NOT-INHERITED: inherits the parent symbol in nested requests', () => {
    const result = run(`value = request.security("REMOTE:ALT", "2", request.security("", "", close), lookahead=barmerge.lookahead_on)
plot(value, "Value")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([41, 41, -9, -9, 16]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
  it('LOWER-TF-EMPTY-SYMBOL-NOT-INHERITED: resolves empty lower_tf symbol to chart', () => {
    const result = run(`values = request.security_lower_tf("", "1", close)
plot(array.size(values), "Count")
plot(array.size(values) > 0 ? array.get(values, 0) : na, "Value")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([2, 2, 1]);
    expect(getPlot(result, 'Value').values).toEqual([91, 107, 102]);
  });

  it('LOWER-TF-EMPTY-SYMBOL-NOT-INHERITED: inherits the parent symbol in nested requests', () => {
    const result = run(`value = request.security("REMOTE:ALT", "2", array.get(request.security_lower_tf("", "1", close), 0), lookahead=barmerge.lookahead_on)
plot(value, "Value")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([41, 41, 16, 16, -12]);
  });

  // Same expression/context reuses the first count; both orders reject max-count
  // reuse, independent trimming, and last-call wins.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
  it.each([
    [5, 3, [41, -9, 16, 7, -12]],
    [3, 5, [null, null, 16, 7, -12]],
  ] as const)('SECURITY-CALC-COUNT-NOT-FIRST-CALL: first %i then %i', (first, second, expected) => {
    const result = run(`first = request.security("REMOTE:ALT", "1", close, calc_bars_count=${first})
second = request.security("REMOTE:ALT", "1", close, calc_bars_count=${second})
plot(first, "First")
plot(second, "Second")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual(expected);
    expect(getPlot(result, 'Second').values).toEqual(expected);
  });

  it.each([
    [undefined, 3, [41, -9, 16, 7, -12]],
    [3, undefined, [null, null, 16, 7, -12]],
  ] as const)('SECURITY-CALC-COUNT-NOT-FIRST-CALL: first %s then %s with default count', (first, second, expected) => {
    const countArg = (count: number | undefined) => count === undefined ? '' : `, calc_bars_count=${count}`;
    const result = run(`first = request.security("REMOTE:ALT", "1", close${countArg(first)})
second = request.security("REMOTE:ALT", "1", close${countArg(second)})
plot(first, "First")
plot(second, "Second")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual(expected);
    expect(getPlot(result, 'Second').values).toEqual(expected);
  });

  it('SECURITY-CALC-COUNT-NOT-FIRST-CALL: reuses computed expressions independently', () => {
    const result = run(`first = request.security("REMOTE:ALT", "1", close * 2 - open, calc_bars_count=5)
second = request.security("REMOTE:ALT", "1", close * 2 - open, calc_bars_count=3)
other = request.security("REMOTE:ALT", "1", close + 3, calc_bars_count=3)
plot(first, "First")
plot(second, "Second")
plot(other, "Other")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([43, -7, 18, 9, -10]);
    expect(getPlot(result, 'Second').values).toEqual([43, -7, 18, 9, -10]);
    expect(getPlot(result, 'Other').values).toEqual([null, null, 19, 10, -9]);
  });

  it('SECURITY-CALC-COUNT-NOT-FIRST-CALL: reuses the first count in nested requests', () => {
    const result = run(`[first, second] = request.security("LOCAL:HOME", "1", [request.security("REMOTE:ALT", "1", close, calc_bars_count=5), request.security("REMOTE:ALT", "1", close, calc_bars_count=3)])
plot(first, "First")
plot(second, "Second")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([41, -9, 16, 7, -12]);
    expect(getPlot(result, 'Second').values).toEqual([41, -9, 16, 7, -12]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
  it.each([
    [5, 3, [41, 16, -12]],
    [3, 5, [null, 16, -12]],
  ] as const)('LOWER-TF-CALC-COUNT-NOT-FIRST-CALL: first %i then %i', (first, second, expected) => {
    const result = run(`first = request.security_lower_tf("REMOTE:ALT", "1", close, calc_bars_count=${first})
second = request.security_lower_tf("REMOTE:ALT", "1", close, calc_bars_count=${second})
plot(array.size(first) > 0 ? array.get(first, 0) : na, "First")
plot(array.size(second) > 0 ? array.get(second, 0) : na, "Second")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual(expected);
    expect(getPlot(result, 'Second').values).toEqual(expected);
  });

  it.each([
    [undefined, 3, [41, 16, -12]],
    [3, undefined, [null, 16, -12]],
  ] as const)('LOWER-TF-CALC-COUNT-NOT-FIRST-CALL: first %s then %s with default count', (first, second, expected) => {
    const countArg = (count: number | undefined) => count === undefined ? '' : `, calc_bars_count=${count}`;
    const result = run(`first = request.security_lower_tf("REMOTE:ALT", "1", close${countArg(first)})
second = request.security_lower_tf("REMOTE:ALT", "1", close${countArg(second)})
plot(array.size(first) > 0 ? array.get(first, 0) : na, "First")
plot(array.size(second) > 0 ? array.get(second, 0) : na, "Second")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual(expected);
    expect(getPlot(result, 'Second').values).toEqual(expected);
  });

  it('LOWER-TF-CALC-COUNT-NOT-FIRST-CALL: reuses computed expressions independently', () => {
    const result = run(`first = request.security_lower_tf("REMOTE:ALT", "1", close * 2 - open, calc_bars_count=5)
second = request.security_lower_tf("REMOTE:ALT", "1", close * 2 - open, calc_bars_count=3)
other = request.security_lower_tf("REMOTE:ALT", "1", close + 3, calc_bars_count=3)
plot(array.size(first) > 0 ? array.get(first, 0) : na, "First")
plot(array.size(second) > 0 ? array.get(second, 0) : na, "Second")
plot(array.size(other) > 0 ? array.get(other, 0) : na, "Other")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([43, 18, -10]);
    expect(getPlot(result, 'Second').values).toEqual([43, 18, -10]);
    expect(getPlot(result, 'Other').values).toEqual([null, 19, -9]);
  });

  it('LOWER-TF-CALC-COUNT-NOT-FIRST-CALL: reuses the first count in nested requests', () => {
    const result = run(`[first, second] = request.security("REMOTE:ALT", "2", [request.security_lower_tf("REMOTE:ALT", "1", close, calc_bars_count=5), request.security_lower_tf("REMOTE:ALT", "1", close, calc_bars_count=3)])
plot(array.size(first) > 0 ? array.get(first, 0) : na, "First")
plot(array.size(second) > 0 ? array.get(second, 0) : na, "Second")`, '2');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([41, 16, -12]);
    expect(getPlot(result, 'Second').values).toEqual([41, 16, -12]);
  });

  // Nonintraday must be false even when a daily bar opens in the supplied segment.
  // Intraday controls reject implementations that always return false.
  for (const name of ['ispremarket', 'ispostmarket'] as const) {
    it(`SESSION-NONINTRADAY-${name}: excludes daily session segments`, () => {
    // https://www.tradingview.com/pine-script-reference/v6/#var_session.ispremarket
    // https://www.tradingview.com/pine-script-reference/v6/#var_session.ispostmarket
    const check = (period: string) => runCompatScript(`//@version=6
indicator("Nonintraday session")
plot(session.${name} ? 1 : 0, "Session")`, {
      bars: bars([30, 10], period === '1D' ? 1440 : 1),
      engineOptions: { runtime: {
        timeframe: { period, isintraday: period === '1', isminutes: period === '1', isdaily: period === '1D' },
        syminfo: { timezone: 'Etc/UTC' },
        session: { timezone: 'Etc/UTC', [name === 'ispremarket' ? 'premarket' : 'postmarket']: '0000-0001:1234567' },
      } },
    });
    const intraday = check('1');
    expect(intraday.errors).toEqual([]);
    expect(getPlot(intraday, 'Session').values).toEqual([1, 0]);
    const daily = check('1D');
    expect(daily.errors).toEqual([]);
    expect(getPlot(daily, 'Session').values).toEqual([0, 0]);
    });
  }
});
