import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Rank331: type-qualifier-system-v3#366; reference/pine-v6-reference-v1.json functions[181].
// ta.lowest:length allows const/input/simple/series int, while source admits int or float.
const authority = 'https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest';
const bindings = [
  { name: 'positional', call: (length: string) => `ta.lowest(close, ${length})`, values: [108, 108, 110] },
  { name: 'named', call: (length: string) => `ta.lowest(length=${length}, source=close)`, values: [108, 108, 110] },
  { name: 'default-low', call: (length: string) => `ta.lowest(${length})`, values: [103, 106, 107] },
];
const qualifiers = [
  { name: 'const', bad: 'float n = 3.0', good: 'int n = 3' },
  { name: 'input', bad: 'n = input.float(3.0)', good: 'n = input.int(3)' },
  { name: 'simple', bad: 'simple float n = 3.0', good: 'simple int n = 3' },
  { name: 'series', bad: 'float n = bar_index % 2 == 0 ? 2.0 : 3.0', good: 'int n = bar_index >= 0 ? 3 : 2' },
];

describe('TA-LOWEST-LENGTH-INT: documented length kind', () => {
  it.each(bindings.flatMap((binding) => qualifiers.map((qualifier) => ({ ...binding, qualifier }))))(
    '$name rejects $qualifier.name float length and preserves integer control',
    ({ call, values, qualifier }) => {
      const source = (declaration: string) =>
        `//@version=6\nindicator("lowest length kind")\n${declaration}\nplot(${call('n')}, "minimum")`;
      const diagnostics = checkProgram(parse(source(qualifier.bad))).diagnostics;
      expect(
        diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch' && diagnostic.message.includes('length')),
        authority,
      ).toBe(true);
      expect(checkProgram(parse(source(qualifier.good))).diagnostics, authority).toEqual([]);
      const result = runCompatScript(source(qualifier.good));
      expect(result.errors, authority).toEqual([]);
      if (qualifier.name === 'series') expect(getPlot(result, 'minimum').values.slice(-3), authority).toEqual(values);
    },
  );
});
