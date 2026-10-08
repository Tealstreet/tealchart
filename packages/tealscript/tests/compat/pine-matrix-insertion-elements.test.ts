import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("Matrix insertion elements")\n${body}`;
const errors = (body: string) =>
  checkProgram(parse(source(body))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Matrices manual: all elements have the declared element type.
// https://www.tradingview.com/pine-script-docs/language/matrices/#introduction
describe('matrix insertion preserves the declared element type', () => {
  for (const member of ['add_row', 'add_col']) {
    const index = member === 'add_row' ? 'row' : 'column';
    const calls = [
      `matrix.${member}(m, 1, values)`,
      `matrix.${member}(array_id=values, id=m, ${index}=1)`,
      `m.${member}(1, values)`,
      `m.${member}(array_id=values, ${index}=1)`,
    ];
    for (const call of calls) {
      it(`refuses string elements: ${call}`, () => {
        expect(errors(`m = matrix.new<float>(2, 2, 4.0)\nvalues = array.from("bad", "wrong")\n${call}`)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('array_id') }),
          ]),
        );
      });

      it(`admits matching float elements: ${call}`, () => {
        const body = `m = matrix.new<float>(2, 2, 4.0)\nvalues = array.from(8.5, 9.5)\n${call}\nplot(m.get(1, 1), "Inserted")`;
        expect(errors(body)).toEqual([]);
        const result = runCompatScript(source(body), { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Inserted').values).toEqual([9.5]);
      });
    }

    it(`${member} checks arrays returned by a typed function`, () => {
      expect(
        errors(`strings() => array.from("bad", "wrong")\nm = matrix.new<float>(2, 2, 4.0)\nm.${member}(1, strings())`),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('array_id') }),
        ]),
      );
    });

    it(`${member} admits integer values in a float matrix and omitted arrays`, () => {
      expect(errors(`m = matrix.new<float>(2, 2, 4.0)\nm.${member}(1, array.from(8, 9))\nm.${member}(1)`)).toEqual([]);
    });

    it(`${member} preserves a local method with a different array contract`, () => {
      expect(
        errors(
          `method ${member}(matrix<float> self, int index, array<string> values) => values.size()\nm = matrix.new<float>(2, 2, 4.0)\nplot(m.${member}(1, array.from("accepted")))`,
        ),
      ).toEqual([]);
    });
  }
});
