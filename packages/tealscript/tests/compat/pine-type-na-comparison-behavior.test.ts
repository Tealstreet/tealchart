import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { getPlot } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// variable/na remarks link the operators manual: comparisons with unavailable
// operands return false. Typed variables avoid forbidden direct comparisons to na.
const values = [-3, 0, 5];
const bars: Bar[] = values.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close + 1, low: close - 1, close, volume: 10,
}));

// Both operand positions and both missing reject asymmetric handling; equal and
// unequal defined controls reject always-false. RED: missing guards returned true;
// all six failed, restored all six passed.
for (const operator of ['==', '!=', '<', '>', '<=', '>=']) {
  it(`typed unavailable operands compare false with ${operator} [variable/na, operator/${operator}]`, () => {
    const source = `//@version=6
indicator("Unavailable comparisons")
float missing = na
plot((missing ${operator} close) == false ? 1 : 0, title="Left")
plot((close ${operator} missing) == false ? 1 : 0, title="Right")
plot((missing ${operator} missing) == false ? 1 : 0, title="Both")
plot(close ${operator} 0 ? 1 : 0, title="Defined")`;
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    for (const title of ['Left', 'Right', 'Both']) {
      expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    }
    const controls: Record<string, number[]> = {
      '==': [0, 1, 0], '!=': [1, 0, 1], '<': [1, 0, 0],
      '>': [0, 0, 1], '<=': [1, 1, 0], '>=': [0, 1, 1],
    };
    expect(getPlot(result, 'Defined').values).toEqual(controls[operator]);
  });
}
