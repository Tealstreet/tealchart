import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  ['bool', 'bar_index != 1 and bar_index != 5', 'sampled ? 1 : 0', [1, 1, 0, 0], [0, 0, 1, 1]],
  ['color', 'bar_index == 1 or bar_index == 5 ? color.red : bar_index == 3 ? color.blue : color.green',
    'sampled == color.red ? 1 : 0', [0, 0, 1, 1], [1, 1, 0, 0]],
] as const;

it.each(cases)('ta.valuewhen samples %s source values at event occurrences', (kind, source, encode, recent, previous) => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[188/189]: bool/color source at the nth most recent true condition; rank zero is newest.
  // Assertions start after two events, excluding insufficient-event and missing-source behavior.
  const bars = Array.from({ length: 7 }, (_, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 10, high: 11, low: 9, close: 10, volume: 100,
  }));
  for (const [occurrence, expected] of [[0, recent], [1, previous]] as const) {
    const result = runCompatScript(`//@version=6
indicator("Documented ${kind} event selection")
event = bar_index == 1 or bar_index == 3 or bar_index == 5
source = ${source}
sampled = ta.valuewhen(condition=event, source=source, occurrence=${occurrence})
plot(${encode}, "Selected")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Selected').values.slice(3)).toEqual(expected);
  }
});
