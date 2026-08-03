import type { Skia } from '@shopify/react-native-skia';
import type { UserDrawingCommandAvailability, UserDrawingRecentToolByCategory, UserDrawingTool } from '../../drawings';
import type {
  Bar,
  OrderLineRenderData,
  PositionLineRenderData,
  PriceLine,
  RenderOptions,
  ResolutionString,
} from '../../types';
import type { NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type { NativeTopBarLayout } from '../utils/topBarLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { useMemo } from 'react';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { buildLastTradePriceLine } from '../../utils/buildLastTradePriceLine';
import { createNativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import { createNativeBracketPriceLines } from '../utils/nativeBracketPriceLines';
import { getNativeMutedTextColor, NATIVE_TOP_BAR_ACTIVE_BACKGROUND_COLOR } from '../utils/nativeColor';
import { createNativePriceAxisLane } from '../utils/nativePriceAxisLane';
import { createNativePriceAxisTagSources } from '../utils/priceAxisTagSources';
import { createNativeTopBarLayout, createNativeTopBarTimeframes } from '../utils/topBarLayout';
import {
  buildNativeTradeLineGeometries,
  getNativeOrderObjectId,
  getNativePositionObjectId,
} from '../utils/tradeLineLayout';
import { normalizeNativePricePrecisionToTickSizeWorklet } from './nativePriceFormat';
import { createNativeSkiaAxisFont, createNativeSkiaFont, measureNativeSkiaTextWidth } from './nativeSkiaText';
import { getNativeVisibleBars } from './nativeVisibleBars';

const EMPTY_NATIVE_PRICE_LINES: readonly PriceLine[] = [];

export interface NativeSkiaRenderModelInput {
  bars: readonly Bar[];
  frame: NativeChartFrame | null;
  interval: string;
  leftToolRailCollapsed?: boolean;
  lineSnapshot: {
    orderLines: readonly OrderLineRenderData[];
    positionLines: readonly PositionLineRenderData[];
  };
  marginsBottom: number;
  onIndicatorsClick?: () => void;
  options: RenderOptions;
  priceAxisTagHeight: number;
  priceLines?: PriceLine[];
  pricePrecision: number;
  projection: NativeChartProjection | null;
  showTopBar: boolean;
  supportedResolutions?: ResolutionString[];
  symbol: string;
  topBarInterval?: string;
  topBarDefaultVisibleValues: ReadonlySet<ResolutionString>;
  topBarHeight: number;
  tradeLabelHeight: number;
  userDrawingActiveTool?: UserDrawingTool;
  userDrawingCommandAvailability?: UserDrawingCommandAvailability;
  userDrawingRecentToolsByCategory?: UserDrawingRecentToolByCategory;
  volumeHeightRatio: number;
}

export interface NativeSkiaRenderModel {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  gridColor: string;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  nativeMutedTextColor: string;
  nativePriceLines: readonly NativeRenderablePriceLine[];
  plotPrimitiveClip: NativePrimitiveClip;
  priceAxisTagSources: NativePriceAxisTagSource[];
  smallFont: ReturnType<typeof Skia.Font>;
  textColor: string;
  textFont: ReturnType<typeof Skia.Font>;
  topBarLayout: NativeTopBarLayout | null;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
  visibleBars: readonly NativeVisibleBar[];
  volumeHeight: number;
}

export function useNativeSkiaRenderModel({
  bars,
  frame,
  interval,
  leftToolRailCollapsed,
  lineSnapshot,
  marginsBottom,
  onIndicatorsClick,
  options,
  priceAxisTagHeight,
  priceLines,
  pricePrecision,
  projection,
  showTopBar,
  supportedResolutions,
  symbol,
  topBarInterval,
  topBarDefaultVisibleValues,
  topBarHeight,
  tradeLabelHeight,
  userDrawingActiveTool,
  userDrawingCommandAvailability,
  userDrawingRecentToolsByCategory,
  volumeHeightRatio,
}: NativeSkiaRenderModelInput): NativeSkiaRenderModel {
  const textFont = useMemo(() => createNativeSkiaFont(11), []);
  const smallFont = useMemo(() => createNativeSkiaFont(10), []);
  const titleFont = useMemo(() => createNativeSkiaFont(13), []);
  const axisFont = useMemo(() => createNativeSkiaAxisFont(11), []);
  const priceTickSize = useMemo(() => normalizeNativePricePrecisionToTickSizeWorklet(pricePrecision), [pricePrecision]);
  const nativeMutedTextColor = useMemo(() => getNativeMutedTextColor(options.textColor), [options.textColor]);
  const selectedTopBarInterval = topBarInterval ?? interval;
  const nativeTopBarTimeframes = useMemo(() => {
    return createNativeTopBarTimeframes({
      timeframes: AVAILABLE_TIMEFRAMES,
      interval: selectedTopBarInterval,
      supportedResolutions,
      defaultVisibleValues: topBarDefaultVisibleValues,
    });
  }, [selectedTopBarInterval, supportedResolutions, topBarDefaultVisibleValues]);
  const topBarLayout = useMemo(
    () =>
      showTopBar && frame
        ? createNativeTopBarLayout({
            width: frame.dimensions.width,
            height: topBarHeight,
            symbol,
            interval: selectedTopBarInterval,
            timeframes: nativeTopBarTimeframes,
            textWidth: (text) => measureNativeSkiaTextWidth(textFont, text),
            titleTextWidth: (text) => measureNativeSkiaTextWidth(titleFont, text),
            textColor: options.textColor,
            mutedTextColor: nativeMutedTextColor,
            activeTextColor: options.upColor,
            activeBackgroundColor: NATIVE_TOP_BAR_ACTIVE_BACKGROUND_COLOR,
            indicatorsEnabled: Boolean(onIndicatorsClick),
            undoEnabled: userDrawingCommandAvailability?.canUndo === true,
            redoEnabled: userDrawingCommandAvailability?.canRedo === true,
          })
        : null,
    [
      frame,
      nativeMutedTextColor,
      nativeTopBarTimeframes,
      onIndicatorsClick,
      options.textColor,
      options.upColor,
      showTopBar,
      selectedTopBarInterval,
      symbol,
      textFont,
      titleFont,
      topBarHeight,
      userDrawingCommandAvailability?.canRedo,
      userDrawingCommandAvailability?.canUndo,
    ],
  );
  const leftToolRailLayout = useMemo(
    () =>
      frame
        ? createNativeLeftToolRailLayout({
            height: frame.dimensions.height,
            bottomInset: marginsBottom,
            activeTool: userDrawingActiveTool,
            collapsed: leftToolRailCollapsed,
            topBarHeight: showTopBar ? topBarHeight : 0,
            userDrawingRecentToolsByCategory,
          })
        : null,
    [
      frame,
      leftToolRailCollapsed,
      marginsBottom,
      showTopBar,
      topBarHeight,
      userDrawingActiveTool,
      userDrawingRecentToolsByCategory,
    ],
  );
  const tradeLineGeometries = useMemo(
    () =>
      projection
        ? buildNativeTradeLineGeometries(lineSnapshot.orderLines, lineSnapshot.positionLines, {
            dimensions: projection.frame.dimensions,
            priceLabelLane: createNativePriceAxisLane(projection.frame),
            pricePrecision,
            chartLabelMinX: options.chartLabelMinX,
            textWidth: (text) => measureNativeSkiaTextWidth(textFont, text),
            smallTextWidth: (text) => measureNativeSkiaTextWidth(smallFont, text),
            priceTextWidth: (text) => measureNativeSkiaTextWidth(axisFont, text),
            positiveColor: options.upColor,
            negativeColor: options.downColor,
          })
        : [],
    [
      axisFont,
      lineSnapshot.orderLines,
      lineSnapshot.positionLines,
      options.downColor,
      options.chartLabelMinX,
      options.upColor,
      pricePrecision,
      projection,
      smallFont,
      textFont,
    ],
  );
  const visibleBars = useMemo(() => (projection ? getNativeVisibleBars(bars, projection) : []), [bars, projection]);
  const plotPrimitiveClip = useMemo<NativePrimitiveClip>(
    () =>
      frame
        ? {
            x: frame.contentLeft,
            y: frame.mainPane.top,
            width: Math.max(0, frame.priceAxisRight - frame.contentLeft),
            height: frame.mainPane.height,
          }
        : { x: 0, y: 0, width: 0, height: 0 },
    [frame],
  );
  const lastBar = bars[bars.length - 1] ?? null;
  const lastTradeLine = useMemo(
    () =>
      buildLastTradePriceLine({
        latestBar: lastBar,
        interval,
        pricePrecision: priceTickSize,
        upColor: options.upColor,
        downColor: options.downColor,
        renderLineOnCanvas: true,
        showAxisTag: true,
      }),
    [interval, lastBar, options.downColor, options.upColor, priceTickSize],
  );
  const extraPriceLines = useMemo(() => priceLines ?? EMPTY_NATIVE_PRICE_LINES, [priceLines]);
  const bracketPriceLines = useMemo(
    () => [
      ...lineSnapshot.orderLines.flatMap((line) =>
        createNativeBracketPriceLines({
          objectType: 'order',
          objectId: getNativeOrderObjectId(line),
          line,
          pricePrecision,
          positiveColor: options.upColor,
        }),
      ),
      ...lineSnapshot.positionLines.flatMap((line) =>
        createNativeBracketPriceLines({
          objectType: 'position',
          objectId: getNativePositionObjectId(line),
          line,
          pricePrecision,
          positiveColor: options.upColor,
        }),
      ),
    ],
    [lineSnapshot.orderLines, lineSnapshot.positionLines, options.upColor, pricePrecision],
  );
  const nativePriceLines = useMemo(
    () => [...extraPriceLines, ...bracketPriceLines, ...(lastTradeLine ? [lastTradeLine] : [])],
    [bracketPriceLines, extraPriceLines, lastTradeLine],
  );
  const priceAxisTagSources = useMemo<NativePriceAxisTagSource[]>(
    () =>
      createNativePriceAxisTagSources({
        extraPriceLines,
        bracketPriceLines,
        lastTradeLine,
        orderLines: lineSnapshot.orderLines,
        positionLines: lineSnapshot.positionLines,
        priceLineTagHeight: priceAxisTagHeight,
        tradeLineTagHeight: tradeLabelHeight + 2,
      }),
    [
      bracketPriceLines,
      extraPriceLines,
      lastTradeLine,
      lineSnapshot.orderLines,
      lineSnapshot.positionLines,
      priceAxisTagHeight,
      tradeLabelHeight,
    ],
  );
  const gridColor = options.gridColor;
  const textColor = options.textColor;
  const backgroundColor = options.backgroundColor;
  const volumeHeight = frame && options.showVolume ? Math.max(24, frame.mainPane.height * volumeHeightRatio) : 0;

  return {
    axisFont,
    backgroundColor,
    gridColor,
    leftToolRailLayout,
    nativeMutedTextColor,
    nativePriceLines,
    plotPrimitiveClip,
    priceAxisTagSources,
    smallFont,
    textColor,
    textFont,
    topBarLayout,
    tradeLineGeometries,
    visibleBars,
    volumeHeight,
  };
}
