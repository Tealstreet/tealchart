import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.size';

describe('array.size series int return contract', () => {
  for (const route of ['namespace', 'receiver'] as const) {
    it(`${route} returns series int and refuses const or simple destinations`, () => {
      const call = route === 'namespace' ? 'array.size(id=values)' : 'values.size()';
      const check = (suffix: string) =>
        checkProgram(
          parse(`//@version=6
indicator("Array length type")
values = array.new<int>(1, 17)
${suffix}`),
        );
      const valid = check(`observed = ${call}\nseries int accepted = ${call}`);
      expect(valid.diagnostics, reference).toEqual([]);
      expect(valid.symbols.find((symbol) => symbol.name === 'observed')?.type, reference).toEqual({
        kind: 'int',
        qualifier: 'series',
      });
      for (const qualifier of ['const', 'simple']) {
        expect(check(`${qualifier} int refused = ${call}`).diagnostics, reference).toEqual([
          expect.objectContaining({ code: 'qualifier-mismatch' }),
        ]);
      }
    });
  }
});
