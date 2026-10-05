import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Ledger611/612; reuse constReferences.test.ts for array/matrix/map/line IDs.
// https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types
describe('const drawing reference extensions', () => {
  for (const [kind, constructor, mutation, read] of [
    ['label', 'label.new(bar_index, close)', 'label.set_y(alias, close + 1)', 'label.get_y(held)'],
    [
      'box',
      'box.new(bar_index, close, bar_index + 1, close - 1)',
      'box.set_top(alias, close + 1)',
      'box.get_top(held)',
    ],
  ]) {
    const declaration = `const ${kind} held = ${constructor}`;
    it(`retains series ${kind} identity and mutates through an alias`, () => {
      const source = `//@version=6\nindicator("Const drawing aliases")\n${declaration}\nalias = held\n${mutation}\nplot(${read}, "value")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      for (const name of ['held', 'alias']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toMatchObject({
          kind,
          qualifier: 'series',
        });
      }
      const result = runCompatScript(source, {
        bars: [10, 20, 30].map((close, index) => ({
          time: (index + 1) * 60_000,
          open: close,
          high: close,
          low: close,
          close,
          volume: 1,
        })),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual([11, 21, 31]);
    });

    it(`refuses replacement of the const ${kind} ID`, () => {
      const checked = checkProgram(
        parse(`//@version=6\nindicator("Const drawing replacement")\n${declaration}\nheld := ${constructor}`),
      );
      expect(checked.diagnostics).toEqual([expect.objectContaining({ code: 'const-reassignment', severity: 'error' })]);
    });
  }
});
