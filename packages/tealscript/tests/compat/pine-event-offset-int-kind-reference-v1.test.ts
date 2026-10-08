import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Event and extrema offsets retain integer return types', () => {
  const cases = [
    {
      member: 'highestbars',
      args: 'close, 3',
      named: 'length = 3, source = close',
      expected: [-1, 0, -1, -2, 0, -1, -2, 0, -1, -2],
    },
    {
      member: 'lowestbars',
      args: 'close, 3',
      named: 'length = 3, source = close',
      expected: [-2, -1, 0, 0, -1, -2, 0, -1, -2, 0],
    },
    {
      member: 'barssince',
      args: 'bar_index % 3 == 0',
      named: 'condition = bar_index % 3 == 0',
      expected: [2, 0, 1, 2, 0, 1, 2, 0, 1, 2],
    },
  ];
  for (const version of [5, 6]) {
    for (const item of cases) {
      it(`v${version} ${item.member} feeds int bindings and storage`, () => {
        const script = `//@version=${version}
indicator("Integer offsets")
int positional = ta.${item.member}(${item.args})
int named = ta.${item.member}(${item.named})
var array<int> stored = array.new<int>()
array.push(stored, positional)
array.push(stored, named)
plot(array.get(stored, array.size(stored) - 2), "Positional")
plot(array.get(stored, array.size(stored) - 1), "Named")`;
        expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
          [],
        );
        const source = [1, 3, 2, 4, 0, -2, 5, 1, -1, 6, 2, -3];
        const result = runCompatScript(script, {
          bars: compatibilityBars.map((bar, i) => ({ ...bar, close: source[i] })),
        });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const title of ['Positional', 'Named'])
          expect(getPlot(result, title).values.slice(2)).toEqual(item.expected);
      });
    }
  }
});
