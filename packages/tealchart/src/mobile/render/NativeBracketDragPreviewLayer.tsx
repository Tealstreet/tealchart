import type { SharedValue } from 'react-native-reanimated';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, RoundedRect, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR } from '../../constants';
import { getNativeDarkLabelBackgroundColor, NATIVE_PRICE_AXIS_TAG_TEXT_COLOR } from '../utils/nativeColor';
import { NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, NATIVE_PRICE_AXIS_TAG_PADDING_X } from '../utils/nativePriceAxisLane';
import {
  findNativeResolvedPriceAxisTagCenterY,
  getNativePriceAxisSingleLineTextBaselineOffset,
} from '../utils/priceAxisTagLayout';
import { getNativeBracketDragTagId } from '../utils/priceAxisTagSources';
import { createNativeAxisLaneTagLayout, PRICE_AXIS_TAG_HEIGHT } from './nativeAxisTagLayout';
import { NativePriceAxisTagAnimatedText, NativePriceAxisTagBox } from './NativePriceAxisTag';
import { formatNativeTradeLinePriceWorklet } from './nativePriceFormat';
import { sharedPriceToNativeY } from './nativeSharedViewport';
import { measureNativeSkiaAxisCharacterWidth, NativeAnimatedSkiaText } from './nativeSkiaText';

const PARTIAL_ZONE_HALF_WIDTH = 220;
const PARTIAL_MARKER_INTERVAL = 55;
const PARTIAL_MARKER_HEIGHT = 18;
const PARTIAL_MARKER_PADDING_X = 6;
const PARTIAL_MARKER_MIN_GAP = 8;
const PARTIAL_MAIN_LABEL_HEIGHT = 22;
// Roughly a fingertip. The markers and the summary pill are read *while* the
// finger is down, so they have to clear it rather than merely not overlap the
// drag zone - the old 5px put them directly under the thumb.
const PARTIAL_THUMB_CLEARANCE = 44;
const PARTIAL_SURFACE_GAP = 6;
const PARTIAL_PREVIEW_INSET_X = 8;
const PARTIAL_MARKERS = [
  { key: 'left-10', percent: 10, offset: -PARTIAL_ZONE_HALF_WIDTH, side: -1 },
  { key: 'left-25', percent: 25, offset: -PARTIAL_MARKER_INTERVAL * 3, side: -1 },
  { key: 'left-50', percent: 50, offset: -PARTIAL_MARKER_INTERVAL * 2, side: -1 },
  { key: 'left-75', percent: 75, offset: -PARTIAL_MARKER_INTERVAL, side: -1 },
  { key: 'center-100', percent: 100, offset: 0, side: 0 },
  { key: 'right-75', percent: 75, offset: PARTIAL_MARKER_INTERVAL, side: 1 },
  { key: 'right-50', percent: 50, offset: PARTIAL_MARKER_INTERVAL * 2, side: 1 },
  { key: 'right-25', percent: 25, offset: PARTIAL_MARKER_INTERVAL * 3, side: 1 },
  { key: 'right-10', percent: 10, offset: PARTIAL_ZONE_HALF_WIDTH, side: 1 },
] as const;

export const NATIVE_BRACKET_PARTIAL_MARKER_TEXTS = PARTIAL_MARKERS.map((marker) => `${marker.percent}%`);

function clampWorklet(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function formatNativeSignedFixed(value: number, decimals: number): string {
  'worklet';
  if (!Number.isFinite(value)) return '0.00';
  return Math.abs(value).toFixed(decimals);
}

export function resolveNativeBracketPartialMarkerOffset(percent: number, side: number): number {
  'worklet';
  if (percent >= 100) return 0;
  const direction = side < 0 ? -1 : 1;
  if (percent <= 10) return direction * PARTIAL_ZONE_HALF_WIDTH;
  if (percent <= 25) return direction * PARTIAL_MARKER_INTERVAL * 3;
  if (percent <= 50) return direction * PARTIAL_MARKER_INTERVAL * 2;
  return direction * PARTIAL_MARKER_INTERVAL;
}

export function shouldShowNativeBracketPartialMarker({
  activeCenter,
  activeWidth,
  isActive,
  markerCenter,
  markerWidth,
  zoneLeft,
  zoneRight,
}: {
  activeCenter: number;
  activeWidth: number;
  isActive: boolean;
  markerCenter: number;
  markerWidth: number;
  zoneLeft: number;
  zoneRight: number;
}): boolean {
  'worklet';
  if (isActive) return true;

  const naturalLeft = markerCenter - markerWidth / 2;
  const naturalRight = markerCenter + markerWidth / 2;
  if (naturalLeft < zoneLeft || naturalRight > zoneRight) return false;

  const activeClearance = Math.abs(markerCenter - activeCenter);
  return activeClearance >= (markerWidth + activeWidth) / 2 + PARTIAL_MARKER_MIN_GAP;
}

export function formatNativeBracketPartialPreviewLabel({
  bracketType,
  entryPrice,
  isLong,
  notional,
  partialPercent,
  price,
}: {
  bracketType: string;
  entryPrice: number;
  isLong: boolean;
  notional: number;
  partialPercent: number;
  price: number;
}): string {
  'worklet';
  const normalizedPercent = Math.round(partialPercent);
  const bracketLabel = bracketType.toUpperCase();
  const typeLabel = normalizedPercent < 100 ? `${normalizedPercent}% Partial ${bracketLabel}` : bracketLabel;
  if (!Number.isFinite(entryPrice) || entryPrice === 0 || !Number.isFinite(price)) return typeLabel;

  const percentDistance = ((price - entryPrice) / entryPrice) * 100;
  const percentSign = percentDistance >= 0 ? '+' : '-';
  const percentText = `${percentSign}${formatNativeSignedFixed(percentDistance, 2)}%`;
  if (!Number.isFinite(notional) || notional <= 0) return `${typeLabel} | ${percentText}`;

  const priceDiff = isLong ? price - entryPrice : entryPrice - price;
  const pnl = ((priceDiff * notional) / entryPrice) * (normalizedPercent / 100);
  const pnlSign = pnl >= 0 ? '+' : '-';
  return `${pnlSign}$${formatNativeSignedFixed(pnl, 2)} | ${typeLabel} | ${percentText}`;
}

function resolveNativePriceAxisTagCenterY(
  resolvedPriceAxisTags: readonly NativeResolvedPriceAxisTag[],
  targetId: string,
  fallbackCenterY: number,
): number {
  'worklet';
  return findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags, targetId, fallbackCenterY);
}

/**
 * Where the marker rail and the summary pill sit relative to the finger.
 *
 * Resolved as a pair rather than independently: each one alone would happily
 * fall back to the same side as the other near a pane edge and land on top of
 * it. The pill takes the far side by default and stacks behind the markers when
 * both are forced to share.
 *
 * The final clamp can pull a surface back inside the clearance on a short pane.
 * That is deliberate - off-screen is worse than close to the thumb.
 */
export function resolveNativePartialSurfaceTops({
  draggingDown,
  fingerY,
  labelHeight,
  markerHeight,
  paneBottom,
  paneTop,
}: {
  draggingDown: boolean;
  fingerY: number;
  labelHeight: number;
  markerHeight: number;
  paneBottom: number;
  paneTop: number;
}): { labelTop: number; markerTop: number } {
  'worklet';
  const fitsBelow = (top: number, height: number) => top + height <= paneBottom - 2;
  const fitsAbove = (top: number) => top >= paneTop + 2;

  const markerBelow = fingerY + PARTIAL_THUMB_CLEARANCE;
  const markerAbove = fingerY - PARTIAL_THUMB_CLEARANCE - markerHeight;
  const markersGoBelow = draggingDown
    ? fitsBelow(markerBelow, markerHeight) || !fitsAbove(markerAbove)
    : !fitsAbove(markerAbove) && fitsBelow(markerBelow, markerHeight);
  const markerRaw = markersGoBelow ? markerBelow : markerAbove;

  // Opposite side from the markers where it fits, otherwise stacked beyond
  // them. Both stay unclamped here on purpose: stacking off a clamped marker
  // and then clamping again collapses the two onto the same edge.
  const labelFar = markersGoBelow
    ? fingerY - PARTIAL_THUMB_CLEARANCE - labelHeight
    : fingerY + PARTIAL_THUMB_CLEARANCE;
  const labelFarFits = markersGoBelow ? fitsAbove(labelFar) : fitsBelow(labelFar, labelHeight);
  const labelRaw = labelFarFits
    ? labelFar
    : markersGoBelow
      ? markerRaw + markerHeight + PARTIAL_SURFACE_GAP
      : markerRaw - PARTIAL_SURFACE_GAP - labelHeight;

  // Shift the pair as one so their separation survives. Clamping them
  // independently is what let them land on top of each other near an edge.
  const unionTop = Math.min(markerRaw, labelRaw);
  const unionBottom = Math.max(markerRaw + markerHeight, labelRaw + labelHeight);
  let shift = 0;
  if (unionBottom > paneBottom - 2) shift = paneBottom - 2 - unionBottom;
  if (unionTop + shift < paneTop + 2) shift = paneTop + 2 - unionTop;

  return { labelTop: labelRaw + shift, markerTop: markerRaw + shift };
}

function isNativeBracketPreviewYVisible(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return value >= frame.mainPane.top && value <= frame.mainPane.bottom;
}

export function NativePartialMarker({
  activeColor,
  axisCharacterWidth,
  dragState,
  marker,
  markerBaselineY,
  markerTop,
  zoneLeft,
  zoneRight,
  axisFont,
}: {
  activeColor: SharedValue<string>;
  axisCharacterWidth: number;
  dragState: NativeBracketDragSharedValues;
  marker: (typeof PARTIAL_MARKERS)[number];
  markerBaselineY: SharedValue<number>;
  markerTop: SharedValue<number>;
  zoneLeft: SharedValue<number>;
  zoneRight: SharedValue<number>;
  axisFont: ReturnType<typeof Skia.Font>;
}) {
  const text = `${marker.percent}%`;
  const inactiveMarkerFill = getNativeDarkLabelBackgroundColor();
  const markerWidth = Math.ceil(text.length * axisCharacterWidth) + PARTIAL_MARKER_PADDING_X * 2;
  const activeMarkerWidth = useDerivedValue(() => {
    const percent = Math.round(dragState.activePartialPercent.value);
    const activeTextLength = percent >= 100 ? 4 : `${percent}%`.length;
    return Math.ceil(activeTextLength * axisCharacterWidth) + PARTIAL_MARKER_PADDING_X * 2;
  });
  const markerCenter = useDerivedValue(() => dragState.activeDragStartX.value + marker.offset);
  const markerX = useDerivedValue(() =>
    clampWorklet(
      markerCenter.value - markerWidth / 2,
      zoneLeft.value,
      Math.max(zoneLeft.value, zoneRight.value - markerWidth),
    ),
  );
  const markerTextX = useDerivedValue(() => markerX.value + PARTIAL_MARKER_PADDING_X);
  const isActive = useDerivedValue(() => {
    if (!dragState.activePartialEnabled.value) return false;
    const dragSide = dragState.activeDragCurrentX.value < dragState.activeDragStartX.value ? -1 : 1;
    const percent = Math.round(dragState.activePartialPercent.value);
    return marker.percent === percent && (marker.side === 0 || marker.side === dragSide);
  });
  const activeMarkerCenter = useDerivedValue(() => {
    const dragSide = dragState.activeDragCurrentX.value < dragState.activeDragStartX.value ? -1 : 1;
    return (
      dragState.activeDragStartX.value +
      resolveNativeBracketPartialMarkerOffset(Math.round(dragState.activePartialPercent.value), dragSide)
    );
  });
  const shouldShow = useDerivedValue(() =>
    shouldShowNativeBracketPartialMarker({
      activeCenter: activeMarkerCenter.value,
      activeWidth: activeMarkerWidth.value,
      isActive: isActive.value,
      markerCenter: markerCenter.value,
      markerWidth,
      zoneLeft: zoneLeft.value,
      zoneRight: zoneRight.value,
    }),
  );
  const markerBorderColor = useDerivedValue(() => (isActive.value ? activeColor.value : 'rgba(160, 166, 176, 0.45)'));
  const markerFill = useDerivedValue(() => (isActive.value ? activeColor.value : inactiveMarkerFill));
  const markerOpacity = useDerivedValue(() =>
    dragState.activeObjectId.value && dragState.activePartialEnabled.value && shouldShow.value
      ? isActive.value
        ? 0.94
        : 0.74
      : 0,
  );

  return (
    <Group opacity={markerOpacity}>
      <RoundedRect
        x={markerX}
        y={markerTop}
        width={markerWidth}
        height={PARTIAL_MARKER_HEIGHT}
        r={3}
        color={markerFill}
      />
      <RoundedRect
        x={markerX}
        y={markerTop}
        width={markerWidth}
        height={PARTIAL_MARKER_HEIGHT}
        r={3}
        color={markerBorderColor}
        style="stroke"
        strokeWidth={1}
      />
      <NativeAnimatedSkiaText
        x={markerTextX}
        y={markerBaselineY}
        text={text}
        font={axisFont}
        color={NATIVE_PRICE_AXIS_TAG_TEXT_COLOR}
      />
    </Group>
  );
}

export function NativePartialBoundaryLine({
  dragState,
  marker,
  zoneBottom,
  zoneLeft,
  zoneRight,
  zoneTop,
}: {
  dragState: NativeBracketDragSharedValues;
  marker: (typeof PARTIAL_MARKERS)[number];
  zoneBottom: SharedValue<number>;
  zoneLeft: SharedValue<number>;
  zoneRight: SharedValue<number>;
  zoneTop: SharedValue<number>;
}) {
  const markerX = useDerivedValue(() =>
    clampWorklet(dragState.activeDragStartX.value + marker.offset, zoneLeft.value, zoneRight.value),
  );
  const markerLineStart = useDerivedValue(() => ({ x: markerX.value, y: zoneTop.value }));
  const markerLineEnd = useDerivedValue(() => ({ x: markerX.value, y: zoneBottom.value }));

  return (
    <SkiaLine p1={markerLineStart} p2={markerLineEnd} color="rgba(200, 204, 212, 0.35)" strokeWidth={1}>
      <DashPathEffect intervals={[3, 5]} />
    </SkiaLine>
  );
}

export function AnimatedBracketDragPreview({
  dragState,
  frame,
  pricePrecision,
  resolvedPriceAxisTags,
  sharedViewport,
  axisFont,
}: {
  dragState: NativeBracketDragSharedValues;
  frame: NativeChartFrame;
  pricePrecision: number;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  axisFont: ReturnType<typeof Skia.Font>;
}) {
  const y = useDerivedValue(() => {
    if (!dragState.activeObjectId.value) return -1000;
    return sharedPriceToNativeY(dragState.activePrice.value, sharedViewport, frame);
  });
  const color = useDerivedValue(() => dragState.activeColor.value || DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR);
  // The tag and zone fills sit behind text so they use the tinted button colour.
  // The price line is a hairline on a dark canvas and needs the bracket's own
  // colour, or it reads as no line at all - which is how it looked outside
  // partial mode, where the zone gave no other clue where the price was.
  const lineColor = useDerivedValue(
    () => dragState.activeLineColor.value || dragState.activeColor.value || DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  );
  const labelBackgroundColor = getNativeDarkLabelBackgroundColor();
  const lineStart = useDerivedValue(() => ({ x: frame.contentLeft, y: y.value }));
  const tagLayout = createNativeAxisLaneTagLayout(frame);
  const tagRight = tagLayout.x + tagLayout.width;
  const axisCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const tagText = useDerivedValue(() => {
    const bracket = dragState.activeBracketType.value.toUpperCase();
    return `${bracket} ${formatNativeTradeLinePriceWorklet(dragState.activePrice.value, pricePrecision)}`;
  });
  const tagWidth = useDerivedValue(() =>
    Math.max(
      tagLayout.width,
      NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
      Math.ceil(tagText.value.length * axisCharacterWidth) + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2,
    ),
  );
  const tagX = useDerivedValue(() => tagRight - tagWidth.value);
  const tagTextX = useDerivedValue(
    () => tagRight - NATIVE_PRICE_AXIS_TAG_PADDING_X - tagText.value.length * axisCharacterWidth,
  );
  const labelCenterY = useDerivedValue(() => {
    if (!dragState.activeObjectId.value) return -1000;
    return resolveNativePriceAxisTagCenterY(
      resolvedPriceAxisTags.value,
      getNativeBracketDragTagId(dragState.activeObjectId.value, dragState.activeBracketType.value),
      y.value,
    );
  });
  const lineEnd = useDerivedValue(() => ({ x: tagX.value, y: y.value }));
  const connectorStart = useDerivedValue(() => ({ x: tagX.value, y: y.value }));
  const connectorEnd = useDerivedValue(() => ({ x: tagX.value, y: labelCenterY.value }));
  const connectorOpacity = useDerivedValue(() => (Math.abs(labelCenterY.value - y.value) > 2 ? 0.5 : 0));
  const labelY = useDerivedValue(() => labelCenterY.value - PRICE_AXIS_TAG_HEIGHT / 2);
  const textBaselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(PRICE_AXIS_TAG_HEIGHT);
  const textY = useDerivedValue(() => labelY.value + textBaselineOffset);
  const partialPreviewOpacity = useDerivedValue(() => {
    if (!dragState.activeObjectId.value || !dragState.activePartialEnabled.value) return 0;
    if (!Number.isFinite(dragState.activeEntryPrice.value) || dragState.activeEntryPrice.value === 0) return 0;
    return isNativeBracketPreviewYVisible(y.value, frame) ? 1 : 0;
  });
  const entryY = useDerivedValue(() => sharedPriceToNativeY(dragState.activeEntryPrice.value, sharedViewport, frame));
  const zoneTop = useDerivedValue(() => clampWorklet(Math.min(entryY.value, y.value), frame.mainPane.top, frame.mainPane.bottom));
  const zoneBottom = useDerivedValue(() =>
    clampWorklet(Math.max(entryY.value, y.value), frame.mainPane.top, frame.mainPane.bottom),
  );
  const zoneHeight = useDerivedValue(() => Math.max(1, zoneBottom.value - zoneTop.value));
  const partialBoundsLeft = frame.contentLeft + PARTIAL_PREVIEW_INSET_X;
  const partialBoundsRight = Math.max(partialBoundsLeft, frame.priceAxisLeft - PARTIAL_PREVIEW_INSET_X);
  const zoneLeft = useDerivedValue(() =>
    clampWorklet(
      dragState.activeDragStartX.value - PARTIAL_ZONE_HALF_WIDTH,
      partialBoundsLeft,
      Math.max(partialBoundsLeft, partialBoundsRight - PARTIAL_MARKER_INTERVAL),
    ),
  );
  const zoneRight = useDerivedValue(() =>
    clampWorklet(
      dragState.activeDragStartX.value + PARTIAL_ZONE_HALF_WIDTH,
      Math.min(partialBoundsRight, zoneLeft.value + PARTIAL_MARKER_INTERVAL),
      partialBoundsRight,
    ),
  );
  const zoneWidth = useDerivedValue(() => Math.max(1, zoneRight.value - zoneLeft.value));
  const dragOrigin = useDerivedValue(() => ({
    x: clampWorklet(dragState.activeDragStartX.value, partialBoundsLeft, partialBoundsRight),
    y: entryY.value,
  }));
  const zoneLeftOnBracket = useDerivedValue(() => ({ x: zoneLeft.value, y: y.value }));
  const zoneRightOnBracket = useDerivedValue(() => ({ x: zoneRight.value, y: y.value }));
  const partialSurfaceTops = useDerivedValue(() =>
    resolveNativePartialSurfaceTops({
      // Ties (no movement yet) read as downward, matching the old default side.
      draggingDown: dragState.activeDragCurrentY.value >= dragState.activeDragStartY.value,
      fingerY: dragState.activeDragCurrentY.value,
      labelHeight: PARTIAL_MAIN_LABEL_HEIGHT,
      markerHeight: PARTIAL_MARKER_HEIGHT,
      paneBottom: frame.mainPane.bottom,
      paneTop: frame.mainPane.top,
    }),
  );
  const markerTop = useDerivedValue(() => partialSurfaceTops.value.markerTop);
  const markerBaselineY = useDerivedValue(() => markerTop.value + 13);
  const partialLabelText = useDerivedValue(
    () =>
      formatNativeBracketPartialPreviewLabel({
        bracketType: dragState.activeBracketType.value,
        entryPrice: dragState.activeEntryPrice.value,
        isLong: dragState.activePositionIsLong.value,
        notional: dragState.activePositionNotional.value,
        partialPercent: dragState.activePartialPercent.value,
        price: dragState.activePrice.value,
      }),
  );
  const partialLabelWidth = useDerivedValue(() =>
    Math.ceil(partialLabelText.value.length * axisCharacterWidth) + PARTIAL_MARKER_PADDING_X * 2,
  );
  const partialLabelX = useDerivedValue(() =>
    clampWorklet(
      dragState.activeDragCurrentX.value - partialLabelWidth.value / 2,
      zoneLeft.value,
      Math.max(zoneLeft.value, zoneRight.value - partialLabelWidth.value),
    ),
  );
  const partialLabelY = useDerivedValue(() => partialSurfaceTops.value.labelTop);
  const partialLabelBaselineY = useDerivedValue(() => partialLabelY.value + 15);
  const partialLabelTextX = useDerivedValue(() => partialLabelX.value + PARTIAL_MARKER_PADDING_X);
  const previewOpacity = useDerivedValue(() =>
    dragState.activeObjectId.value && isNativeBracketPreviewYVisible(y.value, frame) ? 1 : 0,
  );

  return (
    <Group opacity={previewOpacity}>
      <SkiaLine p1={lineStart} p2={lineEnd} color={lineColor} strokeWidth={1.5} style="stroke">
        <DashPathEffect intervals={[4, 4]} />
      </SkiaLine>
      <Group opacity={partialPreviewOpacity}>
        <RoundedRect
          x={zoneLeft}
          y={zoneTop}
          width={zoneWidth}
          height={zoneHeight}
          r={4}
          color={color}
          opacity={0.08}
        />
        <RoundedRect
          x={zoneLeft}
          y={zoneTop}
          width={zoneWidth}
          height={zoneHeight}
          r={4}
          color={color}
          opacity={0.5}
          style="stroke"
          strokeWidth={1}
        >
          <DashPathEffect intervals={[5, 4]} />
        </RoundedRect>
        <SkiaLine p1={dragOrigin} p2={zoneLeftOnBracket} color={color} strokeWidth={1} opacity={0.6} />
        <SkiaLine p1={dragOrigin} p2={zoneRightOnBracket} color={color} strokeWidth={1} opacity={0.6} />
        {PARTIAL_MARKERS.slice(1, -1).map((marker) => (
          <NativePartialBoundaryLine
            key={`partial-line-${marker.key}`}
            dragState={dragState}
            marker={marker}
            zoneBottom={zoneBottom}
            zoneLeft={zoneLeft}
            zoneRight={zoneRight}
            zoneTop={zoneTop}
          />
        ))}
        {PARTIAL_MARKERS.map((marker) => (
          <NativePartialMarker
            key={marker.key}
            activeColor={color}
            axisCharacterWidth={axisCharacterWidth}
            dragState={dragState}
            marker={marker}
            markerBaselineY={markerBaselineY}
            markerTop={markerTop}
            zoneLeft={zoneLeft}
            zoneRight={zoneRight}
            axisFont={axisFont}
          />
        ))}
        <RoundedRect
          x={partialLabelX}
          y={partialLabelY}
          width={partialLabelWidth}
          height={PARTIAL_MAIN_LABEL_HEIGHT}
          r={4}
          color={labelBackgroundColor}
        />
        <RoundedRect
          x={partialLabelX}
          y={partialLabelY}
          width={partialLabelWidth}
          height={PARTIAL_MAIN_LABEL_HEIGHT}
          r={4}
          color={color}
          style="stroke"
          strokeWidth={1}
        />
        <NativeAnimatedSkiaText
          x={partialLabelTextX}
          y={partialLabelBaselineY}
          text={partialLabelText}
          font={axisFont}
          color={NATIVE_PRICE_AXIS_TAG_TEXT_COLOR}
        />
      </Group>
      <SkiaLine p1={connectorStart} p2={connectorEnd} color={color} strokeWidth={1} opacity={connectorOpacity} />
      <NativePriceAxisTagBox
        x={tagX}
        y={labelY}
        width={tagWidth}
        height={PRICE_AXIS_TAG_HEIGHT}
        backgroundColor={labelBackgroundColor}
        borderColor={color}
      />
      <NativePriceAxisTagAnimatedText
        x={tagTextX}
        y={textY}
        text={tagText}
        maxCharacters={Number.MAX_SAFE_INTEGER}
        characterWidth={axisCharacterWidth}
        font={axisFont}
        color={NATIVE_PRICE_AXIS_TAG_TEXT_COLOR}
        characterSet="0123456789,.-:+TPSL"
      />
    </Group>
  );
}
