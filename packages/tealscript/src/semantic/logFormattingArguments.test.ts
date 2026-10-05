import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Log formatting kinds")\n${body}\nplot(close)`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

const invalid = ['color.red', 'matrix.new<float>()', 'line.new(0, close, 1, close)', 'array.new_color()', 'array.new_line()'];
const valid = ['close', 'bar_index', 'true', '"text"', 'array.new_int()', 'array.new_float()', 'array.new_bool()', 'array.new_string()'];

describe.each(['log.info', 'log.warning', 'log.error'])('%s formatting argument kinds', (name) => {
  it.each(invalid)('rejects unsupported format value %s', (value) => {
    expect(errors(`${name}("{0}", ${value})`)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('format argument') }),
    ]));
  });
  it.each(valid)('accepts documented format value %s', (value) => {
    expect(errors(`${name}("{0}", ${value})`)).toEqual([]);
    expect(errors(`${name}(message="{0}", ${value})`)).toEqual([]);
  });
});

it('preserves a local receiver method named info', () => {
  expect(errors('method info(array<float> self, color value) => 1\nlog = array.new_float()\nx = log.info(color.red)')).toEqual([]);
});
