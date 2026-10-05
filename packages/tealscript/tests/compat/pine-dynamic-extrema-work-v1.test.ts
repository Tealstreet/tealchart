import type { Bar } from '../../src/runtime';

import { cpuUsage } from 'node:process';

import { describe, expect, it } from 'vitest';

import { NumericSeries } from '../../src/runtime/codegen/runtime';
import { getPlot, runCompatScript } from './fixtures';

function makeBars(values: number[]): Bar[] {
  return values.map((close, index) => ({
    time: 1_700_000_040_000 + index * 120_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000,
  }));
}

const extremaPlots = `
plot(ta.highest(source, length), "highest")
plot(ta.lowest(source, length), "lowest")
plot(ta.highestbars(source, length), "highestbars")
plot(ta.lowestbars(source, length), "lowestbars")
`;

describe('dynamic extrema window work', () => {
  it('computes 1536 bars within a fixed CPU and linear snapshot-work budget', () => {
    const length = 384;
    const bars = makeBars(Array.from({ length: 1_536 }, (_, index) => index + 1));
    const save = NumericSeries.prototype.save;
    let copiedSlots = 0;
    NumericSeries.prototype.save = function () {
      copiedSlots += this.capacity;
      return save.call(this);
    };
    const started = cpuUsage();
    let result: ReturnType<typeof runCompatScript>;
    try {
      result = runCompatScript(
        `//@version=6
indicator("Dynamic extrema work")
length = input.int(${length})
source = close
${extremaPlots}`,
        { bars },
      );
    } finally {
      NumericSeries.prototype.save = save;
    }
    const elapsed = cpuUsage(started);
    const cpuMicros = elapsed.user + elapsed.system;
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'highest').values).toEqual(
      bars.map((bar, index) => (index < length - 1 ? null : bar.close)),
    );
    expect(getPlot(result, 'lowest').values).toEqual(
      bars.map((_, index) => (index < length - 1 ? null : index - length + 2)),
    );
    expect(getPlot(result, 'highestbars').values).toEqual(bars.map((_, index) => (index < length - 1 ? null : 0)));
    expect(getPlot(result, 'lowestbars').values).toEqual(
      bars.map((_, index) => (index < length - 1 ? null : 1 - length)),
    );
    const evidence = `cpuMicros=${cpuMicros}; copiedSlots=${copiedSlots}`;
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpuMicros, evidence).toBeLessThan(1_000_000);
    }
    expect(copiedSlots, evidence).toBeLessThanOrEqual(4 * bars.length * length);
  }, 60_000);

  it('retains physical warmup, hole suffixes and older ties when length changes', () => {
    const bars = makeBars([7, 7, 3, 0, 6, 2, 2, 0, 0, 5, 5, 1]);
    const result = runCompatScript(
      `//@version=6
indicator("Changing extrema window")
length = input.int(3) + (bar_index >= 6 ? 1 : 0)
source = bar_index == 3 or bar_index == 7 or bar_index == 8 ? na : close
${extremaPlots}`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'highest').values).toEqual([null, null, 7, null, 6, 6, 6, null, null, 5, 5, 5]);
    expect(getPlot(result, 'lowest').values).toEqual([null, null, 3, null, 6, 2, 2, null, null, 5, 5, 1]);
    expect(getPlot(result, 'highestbars').values).toEqual([null, null, -2, 0, 0, -1, -2, 0, 0, 0, -1, -2]);
    expect(getPlot(result, 'lowestbars').values).toEqual([null, null, 0, 0, 0, 0, -1, 0, 0, 0, -1, 0]);
  });
});
