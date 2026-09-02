import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
  getLatestIndicatorPlotValue,
  resolveIndicatorOutputSourceTime,
} from './indicatorOutputAxisLabels';

function plot(overrides: Partial<PlotOutput>): PlotOutput {
  return {
    id: 'plot',
    title: 'Plot',
    type: 'plot',
    values: [],
    color: '#2196F3',
    ...overrides,
  };
}

describe('indicator output axis labels', () => {
  it('uses the latest finite visible plot value for main and non-overlay panes', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        macd: { overlay: false },
        ema: { overlay: true },
      },
      panes: [
        { id: 'main', type: 'main' },
        { id: 'pane_1', type: 'indicator', indicatorIds: ['macd'] },
      ],
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [1, null, 2.5],
          color: ['#111111', null, '#ff9900'],
        }),
        plot({
          id: 'ema',
          scriptId: 'ema',
          values: [10],
          color: '#00ff00',
        }),
      ],
      totalBarCount: 3,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:macd:signal',
        paneId: 'pane_1',
        plotId: 'signal',
        value: 2.5,
        color: '#ff9900',
      }),
      expect.objectContaining({
        id: 'main:indicator-output:ema:ema',
        paneId: 'main',
        plotId: 'ema',
        value: 10,
        color: '#00ff00',
      }),
    ]);
  });

  it('respects showLast windows and indicator precision', () => {
    expect(getLatestIndicatorPlotValue(plot({ values: [10, 20, null], showLast: 1 }), 3)).toBeNull();
    expect(formatIndicatorOutputAxisValue(24.234, 300, 1)).toBe('24.2');
  });

  it('inherits declaration precision and format while preserving plot overrides', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        volumePane: { overlay: false, paneId: 'pane_1', format: 'volume', precision: 0 },
        percentPane: { overlay: false, paneId: 'pane_2', format: 'percent', precision: 2 },
      },
      panes: [
        { id: 'pane_1', type: 'indicator' },
        { id: 'pane_2', type: 'indicator' },
      ],
      plots: [
        plot({
          id: 'volume',
          scriptId: 'volumePane',
          values: [1_250_000],
        }),
        plot({
          id: 'override',
          scriptId: 'percentPane',
          values: [0.1289],
          format: 'price',
          precision: 3,
        }),
      ],
      totalBarCount: 1,
    });

    expect(labels).toEqual([
      expect.objectContaining({ format: 'volume', precision: 0 }),
      expect.objectContaining({ format: 'price', precision: 3 }),
    ]);
    expect(formatIndicatorOutputAxisValue(labels[0]!.value, 2_000_000, labels[0]!.precision, labels[0]!.format)).toBe('1.25M');
    expect(formatIndicatorOutputAxisValue(labels[1]!.value, 1, labels[1]!.precision, labels[1]!.format)).toBe('0.129');
    expect(formatIndicatorOutputAxisValue(12.3456, 100, 2, 'percent')).toBe('12.35%');
  });

  it('omits indicator output labels for scale.none declarations', () => {
    expect(getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        hiddenScale: { overlay: false, paneId: 'pane_1', scale: 'none' },
      },
      panes: [{ id: 'pane_1', type: 'indicator' }],
      plots: [plot({ id: 'hidden', scriptId: 'hiddenScale', values: [42] })],
      totalBarCount: 1,
    })).toEqual([]);
  });

  it('resolves source time with plot offset applied', () => {
    const bars = [{ time: 0 }, { time: 60_000 }, { time: 120_000 }];

    expect(resolveIndicatorOutputSourceTime({ bars, sourceIndex: 1 })).toBe(60_000);
    expect(resolveIndicatorOutputSourceTime({ bars, plotOffset: 1, sourceIndex: 1 })).toBe(120_000);
    expect(resolveIndicatorOutputSourceTime({ bars, plotOffset: -1, sourceIndex: 1 })).toBe(0);
  });

  it('uses pane ids from native indicator pane info when pane frames omit indicator ids', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      panes: [{ id: 'pane_1', type: 'indicator' }],
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [1, 2.5],
          color: '#ff9900',
        }),
      ],
      totalBarCount: 2,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:macd:signal',
        paneId: 'pane_1',
        value: 2.5,
      }),
    ]);
  });
});
