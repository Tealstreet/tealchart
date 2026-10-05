import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars = [0, 1, 2].map((index) => ({
  time: (index + 1) * 60_000,
  open: 10,
  high: 12,
  low: 8,
  close: 11,
  volume: 100,
}));
const program = (body: string) => parse(`//@version=6\nindicator("Packet005 contracts")\n${body}\n`);
const errors = (body: string) => checkProgram(program(body)).diagnostics.filter((entry) => entry.severity === 'error');

function values(body: string, expected: number[], type?: object) {
  const ast = program(body);
  const checked = checkProgram(ast);
  expect(
    checked.diagnostics.filter((entry) => entry.severity === 'error'),
    JSON.stringify(checked.diagnostics),
  ).toEqual([]);
  if (type) expect(checked.symbols.find((entry) => entry.name === 'result')?.type).toMatchObject(type);
  const output = executeScript(ast, bars);
  expect(output.errors).toEqual([]);
  expect(output.profile.swallowedErrors ?? []).toEqual([]);
  expect(output.plots.find((entry) => entry.title === 'Outcome')?.values).toEqual(expected);
}

// Exact packet005 v13 clauses; expectations follow reference types and finite
// hand-computed values. Native-held integer rounding and equal-key order excluded.
describe('collection packet005 contract facets', () => {
  for (const qualifier of ['input', 'simple', 'series']) {
    const operand = qualifier === 'input' ? 'input.float(3)' : qualifier === 'series' ? 'bar_index + 3.0' : '3.0';
    for (const call of ['matrix.diff(id2=x, id1=m)', 'm.diff(id2=x)']) {
      it(`461/464 ${qualifier} float diff operand: ${call} — https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.diff`, () =>
        values(
          `${qualifier} float x = ${operand}\nm = matrix.new<int>(1, 1, 20)\nresult = ${call}\nplot(result.get(0, 0), "Outcome")`,
          qualifier === 'series' ? [17, 16, 15] : [17, 17, 17],
          { kind: 'matrix', elementType: { kind: 'int' } },
        ));
    }
    const power = qualifier === 'input' ? 'input.int(2)' : qualifier === 'series' ? 'bar_index % 2 + 1' : '2';
    for (const call of ['matrix.pow(power=x, id=m)', 'm.pow(power=x)']) {
      it(`469-479 ${qualifier} integer power: ${call}`, () =>
        values(
          `${qualifier} int x = ${power}\nm = matrix.new<int>(1, 1, 2)\nresult = ${call}\nplot(result.get(0, 0), "Outcome")`,
          qualifier === 'series' ? [2, 4, 2] : [4, 4, 4],
          { kind: 'matrix', elementType: { kind: 'int' } },
        ));
    }
  }
  for (const call of ['matrix.pow(power=x, id=m)', 'm.pow(power=x)']) {
    it(`473/479 float matrix and series integer power: ${call}`, () =>
      values(
        `series int x = bar_index % 2 + 1\nm = matrix.new<float>(1, 1, 1.5)\nresult = ${call}\nplot(result.get(0, 0), "Outcome")`,
        [1.5, 2.25, 1.5],
        { kind: 'matrix', elementType: { kind: 'float' } },
      ));
  }
  for (const call of ['matrix.pow(m)', 'm.pow()', 'matrix.pow(m, "bad")', 'm.pow(true)']) {
    it(`469-479 refuses missing or incompatible power: ${call}`, () =>
      expect(errors(`m = matrix.new<int>(1, 1, 2)\nresult = ${call}`)).not.toEqual([]));
  }
  it('480 omitted label constructor size/seed and shared label identity', () =>
    values(
      'empty = array.new_label()\nmissing = array.new_label(1)\nid = label.new(0, 11)\nresult = array.new_label(1, id)\nresult.get(0).set_y(19)\nplot(empty.size() == 0 and na(missing.get(0)) and label.get_y(id) == 19 ? 1 : 0, "Outcome")',
      [1, 1, 1],
      { kind: 'array', elementType: { kind: 'label' } },
    ));
  for (const key of ['color.red', 'Key.first']) {
    for (const put of ['m.put(value=node, key=key)', 'map.put(value=node, id=m, key=key)']) {
      it(`503-511 map key/value template and shared UDT: ${key}`, () =>
        values(
          `enum Key\n    first\ntype Node\n    int value\nseries ${key === 'color.red' ? 'color' : 'Key'} key = ${key}\nnode = Node.new(7)\nm = map.new<${key === 'color.red' ? 'color' : 'Key'}, Node>()\n${put}\nresult = m.get(key)\nresult.value := 9\nplot(m.get(key).value, "Outcome")`,
          [9, 9, 9],
          { kind: 'udt', name: 'Node' },
        ));
    }
  }
  for (const call of ['map.put(m, "bad", node)', 'm.put(1, 7)', 'map.put(7, 1, node)']) {
    it(`503-511 map template refuses incompatible arguments: ${call}`, () =>
      expect(errors(`type Node\n    int value\nnode = Node.new(7)\nm = map.new<int, Node>()\n${call}`)).not.toEqual(
        [],
      ));
  }
  for (const source of ['array.from(9.0, 2.0, 5.0)', 'array.from("z", "a", "m")']) {
    it(`544/547 numeric/string sort_indices ID: ${source}`, () =>
      values(
        `a = ${source}\nresult = array.sort_indices(a)\nplot(result.get(0) == 1 and result.get(1) == 2 and result.get(2) == 0 ? 1 : 0, "Outcome")`,
        [1, 1, 1],
      ));
  }
  it('689 series order selects ascending and descending UDT sort', () =>
    values(
      'type Node\n    int value\na = array.from(Node.new(9), Node.new(2))\narray.sort(a, bar_index % 2 == 0 ? order.ascending : order.descending)\nplot(a.get(0).value, "Outcome")',
      [2, 9, 2],
    ));
  for (const helper of ['abs', 'sort_indices']) {
    for (const source of ['true', 'matrix.new<float>(1, 1, 1)', 'array.new_bool(1)', 'array.new_line(1)']) {
      it(`544/547/581/584 ${helper} refuses incompatible ID ${source}`, () =>
        expect(errors(`a = ${source}\nresult = array.${helper}(a)`)).not.toEqual([]));
    }
    it(`544/547/581/584 ${helper} requires ID`, () => expect(errors(`result = array.${helper}()`)).not.toEqual([]));
  }
  it('581/584 abs refuses string/UDT elements with finite float control', () => {
    expect(errors('a = array.new_string(1)\nresult = a.abs()')).not.toEqual([]);
    expect(errors('type Node\n    int value\na = array.new<Node>(1)\nresult = a.abs()')).not.toEqual([]);
    values('a = array.from(-3.0, 7.0)\nresult = a.abs()\nplot(result.get(0) + result.get(1), "Outcome")', [10, 10, 10]);
  });
  it('544/547 sort_indices returns usable indices without altering original slots', () =>
    values(
      'a = array.from(9, 2, 5)\nresult = array.sort_indices(id=a)\nplot(result.get(0) == 1 and result.get(1) == 2 and result.get(2) == 0 and a.get(0) == 9 ? 1 : 0, "Outcome")',
      [1, 1, 1],
      { kind: 'array', elementType: { kind: 'int' } },
    ));
  for (const call of ['array.join(id=a, separator="|")', 'a.join(separator="|")']) {
    it(`599 refuses reserved text identifier: ${call}`, () => {
      expect(errors(`a = array.from(1.25, -2.5)\ntext = ${call}`)).toEqual([
        expect.objectContaining({ code: 'reserved-identifier', severity: 'error' }),
      ]);
    });
    it(`599 numeric text/order/separator with legal binding: ${call}`, () =>
      values(`a = array.from(1.25, -2.5)\njoined = ${call}\nplot(joined == "1.25|-2.5" ? 1 : 0, "Outcome")`, [1, 1, 1]));
  }
  for (const qualifier of ['input', 'simple', 'series']) {
    const separator =
      qualifier === 'input' ? 'input.string("|")' : qualifier === 'series' ? 'bar_index % 2 == 0 ? "|" : ":"' : '"|"';
    it(`602/603/606 ${qualifier} separator and series string result`, () =>
      values(
        `${qualifier} string separator = ${separator}\na = array.from(10, -3)\nresult = a.join(separator=separator)\nplot(result == (bar_index % 2 == 0 or ${qualifier !== 'series'} ? "10|-3" : "10:-3") ? 1 : 0, "Outcome")`,
        [1, 1, 1],
        { kind: 'string', qualifier: 'series' },
      ));
  }
  for (const call of ['array.join()', 'array.join(7)', 'a.join(separator=true)', 'array.join(a, 7)']) {
    it(`602/603/606 join ID/separator refusal: ${call}`, () =>
      expect(errors(`a = array.from(1, 2)\nresult = ${call}`)).not.toEqual([]));
  }
  it('selected custom join method preserves numeric parameter admission', () =>
    values(
      'method join(array<int> a, int separator) => separator\na = array.from(1, 2)\nplot(a.join(separator=17), "Outcome")',
      [17, 17, 17],
    ));
  it('547 UDT sort_indices explicit string field', () =>
    values(
      'type Node\n    string key\na = array.from(Node.new("z"), Node.new("a"))\nresult = array.sort_indices(id=a, sort_field="key")\nplot(result.get(0) == 1 and result.get(1) == 0 ? 1 : 0, "Outcome")',
      [1, 1, 1],
      { kind: 'array', elementType: { kind: 'int' } },
    ));
  for (const call of ['matrix.col(column=0, id=m)', 'm.col(column=0)']) {
    it(`607-612 column detached slots/shallow UDT references: ${call}`, () =>
      values(
        `type Node\n    int value\nnode = Node.new(7)\nm = matrix.new<Node>(1, 1, node)\nresult = ${call}\nshared = result.get(0)\nshared.value := 9\nresult.set(0, Node.new(21))\nplot(m.get(0, 0).value == 9 and result.get(0).value == 21 ? 1 : 0, "Outcome")`,
        [1, 1, 1],
        { kind: 'array', elementType: { kind: 'udt', name: 'Node' } },
      ));
  }
  for (const call of ['matrix.col(m)', 'm.col()', 'matrix.col(m, "bad")', 'm.col(true)']) {
    it(`610/613 column index refusal: ${call}`, () =>
      expect(errors(`m = matrix.new<float>(1, 1, 2)\nresult = ${call}`)).not.toEqual([]));
  }
  for (const [member, bad, good] of [
    ['new_string', 'true', '"ok"'],
    ['new_bool', '"bad"', 'true'],
  ]) {
    it(`620/627 ${member} requires compatible seed`, () => {
      expect(errors(`result = array.${member}(1, ${bad})`)).not.toEqual([]);
      expect(errors(`result = array.${member}(1, ${good})`)).toEqual([]);
    });
  }
  for (const call of [
    'array.stdev(a)',
    'a.stdev()',
    'array.percentile_linear_interpolation(a, 50)',
    'a.percentile_linear_interpolation(50)',
  ]) {
    it(`630/642/665 float result is series: ${call}`, () => {
      const source = `a = array.from(2.0, 4.0)\nresult = ${call}`;
      const checked = checkProgram(program(source));
      expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
      expect(checked.symbols.find((entry) => entry.name === 'result')?.type).toMatchObject({
        kind: 'float',
        qualifier: 'series',
      });
      expect(errors(`a = array.from(2.0, 4.0)\nconst float result = ${call}`)).not.toEqual([]);
      expect(errors(`f(simple float x) => x\na = array.from(2.0, 4.0)\nresult = f(${call})`)).not.toEqual([]);
      values(`${source}\nplot(result, "Outcome")`, call.includes('stdev') ? [1, 1, 1] : [3, 3, 3]);
    });
  }
  for (const call of ['array.sort(a)', 'a.sort()']) {
    it(`684/687/689/692 UDT sort returns void: ${call}`, () => {
      const source = 'type Node\n    int value\na = array.from(Node.new(9), Node.new(2))';
      expect(errors(`${source}\nresult = ${call}`)).not.toEqual([]);
      values(`${source}\n${call}\nplot(a.get(0).value == 2 and a.get(1).value == 9 ? 1 : 0, "Outcome")`, [1, 1, 1]);
    });
  }
  for (const kind of ['bool', 'color', 'line']) {
    for (const call of ['array.sort(a)', 'a.sort()']) {
      it(`685/688 sort refuses ${kind} elements: ${call}`, () =>
        expect(errors(`a = array.new<${kind}>(1)\n${call}`)).not.toEqual([]));
    }
  }
  for (const name of ['sort', 'sort_indices']) {
    it(`selected custom ${name} method preserves bool-array admission`, () =>
      values(
        `method ${name}(array<bool> a) => 17\na = array.new_bool(1, true)\nplot(a.${name}(), "Outcome")`,
        [17, 17, 17],
      ));
  }
  for (const name of ['stdev', 'percentile_linear_interpolation']) {
    it(`selected custom ${name} method preserves simple result admission`, () =>
      values(
        `method ${name}(array<float> a) => 9.0\nf(simple float x) => x\na = array.from(2.0, 4.0)\nplot(f(a.${name}()), "Outcome")`,
        [9, 9, 9],
      ));
  }
  it('custom factory receiver preserves constructor seed binding', () =>
    values(
      'type Factory\n    int value\nmethod new_bool(Factory factory, int size, string initial_value) => factory.value\nfactory = Factory.new(17)\nplot(factory.new_bool(1, "custom"), "Outcome")',
      [17, 17, 17],
    ));
});
