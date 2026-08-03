import type { SharedValue } from 'react-native-reanimated';
import type { UserDrawingAnchor, UserDrawingRenderEntry } from '../../drawings';
import type { OrderLineRenderData, PositionLineRenderData, RenderOptions } from '../../types';
import type { NativeCrosshairSharedValues } from '../interaction/nativeCrosshair';
import type { NativeBracketDragSharedValues, NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { Group, Skia } from '@shopify/react-native-skia';

import { NativeCandleVolumeLayer } from './NativeCandleVolumeLayer';
import { NativeChartChromeLayer } from './NativeChartChromeLayer';
import { NativeChartPrimitiveLayer } from './NativeChartPrimitiveLayer';
import { NativeChartTradeLinesLayer } from './NativeChartTradeLinesLayer';
import { NativeCrosshairLayer } from './NativeCrosshairLayer';
import { NativeUserDrawingLayer } from './NativeUserDrawingLayer';

export interface NativeChartCanvasLayersProps {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  bracketDragState: NativeBracketDragSharedValues;
  crosshair: NativeCrosshairSharedValues;
  extraPriceLines: readonly NativeRenderablePriceLine[];
  frame: NativeChartFrame;
  getOrderObjectId: (line: OrderLineRenderData) => string;
  getPositionObjectId: (line: PositionLineRenderData) => string;
  gridColor: string;
  hasDataViewport: boolean;
  hasContextMenu: boolean;
  lineSnapshot: {
    orderLines: readonly OrderLineRenderData[];
    positionLines: readonly PositionLineRenderData[];
  };
  options: RenderOptions;
  plotOpacity: number;
  orderDragState: NativeOrderDragSharedValues;
  plotPrimitiveClip: NativePrimitiveClip;
  pricePrecision: number;
  nowMs: SharedValue<number>;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  staticProjection?: NativeChartProjection | null;
  textColor: string;
  textFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
  userDrawingDraftAnchorColor?: string;
  userDrawingDraftAnchors: readonly UserDrawingAnchor[];
  userDrawingRenderEntries: readonly UserDrawingRenderEntry[];
  visibleBars: readonly NativeVisibleBar[];
  volumeHeight: number;
}

export function NativeChartCanvasLayers({
  axisFont,
  backgroundColor,
  bracketDragState,
  crosshair,
  extraPriceLines,
  frame,
  getOrderObjectId,
  getPositionObjectId,
  gridColor,
  hasDataViewport,
  hasContextMenu,
  lineSnapshot,
  options,
  plotOpacity,
  orderDragState,
  plotPrimitiveClip,
  pricePrecision,
  nowMs,
  resolvedPriceAxisTags,
  sharedViewport,
  smallFont,
  staticProjection,
  textColor,
  textFont,
  tradeLabelHeight,
  tradeLineGeometries,
  userDrawingDraftAnchorColor,
  userDrawingDraftAnchors,
  userDrawingRenderEntries,
  visibleBars,
  volumeHeight,
}: NativeChartCanvasLayersProps) {
  return (
    <>
      <NativeChartChromeLayer backgroundColor={backgroundColor} frame={frame} gridColor={gridColor} />

      {hasDataViewport && (
        <Group opacity={plotOpacity}>
          <NativeChartPrimitiveLayer
            axisFont={axisFont}
            frame={frame}
            gridColor={gridColor}
            pricePrecision={pricePrecision}
            showAxisLabels={false}
            showGridLines={true}
            staticProjection={staticProjection}
            sharedViewport={sharedViewport}
            textColor={textColor}
          />

          <NativeCandleVolumeLayer
            frame={frame}
            options={options}
            sharedViewport={sharedViewport}
            staticProjection={staticProjection}
            visibleBars={visibleBars}
            volumeHeight={volumeHeight}
          />

          <NativeChartPrimitiveLayer
            axisFont={axisFont}
            frame={frame}
            gridColor={gridColor}
            pricePrecision={pricePrecision}
            showAxisLabels={true}
            showGridLines={false}
            staticProjection={staticProjection}
            sharedViewport={sharedViewport}
            textColor={textColor}
          />

          <NativeUserDrawingLayer
            draftAnchorColor={userDrawingDraftAnchorColor}
            draftAnchors={userDrawingDraftAnchors}
            entries={userDrawingRenderEntries}
            frame={frame}
            plotPrimitiveClip={plotPrimitiveClip}
            sharedViewport={sharedViewport}
          />

          <NativeChartTradeLinesLayer
            axisFont={axisFont}
            bracketDragState={bracketDragState}
            extraPriceLines={extraPriceLines}
            frame={frame}
            getOrderObjectId={getOrderObjectId}
            getPositionObjectId={getPositionObjectId}
            lineSnapshot={lineSnapshot}
            orderDragState={orderDragState}
            pricePrecision={pricePrecision}
            nowMs={nowMs}
            resolvedPriceAxisTags={resolvedPriceAxisTags}
            sharedViewport={sharedViewport}
            smallFont={smallFont}
            staticProjection={staticProjection}
            textFont={textFont}
            tradeLabelHeight={tradeLabelHeight}
            tradeLineGeometries={tradeLineGeometries}
          />

          <NativeCrosshairLayer
            axisFont={axisFont}
            crosshair={crosshair}
            frame={frame}
            hasContextMenu={hasContextMenu}
            options={options}
            pricePrecision={pricePrecision}
            sharedViewport={sharedViewport}
          />
        </Group>
      )}
    </>
  );
}
