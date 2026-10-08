import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) for (const receiver of [false, true]) {
  it(`v${version} ${receiver ? 'receiver' : 'namespace'} asymmetric powers and rectangular average`, () => {
    const pow = (power: number) => receiver ? `a.pow(${power})` : `matrix.pow(a, ${power})`;
    const expected = [1, 0, 0, 1, 2, 1, -1, 3, 3, 5, -5, 8, 1, 18, -18, 19];
    const result = runCompatScript(`//@version=${version}
indicator("Power and average cells")
a = matrix.new<int>(2, 2, 0)
a.set(0, 0, 2)
a.set(0, 1, 1)
a.set(1, 0, -1)
a.set(1, 1, 3)
${[0, 1, 2, 3].map((power) => `p${power} = ${pow(power)}`).join('\n')}
${expected.map((_, index) => `plot(p${Math.floor(index / 4)}.get(${Math.floor((index % 4) / 2)}, ${index % 2}), "Cell${index}")`).join('\n')}
m = matrix.new<float>(2, 3, 0)
${[-2.5, 3.25, -4.75, 8, 0, 2].map((value, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
plot(${receiver ? 'm.avg()' : 'matrix.avg(m)'}, "Average")`, { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expected.forEach((value, index) => expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]));
    expect(getPlot(result, 'Average').values).toEqual([1, 1]);
  });
}
