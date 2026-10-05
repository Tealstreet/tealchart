import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const header = (version: number) => `//@version=${version}
indicator("Array biased option type")
type Point
    int value
method stdev(Point receiver, string biased) => biased
method variance(Point receiver, string biased) => biased
method covariance(Point receiver, string biased) => biased
ai = array.from(1, 2)
af = array.from(1.5, 2.5)
inputBias = input.bool(false)
simple bool simpleBias = true
seriesBias = close > open
p = Point.new(1)
`;

describe('array statistical biased options use documented bool kinds', () => {
  for (const member of ['stdev', 'variance', 'covariance']) {
    it(`${member} checks namespace/named/receiver biased arguments and preserves version controls`, () => {
      const reference = `https://www.tradingview.com/pine-script-reference/v6/#fun_array.${member}`;
      for (const version of [6, 5]) {
        for (const form of ['namespace', 'named', 'receiver']) {
          const call = (biased?: string) => {
            if (form === 'receiver') return `ai.${member}(${member === 'covariance' ? 'af' : ''}${biased === undefined ? '' : `${member === 'covariance' ? ', ' : ''}${biased}`})`;
            if (form === 'named') return `array.${member}(${biased === undefined ? '' : `biased=${biased}, `}${member === 'covariance' ? 'id2=af, id1=ai' : 'id=ai'})`;
            return `array.${member}(ai${member === 'covariance' ? ', af' : ''}${biased === undefined ? '' : `, ${biased}`})`;
          };
          const check = (biased?: string) => checkProgram(parse(`${header(version)}shadow = p.${member}("custom method string")\nresult = ${call(biased)}`)).diagnostics;
          for (const value of ['"wrong"', 'array.from(true)', 'matrix.new<int>(1, 1, 1)', 'p', 'color.red']) {
            expect(check(value).map((error) => error.code), `${reference}; v${version}; ${form}; ${value}`).toEqual(['type-mismatch']);
            expect(check(value)[0]?.message, reference).toContain(`array.${member} biased must be a boolean`);
          }
          for (const value of ['0', '1', '2.5', 'input.int(1)', 'close']) {
            const errors = check(value);
            expect(errors.map((error) => error.code), `${reference}; v${version}; ${form}; ${value}`).toEqual(version === 6 ? ['type-mismatch'] : []);
          }
          for (const value of [undefined, 'true', 'false', 'inputBias', 'simpleBias', 'seriesBias']) {
            expect(check(value), `${reference}; v${version}; ${form}; ${value}`).toEqual([]);
          }
        }
      }
    });
  }
});
