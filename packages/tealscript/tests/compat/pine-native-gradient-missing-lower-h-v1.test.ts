import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('gradient missing endpoints and clamps', () => {
  for (const [form, expression] of [
    ['named', 'color.from_gradient(top_color=#FF0000, bottom_color=na, value=5, top_value=10, bottom_value=0)'],
    ['positional', 'color.from_gradient(5, 0, 10, na, #FF0000)'],
  ]) {
    it(`${form} missing lower endpoint preserves all midpoint channels and plot colors`, () => {
      const bars = compatibilityBars.slice(0, 3);
      const result = runCompatScript(
        `//@version=6
indicator("Missing gradient endpoint")
x = ${expression}
plot(color.r(x), "R")
plot(color.g(x), "G")
plot(color.b(x), "B")
plot(color.t(x), "T")
plot(na(x) ? 1 : 0, "NA")
plot(close, "Colored", color=x)`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      for (const [title, expected] of [
        ['R', 255],
        ['G', 0],
        ['B', 0],
        ['T', 50],
        ['NA', 0],
      ] as const) {
        expect(getPlot(result, title).values).toEqual([expected, expected, expected]);
      }
      expect(getPlot(result, 'Colored').values).toEqual(bars.map((bar) => bar.close));
      expect(getPlot(result, 'Colored').color).toEqual(['#FF000080', '#FF000080', '#FF000080']);
    });
  }
  for (const [name, expression, expected] of [
    ['finite midpoint', 'color.from_gradient(5,0,10,#000000,#FFFFFF)', 128],
    ['finite lower clamp', 'color.from_gradient(-5,0,10,#000000,#FFFFFF)', 0],
    ['finite upper clamp', 'color.from_gradient(15,0,10,#000000,#FFFFFF)', 255],
    ['degenerate finite range', 'color.from_gradient(5,5,5,#FF0000,#FFFFFF)', 0],
  ] as const) {
    it(`retains ${name}`, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Gradient preservation")\nplot(color.r(${expression}),"R")`,
      );
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'R').values;
      expect(values).toHaveLength(compatibilityBars.length);
      expect(values.every((value) => value === expected)).toBe(true);
    });
  }
  for (const [name, expression] of [
    ['missing value', 'color.from_gradient(na,0,10,#000000,#FFFFFF)'],
    ['missing lower endpoint at lower clamp', 'color.from_gradient(0,0,10,na,#FF0000)'],
    ['missing numeric bound', 'color.from_gradient(5,na,10,#000000,#FFFFFF)'],
    ['both missing colors', 'color.from_gradient(5,0,10,na,na)'],
    ['missing upper color', 'color.from_gradient(5,0,10,#000000,na)'],
  ] as const) {
    it(`retains the earlier ${name} missing route`, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Gradient missing control")\nplot(na(${expression})?1:0,"NA")`,
      );
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'NA').values;
      expect(values).toHaveLength(compatibilityBars.length);
      expect(values.every((value) => value === 1)).toBe(true);
    });
  }
});
