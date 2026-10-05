import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = Array.from({ length: 10002 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: index + 1,
  high: index + 1,
  low: index + 1,
  close: index + 1,
  volume: 1,
}));
const program = (offset: number) =>
  parse(`//@version=6\nindicator("Close historical ceiling")\nplot(close[${offset}])`);

// PARTIAL3: pine-v6 manual writing/limitations/#maximum-bars-back, close up to 10000.
describe('PARTIAL 3: builtin close historical buffer ceiling', () => {
  it('reads close exactly 10000 bars back, retaining initial missingness', () => {
    const result = executeScript(program(10000), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(0, 10000)).toEqual(Array(10000).fill(null));
    expect(result.plots[0].values.slice(10000)).toEqual([1, 2]);
  });

  it('surfaces a runtime error beyond the close 10000-bar ceiling', () => {
    const result = executeScript(program(10001), bars.slice(0, 1));
    expect(result.errors.some((error) => /Historical offset 10001.*10000/.test(error.message))).toBe(true);
  });
});
