import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from';
const cases = [
  { name: 'int', value: '17', limit: 4000 },
  { name: 'float', value: '17.5', limit: 4000 },
  { name: 'bool', value: 'false', limit: 4000 },
  { name: 'color', value: 'color.red', limit: 4000 },
  { name: 'string', value: '"seventeen"', limit: 999 },
  { name: 'UDT', value: 'Point.new(17)', limit: 999 },
  { name: 'enum', value: 'Side.buy', limit: 999 },
] as const;

const source = (value: string, count: number): string => `//@version=6
indicator("array.from arity")
type Point
    int value
enum Side
    buy
    sell
a = array.from(${Array.from({ length: count }, () => value).join(', ')})
`;

describe('documented array.from variadic argument limits', () => {
  for (const { name, value, limit } of cases) {
    it(`accepts ${limit} ${name} arguments and rejects ${limit + 1}`, () => {
      expect(checkProgram(parse(source(value, limit))).diagnostics, reference).toEqual([]);
      expect(checkProgram(parse(source(value, limit + 1))).diagnostics, reference).toEqual([
        expect.objectContaining({ code: 'argument-count' }),
      ]);
    }, 90_000); // Checking two maximum-size calls can exceed 30s under shared CPU load.
  }
});
