import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: pine-v6-reference-v1.json function/polyline.new categoryIndex 699,
// signature and returnedTypes: series polyline. Only this constructor is covered.
describe('documented polyline constructor result qualifier', () => {
  for (const price of ['2.5', 'input.float(2.5)', 'close']) {
    it(`keeps a series polyline result and alias with price ${price}`, () => {
      const result = checkProgram(parse(`//@version=6
indicator("Polyline result qualifier", overlay=true)
price = ${price}
points = array.from(chart.point.from_index(0, price), chart.point.from_index(1, price))
drawing = polyline.new(points)
alias = drawing`));

      expect(result.diagnostics).toEqual([]);
      for (const name of ['drawing', 'alias']) {
        expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
          kind: 'polyline', qualifier: 'series',
        });
      }
    });
  }
});
