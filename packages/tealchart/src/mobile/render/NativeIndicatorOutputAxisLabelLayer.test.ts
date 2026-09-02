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
  // The main pane's frame carries the unified layout's placeholder range, so an
  // overlay indicator's value sat outside it and every main-pane label was
  // filtered away. Order and position tags never hit this - they project
  // through the shared viewport rather than the pane.
  it('labels an overlay indicator on the main pane, whose range is the viewport', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [{ id: 'main', type: 'main', top: 24, height: 200, yMin: 0, yMax: 0 }],
    });
    const args = {
      bars: [{ time: 0 }, { time: 60_000 }] as never,
      frame,
      indicatorPaneInfo: { bb: { overlay: true } },
      plots: [plot({ id: 'basis', scriptId: 'bb', values: [63_400, 63_500] })],
      totalBarCount: 2,
    };

    expect(resolveNativeIndicatorOutputAxisLabels(args)).toEqual([]);

    const labels = resolveNativeIndicatorOutputAxisLabels({
      ...args,
      mainPaneRange: { yMin: 63_000, yMax: 64_000 },
      pricePrecision: 0.1,
    });

    expect(labels).toHaveLength(1);
    expect(labels[0]!.pane.id).toBe('main');
    expect(labels[0]!.text).toBe('63,500.0');
    // Half a pane above the bottom, since 63,500 is the middle of the range.
    expect(labels[0]!.valueY).toBe(124);
  });

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

  it('inherits declaration formatting for native output-axis labels', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 104, yMin: 0, yMax: 2_000_000 },
      ],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      bars: [{ time: 0 }] as never,
      frame,
      indicatorPaneInfo: {
        volume: { overlay: false, paneId: 'pane_1', format: 'volume', precision: 0 },
      },
      plots: [
        plot({
          id: 'histogram',
          scriptId: 'volume',
          values: [1_250_000],
          color: '#22aa88',
        }),
      ],
      totalBarCount: 1,
    });

    expect(labels).toEqual([
      expect.objectContaining({
        id: 'pane_1:indicator-output:volume:histogram',
        text: '1.25M',
        color: '#22aa88',
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

  // Main-pane readouts resolve in the shared price-axis stack now, beside the
  // orders and the last-trade tag. This function must hand them back untouched
  // - stacking them here too would fight the shared pass, and an earlier draft
  // that skipped them with a bare `continue` dropped them from the render
  // entirely with every gate still green.
  it('hands crowded main-pane readouts back unstacked, for the shared pass', () => {
    const frame = createNativeChartFrameFromPanes({
      dimensions: { width: 390, height: 360, margins: { top: 24, right: 76, bottom: 32, left: 62 } },
      panes: [{ id: 'main', type: 'main', top: 24, height: 200, yMin: 63_000, yMax: 64_000 }],
    });

    const labels = resolveNativeIndicatorOutputAxisLabels({
      bars: [{ time: 0 }] as never,
      frame,
      indicatorPaneInfo: { bb: { overlay: true } },
      mainPaneRange: { yMin: 63_000, yMax: 64_000 },
      plots: [
        plot({ id: 'basis', scriptId: 'bb', values: [63_500], color: '#2196f3', precision: 0 }),
        plot({ id: 'upper', scriptId: 'bb', values: [63_480], color: '#ff9900', precision: 0 }),
      ],
      totalBarCount: 1,
    });

    expect(labels).toHaveLength(2);
    // Close enough that the layer's own pass would have moved one of them.
    expect(Math.abs(labels[0]!.valueY - labels[1]!.valueY)).toBeLessThan(
      NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT,
    );
    for (const label of labels) {
      expect(label.y).toBe(label.valueY);
    }
  });

  it('stacks indicator-pane readouts while leaving main-pane ones to the shared pass', () => {
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
        bb: { overlay: true },
        macd: { overlay: false, paneId: 'pane_1' },
      },
      mainPaneRange: { yMin: 63_000, yMax: 64_000 },
      plots: [
        plot({ id: 'basis', scriptId: 'bb', values: [63_500], color: '#2196f3', precision: 0 }),
        plot({ id: 'upper', scriptId: 'bb', values: [63_480], color: '#12c48b', precision: 0 }),
        plot({ id: 'macd', scriptId: 'macd', values: [-100], color: '#2196f3', precision: 0 }),
        plot({ id: 'signal', scriptId: 'macd', values: [-110], color: '#ff9900', precision: 0 }),
      ],
      totalBarCount: 1,
    });

    const mainLabels = labels.filter((label) => label.pane.id === 'main');
    const paneLabels = labels.filter((label) => label.pane.id === 'pane_1');

    expect(mainLabels).toHaveLength(2);
    expect(paneLabels).toHaveLength(2);
    for (const label of mainLabels) {
      expect(label.y).toBe(label.valueY);
    }
    expect(paneLabels.some((label) => label.valueY !== label.y)).toBe(true);
    assertNoOutputLabelOverlap(paneLabels);
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
