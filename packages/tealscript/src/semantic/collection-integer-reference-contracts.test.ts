import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const integerParameters = [
  ['array.new<float>', 'size', 'array.new<float>(size=VALUE, initial_value=1.5)'],
  ['array.new_int', 'size', 'array.new_int(size=VALUE, initial_value=17)'],
  ['array.get', 'index', 'array.get(a, index=VALUE)'],
  ['array.set', 'index', 'a.set(index=VALUE, value=1.5)'],
  ['array.insert', 'index', 'array.insert(a, index=VALUE, value=1.5)'],
  ['array.remove', 'index', 'a.remove(index=VALUE)'],
  ['array.fill', 'index_from', 'array.fill(a, 1.5, index_from=VALUE, index_to=2)'],
  ['array.fill', 'index_to', 'a.fill(1.5, index_from=0, index_to=VALUE)'],
  ['array.slice', 'index_from', 'array.slice(a, index_from=VALUE, index_to=2)'],
  ['array.slice', 'index_to', 'a.slice(index_from=0, index_to=VALUE)'],
  ['array.min', 'nth', 'array.min(a, nth=VALUE)'],
  ['array.max', 'nth', 'a.max(nth=VALUE)'],
  ['array.percentrank', 'index', 'array.percentrank(a, index=VALUE)'],
  ['matrix.new<float>', 'rows', 'matrix.new<float>(rows=VALUE, columns=2, initial_value=1.5)'],
  ['matrix.new<float>', 'columns', 'matrix.new<float>(rows=2, columns=VALUE, initial_value=1.5)'],
  ['matrix.get', 'row', 'matrix.get(m, row=VALUE, column=1)'],
  ['matrix.get', 'column', 'm.get(row=0, column=VALUE)'],
  ['matrix.set', 'row', 'matrix.set(m, row=VALUE, column=1, value=1.5)'],
  ['matrix.set', 'column', 'm.set(row=0, column=VALUE, value=1.5)'],
  ['matrix.row', 'row', 'matrix.row(m, row=VALUE)'],
  ['matrix.col', 'column', 'm.col(column=VALUE)'],
  ['matrix.add_row', 'row', 'matrix.add_row(m, row=VALUE, array_id=a)'],
  ['matrix.add_col', 'column', 'm.add_col(column=VALUE, array_id=a)'],
  ['matrix.remove_row', 'row', 'matrix.remove_row(m, row=VALUE)'],
  ['matrix.remove_col', 'column', 'm.remove_col(column=VALUE)'],
  ['matrix.swap_rows', 'row1', 'matrix.swap_rows(m, row1=VALUE, row2=1)'],
  ['matrix.swap_rows', 'row2', 'm.swap_rows(row1=0, row2=VALUE)'],
  ['matrix.swap_columns', 'column1', 'matrix.swap_columns(m, column1=VALUE, column2=1)'],
  ['matrix.swap_columns', 'column2', 'm.swap_columns(column1=0, column2=VALUE)'],
  ['matrix.reshape', 'rows', 'matrix.reshape(m, rows=VALUE, columns=4)'],
  ['matrix.reshape', 'columns', 'm.reshape(rows=4, columns=VALUE)'],
  ['matrix.fill', 'from_row', 'matrix.fill(m, 1.5, from_row=VALUE, to_row=2, from_column=0, to_column=2)'],
  ['matrix.fill', 'to_row', 'm.fill(1.5, from_row=0, to_row=VALUE, from_column=0, to_column=2)'],
  ['matrix.fill', 'from_column', 'matrix.fill(m, 1.5, from_row=0, to_row=2, from_column=VALUE, to_column=2)'],
  ['matrix.fill', 'to_column', 'm.fill(1.5, from_row=0, to_row=2, from_column=0, to_column=VALUE)'],
  ['matrix.submatrix', 'from_row', 'matrix.submatrix(m, from_row=VALUE, to_row=2, from_column=0, to_column=2)'],
  ['matrix.submatrix', 'to_row', 'm.submatrix(from_row=0, to_row=VALUE, from_column=0, to_column=2)'],
  ['matrix.submatrix', 'from_column', 'matrix.submatrix(m, from_row=0, to_row=2, from_column=VALUE, to_column=2)'],
  ['matrix.submatrix', 'to_column', 'm.submatrix(from_row=0, to_row=2, from_column=0, to_column=VALUE)'],
  ['matrix.sort', 'column', 'matrix.sort(m, column=VALUE)'],
  ['matrix.pow', 'power', 'm.pow(power=VALUE)'],
] as const;

const check = (call: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Collection integer parameters")
simple int simpleIndex = 0
a = array.from(17.0, -8.0)
m = matrix.new<float>(2, 2, 1.5)
${call}
`),
  );

describe('documented collection integer parameter types', () => {
  for (const [member, parameter, call] of integerParameters) {
    it(`${member} ${parameter} accepts documented numeric kinds and rejects other supplied kinds`, () => {
      const reference = `https://www.tradingview.com/pine-script-reference/v6/#fun_${member.split('<')[0]}`;
      for (const value of ['0', 'input.int(0)', 'simpleIndex', 'bar_index']) {
        expect(check(call.replace('VALUE', value)).diagnostics, `${reference}; ${value}`).toEqual([]);
      }
      const acceptsFloat = member === 'array.set' || member === 'array.fill';
      expect(check(call.replace('VALUE', '0.5')).diagnostics).toEqual(
        acceptsFloat ? [] : [expect.objectContaining({ code: 'type-mismatch' })],
      );
      for (const value of ['"0"', 'false']) {
        expect(check(call.replace('VALUE', value)).diagnostics, `${reference}; ${value}`).toEqual([
          expect.objectContaining({ code: 'type-mismatch' }),
        ]);
      }
    });
  }
});
