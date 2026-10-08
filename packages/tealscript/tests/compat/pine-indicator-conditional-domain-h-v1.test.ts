import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function errors(version: number, value: string, option: string, setup = '') {
  return checkProgram(parse(`//@version=${version}
${setup}indicator("Conditional domain", ${option}=${value})
plot(close)`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('indicator constant ternaries retain the format and scale value domains', () => {
  for (const version of [5, 6]) {
    for (const option of ['format', 'scale']) {
      const bad = `"not_a_${option}"`;
      const good = option === 'format' ? 'format.volume' : 'scale.left';
      const invalid = [
        { name: 'true branch', value: `true ? ${bad} : ${good}`, setup: '' },
        { name: 'false branch', value: `false ? ${good} : ${bad}`, setup: '' },
        { name: 'const selector alias', value: `SELECT ? ${bad} : ${good}`, setup: 'const bool SELECT = true\n' },
        {
          name: 'const result alias', value: 'OPTION',
          setup: `const string OPTION = true ? ${bad} : ${bad}\n`,
        },
      ];
      it.each(invalid)(`v${version} ${option} refuses invalid $name`, ({ value, setup }) => {
        expect(errors(version, value, option, setup)).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(option) }),
        ]));
      });
      it(`v${version} ${option} retains the existing invalid literal refusal`, () => {
        expect(errors(version, bad, option)).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(option) }),
        ]));
      });
      it.each([
        { name: 'true branch', value: `true ? ${good} : ${good}`, setup: '' },
        { name: 'false branch', value: `false ? ${good} : ${good}`, setup: '' },
        { name: 'const result alias', value: 'OPTION', setup: `OPTION = true ? ${good} : ${good}\n` },
      ])(`v${version} ${option} retains valid $name`, ({ value, setup }) => {
        expect(errors(version, value, option, setup)).toEqual([]);
      });
      it.each([
        { name: 'unselected false branch', value: `true ? ${good} : ${bad}` },
        { name: 'unselected true branch', value: `false ? ${bad} : ${good}` },
      ])(`v${version} ${option} retains its selected valid $name`, ({ value }) => {
        expect(errors(version, value, option)).toEqual([]);
      });
      it(`v${version} ${option} leaves an unknown const selector unresolved`, () => {
        expect(errors(version, `SELECT ? ${bad} : ${bad}`, option, 'const bool SELECT = bool(1)\n'))
          .not.toEqual(expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining(`Invalid indicator ${option}`) }),
          ]));
      });
      it.each(['simple', 'series'])(`v${version} ${option} leaves a %s selector unresolved`, (qualifier) => {
        const diagnostics = errors(version, `SELECT ? ${bad} : ${bad}`, option, `${qualifier} bool SELECT = true\n`);
        expect(diagnostics).toEqual(expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('const') }),
        ]));
        expect(diagnostics).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining(`Invalid indicator ${option}`) }),
        ]));
      });
      it(`v${version} ${option} text remains legal as a title`, () => {
        expect(errors(version, `true ? ${bad} : ${bad}`, 'shorttitle')).toEqual([]);
      });
    }
  }
});
