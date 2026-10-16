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
      // V94's byte-floor model changes this local packed-alpha representation
      // to 127. V52 native R/G/B/T/NA assertions above (including T50) stay exact;
      // that capture does not certify the engine's packed hexadecimal alpha.
      expect(getPlot(result, 'Colored').color).toEqual(['#FF00007F', '#FF00007F', '#FF00007F']);
    });
  }
  for (const [name, expression, expected] of [
    // Local opaque consistency control for the single V94 floor-byte model.
    // This predicts 127; the integer-channel V94 opaque control does not
    // independently certify this half-byte midpoint.
    ['finite midpoint', 'color.from_gradient(5,0,10,#000000,#FFFFFF)', 127],
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
  // V93's captured E tuples supersede the former uncaptured low-clamp NA assumption.
  // Keep every boundary case and assert all channels as well as missingness.
  for (const [name, expression, missing] of [
    ['missing value', 'color.from_gradient(na,0,10,#000000,#FFFFFF)', 1],
    ['missing lower endpoint at lower clamp', 'color.from_gradient(0,0,10,na,#FF0000)', 0],
    ['missing numeric bound', 'color.from_gradient(5,na,10,#000000,#FFFFFF)', 1],
    ['both missing colors', 'color.from_gradient(5,0,10,na,na)', 1],
    ['missing upper color', 'color.from_gradient(5,0,10,#000000,na)', 1],
  ] as const) {
    it(`preserves the complete ${name} result`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Gradient missing control")
c = ${expression}
plot(na(c)?1:0,"NA")
plot(color.r(c),"R")
plot(color.g(c),"G")
plot(color.b(c),"B")
plot(color.t(c),"T")`,
      );
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'NA').values;
      expect(values).toHaveLength(compatibilityBars.length);
      expect(values.every((value) => value === missing)).toBe(true);
      for (const [channel, expected] of [['R', 0], ['G', 0], ['B', 0], ['T', 100]] as const) {
        expect(getPlot(result, channel).values).toEqual(compatibilityBars.map(() => missing ? null : expected));
      }
    });
  }
});
