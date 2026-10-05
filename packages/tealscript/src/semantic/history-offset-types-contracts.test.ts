import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const diagnostics = (setup: string, offset: string) =>
  checkProgram(
    parse(`//@version=6
indicator("History offset types")
${setup}
value = close[${offset}]
plot(value)`),
  ).diagnostics.filter((d) => d.severity === 'error');

describe('documented numerical history offsets', () => {
  it.each([
    ['string literal', '', '"one"'],
    ['bool literal', '', 'true'],
    ['color literal', '', 'color.red'],
    ['string alias', 'offset = "one"', 'offset'],
    ['bool alias', 'offset = close > open', 'offset'],
    ['input string', 'offset = input.string("one")', 'offset'],
    ['string UDF', 'offset() => "one"', 'offset()'],
  ])('rejects the nonnumerical %s offset', (_name, setup, offset) => {
    expect(diagnostics(setup, offset)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });
  it.each([
    ['int literal', '', '1'],
    ['float admission', '', '1.5'],
    ['series int', 'offset = bar_index % 2', 'offset'],
  ])('preserves %s offset admission', (_name, setup, offset) => {
    expect(diagnostics(setup, offset)).toEqual([]);
  });
});
