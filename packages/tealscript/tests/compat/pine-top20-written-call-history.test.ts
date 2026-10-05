import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 5 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: index,
  high: index + 1,
  low: index - 1,
  close: index,
  volume: 100,
}));

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call
// Every written call has independent parameter, local and expression history.
describe('TOP20 job16 written-call histories', () => {
  it.each([
    ['parameter', 'previous(x) => x[1]', 0],
    ['local', 'previous(x) =>\n    local = x + 7\n    local[1]', 7],
    ['expression', 'previous(x) => (x + 7)[1]', 7],
  ] as const)('isolates %s histories at two written call sites', (_name, definition, offset) => {
    const result = runCompatScript(
      `//@version=6
indicator("Written histories")
${definition}
plot(previous(bar_index), "first")
plot(previous(100 + bar_index), "second")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'first').values).toEqual([null, offset, offset + 1, offset + 2, offset + 3]);
    expect(getPlot(result, 'second').values).toEqual([null, 100 + offset, 101 + offset, 102 + offset, 103 + offset]);
  });

  it('isolates two nested written calls inside each independent wrapper scope', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Nested histories")
previous(x) => x[1]
pair(x) =>
    [previous(x), previous(x + 10)]
[a, b] = pair(bar_index)
[c, d] = pair(100 + bar_index)
plot(a, "a")
plot(b, "b")
plot(c, "c")
plot(d, "d")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, 0, 1, 2, 3],
      [null, 10, 11, 12, 13],
      [null, 100, 101, 102, 103],
      [null, 110, 111, 112, 113],
    ]);
  });

  it('reuses one written scope across loop iterations without sharing the global call', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Written loop scope")
accumulate() =>
    var int total = 0
    total += 1
    total
global = accumulate()
int looped = na
for i = 1 to 3
    looped := accumulate()
plot(global, "global")
plot(looped, "looped")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'global').values).toEqual([1, 2, 3, 4, 5]);
    expect(getPlot(result, 'looped').values).toEqual([3, 6, 9, 12, 15]);
  });
});
