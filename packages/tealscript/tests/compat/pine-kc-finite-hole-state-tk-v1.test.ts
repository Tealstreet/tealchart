import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) {
  it(`v${version} KC and KCW retain EMA state across a source hole`, () => {
    const result = runCompatScript(`//@version=${version}
indicator("KC finite recovery")
source = bar_index == 3 ? na : bar_index < 3 ? 10.0 : bar_index == 4 ? 14.0 : 20.0
[b, u, l] = ta.kc(source, 3, 1, false)
plot(b, "Basis")
plot(u, "Upper")
plot(l, "Lower")
plot(ta.kcw(source, 3, 1, false), "Width")`, { bars: compatibilityBars.slice(0, 6).map((bar) => ({ ...bar, high: 11, low: 9, close: 10 })) });
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [['Basis', [12, 16]], ['Upper', [14, 18]], ['Lower', [10, 14]], ['Width', [1 / 3, 1 / 4]]] as const) {
      const values = getPlot(result, title).values;
      [4, 5].forEach((bar, index) => expect(values[bar], `${title}:${bar}`).toBeCloseTo(expected[index], 12));
    }
  });
}

for (const version of [5, 6]) {
  it(`v${version} asymmetric KC and KCW retain independent source and range state`, () => {
    const result = runCompatScript(`//@version=${version}
indicator("KC finite recovery")
source = bar_index == 3 ? na : bar_index < 3 ? 10.0 : bar_index == 4 ? 14.0 : 20.0
[b, u, l] = ta.kc(source, 3, 1, false)
plot(b, "Basis")
plot(u, "Upper")
plot(l, "Lower")
plot(ta.kcw(source, 3, 1, false), "Width")`, { bars: compatibilityBars.slice(0, 6).map((bar, i) => ({ ...bar, high: [11, 15, 9, 19, 33, 18][i], low: [9, 13, 7, 11, 23, 14][i], close: [10, 14, 8, 18, 28, 15][i] })) });
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [['Basis', [12, 16]], ['Upper', [19.5, 21.75]], ['Lower', [4.5, 10.25]], ['Width', [5 / 4, 23 / 32]]] as const) {
      const values = getPlot(result, title).values;
      [4, 5].forEach((bar, index) => expect(values[bar], `${title}:${bar}`).toBeCloseTo(expected[index], 12));
    }
  });
}
