import type { ReactElement } from 'react';
import type { RenderOptions } from '../../types';
import type { NativeChartCanvasLayersProps } from './NativeChartCanvasLayers';

import { Group, matchFont } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { NativeCandleVolumeLayer } from './NativeCandleVolumeLayer';
import { NativeChartCanvasLayersImpl } from './NativeChartCanvasLayers';
import { NativeChartChromeLayer } from './NativeChartChromeLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativeChartPrimitiveLayer } from './NativeChartPrimitiveLayer';
import { NativeChartTradeLinesLayer } from './NativeChartTradeLinesLayer';
import { NativeCrosshairLayer } from './NativeCrosshairLayer';
import { NativeIndicatorOutputAxisLabelLayer } from './NativeIndicatorOutputAxisLabelLayer';
import { NativeIndicatorPaneAxisLayer } from './NativeIndicatorPaneAxisLayer';
import { NativeIndicatorPlotLayer } from './NativeIndicatorPlotLayer';
import { NativeUserDrawingLayer } from './NativeUserDrawingLayer';

function shared<T>(value: T) {
  return { value };
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62000, yMax: 66000 }],
});

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(100),
  priceMin: shared(62000),
  priceMax: shared(66000),
};

describe('NativeChartCanvasLayers', () => {
  function createLayerProps(hasDataViewport: boolean): NativeChartCanvasLayersProps {
    const axisFont = matchFont({ fontSize: 11 });
    const textFont = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });

    return {
      axisFont,
      backgroundColor: '#101418',
      bars: [],
      bracketDragState: {
        activeObjectId: shared(''),
        activeObjectType: shared(''),
        activeBracketType: shared(''),
        activePrice: shared(0),
        activeEntryPrice: shared(0),
        activeDragStartX: shared(0),
        activeDragCurrentX: shared(0),
        activeDragStartY: shared(0),
        activeDragCurrentY: shared(0),
        activePositionNotional: shared(0),
        activePositionIsLong: shared(true),
        activePartialPercent: shared(100),
        activePartialEnabled: shared(false),
        activeColor: shared(''),
      },
      crosshair: {
        visible: shared(false),
        x: shared(0),
        y: shared(0),
        dragOriginX: shared(0),
        dragOriginY: shared(0),
      },
      extraPriceLines: [],
      frame,
      getOrderObjectId: (line) => line.id,
      getPositionObjectId: (line) => line.id,
      gridColor: '#222831',
      hasDataViewport,
      hasContextMenu: false,
      intervalMs: 60_000,
      indicatorPaneInfo: {},
      indicatorPlots: [],
      indicatorTotalBarCount: 0,
      lineSnapshot: { orderLines: [], positionLines: [] },
      options: { upColor: '#12c48b', downColor: '#f04465' } as RenderOptions,
      plotOpacity: 1,
      orderDragState: {
        activeObjectId: shared(''),
        activePrice: shared(0),
      },
      plotPrimitiveClip: shared({
        x: frame.contentLeft,
        y: frame.mainPane.top,
        width: frame.contentWidth,
        height: frame.mainPane.height,
      }),
      pricePrecision: 0.1,
      nowMs: shared(0),
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
      smallFont,
      textColor: '#f0f3fa',
      textFont,
      tradeLabelHeight: 18,
      tradeLineGeometries: [],
      userDrawingDraftAnchors: [],
      userDrawingRenderEntries: [],
      visibleBars: [],
      volumeHeight: 80,
    };
  }

  it('keeps native chart surfaces in deterministic back-to-front order', () => {
    const layer = NativeChartCanvasLayersImpl(createLayerProps(true)) as ReactElement;
    const children = layer.props.children as ReactElement[];
    const plotGroup = children[1] as ReactElement;

    expect(children.map((child) => child.type)).toEqual([NativeChartChromeLayer, Group]);
    expect((plotGroup.props.children as ReactElement[]).map((child) => child.type)).toEqual([
      NativeChartPrimitiveLayer,
      NativeIndicatorPaneAxisLayer,
      NativeCandleVolumeLayer,
      NativeIndicatorPlotLayer,
      NativeChartPrimitiveLayer,
      NativeIndicatorPaneAxisLayer,
      NativeIndicatorOutputAxisLabelLayer,
      NativeUserDrawingLayer,
      NativeChartTradeLinesLayer,
      NativeCrosshairLayer,
    ]);

    const plotChildren = plotGroup.props.children as ReactElement[];
    // Both axis layers are split the same way as the main pane's: grid lines
    // under the plots, value labels over them.
    expect(plotChildren[0]?.props).toMatchObject({ showAxisLabels: false, showGridLines: true });
    expect(plotChildren[1]?.props).toMatchObject({ showAxisLabels: false, showGridLines: true });
    expect(plotChildren[3]?.props).toMatchObject({
      indicatorPaneInfo: {},
      plots: [],
      totalBarCount: 0,
      visibleBars: [],
    });
    expect(plotChildren[4]?.props).toMatchObject({ showAxisLabels: true, showGridLines: false });
    expect(plotChildren[5]?.props).toMatchObject({ showAxisLabels: true, showGridLines: false });
    expect(plotChildren[6]?.props).toMatchObject({
      bars: [],
      indicatorPaneInfo: {},
      plots: [],
      staticProjection: undefined,
      totalBarCount: 0,
    });
    expect(plotChildren[9]?.props).toMatchObject({ hasContextMenu: false });
  });

  it('applies loading opacity inside the Skia plot layer', () => {
    const layer = NativeChartCanvasLayersImpl({ ...createLayerProps(true), plotOpacity: 0.7 }) as ReactElement;
    const children = layer.props.children as ReactElement[];
    const plotGroup = children[1] as ReactElement;

    expect(plotGroup.type).toBe(Group);
    expect(plotGroup.props.opacity).toBe(0.7);
  });

  it('renders chrome only before a data viewport exists', () => {
    const layer = NativeChartCanvasLayersImpl(createLayerProps(false)) as ReactElement;

    expect((layer.props.children as ReactElement[]).filter(Boolean).map((child) => child.type)).toEqual([
      NativeChartChromeLayer,
    ]);
  });
});
