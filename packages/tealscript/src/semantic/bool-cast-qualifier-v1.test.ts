import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const check = (body: string, version = 6) =>
  checkProgram(parse(`//@version=${version}\nindicator("Cast qualifier")\n${body}`));
const errors = (body: string, version = 6) =>
  check(body, version).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

describe('numeric bool cast qualifier selection', () => {
  it.each([
    'input int value = input.int(2)',
    'simple int value = timeframe.multiplier',
    'input float value = input.float(2.5)',
    'simple float value = syminfo.mintick',
  ])('accepts a const result from %s', (declaration) => {
    const result = check(`${declaration}\nconst bool converted = bool(value)\nplot(converted ? 1 : 0)`);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'converted')?.type)
      .toEqual({ kind: 'bool', qualifier: 'const' });
  });

  it.each(['input.int(2)', 'timeframe.multiplier'])('binds named x=%s', (value) => {
    expect(errors(`const bool converted = bool(x=${value})\nplot(converted ? 1 : 0)`)).toEqual([]);
  });

  it.each(['bar_index', 'close'])('retains the series qualifier for %s', (value) => {
    expect(errors(`const bool converted = bool(${value})`))
      .toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
    const result = check(`series bool converted = bool(${value})`);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'converted')?.type)
      .toEqual({ kind: 'bool', qualifier: 'series' });
  });

  it.each([
    ['const', 'const bool value = true'],
    ['input', 'input bool value = input.bool(true)'],
    ['simple', 'simple bool value = timeframe.isintraday'],
    ['series', 'series bool value = close > 0'],
  ])('preserves a %s bool argument', (qualifier, declaration) => {
    const result = check(`${declaration}\nconverted = bool(value)`);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'converted')?.type)
      .toEqual({ kind: 'bool', qualifier });
    if (qualifier !== 'const') {
      expect(errors(`${declaration}\nconst bool converted = bool(value)`))
        .toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
    }
  });

  it.each(['input.int(2)', 'timeframe.multiplier', 'input.float(2.5)', 'syminfo.mintick'])(
    'preserves the v5 numeric cast qualifier for %s', (value) => {
      expect(errors(`const bool converted = bool(${value})`, 5))
        .toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
    },
  );

  it.each(['input.int(2)', 'timeframe.multiplier', 'close'])('retains implicit numeric refusal for %s', (value) => {
    expect(errors(`bool converted = ${value}`)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it.each(['"true"', 'color.red'])('retains wrong-kind refusal for %s', (value) => {
    expect(errors(`converted = bool(${value})`)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it('preserves a selected user function named bool', () => {
    expect(errors('bool(simple int x) => x > 0\nconst bool converted = bool(timeframe.multiplier)'))
      .toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });
});
