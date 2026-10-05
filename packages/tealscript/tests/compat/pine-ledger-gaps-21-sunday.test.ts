import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, const_dayofweek.sunday.
// Rename: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
describe('ledger823 Sunday namespace boundary', () => {
  it.each([[3, 'sunday'], [4, 'dayofweek.sunday'], [6, 'dayofweek.sunday']] as const)('accepts Pine%s %s', (version, expression) => {
    const source = `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Sunday")\nplot(${expression}, "Sunday")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Sunday').values).toEqual([1]);
  });
  it('refuses obsolete bare sunday in v4', () => {
    const source = '//@version=4\nstudy("Sunday")\nplot(sunday)';
    expect(checkProgram(parse(source)).diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('sunday') })]));
  });
});
