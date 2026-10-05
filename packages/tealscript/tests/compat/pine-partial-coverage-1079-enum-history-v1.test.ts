import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

describe('PARTIAL 1079: enum unavailable history through typed parameters', () => {
  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json:
  // entries12 (enum),28 (history initial-na example),53 (unavailable value).
  for (const parameter of [false, true]) {
    it(`${parameter ? 'typed parameter' : 'root'} preserves unavailable and previous enum values`, () => {
      const bars = [0, 1, 2].map((index) => ({ time: index * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
      const source = `//@version=6
indicator("Enum unavailable history")
enum Side
    buy
    sell
prior(Side value) => value[1]
current = bar_index % 2 == 0 ? Side.buy : Side.sell
previous = ${parameter ? 'prior(current)' : 'current[1]'}
plot(na(previous) ? 1 : 0, "missing")
plot(na(previous) ? 0 : previous == Side.buy ? 11 : 22, "previous")`;
      const result = executeScript(parse(source), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(2);
      expect(result.plots[0]!.values).toEqual([1, 0, 0]);
      expect(result.plots[1]!.values).toEqual([0, 11, 22]);
    });
  }
});
