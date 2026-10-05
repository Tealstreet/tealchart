import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Median kinds")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
const calls = ['array.median(values)', 'values.median()', 'values.copy().median()'];

describe('documented array median return kinds', () => {
  it.each(calls)('accepts integer median through %s', (call) => {
    expect(errors(`values=array.from(1,7,3)\nint out=${call}\nplot(out)`)).toEqual([]);
  });
  it.each(calls)('refuses float median assigned to int through %s', (call) => {
    expect(
      errors(`values=array.from(1.5,7.5,3.5)\nint out=${call}\nplot(out)`).some((d) => d.code === 'type-mismatch'),
    ).toBe(true);
  });
  it.each(calls)('retains float median assignment through %s', (call) => {
    expect(errors(`values=array.from(1.5,7.5,3.5)\nfloat out=${call}\nplot(out)`)).toEqual([]);
  });
  it('preserves TA median float kind', () => {
    expect(errors('int out=ta.median(close,3)\nplot(out)').some((d) => d.code === 'type-mismatch')).toBe(true);
  });
  it.each(['values.median()', 'values.copy().median()'])('preserves a user method return through %s', (call) => {
    expect(
      errors(`method median(array<int> self) => 1.5\nvalues=array.from(1,7,3)\nint out=${call}\nplot(out)`).some(
        (d) => d.code === 'type-mismatch',
      ),
    ).toBe(true);
  });
  it('keeps the namespace builtin independent of a user method', () => {
    expect(
      errors(
        'method median(array<int> self) => 1.5\nvalues=array.from(1,7,3)\nint out=array.median(values)\nplot(out)',
      ),
    ).toEqual([]);
  });
});
