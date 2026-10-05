import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ticker.modify
// Explicit inherit retains a setting already carried by the incoming ticker ID.
describe('ticker.modify incoming futures flag inheritance', () => {
  const bars = compatibilityBars.slice(0, 3);
  for (const namespace of ['backadjustment', 'settlement_as_close']) {
    for (const setting of ['on', 'off']) {
      for (const explicit of [false, true]) {
        it(`${namespace} ${setting} survives ${explicit ? 'explicit inherit' : 'omission'}`, () => {
          const qualified = `CME:ES1!|${namespace}=${setting}`;
          const feed = new InMemoryRequestDatafeed([
            { symbol: 'CME:ES1!', timeframe: '1', bars: bars.map((bar) => ({ ...bar, close: 10 })) },
            { symbol: qualified, timeframe: '1', bars: bars.map((bar) => ({ ...bar, close: 30 })) },
          ]);
          const result = runCompatScript(
            `//@version=6
indicator("Modify inherit routing")
original = ticker.new("CME", "ES1!", ${namespace}=${namespace}.${setting})
modified = ticker.modify(original${explicit ? `, ${namespace}=${namespace}.inherit` : ''})
plot(request.security(modified, "1", close, lookahead=barmerge.lookahead_on), title="Selected")`,
            {
              bars,
              engineOptions: {
                requestDatafeed: feed,
                runtime: { timeframe: { period: '1' }, syminfo: { session: 'regular' } },
              },
            },
          );
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'Selected').values).toEqual([30, 30, 30]);
        });
      }
    }
  }
});
