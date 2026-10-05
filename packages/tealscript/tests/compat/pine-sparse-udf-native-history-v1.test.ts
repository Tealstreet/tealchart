import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 10 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 1,
}));

// v11 sparse-udf-history-pair-v1 attempt1: native PRIOR2/3 are 0 at bar3 and 3 at bar6.
const capturedSource = `//@version=6
indicator("V11 sparse-udf-history-pair-v1", max_bars_back=256)
sample(float x) =>
    [x, x[1], x[2], x[3]]
float current = na
float prior1 = na
float prior2 = na
float prior3 = na
if bar_index % 3 == 0
    [a, b, c, d] = sample(float(bar_index))
    current := a
    prior1 := b
    prior2 := c
    prior3 := d
plot(float(bar_index), "BAR_INDEX")
plot(current, "CURRENT")
plot(prior1, "PRIOR1")
plot(prior2, "PRIOR2")
plot(prior3, "PRIOR3")
`;

describe('rank1792 native sparse parameter history', () => {
  it('retains prior parameter values in skipped chart slots for offsets2/3', () => {
    const result = runCompatScript(capturedSource, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'BAR_INDEX').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(getPlot(result, 'CURRENT').values).toEqual([0, null, null, 3, null, null, 6, null, null, 9]);
    expect(getPlot(result, 'PRIOR1').values).toEqual([null, null, null, 0, null, null, 3, null, null, 6]);
    expect(getPlot(result, 'PRIOR2').values).toEqual([null, null, null, 0, null, null, 3, null, null, 6]);
    expect(getPlot(result, 'PRIOR3').values).toEqual([null, null, null, 0, null, null, 3, null, null, 6]);
  });

  it('keeps independent written-call parameter histories', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Independent sparse parameters")
f(float x) => x[2]
plot(bar_index % 3 == 0 ? f(float(bar_index)) : na, "a")
plot(bar_index % 3 == 0 ? f(100.0 + bar_index) : na, "b")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'a').values).toEqual([null, null, null, 0, null, null, 3, null, null, 6]);
    expect(getPlot(result, 'b').values).toEqual([null, null, null, 100, null, null, 103, null, null, 106]);
  });

  it('keeps unconditional parameter history and call-local histories distinct', () => {
    const result = runCompatScript(
      `//@version=6
indicator("History controls")
f(float x) => x[2]
g(float x) =>
    local = x
    local[2]
plot(f(float(bar_index)), "every")
plot(bar_index % 3 == 0 ? g(float(bar_index)) : na, "local")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'every').values).toEqual([null, null, 0, 1, 2, 3, 4, 5, 6, 7]);
    expect(getPlot(result, 'local').values).toEqual([null, null, null, null, null, null, 0, null, null, 3]);
  });
  it.each([
    ['unconditional', 6, 'f(float x) => x[2]', 'plot(f(float(bar_index)))'],
    ['v5', 5, 'f(float x) => x[2]', 'plot(bar_index % 3 == 0 ? f(float(bar_index)) : na)'],
    ['dynamic offset', 6, 'f(float x, int k) => x[k]', 'plot(bar_index % 3 == 0 ? f(float(bar_index), 2) : na)'],
    ['uncaptured offset4', 6, 'f(float x) => x[4]', 'plot(bar_index % 3 == 0 ? f(float(bar_index)) : na)'],
    [
      'nested',
      6,
      'inner(float x) => x[2]\nf(float x) => inner(x)',
      'plot(bar_index % 3 == 0 ? f(float(bar_index)) : na)',
    ],
    ['implicit TA source', 6, 'f(float x) => ta.sma(x, 2)', 'plot(bar_index % 3 == 0 ? f(float(bar_index)) : na)'],
  ] as const)(
    'preserves existing parameter-update codegen outside captured %s shape',
    (_name, version, definition, call) => {
      const compiled = tryCompile(parse(`//@version=${version}\nindicator("Codegen scope")\n${definition}\n${call}`));
      expect(compiled.success).toBe(true);
      const updates = compiled.generatedCode
        ?.split('\n')
        .filter((line) => line.includes('__tealscriptLastBar = this._updateScopeHistory('));
      expect(updates?.length).toBeGreaterThan(0);
      expect(updates?.every((line) => line.includes(', ctx.barIndex, false)'))).toBe(true);
    },
  );
});
