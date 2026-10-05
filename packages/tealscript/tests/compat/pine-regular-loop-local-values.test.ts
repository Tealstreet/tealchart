import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

function values(version: number, body: string) {
  const result = runCompatScript(`//@version=${version}\nindicator("Regular loop locals")\n${body}`, {
    bars: compatibilityBars.slice(0, 4),
  });
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('regular loop-local reinitialization, rank1794', () => {
  it.each([5, 6])('v%s resets a mutated scalar at each for iteration and each bar', (version) => {
    expect(
      values(
        version,
        `int total = 0
for i = 1 to 3
    int localValue = bar_index + i
    localValue += 10
    total += localValue
plot(total)`,
      ),
    ).toEqual([[36, 39, 42, 45]]);
  });

  it.each([5, 6])('v%s resets a mutated scalar at each while iteration and each bar', (version) => {
    expect(
      values(
        version,
        `int total = 0
int i = 1
while i <= 3
    int localValue = bar_index + i
    localValue += 10
    total += localValue
    i += 1
plot(total)`,
      ),
    ).toEqual([[36, 39, 42, 45]]);
  });
});
