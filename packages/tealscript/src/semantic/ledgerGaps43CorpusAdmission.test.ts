import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (version: number, source: string) =>
  checkProgram(parse(`//@version=${version}\nindicator("corpus admission boundaries")\n${source}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
// Native v5 captures reject identical local method signatures; v6 remains unobserved.
describe('gaps43 corpus admission boundaries pending native adjudication', () => {
  it('refuses the native-captured v5 duplicate-method fixture body', () => {
    expect(
      errors(5, 'type Point\n    float x\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x+1\nplot(close)'),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
  });
  it('preserves v6 identical method declarations without selecting a replacement', () => {
    expect(
      errors(6, 'type Point\n    float x\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x+1\nplot(close)'),
    ).toEqual([]);
  });
  it('keeps the v6 ordinary-function identical required-signature refusal', () => {
    expect(errors(6, 'shift(float p) => p\nshift(float p) => p+1\nplot(close)').map((d) => d.code)).toContain(
      'invalid-overload',
    );
  });
  it('keeps the nested-UDF refusal inside a function body', () => {
    expect(errors(6, 'outer() =>\n    inner(x) => x+1\n    inner(close)\nplot(outer())').map((d) => d.code)).toContain(
      'function-scope',
    );
  });
});
