import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) {
  it(`v${version} BB and BBW retain two finite samples across a source hole`, () => {
    const result = runCompatScript(`//@version=${version}
indicator("BB finite samples")
source = bar_index == 2 ? na : bar_index == 0 ? 1.0 : bar_index == 1 ? 3.0 : bar_index == 3 ? 5.0 : 7.0
[b, u, l] = ta.bb(source, 2, 2)
plot(b, "Basis")
plot(u, "Upper")
plot(l, "Lower")
plot(ta.bbw(source, 2, 2), "Width")`, { bars: compatibilityBars.slice(0, 5) });
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [['Basis', [2, 4, 6]], ['Upper', [4, 6, 8]], ['Lower', [0, 2, 4]], ['Width', [200, 100, 200 / 3]]] as const) {
      const values = getPlot(result, title).values;
      [1, 3, 4].forEach((bar, index) => expect(values[bar], `${title}:${bar}`).toBeCloseTo(expected[index], 12));
    }
  });
}
