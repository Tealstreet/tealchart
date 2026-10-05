import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: migration-guides/to-pine-version-5/#renamed-functions-and-variables.
const aliases = [
  { legacy: 'sma', modern: 'ta.sma', arguments: 'close, 2' },
  { legacy: 'abs', modern: 'math.abs', arguments: 'close' },
  { legacy: 'tostring', modern: 'str.tostring', arguments: '3' },
  { legacy: 'security', modern: 'request.security', arguments: 'syminfo.tickerid, "2", close' },
  { legacy: 'heikinashi', modern: 'ticker.heikinashi', arguments: 'syminfo.tickerid' },
];

function errors(version: number, call: string) {
  const ast = parse(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Global alias boundary")
value = ${call}
plot(close)
`);
  return checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('legacy global builtin alias boundary', () => {
  it.each(aliases)('moves $legacy to $modern in v5 and v6', (alias) => {
    const legacyCall = `${alias.legacy}(${alias.arguments})`;
    expect(errors(4, legacyCall)).toEqual([]);
    for (const version of [5, 6]) {
      expect(errors(version, legacyCall)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'version-mismatch',
            message: expect.stringContaining(`Use ${alias.modern}()`),
          }),
        ]),
      );
      expect(errors(version, `${alias.modern}(${alias.arguments})`)).toEqual([]);
    }
  });
});
