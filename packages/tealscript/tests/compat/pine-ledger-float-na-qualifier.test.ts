import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Pine v6 float(na) cast and const float overload; ledger ranks 71 and 77.
describe('documented unavailable const float cast', () => {
  for (const expression of ['float(na)', 'float(x=na)']) {
    it(`infers const float from ${expression}`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("Const unavailable float")\nvalue = ${expression}`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'float', qualifier: 'const' });
    });
  }
});
