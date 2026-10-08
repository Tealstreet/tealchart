import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Authorities: https://www.tradingview.com/pine-script-reference/v6/, ta.macd/ta.cross/ta.valuewhen/ta.vwma;
// migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables.
const source = (version: number, body: string) => `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("TA rename")\n${body}\nplot(x, title="Value")`;
const errors = (script: string) => checkProgram(parse(script)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger gaps648/656/669/674 TA namespace migration', () => {
  // Each row preserves positional calls through its documented v4 to v5 rename.
  it.each([
    ['macd', '[x, s, h] = NAME(close, 2, 3, 2)'],
    ['cross', 'x = NAME(close, open) ? 1 : 0'],
    ['valuewhen', 'x = NAME(bar_index % 2 == 0, close, 0)'],
    ['vwma', 'x = NAME(close, 2)'],
  ])('%s moves from the legacy global name into ta', (name, body) => {
    const legacy = body.replace('NAME', name);
    const modern = body.replace('NAME', `ta.${name}`);
    expect(errors(source(4, legacy))).toEqual([]);
    expect(errors(source(5, modern))).toEqual([]);
    expect(errors(source(5, legacy))).not.toEqual([]);
    const before = runCompatScript(source(4, legacy));
    const after = runCompatScript(source(5, modern));
    expect(before.errors).toEqual([]);
    expect(after.errors).toEqual([]);
    expect(getPlot(before, 'Value').values.slice(1)).toEqual(getPlot(after, 'Value').values.slice(1));
  });
});
