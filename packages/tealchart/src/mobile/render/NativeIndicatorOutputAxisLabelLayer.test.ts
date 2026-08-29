import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it, vi } from 'vitest';

import { PriceAxisTagWidthCache } from '../../utils/priceAxisTagSizing';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT,
  resolveNativeIndicatorOutputAxisLabelGroups,
  resolveNativeIndicatorOutputAxisLabels,
  resolveNativeIndicatorOutputGuideStartX,
} from './NativeIndicatorOutputAxisLabelLayer';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
}));

vi.mock('react-native-reanimated', () => ({
  useDerivedValue: (factory: () => unknown) => ({ value: factory() }),
}));

vi.mock('@shopify/react-native-skia', async () => await import('../../test/reactNativeSkiaMock'));

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

function assertNoOutputLabelOverlap(labels: Array<{ y: number }>, gap = 0): void {
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    expect(current.y - NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2).toBeGreaterThanOrEqual(
      previous.y + NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2 + gap,
    );
  }
}

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
      bars: [{ time: 0 }, { time: 60_000 }] as never,
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
        sourceTime: 60_000,
      }),
    ]);
    expect(groups).toEqual([
      expect.objectContaining({
        paneId: 'pane_1',
        x: frame.priceAxisLeft + 1,
        width: 36,
      }),
    ]);
  });

  it('keeps the latest source time from the full bar series when the source is offscreen', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: -100, yMax: 100 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      bars: [{ time: 0 }, { time: 60_000 }, { time: 120_000 }] as never,
      frame,
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [null, 20, 24.234],
          color: '#ff9900',
          precision: 1,
        }),
      ],
      totalBarCount: 3,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:macd:signal',
        sourceTime: 120_000,
      }),
    ]);
  });

  it('applies plot offset to the native guide source time', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: -100, yMax: 100 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      bars: [{ time: 0 }, { time: 60_000 }, { time: 120_000 }] as never,
      frame,
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      plots: [
        plot({
          id: 'signal',
          scriptId: 'macd',
          values: [null, 24.234, null],
          color: '#ff9900',
          offset: 1,
          precision: 1,
        }),
      ],
      totalBarCount: 3,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:macd:signal',
        sourceTime: 120_000,
      }),
    ]);
  });

  it('resolves live guide start x from source position and axis label position', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: -100, yMax: 100 },
      ],
    });

    expect(resolveNativeIndicatorOutputGuideStartX(184, frame, 300)).toBe(184);
    expect(resolveNativeIndicatorOutputGuideStartX(40, frame, 300)).toBe(frame.contentLeft);
    expect(resolveNativeIndicatorOutputGuideStartX(340, frame, 300)).toBe(300);
    expect(resolveNativeIndicatorOutputGuideStartX(Number.NaN, frame, 300)).toBe(300);
  });

  it('keeps native indicator output tag widths grow-only per pane', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: -100, yMax: 100 },
      ],
    });
    const pane = frame.panes.find((candidate) => candidate.id === 'pane_1')!;
    const widthCache = new PriceAxisTagWidthCache();
    const wide = resolveNativeIndicatorOutputAxisLabelGroups({
      axisFont,
      frame,
      labels: [
        {
          id: 'pane_1:indicator-output:macd:signal',
          pane,
          value: 88.8,
          text: '88.8',
          color: '#ff9900',
          valueY: 250,
          y: 250,
        },
      ],
      widthCache,
    })[0]!;
    const narrow = resolveNativeIndicatorOutputAxisLabelGroups({
      axisFont,
      frame,
      labels: [
        {
          id: 'pane_1:indicator-output:macd:signal',
          pane,
          value: 8,
          text: '8',
          color: '#ff9900',
          valueY: 250,
          y: 250,
        },
      ],
      widthCache,
    })[0]!;

    expect(narrow.width).toBe(wide.width);
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
      bars: [{ time: 0 }, { time: 60_000 }] as never,
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
        valueY: 274,
        y: 274,
      }),
    ]);
  });

  it('keeps crowded secondary output labels inside their pane', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 76, yMin: -120, yMax: 60 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      bars: [{ time: 0 }] as never,
      frame,
      indicatorPaneInfo: {
        macd: { overlay: false, paneId: 'pane_1' },
      },
      plots: [
        plot({ id: 'histogram', scriptId: 'macd', values: [-90], color: '#ff003d', precision: 0 }),
        plot({ id: 'macd', scriptId: 'macd', values: [-100], color: '#2196f3', precision: 0 }),
        plot({ id: 'signal', scriptId: 'macd', values: [-110], color: '#ff9900', precision: 0 }),
      ],
      totalBarCount: 1,
    });

    const halfHeight = NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2;
    expect(labels.some((label) => label.valueY !== label.y)).toBe(true);
    assertNoOutputLabelOverlap(labels);
    for (const label of labels) {
      expect(label.y - halfHeight).toBeGreaterThanOrEqual(224);
      expect(label.y + halfHeight).toBeLessThanOrEqual(300);
      expect(label.valueY).toBeGreaterThanOrEqual(224);
      expect(label.valueY).toBeLessThanOrEqual(300);
    }
  });
});
