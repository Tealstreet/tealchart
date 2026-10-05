import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('fixed horizontal level and color across source bars', () => {
  for (const [level, color] of [
    [17.5, '#123456'],
    [-13.25, '#ABCDEF'],
  ] as const) {
    it(`publishes the configured ${level} level and ${color} color on every bar`, () => {
      const source = `//@version=6
indicator("Fixed levels")
level = input.float(${level}, "Level")
shade = input.color(${color}, "Shade")
hline(level, "Configured", shade)
hline(price=${level}, title="Literal", color=${color})`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      for (const title of ['Configured', 'Literal']) {
        expect(getPlot(result, title)).toMatchObject({ type: 'hline', price: level, color });
        expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => level));
      }
    });
  }

  for (const [slot, declaration] of [
    ['price', 'series float value = 17.5'],
    ['color', 'series color value = #123456'],
  ] as const) {
    it(`refuses a series-qualified ${slot} even when its value is unchanged`, () => {
      const call = slot === 'price' ? 'hline(value)' : 'hline(17.5, color=value)';
      const checked = checkProgram(parse(`//@version=6\nindicator("Fixed qualifiers")\n${declaration}\n${call}`));
      expect(checked.diagnostics).toEqual([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining(`parameter '${slot}'`),
        }),
      ]);
    });
  }
});
