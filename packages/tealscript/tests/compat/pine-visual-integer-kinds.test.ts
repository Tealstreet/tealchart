import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1..8], [59], integer option types.
const visuals = [
  { name: 'plot', entry: 1, defaults: { series: '2' }, params: ['offset', 'show_last'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, params: ['offset', 'show_last'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, params: ['offset', 'show_last'] },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' }, params: ['offset', 'show_last', 'minheight', 'maxheight'] },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['show_last'] },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['show_last'] },
  { name: 'barcolor', entry: 7, defaults: { color: '#123456' }, params: ['offset', 'show_last'] },
  { name: 'bgcolor', entry: 8, defaults: { color: '#123456' }, params: ['offset', 'show_last'] },
  { name: 'fill', entry: 59, defaults: { plot1: 'p', plot2: 'q', color: '#123456' }, params: ['show_last'] },
] as const;

function errors(name: string, defaults: Record<string, string>, parameter: string, value: string, declaration = '') {
  const args = [`${parameter}=${value}`, ...Object.entries(defaults).map(([key, expression]) => `${key}=${expression}`)];
  return checkProgram(parse(`//@version=6
indicator("Integer visual options")
p = plot(2)
q = plot(-3)
${declaration}
${name}(${args.join(', ')})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

const typeMismatch = expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]);

describe('documented visual integer option contracts', () => {
  for (const visual of visuals) {
    for (const parameter of visual.params) {
      it(`${visual.name}:${parameter} accepts integers and rejects unrelated kinds [functions[${visual.entry}]]`, () => {
        for (const value of ['1', '3']) expect(errors(visual.name, visual.defaults, parameter, value), value).toEqual([]);
        for (const value of ['false', '"3"', '#123456', 'array.from(3)', 'p']) {
          expect(errors(visual.name, visual.defaults, parameter, value), value).toEqual(typeMismatch);
        }
      });

      it(`visual-integer-option-fraction: ${visual.name}:${parameter} rejects fractions [functions[${visual.entry}]]`, () => {
        for (const value of ['1.25', '3.75']) {
          expect(errors(visual.name, visual.defaults, parameter, value), value).toEqual(typeMismatch);
        }
      });
    }
  }

  for (const visual of visuals.filter((contract) => contract.entry <= 6)) {
    it(`${visual.name}:precision accepts 0 and 16, rejects negative/fractional values [functions[${visual.entry}]]`, () => {
      for (const value of ['0', '16']) expect(errors(visual.name, visual.defaults, 'precision', value), value).toEqual([]);
      for (const value of ['-1', '1.25', '"2"', 'false']) {
        expect(errors(visual.name, visual.defaults, 'precision', value), value).toEqual(typeMismatch);
      }
    });

    // Reference precision bounds also apply to known alias and input defaults.
    it(`visual-precision-upper-bound: ${visual.name} rejects precision above 16 [functions[${visual.entry}]]`, () => {
      for (const value of ['17', '100']) {
        expect(errors(visual.name, visual.defaults, 'precision', value), value).toEqual(typeMismatch);
      }
    });
  }

  it('validates inferred integer kinds rather than rounding float aliases', () => {
    for (const visual of visuals) {
      for (const parameter of visual.params) {
        for (const declaration of ['float value = 1.0', 'value = input.float(1.25)']) {
          expect(errors(visual.name, visual.defaults, parameter, 'value', declaration)).toEqual(typeMismatch);
        }
        expect(errors(visual.name, visual.defaults, parameter, 'value', 'const int value = 3')).toEqual([]);
      }
    }
  });

  it('does not impose builtin integer options on a user callable', () => {
    const source = `//@version=6
indicator("Custom integer options")
bgcolor(offset, show_last) => offset
result = bgcolor(offset=1.25, show_last=3.75)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('checks known precision defaults and aliases against the documented bounds', () => {
    for (const visual of visuals.filter((contract) => contract.entry <= 6)) {
      for (const declaration of ['const int value = 17', 'value = input.int(17)', 'const int value = -1']) {
        expect(errors(visual.name, visual.defaults, 'precision', 'value', declaration)).toEqual(typeMismatch);
      }
      for (const declaration of ['const int value = 16', 'value = input.int(0)']) {
        expect(errors(visual.name, visual.defaults, 'precision', 'value', declaration)).toEqual([]);
      }
    }
  });

  it('does not impose the builtin precision range on a user callable', () => {
    const source = `//@version=6
indicator("Custom precision")
plotbar(precision) => precision
result = plotbar(precision=17)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
