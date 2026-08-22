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

import { resolvePriceAxisTagStyle } from '../../utils/priceAxisTagStyle';
import {
  clampNativePriceAxisTagCenterY,
  findNativeResolvedPriceAxisTagCenterY,
  getNativePriceAxisSingleLineTextBaselineOffset,
} from '../utils/priceAxisTagLayout';
import { getNativeTradeLineTagId } from '../utils/priceAxisTagSources';
import {
  getNativeTradeLinePriceTagTextBaselineOffset,
  NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X,
  nativeTradeLineDashArray,
} from '../utils/tradeLineLayout';
import { NativePriceAxisTagAnimatedText, NativePriceAxisTagBox } from './NativePriceAxisTag';
import { formatNativeTradeLinePriceWorklet } from './nativePriceFormat';
import {
  getNativePriceAxisTagFloor,
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
  // A trading line's tag fills with its own colour, the same rule web applies.
  // These three tags were hardcoded dark with a coloured border, which is what
  // made native's order and position tags read differently from every other
  // runtime.
  const tagStyle = resolvePriceAxisTagStyle({
    type: 'order',
    label: { backgroundColor: line.bodyBackgroundColor, textColor: line.bodyTextColor },
    color,
  });
  const pendingOpacity = line.actionState?.isAwaitingCallback ? 0.55 : 1;
  const groupOpacity = useDerivedValue(() => (isNativeYInMainPane(rawY.value, frame) ? pendingOpacity : 0));
  // While this line is being dragged its tag is drawn by the floating overlay
  // above every other tag, so the in-place one stands down rather than drawing
  // the same tag twice at the same price.
  const axisTagOpacity = useDerivedValue(() =>
    dragState && dragState.activeObjectId.value === geometry.objectId ? 0 : 1,
  );

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
        {/* Stands down for a dragged line exactly as the live branch does. A
            drag can be in flight while a data load holds this projection, and
            without the gate its tag draws under the floating one. */}
        <Group opacity={axisTagOpacity}>
          <NativePriceAxisTagBox
            x={geometry.priceLabelX}
            y={staticPriceLabelY}
            width={geometry.priceLabelWidth}
            height={tradeLabelHeight + 2}
            backgroundColor={tagStyle.backgroundColor}
            borderColor={tagStyle.borderColor}
          />
          <NativePriceAxisTagAnimatedText
            x={staticPriceLabelTextX}
            y={staticPriceTextY}
            text={staticPriceLabelText}
            maxCharacters={Number.MAX_SAFE_INTEGER}
            characterWidth={priceLabelCharacterWidth}
            font={axisFont}
            color={tagStyle.textColor}
          />
        </Group>
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
      <Group opacity={axisTagOpacity}>
        <NativePriceAxisTagBox
          x={priceLabelX}
          y={priceLabelY}
          width={priceLabelWidth}
          height={tradeLabelHeight + 2}
          backgroundColor={tagStyle.backgroundColor}
          borderColor={tagStyle.borderColor}
        />
        <NativePriceAxisTagAnimatedText
          x={priceLabelTextX}
          y={priceTextY}
          text={priceLabelText}
          maxCharacters={Number.MAX_SAFE_INTEGER}
          characterWidth={priceLabelCharacterWidth}
          font={axisFont}
          color={tagStyle.textColor}
        />
      </Group>
    </Group>
  );
}

/**
 * The dragged line's price-axis tag, drawn after every other trade line so it
 * floats above them.
 *
 * One of these per line, gated to the one being dragged - the same shape as
 * AnimatedTradeLine, so colour and geometry stay static per instance instead of
 * being looked up per frame.
 *
 * It reuses the line's own geometry rather than the axis lane, so it lands
 * exactly where the in-place tag was and does not jump sideways when a drag
 * starts. Pinned to the drag price and floor-clamped: out of the de-overlap
 * stack, but still not allowed into the time axis.
 */
export function AnimatedTradeLineDragTag({
  axisFont,
  color,
  backgroundColor,
  textColor,
  dragState,
  frame,
  geometry,
  pricePrecision,
  sharedViewport,
  tradeLabelHeight,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  color: string;
  /** The dragged line's own body colours, so the floating tag matches the tag it
   *  stands in for rather than inventing its own look. */
  backgroundColor?: string;
  textColor?: string;
  dragState: NativeOrderDragSharedValues;
  frame: NativeChartFrame;
  geometry: NativeTradeLineGeometry;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
}) {
  const tagStyle = resolvePriceAxisTagStyle({ type: 'order', label: { backgroundColor, textColor }, color });
  const characterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const tagHeight = tradeLabelHeight + 2;
  const baselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(tagHeight);
  const right = geometry.priceLabelX + geometry.priceLabelWidth;
  const opacity = useDerivedValue(() => (dragState.activeObjectId.value === geometry.objectId ? 1 : 0));
  const centerY = useDerivedValue(() =>
    clampNativePriceAxisTagCenterY(
      sharedPriceToNativeY(dragState.activePrice.value, sharedViewport, frame),
      tagHeight,
      frame.mainPane.top,
      getNativePriceAxisTagFloor(frame),
    ),
  );
  const text = useDerivedValue(() => formatNativeTradeLinePriceWorklet(dragState.activePrice.value, pricePrecision));
  const width = useDerivedValue(() =>
    Math.max(
      geometry.priceLabelWidth,
      Math.ceil(text.value.length * characterWidth) + NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2,
    ),
  );
  const x = useDerivedValue(() => right - width.value);
  const y = useDerivedValue(() => centerY.value - tagHeight / 2);
  const textX = useDerivedValue(
    () => right - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X - text.value.length * characterWidth,
  );
  const textY = useDerivedValue(() => y.value + baselineOffset);

  return (
    <Group opacity={opacity}>
      <NativePriceAxisTagBox
        x={x}
        y={y}
        width={width}
        height={tagHeight}
        backgroundColor={tagStyle.backgroundColor}
        borderColor={tagStyle.borderColor}
      />
      <NativePriceAxisTagAnimatedText
        x={textX}
        y={textY}
        text={text}
        maxCharacters={Number.MAX_SAFE_INTEGER}
        characterWidth={characterWidth}
        font={axisFont}
        color={tagStyle.textColor}
      />
    </Group>
  );
}
