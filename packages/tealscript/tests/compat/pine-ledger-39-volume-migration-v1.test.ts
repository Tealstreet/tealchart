import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// The v5 migration table moves iii/nvi/pvi/pvt variables into the ta namespace.
// Reference variables retain their series float type after the rename.
describe('documented volume variable namespace migration', () => {
  const check = (version: number, expression: string) =>
    checkProgram(
      parse(`//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Volume migration")
value = ${expression}
plot(close)
`),
    );

  for (const name of ['iii', 'nvi', 'pvi', 'pvt']) {
    it(`accepts bare ${name} as a series float in v4`, () => {
      const result = check(4, name);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
        kind: 'float',
        qualifier: 'series',
      });
    });

    for (const version of [5, 6]) {
      it(`requires ta.${name} in v${version} and preserves the variable type`, () => {
        expect(check(version, name).diagnostics).toEqual([
          expect.objectContaining({ code: 'unknown-identifier', message: `Unknown identifier: ${name}` }),
        ]);
        const result = check(version, `ta.${name}`);
        expect(result.diagnostics).toEqual([]);
        expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
          kind: 'float',
          qualifier: 'series',
        });
      });
    }
  }
});
