import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Ranks1622-1624: https://www.tradingview.com/pine-script-reference/v6/ variables[23]/[24], functions[166].
// Namespace migration: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#renamed-functions-and-variables
const bars = [3, 1, 3, 2, 2].map((close, index) => ({ time: 1700000000000 + index * 60000, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 100 }));
const cases = [
  { old: 'wad', modern: 'ta.wad', values: [0, -2, 0, -1, -1] },
  { old: 'wvad', modern: 'ta.wvad', values: [25, 25, 25, 25, 25] },
  { old: 'mode(close, 2)', modern: 'ta.mode(close, 2)', values: [null, 1, 1, 2, 2] },
];

describe('Williams and mode namespace migrations', () => {
  it.each(cases)('moves $old to $modern at v5', ({ old, modern, values }) => {
    const source = (version: number, expression: string) => `//@version=${version}\nindicator("namespace migration")\nplot(${expression}, "value")`;
    for (const [version, expression] of [[4, old], [5, modern], [6, modern]] as const) {
      expect(checkProgram(parse(source(version, expression))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = runCompatScript(source(version, expression), { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual(values);
    }
    for (const version of [5, 6]) {
      expect(checkProgram(parse(source(version, old))).diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 'error', message: expect.stringContaining(old.split('(')[0]!) })]));
    }
  });
});
