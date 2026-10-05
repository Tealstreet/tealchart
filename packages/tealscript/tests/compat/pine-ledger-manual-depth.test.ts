import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 435/439: execution-model-v1#51 and series-history-na-v3#36.
// A target hint must retain the requested depth, including the current slot.
const bars: Bar[] = Array.from({ length: 701 }, (_, index) => {
  const close = (index * 29) % 97 - 48;
  return { time: (index + 1) * 60_000, open: close + 3, high: close + 7, low: close - 3, close, volume: 10 };
});

describe('manual target historical depth', () => {
  it('retains the hinted builtin and user-variable depth for a dynamic late reference [rows 435/439]', () => {
    for (const [setup, argumentsText, target, increment] of [
      ['', 'close, 700', 'close', 0],
      ['', 'close, num=700', 'close', 0],
      ['stored = close + 1', 'stored, 700', 'stored', 1],
    ] as const) {
      const ast = parse(`//@version=6\nindicator("Manual target depth")\n${setup}\nmax_bars_back(${argumentsText})\ndepth = barstate.islast ? 700 : 0\nplot(${target}[depth])`);
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(1);
      const expected = bars.map((bar) => bar.close + increment);
      expected[700] = -48 + increment;
      expect(result.plots[0].values).toEqual(expected);
    }
  });
});
