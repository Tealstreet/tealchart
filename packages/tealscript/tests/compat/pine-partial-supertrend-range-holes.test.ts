import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const helper = readFileSync(new URL('./fixtures/official-supertrend-helper.pine', import.meta.url), 'utf8');

describe('PARTIAL rank 812: documented Supertrend band recurrence', () => {
  it.each(['none', 'high', 'low', 'both'])(
    'follows the worked band recurrence with %s range holes and known current close',
    (hole) => {
      const result = runCompatScript(
        `//@version=6
indicator("Supertrend range holes")
${helper}
[expectedLine, expectedDirection] = pine_supertrend(2, 1)
[line, direction] = ta.supertrend(2, 1)
plot(expectedLine, title="Reference line")
plot(expectedDirection, title="Reference direction")
plot(line, title="Line")
plot(direction, title="Direction")`,
        {
          bars: [
            { time: 60_000, open: 10, high: 13, low: 8, close: 13, volume: 100 },
            { time: 120_000, open: 11, high: 12, low: 9, close: 12, volume: 100 },
            {
              time: 180_000,
              open: 11,
              high: hole === 'high' || hole === 'both' ? Number.NaN : 13,
              low: hole === 'low' || hole === 'both' ? Number.NaN : 10,
              close: 12,
              volume: 100,
            },
          ],
        },
      );

      expect(result.errors).toEqual([]);
      const expectedLine = hole === 'none' ? 17.5 : 18.5;
      expect(getPlot(result, 'Reference line').values[2]).toBe(expectedLine);
      expect(getPlot(result, 'Reference direction').values[2]).toBe(1);
      expect(getPlot(result, 'Line').values[2]).toBe(expectedLine);
      expect(getPlot(result, 'Direction').values[2]).toBe(1);
    },
  );
});
