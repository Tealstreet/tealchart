import type { PlotOutput } from '../../src/runtime';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { compatibilityBars } from './fixtures';
import { measureProductionWorkerSessions } from './productionWorkerHarness';

// Rank1609: https://www.tradingview.com/pine-script-reference/v6/ functions[680].
// Caller execution authority: https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
const library = parse(
  '//@version=6\nlibrary("Live", true)\nexport sample(float value) => value * 2\nexport live() => barstate.isrealtime ? 1 : 0',
);
afterEach(() => vi.unstubAllGlobals());

describe('imported library caller realtime executions', () => {
  it('updates imported calculations and caller barstate on each same-bar tick', async () => {
    const last = compatibilityBars[11]!;
    const liveUpdateBars = [113, 111, 114].map((close) => ({ ...last, close, high: Math.max(last.high, close) }));
    const session = await measureProductionWorkerSessions(
      [
        {
          scriptId: 'library-realtime',
          source:
            '//@version=6\nindicator("library caller")\nimport Test/Live/1 as live\nplot(live.sample(close), "sample")\nplot(live.live(), "realtime")',
          bars: compatibilityBars,
          liveUpdateBars,
          engineOptions: { libraries: new Map([['Test/Live/1', library]]) },
        },
      ],
      { includeLiveUpdates: true, includeOutputs: true },
    );
    const measurements = [...session.loadMeasurements, ...session.updateMeasurements];
    expect(measurements).toHaveLength(4);
    const tails = [224, 226, 222, 228];
    for (const [index, measurement] of measurements.entries()) {
      expect(measurement.error).toBeUndefined();
      const plots = measurement.output?.plots as PlotOutput[];
      expect(plots.find((plot) => plot.title === 'sample')?.values).toEqual([
        ...compatibilityBars.slice(0, 11).map((bar) => bar.close * 2),
        tails[index],
      ]);
      expect(plots.find((plot) => plot.title === 'realtime')?.values).toEqual([
        ...Array(11).fill(0),
        index === 0 ? 0 : 1,
      ]);
    }
  });
});
