import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function errors(setup: string, value?: string, named = false) {
  const argumentsText = value === undefined ? '"CFTC/SB_FO_ALL"' : named
    ? `"CFTC/SB_FO_ALL", index=${value}` : `"CFTC/SB_FO_ALL", barmerge.gaps_off, ${value}`;
  return checkProgram(parse(`//@version=6\nindicator("Quandl index")\n${setup}\nvalue = request.quandl(${argumentsText})`))
    .diagnostics.filter(diagnostic => diagnostic.severity === 'error');
}

// fun_request.quandl index: optional series int, including const/input/simple int.
describe('request.quandl documented column index', () => {
  it.each([false, true])('accepts every int qualifier, named=%s', named => {
    for (const setup of ['const int column = 0', 'column = input.int(0)',
      'simple int column = 0', 'series int column = bar_index']) {
      expect(errors(setup, 'column', named)).toEqual([]);
    }
  });

  it.each([false, true])('refuses float, string, bool and collection indices, named=%s', named => {
    for (const value of ['2.5', '4.0', '"0"', 'true', 'array.from(0)']) {
      expect(errors('', value, named)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('index') }),
      ]));
    }
  });

  it('allows an omitted index', () => {
    expect(errors('')).toEqual([]);
  });
});
