import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
  getLatestIndicatorPlotValue,
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
  it('uses the latest finite visible plot value for non-overlay panes', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      indicatorPaneInfo: {
        macd: { overlay: false },
        ema: { overlay: true },
      },
      panes: [{ id: 'pane_1', type: 'indicator', indicatorIds: ['macd'] }],
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
    ]);
  });

  it('respects showLast windows and indicator precision', () => {
    expect(getLatestIndicatorPlotValue(plot({ values: [10, 20, null], showLast: 1 }), 3)).toBeNull();
    expect(formatIndicatorOutputAxisValue(24.234, 300, 1)).toBe('24.2');
  });
});
