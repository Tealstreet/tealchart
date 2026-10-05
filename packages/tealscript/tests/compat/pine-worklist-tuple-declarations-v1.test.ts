import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const errors = (body: string) => checkProgram(parse(`//@version=6\nindicator("Tuples")\n${body}`))
  .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Ranks 1670/1795: one name per result; tuple declarations use default mode.
// https://www.tradingview.com/pine-script-docs/language/variable-declarations/
describe('worklist tuple declaration boundaries', () => {
  for (const names of ['[first]', '[first, second, third]']) {
    it(`refuses ${names} for two returned values`, () => {
      expect(errors(`pair() => [close, open]\n${names} = pair()`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'tuple-shape-mismatch' }),
      ]));
    });
  }

  for (const mode of ['var', 'varip']) {
    it(`refuses ${mode} tuple declarations`, () => {
      expect(errors(`${mode} [first, second] = [close, open]`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-tuple-declaration' }),
      ]));
    });
  }

  it('accepts default-mode matching arity and discard identifiers', () => {
    expect(errors('pair() => [close, open]\n[first, _] = pair()\nplot(first)')).toEqual([]);
  });
});
