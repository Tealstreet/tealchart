import { expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

it('reads chart history when the momentum offset changes and revisits an old length', () => {
  const bars = [2, 4, 8, 16, 32, 64, 128].map((close, i) => ({ time: (i + 1) * 60000, open: close, high: close, low: close, close, volume: 1 }));
  const result = executeScript(parse(`//@version=6
indicator("changing momentum")
n = bar_index < 3 ? 1 : bar_index < 5 ? 3 : 1
plot(ta.mom(close, n), "direct")
plot(ta.mom(close * 2, n), "expression")
f(src, len) => ta.mom(src, len)
plot(f(close, n), "function")`), bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.map(plot => plot.values)).toEqual([
    [null, 2, 4, 14, 28, 32, 64],
    [null, 4, 8, 28, 56, 64, 128],
    [null, 2, 4, 14, 28, 32, 64],
  ]);
});
