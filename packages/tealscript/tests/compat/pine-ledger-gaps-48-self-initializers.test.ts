import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// V2 supports self-history initializers; v3 requires a declaration followed by reassignment.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-3/#self-referenced-variables-are-removed
const initializers = ['s = nz(s[1]) + close', 's = nz(s[1], 0) + close'];
const source = (version: number, body: string) => `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Self initializer boundary")\n${body}\nplot(s)`;

describe('ledger gaps 48: self-referencing initializer boundary', () => {
  it.each(initializers)('admits the documented v2 form %s', (body) => {
    expect(checkProgram(parse(source(2, body))).diagnostics).toEqual([]);
  });

  describe.each([3, 4, 5, 6])('from v%i', (version) => {
    it.each(initializers)('refuses %s', (body) => {
      expect(checkProgram(parse(source(version, body))).diagnostics).toEqual([
        expect.objectContaining({ code: 'unknown-identifier', severity: 'error', message: 'Unknown identifier: s' }),
      ]);
    });

    it.each(initializers)('admits the rewritten declaration and reassignment for %s', (body) => {
      expect(checkProgram(parse(source(version, `s = 0.0\n${body.replace('s = ', 's := ')}`))).diagnostics).toEqual([]);
    });
  });
});
