import type { SharedValue } from 'react-native-reanimated';
import type { PriceLine } from '../../types';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { resolvePriceAxisTagStyle } from '../../utils/priceAxisTagStyle';
import { isNativeBracketPriceLineRefActive } from '../utils/nativeBracketPriceLines';
import {
  clampNativePriceAxisTagCenterY,
  findNativeResolvedPriceAxisTagCenterY,
  getNativeCountdownLayoutText,
  getNativePriceAxisPrimaryTextBaselineOffset,
  getNativePriceAxisSecondaryTextBaselineOffset,
  getNativePriceAxisSingleLineTextBaselineOffset,
  getNativePriceLineMeasurementText,
} from '../utils/priceAxisTagLayout';
import { DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT, getNativePriceLineTagId } from '../utils/priceAxisTagSources';
import { formatNativeTradeLinePrice } from '../utils/tradeLineLayout';
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
import { getNativePriceAxisTagFloor, isNativeMainPaneVisible, sharedPriceToNativeY } from './nativeSharedViewport';
import { measureNativeSkiaAxisCharacterWidth, measureNativeSkiaTextWidth } from './nativeSkiaText';

function priceLineDash(lineStyle: PriceLine['lineStyle']): number[] | null {
  if (lineStyle === 'dotted') return [2, 5];
  if (lineStyle === 'dashed') return [7, 5];
  return null;
}

function isNativePriceLineYVisible(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return isNativeMainPaneVisible(frame) && value >= frame.mainPane.top && value <= frame.mainPane.bottom;
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
  line: NativeRenderablePriceLine;
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
  const tagHeight = hasSecondaryText ? DEFAULT_NATIVE_PRICE_AXIS_TWO_LINE_TAG_HEIGHT : PRICE_AXIS_TAG_HEIGHT;
  const measurementLabel = getNativePriceLineMeasurementText(label, secondaryLayoutLabel, (value) =>
    measureNativeSkiaTextWidth(axisFont, value),
  );
  const measuredAxisTag = createNativeAxisTagLayout(frame, axisFont, measurementLabel);
  const axisTag = line.nativeAxisTagWidth
    ? { ...measuredAxisTag, width: line.nativeAxisTagWidth }
    : measuredAxisTag;
  const primaryText = createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, label);
  const secondaryText = staticSecondaryLabel
    ? createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, staticSecondaryLabel)
    : null;
  const countdownCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const countdownText = useDerivedValue(() =>
    hasCountdown ? formatNativeCountdownWorklet(countdownTargetTimeMs, nowMs.value) : '',
  );
  const countdownTextX = useDerivedValue(() => {
    return axisTag.x + Math.max(0, (axisTag.width - countdownText.value.length * countdownCharacterWidth) / 2);
  });
  const primaryTextBaselineOffset = hasSecondaryText
    ? getNativePriceAxisPrimaryTextBaselineOffset(tagHeight)
    : getNativePriceAxisSingleLineTextBaselineOffset(tagHeight);
  const secondaryTextBaselineOffset = getNativePriceAxisSecondaryTextBaselineOffset(tagHeight);
  // Price lines are the only tags that honour `filled`; everything else in this
  // lane is a trading line and always fills. Unfilled still keeps the dark
  // backing rather than going transparent, which is what stops the grid reading
  // straight through a tag that overlaps it.
  const {
    filled: tagFilled,
    backgroundColor: tagBackgroundColor,
    textColor: tagColor,
  } = resolvePriceAxisTagStyle({
    type: 'price',
    label: line.label,
    color: line.color,
  });
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
  const labelY = useDerivedValue(
    () =>
      clampNativePriceAxisTagCenterY(
        labelCenterY.value,
        tagHeight,
        frame.mainPane.top,
        getNativePriceAxisTagFloor(frame),
      ) -
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
  // Pane visibility only, never the point test: a tag whose price has scrolled
  // off the pane is deliberately clamped and still drawn. A collapsed pane has
  // nothing to clamp into.
  const tagOpacity = useDerivedValue(() =>
    shouldRenderAxisTag && isNativeMainPaneVisible(frame) && !bracketSuppressed.value ? 1 : 0,
  );

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
        {shouldRenderAxisTag && isNativeMainPaneVisible(frame) ? (
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
