import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Official v6 reference: barstate.isnew; ta.alma/ta.swma remarks and examples.
// Small constructed prices, never TradingView input rows.
const bars = Array.from({ length: 10 }, (_, i) => ({
  time: 1_700_000_000_000 + i * 60000,
  open: i + 1,
  high: i + 2,
  low: i,
  close: i + 1,
  volume: 10,
}));
describe('ledger1111-1115 SWMA', () => {
  it('has three warmup holes, four physical hole outputs and exact1/2/2/1 weighting', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("SWMA")\ns = bar_index == 5 ? na : close\nplot(ta.swma(s), "out")',
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values).toEqual([null, null, null, 2.5, 3.5, null, null, null, null, 8.5]);
  });
  it.each([
    [3, 'study', 'swma(x=close)'],
    [4, 'study', 'swma(x=close)'],
    [5, 'indicator', 'ta.swma(source=close)'],
    [6, 'indicator', 'ta.swma(source=close)'],
  ] as const)('binds version%s named slot', (version, declaration, call) => {
    const source = `//@version=${version}\n${declaration}("SWMA")\nplot(${call}, "out")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values.slice(0, 5)).toEqual([null, null, null, 2.5, 3.5]);
  });
  it.each([3, 4, 5, 6])('refuses the obsolete named slot in version%s', (version) => {
    const call = version < 5 ? 'swma(source=close)' : 'ta.swma(x=close)';
    expect(
      checkProgram(
        parse(`//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("SWMA")\nplot(${call})`),
      ).diagnostics.some((d) => d.severity === 'error'),
    ).toBe(true);
  });
});
