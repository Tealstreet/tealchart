import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1..8], [56..59], boolean parameter types.
// false/true plus unrelated scalar and reference kinds reject truthiness coercion.
const contracts = [
  { name: 'plot', entry: 1, args: 'series=2', params: ['trackprice', 'join', 'editable', 'force_overlay'] },
  { name: 'plotshape', entry: 2, args: 'series=true', params: ['editable', 'force_overlay'] },
  { name: 'plotchar', entry: 3, args: 'series=true', params: ['editable', 'force_overlay'] },
  { name: 'plotarrow', entry: 4, args: 'series=-2', params: ['editable', 'force_overlay'] },
  { name: 'plotbar', entry: 5, args: 'open=2, high=4, low=-3, close=1', params: ['editable', 'force_overlay'] },
  { name: 'plotcandle', entry: 6, args: 'open=2, high=4, low=-3, close=1', params: ['editable', 'force_overlay'] },
  { name: 'barcolor', entry: 7, args: 'color=#123456', params: ['editable'] },
  { name: 'bgcolor', entry: 8, args: 'color=#123456', params: ['editable', 'force_overlay'] },
  { name: 'hline', entry: 56, args: 'price=-3', params: ['editable'] },
  { name: 'fill', entry: 57, args: 'plot1=p, plot2=q, top_value=2, bottom_value=-3, top_color=#123456, bottom_color=#654321', params: ['editable', 'fillgaps'] },
  { name: 'fill', entry: 58, args: 'hline1=h, hline2=i, color=#123456', params: ['editable', 'fillgaps'] },
  { name: 'fill', entry: 59, args: 'plot1=p, plot2=q, color=#123456', params: ['editable', 'fillgaps'] },
] as const;

function errors(name: string, args: string, parameter: string, value: string) {
  const source = `//@version=6
indicator("Boolean visual options")
p = plot(2)
q = plot(-3)
h = hline(2)
i = hline(-3)
${name}(${parameter}=${value}, ${args})`;
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented visual boolean argument kinds', () => {
  for (const contract of contracts) {
    for (const parameter of contract.params) {
      it(`${contract.name}:${parameter} accepts only booleans [functions[${contract.entry}]]`, () => {
        for (const value of ['false', 'true']) {
          expect(errors(contract.name, contract.args, parameter, value), value).toEqual([]);
        }
        for (const value of ['0', '-2.5', '"false"', '#123456', 'array.from(false)']) {
          expect(errors(contract.name, contract.args, parameter, value), value).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'type-mismatch',
                message: expect.stringContaining(`${contract.name} ${parameter} must be a boolean`),
              }),
            ]),
          );
        }
      });
    }
  }
});
