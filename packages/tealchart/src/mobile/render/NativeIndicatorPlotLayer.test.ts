import type { PlotOutput } from '@tealstreet/tealscript';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { describe, expect, it } from 'vitest';

import { getNativeIndicatorPlotPoints } from './NativeIndicatorPlotLayer';

function bar(sourceIndex: number, time: number): NativeVisibleBar {
  return {
    close: 100 + sourceIndex,
    high: 101 + sourceIndex,
    interval: 1_000,
    low: 99 + sourceIndex,
    open: 100 + sourceIndex,
    sourceIndex,
    time,
    volume: 10,
    x: time / 100,
  };
}

function plot(overrides: Partial<PlotOutput> = {}): PlotOutput {
  return {
    color: '#00bcd4',
    id: 'plot',
    title: 'Plot',
    type: 'plot',
    values: [10, 11, 12, 13, 14],
    ...overrides,
  } as PlotOutput;
}

describe('NativeIndicatorPlotLayer', () => {
  it('aligns visible bars to original indicator value indexes', () => {
    const points = getNativeIndicatorPlotPoints({
      plot: plot(),
      totalBarCount: 5,
      visibleBars: [bar(2, 20_000), bar(3, 30_000)],
    });

    expect(points).toEqual([
      { interval: 1_000, time: 20_000, value: 12 },
      { interval: 1_000, time: 30_000, value: 13 },
    ]);
  });

  it('applies plot offset and showLast before drawing points', () => {
    const points = getNativeIndicatorPlotPoints({
      plot: plot({ offset: 2, showLast: 2 }),
      totalBarCount: 5,
      visibleBars: [bar(1, 10_000), bar(2, 20_000), bar(3, 30_000), bar(4, 40_000)],
    });

    expect(points).toEqual([
      { interval: 1_000, time: 32_000, value: 13 },
      { interval: 1_000, time: 42_000, value: 14 },
    ]);
  });
});
