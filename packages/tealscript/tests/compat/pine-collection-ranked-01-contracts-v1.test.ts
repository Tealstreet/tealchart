import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const reference = 'Archived Pine v6 array.get/size/push/from entries, collection ranking ranks 1–40';
const check = (source: string) =>
  checkProgram(parse(`//@version=6\nindicator("Ranked collection contracts")\n${source}`));
const kinds = [
  { kind: 'int', source: 'first = 17\nsecondValue = -8\ntail = 43' },
  { kind: 'float', source: 'first = 17.5\nsecondValue = -8.5\ntail = 43.5' },
  { kind: 'bool', source: 'first = false\nsecondValue = true\ntail = false' },
  { kind: 'string', source: 'first = "first"\nsecondValue = "secondValue"\ntail = "tail"' },
  { kind: 'color', source: 'first = color.red\nsecondValue = color.blue\ntail = color.green' },
  {
    kind: 'label',
    source: 'first = label.new(0, 17, "first")\nsecondValue = label.new(1, -8, "secondValue")\ntail = label.new(2, 43, "tail")',
  },
  {
    kind: 'line',
    source: 'first = line.new(0, 17, 1, -8)\nsecondValue = line.new(1, -8, 2, 43)\ntail = line.new(2, 43, 3, 5)',
  },
  {
    kind: 'box',
    source: 'first = box.new(0, 17, 1, -8)\nsecondValue = box.new(1, 43, 2, 5)\ntail = box.new(2, 71, 3, -31)',
  },
  {
    kind: 'table',
    source:
      'first = table.new(position.top_left, 1, 1)\nsecondValue = table.new(position.middle_left, 1, 1)\ntail = table.new(position.bottom_left, 1, 1)',
  },
  {
    kind: 'linefill',
    source:
      'left = line.new(0, 17, 1, -8)\nright = line.new(1, 43, 2, 5)\nthird = line.new(2, 71, 3, -31)\nfirst = linefill.new(left, right, color.red)\nsecondValue = linefill.new(right, third, color.blue)\ntail = linefill.new(third, left, color.green)',
  },
];

describe('collection usage batch 01 array element and binding contracts', () => {
  for (const { kind, source } of kinds) {
    for (const route of ['namespace', 'receiver'] as const) {
      const get = (index: string) =>
        route === 'namespace' ? `array.get(index=${index}, id=values)` : `values.get(index=${index})`;
      const size = route === 'namespace' ? 'array.size(id=values)' : 'values.size()';
      const push = route === 'namespace' ? 'array.push(value=tail, id=values)' : 'values.push(value=tail)';
      const setup = `${source}\nvalues = array.from(first, secondValue)\nreadFirst = ${get('0')}\nreadSecond = ${get('1')}`;
      registerCollectionReferenceCases([
        {
          name: `${kind} ${route} preserves from argument order and appends one compatible element`,
          reference,
          rejects:
            'scalar or wrong-type construction, wrong get position, prepend, replacement, dropped arguments, and incorrect size',
          source: `${setup}\n${push}\nreadTail = ${get('2')}`,
          expressions: [
            'array.indexof(values, first)',
            'array.indexof(values, secondValue)',
            'array.indexof(values, readFirst)',
            'array.indexof(values, readSecond)',
            size,
            'array.lastindexof(values, readTail)',
          ],
          expected: [0, 1, 0, 1, 3, 2],
        },
      ]);
      it(`${kind} ${route} preserves element type and makes push void`, () => {
        const valid = check(setup);
        expect(valid.diagnostics, reference).toEqual([]);
        expect(valid.symbols.find((symbol) => symbol.name === 'values')?.type, reference).toEqual({
          kind: 'array',
          qualifier: 'series',
          elementType: { kind },
        });
        expect(valid.symbols.find((symbol) => symbol.name === 'readSecond')?.type?.kind, reference).toBe(kind);
        const invalid = check(`${setup}\nobserved = ${push}`);
        expect(invalid.diagnostics, reference).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
        expect(invalid.diagnostics[0].message, reference).toMatch(/returns no value/i);
      });
    }
  }

  for (const route of ['namespace', 'receiver'] as const) {
    registerCollectionReferenceCases([
      {
        name: `${route} accepts integer qualifiers and floors integer-derived division get indices`,
        reference,
        rejects:
          'rejecting input/series indices, rounding integer-derived division indices, and binding named index to the wrong parameter',
        source:
          'values = array.from(17, -8)\nconst int constantIndex = 0\nsimple int simpleIndex = 1\ninputIndex = input.int(0)\nseries int seriesIndex = bar_index * 0 + 1',
        expressions: ['constantIndex', 'simpleIndex', 'inputIndex', 'seriesIndex', 'input.int(3)/4', 'input.int(7)/4'].map((index) =>
          route === 'namespace' ? `array.get(index=${index}, id=values)` : `values.get(index=${index})`,
        ),
        expected: [17, -8, 17, -8, 17, -8],
      },
    ]);
    // Captured ordinary float indices refuse; integer-derived division is distinct.
    it(`${route} refuses ordinary fractional get indices and missing parameters`, () => {
      const fractionalGet = route === 'namespace' ? 'array.get(values, 0.5)' : 'values.get(0.5)';
      expect(check(`values = array.from(17, -8)\nselected = ${fractionalGet}`).diagnostics).toEqual([
        expect.objectContaining({ code: 'type-mismatch' }),
      ]);
      const calls =
        route === 'namespace'
          ? ['array.get()', 'array.get(values)', 'array.push()', 'array.push(values)', 'array.size()']
          : ['values.get()', 'values.push()'];
      for (const call of calls) {
        expect(
          check(`values = array.from(17, -8)\n${call}`).diagnostics.some((d) => d.severity === 'error'),
          `${reference}; ${call}`,
        ).toBe(true);
      }
    });
  }

  it('namespace id arguments require an array object', () => {
    for (const call of ['array.get(17, 0)', 'array.size(17)', 'array.push(17, 43)']) {
      expect(
        check(call).diagnostics.some((d) => d.code === 'type-mismatch'),
        `${reference}; ${call}`,
      ).toBe(true);
    }
  });

  for (const kind of ['int', 'float'] as const) {
    registerCollectionReferenceCases([
      {
        name: `from accepts ${kind} values with all four scalar qualifiers in argument order`,
        reference,
        rejects:
          'discarding earlier or later arguments, narrowing fractional values, and refusing input or series arguments',
        source: `const ${kind} constantValue = ${kind === 'int' ? '17' : '17.5'}\nsimple ${kind} simpleValue = ${kind === 'int' ? '-8' : '-8.5'}\ninputValue = input.${kind}(${kind === 'int' ? '43' : '43.5'})\nseries ${kind} seriesValue = bar_index * 0 + ${kind === 'int' ? '71' : '71.5'}\nvalues = array.from(constantValue, simpleValue, inputValue, seriesValue)`,
        expressions: [
          'array.size(values)',
          'array.get(values, 0)',
          'array.get(values, 1)',
          'array.get(values, 2)',
          'array.get(values, 3)',
        ],
        expected: kind === 'int' ? [4, 17, -8, 43, 71] : [4, 17.5, -8.5, 43.5, 71.5],
      },
    ]);
  }
});
