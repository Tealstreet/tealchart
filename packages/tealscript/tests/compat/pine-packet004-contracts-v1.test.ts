import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Packet004 contracts")\n';
const forms = ['namespace', 'named', 'receiver'] as const;
function call(member: string, form: (typeof forms)[number], id: string, args: string[], names: string[]) {
  if (form === 'receiver') return `${id}.${member}(${args.join(', ')})`;
  if (form === 'namespace')
    return `${member.includes('percentile') ? 'array' : member === 'get' || member === 'keys' ? 'map' : 'matrix'}.${member}(${[id, ...args].join(', ')})`;
  return `${member.includes('percentile') ? 'array' : member === 'get' || member === 'keys' ? 'map' : 'matrix'}.${member}(${args
    .map((value, index) => `${names[index]}=${value}`)
    .reverse()
    .concat(`${member === 'diff' ? 'id1' : 'id'}=${id}`)
    .join(', ')})`;
}
function checked(body: string) {
  const source = header + body;
  const result = checkProgram(parse(source));
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return { source, symbols: result.symbols };
}
function values(body: string, expressions: string[], expected: number[][]) {
  const { source, symbols } = checked(
    body + '\n' + expressions.map((expression, i) => `plot(${expression}, title="p${i}")`).join('\n'),
  );
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expected.forEach((v, i) => expect(getPlot(result, `p${i}`).values).toEqual(v));
  return symbols;
}
const constant = (n: number) => compatibilityBars.map(() => n);
const declarations = {
  const: 'const int selected = 1',
  input: 'input int selected = input.int(1)',
  simple: 'simple int selected = syminfo.minmove',
  series: 'series int selected = bar_index % 2 + 1',
};

describe('packet004 map contracts', () => {
  for (const form of forms) {
    for (const [qualifier, declaration] of Object.entries(declarations)) {
      it(`map-get-key-assignability ${form} ${qualifier}`, () => {
        values(
          `m = map.new<int, int>()\nm.put(1, 17)\nm.put(2, -8)\n${declaration}\nselectedValue = ${call('get', form, 'm', ['selected'], ['key'])}`,
          ['selectedValue'],
          [compatibilityBars.map((_, i) => (qualifier === 'series' && i % 2 ? -8 : 17))],
        );
        for (const key of ['"wrong"', 'true']) {
          const result = checkProgram(
            parse(header + `m = map.new<int, int>()\n${call('get', form, 'm', [key], ['key'])}`),
          );
          expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([
            expect.objectContaining({ code: 'type-mismatch' }),
          ]);
        }
      });
    }
    it(`map-get-generic-value-result enum UDT ${form}`, () => {
      const body = `enum Key\n    left\n    right\ntype Item\n    float score\nleft = Item.new(17)\nright = Item.new(-8)\nmap<Key, Item> m = map.new<Key, Item>()\nm.put(Key.right, right)\nm.put(Key.left, left)\nkey = bar_index % 2 == 0 ? Key.left : Key.right\nselectedValue = ${call('get', form, 'm', ['key'], ['key'])}`;
      const symbols = values(
        body,
        ['selectedValue.score', 'selectedValue == (bar_index % 2 == 0 ? left : right) ? 1 : 0'],
        [compatibilityBars.map((_, i) => (i % 2 ? -8 : 17)), constant(1)],
      );
      expect(symbols.find((s) => s.name === 'selectedValue')?.type).toMatchObject({ kind: 'udt', name: 'Item' });
    });
    it(`map-get-generic-value-result color line ${form}`, () => {
      const body = `first = line.new(0, 17, 1, 29)\nsecond = line.new(0, -8, 1, -31)\nmap<color, line> m = map.new<color, line>()\nm.put(color.red, first)\nm.put(color.blue, second)\nkey = bar_index % 2 == 0 ? color.blue : color.red\nselectedValue = ${call('get', form, 'm', ['key'], ['key'])}\nselectedValue.set_y1(43)`;
      const symbols = values(
        body,
        [
          'selectedValue == (bar_index % 2 == 0 ? second : first) ? 1 : 0',
          'bar_index % 2 == 0 ? second.get_y1() : first.get_y1()',
          'bar_index % 2 == 0 ? first.get_y1() : second.get_y1()',
        ],
        [constant(1), constant(43), compatibilityBars.map((_, i) => (i % 2 ? -8 : 17))],
      );
      expect(symbols.find((s) => s.name === 'selectedValue')?.type).toMatchObject({ kind: 'line' });
    });
    for (const kind of ['enum', 'color']) {
      it(`map-keys-extra-key-families ${kind} ${form}`, () => {
        const preamble =
          kind === 'enum'
            ? 'enum Key\n    first\n    second\n    third\ntype Item\n    float score\n'
            : 'type Item\n    float score\n';
        const keys =
          kind === 'enum' ? ['Key.third', 'Key.first', 'Key.second'] : ['color.blue', 'color.red', 'color.green'];
        const type = kind === 'enum' ? 'Key' : 'color';
        const body = `${preamble}m = map.new<${type}, Item>()\nm.put(${keys[0]}, Item.new(17))\nm.put(${keys[1]}, Item.new(-8))\nm.put(${keys[2]}, Item.new(43))\narray<${type}> extracted = ${call('keys', form, 'm', [], [])}\nextracted.set(0, ${keys[1]})\nextracted.remove(1)\narray<${type}> fresh = m.keys()\nretained = m.get(${keys[0]})`;
        const symbols = values(
          body,
          [
            'fresh.get(0) == ' + keys[0] + ' ? 1 : 0',
            'fresh.get(1) == ' + keys[1] + ' ? 1 : 0',
            'fresh.get(2) == ' + keys[2] + ' ? 1 : 0',
            'fresh.size()',
            'extracted.size()',
            'retained.score',
          ],
          [constant(1), constant(1), constant(1), constant(3), constant(2), constant(17)],
        );
        expect(symbols.find((s) => s.name === 'fresh')?.type).toMatchObject({
          kind: 'array',
          elementType: kind === 'enum' ? { kind: 'udt', name: 'Key' } : { kind: 'color' },
        });
      });
    }
  }
});

const matrix = `m = matrix.new<int>(3, 4, 0)\nfor r = 0 to 2\n    for c = 0 to 3\n        m.set(r, c, r * 10 + c)`;
describe('packet004 matrix submatrix contracts', () => {
  for (const form of forms) {
    it(`submatrix-reference-elements ${form}`, () => {
      const body = `type Item\n    float score\nm = matrix.new<Item>(3, 4)\nfor r = 0 to 2\n    for c = 0 to 3\n        m.set(r, c, Item.new(r * 10 + c))\nsub = ${call('submatrix', form, 'm', ['1', '3', '1', '4'], ['from_row', 'to_row', 'from_column', 'to_column'])}\nshared = sub.get(0, 0)\nshared.score := 901\nsub.set(0, 1, Item.new(777))\nm.set(2, 3, Item.new(888))\nparentShared = m.get(1, 1)\nparentIndependent = m.get(1, 2)\nsubIndependent = sub.get(1, 2)`;
      const symbols = values(
        body,
        [
          'sub.rows()',
          'sub.columns()',
          'parentShared.score',
          'parentShared == shared ? 1 : 0',
          'parentIndependent.score',
          'subIndependent.score',
        ],
        [constant(2), constant(3), constant(901), constant(1), constant(12), constant(23)],
      );
      expect(symbols.find((s) => s.name === 'sub')?.type).toMatchObject({
        kind: 'matrix',
        elementType: { kind: 'udt', name: 'Item' },
      });
    });
  }
  for (const form of ['namespace', 'receiver'] as const) {
    for (const omitted of ['from_row', 'to_row', 'from_column', 'to_column']) {
      it(`submatrix-independent-defaults ${form} ${omitted}`, () => {
        const args = { from_row: '1', to_row: '2', from_column: '1', to_column: '3' };
        const entries = Object.entries(args)
          .filter(([name]) => name !== omitted)
          .reverse()
          .map(([name, value]) => `${name}=${value}`);
        const expression =
          form === 'namespace' ? `matrix.submatrix(${entries.join(', ')}, id=m)` : `m.submatrix(${entries.join(', ')})`;
        const startRow = omitted === 'from_row' ? 0 : 1;
        const endRow = omitted === 'to_row' ? 3 : 2;
        const startCol = omitted === 'from_column' ? 0 : 1;
        const endCol = omitted === 'to_column' ? 4 : 3;
        values(
          `${matrix}\nsub = ${expression}`,
          ['sub.rows()', 'sub.columns()', 'sub.get(0, 0)', 'sub.get(sub.rows() - 1, sub.columns() - 1)'],
          [
            constant(endRow - startRow),
            constant(endCol - startCol),
            constant(startRow * 10 + startCol),
            constant((endRow - 1) * 10 + endCol - 1),
          ],
        );
      });
    }
  }
});

describe('packet004 transpose reference elements', () => {
  for (const form of forms) {
    for (const kind of ['bool', 'string', 'color', 'Item']) {
      it(`transpose-reference-elements ${kind} ${form}`, () => {
        const original =
          kind === 'bool'
            ? ['true', 'false', 'false', 'true', 'true', 'false']
            : kind === 'string'
              ? ['"z"', '"a"', '"m"', '"q"', '"b"', '"x"']
              : kind === 'color'
                ? ['color.blue', 'color.red', 'color.green', 'color.orange', 'color.gray', 'color.white']
                : ['Item.new(17)', 'Item.new(-8)', 'Item.new(43)', 'Item.new(29)', 'Item.new(-31)', 'Item.new(71)'];
        const get = (r: number, c: number) => `result.get(${r}, ${c})`;
        const body = `${kind === 'Item' ? 'type Item\n    float score\n' : ''}m = matrix.new<${kind}>(2, 3)\n${original.map((value, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${value})`).join('\n')}\nresult = ${call('transpose', form, 'm', [], [])}\n${kind === 'Item' ? 'shared = result.get(1, 0)\nshared.score := 901\nparentShared = m.get(0, 1)\n' : ''}result.set(0, 1, ${original[0]})`;
        const expressions = [
          'result.rows()',
          'result.columns()',
          ...original.map((value, i) => {
            const r = i % 3,
              c = Math.floor(i / 3);
            if (r === 0 && c === 1) value = original[0];
            if (kind === 'Item') return `${get(r, c)} == m.get(${Math.floor(i / 3)}, ${i % 3}) ? 1 : 0`;
            return `${get(r, c)} == ${value} ? 1 : 0`;
          }),
        ];
        const expected = [
          constant(3),
          constant(2),
          ...original.map((_, i) => constant(kind === 'Item' && i === 3 ? 0 : 1)),
        ];
        if (kind === 'Item') {
          expressions.push('parentShared.score', 'shared == parentShared ? 1 : 0');
          expected.push(constant(901), constant(1));
        } else {
          expressions.push(`m.get(1, 0) == ${original[3]} ? 1 : 0`);
          expected.push(constant(1));
        }
        const symbols = values(body, expressions, expected);
        expect(symbols.find((s) => s.name === 'result')?.type).toMatchObject({
          kind: 'matrix',
          elementType: kind === 'Item' ? { kind: 'udt', name: 'Item' } : { kind },
        });
      });
    }
  }
});

describe('packet004 numeric parameter contracts', () => {
  for (const form of forms) {
    for (const arrayKind of ['int', 'float']) {
      it(`nearest-percentage-kind ${arrayKind} ${form}`, () => {
        const body = `a = array.new<${arrayKind}>()\na.push(0)\na.push(10)\na.push(20)\na.push(30)\npercentage = bar_index % 2 == 0 ? 50.0 : 75.0\nvalue = ${call('percentile_nearest_rank', form, 'a', ['percentage'], ['percentage'])}`;
        values(body, ['value'], [compatibilityBars.map((_, i) => (i % 2 ? 20 : 10))]);
        for (const percentage of ['true', '"50"']) {
          const result = checkProgram(
            parse(
              header +
                `a = array.new<${arrayKind}>()\na.push(0)\na.push(10)\na.push(20)\na.push(30)\n${call('percentile_nearest_rank', form, 'a', [percentage], ['percentage'])}`,
            ),
          );
          expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([
            expect.objectContaining({ code: 'type-mismatch' }),
          ]);
        }
      });
    }
    for (const [qualifier, declaration] of Object.entries(declarations)) {
      for (const scalarKind of ['int', 'float']) {
        for (const kind of ['int', 'float']) {
          it(`matrix-diff-operand-qualifiers ${kind} ${form} ${qualifier} ${scalarKind} scalar`, () => {
            const body = `m = matrix.new<${kind}>(2, 2, 17)\nm.set(0, 1, -8)\nm.set(1, 0, 43)\nm.set(1, 1, 29)\n${scalarKind === 'float' ? declaration.replace(' int ', ' float ').replace('input.int(1)', 'input.float(1.0)') : declaration}\nresult = ${call('diff', form, 'm', ['selected'], ['id2'])}`;
            const expected = [17, -8, 43, 29].map((value) =>
              compatibilityBars.map((_, i) => value - (qualifier === 'series' ? (i % 2) + 1 : 1)),
            );
            const symbols = values(
              body,
              ['result.get(0, 0)', 'result.get(0, 1)', 'result.get(1, 0)', 'result.get(1, 1)', 'm.get(0, 0)'],
              [...expected, constant(17)],
            );
            expect(symbols.find((s) => s.name === 'result')?.type).toMatchObject(
              kind === 'int' && scalarKind === 'float' ? { kind: 'matrix' } : { kind: 'matrix', elementType: { kind } },
            );
          });
        }
      }
    }
    it(`matrix-diff-operand-qualifiers mixed matrix ${form}`, () => {
      values(
        `left = matrix.new<int>(1, 2, 17)\nleft.set(0, 1, -8)\nright = matrix.new<float>(1, 2, 2.5)\nright.set(0, 1, 3.5)\nresult = ${call('diff', form, 'left', ['right'], ['id2'])}`,
        ['result.get(0, 0)', 'result.get(0, 1)'],
        [constant(14.5), constant(-11.5)],
      );
    });
  }
});
