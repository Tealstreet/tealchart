import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';

const invalid = `//@version=5
indicator("Continuation")
text() =>
    "{" +
    "}"
plot(str.length(text()))`;

describe('v5 undelimited UDF string continuation', () => {
  it('matches the exact captured v15 first-error text and site', () => {
    const source = readFileSync(new URL('../../oracle-probes/v15/corpus-v56-1463-continuation-v15-v1.pine', import.meta.url), 'utf8');
    const outcomes = JSON.parse(readFileSync(new URL('../../oracle-probes/v15/captures/v15/outcomes-v15.json', import.meta.url), 'utf8')) as {
      script: string; source_sha256: string; status: string;
      diagnostic: { text: string; line: number; column: number; code: null };
    }[];
    const native = outcomes.find((row) => row.script === 'corpus-v56-1463-continuation-v15-v1.pine')!;
    expect(native.status).toBe('COMPILE-ERROR');
    expect(createHash('sha256').update(source).digest('hex')).toBe(native.source_sha256);
    expect(() => parse(source)).toThrowError(native.diagnostic.text);
    try {
      parse(source);
    } catch (error) {
      expect(error).toBeInstanceOf(TealscriptParseError);
      expect((error as TealscriptParseError).location.start).toMatchObject({
        line: native.diagnostic.line, column: native.diagnostic.column,
      });
      expect(error).not.toHaveProperty('nativeCode');
    }
  });

  it('refuses a continuation at the body indentation', () => {
    // Native v15 corpus-v56-1463-continuation, attempt 1: 43:10.
    expect(() => parse(invalid)).toThrowError(TealscriptParseError);
    expect(() => parse(invalid)).toThrowError("Syntax error at input 'end of line without line continuation'");
    try {
      parse(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(TealscriptParseError);
      expect((error as TealscriptParseError).location.start).toMatchObject({ line: 4, column: 10 });
    }
  });

  it('does not select matching string additions by the literal column', () => {
    const source = `//@version=5
indicator("Continuation")
text() =>
    value = "{" +
    "}"
    value
plot(str.length(text()))`;
    expect(() => parse(source)).toThrowError(TealscriptParseError);
  });

  it.each([
    ['non-block continuation', invalid.replace('    "}"', '     "}"')],
    ['parenthesized expression', invalid.replace('    "{" +', '    ("{" +').replace('    "}"', '    "}")')],
    ['single line', invalid.replace('"{" +\n    "}"', '"{" + "}"')],
    ['separate string statements', invalid.replace('"{" +', '"{"')],
    ['numeric expression', invalid.replace('"{"', '1').replace('"}"', '2').replace('str.length(text())', 'text()')],
    ['earlier version', invalid.replace('version=5', 'version=4')],
  ])('preserves %s as a regression control', (_name, source) => {
    expect(parse(source).body).toHaveLength(3);
  });
});
