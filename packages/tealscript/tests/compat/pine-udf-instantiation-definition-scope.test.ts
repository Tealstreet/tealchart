import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('written-call validation keeps the definition scope', () => {
  for (const version of [4, 5, 6]) {
    for (const annotation of ['', 'int ']) {
      it(`v${version} ${annotation || 'untyped '}body keeps a namespace before a later global`, () => {
        const declaration = version === 4 ? 'study' : 'indicator';
        const source = `//@version=${version}
${declaration}("Definition scope")
show(${annotation}n) => label.new(0, n, "x", size=size.small)
size = 1.5
plot(na(show(1)) ? 0 : 1)
`;
        const errors = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        expect(errors).toEqual([]);
      });
    }
  }
});
