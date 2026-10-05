import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Expectations are independently derived from the assigned language-grammar
// reference rows: declaration/history, function/switch returns, ternary selection,
// wrapping, v6 division, left association and the documented omitted once condition.
// https://www.tradingview.com/pine-script-docs/language/operators/
const run = (body: string) => {
  const result = runCompatScript(`//@version=6\nindicator("Grammar values")\n${body}`, {
    bars: compatibilityBars.slice(0, 4),
  });
  expect(result.errors).toEqual([]);
  return result;
};

describe('ledger gaps42 expression values', () => {
  it('keeps wrapped parentheses, brackets and enclosing local blocks (1655/1659/1660/1661)', () => {
    const result = run(`value = (1 +
2 +
    3 +
        4)
[first, second] = [
1,
    2
]
wrapped() =>
    local = 1 +
      2
    local
tabbed() =>
\tlocal = 7
\tlocal
plot(value, title="Parentheses")
plot(first + second, title="Brackets")
plot(wrapped(), title="Local")
plot(tabbed(), title="Tab")`);
    expect(getPlot(result, 'Parentheses').values).toEqual([10, 10, 10, 10]);
    expect(getPlot(result, 'Brackets').values).toEqual([3, 3, 3, 3]);
    expect(getPlot(result, 'Local').values).toEqual([3, 3, 3, 3]);
    expect(getPlot(result, 'Tab').values).toEqual([7, 7, 7, 7]);
  });

  it('initializes a changing declaration and retains its past values (1643/1649)', () => {
    const result = run(`value = bar_index + 3
plot(value, title="Current")
plot(value[1], title="Previous")
plot(value[2], title="Older")`);
    expect(getPlot(result, 'Current').values).toEqual([3, 4, 5, 6]);
    expect(getPlot(result, 'Previous').values).toEqual([null, 3, 4, 5]);
    expect(getPlot(result, 'Older').values).toEqual([null, null, 3, 4]);
  });

  it('returns function bodies and the selected switch arm (1645)', () => {
    const result = run(`shift(int value) => value + 2
value = switch bar_index
    0 => shift(1)
    1 => shift(2)
    => shift(bar_index)
plot(value, title="Selected")`);
    expect(getPlot(result, 'Selected').values).toEqual([3, 4, 4, 5]);
  });

  it('retains the selected ternary value in the enclosing declaration (1648/1673/1674)', () => {
    const result = run(`value = bar_index < 2 ? 10 : bar_index == 2 ? 20 : 30
plot(value, title="Selected")
plot(value + 1, title="Following")`);
    expect(getPlot(result, 'Selected').values).toEqual([10, 10, 20, 30]);
    expect(getPlot(result, 'Following').values).toEqual([11, 11, 21, 31]);
  });

  it('evaluates same-rank operators left to right and permits v6 fractional integer division (1672/1675)', () => {
    const result = run(`plot(10 - 3 - 2, title="Subtract")
plot(20 / 2 / 5, title="Divide")
plot(10 - 3 * 2, title="Precedence")
plot(3 / 2, title="Fraction")`);
    expect(getPlot(result, 'Subtract').values).toEqual([5, 5, 5, 5]);
    expect(getPlot(result, 'Divide').values).toEqual([2, 2, 2, 2]);
    expect(getPlot(result, 'Precedence').values).toEqual([4, 4, 4, 4]);
    expect(getPlot(result, 'Fraction').values).toEqual([1.5, 1.5, 1.5, 1.5]);
  });

  it('defaults an omitted once condition to true while false remains inactive (1676)', () => {
    const result = run(`var int count = 0
once
    count += 1
var int inactive = 0
once false
    inactive += 1
plot(count, title="Once")
plot(inactive, title="False")`);
    expect(getPlot(result, 'Once').values).toEqual([1, 1, 1, 1]);
    expect(getPlot(result, 'False').values).toEqual([0, 0, 0, 0]);
  });
});
