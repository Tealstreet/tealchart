import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [8.25, -3.5, 12.75, 0, -7.125].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 100,
}));

// Pine reference nz(source) float overload: missing source becomes zero.
// Defined fractional, zero and negative sources retain their values.
describe('float nz default replacement', () => {
  it.each([5, 6])('replaces only missing float samples in v%s', (version) => {
    const result = runCompatScript(`//@version=${version}
indicator("Float nz default")
float value = bar_index == 0 or bar_index == 2 ? na : close
plot(nz(value), "Default")
plot(nz(source=value), "Named")
plot(nz(close), "Finite")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default').values).toEqual([0, -3.5, 0, 0, -7.125]);
    expect(getPlot(result, 'Named').values).toEqual([0, -3.5, 0, 0, -7.125]);
    expect(getPlot(result, 'Finite').values).toEqual([8.25, -3.5, 12.75, 0, -7.125]);
  });
});
