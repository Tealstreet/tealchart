import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: migration-guides/to-pine-version-5/#split-of-input-into-several-functions.
const selectors = [
  { legacy: 'integer', modern: 'int', value: '7' },
  { legacy: 'float', modern: 'float', value: '-2.75' },
  { legacy: 'bool', modern: 'bool', value: 'false' },
  { legacy: 'string', modern: 'string', value: '"EMA"' },
];

function errors(version: number, call: string) {
  const ast = parse(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Generic input type boundary")
value = ${call}
plot(close)
`);
  return checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('legacy generic input type argument boundary', () => {
  it.each(selectors)('replaces input.$legacy with input.$modern in v5 and v6', ({ legacy, modern, value }) => {
    const oldCall = `input(${value}, title="Chosen", type=input.${legacy})`;
    expect(errors(4, oldCall)).toEqual([]);
    for (const version of [5, 6]) {
      expect(errors(version, oldCall)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'version-mismatch',
            message: expect.stringContaining('Generic input(..., type='),
          }),
        ]),
      );
      expect(errors(version, `input.${modern}(${value}, title="Chosen")`)).toEqual([]);
      expect(errors(version, `input(${value}, title="Chosen")`)).toEqual([]);
    }
  });
});
