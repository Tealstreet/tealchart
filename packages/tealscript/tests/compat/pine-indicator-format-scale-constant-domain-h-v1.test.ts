import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(version: number, setup: string, declaration: string) {
  return checkProgram(parse(`//@version=${version}
${setup}${declaration}
plot(close)`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator format and scale validate resolved constant domains', () => {
  for (const version of [5, 6]) {
    for (const option of ['format', 'scale']) {
      const invalid = `not_a_${option}`;
      const forms = [
        { name: 'const alias', setup: `const string OPTION = "${invalid}"\n`, value: 'OPTION' },
        {
          name: 'const alias chain',
          setup: `const string BAD = "${invalid}"\nconst string OPTION = BAD\n`,
          value: 'OPTION',
        },
        { name: 'const concatenation', setup: '', value: `"not_a_" + "${option}"` },
      ];

      it.each(forms)(`v${version} ${option} refuses invalid $name`, ({ setup, value }) => {
        expect(errors(version, setup, `indicator("Invalid domain", ${option}=${value})`))
          .toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(option) }),
          ]));
      });

      it(`v${version} ${option} refuses the same invalid literal`, () => {
        expect(errors(version, '', `indicator("Invalid domain", ${option}="${invalid}")`))
          .toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(option) }),
          ]));
      });

      const valid = option === 'format' ? 'format.volume' : 'scale.left';
      it(`v${version} ${option} retains its named constant`, () => {
        expect(errors(version, '', `indicator("Valid domain", ${option}=${valid})`)).toEqual([]);
      });
      it(`v${version} ${option} retains its named-constant alias`, () => {
        expect(errors(version, `OPTION = ${valid}\n`, `indicator("Valid domain", ${option}=OPTION)`)).toEqual([]);
      });
      it.each(forms)(`v${version} ${option} text remains valid as a title via $name`, ({ setup, value }) => {
        expect(errors(version, setup, `indicator(title=${value})`)).toEqual([]);
      });
    }
  }
});
