import type { PlotOutput } from '@tealstreet/tealscript';
import type { Skia } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { IndicatorOutputPaneInfo } from '../../rendering/indicatorOutputAxisLabels';
import type { UserDrawingCommandAvailability, UserDrawingRecentToolByCategory, UserDrawingTool } from '../../drawings';
import type { ChartChromeTheme } from '../../chromeTheme';
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
import type { NativeSelectedTradeLine, NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { useMemo, useRef } from 'react';

import { useDerivedValue } from 'react-native-reanimated';

import { resolveChartChromeTheme } from '../../chromeTheme';
import { AVAILABLE_TIMEFRAMES, filterTimeframesBySupportedResolutions } from '../../state/chartState';
import { buildLastTradePriceLine } from '../../utils/buildLastTradePriceLine';
import { NATIVE_PRICE_AXIS_TAG_SIZING, PriceAxisTagWidthCache } from '../../utils/priceAxisTagSizing';
import { createNativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import { createNativeBracketPriceLines } from '../utils/nativeBracketPriceLines';
import {
  createNativePriceAxisLane,
  createNativePriceAxisLaneWidth,
  measureNativePriceAxisTagWidth,
} from '../utils/nativePriceAxisLane';
import {
  createNativeIndicatorOutputTagSources,
  createNativePriceAxisTagSources,
  getNativePriceLineTagId,
} from '../utils/priceAxisTagSources';
import { getNativeCountdownLayoutText, getNativePriceLineMeasurementText } from '../utils/priceAxisTagLayout';
import { createNativeTopBarLayout, createNativeTopBarTimeframes } from '../utils/topBarLayout';
import {
  buildNativeTradeLineGeometries,
  getNativeOrderObjectId,
  getNativePositionObjectId,
  promoteNativeSelectedTradeLineGeometry,
} from '../utils/tradeLineLayout';
import { formatNativeCountdown } from './nativeAxisTagLayout';
import { getNativePriceGridSlot, getNativePriceGridSlotCount } from './nativeGridSlots';
import {
  formatNativePriceAxisTickWithPrecisionWorklet,
  normalizeNativePricePrecisionToTickSizeWorklet,
} from './nativePriceFormat';
import { createNativeSkiaAxisFont, createNativeSkiaFont, measureNativeSkiaTextWidth } from './nativeSkiaText';
import { getNativeVisibleBars } from './nativeVisibleBars';

const EMPTY_NATIVE_PRICE_LINES: readonly PriceLine[] = [];

function collectNativePriceGridMeasurementTexts(
  frame: NativeChartFrame | null,
  projection: NativeChartProjection | null,
  pricePrecision: number,
): string[] {
  if (!frame || !projection) return [];

  const texts: string[] = [];
  const slotCount = getNativePriceGridSlotCount(frame.mainPane.height);
  for (let index = 0; index < slotCount; index += 1) {
    const slot = getNativePriceGridSlot({
      index,
      priceMin: projection.viewport.priceMin,
      priceMax: projection.viewport.priceMax,
      priceHeight: frame.mainPane.height,
    });
    if (!slot.visible) continue;
    texts.push(formatNativePriceAxisTickWithPrecisionWorklet(slot.price, slot.spacing, pricePrecision));
  }
  return texts;
}

function collectNativePriceLineMeasurementTexts(priceLines: readonly NativeRenderablePriceLine[]): string[] {
  return priceLines.flatMap((line) => {
    const primaryLabel = line.label.primaryText;
    const secondaryLabel =
      line.countdownToTime !== undefined
        ? getNativeCountdownLayoutText(formatNativeCountdown(line.countdownToTime))
        : line.label.secondaryText;
    return secondaryLabel ? [primaryLabel, secondaryLabel] : [primaryLabel];
  });
}

function measureNativePriceLineAxisTagWidth(
  line: NativeRenderablePriceLine,
  axisFont: ReturnType<typeof Skia.Font>,
): number {
  const secondaryLabel =
    line.countdownToTime !== undefined
      ? getNativeCountdownLayoutText(formatNativeCountdown(line.countdownToTime))
      : line.label.secondaryText;
  const textWidth = (text: string) => measureNativeSkiaTextWidth(axisFont, text);
  const measurementText = getNativePriceLineMeasurementText(line.label.primaryText, secondaryLabel, textWidth);
  return measureNativePriceAxisTagWidth(measurementText, textWidth);
}

export interface NativeSkiaRenderModelInput {
  bars: readonly Bar[];
  frame: NativeChartFrame | null;
  interval: string;
  leftToolRailCollapsed?: boolean;
  lineSnapshot: {
    orderLines: readonly OrderLineRenderData[];
    positionLines: readonly PositionLineRenderData[];
  };
  layoutName?: string | null;
  layoutSelectorEnabled?: boolean;
  marginsBottom: number;
  indicatorsEnabled?: boolean;
  indicatorPaneInfo?: Readonly<Record<string, IndicatorOutputPaneInfo>>;
  indicatorPlots?: readonly PlotOutput[];
  options: RenderOptions;
  priceAxisTagHeight: number;
  priceLines?: PriceLine[];
  pricePrecision: number;
  projection: NativeChartProjection | null;
  selectedTradeLine?: NativeSelectedTradeLine | null;
  showTopBar: boolean;
  supportedResolutions?: ResolutionString[];
  symbol: string;
  topBarInterval?: string;
  topBarDefaultVisibleValues: ReadonlySet<ResolutionString>;
  topBarHeight: number;
  tradeAxisTagHeight?: number;
  /** @deprecated Trade chart-label height no longer controls order/position price-axis tags. */
  tradeLabelHeight?: number;
  userDrawingActiveTool?: UserDrawingTool;
  userDrawingCommandAvailability?: UserDrawingCommandAvailability;
  userDrawingRecentToolsByCategory?: UserDrawingRecentToolByCategory;
  volumeHeightRatio: number;
}

export interface NativeSkiaRenderModel {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  chromeTheme: ChartChromeTheme;
  gridColor: string;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  measuredPriceAxisWidth: number;
  growTradeLineDragPriceLabelWidth: (objectId: string, width: number) => void;
  nativeMutedTextColor: string;
  nativePriceLines: readonly NativeRenderablePriceLine[];
  plotPrimitiveClip: SharedValue<NativePrimitiveClip>;
  priceAxisTagSources: NativePriceAxisTagSource[];
  smallFont: ReturnType<typeof Skia.Font>;
  textColor: string;
  textFont: ReturnType<typeof Skia.Font>;
  topBarLayout: NativeTopBarLayout | null;
  tradeAxisFont: ReturnType<typeof Skia.Font>;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
  visibleBars: readonly NativeVisibleBar[];
  volumeHeight: number;
}

export function useNativeSkiaRenderModel({
  bars,
  frame,
  interval,
  indicatorsEnabled,
  indicatorPaneInfo,
  indicatorPlots,
  leftToolRailCollapsed,
  layoutName,
  layoutSelectorEnabled,
  lineSnapshot,
  marginsBottom,
  options,
  priceAxisTagHeight,
  priceLines,
  pricePrecision,
  projection,
  selectedTradeLine,
  showTopBar,
  supportedResolutions,
  symbol,
  topBarInterval,
  topBarDefaultVisibleValues,
  topBarHeight,
  tradeAxisTagHeight,
  userDrawingActiveTool,
  userDrawingCommandAvailability,
  userDrawingRecentToolsByCategory,
  volumeHeightRatio,
}: NativeSkiaRenderModelInput): NativeSkiaRenderModel {
  const resolvedTradeAxisTagHeight = tradeAxisTagHeight ?? NATIVE_PRICE_AXIS_TAG_SIZING.trade.height;
  const textFont = useMemo(() => createNativeSkiaFont(NATIVE_PRICE_AXIS_TAG_SIZING.other.fontSize), []);
  const smallFont = useMemo(() => createNativeSkiaFont(NATIVE_PRICE_AXIS_TAG_SIZING.indicatorOutput.fontSize), []);
  const titleFont = useMemo(() => createNativeSkiaFont(13), []);
  const axisFont = useMemo(() => createNativeSkiaAxisFont(NATIVE_PRICE_AXIS_TAG_SIZING.other.fontSize), []);
  const tradeAxisFont = useMemo(() => createNativeSkiaAxisFont(NATIVE_PRICE_AXIS_TAG_SIZING.trade.fontSize), []);
  const priceLineAxisTagWidthCache = useRef(new PriceAxisTagWidthCache()).current;
  const tradeLineAxisTagWidthCache = useRef(new PriceAxisTagWidthCache()).current;
  const priceTickSize = useMemo(() => normalizeNativePricePrecisionToTickSizeWorklet(pricePrecision), [pricePrecision]);
  const chromeTheme = useMemo(() => resolveChartChromeTheme(options), [options]);
  const nativeMutedTextColor = chromeTheme.mutedTextColor;
  const selectedTopBarInterval = topBarInterval ?? interval;
  const nativeTopBarMenuTimeframes = useMemo(
    () => filterTimeframesBySupportedResolutions(supportedResolutions, AVAILABLE_TIMEFRAMES),
    [supportedResolutions],
  );
  const nativeTopBarTimeframes = useMemo(() => {
    return createNativeTopBarTimeframes({
      timeframes: nativeTopBarMenuTimeframes,
      interval: selectedTopBarInterval,
      supportedResolutions,
      defaultVisibleValues: topBarDefaultVisibleValues,
    });
  }, [nativeTopBarMenuTimeframes, selectedTopBarInterval, supportedResolutions, topBarDefaultVisibleValues]);
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
            activeBackgroundColor: chromeTheme.activeBackgroundColor,
            indicatorsEnabled,
            layoutName,
            layoutSelectorEnabled,
            timeframeMenuEnabled: nativeTopBarMenuTimeframes.length > 1,
            undoEnabled: userDrawingCommandAvailability?.canUndo === true,
            redoEnabled: userDrawingCommandAvailability?.canRedo === true,
          })
        : null,
    [
      frame,
      layoutName,
      layoutSelectorEnabled,
      nativeMutedTextColor,
      nativeTopBarMenuTimeframes.length,
      nativeTopBarTimeframes,
      chromeTheme.activeBackgroundColor,
      indicatorsEnabled,
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
    () => {
      const geometries = projection
        ? buildNativeTradeLineGeometries(lineSnapshot.orderLines, lineSnapshot.positionLines, {
            dimensions: projection.frame.dimensions,
            priceLabelLane: createNativePriceAxisLane(projection.frame),
            pricePrecision,
            chartLabelMinX: options.chartLabelMinX,
            textWidth: (text) => measureNativeSkiaTextWidth(textFont, text),
            smallTextWidth: (text) => measureNativeSkiaTextWidth(smallFont, text),
            priceTextWidth: (text) => measureNativeSkiaTextWidth(tradeAxisFont, text),
            priceAxisTagWidthCache: tradeLineAxisTagWidthCache,
            positiveColor: options.upColor,
            negativeColor: options.downColor,
          })
        : [];
      return promoteNativeSelectedTradeLineGeometry(geometries, selectedTradeLine);
    },
    [
      lineSnapshot.orderLines,
      lineSnapshot.positionLines,
      options.downColor,
      options.chartLabelMinX,
      options.upColor,
      pricePrecision,
      projection,
      selectedTradeLine,
      smallFont,
      textFont,
      tradeAxisFont,
      tradeLineAxisTagWidthCache,
    ],
  );
  const visibleBars = useMemo(() => (projection ? getNativeVisibleBars(bars, projection) : []), [bars, projection]);
  // User drawings are drawn entirely from derived values, so their clip has to
  // be one too - a plain rect would land a propagation ahead of what it clips.
  const plotPrimitiveClip = useDerivedValue<NativePrimitiveClip>(() =>
    frame
      ? {
          x: frame.contentLeft,
          y: frame.mainPane.top,
          width: Math.max(0, frame.priceAxisRight - frame.contentLeft),
          height: frame.mainPane.height,
        }
      : { x: 0, y: 0, width: 0, height: 0 },
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
          orderLines: lineSnapshot.orderLines,
          priceTolerance: priceTickSize,
        }),
      ),
    ],
    [lineSnapshot.orderLines, lineSnapshot.positionLines, options.upColor, pricePrecision, priceTickSize],
  );
  const nativePriceLines = useMemo(
    () =>
      [...extraPriceLines, ...bracketPriceLines, ...(lastTradeLine ? [lastTradeLine] : [])].map((line) => ({
        ...line,
        nativeAxisTagWidth: priceLineAxisTagWidthCache.resolve(
          getNativePriceLineTagId(line.id),
          measureNativePriceLineAxisTagWidth(line, axisFont),
        ),
      })),
    [axisFont, bracketPriceLines, extraPriceLines, lastTradeLine, priceLineAxisTagWidthCache],
  );
  const showIndicatorOutputAxisLabels = options.showIndicatorOutputAxisLabels;
  const priceAxisTagSources = useMemo<NativePriceAxisTagSource[]>(
    () => [
      ...createNativePriceAxisTagSources({
        extraPriceLines,
        bracketPriceLines,
        lastTradeLine,
        orderLines: lineSnapshot.orderLines,
        positionLines: lineSnapshot.positionLines,
        priceLineTagHeight: priceAxisTagHeight,
        selectedTradeLine,
        tradeLineTagHeight: resolvedTradeAxisTagHeight,
      }),
      // Only while the readouts are actually drawn. Publishing them with the
      // setting off would have the trade tags de-overlapping around tags
      // nobody can see.
      ...(showIndicatorOutputAxisLabels === false
        ? []
        : createNativeIndicatorOutputTagSources({
            panes: frame?.panes ?? [],
            indicatorPaneInfo,
            plots: indicatorPlots,
            totalBarCount: bars.length,
          })),
    ],
    [
      bars.length,
      bracketPriceLines,
      extraPriceLines,
      frame,
      indicatorPaneInfo,
      indicatorPlots,
      lastTradeLine,
      lineSnapshot.orderLines,
      lineSnapshot.positionLines,
      priceAxisTagHeight,
      selectedTradeLine,
      showIndicatorOutputAxisLabels,
      resolvedTradeAxisTagHeight,
    ],
  );
  const gridColor = options.gridColor;
  const textColor = options.textColor;
  const backgroundColor = options.backgroundColor;
  const volumeHeight = frame && options.showVolume ? Math.max(24, frame.mainPane.height * volumeHeightRatio) : 0;
  const measuredPriceAxisWidth = useMemo(() => {
    const measurementTexts = [
      ...collectNativePriceGridMeasurementTexts(frame, projection, pricePrecision),
      ...collectNativePriceLineMeasurementTexts(nativePriceLines),
      ...tradeLineGeometries.map((geometry) => geometry.priceLabelText),
    ];

    return createNativePriceAxisLaneWidth({
      pricePrecision,
      measurementTexts,
      textWidth: (text) => measureNativeSkiaTextWidth(axisFont, text),
    });
  }, [axisFont, frame, nativePriceLines, pricePrecision, projection, tradeLineGeometries]);

  // A drag reports the widest price it reached, once, when it ends. Feeding it
  // to the same grow-only cache the committed layout measures through is what
  // stops the tag narrowing again after the amend lands.
  const growTradeLineDragPriceLabelWidth = useRef((objectId: string, width: number) => {
    tradeLineAxisTagWidthCache.resolve(`order:${objectId}`, width);
  }).current;

  return {
    axisFont,
    backgroundColor,
    chromeTheme,
    gridColor,
    growTradeLineDragPriceLabelWidth,
    leftToolRailLayout,
    measuredPriceAxisWidth,
    nativeMutedTextColor,
    nativePriceLines,
    plotPrimitiveClip,
    priceAxisTagSources,
    smallFont,
    textColor,
    textFont,
    topBarLayout,
    tradeAxisFont,
    tradeLineGeometries,
    visibleBars,
    volumeHeight,
  };
}
