import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, seedEconomicSeries } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// The requested symbol has the same bar grid, isolating provider dispatch.
const bars = compatibilityBars.slice(0, 4);

describe('economic series within a requested expression', () => {
  for (const named of [false, true]) {
    for (const gaps of ['gaps_off', 'gaps_on']) {
      it(`forwards ${named ? 'named' : 'positional'} economic arguments with ${gaps}`, () => {
        const requestDatafeed = new InMemoryRequestDatafeed(
          [{ symbol: 'OTHER', timeframe: '1', bars, syminfo: { ticker: 'OTHER', timezone: 'UTC' } }],
          [],
          [],
          [
            seedEconomicSeries('US', 'GDP', [
              { time: bars[0]!.time, value: 3.1 },
              { time: bars[2]!.time, value: 3.3 },
            ]),
          ],
        );
        const args = named ? `field="GDP", gaps=barmerge.${gaps}, country_code="US"` : `"US", "GDP", barmerge.${gaps}`;
        const result = runCompatScript(
          `//@version=6
indicator("Nested economic")
plot(request.security("OTHER", "1", request.economic(${args})), "Requested GDP")
`,
          { bars, engineOptions: { requestDatafeed, runtime: { timeframe: { period: '1', multiplier: 1 } } } },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Requested GDP').values).toEqual(
          gaps === 'gaps_on' ? [3.1, null, 3.3, null] : [3.1, 3.1, 3.3, 3.3],
        );
      });
    }
  }
});
