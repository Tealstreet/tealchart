import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { formatIndicatorOutputAxisValue, getIndicatorOutputAxisLabelSources } from './indicatorOutputAxisLabels';

function plot(overrides: Partial<PlotOutput>): PlotOutput {
  return { id: 'plot', type: 'plot', title: 'Plot', values: [], color: '#2196F3', ...overrides };
}

describe('Pine price-scale display', () => {
  it('uses the unsuppressed numeric marker value on the axis', () => {
    const labels = getIndicatorOutputAxisLabelSources({
      panes: [{ id: 'main', type: 'main' }],
      plots: [plot({ type: 'plotchar', values: [1, null], displayValues: [1, 0], display: 8 })],
      totalBarCount: 2,
    });
    expect(labels[0]).toMatchObject({ sourceIndex: 1, value: 0 });
  });
  it('inherits instrument precision for an unspecified secondary pane output', () => {
    expect(
      formatIndicatorOutputAxisValue(0.12345, 1000, undefined, 'price', {
        paneType: 'indicator',
        pricePrecision: 0.001,
      }),
    ).toBe('0.123');
  });
  it('labels numeric marker and OHLC outputs and routes force_overlay labels to the main scale', () => {
    const types = ['plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle'] as const;
    const labels = getIndicatorOutputAxisLabelSources({
      panes: [
        { id: 'main', type: 'main' },
        { id: 'indicator', type: 'indicator', indicatorIds: ['script'] },
      ],
      indicatorPaneInfo: { script: { overlay: false, paneId: 'indicator', precision: 2 } },
      plots: types.map((type) =>
        plot({
          id: type,
          type,
          scriptId: 'script',
          values: [12.34],
          display: 8,
          forceOverlay: type === 'plotshape',
          format: 'percent',
          precision: 1,
        }),
      ),
      totalBarCount: 1,
    });
    expect(labels.map((label) => [label.plotId, label.paneId, label.value, label.format, label.precision])).toEqual(
      types.map((type) => [type, type === 'plotshape' ? 'main' : 'indicator', 12.34, 'percent', 1]),
    );
  });
});
