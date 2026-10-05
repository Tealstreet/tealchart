import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const cases = [
  { kind: 'float', source: 'bar_index == 0 ? 1.5 : bar_index == 2 ? 2.5 : float(na)', plotted: 'fixed', expected: [1.5, 1.5, 2.5, 2.5] },
  { kind: 'int', source: 'bar_index == 0 ? 2 : bar_index == 2 ? 4 : int(na)', plotted: 'fixed', expected: [2, 2, 4, 4] },
  { kind: 'color', source: 'bar_index == 0 ? color.red : bar_index == 2 ? color.green : color(na)', plotted: 'fixed == color.red ? 1 : fixed == color.green ? 2 : 0', expected: [1, 1, 2, 2] },
] as const;

describe('documented fixnan replacement values', () => {
  for (const item of cases) {
    it(`replaces missing ${item.kind} with the nearest preceding defined value`, () => {
      const bars = [1, 2, 3, 4].map((close, index) => ({ time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1 }));
      const result = executeScript(parse(`//@version=6
indicator("fixnan values")
source = ${item.source}
fixed = fixnan(source)
plot(${item.plotted})
`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual(item.expected);
    });
  }
});
