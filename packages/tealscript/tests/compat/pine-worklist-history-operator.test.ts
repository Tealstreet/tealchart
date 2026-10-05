import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

// Authority: v6 [] reference and Operators history-referencing operator, rank 1649.
it('reads prior series values and returns missing before available history', () => {
  const ast = parse('//@version=6\nindicator("history operator")\nsource = close * 2\nplot(close[1])\nplot(source[2])\nplot(bar_index[1])\nplot(close[0])');
  const bars = [10, 20, 30].map((close, i) => ({ time: i * 120000, open: close, high: close, low: close, close, volume: 1 }));
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([[null, 10, 20], [null, null, 20], [null, 0, 1], [10, 20, 30]]);
});
