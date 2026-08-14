import type { SharedValue } from 'react-native-reanimated';
import type { PriceLine } from '../../types';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeBracketPriceLineRef } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { isNativeBracketPriceLineRefActive } from '../utils/nativeBracketPriceLines';
import {
  getNativeDarkLabelBackgroundColor,
  getNativePriceAxisTagBackgroundColor,
  getNativePriceAxisTagTextColor,
} from '../utils/nativeColor';
import {
  clampNativePriceAxisTagCenterY,
  findNativeResolvedPriceAxisTagCenterY,
  getNativeCountdownLayoutText,
  getNativePriceAxisPrimaryTextBaselineOffset,
  getNativePriceAxisSecondaryTextBaselineOffset,
  getNativePriceAxisSingleLineTextBaselineOffset,
  getNativePriceLineMeasurementText,
} from '../utils/priceAxisTagLayout';
import { getNativePriceLineTagId } from '../utils/priceAxisTagSources';
import { formatNativeTradeLinePrice } from '../utils/tradeLineLayout';
import { NATIVE_PRICE_AXIS_TAG_PADDING_X } from '../utils/nativePriceAxisLane';
import {
  createNativeAxisTagLayout,
  createNativeAxisTagTextLayout,
  formatNativeCountdown,
  formatNativeCountdownWorklet,
  PRICE_AXIS_TAG_HEIGHT,
} from './nativeAxisTagLayout';
import {
  NativePriceAxisTagAnimatedText,
  NativePriceAxisTagBox,
  NativePriceAxisTagStaticText,
} from './NativePriceAxisTag';
import { getNativePriceAxisTagFloor, sharedPriceToNativeY } from './nativeSharedViewport';
import { measureNativeSkiaAxisCharacterWidth, measureNativeSkiaTextWidth } from './nativeSkiaText';

function priceLineDash(lineStyle: PriceLine['lineStyle']): number[] | null {
  if (lineStyle === 'dotted') return [2, 5];
  if (lineStyle === 'dashed') return [7, 5];
  return null;
}

function isNativePriceLineYVisible(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return value >= frame.mainPane.top && value <= frame.mainPane.bottom;
}

function resolveNativePriceLineAxisTagCenterY(
  resolvedPriceAxisTags: readonly NativeResolvedPriceAxisTag[],
  lineId: string,
  fallbackCenterY: number,
): number {
  'worklet';
  return findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags, getNativePriceLineTagId(lineId), fallbackCenterY);
}

export function AnimatedPriceLine({
  bracketDragState,
  frame,
  line,
  nowMs,
  pricePrecision,
  resolvedPriceAxisTags,
  sharedViewport,
  staticProjection,
  axisFont,
}: {
  bracketDragState: NativeBracketDragSharedValues;
  frame: NativeChartFrame;
  line: PriceLine & { nativeBracketRef?: NativeBracketPriceLineRef };
  nowMs: SharedValue<number>;
  pricePrecision: number;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  axisFont: ReturnType<typeof Skia.Font>;
}) {
  const dash = priceLineDash(line.lineStyle);
  const label = line.label.primaryText || formatNativeTradeLinePrice(line.price, pricePrecision);
  const hasCountdown = line.countdownToTime !== undefined;
  const countdownTargetTimeMs = line.countdownToTime ?? 0;
  const staticSecondaryLabel = hasCountdown ? undefined : line.label.secondaryText;
  const secondaryLayoutLabel = hasCountdown
    ? getNativeCountdownLayoutText(formatNativeCountdown(countdownTargetTimeMs))
    : staticSecondaryLabel;
  const hasSecondaryText = hasCountdown || Boolean(staticSecondaryLabel);
  const tagHeight = hasSecondaryText ? 34 : PRICE_AXIS_TAG_HEIGHT;
  const measurementLabel = getNativePriceLineMeasurementText(label, secondaryLayoutLabel, (value) =>
    measureNativeSkiaTextWidth(axisFont, value),
  );
  const axisTag = createNativeAxisTagLayout(frame, axisFont, measurementLabel);
  const primaryText = createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, label);
  const secondaryText = staticSecondaryLabel
    ? createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, staticSecondaryLabel)
    : null;
  const countdownCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const countdownText = useDerivedValue(() =>
    hasCountdown ? formatNativeCountdownWorklet(countdownTargetTimeMs, nowMs.value) : '',
  );
  const countdownTextX = useDerivedValue(() => {
    const textWidth = countdownText.value.length * countdownCharacterWidth;
    return axisTag.x + axisTag.width - NATIVE_PRICE_AXIS_TAG_PADDING_X - textWidth;
  });
  const primaryTextBaselineOffset = hasSecondaryText
    ? getNativePriceAxisPrimaryTextBaselineOffset(tagHeight)
    : getNativePriceAxisSingleLineTextBaselineOffset(tagHeight);
  const secondaryTextBaselineOffset = getNativePriceAxisSecondaryTextBaselineOffset(tagHeight);
  // `filled` is web's flag for a solid price-axis tag rather than an outline
  // one, and native was ignoring it and always filling - which is why the tags
  // were opaque slabs sitting over the grid labels behind them.
  //
  // Unfilled does not mean transparent. Every other tag in this lane - the
  // order and position price labels - sits on the same dark backing, which is
  // what keeps the axis readable where a tag overlaps a grid label. Dropping
  // the backing entirely let the grid read straight through the tag.
  const tagFilled = line.label.filled === true;
  const tagBackgroundColor = tagFilled
    ? getNativePriceAxisTagBackgroundColor(line.label.backgroundColor, line.color)
    : getNativeDarkLabelBackgroundColor();
  const tagColor = tagFilled
    ? getNativePriceAxisTagTextColor(line.label.textColor, tagBackgroundColor)
    : line.label.textColor || line.color;
  const bracketSuppressed = useDerivedValue(() =>
    isNativeBracketPriceLineRefActive(line.nativeBracketRef, bracketDragState),
  );
  const y = useDerivedValue(() => sharedPriceToNativeY(line.price, sharedViewport, frame));
  const labelCenterY = useDerivedValue(() =>
    resolveNativePriceLineAxisTagCenterY(resolvedPriceAxisTags.value, line.id, y.value),
  );
  // Clamped here as well as in the stack: a tag whose price leaves the pane is
  // filtered out of the resolved stack and falls back to its raw price Y, and
  // the tag still draws. The line itself is not clamped - only the label.
  const labelY = useDerivedValue(() =>
    clampNativePriceAxisTagCenterY(labelCenterY.value, tagHeight, frame.mainPane.top, getNativePriceAxisTagFloor(frame)) -
    tagHeight / 2,
  );
  const primaryTextY = useDerivedValue(() => labelY.value + primaryTextBaselineOffset);
  const secondaryTextY = useDerivedValue(() => labelY.value + secondaryTextBaselineOffset);
  const lineStart = useDerivedValue(() => ({ x: frame.contentLeft, y: y.value }));
  const lineEnd = useDerivedValue(() => ({ x: axisTag.x, y: y.value }));
  const lineOpacity = useDerivedValue(() =>
    isNativePriceLineYVisible(y.value, frame) && !bracketSuppressed.value ? 1 : 0,
  );
  const shouldRenderAxisTag = line.showAxisTag === true || !line.renderLineOnCanvas;
  const tagOpacity = useDerivedValue(() => (shouldRenderAxisTag && !bracketSuppressed.value ? 1 : 0));

  if (staticProjection) {
    const staticY = staticProjection.priceToY(line.price);
    const staticLabelY =
      clampNativePriceAxisTagCenterY(staticY, tagHeight, frame.mainPane.top, getNativePriceAxisTagFloor(frame)) -
      tagHeight / 2;
    const staticLineOpacity = isNativePriceLineYVisible(staticY, frame) ? 1 : 0;
    const staticLineStart = { x: frame.contentLeft, y: staticY };
    const staticLineEnd = { x: axisTag.x, y: staticY };

    return (
      <>
        <Group opacity={staticLineOpacity}>
          <SkiaLine p1={staticLineStart} p2={staticLineEnd} color={line.color} strokeWidth={line.lineWidth ?? 1}>
            {dash && <DashPathEffect intervals={dash} />}
          </SkiaLine>
        </Group>
        {shouldRenderAxisTag ? (
          <Group opacity={1}>
            <NativePriceAxisTagBox
              x={axisTag.x}
              y={staticLabelY}
              width={axisTag.width}
              height={tagHeight}
              backgroundColor={tagBackgroundColor}
              borderColor={line.color}
            />
            <NativePriceAxisTagStaticText
              x={primaryText.x}
              y={staticLabelY + primaryTextBaselineOffset}
              text={primaryText.text}
              font={axisFont}
              color={tagColor}
            />
            {secondaryText && (
              <NativePriceAxisTagStaticText
                x={secondaryText.x}
                y={staticLabelY + secondaryTextBaselineOffset}
                text={secondaryText.text}
                font={axisFont}
                color={tagColor}
              />
            )}
            {hasCountdown && (
              <NativePriceAxisTagAnimatedText
                x={countdownTextX}
                y={staticLabelY + secondaryTextBaselineOffset}
                text={countdownText}
                maxCharacters={8}
                characterWidth={countdownCharacterWidth}
                font={axisFont}
                color={tagColor}
                characterSet="0123456789:"
              />
            )}
          </Group>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Group opacity={lineOpacity}>
        <SkiaLine p1={lineStart} p2={lineEnd} color={line.color} strokeWidth={line.lineWidth ?? 1}>
          {dash && <DashPathEffect intervals={dash} />}
        </SkiaLine>
      </Group>
      {shouldRenderAxisTag ? (
        <Group opacity={tagOpacity}>
          <NativePriceAxisTagBox
            x={axisTag.x}
            y={labelY}
            width={axisTag.width}
            height={tagHeight}
            backgroundColor={tagBackgroundColor}
            borderColor={line.color}
          />
          <NativePriceAxisTagStaticText
            x={primaryText.x}
            y={primaryTextY}
            text={primaryText.text}
            font={axisFont}
            color={tagColor}
          />
          {secondaryText && (
            <NativePriceAxisTagStaticText
              x={secondaryText.x}
              y={secondaryTextY}
              text={secondaryText.text}
              font={axisFont}
              color={tagColor}
            />
          )}
          {hasCountdown && (
            <NativePriceAxisTagAnimatedText
              x={countdownTextX}
              y={secondaryTextY}
              text={countdownText}
              maxCharacters={8}
              characterWidth={countdownCharacterWidth}
              font={axisFont}
              color={tagColor}
              characterSet="0123456789:"
            />
          )}
        </Group>
      ) : null}
    </>
  );
}
