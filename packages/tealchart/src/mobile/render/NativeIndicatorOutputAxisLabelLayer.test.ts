import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  resolveNativeIndicatorOutputAxisLabelGroups,
  resolveNativeIndicatorOutputAxisLabels,
} from './NativeIndicatorOutputAxisLabelLayer';

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

const axisFont = {
  measureText: (text: string) => ({ width: text.length * 7 }),
} as never;

describe('native indicator output axis labels', () => {
  it('renders latest non-overlay plot values from native pane ids', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: -100, yMax: 100 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      frame,
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [null, 24.234],
          color: '#ff9900',
          precision: 1,
        }),
      ],
      totalBarCount: 2,
    });
    const groups = resolveNativeIndicatorOutputAxisLabelGroups({ axisFont, frame, labels });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:macd:signal',
        text: '24.2',
        color: '#ff9900',
      }),
    ]);
    expect(groups).toEqual([
      expect.objectContaining({
        paneId: 'pane_1',
        x: frame.priceAxisLeft + 2,
      }),
    ]);
  });

  it('uses live indicator pane range overrides for label placement', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 100, yMin: -100, yMax: 100 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      frame,
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      paneRangeOverrides: {
        pane_1: { yMin: 0, yMax: 50 },
      },
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [null, 25],
          color: '#ff9900',
          precision: 1,
        }),
      ],
      totalBarCount: 2,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        text: '25.0',
        y: 274,
      }),
    ]);
  });
});
