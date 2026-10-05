import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('chart.point.index is a series integer bar coordinate', () => {
  for (const constructor of [
    'chart.point.from_index(7, -13.5)',
    'chart.point.new(time, 7, -13.5)',
    'chart.point.now(-13.5)',
    'chart.point.from_time(time, -13.5)',
  ]) {
    it(`retains the field kind and qualifier for ${constructor}`, () => {
      const checked = checkProgram(
        parse(`//@version=6
indicator("Point index type")
point = ${constructor}
coordinate = point.index
plot(coordinate)`),
      );
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'coordinate')?.type).toEqual({
        kind: 'int',
        qualifier: 'series',
      });
    });
  }

  it('retains an aliased mutable index independently of time and price', () => {
    const result = runCompatScript(`//@version=6
indicator("Point coordinate")
point = chart.point.new(time, bar_index + 7, -13.5)
plot(point.index, title="initial")
alias = point
alias.index := bar_index + 19
plot(point.index, title="index")
plot(point.time, title="time")
plot(point.price, title="price")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'initial').values).toEqual(compatibilityBars.map((_, index) => index + 7));
    expect(getPlot(result, 'index').values).toEqual(compatibilityBars.map((_, index) => index + 19));
    expect(getPlot(result, 'time').values).toEqual(compatibilityBars.map((bar) => bar.time));
    expect(getPlot(result, 'price').values).toEqual(compatibilityBars.map(() => -13.5));
  });
});
