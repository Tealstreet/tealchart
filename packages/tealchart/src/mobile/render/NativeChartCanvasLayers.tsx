import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { UserDrawingAnchor, UserDrawingRenderEntry } from '../../drawings';
import type { Bar, OrderLineRenderData, PositionLineRenderData, RenderOptions } from '../../types';
import type { NativeCrosshairSharedValues } from '../interaction/nativeCrosshair';
import type { NativeBracketDragSharedValues, NativeOrderDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeRenderablePriceLine } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativePaneRange, NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { memo } from 'react';

import { Group, Skia } from '@shopify/react-native-skia';

import { NATIVE_PRICE_AXIS_TAG_SIZING } from '../../utils/priceAxisTagSizing';
import { NativeCandleVolumeLayer } from './NativeCandleVolumeLayer';
import { NativeChartChromeLayer } from './NativeChartChromeLayer';
import { NativeChartPrimitiveLayer } from './NativeChartPrimitiveLayer';
import { NativeChartTradeLinesLayer } from './NativeChartTradeLinesLayer';
import { NativeCrosshairLayer } from './NativeCrosshairLayer';
import { NativeIndicatorOutputAxisLabelLayer } from './NativeIndicatorOutputAxisLabelLayer';
import { NativeIndicatorPaneAxisLayer } from './NativeIndicatorPaneAxisLayer';
import { NativeIndicatorPlotLayer } from './NativeIndicatorPlotLayer';
import { NativeUserDrawingLayer } from './NativeUserDrawingLayer';

export interface NativeChartCanvasLayersProps {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  bars: readonly Bar[];
  bracketDragState: NativeBracketDragSharedValues;
  crosshair: NativeCrosshairSharedValues;
  extraPriceLines: readonly NativeRenderablePriceLine[];
  frame: NativeChartFrame;
  getOrderObjectId: (line: OrderLineRenderData) => string;
  getPositionObjectId: (line: PositionLineRenderData) => string;
  gridColor: string;
  hasDataViewport: boolean;
  hasContextMenu: boolean;
  intervalMs: number;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  indicatorPlots: readonly PlotOutput[];
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  indicatorTotalBarCount: number;
  onDragPriceLabelWidth?: (objectId: string, width: number) => void;
  /** The price scale, which the main pane's own frame does not carry. */
  mainPaneRange?: NativePaneRange | null;
  lineSnapshot: {
    orderLines: readonly OrderLineRenderData[];
    positionLines: readonly PositionLineRenderData[];
  };
  options: RenderOptions;
  plotOpacity: number;
  orderDragState: NativeOrderDragSharedValues;
  plotPrimitiveClip: SharedValue<NativePrimitiveClip>;
  pricePrecision: number;
  nowMs: SharedValue<number>;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  staticProjection?: NativeChartProjection | null;
  textColor: string;
  textFont: ReturnType<typeof Skia.Font>;
  tradeAxisFont?: ReturnType<typeof Skia.Font>;
  tradeAxisTagHeight?: number;
  tradeLabelHeight: number;
  tradeLineGeometries: readonly NativeTradeLineGeometry[];
  userDrawingDraftAnchorColor?: string;
  userDrawingDraftAnchors: readonly UserDrawingAnchor[];
  userDrawingRenderEntries: readonly UserDrawingRenderEntry[];
  visibleBars: readonly NativeVisibleBar[];
  volumeHeight: number;
}

export function NativeChartCanvasLayersImpl({
  axisFont,
  backgroundColor,
  bars,
  bracketDragState,
  crosshair,
  extraPriceLines,
  frame,
  getOrderObjectId,
  getPositionObjectId,
  gridColor,
  hasDataViewport,
  hasContextMenu,
  intervalMs,
  indicatorPaneInfo,
  indicatorPlots,
  paneRangeOverrides,
  indicatorTotalBarCount,
  lineSnapshot,
  mainPaneRange,
  onDragPriceLabelWidth,
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
  tradeAxisFont,
  tradeAxisTagHeight,
  tradeLabelHeight,
  tradeLineGeometries,
  userDrawingDraftAnchorColor,
  userDrawingDraftAnchors,
  userDrawingRenderEntries,
  visibleBars,
  volumeHeight,
}: NativeChartCanvasLayersProps) {
  const resolvedTradeAxisFont = tradeAxisFont ?? axisFont;
  const resolvedTradeAxisTagHeight = tradeAxisTagHeight ?? NATIVE_PRICE_AXIS_TAG_SIZING.trade.height;

  return (
    <>
      <NativeChartChromeLayer
        backgroundColor={backgroundColor}
        frame={frame}
        gridColor={gridColor}
        separatorColor={textColor}
      />

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

          <NativeIndicatorPaneAxisLayer
            axisFont={axisFont}
            frame={frame}
            gridColor={gridColor}
            paneRangeOverrides={paneRangeOverrides}
            showAxisLabels={false}
            showGridLines={true}
            textColor={textColor}
          />

          <NativeCandleVolumeLayer
            barColorPlots={indicatorPlots.filter((plot) => plot.type === 'barcolor')}
            frame={frame}
            options={options}
            sharedViewport={sharedViewport}
            staticProjection={staticProjection}
            visibleBars={visibleBars}
            volumeHeight={volumeHeight}
          />

          <NativeIndicatorPlotLayer
            frame={frame}
            indicatorPaneInfo={indicatorPaneInfo}
            paneRangeOverrides={paneRangeOverrides}
            plots={indicatorPlots}
            sharedViewport={sharedViewport}
            staticProjection={staticProjection}
            totalBarCount={indicatorTotalBarCount}
            visibleBars={visibleBars}
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

          <NativeIndicatorPaneAxisLayer
            axisFont={axisFont}
            frame={frame}
            gridColor={gridColor}
            paneRangeOverrides={paneRangeOverrides}
            showAxisLabels={true}
            showGridLines={false}
            textColor={textColor}
          />

          {options.showIndicatorOutputAxisLabels !== false ? (
            <NativeIndicatorOutputAxisLabelLayer
              backgroundColor={backgroundColor}
              bars={bars}
              frame={frame}
              indicatorPaneInfo={indicatorPaneInfo}
              mainPaneRange={mainPaneRange}
              paneRangeOverrides={paneRangeOverrides}
              plots={indicatorPlots}
              resolvedPriceAxisTags={resolvedPriceAxisTags}
              sharedViewport={sharedViewport}
              smallFont={smallFont}
              totalBarCount={indicatorTotalBarCount}
            />
          ) : null}

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
            onDragPriceLabelWidth={onDragPriceLabelWidth}
            orderDragState={orderDragState}
            pricePrecision={pricePrecision}
            nowMs={nowMs}
            resolvedPriceAxisTags={resolvedPriceAxisTags}
            sharedViewport={sharedViewport}
            smallFont={smallFont}
            staticProjection={staticProjection}
            textFont={textFont}
            tradeAxisFont={resolvedTradeAxisFont}
            tradeAxisTagHeight={resolvedTradeAxisTagHeight}
            tradeLabelHeight={tradeLabelHeight}
            tradeLineGeometries={tradeLineGeometries}
          />

          <NativeCrosshairLayer
            axisFont={axisFont}
            crosshair={crosshair}
            frame={frame}
            hasContextMenu={hasContextMenu}
            intervalMs={intervalMs}
            options={options}
            paneRangeOverrides={paneRangeOverrides}
            pricePrecision={pricePrecision}
            sharedViewport={sharedViewport}
          />
        </Group>
      )}
    </>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeChartCanvasLayers = memo(NativeChartCanvasLayersImpl);
NativeChartCanvasLayers.displayName = 'NativeChartCanvasLayers';
