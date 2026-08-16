import type { SharedValue } from 'react-native-reanimated';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeBracketDragSharedValues, NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { Skia } from '@shopify/react-native-skia';

import { AnimatedBracketDragPreview } from './NativeBracketDragPreviewLayer';
import { AnimatedPriceLine } from './NativePriceLineLayer';
import { AnimatedTradeLine, AnimatedTradeLineDragTag } from './NativeTradeLineLayer';

export function NativeChartTradeLinesLayer({
  axisFont,
  bracketDragState,
  extraPriceLines,
  frame,
  getOrderObjectId,
  getPositionObjectId,
  lineSnapshot,
  orderDragState,
  pricePrecision,
  nowMs,
  resolvedPriceAxisTags,
  sharedViewport,
  smallFont,
  staticProjection,
  textFont,
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
  orderDragState: NativeOrderDragSharedValues;
  pricePrecision: number;
  nowMs: SharedValue<number>;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  staticProjection?: NativeChartProjection | null;
  textFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
}) {
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

      {lineSnapshot.orderLines.map((line) => {
        const objectId = getOrderObjectId(line);
        const geometry = tradeLineGeometries.find(
          (candidate) => candidate.objectType === 'order' && candidate.objectId === objectId,
        );
        if (!geometry) return null;
        return (
          <AnimatedTradeLine
            key={`order-${objectId}`}
            axisFont={axisFont}
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
            tradeLabelHeight={tradeLabelHeight}
          />
        );
      })}

      {lineSnapshot.positionLines.map((line) => {
        const objectId = getPositionObjectId(line);
        const geometry = tradeLineGeometries.find(
          (candidate) => candidate.objectType === 'position' && candidate.objectId === objectId,
        );
        if (!geometry) return null;
        return (
          <AnimatedTradeLine
            key={`position-${objectId}`}
            axisFont={axisFont}
            frame={frame}
            geometry={geometry}
            line={line}
            pricePrecision={pricePrecision}
            resolvedPriceAxisTags={resolvedPriceAxisTags}
            sharedViewport={sharedViewport}
            smallFont={smallFont}
            staticProjection={staticProjection}
            textFont={textFont}
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
            axisFont={axisFont}
            color={line.lineColor}
            backgroundColor={line.bodyBackgroundColor}
            textColor={line.bodyTextColor}
            dragState={orderDragState}
            frame={frame}
            geometry={geometry}
            pricePrecision={pricePrecision}
            sharedViewport={sharedViewport}
            tradeLabelHeight={tradeLabelHeight}
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
