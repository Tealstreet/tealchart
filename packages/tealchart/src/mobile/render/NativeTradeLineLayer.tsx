import type { SharedValue } from 'react-native-reanimated';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { getNativeDarkLabelBackgroundColor } from '../utils/nativeColor';
import { findNativeResolvedPriceAxisTagCenterY } from '../utils/priceAxisTagLayout';
import { getNativeTradeLineTagId } from '../utils/priceAxisTagSources';
import {
  getNativeTradeLinePriceTagTextBaselineOffset,
  NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X,
  nativeTradeLineDashArray,
} from '../utils/tradeLineLayout';
import { NativePriceAxisTagAnimatedText, NativePriceAxisTagBox } from './NativePriceAxisTag';
import { formatNativeTradeLinePriceWorklet } from './nativePriceFormat';
import {
  isNativeYInMainPane,
  sharedPriceToNativeY,
} from './nativeSharedViewport';
import { measureNativeSkiaAxisCharacterWidth } from './nativeSkiaText';
import { NativeStaticTradeLineLabelBody, NativeTradeLineLabelBody } from './NativeTradeLineLabelBody';

function resolveNativePriceAxisTagCenterY(
  resolvedPriceAxisTags: readonly NativeResolvedPriceAxisTag[],
  targetId: string,
  fallbackCenterY: number,
): number {
  'worklet';
  return findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags, targetId, fallbackCenterY);
}

function clampNativeTradeLineY(value: number, frame: NativeChartFrame): number {
  'worklet';
  return Math.min(Math.max(value, frame.mainPane.top), frame.mainPane.bottom);
}

export function AnimatedTradeLine({
  dragState,
  frame,
  geometry,
  line,
  pricePrecision,
  resolvedPriceAxisTags,
  sharedViewport,
  staticProjection,
  axisFont,
  textFont,
  smallFont,
  tradeLabelHeight,
}: {
  dragState?: NativeOrderDragSharedValues;
  frame: NativeChartFrame;
  geometry: NativeTradeLineGeometry;
  line: OrderLineRenderData | PositionLineRenderData;
  pricePrecision: number;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  axisFont: ReturnType<typeof Skia.Font>;
  textFont: ReturnType<typeof Skia.Font>;
  smallFont: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
}) {
  const livePrice = useDerivedValue(() => {
    if (dragState && dragState.activeObjectId.value === geometry.objectId) {
      return dragState.activePrice.value;
    }
    return line.price;
  });
  const rawY = useDerivedValue(() => sharedPriceToNativeY(livePrice.value, sharedViewport, frame));
  const lineY = useDerivedValue(() => clampNativeTradeLineY(rawY.value, frame));
  const color = line.lineColor;
  const dash = nativeTradeLineDashArray(line.lineStyle);
  const labelY = useDerivedValue(() => lineY.value - tradeLabelHeight / 2);
  const axisTagCenterY = useDerivedValue(() =>
    resolveNativePriceAxisTagCenterY(
      resolvedPriceAxisTags.value,
      getNativeTradeLineTagId(geometry.objectType, geometry.objectId),
      lineY.value,
    ),
  );
  const priceTagTextBaselineOffset = getNativeTradeLinePriceTagTextBaselineOffset(tradeLabelHeight);
  const priceLabelY = useDerivedValue(() => axisTagCenterY.value - tradeLabelHeight / 2 - 1);
  const priceTextY = useDerivedValue(() => axisTagCenterY.value - tradeLabelHeight / 2 - 1 + priceTagTextBaselineOffset);
  const priceLabelCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const priceLabelRight = geometry.priceLabelX + geometry.priceLabelWidth;
  const priceLabelText = useDerivedValue(() => {
    return (
      dragState && dragState.activeObjectId.value === geometry.objectId
        ? formatNativeTradeLinePriceWorklet(livePrice.value, pricePrecision)
        : geometry.priceLabelText
    );
  });
  const priceLabelWidth = useDerivedValue(() =>
    Math.max(
      geometry.priceLabelWidth,
      Math.ceil(priceLabelText.value.length * priceLabelCharacterWidth) + NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2,
    ),
  );
  const priceLabelX = useDerivedValue(() => priceLabelRight - priceLabelWidth.value);
  const priceLabelTextX = useDerivedValue(
    () => priceLabelRight - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X - priceLabelText.value.length * priceLabelCharacterWidth,
  );
  const leftLineStart = useDerivedValue(() => ({ x: geometry.leftLineStartX, y: lineY.value }));
  const leftLineEnd = useDerivedValue(() => ({ x: geometry.leftLineEndX, y: lineY.value }));
  const rightLineStart = useDerivedValue(() => ({ x: geometry.rightLineStartX, y: lineY.value }));
  const rightLineEnd = useDerivedValue(() => ({ x: Math.min(geometry.rightLineEndX, priceLabelX.value - 2), y: lineY.value }));
  const pendingOpacity = line.actionState?.isPending ? 0.55 : 1;
  const groupOpacity = useDerivedValue(() => (isNativeYInMainPane(rawY.value, frame) ? pendingOpacity : 0));

  if (staticProjection) {
    const staticRawY = staticProjection.priceToY(line.price);
    const staticLineY = clampNativeTradeLineY(staticRawY, frame);
    const staticLabelY = staticLineY - tradeLabelHeight / 2;
    const staticPriceLabelY = staticLabelY - 1;
    const staticPriceTextY = staticLabelY - 1 + priceTagTextBaselineOffset;
    const staticPriceLabelText = geometry.priceLabelText;
    const staticPriceLabelTextX =
      priceLabelRight - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X - staticPriceLabelText.length * priceLabelCharacterWidth;
    const staticOpacity = isNativeYInMainPane(staticRawY, frame) ? pendingOpacity : 0;
    const staticLeftLineStart = { x: geometry.leftLineStartX, y: staticLineY };
    const staticLeftLineEnd = { x: geometry.leftLineEndX, y: staticLineY };
    const staticRightLineStart = { x: geometry.rightLineStartX, y: staticLineY };
    const staticRightLineEnd = { x: geometry.rightLineEndX, y: staticLineY };

    return (
      <Group opacity={staticOpacity}>
        {geometry.leftLineEndX > geometry.leftLineStartX && (
          <SkiaLine
            p1={staticLeftLineStart}
            p2={staticLeftLineEnd}
            color={color}
            strokeWidth={Math.max(1, line.lineWidth)}
            style="stroke"
          >
            {dash && <DashPathEffect intervals={[...dash]} />}
          </SkiaLine>
        )}
        {geometry.rightLineEndX > geometry.rightLineStartX && (
          <SkiaLine
            p1={staticRightLineStart}
            p2={staticRightLineEnd}
            color={color}
            strokeWidth={Math.max(1, line.lineWidth)}
            style="stroke"
          >
            {dash && <DashPathEffect intervals={[...dash]} />}
          </SkiaLine>
        )}
        <NativeStaticTradeLineLabelBody
          geometry={geometry}
          labelY={staticLabelY}
          smallFont={smallFont}
          textFont={textFont}
          tradeLabelHeight={tradeLabelHeight}
        />
        <NativePriceAxisTagBox
          x={geometry.priceLabelX}
          y={staticPriceLabelY}
          width={geometry.priceLabelWidth}
          height={tradeLabelHeight + 2}
          backgroundColor={getNativeDarkLabelBackgroundColor()}
          borderColor={color}
        />
        <NativePriceAxisTagAnimatedText
          x={staticPriceLabelTextX}
          y={staticPriceTextY}
          text={staticPriceLabelText}
          maxCharacters={Number.MAX_SAFE_INTEGER}
          characterWidth={priceLabelCharacterWidth}
          font={axisFont}
          color={color}
        />
      </Group>
    );
  }

  return (
    <Group opacity={groupOpacity}>
      {geometry.leftLineEndX > geometry.leftLineStartX && (
        <SkiaLine
          p1={leftLineStart}
          p2={leftLineEnd}
          color={color}
          strokeWidth={Math.max(1, line.lineWidth)}
          style="stroke"
        >
          {dash && <DashPathEffect intervals={[...dash]} />}
        </SkiaLine>
      )}
      {geometry.rightLineEndX > geometry.rightLineStartX && (
        <SkiaLine
          p1={rightLineStart}
          p2={rightLineEnd}
          color={color}
          strokeWidth={Math.max(1, line.lineWidth)}
          style="stroke"
        >
          {dash && <DashPathEffect intervals={[...dash]} />}
        </SkiaLine>
      )}
      <NativeTradeLineLabelBody
        geometry={geometry}
        labelY={labelY}
        smallFont={smallFont}
        textFont={textFont}
        tradeLabelHeight={tradeLabelHeight}
      />
      <NativePriceAxisTagBox
        x={priceLabelX}
        y={priceLabelY}
        width={priceLabelWidth}
        height={tradeLabelHeight + 2}
        backgroundColor={getNativeDarkLabelBackgroundColor()}
        borderColor={color}
      />
      <NativePriceAxisTagAnimatedText
        x={priceLabelTextX}
        y={priceTextY}
        text={priceLabelText}
        maxCharacters={Number.MAX_SAFE_INTEGER}
        characterWidth={priceLabelCharacterWidth}
        font={axisFont}
        color={color}
      />
    </Group>
  );
}
