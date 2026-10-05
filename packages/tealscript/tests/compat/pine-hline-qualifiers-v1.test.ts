import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Hline qualifiers")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

describe('Pine fixed horizontal line argument qualifiers', () => {
  // functions[56] price accepts input/const numbers; simple and series are stronger.
  // Typed/aliased controls prevent rejecting only an obvious built-in identifier.
  for (const [kind, value] of [
    ['series price', 'close'],
    ['aliased series price', 'level'],
    ['simple price', 'syminfo.mintick'],
  ]) {
    it(`refuses ${kind} [functions[56]:price]`, () => {
      const diagnostics = errors(`level = close\nhline(${value})`);
      expect(diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('price') }),
        ]),
      );
    });
  }

  for (const value of ['100', 'input.float(100.5)']) {
    it(`accepts ${value} price [functions[56]:price]`, () => {
      expect(errors(`hline(${value}, color=#123456)`)).toEqual([]);
    });
  }

  // Color prose/type table conflict concerns input colors. Series is disallowed
  // by both, so this refusal does not choose between the competing authorities.
  for (const [kind, condition] of [
    ['simple', 'syminfo.mintick > 0'],
    ['series', 'close > open'],
  ]) {
    it(`refuses a returning ${kind} hline color [functions[56]:color]`, () => {
      expect(errors(`c = ${condition} ? #123456 : #654321\nhline(100, color=c)`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('color') }),
        ]),
      );
    });
  }
});
