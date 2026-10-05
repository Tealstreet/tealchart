import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source =
  '//@version=6\nindicator("V7 analyst-target-availability-v6-v1")\nplot(syminfo.target_price_high,"HIGH")\nplot(syminfo.target_price_low,"LOW")\nplot(syminfo.target_price_median,"MEDIAN")\nplot(syminfo.target_price_average,"AVERAGE")\nplot(syminfo.target_price_date,"DATE")\nplot(syminfo.target_price_estimates,"ESTIMATES")\n';
const fields = {
  HIGH: 'target_price_high',
  LOW: 'target_price_low',
  MEDIAN: 'target_price_median',
  AVERAGE: 'target_price_average',
  DATE: 'target_price_date',
  ESTIMATES: 'target_price_estimates',
} as const;
describe('captured unavailable analyst-target fallback', () => {
  it('retains missing targets with no host analyst data', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '422e8f79569faac57bcccee64f907f7de606c8d1179c443b9d526e7611caba55',
    );
    const result = runCompatScript(source, {
      bars: compatibilityBars.slice(0, 3),
      engineOptions: { runtime: { syminfo: { tickerid: 'BINANCE:BTCUSDT', ticker: 'BTCUSDT', type: 'crypto' } } },
    });
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(6);
    for (const title of Object.keys(fields)) expect(getPlot(result, title).values).toEqual([null, null, null]);
  });
  it('preserves finite host values rather than forcing all target fields missing', () => {
    const supplied = {
      target_price_high: 405,
      target_price_low: 245,
      target_price_median: 340,
      target_price_average: 335.751907,
      target_price_date: 1790899200000,
      target_price_estimates: 35,
    };
    const result = runCompatScript(source, {
      bars: compatibilityBars.slice(0, 3),
      engineOptions: { runtime: { syminfo: { tickerid: 'BATS:AAPL', ticker: 'AAPL', type: 'stock', ...supplied } } },
    });
    expect(result.errors).toEqual([]);
    for (const [title, field] of Object.entries(fields))
      expect(getPlot(result, title).values).toEqual([supplied[field], supplied[field], supplied[field]]);
  });
});
