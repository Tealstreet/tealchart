import { describe, expect, it } from 'vitest';
import { InMemoryRequestDatafeed, type Bar, type RequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript, roundSeries } from './fixtures';

const start = Date.UTC(2026, 0, 1);
const minute = 60_000;
const closes = [10, 12, 9, 15, 11, 18, 14, 20, 17, 24, 19, 26];
const requested: Bar[] = closes.map((close, i) => ({
  time: start + i * 6 * minute, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));
const chart: Bar[] = Array.from({ length: 36 }, (_, i) => ({
  time: start + i * 2 * minute, open: 100 + i, high: 150 + i, low: 50 + i, close: 100 + i, volume: 1,
}));
function run(body: string) {
  return runCompatScript(`//@version=6\nindicator("Requested history")\n${body}`, {
    bars: chart,
    engineOptions: {
      runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'TEST', timeframe: '2', bars: chart },
        { symbol: 'TEST', timeframe: '6', bars: requested },
      ]),
    },
  });
}
// Independent arithmetic from the TV-settled CF040 SMA seed (v2 native EMA
// capture) and ATR (TR + RMA). Requested history uses the same seed contract
// as the chart. Chart OHLC differs; no engine output seeds these values.
function ema(values: number[], length: number): Array<number | null> {
  let previous: number | null = null;
  const alpha = 2 / (length + 1);
  return values.map((value, i) => {
    if (i < length - 1) return null;
    previous = previous === null
      ? values.slice(0, length).reduce((sum, sample) => sum + sample, 0) / length
      : previous + alpha * (value - previous);
    return previous;
  });
}
const fast = ema(closes, 3);
const slow = ema(closes, 5);
const macd = fast.map((value, i) => {
  const slowValue = slow[i];
  return value === null || slowValue === null ? null : value - slowValue;
});
const delta = macd.map((value, i) => {
  const previous = i === 0 ? null : macd[i - 1];
  return value === null || previous === null ? null : value - previous;
});
const tr = requested.map((bar, i) => i === 0 ? 2 : Math.max(2, Math.abs(bar.high - closes[i - 1]), Math.abs(bar.low - closes[i - 1])));
let atrState = (tr[0] + tr[1] + tr[2]) / 3;
const atr = tr.map((value, i) => i < 2 ? null : i === 2 ? atrState : atrState = (value + 2 * atrState) / 3);
function confirmed(values: Array<number | null>): Array<number | null> {
  return chart.map((_, i) => values[Math.floor((i + 1) / 3) - 1] ?? null);
}
function assertValues(body: string, expected: Array<number | null>) {
  const result = run(body);
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors ?? 0).toBe(0);
  expect(roundSeries(getPlot(result, 'Result').values)).toEqual(roundSeries(expected));
}

describe('Requested expressions retain their dependency history', () => {
  it('checks independent ATR arithmetic against a direct requested expression', () => {
    assertValues('plot(request.security("TEST", "6", ta.atr(3)), title="Result")', confirmed(atr));
  });

  it('replays a prior MACD request and indexes its requested-context series', () => {
    assertValues(`
[a, b, c] = request.security("TEST", "6", ta.macd(close, 3, 5, 2))
plot(request.security("TEST", "6", a - a[1]), title="Result")`, confirmed(delta));
  });

  it('keeps nested subprogram request IDs local after omitting unrelated requests', () => {
    assertValues(`
unused = request.security("TEST", "2", close)
[a, b, c] = request.security("TEST", "6", ta.macd(close, 3, 5, 2))
plot(request.security("TEST", "6", a - a[1]), title="Result")`, confirmed(delta));
  });

  for (const offset of [0, 1]) {
    it(`recomputes an ATR UDF argument before reading requested offset ${offset}`, () => {
      assertValues(`
f(float x) =>
    request.security("TEST", "6", x[${offset}])
plot(f(ta.atr(3)), title="Result")`, confirmed(offset === 0 ? atr : [null, ...atr.slice(0, -1)]));
    });
  }

  it('recomputes a direct ATR UDF source parameter', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x)
plot(f(ta.atr(3)), title="Result")`, confirmed(atr));
  });
  it('forwards computed arguments through a nested UDF call', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x[1])
g(float y) =>
    f(y * 2)
plot(g(ta.atr(3)), title="Result")`, confirmed([null, ...atr.slice(0, -1).map(value => value === null ? null : value * 2)]));
  });

  it('replays caller local TA dependencies together with forwarded parameters', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x[1])
g(float y) =>
    localAtr = ta.atr(3)
    f(localAtr + y)
plot(g(close), title="Result")`, confirmed([null, ...atr.slice(0, -1).map((value, i) => value === null ? null : value + closes[i])]));
  });

  it('replays a global computed argument instead of sampling its chart result', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x[1])
chartAtr = ta.atr(3)
plot(f(chartAtr), title="Result")`, confirmed([null, ...atr.slice(0, -1)]));
  });

  it('preserves history already applied to a computed caller argument', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x)
plot(f(x=ta.atr(3)[1]), title="Result")`, confirmed([null, ...atr.slice(0, -1)]));
  });

  it('keeps requested expression history separate from an outer chart history read', () => {
    const merged = confirmed(atr);
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x[barstate.isrealtime ? 1 : 0])[1]
plot(f(ta.atr(3)), title="Result")`, [null, ...merged.slice(0, -1)]);
  });

  for (const dynamic of [false, true]) {
    it(`honors dynamic_requests=${dynamic} for a prior request dependency`, () => {
      const calls: string[] = [];
      const delegate = new InMemoryRequestDatafeed([
        { symbol: 'TEST', timeframe: '2', bars: chart },
        { symbol: 'TEST', timeframe: '6', bars: requested },
      ]);
      const feed: RequestDatafeed = { getBars(query) { calls.push(query.timeframe); return delegate.getBars(query); } };
      const result = runCompatScript(`//@version=6
indicator("Dependency mode", dynamic_requests=${dynamic})
first = request.security("TEST", "", timeframe.in_seconds())
plot(request.security("TEST", "6", first), title="Result")`, {
        bars: chart,
        engineOptions: {
          runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
          requestDatafeed: feed,
        },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual(confirmed(closes.map(() => dynamic ? 360 : 120)));
      // Dynamic mode observes the outer request's timeframe; static mode keeps the chart value.
      expect(calls.filter(tf => tf === '2')).toHaveLength(1);
      expect(calls.filter(tf => tf === '6')).toHaveLength(1);
    });
  }

  it('keeps an overloaded request UDF reachable', () => {
    assertValues(`
f(float x) =>
    request.security("TEST", "6", x[1])
f(float x, int offset) =>
    request.security("TEST", "6", x[offset])
plot(f(ta.atr(3)), title="Result")`, confirmed([null, ...atr.slice(0, -1)]));
  });

});
