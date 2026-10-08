import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1..8], [56..59], color parameter types.
// Const controls avoid the separately adjudicated hline color qualifier boundary.
const contracts = [
  { name: 'plot', entry: 1, defaults: { series: '2' }, params: ['color'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, params: ['color', 'textcolor'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, params: ['color', 'textcolor'] },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' }, params: ['colorup', 'colordown'] },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['color'] },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['color', 'wickcolor', 'bordercolor'] },
  { name: 'barcolor', entry: 7, defaults: {}, params: ['color'] },
  { name: 'bgcolor', entry: 8, defaults: {}, params: ['color'] },
  { name: 'hline', entry: 56, defaults: { price: '-3' }, params: ['color'] },
  { name: 'fill', entry: 57, defaults: { plot1: 'p', plot2: 'q', top_value: '2', bottom_value: '-3', top_color: '#123456', bottom_color: '#654321' }, params: ['top_color', 'bottom_color'] },
  { name: 'fill', entry: 58, defaults: { hline1: 'h', hline2: 'i' }, params: ['color'] },
  { name: 'fill', entry: 59, defaults: { plot1: 'p', plot2: 'q' }, params: ['color'] },
] as const;

function errors(name: string, defaults: Record<string, string>, parameter: string, value: string) {
  const remaining = Object.entries(defaults)
    .filter(([key]) => key !== parameter)
    .map(([key, expression]) => `${key}=${expression}`);
  const args = [...remaining, `${parameter}=${value}`].join(', ');
  return checkProgram(parse(`//@version=6
indicator("Color visual options")
p = plot(2)
q = plot(-3)
h = hline(2)
i = hline(-3)
${name}(${args})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented visual color argument kinds', () => {
  for (const contract of contracts) {
    for (const parameter of contract.params) {
      it(`${contract.name}:${parameter} requires a color [functions[${contract.entry}]]`, () => {
        for (const value of ['#123456', 'color.new(#654321, 30)']) {
          expect(errors(contract.name, contract.defaults, parameter, value), value).toEqual([]);
        }
        // Numeric, quoted-hex, boolean and reference cases reject coercive color parsing.
        for (const value of ['2', '-2.5', '"#123456"', 'true', 'array.from(#123456)', 'p']) {
          expect(errors(contract.name, contract.defaults, parameter, value), value).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'type-mismatch',
                message: expect.stringContaining(`${contract.name} ${parameter} must be a color`),
              }),
            ]),
          );
        }
      });
    }
  }
});
