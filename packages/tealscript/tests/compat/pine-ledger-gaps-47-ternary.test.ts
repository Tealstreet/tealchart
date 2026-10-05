import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Rank1865: https://www.tradingview.com/pine-script-docs/language/type-system/#tuples
// Tuples are returned by local scopes; ternaries have no local scope.
function errors(body: string, version: number) {
  return checkProgram(parse(`//@version=${version}\nindicator("Tuple ternary")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

describe('ledger47 ternary tuple refusal', () => {
  for (const version of [5, 6]) {
    for (const [name, body] of [
      ['literal', '[a,b] = true ? [1,2] : [3,4]'],
      ['UDF', 'pair() => [1,2]\n[a,b] = true ? pair() : pair()'],
      ['UDF return', 'pair(bool flag) => flag ? [1,2] : [3,4]\n[a,b] = pair(true)'],
      ['TA', '[a,b,c] = true ? ta.macd(close,2,3,2) : ta.macd(close,2,3,2)'],
      [
        'method',
        'type Record\n    float price\nmethod pair(Record id) => [id.price,id.price]\nobject = Record.new(7)\n[a,b] = true ? object.pair() : object.pair()',
      ],
    ]) {
      it(`v${version} refuses ${name} tuple arms`, () => {
        expect(errors(body, version).some((d) => /ternary.*tuple/i.test(d.message))).toBe(true);
      });
    }
    for (const [name, body] of [
      ['if', '[a,b] = if true\n    [1,2]\nelse\n    [3,4]'],
      ['switch', '[a,b] = switch\n    true => [1,2]\n    => [3,4]'],
      ['scalar', 'value = true ? 1 : 2'],
      ['scalar UDF', 'pair() => 7\nvalue = true ? pair() : 2'],
      ['array IDs', 'first = array.from(1,2)\nsecond = array.from(3,4)\nvalue = true ? first : second'],
    ]) {
      it(`v${version} retains ${name} control`, () => {
        expect(errors(body, version)).toEqual([]);
      });
    }
  }
});
