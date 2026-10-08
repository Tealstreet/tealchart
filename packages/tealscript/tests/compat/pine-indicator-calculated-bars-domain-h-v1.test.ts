import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(version: number, value: string, setup = '', kind = 'indicator') {
  return checkProgram(parse(`//@version=${version}
${setup}${kind}("Calculated bars domain", calc_bars_count=${value})
plot(close)`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator calculated bars requires a non-negative resolved integer', () => {
  for (const version of [5, 6]) {
    const invalid = [
      { name: 'arithmetic', value: '0 - 1', setup: '' },
      { name: 'const alias', value: 'VALUE', setup: 'const int VALUE = -1\n' },
      { name: 'alias chain', value: 'VALUE', setup: 'const int NEGATIVE = -1\nconst int VALUE = NEGATIVE\n' },
    ];
    it.each(invalid)(`v${version} refuses negative $name`, ({ value, setup }) => {
      expect(errors(version, value, setup)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('non-negative integer') }),
      ]));
    });
    it(`v${version} keeps the single negative-literal refusal`, () => {
      expect(errors(version, '-1')).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('non-negative integer') }),
      ]);
    });
    it.each([
      { value: '0', setup: '' },
      { value: '1', setup: '' },
      { value: '2 - 2', setup: '' },
      { value: 'VALUE', setup: 'const int VALUE = 0\n' },
      { value: '20 / 2', setup: '' },
    ].filter(({ value }) => version === 5 || value !== '20 / 2'))(`v${version} admits non-negative $value`, ({ value, setup }) => {
      expect(errors(version, value, setup)).toEqual([]);
    });
    it.each([
      { value: '-1.0', setup: '' },
      { value: 'VALUE', setup: 'const float VALUE = -1.0\n' },
      { value: '0.0 - 1.0', setup: '' },
    ])(`v${version} preserves a single negative-float refusal for $value`, ({ value, setup }) => {
      expect(errors(version, value, setup)).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
    });
    it.each(['input.int(0)', 'bar_index'])(`v${version} retains const-qualifier refusal of %s`, (value) => {
      expect(errors(version, value)).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('const') }),
      ]));
    });
    it.each(invalid)(`v${version} keeps strategy $name unchanged`, ({ value, setup }) => {
      expect(errors(version, value, setup, 'strategy')).toEqual([]);
    });
  }
});
