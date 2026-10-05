import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { checkProgram } from '../../src/semantic/checker';
import { runCompatScript } from './fixtures';

const bars = Array.from({ length: 6 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 10,
}));

function run(depth: string, setup = '') {
  const source = `//@version=6\n${setup}indicator("History depth", max_bars_back=${depth})
offset = input.int(3)
value = close * 2
plot(close)
plot(close[1])
plot(close[offset])
plot(value[offset])`;
  expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  return runCompatScript(source, { bars });
}

// Historical depth counts past data points, alongside the current value.
// https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers
describe('rank1847 declared history depth', () => {
  it('keeps numeric current data alongside all three past slots after rollover', () => {
    const history = new HistoryBufferSizing(3);
    const { NumericSeries } = history.dependencies(3, () => false);
    const values = new NumericSeries(4, 3, 'value');
    for (const value of [1, 2, 3, 4, 5, 6, 7, 8]) values.push(value);
    expect([0, 1, 2, 3].map((offset) => values.get(offset))).toEqual([8, 7, 6, 5]);
  });

  it('keeps nonnumeric current data alongside all three past slots after rollover', () => {
    const history = new HistoryBufferSizing(3);
    const { ValueSeries } = history.dependencies(3, () => false);
    const values = new ValueSeries(4, 3, 'value');
    for (const value of ['a', 'b', 'c', 'd', 'e']) values.push(value);
    expect([0, 1, 2, 3].map((offset) => values.get(offset))).toEqual(['e', 'd', 'c', 'b']);
  });

  it('retains the current slot and the declared number of past values', () => {
    const result = run('3');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3, 4, 5, 6],
      [null, 1, 2, 3, 4, 5],
      [null, null, null, 1, 2, 3],
      [null, null, null, 2, 4, 6],
    ]);
    expect(result.indicatorMaxBarsBack).toBe(3);
  });

  it.each(['1 + 2', 'DEPTH'])('preserves the accepted const depth %s', (depth) => {
    const result = run(depth, depth === 'DEPTH' ? 'const int BASE = 1\nconst int DEPTH = BASE + 2\n' : '');
    const literal = run('3');
    expect(result.errors).toEqual([]);
    expect(result.plots).toEqual(literal.plots);
    expect(result.declaration.maxBarsBack).toBe(3);
    expect(result.indicatorMaxBarsBack).toBe(3);
  });
});
