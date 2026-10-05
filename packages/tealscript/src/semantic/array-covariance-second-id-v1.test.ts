import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.covariance';
const check = (call: string) => checkProgram(parse(`//@version=6
indicator("Covariance second ID")
type Point
    int value
ai = array.from(1, 2)
af = array.from(1.5, 2.5)
ab = array.from(false, true)
astr = array.from("alpha", "beta")
ap = array.from(Point.new(1), Point.new(2))
mi = matrix.new<int>(1, 2, 1)
mapid = map.new<string, int>()
${call}
`));

describe('documented numeric covariance second-ID contract', () => {
  for (const form of ['namespace', 'named', 'receiver'] as const) {
    it(`${form} rejects nonnumeric second IDs and preserves numeric/unknown controls`, () => {
      const call = (first: string, second: string) => form === 'receiver'
        ? `${first}.covariance(${second}, false)`
        : form === 'named' ? `array.covariance(id2=${second}, biased=false, id1=${first})`
          : `array.covariance(${first}, ${second}, false)`;
      for (const first of ['ai', 'af']) {
        for (const second of ['ai', 'af', 'array.new<float>()', 'na']) {
          expect(check(`result = ${call(first, second)}`).diagnostics, reference).toEqual([]);
        }
        for (const second of ['ab', 'astr', 'ap', 'mi', 'mapid', '17', '17.5', 'false', '"bad"']) {
          const errors = check(`result = ${call(first, second)}`).diagnostics;
          expect(errors.map((error) => error.code), `${reference}; ${second}`).toEqual(['type-mismatch']);
          expect(errors[0]?.message, reference).toContain('array.covariance id2 requires an array of int or float elements');
        }
      }
    });
  }
});
