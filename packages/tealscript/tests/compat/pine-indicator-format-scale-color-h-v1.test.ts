import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const versions = [5, 6] as const;
const options = ['format', 'scale'] as const;
const colors = [
  { name: 'color literal', setup: '', value: '#FF55C6' },
  { name: 'named color', setup: '', value: 'color.red' },
  { name: 'const color alias', setup: 'const color OPTION = color.red\n', value: 'OPTION' },
] as const;

function errors(version: number, setup: string, declaration: string, plot = 'plot(close)') {
  return checkProgram(parse(`//@version=${version}
${setup}${declaration}
${plot}`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator format and scale require their documented argument kinds', () => {
  for (const version of versions) {
    for (const option of options) {
      it.each(colors)(`v${version} ${option} refuses $name`, ({ setup, value }) => {
        expect(errors(version, setup, `indicator("Color kind", ${option}=${value})`))
          .toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(option) }),
          ]));
      });

      const value = option === 'format' ? 'format.volume' : 'scale.left';
      it(`v${version} ${option} retains its named constant`, () => {
        expect(errors(version, '', `indicator("Valid kind", ${option}=${value})`)).toEqual([]);
      });
      it(`v${version} ${option} retains its const alias`, () => {
        expect(errors(version, `OPTION = ${value}\n`, `indicator("Valid kind", ${option}=OPTION)`)).toEqual([]);
      });
    }

    it.each(colors)(`v${version} plot color accepts $name`, ({ setup, value }) => {
      expect(errors(version, setup, 'indicator("Valid color")', `plot(close, color=${value})`)).toEqual([]);
    });
  }
});
