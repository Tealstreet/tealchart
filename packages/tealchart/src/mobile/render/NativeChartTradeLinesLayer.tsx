import type { SharedValue } from 'react-native-reanimated';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeBracketDragSharedValues, NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { memo } from 'react';

import { Skia } from '@shopify/react-native-skia';

import { NATIVE_PRICE_AXIS_TAG_SIZING } from '../../utils/priceAxisTagSizing';
import { AnimatedBracketDragPreview } from './NativeBracketDragPreviewLayer';
import { AnimatedPriceLine } from './NativePriceLineLayer';
import { AnimatedTradeLine, AnimatedTradeLineDragTag } from './NativeTradeLineLayer';

export function NativeChartTradeLinesLayerImpl({
  axisFont,
  bracketDragState,
  extraPriceLines,
  frame,
  getOrderObjectId,
  getPositionObjectId,
  lineSnapshot,
  onDragPriceLabelWidth,
  orderDragState,
  pricePrecision,
  nowMs,
  resolvedPriceAxisTags,
  sharedViewport,
  smallFont,
  staticProjection,
  textFont,
  tradeAxisFont,
  tradeAxisTagHeight,
  tradeLabelHeight,
  tradeLineGeometries,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  bracketDragState: NativeBracketDragSharedValues;
  extraPriceLines: readonly NativeRenderablePriceLine[];
  frame: NativeChartFrame;
  getOrderObjectId: (line: OrderLineRenderData) => string;
  getPositionObjectId: (line: PositionLineRenderData) => string;
  lineSnapshot: {
    orderLines: readonly OrderLineRenderData[];
    positionLines: readonly PositionLineRenderData[];
  };
  onDragPriceLabelWidth?: (objectId: string, width: number) => void;
  orderDragState: NativeOrderDragSharedValues;
  pricePrecision: number;
  nowMs: SharedValue<number>;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  staticProjection?: NativeChartProjection | null;
  textFont: ReturnType<typeof Skia.Font>;
  tradeAxisFont?: ReturnType<typeof Skia.Font>;
  tradeAxisTagHeight?: number;
  tradeLabelHeight: number;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
}) {
  const resolvedTradeAxisFont = tradeAxisFont ?? axisFont;
  const resolvedTradeAxisTagHeight = tradeAxisTagHeight ?? NATIVE_PRICE_AXIS_TAG_SIZING.trade.height;

  return (
    <>
      {extraPriceLines.map((line) => (
        <AnimatedPriceLine
          key={line.id}
          axisFont={axisFont}
          bracketDragState={bracketDragState}
          frame={frame}
          line={line}
          pricePrecision={pricePrecision}
          nowMs={nowMs}
          resolvedPriceAxisTags={resolvedPriceAxisTags}
          sharedViewport={sharedViewport}
          staticProjection={staticProjection}
        />
      ))}

      {tradeLineGeometries.map((geometry) => {
        if (geometry.objectType === 'order') {
          const line = lineSnapshot.orderLines.find((candidate) => getOrderObjectId(candidate) === geometry.objectId);
          if (!line) return null;
          return (
            <AnimatedTradeLine
              key={`order-${geometry.objectId}`}
              axisFont={resolvedTradeAxisFont}
              dragState={orderDragState}
              frame={frame}
              geometry={geometry}
              line={line}
              pricePrecision={pricePrecision}
              resolvedPriceAxisTags={resolvedPriceAxisTags}
              sharedViewport={sharedViewport}
              smallFont={smallFont}
              staticProjection={staticProjection}
              textFont={textFont}
              tradeAxisTagHeight={resolvedTradeAxisTagHeight}
              tradeLabelHeight={tradeLabelHeight}
            />
          );
        }

        const line = lineSnapshot.positionLines.find((candidate) => getPositionObjectId(candidate) === geometry.objectId);
        if (!line) return null;
        return (
          <AnimatedTradeLine
            key={`position-${geometry.objectId}`}
            axisFont={resolvedTradeAxisFont}
            frame={frame}
            geometry={geometry}
            line={line}
            pricePrecision={pricePrecision}
            resolvedPriceAxisTags={resolvedPriceAxisTags}
            sharedViewport={sharedViewport}
            smallFont={smallFont}
            staticProjection={staticProjection}
            textFont={textFont}
            tradeAxisTagHeight={resolvedTradeAxisTagHeight}
            tradeLabelHeight={tradeLabelHeight}
          />
        );
      })}

      {/* After every trade line, so a dragged tag floats above the rest instead
          of being drawn in list order among them. */}
      {lineSnapshot.orderLines.map((line) => {
        const objectId = getOrderObjectId(line);
        const geometry = tradeLineGeometries.find(
          (candidate) => candidate.objectType === 'order' && candidate.objectId === objectId,
        );
        if (!geometry) return null;
        return (
          <AnimatedTradeLineDragTag
            key={`order-drag-tag-${objectId}`}
            axisFont={resolvedTradeAxisFont}
            color={line.lineColor}
            backgroundColor={line.bodyBackgroundColor}
            textColor={line.bodyTextColor}
            dragState={orderDragState}
            frame={frame}
            geometry={geometry}
            onDragPriceLabelWidth={onDragPriceLabelWidth}
            pricePrecision={pricePrecision}
            sharedViewport={sharedViewport}
            tradeAxisTagHeight={resolvedTradeAxisTagHeight}
          />
        );
      })}

      <AnimatedBracketDragPreview
        axisFont={axisFont}
        dragState={bracketDragState}
        frame={frame}
        pricePrecision={pricePrecision}
        resolvedPriceAxisTags={resolvedPriceAxisTags}
        sharedViewport={sharedViewport}
      />
    </>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeChartTradeLinesLayer = memo(NativeChartTradeLinesLayerImpl);
NativeChartTradeLinesLayer.displayName = 'NativeChartTradeLinesLayer';
