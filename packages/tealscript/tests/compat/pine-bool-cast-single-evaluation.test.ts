import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) {
  it(`v${version} finite casts keep zero and sign conversion`, () => {
    const result = runCompatScript(`//@version=${version}
indicator("Finite bool controls")
plot(bool(0.0) ? 1 : 0, "Zero")
plot(bool(x=-0.25) ? 1 : 0, "Negative")
plot(bool(0.25) ? 1 : 0, "Positive")`);
    expect(result.errors).toEqual([]);
    for (const [name, value] of [
      ['Zero', 0],
      ['Negative', 1],
      ['Positive', 1],
    ] as const) {
      expect(getPlot(result, name).values).toEqual(Array(12).fill(value));
    }
  });
  it(`v${version} cast evaluates a stateful numeric argument once`, () => {
    const result = runCompatScript(`//@version=${version}
indicator("Bool call count")
var array<int> calls=array.new<int>()
nextValue() =>
    array.push(calls, 1)
    float(na)
converted=bool(nextValue())
plot(array.size(calls), "Calls")
plot(converted ? 1 : 0, "Truth")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Calls').values).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(getPlot(result, 'Truth').values).toEqual(Array(12).fill(0));
  });
}
