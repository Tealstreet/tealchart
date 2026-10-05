import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, seedFootprints } from '../../src/runtime/requestDatafeed';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ledger1426–1428: member contracts from the first-party v6 reference.
// Hand-built host payload: aggregate buy/sell totals are distinct, and POC is
// the second row, whose volume and price bounds differ from the first row.
// This pins seeded accessors; host availability/release timing is separate.
// https://www.tradingview.com/pine-script-reference/v6/#fun_footprint.buy_volume
// https://www.tradingview.com/pine-script-reference/v6/#fun_footprint.sell_volume
// https://www.tradingview.com/pine-script-reference/v6/#fun_footprint.poc
describe('seeded footprint member values', () => {
  it.each(['namespace', 'receiver'] as const)('%s returns aggregate buy/sell volume and the POC row', (form) => {
    const member = (name: string) => (form === 'namespace' ? `footprint.${name}(id=fp)` : `fp.${name}()`);
    const bar = compatibilityBars[0]!;
    const requestDatafeed = new InMemoryRequestDatafeed();
    requestDatafeed.setFootprintContext(
      seedFootprints('TEST:ABC', '1', 10, 70, [
        {
          time: bar.time,
          totalVolume: 1200,
          buyVolume: 700,
          sellVolume: 500,
          pointOfControl: 101.5,
          rows: [
            { downPrice: 100, upPrice: 101, totalVolume: 350, buyVolume: 120, sellVolume: 230 },
            { downPrice: 101, upPrice: 102, totalVolume: 850, buyVolume: 580, sellVolume: 270 },
          ],
        },
      ]),
    );
    const result = runCompatScript(
      `//@version=6
indicator("Footprint members")
fp = request.footprint(10,70)
poc = ${member('poc')}
plot(${member('buy_volume')},title="Buy")
plot(${member('sell_volume')},title="Sell")
plot(volume_row.total_volume(poc),title="POC volume")
plot(volume_row.buy_volume(poc),title="POC buy")
plot(volume_row.sell_volume(poc),title="POC sell")
plot(volume_row.up_price(poc),title="POC up")
plot(volume_row.down_price(poc),title="POC down")
`,
      {
        bars: [bar],
        engineOptions: {
          requestDatafeed,
          runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'TEST:ABC', ticker: 'ABC' } },
        },
      },
    );
    expect(result.errors).toEqual([]);
    const expected = {
      Buy: 700,
      Sell: 500,
      'POC volume': 850,
      'POC buy': 580,
      'POC sell': 270,
      'POC up': 102,
      'POC down': 101,
    };
    for (const [title, value] of Object.entries(expected))
      expect(getPlot(result, title).values, title).toEqual([value]);
  });
});
