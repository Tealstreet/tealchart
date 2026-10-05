import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Host-supplied external plot samples must remain a series, including gaps/history.
it('evaluates an external input.source series and history independently of its title', () => {
  const result = executeScript(parse(`//@version=6
indicator("Consumer")
src = input.source(close, "Source")
plot(src, "Current")
plot(src[1], "Previous")
plot(ta.sma(src, 2), "Average")`), [2, 3, 4, 5].map((close, i) => ({ time: i * 1000, open: close, high: close, low: close, close, volume: 1 })), new Map([['input_Source', { type: 'plot-source', values: [10, null, 30, 40] }]]));
  expect(result.plots.map(p => p.values)).toEqual([[10, null, 30, 40], [null, 10, null, 30], [null, null, 20, 35]]);
});
