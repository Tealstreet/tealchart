import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

function source(body: string): string {
  return `//@version=6\nindicator("Collection contracts")\n${body}`;
}

function checked(body: string) {
  return checkProgram(parse(source(body)));
}

function errors(body: string) {
  return checked(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

function values(body: string): Array<number | null> {
  expect(errors(body)).toEqual([]);
  const result = runCompatScript(source(body));
  expect(result.errors).toEqual([]);
  return getPlot(result, 'result').values;
}

function call(receiver: boolean, member: string, args = ''): string {
  return receiver ? `a.${member}(${args})` : `array.${member}(a${args ? `, ${args}` : ''})`;
}

describe('array.binary_search return contracts', () => {
  for (const receiver of [false, true]) {
    const syntax = receiver ? 'receiver' : 'namespace';
    for (const [qualifier, declaration] of [
      ['const int', 'const int target = 3'],
      ['input int', 'target = input.int(3)'],
      ['simple int', 'simple int target = 3'],
      ['series int', 'target = bar_index % 2 == 0 ? 3 : 5'],
      ['const float', 'const float target = 3.0'],
      ['input float', 'target = input.float(3.0)'],
      ['simple float', 'simple float target = 3.0'],
      ['series float', 'target = bar_index % 2 == 0 ? 3.0 : 5.0'],
    ]) {
      it(`accepts a ${qualifier} numeric target and returns series int (${syntax})`, () => {
        const result = checked(
          `a = array.from(1, 3, 5)\n${declaration}\nx = ${call(receiver, 'binary_search', 'target')}`,
        );
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        expect(result.symbols.find((symbol) => symbol.name === 'x')?.type).toEqual({
          kind: 'int',
          qualifier: 'series',
        });
        const expected = compatibilityBars.map((_, index) =>
          qualifier.startsWith('series') && index % 2 !== 0 ? 2 : 1,
        );
        expect(
          values(
            `a = array.from(1, 3, 5)\n${declaration}\nplot(${call(receiver, 'binary_search', 'target')}, "result")`,
          ),
        ).toEqual(expected);
      });
    }

    for (const [kind, target] of [
      ['int', '3'],
      ['float', '3.5'],
      ['string', '"bb"'],
    ]) {
      it(`returns series int from a selected ${kind} UDT field (${syntax})`, () => {
        const result = checked(
          `type Entry\n    ${kind} key\na = array.from(Entry.new(${target}))\nx = ${call(receiver, 'binary_search', `${target}, sort_field = "key"`)}`,
        );
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        expect(result.symbols.find((symbol) => symbol.name === 'x')?.type).toEqual({
          kind: 'int',
          qualifier: 'series',
        });
      });
    }
    it(`refuses assigning its series result to const (${syntax})`, () => {
      expect(errors(`a = array.from(1, 3, 5)\nconst int x = ${call(receiver, 'binary_search', '3')}`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
      );
    });
  }
  it('preserves a user method with the same name on a UDT receiver', () => {
    const body = `type Searchable\n    int seed\nmethod binary_search(Searchable self, int target) => "selected"\na = Searchable.new(1)\nx = a.binary_search(3)`;
    const result = checked(body);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'x')?.type).toMatchObject({ kind: 'string' });
    expect(values(`${body}\nplot(str.length(x), "result")`)).toEqual(compatibilityBars.map(() => 8));
  });
});
