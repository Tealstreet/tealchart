import type { PlotOutput } from '../../src/runtime';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { compatibilityBars } from './fixtures';
import { measureProductionWorkerSessions } from './productionWorkerHarness';

// Rank334: realtime-barstate-v1#33; fill outputs replace the open bar on updates.
// https://www.tradingview.com/pine-script-reference/v6/ functions[58]/[59].
// https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
afterEach(() => vi.unstubAllGlobals());

const masks = [
  { name: 'plots', declarations: 'a = plot(2)\nb = plot(1)' },
  { name: 'hlines', declarations: 'a = hline(2)\nb = hline(1)' },
];

describe('fill realtime output replacement', () => {
  it.each(masks)('replaces the final $name fill value and color on every tick', async ({ name, declarations }) => {
    const last = compatibilityBars[compatibilityBars.length - 1]!;
    const liveUpdateBars = [113, 111, 114].map((close) => ({ ...last, close, high: Math.max(last.high, close) }));
    const session = await measureProductionWorkerSessions(
      [
        {
          scriptId: `fill-replacement-${name}`,
          source: `//@version=6\nindicator("fill replacement")\n${declarations}\nfill(a, b, color=close > 112 ? #336699 : na, title="band")`,
          bars: compatibilityBars,
          liveUpdateBars,
        },
      ],
      { includeLiveUpdates: true, includeOutputs: true },
    );
    const measurements = [...session.loadMeasurements, ...session.updateMeasurements];
    expect(measurements).toHaveLength(4);
    const colors = [null, '#336699', null, '#336699'];
    const ids: string[] = [];
    for (const [index, measurement] of measurements.entries()) {
      expect(measurement.error).toBeUndefined();
      const fills = (measurement.output?.plots as PlotOutput[]).filter((plot) => plot.type === 'fill');
      expect(fills).toHaveLength(1);
      const fill = fills[0]!;
      ids.push(fill.id);
      expect(fill.values).toEqual([...Array(11).fill(null), colors[index] === null ? null : 1]);
      expect(fill.color).toEqual([...Array(11).fill(null), colors[index]]);
    }
    expect(new Set(ids).size).toBe(1);
  });
});
