import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1], [4..6], [56..57], int/float slots.
// Fractional, zero and negative controls distinguish numbers from integer-only checks.
const contracts = [
  { name: 'plot', entry: 1, defaults: { series: '2', histbase: '0' }, params: ['histbase'] },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' }, params: ['series'] },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['open', 'high', 'low', 'close'] },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['open', 'high', 'low', 'close'] },
  { name: 'hline', entry: 56, defaults: { price: '-3' }, params: ['price'] },
  { name: 'fill', entry: 57, defaults: { plot1: 'p', plot2: 'q', top_value: '2', bottom_value: '-3', top_color: '#123456', bottom_color: '#654321' }, params: ['top_value', 'bottom_value'] },
] as const;

function errors(name: string, defaults: Record<string, string>, parameter: string, value: string, declaration = '') {
  const remaining = Object.entries(defaults)
    .filter(([key]) => key !== parameter)
    .map(([key, expression]) => `${key}=${expression}`);
  const args = [`${parameter}=${value}`, ...remaining].join(', ');
  return checkProgram(parse(`//@version=6
indicator("Numeric visual options")
p = plot(2)
q = plot(-3)
${declaration}
${name}(${args})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

function expectNumericRefusal(name: string, defaults: Record<string, string>, parameter: string, value: string) {
  expect(errors(name, defaults, parameter, value), value).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'type-mismatch',
        message: expect.stringContaining(`${name} ${parameter} must be a number`),
      }),
    ]),
  );
}

describe('documented visual numeric argument kinds', () => {
  for (const contract of contracts) {
    for (const parameter of contract.params) {
      it(`${contract.name}:${parameter} accepts int/float only [functions[${contract.entry}]]`, () => {
        for (const value of ['0', '-3', '1.25']) {
          expect(errors(contract.name, contract.defaults, parameter, value), value).toEqual([]);
        }
        for (const value of ['false', '"2.5"', '#123456', 'array.from(2.5)', 'p']) {
          expectNumericRefusal(contract.name, contract.defaults, parameter, value);
        }
      });
    }
  }

  it('plot:series accepts signed/fractional numbers and rejects arrays [functions[1]]', () => {
    for (const value of ['0', '-3', '1.25']) {
      expect(errors('plot', {}, 'series', value), value).toEqual([]);
    }
    expectNumericRefusal('plot', {}, 'series', 'array.from(2.5)');
  });

  // Reference functions[1]:series permits int/float, including typed aliases.
  for (const [kind, value] of [['bool', 'false'], ['string', '"2.5"'], ['color', '#123456'], ['plot ID', 'p']] as const) {
    it(`visual-plot-nonnumeric-series-kind: rejects ${kind} [functions[1]:series]`, () => {
      expectNumericRefusal('plot', {}, 'series', value);
    });
  }

  it('plot series validates alias kinds and keeps missing values numeric-compatible', () => {
    for (const [type, value] of [['bool', 'false'], ['string', '"2.5"'], ['color', '#123456']]) {
      expect(errors('plot', {}, 'series', 'value', `${type} value = ${value}`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    }
    expect(errors('plot', {}, 'series', 'na')).toEqual([]);
    expect(errors('plot', {}, 'series', 'value', 'float value = 1.25')).toEqual([]);
  });

  it('does not impose the builtin plot series contract on a user callable', () => {
    const source = `//@version=6
indicator("Shadowed plot")
plot(series) => series
result = plot(false)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
