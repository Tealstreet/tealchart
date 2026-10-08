import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1..8], [56..59], string parameter types.
const contracts = [
  { name: 'plot', entry: 1, defaults: { series: '2' }, params: ['title'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, params: ['title', 'text'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, params: ['title', 'text', 'char'] },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' }, params: ['title'] },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['title'] },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' }, params: ['title'] },
  { name: 'barcolor', entry: 7, defaults: { color: '#123456' }, params: ['title'] },
  { name: 'bgcolor', entry: 8, defaults: { color: '#123456' }, params: ['title'] },
  { name: 'hline', entry: 56, defaults: { price: '-3' }, params: ['title'] },
  { name: 'fill', entry: 57, defaults: { plot1: 'p', plot2: 'q', top_value: '2', bottom_value: '-3', top_color: '#123456', bottom_color: '#654321' }, params: ['title'] },
  { name: 'fill', entry: 58, defaults: { hline1: 'h', hline2: 'i', color: '#123456' }, params: ['title'] },
  { name: 'fill', entry: 59, defaults: { plot1: 'p', plot2: 'q', color: '#123456' }, params: ['title'] },
] as const;

const optionContracts = [
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, parameter: 'style', values: ['shape.triangleup', 'shape.diamond'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, parameter: 'location', values: ['location.abovebar', 'location.absolute'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, parameter: 'size', values: ['size.tiny', 'size.huge'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, parameter: 'location', values: ['location.abovebar', 'location.absolute'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, parameter: 'size', values: ['size.tiny', 'size.huge'] },
  ...contracts.filter((contract) => contract.entry >= 1 && contract.entry <= 6).map((contract) => ({
    ...contract, parameter: 'format', values: ['format.price', 'format.volume'],
  })),
];

function errors(name: string, defaults: Record<string, string>, parameter: string, value: string, declaration = '') {
  const args = [`${parameter}=${value}`, ...Object.entries(defaults).map(([key, expression]) => `${key}=${expression}`)];
  return checkProgram(parse(`//@version=6
indicator("String visual options")
p = plot(2)
q = plot(-3)
h = hline(2)
i = hline(-3)
${declaration}
${name}(${args.join(', ')})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented visual string argument kinds', () => {
  for (const contract of contracts) {
    for (const parameter of contract.params) {
      it(`${contract.name}:${parameter} requires a string [functions[${contract.entry}]]`, () => {
        for (const value of ['"★"', '"☆"']) {
          expect(errors(contract.name, contract.defaults, parameter, value), value).toEqual([]);
        }
        // Numeric, boolean, color and reference arguments reject automatic text conversion.
        for (const value of ['2', '-2.5', 'false', '#123456', 'array.from("text")', 'p']) {
          expect(errors(contract.name, contract.defaults, parameter, value), value).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
          );
        }
      });
    }
  }

  for (const contract of optionContracts) {
    it(`${contract.name}:${contract.parameter} accepts documented strings [functions[${contract.entry}]]`, () => {
      for (const value of contract.values) {
        expect(errors(contract.name, contract.defaults, contract.parameter, value), value).toEqual([]);
      }
    });

    // Domain and inferred kind checks both apply to these string options.
    it(`visual-string-option-kind: ${contract.name}:${contract.parameter} rejects nonstrings [functions[${contract.entry}]]`, () => {
      for (const value of ['2', '-2.5', 'false', '#123456', 'array.from("text")', 'p']) {
        expect(errors(contract.name, contract.defaults, contract.parameter, value), value).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
        );
      }
    });
  }

  it('checks inferred option kinds and accepts constant string aliases', () => {
    for (const contract of optionContracts) {
      expect(errors(contract.name, contract.defaults, contract.parameter, 'value', 'int value = 2')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
      expect(errors(contract.name, contract.defaults, contract.parameter, 'value', `const string value = ${contract.values[0]}`)).toEqual([]);
    }
  });

  it('does not impose builtin option kinds on a user marker callable', () => {
    const source = `//@version=6
indicator("Custom marker options")
plotshape(style, location, size, format) => style
result = plotshape(style=2, location=false, size=3, format=4)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
