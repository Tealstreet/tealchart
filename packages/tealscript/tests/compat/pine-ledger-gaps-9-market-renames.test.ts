import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Ranks323/333: version-rules-v1#48/#44; reference/pine-v6-reference-v1.json syminfo.tickerid/timeframe.period.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
const renames = [
  { old: 'tickerid', modern: 'syminfo.tickerid', expected: 'NASDAQ:AAPL' },
  { old: 'period', modern: 'timeframe.period', expected: '240' },
];

describe('LEGACY-MARKET-VARIABLE-RENAMES', () => {
  it.each(renames)('moves $old to $modern at v4 without breaking user shadowing', ({ old, modern, expected }) => {
    const source = (version: number, variable: string, declaration = '') =>
      `//@version=${version}\nstudy("market variable rename")\n${declaration}\nplot(${variable} == "${expected}" ? 1 : 0, title="metadata")`;
    const options = {
      engineOptions: {
        runtime: {
          syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL', prefix: 'NASDAQ' },
          timeframe: { period: '240' },
        },
      },
    };
    expect(checkProgram(parse(source(3, old))).diagnostics).toEqual([]);
    const legacy = runCompatScript(source(3, old), options);
    expect(legacy.errors).toEqual([]);
    expect(getPlot(legacy, 'metadata').values).toEqual(Array(12).fill(1));
    const current = runCompatScript(source(4, modern), options);
    expect(current.errors).toEqual([]);
    expect(getPlot(current, 'metadata').values).toEqual(Array(12).fill(1));
    expect(
      checkProgram(parse(source(4, old))).diagnostics.some(
        (diagnostic) => diagnostic.code === 'version-mismatch' && diagnostic.message.includes(old),
      ),
    ).toBe(true);
    const shadow = runCompatScript(source(4, old, `${old} = "${expected}"`));
    expect(shadow.errors).toEqual([]);
    expect(getPlot(shadow, 'metadata').values).toEqual(Array(12).fill(1));
  });
});
