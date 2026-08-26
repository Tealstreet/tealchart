import type { NativeChartCanvasLayersProps } from './NativeChartCanvasLayers';

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';

const layerRenders = vi.fn();

// Every child is stubbed: this asserts the memo bail-out, not what the layers
// draw, and a real Skia subtree would need mocks the suite does not have.
function stubLayer(name: string) {
  return {
    [name]: () => {
      layerRenders(name);
      return null;
    },
  };
}

vi.mock('./NativeChartChromeLayer', () => stubLayer('NativeChartChromeLayer'));
vi.mock('./NativeChartPrimitiveLayer', () => stubLayer('NativeChartPrimitiveLayer'));
vi.mock('./NativeIndicatorPaneAxisLayer', () => stubLayer('NativeIndicatorPaneAxisLayer'));
vi.mock('./NativeCandleVolumeLayer', () => stubLayer('NativeCandleVolumeLayer'));
vi.mock('./NativeIndicatorPlotLayer', () => stubLayer('NativeIndicatorPlotLayer'));
vi.mock('./NativeUserDrawingLayer', () => stubLayer('NativeUserDrawingLayer'));
vi.mock('./NativeChartTradeLinesLayer', () => stubLayer('NativeChartTradeLinesLayer'));
vi.mock('./NativeCrosshairLayer', () => stubLayer('NativeCrosshairLayer'));

const { NativeChartCanvasLayers } = await import('./NativeChartCanvasLayers');

function shared<T>(value: T) {
  return { value };
}

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 390, height: 480, margins: { bottom: 32, left: 62, right: 76, top: 36 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62_000, yMax: 66_000 }],
});

const props = {
  axisFont: null,
  backgroundColor: '#101418',
  bars: [],
  bracketDragState: shared(null),
  crosshair: { visible: shared(false), x: shared(0), y: shared(0) },
  extraPriceLines: [],
  frame,
  getOrderObjectId: () => 'order',
  getPositionObjectId: () => 'position',
  gridColor: '#222831',
  hasDataViewport: true,
  hasContextMenu: false,
  intervalMs: 60_000,
  indicatorPaneInfo: {},
  indicatorPlots: [],
  indicatorTotalBarCount: 0,
  lineSnapshot: { orderLines: [], positionLines: [] },
  options: { downColor: '#f00', upColor: '#0f0' },
  plotOpacity: 1,
  orderDragState: shared(null),
  plotPrimitiveClip: { value: { x: 0, y: 0, width: 0, height: 0 } },
  pricePrecision: 2,
  nowMs: shared(0),
  resolvedPriceAxisTags: shared([]),
  sharedViewport: { startTime: shared(0), endTime: shared(1) },
  smallFont: null,
  textColor: '#d1d4dc',
  textFont: null,
  tradeLabelHeight: 18,
  tradeLineGeometries: [],
  userDrawingDraftAnchors: [],
  userDrawingRenderEntries: [],
  visibleBars: [],
  volumeHeight: 80,
} as unknown as NativeChartCanvasLayersProps;

describe('NativeChartCanvasLayers memoisation', () => {
  beforeEach(() => {
    layerRenders.mockClear();
  });

  it('leaves the Skia subtree alone when the chart re-renders with the same props', () => {
    // The chart owner re-renders on UI state that has nothing to do with the
    // canvas - the reset-view button appearing, then dismissing itself 2.5s
    // later. Reconciling every layer for that was the cost being paid.
    const { rerender } = render(<NativeChartCanvasLayers {...props} />);
    const initialRenders = layerRenders.mock.calls.length;
    expect(initialRenders).toBeGreaterThan(0);

    rerender(<NativeChartCanvasLayers {...props} />);

    expect(layerRenders.mock.calls).toHaveLength(initialRenders);
  });

  it('still reconciles when a prop actually changes', () => {
    const { rerender } = render(<NativeChartCanvasLayers {...props} />);
    const initialRenders = layerRenders.mock.calls.length;

    rerender(<NativeChartCanvasLayers {...props} volumeHeight={40} />);

    expect(layerRenders.mock.calls.length).toBeGreaterThan(initialRenders);
  });
});
