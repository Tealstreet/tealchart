import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { getPlot } from './fixtures';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, type/bool.
// V5 contrast: https://www.tradingview.com/pine-script-docs/v5/language/operators/#-history-referencing-operator.
// V5 unavailable operands propagate na; the v6 type/bool manual excludes bool na.
const bars: Bar[] = [-3, 0, 5].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close + 1, low: close - 1, close, volume: 10,
}));

// RED: the v5 relational helper returned false for unavailable operands; all failed.
// Restoring its NaN result made all three cases pass, with defined-operand controls.
for (const [operator, expected] of [
  ['>=', [0, 1, 1]],
  ['<', [1, 0, 0]],
  ['<=', [1, 1, 0]],
] as const) {
  it(`v5 relational ${operator} retains bool na and defined controls [type/bool, operator/${operator}, v5 manual]`, () => {
    const source = `//@version=5
indicator("Comparison version")
float missing = close[10]
plot(na(missing ${operator} close) ? 1 : 0, title="LeftNA")
plot(na(close ${operator} missing) ? 1 : 0, title="RightNA")
plot(na(missing ${operator} missing) ? 1 : 0, title="BothNA")
plot(close ${operator} 0 ? 1 : 0, title="Defined")
plot(na(close ${operator} 0) ? 1 : 0, title="DefinedNA")`;
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    for (const title of ['LeftNA', 'RightNA', 'BothNA']) {
      expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    }
    expect(getPlot(result, 'Defined').values).toEqual(expected);
    expect(getPlot(result, 'DefinedNA').values).toEqual([0, 0, 0]);
  });
}
