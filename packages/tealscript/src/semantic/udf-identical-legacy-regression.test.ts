import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=5\nindicator("Legacy overloads")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );

// V5 release notes, November 2021: equal-arity typed combinations must be unique.
describe('ordinary v5 function signature uniqueness', () => {
  it('restores the exact batch12 identical-overload refusal', () => {
    expect(
      errors('shift(float p) => p\nshift(float p) => p + 1\nplot(close)').some((d) => d.code === 'invalid-overload'),
    ).toBe(true);
  });
  it('refuses native-captured identical v5 user-method declarations', () => {
    expect(
      errors('type Point\n    float x\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x + 1\nplot(close)'),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
  });
  it('accepts distinct types and arities', () => {
    expect(
      errors(
        'f(float x) => x\nf(string x) => str.length(x)\nf(float x, float y) => x+y\nplot(f(close)+f("a")+f(close,open))',
      ),
    ).toEqual([]);
  });
  it('preserves distinct total arities with optional parameters', () => {
    expect(errors('f(float x) => x\nf(float x, float y=1) => x+y\nplot(close)')).toEqual([]);
  });
});
