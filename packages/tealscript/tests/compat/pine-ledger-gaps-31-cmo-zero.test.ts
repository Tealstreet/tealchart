import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("CMO zero movement")\n';
describe('ledger31 CMO zero movement', () => {
  it('zero total movement yields na after warmup, rank1213', () => {
    const result = runCompatScript(header + 'plot(ta.cmo(7, 2), title="Flat")', { bars: compatibilityBars });
    expect(result.errors).toEqual([]);
    // The documented same-on-Pine formula is 100*(gain-loss)/(gain+loss), hence 0/0.
    expect(getPlot(result, 'Flat').values).toEqual(compatibilityBars.map(() => null));
  });
  it('retains gain/loss arithmetic on finite non-flat input, rank1213 control', () => {
    const bars = [10, 12, 9, 15].map((close, index) => ({
      ...compatibilityBars[0]!,
      close,
      time: compatibilityBars[0]!.time + index * 60_000,
    }));
    const result = runCompatScript(header + 'plot(ta.cmo(close, 2), title="Moving")', { bars });
    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Moving').values)).toEqual([null, null, -20, 33.333333]);
  });
});
