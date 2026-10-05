import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { getIndicatorOutputReadouts, resolveIndicatorReadoutSourceIndex } from './indicatorOutputReadouts';

const plot = (overrides: Partial<PlotOutput>): PlotOutput => ({
  id: 'plot',
  type: 'plot',
  title: 'Value',
  scriptId: 'study',
  values: [10.123, 20.456, null],
  color: '#ff0000',
  ...overrides,
});

describe('Pine numeric output readouts', () => {
  it('retains suppressed zero marker values in numeric readouts', () => {
    const marker = plot({ type: 'plotshape', values: [null], displayValues: [0], precision: 0 });
    expect(getIndicatorOutputReadouts({ plots: [marker], totalBarCount: 1 })[0].values).toEqual(['0']);
  });

  it('resolves hovered loaded bars across time gaps and resets to latest on leave', () => {
    const bars = [1000, 2000, 10000, 11000].map((time) => ({ time }));
    expect(resolveIndicatorReadoutSourceIndex(bars, 10000)).toBe(2);
    expect(resolveIndicatorReadoutSourceIndex(bars, 1900)).toBe(1);
    expect(resolveIndicatorReadoutSourceIndex(bars, 6000)).toBe(1);
    expect(resolveIndicatorReadoutSourceIndex(bars)).toBeUndefined();
  });
  it('uses independent status-line and data-window bits, titles, and plot format overrides', () => {
    const result = getIndicatorOutputReadouts({
      plots: [
        plot({ id: 'status', display: 4, format: 'percent', precision: 1 }),
        plot({ id: 'data', display: 2 }),
        plot({ id: 'none', display: 0 }),
      ],
      sourceIndex: 1,
      totalBarCount: 3,
      pricePrecision: 0.01,
      indicatorPaneInfo: { study: { overlay: false, format: 'price', precision: 3 } },
    });
    expect(result).toEqual([
      expect.objectContaining({
        plotId: 'status',
        title: 'Value',
        values: ['20.5%'],
        statusLine: true,
        dataWindow: false,
      }),
      expect.objectContaining({
        plotId: 'data',
        title: 'Value',
        values: ['20.456'],
        statusLine: false,
        dataWindow: true,
      }),
    ]);
  });

  it('shows na on the selected bar without backfilling and masks values outside show_last', () => {
    const result = getIndicatorOutputReadouts({
      plots: [plot({ offset: 100, showLast: 1 })],
      totalBarCount: 3,
      sourceIndex: 0,
      pricePrecision: 0.01,
    });
    expect(result[0].values).toEqual(['na']);
    expect(
      getIndicatorOutputReadouts({
        plots: [plot({ offset: 100 })],
        totalBarCount: 3,
        sourceIndex: 0,
        pricePrecision: 0.01,
      })[0].values,
    ).toEqual(['10.12']);
    expect(getIndicatorOutputReadouts({ plots: [plot({})], totalBarCount: 3 })[0].values).toEqual(['na']);
  });

  it('includes OHLC readouts while excluding nonnumeric color, fill, and level outputs', () => {
    const candle = plot({
      type: 'plotcandle',
      openValues: [1],
      highValues: [3],
      lowValues: [0.5],
      closeValues: [2],
      precision: 1,
    });
    const result = getIndicatorOutputReadouts({
      plots: [candle, ...(['fill', 'hline', 'bgcolor', 'barcolor'] as const).map((type) => plot({ type }))],
      totalBarCount: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0].values).toEqual(['1.0', '3.0', '0.5', '2.0']);
  });
});
