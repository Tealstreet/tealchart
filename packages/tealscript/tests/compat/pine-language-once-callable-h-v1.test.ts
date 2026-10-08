import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

function run(body: string) {
  const result = runCompatScript(`//@version=6\nindicator("Callable once")\n${body}`, {
    bars: compatibilityBars.slice(0, 6),
  });
  expect(result.errors).toEqual([]);
  return result;
}

// Row 166: an omitted once condition is true, including in a function scope.
// https://www.tradingview.com/pine-script-docs/language/conditional-structures/
describe('Pine v6 once conditions in a called function', () => {
  it('makes omitted and explicit true conditions fire on the first function execution', () => {
    const result = run(`apply(array<int> counts) =>
    once
        counts.set(0, counts.get(0) + 2)
    once true
        counts.set(1, counts.get(1) + 3)
var counts = array.new_int(2, 0)
if bar_index >= 2
    apply(counts)
plot(counts.get(0), title="Omitted")
plot(counts.get(1), title="Explicit")`);
    expect(getPlot(result, 'Omitted').values).toEqual([0, 0, 2, 2, 2, 2]);
    expect(getPlot(result, 'Explicit').values).toEqual([0, 0, 3, 3, 3, 3]);
  });

  it('keeps an explicitly false condition inactive inside a function', () => {
    const result = run(`apply(array<int> counts) =>
    once false
        counts.set(0, counts.get(0) + 5)
var counts = array.new_int(1, 0)
apply(counts)
plot(counts.get(0), title="Inactive")`);
    expect(getPlot(result, 'Inactive').values).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('waits for the first true function argument before deactivating', () => {
    const result = run(`apply(array<int> counts, bool ready) =>
    once ready
        counts.set(0, counts.get(0) + 7)
var counts = array.new_int(1, 0)
apply(counts, bar_index == 3 or bar_index == 5)
plot(counts.get(0), title="Conditional")
plot(bar_index, title="Source")`);
    expect(getPlot(result, 'Conditional').values).toEqual([0, 0, 0, 7, 7, 7]);
    expect(getPlot(result, 'Source').values).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
