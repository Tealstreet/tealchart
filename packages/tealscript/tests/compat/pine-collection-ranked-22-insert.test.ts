import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ranked clauses 841–850: v6 reference array.insert and the arrays manual.
// Omitted index is excluded: requiredness is absent in the normalized record.
const source = (body: string) => `//@version=6\nindicator("insert contracts")\n${body}`;
const errors = (body: string) =>
  checkProgram(parse(source(body))).diagnostics.filter((item) => item.severity === 'error');
const call = (route: string, index: string, value: string) =>
  route === 'namespace'
    ? `array.insert(id=values, index=${index}, value=${value})`
    : `values.insert(index=${index}, value=${value})`;

describe.each(['namespace', 'receiver'])('ranked array.insert %s contracts', (route) => {
  it.each([
    [0, '9,1,2,3'],
    [1, '1,9,2,3'],
    [3, '1,2,3,9'],
    [-1, '1,2,9,3'],
    [-3, '9,1,2,3'],
  ])('inserts at index %i in the original aliased array', (index, joined) => {
    const body = `values = array.from(1,2,3)\nalias = values\n${call(route, String(index), '9')}\nplot(alias.join(",") == "${joined}" ? 1 : 0, title="result")\nplot(alias.size(), title="size")`;
    expect(errors(body)).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 1));
    expect(getPlot(result, 'size').values).toEqual(compatibilityBars.map(() => 4));
  });

  it.each([
    ['const', 'const int index = 1'],
    ['input', 'index = input.int(1)'],
    ['simple', 'simple int index = 1'],
    ['series', 'series int index = bar_index % 2'],
  ])('accepts the %s integer index and observes its value', (_name, declaration) => {
    const body = `values = array.from(1,2)\n${declaration}\n${call(route, 'index', '7')}\nplot(values.get(index), title="result")`;
    expect(errors(body)).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 7));
  });

  it.each([
    ['int', 'array.new<int>()', 'bar_index', 'values.get(0) == bar_index'],
    ['float', 'array.new<float>()', 'close', 'values.get(0) == close'],
    ['bool', 'array.new<bool>()', 'bar_index % 2 == 0', 'values.get(0) == (bar_index % 2 == 0)'],
    ['string', 'array.new<string>()', 'str.tostring(bar_index)', 'values.get(0) == str.tostring(bar_index)'],
    ['color', 'array.new<color>()', 'color.red', 'values.get(0) == color.red'],
  ])('inserts matching %s elements into an empty array', (_kind, constructor, value, comparison) => {
    const body = `values = ${constructor}\n${call(route, '0', value)}\nplot(${comparison} ? 1 : 0, title="result")`;
    expect(errors(body)).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 1));
  });

  it('preserves the inserted UDT reference', () => {
    const body = `type Record\n    int value\nvalues = array.new<Record>()\nitem = Record.new(3)\n${call(route, '0', 'item')}\nitem.value := 8\nstored = values.get(0)\nplot(stored.value, title="result")`;
    expect(errors(body)).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 8));
  });

  it('refuses using the void result as a value', () => {
    expect(errors(`values = array.from(1)\nresult = ${call(route, '0', '2')}\nplot(result)`)).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('returns no value') }),
    );
  });

  it('requires the supplied element value', () => {
    const invocation = route === 'namespace' ? 'array.insert(values, 0)' : 'values.insert(0)';
    expect(errors(`values = array.from(1)\n${invocation}`)).not.toEqual([]);
  });

  it('refuses a string element in an integer array', () => {
    expect(errors(`values = array.from(1)\n${call(route, '0', '"wrong"')}`)).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('array element') }),
    );
  });

  it.each(['1.5', '"wrong"', 'true'])('refuses the non-integer index %s', (index) => {
    expect(errors(`values = array.from(1)\n${call(route, index, '2')}`)).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch' }),
    );
  });
});

describe('ranked array.insert namespace ID', () => {
  it.each(['1', '1.5', 'true', '"wrong"'])('refuses scalar ID %s', (id) => {
    expect(errors(`array.insert(${id}, 0, 2)`)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });
});
