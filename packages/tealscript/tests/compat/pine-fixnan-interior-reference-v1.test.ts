import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [8.25, -3.5, 12.75, 0, -7.125, -7.125, 4.5, 2.5].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 100,
}));

// Pine fixnan(float): replace missing values with the nearest prior defined value.
// Begin defined; leading-hole policy is not covered by these witnesses.
describe('numeric fixnan interior retention', () => {
  it.each([5, 6])('retains the latest finite value across interior holes in v%s', (version) => {
    const result = runCompatScript(`//@version=${version}
indicator("Interior fixnan")
float value = bar_index == 1 or bar_index == 2 or bar_index == 4 or bar_index == 6 ? na : close
plot(fixnan(value), "Positive")
plot(fixnan(source=-value), "Negative")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Positive').values).toEqual([8.25, 8.25, 8.25, 0, 0, -7.125, -7.125, 2.5]);
    expect(getPlot(result, 'Negative').values.map((value) => value === 0 ? 0 : value)).toEqual([-8.25, -8.25, -8.25, 0, 0, 7.125, 7.125, -2.5]);
  });
});
