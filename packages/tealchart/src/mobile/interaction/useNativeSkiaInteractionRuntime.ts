import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';
import type { NativeAutoScaleBar } from './nativeAutoScale';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';
import type {
  NativeBracketDragInteractionState,
  NativeBracketDragSharedValues,
  NativeOrderDragInteractionState,
  NativeTradeLineBracketType,
} from './nativeOemsDragState';
import type { NativePaneDividerBand, NativePaneDividerTarget } from './nativePaneDivider';
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativeIndicatorPaneScaleTarget,
  NativePriceAutoScaleSharedValues,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
  NativeViewportGestureMetrics,
} from './nativeViewportGestureState';

import { useMemo } from 'react';

import { useSharedValue } from 'react-native-reanimated';

export interface NativeSkiaInteractionRuntime {
  bracketDragActive: ReturnType<typeof useSharedValue<boolean>>;
  paneDividerBands: SharedValue<NativePaneDividerBand[]>;
  bracketDragInteractionState: NativeBracketDragInteractionState;
  bracketDragState: NativeBracketDragSharedValues;
  chartAxisPinchGestureState: NativeChartAxisPinchGestureState;
  chartPanGestureState: NativeChartPanGestureState;
  crosshair: NativeCrosshairSharedValues;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: ReturnType<typeof useSharedValue<NativeOrderDragZone[]>>;
  panActive: ReturnType<typeof useSharedValue<boolean>>;
  panMetrics: NativeViewportGestureMetrics;
  panStartViewport: NativeViewportSharedValues;
  pinchActive: ReturnType<typeof useSharedValue<boolean>>;
  priceAutoScale: NativePriceAutoScaleSharedValues;
  priceScaleActive: ReturnType<typeof useSharedValue<boolean>>;
  priceScaleGestureState: NativePriceScaleGestureState;
  paneRangeOverrides: ReturnType<typeof useSharedValue<NativePaneRangeOverrides>>;
  sharedPriceAxisTagSources: ReturnType<typeof useSharedValue<NativePriceAxisTagSource[]>>;
  sharedViewport: NativeViewportSharedValues;
  timeScaleActive: ReturnType<typeof useSharedValue<boolean>>;
  timeScaleGestureState: NativeTimeScaleGestureState;
  tradeLineActionZones: ReturnType<typeof useSharedValue<NativeTradeLineActionZone[]>>;
  tradeLineRows: ReturnType<typeof useSharedValue<NativeTradeLineRow[]>>;
  viewportSyncEpoch: ReturnType<typeof useSharedValue<number>>;
}

export interface NativeSkiaInteractionRuntimeInput {
  autoScaleEnabled?: boolean;
}

export function useNativeSkiaInteractionRuntime({
  autoScaleEnabled = true,
}: NativeSkiaInteractionRuntimeInput = {}): NativeSkiaInteractionRuntime {
  const sharedStartTime = useSharedValue(0);
  const sharedEndTime = useSharedValue(1);
  const sharedPriceMin = useSharedValue(0);
  const sharedPriceMax = useSharedValue(1);
  const panStartTime = useSharedValue(0);
  const panEndTime = useSharedValue(1);
  const panStartPriceMin = useSharedValue(0);
  const panStartPriceMax = useSharedValue(1);
  const panTimePerPixel = useSharedValue(0);
  const panPricePerPixel = useSharedValue(0);
  const panIntervalMs = useSharedValue(60 * 60 * 1000);
  const panTimeContentWidth = useSharedValue(1);
  const activePanTimePerPixel = useSharedValue(0);
  const activePanPricePerPixel = useSharedValue(0);
  const activeAxisPinchAnchorTime = useSharedValue(0);
  const activeAxisPinchAnchorPrice = useSharedValue(0);
  const activeAxisPinchStartSpanX = useSharedValue(0);
  const activeAxisPinchStartSpanY = useSharedValue(0);
  const activePriceScaleAnchorPrice = useSharedValue(0);
  const activeTimeScaleAnchorTime = useSharedValue(0);
  const orderDragZones = useSharedValue<NativeOrderDragZone[]>([]);
  const tradeLineActionZones = useSharedValue<NativeTradeLineActionZone[]>([]);
  const tradeLineRows = useSharedValue<NativeTradeLineRow[]>([]);
  const sharedPriceAxisTagSources = useSharedValue<NativePriceAxisTagSource[]>([]);
  const orderDragActive = useSharedValue(false);
  const orderDragStartPrice = useSharedValue(0);
  const orderDragPricePerPixel = useSharedValue(0);
  const activeOrderDragObjectId = useSharedValue('');
  const activeOrderDragPrice = useSharedValue(0);
  const bracketDragActive = useSharedValue(false);
  const bracketDragStartPrice = useSharedValue(0);
  const bracketDragPricePerPixel = useSharedValue(0);
  const activeBracketDragObjectId = useSharedValue('');
  const activeBracketDragObjectType = useSharedValue<NativeTradeLineObjectType | ''>('');
  const activeBracketDragType = useSharedValue<NativeTradeLineBracketType | ''>('');
  const activeBracketDragPrice = useSharedValue(0);
  const activeBracketDragEntryPrice = useSharedValue(0);
  const activeBracketDragStartX = useSharedValue(0);
  const activeBracketDragCurrentX = useSharedValue(0);
  const activeBracketDragStartY = useSharedValue(0);
  const activeBracketDragCurrentY = useSharedValue(0);
  const activeBracketDragPositionNotional = useSharedValue(0);
  const activeBracketDragPositionIsLong = useSharedValue(true);
  const activeBracketDragPartialPercent = useSharedValue(100);
  const activeBracketDragPartialEnabled = useSharedValue(false);
  const activeBracketDragColor = useSharedValue('');
  const activeBracketDragLineColor = useSharedValue('');
  const panActive = useSharedValue(false);
  const pinchActive = useSharedValue(false);
  const priceScaleActive = useSharedValue(false);
  const priceAutoScaleActive = useSharedValue(autoScaleEnabled);
  const priceAutoScaleBars = useSharedValue<NativeAutoScaleBar[]>([]);
  const timeScaleActive = useSharedValue(false);
  const viewportSyncEpoch = useSharedValue(0);
  const crosshairVisible = useSharedValue(false);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);
  const crosshairDragOriginX = useSharedValue(0);
  const crosshairDragOriginY = useSharedValue(0);
  const crosshairPriceLabelMaxWidth = useSharedValue(0);

  const sharedViewport = useMemo<NativeViewportSharedValues>(
    () => ({
      startTime: sharedStartTime,
      endTime: sharedEndTime,
      priceMin: sharedPriceMin,
      priceMax: sharedPriceMax,
    }),
    [sharedEndTime, sharedPriceMax, sharedPriceMin, sharedStartTime],
  );
  const panStartViewport = useMemo<NativeViewportSharedValues>(
    () => ({
      startTime: panStartTime,
      endTime: panEndTime,
      priceMin: panStartPriceMin,
      priceMax: panStartPriceMax,
    }),
    [panEndTime, panStartPriceMax, panStartPriceMin, panStartTime],
  );
  const panMetrics = useMemo<NativeViewportGestureMetrics>(
    () => ({
      intervalMs: panIntervalMs,
      contentWidth: panTimeContentWidth,
      timePerPixel: panTimePerPixel,
      pricePerPixel: panPricePerPixel,
    }),
    [panIntervalMs, panPricePerPixel, panTimeContentWidth, panTimePerPixel],
  );
  const priceAutoScale = useMemo<NativePriceAutoScaleSharedValues>(
    () => ({
      active: priceAutoScaleActive,
      bars: priceAutoScaleBars,
    }),
    [priceAutoScaleActive, priceAutoScaleBars],
  );
  const crosshair = useMemo<NativeCrosshairSharedValues>(
    () => ({
      visible: crosshairVisible,
      x: crosshairX,
      y: crosshairY,
      dragOriginX: crosshairDragOriginX,
      dragOriginY: crosshairDragOriginY,
      priceLabelMaxWidth: crosshairPriceLabelMaxWidth,
    }),
    [crosshairDragOriginX, crosshairDragOriginY, crosshairPriceLabelMaxWidth, crosshairVisible, crosshairX, crosshairY],
  );
  const orderDragState = useMemo<NativeOrderDragInteractionState>(
    () => ({
      active: orderDragActive,
      activeObjectId: activeOrderDragObjectId,
      activePrice: activeOrderDragPrice,
      startPrice: orderDragStartPrice,
      pricePerPixel: orderDragPricePerPixel,
    }),
    [activeOrderDragObjectId, activeOrderDragPrice, orderDragActive, orderDragPricePerPixel, orderDragStartPrice],
  );
  const bracketDragState = useMemo<NativeBracketDragSharedValues>(
    () => ({
      activeObjectId: activeBracketDragObjectId,
      activeObjectType: activeBracketDragObjectType,
      activeBracketType: activeBracketDragType,
      activePrice: activeBracketDragPrice,
      activeEntryPrice: activeBracketDragEntryPrice,
      activeDragStartX: activeBracketDragStartX,
      activeDragCurrentX: activeBracketDragCurrentX,
      activeDragStartY: activeBracketDragStartY,
      activeDragCurrentY: activeBracketDragCurrentY,
      activePositionNotional: activeBracketDragPositionNotional,
      activePositionIsLong: activeBracketDragPositionIsLong,
      activePartialPercent: activeBracketDragPartialPercent,
      activePartialEnabled: activeBracketDragPartialEnabled,
      activeColor: activeBracketDragColor,
      activeLineColor: activeBracketDragLineColor,
    }),
    [
      activeBracketDragColor,
      activeBracketDragLineColor,
      activeBracketDragCurrentX,
      activeBracketDragStartY,
      activeBracketDragCurrentY,
      activeBracketDragEntryPrice,
      activeBracketDragObjectId,
      activeBracketDragObjectType,
      activeBracketDragPartialEnabled,
      activeBracketDragPartialPercent,
      activeBracketDragPrice,
      activeBracketDragPositionIsLong,
      activeBracketDragPositionNotional,
      activeBracketDragStartX,
      activeBracketDragType,
    ],
  );
  const bracketDragInteractionState = useMemo<NativeBracketDragInteractionState>(
    () => ({
      ...bracketDragState,
      active: bracketDragActive,
      startPrice: bracketDragStartPrice,
      pricePerPixel: bracketDragPricePerPixel,
    }),
    [bracketDragActive, bracketDragPricePerPixel, bracketDragStartPrice, bracketDragState],
  );
  const panIndicatorPaneTarget = useSharedValue<NativeIndicatorPaneScaleTarget | null>(null);
  const panPaneDividerTarget = useSharedValue<NativePaneDividerTarget | null>(null);
  const paneRangeOverrides = useSharedValue<NativePaneRangeOverrides>({});
  const paneDividerBands = useSharedValue<NativePaneDividerBand[]>([]);
  const chartPanGestureState = useMemo<NativeChartPanGestureState>(
    () => ({
      active: panActive,
      indicatorPaneTarget: panIndicatorPaneTarget,
      paneDividerTarget: panPaneDividerTarget,
      sharedViewport,
      startViewport: panStartViewport,
      metrics: panMetrics,
      priceAutoScale,
      activeTimePerPixel: activePanTimePerPixel,
      activePricePerPixel: activePanPricePerPixel,
    }),
    [
      activePanPricePerPixel,
      activePanTimePerPixel,
      panActive,
      panIndicatorPaneTarget,
      panPaneDividerTarget,
      panMetrics,
      panStartViewport,
      priceAutoScale,
      sharedViewport,
    ],
  );
  const chartAxisPinchGestureState = useMemo<NativeChartAxisPinchGestureState>(
    () => ({
      active: pinchActive,
      sharedViewport,
      startViewport: panStartViewport,
      metrics: panMetrics,
      priceAutoScale,
      activeAnchorTime: activeAxisPinchAnchorTime,
      activeAnchorPrice: activeAxisPinchAnchorPrice,
      activeStartSpanX: activeAxisPinchStartSpanX,
      activeStartSpanY: activeAxisPinchStartSpanY,
    }),
    [
      activeAxisPinchAnchorPrice,
      activeAxisPinchAnchorTime,
      activeAxisPinchStartSpanX,
      activeAxisPinchStartSpanY,
      panMetrics,
      panStartViewport,
      pinchActive,
      priceAutoScale,
      sharedViewport,
    ],
  );
  const indicatorPaneScaleTarget = useSharedValue<NativeIndicatorPaneScaleTarget | null>(null);
  const priceScaleGestureState = useMemo<NativePriceScaleGestureState>(
    () => ({
      active: priceScaleActive,
      sharedViewport,
      startViewport: panStartViewport,
      priceAutoScale,
      activeAnchorPrice: activePriceScaleAnchorPrice,
      indicatorPaneTarget: indicatorPaneScaleTarget,
    }),
    [
      activePriceScaleAnchorPrice,
      indicatorPaneScaleTarget,
      panStartViewport,
      priceAutoScale,
      priceScaleActive,
      sharedViewport,
    ],
  );
  const timeScaleGestureState = useMemo<NativeTimeScaleGestureState>(
    () => ({
      active: timeScaleActive,
      sharedViewport,
      startViewport: panStartViewport,
      metrics: panMetrics,
      priceAutoScale,
      activeAnchorTime: activeTimeScaleAnchorTime,
    }),
    [activeTimeScaleAnchorTime, panMetrics, panStartViewport, priceAutoScale, sharedViewport, timeScaleActive],
  );

  return {
    bracketDragActive,
    bracketDragInteractionState,
    bracketDragState,
    chartAxisPinchGestureState,
    chartPanGestureState,
    crosshair,
    orderDragState,
    orderDragZones,
    panActive,
    panMetrics,
    panStartViewport,
    pinchActive,
    priceAutoScale,
    priceScaleActive,
    priceScaleGestureState,
    paneDividerBands,
    paneRangeOverrides,
    sharedPriceAxisTagSources,
    sharedViewport,
    timeScaleActive,
    timeScaleGestureState,
    tradeLineActionZones,
    tradeLineRows,
    viewportSyncEpoch,
  };
}
