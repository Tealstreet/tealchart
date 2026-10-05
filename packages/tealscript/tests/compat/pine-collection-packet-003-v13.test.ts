import type { SemanticType } from '../../src/semantic/checker';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Collection reference contracts")\n';
const node = 'type Node\n    int value\n';
const families = [
  {
    type: 'Node',
    prelude: node,
    first: 'Node.new(17)',
    second: 'Node.new(-8)',
    third: 'Node.new(43)',
    read: (id: string) => `${id}.value`,
    update: (id: string) => `${id}.value := 91`,
  },
  {
    type: 'label',
    prelude: '',
    first: 'label.new(0, 17)',
    second: 'label.new(0, -8)',
    third: 'label.new(0, 43)',
    read: (id: string) => `label.get_y(${id})`,
    update: (id: string) => `label.set_y(${id}, 91)`,
  },
];

function check(source: string) {
  return checkProgram(parse(header + source));
}

function run(source: string, expected: Record<string, number[]>) {
  expect(check(source).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  const result = runCompatScript(header + source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors).toEqual([]);
  for (const [title, values] of Object.entries(expected)) {
    expect(result.plots.find((plot) => plot.title === title)?.values).toEqual(values);
  }
}

function typeOf(source: string, name: string, expected: Partial<SemanticType>) {
  const result = check(source);
  expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
  expect(result.symbols.find((symbol) => symbol.name === name)?.type).toMatchObject(expected);
}

const constant = (value: number) => [value, value, value];
const elementType = (type: string): SemanticType =>
  type === 'Node' ? { kind: 'udt', name: 'Node' } : { kind: 'label' };

describe('packet 003 bounded reference collection contracts', () => {
  for (const family of families) {
    const setup = `${family.prelude}a = ${family.first}\nb = ${family.second}\nc = ${family.third}\n`;
    for (const call of ['matrix.copy(m)', 'matrix.copy(id=m)', 'm.copy()']) {
      it(`copy keeps shallow ${family.type} identities and detaches slots/dimensions: ${call}`, () => {
        const source = `${setup}m = matrix.new<${family.type}>(2, 3, a)
m.set(1, 2, b)
copy = ${call}
alias = copy.get(0, 0)
${family.update('alias')}
copy.set(0, 1, c)
m.set(1, 2, c)
copy.reshape(3, 2)
originalSlot = m.get(0, 1)
copiedSlot = copy.get(0, 1)
oldTail = copy.get(2, 1)
plot(${family.read('originalSlot')}, title="shared")
plot(${family.read('copiedSlot')}, title="replaced")
plot(${family.read('oldTail')}, title="old tail")
plot(m.rows() * 10 + m.columns(), title="original shape")
plot(copy.rows() * 10 + copy.columns(), title="copy shape")`;
        run(source, {
          shared: constant(91),
          replaced: constant(43),
          'old tail': constant(-8),
          'original shape': constant(23),
          'copy shape': constant(32),
        });
        typeOf(source, 'copy', { kind: 'matrix', elementType: elementType(family.type) });
      });
    }
    for (const call of ['matrix.row(m, 1)', 'matrix.row(row=1, id=m)', 'm.row(row=1)']) {
      it(`row keeps shallow ${family.type} identities and detaches array slots: ${call}`, () => {
        const source = `${setup}m = matrix.new<${family.type}>(2, 3, c)
m.set(1, 0, a)
m.set(1, 1, b)
row = ${call}
alias = row.get(0)
${family.update('alias')}
row.set(1, c)
m.set(1, 2, b)
original = m.get(1, 0)
unchangedSlot = m.get(1, 1)
detachedTail = row.get(2)
plot(${family.read('original')}, title="shared")
plot(${family.read('unchangedSlot')}, title="matrix slot")
plot(${family.read('detachedTail')}, title="row slot")
plot(row.size(), title="row size")`;
        run(source, {
          shared: constant(91),
          'matrix slot': constant(-8),
          'row slot': constant(43),
          'row size': constant(3),
        });
        typeOf(source, 'row', { kind: 'array', elementType: elementType(family.type) });
      });
    }
    for (const operation of ['pop', 'first']) {
      for (const call of [`array.${operation}(items)`, `array.${operation}(id=items)`, `items.${operation}()`]) {
        it(`${operation} retains ${family.type} identity/template and remaining order: ${call}`, () => {
          const source = `${setup}items = array.new<${family.type}>()
items.push(a)
items.push(b)
items.push(c)
value = ${call}
${family.update('value')}
head = items.get(0)
middle = items.get(1)
plot(${family.read('head')}, title="head")
plot(${family.read('middle')}, title="middle")
plot(${family.read(operation === 'pop' ? 'c' : 'a')}, title="identity")
plot(items.size(), title="size")`;
          run(source, {
            head: constant(operation === 'pop' ? 17 : 91),
            middle: constant(-8),
            identity: constant(91),
            size: constant(operation === 'pop' ? 2 : 3),
          });
          typeOf(source, 'value', { ...elementType(family.type), qualifier: 'series' });
        });
      }
    }
    for (const call of [
      'array.indexof(items, target)',
      'array.indexof(value=target, id=items)',
      'items.indexof(value=target)',
    ]) {
      it(`indexof distinguishes ${family.type} handles with identical contents: ${call}`, () => {
        const source = `${family.prelude}a = ${family.first}\nb = ${family.first}\nabsent = ${family.first}
items = array.new<${family.type}>()
items.push(a)
items.push(b)
items.push(a)
target = a
found = ${call}
target := b
second = ${call}
target := absent
missing = ${call}
head = items.get(0)
tail = items.get(2)
${family.update('head')}
plot(found, title="first match")
plot(second, title="distinct")
plot(missing, title="absent")
plot(items.size(), title="size")
plot(${family.read('tail')}, title="unchanged identity")`;
        run(source, {
          'first match': constant(0),
          distinct: constant(1),
          absent: constant(-1),
          size: constant(3),
          'unchanged identity': constant(91),
        });
      });
    }
    for (const call of [
      'array.slice(items, 1, 3)',
      'array.slice(index_to=3, id=items, index_from=1)',
      'items.slice(index_to=3, index_from=1)',
    ]) {
      it(`slice shares ${family.type} slots/handles with offset insertion and removal: ${call}`, () => {
        const source = `${setup}items = array.new<${family.type}>()
items.push(c)
items.push(a)
items.push(b)
items.push(c)
view = ${call}
alias = view.get(0)
${family.update('alias')}
view.set(1, c)
items.set(1, b)
fromParent = view.get(0)
fromView = items.get(2)
view.insert(1, a)
inserted = items.get(2)
removed = view.remove(0)
head = items.get(1)
tail = items.get(3)
plot(${family.read('fromParent')}, title="parent write")
plot(${family.read('fromView')}, title="view write")
plot(${family.read('inserted')}, title="inserted")
plot(${family.read('removed')}, title="removed")
plot(${family.read('head')}, title="remaining head")
plot(${family.read('tail')}, title="outside tail")
plot(view.size() * 10 + items.size(), title="sizes")`;
        run(source, {
          'parent write': constant(-8),
          'view write': constant(43),
          inserted: constant(91),
          removed: constant(-8),
          'remaining head': constant(91),
          'outside tail': constant(43),
          sizes: constant(24),
        });
        typeOf(source, 'view', { kind: 'array', elementType: elementType(family.type) });
      });
    }
  }

  for (const [qualifier, declaration, expected] of [
    ['input', 'input int selected = input.int(1)', constant(-8)],
    ['simple', 'simple int selected = 1', constant(-8)],
    ['series', 'series int selected = bar_index % 2', [17, -8, 17]],
  ] as const) {
    for (const call of ['matrix.row(row=selected, id=m)', 'm.row(row=selected)']) {
      it(`row accepts ${qualifier} integer selection and exact named binding: ${call}`, () => {
        run(
          `${node}m = matrix.new<Node>(2, 1, Node.new(17))
m.set(1, 0, Node.new(-8))
${declaration}
row = ${call}
value = row.get(0)
plot(value.value, title="selected")`,
          { selected: [...expected] },
        );
      });
    }
  }
  for (const operation of ['rows', 'columns']) {
    for (const call of [`matrix.${operation}(m)`, `matrix.${operation}(id=m)`, `m.${operation}()`]) {
      it(`${operation} accepts a generic UDT matrix and returns a series integer: ${call}`, () => {
        const source = `${node}m = matrix.new<Node>(2, 3, Node.new(7))\nvalue = ${call}\nplot(value, title="count")`;
        run(source, { count: constant(operation === 'rows' ? 2 : 3) });
        typeOf(source, 'value', { kind: 'int', qualifier: 'series' });
      });
    }
    for (const argument of ['', 'id=3', 'id=array.new_int()', 'id=map.new<string, int>()']) {
      it(`${operation} refuses missing/scalar/foreign-container ID: ${argument || 'missing'}`, () => {
        expect(
          check(`value = matrix.${operation}(${argument})`).diagnostics.some((entry) => entry.severity === 'error'),
        ).toBe(true);
      });
    }
  }
  for (const [keyType, prelude, key, other] of [
    ['Choice', 'enum Choice\n    first\n    second\n', 'Choice.first', 'Choice.second'],
    ['color', '', 'color.red', 'color.blue'],
  ]) {
    for (const family of families.filter((entry) => entry.type === 'label')) {
      for (const call of [`map.get(m, ${key})`, `map.get(key=${key}, id=m)`, `m.get(key=${key})`]) {
        it(`get retains ${keyType} key binding and stored ${family.type} identity/template: ${call}`, () => {
          const source = `${prelude}${family.prelude}a = ${family.first}\nb = ${family.second}
m = map.new<${keyType}, ${family.type}>()
m.put(${key}, a)
m.put(${other}, b)
value = ${call}
${family.update('value')}
otherValue = m.get(${other})
plot(${family.read('a')}, title="identity")
plot(${family.read('otherValue')}, title="other key")
plot(m.size(), title="size")`;
          run(source, { identity: constant(91), 'other key': constant(-8), size: constant(2) });
          typeOf(source, 'value', elementType(family.type));
        });
      }
    }
  }
});
