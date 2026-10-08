import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const versions = [5, 6] as const;
const options = ['format', 'scale'] as const;
const wrongValues = [
  { name: 'true literal', setup: '', value: 'true' },
  { name: 'false literal', setup: '', value: 'false' },
  { name: 'const bool alias', setup: 'const bool OPTION = true\n', value: 'OPTION' },
] as const;

function errors(version: number, setup: string, option: string, value: string) {
  return checkProgram(parse(`//@version=${version}
${setup}indicator("Format scale kinds", ${option}=${value})
plot(close)`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator format and scale refuse boolean values', () => {
  for (const version of versions) {
    for (const option of options) {
      it.each(wrongValues)(`v${version} ${option} refuses $name`, ({ setup, value }) => {
        expect(errors(version, setup, option, value)).toEqual(expect.arrayContaining([
          expect.objectContaining({
            code: 'type-mismatch',
            message: `indicator ${option} cannot be boolean`,
          }),
        ]));
      });

      const value = option === 'format' ? 'format.volume' : 'scale.left';
      it(`v${version} ${option} retains its named constant`, () => {
        expect(errors(version, '', option, value)).toEqual([]);
      });
      it(`v${version} ${option} retains a const alias`, () => {
        expect(errors(version, `OPTION = ${value}\n`, option, 'OPTION')).toEqual([]);
      });
    }
  }
});
