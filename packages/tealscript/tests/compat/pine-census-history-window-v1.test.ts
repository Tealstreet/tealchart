import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 7 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 10,
}));

// Declaration statements / calc_bars_count: the selected first bar has index 0.
describe('census declaration history window', () => {
  it.each([0, 30])('uses all available history for count %s (1779–1780)', (count) => {
    const result = runCompatScript(
      `//@version=6
indicator("Full history", calc_bars_count=${count})
var float total = 0
total += close
plot(total, "total")
plot(bar_index, "index")
plot(close[1], "previous")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'total').values).toEqual([1, 3, 6, 10, 15, 21, 28]);
    expect(getPlot(result, 'index').values).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(getPlot(result, 'previous').values).toEqual([null, 1, 2, 3, 4, 5, 6]);
  });

  it('rebases indices and excludes earlier builtin and variable history (1781–1782)', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Selected history", calc_bars_count=3)
value = close * 10
plot(bar_index, "index")
plot(close[2], "builtin")
plot(value[2], "variable")
plot(barstate.isfirst ? 1 : 0, "first")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'index').values).toEqual([null, null, null, null, 0, 1, 2]);
    expect(getPlot(result, 'builtin').values).toEqual([null, null, null, null, null, null, 5]);
    expect(getPlot(result, 'variable').values).toEqual([null, null, null, null, null, null, 50]);
    expect(getPlot(result, 'first').values).toEqual([null, null, null, null, 1, 0, 0]);
  });
});

describe('census history boundaries', () => {
  it('refuses dynamic negative offsets while zero remains current (1783)', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Dynamic history")
offset = bar_index == 1 ? -1 : 0
plot(close[offset], "value")`,
      { bars },
    );
    expect(result.errors.map((error) => error.message).join(' ')).toMatch(/historical.*negative|historical.*-1/i);
  });

  it('warns for sparse local history while unconditional history stays valid (1791)', () => {
    const checked = checkProgram(
      parse(`//@version=6
indicator("Local history")
value = close
plot(value[1])
if bar_index % 2 == 0
    sparse = close
    label.new(bar_index, sparse[1])`),
    );
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.code === 'inconsistent-local-history')).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringContaining("'sparse'") }),
    ]);
  });

  it('keeps a skipped builtin on its invocation history (1793)', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Conditional history")
float sparse = na
if bar_index % 2 == 0
    sparse := ta.sma(close, 2)
continuous = ta.sma(close, 2)
plot(sparse, "sparse")
plot(continuous, "continuous")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'sparse').values).toEqual([null, null, 2, null, 4, null, 6]);
    expect(getPlot(result, 'continuous').values).toEqual([null, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);
  });

  it('grows a dynamic historical buffer beyond 500 (1834 adaptive boundary)', () => {
    const history = Array.from({ length: 610 }, (_, index) => ({
      ...bars[0],
      time: (index + 1) * 60_000,
      close: index + 1,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Adaptive history")
value = close * 2
offset = bar_index > 600 ? 600 : 0
plot(value[offset], "history")`,
      { bars: history },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'history').values.slice(601)).toEqual([4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });
});
