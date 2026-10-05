import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Reference: array.fill (functions #495); Methods manual, built-in method equivalence.
// Ordinal49 is a checker name collision; exact chained-UDF native admission is unobserved.
describe('array fill receiver origin', () => {
  const diagnostics = (body: string) => checkProgram(parse(`//@version=6\nindicator("Receiver origin")\n${body}`)).diagnostics;

  it.each([
    ['typed UDF copy', 'touch(array<int> values) =>\n    array.copy(values).fill(3)\n    array.size(values)\nplot(touch(array.from(1, 2)))'],
    ['inferred UDF copy', 'touch(values) =>\n    array.copy(values).fill(3)\n    array.size(values)\nplot(touch(array.from(1, 2)))'],
    ['typed UDF partial copy', 'touch(array<int> values) =>\n    array.copy(values).fill(3, 1, 2)\n    array.size(values)\nplot(touch(array.from(1, 2)))'],
    ['local block copy', 'values = array.from(1, 2)\nif bar_index == 0\n    array.copy(values).fill(3)\nplot(array.size(values))'],
    ['global copy', 'values = array.from(1, 2)\narray.copy(values).fill(3)\nplot(array.size(values))'],
    ['global partial copy', 'values = array.from(1, 2)\narray.copy(values).fill(3, 1, 2)\nplot(array.size(values))'],
    ['local variable receiver', 'touch(array<int> values) =>\n    values.fill(3)\n    array.size(values)\nplot(touch(array.from(1, 2)))'],
    ['local namespace call', 'touch(array<int> values) =>\n    array.fill(values, 3)\n    array.size(values)\nplot(touch(array.from(1, 2)))'],
    ['global plot fill', 'upper = plot(2)\nlower = plot(1)\nfill(upper, lower, color=color.red)'],
  ])('accepts %s', (_name, body) => expect(diagnostics(body)).toEqual([]));

  it('keeps real plot fill global-only', () => {
    const errors = diagnostics('upper = plot(2)\nlower = plot(1)\nif bar_index == 0\n    fill(upper, lower, color=color.red)');
    expect(errors.some((entry) => entry.code === 'scope-mismatch' && entry.message.includes('fill()'))).toBe(true);
  });

  it('keeps real plot fill handle families distinct', () => {
    const errors = diagnostics('upper = plot(2)\nlower = hline(1)\nfill(upper, lower, color=color.red)');
    expect(errors.some((entry) => entry.code === 'type-mismatch' && entry.message.includes('cannot be mixed'))).toBe(true);
  });

  it('keeps array method required value binding', () => {
    const errors = diagnostics('values = array.from(1, 2)\narray.copy(values).fill()\nplot(array.size(values))');
    expect(errors.some((entry) => entry.code === 'argument-count' && entry.message.includes('array.fill'))).toBe(true);
  });
});
