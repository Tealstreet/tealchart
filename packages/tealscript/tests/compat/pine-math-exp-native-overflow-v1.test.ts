import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

describe('v9 native exp overflow missing-state flags', () => {
  // V9 w8-exp-overflow-{710,1000}-0-v6-v1: RESULT_NA=1 on 24,871 historical rows each.
  it.each([710, 1000])('publishes native missing state for exp(%s)', (argument) => {
    const result = runCompatScript(`//@version=6
indicator("Native exp overflow")
argument = input.float(${argument}, "Argument") + bar_index * 0.0
value = math.exp(argument)
plot(na(value) ? 1 : 0, "RESULT_NA")
plot(nz(value, -7), "REPLACEMENT")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'RESULT_NA').values).toEqual(Array(12).fill(1));
    expect(getPlot(result, 'REPLACEMENT').values).toEqual(Array(12).fill(-7));
  });

  // V9 709 has RESULT_NA=0; -1000 additionally exposes RESULT=0.
  it.each([709, -1000])('retains native nonmissing state for exp(%s)', (argument) => {
    const result = runCompatScript(`//@version=6
indicator("Native exp controls")
value = math.exp(${argument} + bar_index * 0.0)
plot(na(value) ? 1 : 0, "RESULT_NA")
plot(value, "RESULT")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'RESULT_NA').values).toEqual(Array(12).fill(0));
    if (argument === -1000) expect(getPlot(result, 'RESULT').values).toEqual(Array(12).fill(0));
  });
});
