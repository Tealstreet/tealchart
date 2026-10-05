import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Published v5 renames move atr/highest under ta without changing positions.
// Finite OHLC distinguishes true ranges [4,6,7] from closes [5,9,4].
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
const start = Date.UTC(2024, 0, 1);
const bars = [
  { time: start, open: 4, high: 7, low: 3, close: 5, volume: 100 },
  { time: start + 60_000, open: 8, high: 11, low: 8, close: 9, volume: 100 },
  { time: start + 120_000, open: 4, high: 6, low: 2, close: 4, volume: 100 },
];
const members = [
  { name: 'atr', args: '1', expected: [4, 6, 7] },
  { name: 'highest', args: 'close, 1', expected: [5, 9, 4] },
];
function source(version: number, call: string) {
  return `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("TA migration")\nplot(${call}, title="values")`;
}
function values(script: string) {
  const result = runCompatScript(script, { bars });
  expect(result.errors).toEqual([]);
  return getPlot(result, 'values').values;
}

describe('ledger gaps 8: ATR and highest namespace migration', () => {
  it.each(members)('accepts legacy v4 $name with the documented positional values', ({ name, args, expected }) => {
    const script = source(4, `${name}(${args})`);
    expect(checkProgram(parse(script)).diagnostics).toEqual([]);
    expect(values(script)).toEqual(expected);
  });

  for (const version of [5, 6]) {
    it.each(members)(`requires the ta namespace for $name in v${version}`, ({ name, args, expected }) => {
      expect(checkProgram(parse(source(version, `${name}(${args})`))).diagnostics).toEqual([
        expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining(`Use ta.${name}()`), severity: 'error' }),
      ]);
      const script = source(version, `ta.${name}(${args})`);
      expect(checkProgram(parse(script)).diagnostics).toEqual([]);
      expect(values(script)).toEqual(expected);
    });
  }
});
