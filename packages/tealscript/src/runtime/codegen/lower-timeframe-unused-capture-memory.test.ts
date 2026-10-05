import type { Bar } from '../context';
import type { RequestDatafeed } from '../requestDatafeed';

import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars: Bar[] = Array.from({ length: 80 }, (_, index) => ({
  time: (index + 1) * 60_000, open: index + 10, high: index + 12,
  low: index + 8, close: index * index + 10, volume: index + 100,
}));

function run(useCapture: boolean, expression = 'external', condition = 'useCapture') {
  let loads = 0;
  const feed: RequestDatafeed = { getBars(query) {
    loads += 1;
    return { ok: true, context: { ...query, bars } };
  } };
  const source = `//@version=5
indicator("inactive request capture")
external = request.security("OTHER", "1", close-close[1])
useCapture = input.bool(${useCapture})
requested() =>
    out = volume
    if ${condition}
        out := ${expression}
    out
values = request.security_lower_tf("TEST", "1", requested())
plot(array.size(values) > 0 ? array.get(values, 0) : na)`;
  const result = executeScript(parse(source), bars, undefined, {
    requestDatafeed: feed, runtime: { timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true } },
  });
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return { result, loads };
}

it('does not retain a full requested dataset for each unused capture value', () => {
  const { result, loads } = run(false);
  expect(result.plots[0].values).toEqual(bars.map(bar => bar.volume));
  expect(loads).toBe(2);
});

it('keeps changing capture values when the requested expression reads them', () => {
  const { result } = run(true);
  expect(result.plots[0].values).toEqual(bars.map((bar, index) => index ? bar.close - bars[index - 1].close : null));
});

it('checks capture usage across the entire requested dataset, including later branches', () => {
  const { result } = run(false, 'external', 'bar_index > 40');
  expect(result.plots[0].values).toEqual(bars.map((bar, index) => index > 40 ? bar.close - bars[index - 1].close : bar.volume));
});

it('preserves captured history when a requested expression reads prior samples', () => {
  const { result } = run(true, 'external[1]');
  expect(result.plots[0].values).toEqual(bars.map((bar, index) => index ? bar.close - bars[index - 1].close : null));
});
