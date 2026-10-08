import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (call: string) => checkProgram(parse(`//@version=6
indicator("String argument contracts")
result = ${call}
`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// https://www.tradingview.com/pine-script-reference/v6/#fun_str.format
// format requires a formatting string and at least one value; format_time requires time.
describe('required string arguments', () => {
  it.each(['str.format("plain")', 'str.format(formatString="plain")', 'str.format_time()', 'str.format_time(format="yyyy")'])('rejects %s', (call) => {
    expect(errors(call)).toContainEqual(expect.objectContaining({ code: 'argument-count' }));
  });

  it.each(['str.format("plain", 1)', 'str.format(formatString="{0}", arg0=1)', 'str.format_time(0)', 'str.format_time(time=0, timezone="UTC")'])('accepts %s', (call) => {
    expect(errors(call)).toEqual([]);
  });
});

// Each numeric slot below is int in its specific v6 reference signature.
// https://www.tradingview.com/pine-script-reference/v6/#fun_str.substring
describe('integer string arguments', () => {
  it.each([
    'str.format_time(1.5, "S", "UTC")',
    'str.format_time(time=1.5)',
    'str.repeat("a", 1.5)',
    'str.repeat(source="a", repeat=1.5)',
    'str.substring("abc", 0.5, 2)',
    'str.substring("abc", 0, 2.5)',
    'str.substring(source="abc", begin_pos=0.5)',
    'str.substring(source="abc", begin_pos=0, end_pos=2.5)',
    'str.replace("aaa", "a", "X", 1.5)',
    'str.replace(source="aaa", target="a", replacement="X", occurrence=1.5)',
  ])('rejects %s', (call) => {
    expect(errors(call)).toContainEqual(expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('must be an integer') }));
  });

  it.each([
    'str.format_time(time=0)', 'str.repeat("a", 2)', 'str.repeat(source="a", repeat=int(2.5))',
    'str.substring("abc", 0)', 'str.substring("abc", 0, 2)', 'str.replace("aaa", "a", "X", 1)',
  ])('accepts %s', (call) => {
    expect(errors(call)).toEqual([]);
  });
});

// https://www.tradingview.com/pine-script-docs/concepts/strings/#custom-representations
// Color values and drawing references require custom string representations.
describe('unsupported string representation values', () => {
  it.each(['str.tostring(line.new(0, 1, 1, 2))', 'str.tostring(line.new(0, 1, 1, 2), "#.00")', 'str.format("{0}", color.red)', 'str.format("{0}", line.new(0, 1, 1, 2))'])('rejects %s', (call) => {
    expect(errors(call)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it.each(['str.tostring(1.2, "#.00")', 'str.tostring(array.new<float>(2, 1.2), "#.00")', 'str.tostring(matrix.new<float>(1, 2, 1.2), "#.00")', 'str.format("{0}", array.new<string>(2, "abc"))'])('preserves %s', (call) => {
    expect(errors(call)).toEqual([]);
  });
});
