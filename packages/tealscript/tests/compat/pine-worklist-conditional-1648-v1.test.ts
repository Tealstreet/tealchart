import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { compatibilityBars, getPlot } from './fixtures';

const bars = compatibilityBars.slice(0, 4);

function run(body: string) {
  const execution = executeCompiledScript(parse(`//@version=6\nindicator("Conditional clause")\n${body}`), bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  return execution.result;
}

// Reference entry23: conditional selection, combined ternaries, na else and series.
// https://www.tradingview.com/pine-script-docs/language/operators/#-ternary-operator
describe('worklist1648 conditional expression', () => {
  it('selects its true and false values independently on each bar', () => {
    const result = run('plot(bar_index % 2 == 0 ? 7 : -11, "Selected")');
    expect(getPlot(result, 'Selected').values).toEqual([7, -11, 7, -11]);
  });

  it('combines conditional expressions with distinct nested alternatives', () => {
    const result = run('plot(bar_index == 0 ? 13 : bar_index == 1 ? 17 : bar_index == 2 ? 19 : 23, "Selected")');
    expect(getPlot(result, 'Selected').values).toEqual([13, 17, 19, 23]);
  });

  it('retains an unavailable value in its unneeded else branch', () => {
    const result = run('plot(bar_index == 0 ? 7 : na, "Selected")');
    expect(getPlot(result, 'Selected').values).toEqual([7, null, null, null]);
  });

  it('returns the selected reference without replacing its identity', () => {
    const result = run(`left = array.from(3)
right = array.from(9)
selected = bar_index < 2 ? left : right
array.set(selected, 0, 29)
plot(array.get(left, 0), "Left")
plot(array.get(right, 0), "Right")`);
    expect(getPlot(result, 'Left').values).toEqual([29, 29, 3, 3]);
    expect(getPlot(result, 'Right').values).toEqual([9, 9, 29, 29]);
  });
});
