/**
 * useChartGestures - Unified gesture handling for tealchart mobile
 *
 * Handles pan, pinch, and axis scaling gestures with zone detection.
 * Determines gesture behavior based on where the touch started.
 *
 * IMPORTANT: This hook avoids accessing refs in worklets to prevent
 * "Tried to modify key current" warnings from Reanimated.
 */

import type { Bar, Viewport } from '../../types';
import type { ChartDimensions, GestureZone } from '../utils/coordinates';

import { useCallback, useMemo } from 'react';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { getGestureZone } from '../utils/coordinates';
import { getDrawingPanFinalizeAction } from '../utils/drawingGestureFinalize';

export interface ChartDrawingGestureOptions {
  pressure?: number;
}

export interface UseChartGesturesOptions {
  dimensions: ChartDimensions;
  bars: Bar[];
  viewport: Viewport | null;
  onViewportChange: (viewport: Viewport) => void;
  enabled?: boolean;
  onSwipeBlockChange?: (blocked: boolean) => void;
  /** Called when user starts dragging the price axis (disables auto-scale) */
  onAutoScaleDisabled?: (paneId: string) => void;
  /** Returns whether auto-scale is active for a given pane (pan should skip vertical movement) */
  isAutoScale?: (paneId: string) => boolean;
  /** Called for active chart-surface touches so overlays can react without owning gestures */
  onInteraction?: (x: number, y: number) => void;
  /** Called before chart pan starts so drawing edits can claim the gesture */
  onDrawingEditStart?: (x: number, y: number, options?: ChartDrawingGestureOptions) => boolean;
  /** Called while a claimed drawing edit gesture moves */
  onDrawingEditMove?: (x: number, y: number, options?: ChartDrawingGestureOptions) => void;
  /** Called when a claimed drawing edit gesture ends */
  onDrawingEditEnd?: () => void;
  /** Called when a claimed drawing edit gesture is cancelled before normal completion */
  onDrawingEditCancel?: () => void;
}

export interface UseChartGesturesResult {
  composedGesture: ReturnType<typeof Gesture.Simultaneous>;
}

function normalizeGesturePressure(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

function getChartDrawingGestureOptions(event: unknown): ChartDrawingGestureOptions | undefined {
  const pressure = normalizeGesturePressure((event as { force?: unknown }).force);
  return pressure === undefined ? undefined : { pressure };
}

export function useChartGestures({
  dimensions,
  bars,
  viewport,
  onViewportChange,
  enabled = true,
  onSwipeBlockChange,
  onAutoScaleDisabled,
  isAutoScale,
  onInteraction,
  onDrawingEditStart,
  onDrawingEditMove,
  onDrawingEditEnd,
  onDrawingEditCancel,
}: UseChartGesturesOptions): UseChartGesturesResult {
  // Shared values for gesture state (UI thread)
  const gestureZoneValue = useSharedValue<GestureZone>('chart');
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const priceAxisStartRange = useSharedValue(0);
  const timeAxisStartRange = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const interactionFramePending = useSharedValue(false);
  const interactionFrameX = useSharedValue(0);
  const interactionFrameY = useSharedValue(0);
  const drawingEditClaimed = useSharedValue(false);
  const panBeginX = useSharedValue(0);
  const panBeginY = useSharedValue(0);
  const gestureCleanedUp = useSharedValue(false);

  // Pan handler for chart scrolling (time and price)
  // All data access happens on JS thread via closure
  const updateViewportFromPan = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!viewport || !dimensions.width) return;

      const chartWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
      const chartHeight = dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

      // Horizontal panning (time axis)
      const timeRange = viewport.endTime - viewport.startTime;
      const msPerPixel = timeRange / chartWidth;
      const timeDelta = -deltaX * msPerPixel;

      const newStartTime = viewport.startTime + timeDelta;
      const newEndTime = viewport.endTime + timeDelta;

      if (isAutoScale?.('main')) {
        // Auto-scale is still locked. Preserve it by changing time only; the
        // shared ViewportController will fit Y to the newly visible candles.
        onViewportChange({
          ...viewport,
          startTime: newStartTime,
          endTime: newEndTime,
        });
      } else {
        // Vertical panning (price axis)
        // Dragging up should increase prices (move viewport down), dragging down should decrease
        const priceRange = viewport.priceMax - viewport.priceMin;
        const pricePerPixel = priceRange / chartHeight;
        const priceDelta = deltaY * pricePerPixel;

        const newPriceMin = viewport.priceMin + priceDelta;
        const newPriceMax = viewport.priceMax + priceDelta;

        onViewportChange({
          startTime: newStartTime,
          endTime: newEndTime,
          priceMin: newPriceMin,
          priceMax: newPriceMax,
        });
      }
    },
    [viewport, dimensions, onViewportChange, isAutoScale],
  );

  // Price axis drag handler
  const updatePriceScale = useCallback(
    (deltaY: number, startRange: number) => {
      if (!viewport) return;

      const rawZoomFactor = 1 + deltaY * 0.005;
      const zoomFactor = Math.max(0.1, Math.min(10, rawZoomFactor));
      const newRange = startRange * zoomFactor;

      const center = (viewport.priceMin + viewport.priceMax) / 2;

      onViewportChange({
        ...viewport,
        priceMin: center - newRange / 2,
        priceMax: center + newRange / 2,
      });
    },
    [viewport, onViewportChange],
  );

  // Time axis drag handler
  const updateTimeScale = useCallback(
    (deltaX: number, startRange: number) => {
      if (!viewport || bars.length === 0) return;

      const chartWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
      const scaleFactor = 1 + (deltaX / chartWidth) * 2;
      const newRange = startRange * scaleFactor;

      const firstBarTime = bars[0].time;
      const lastBarTime = bars[bars.length - 1].time;
      const avgBarInterval = (lastBarTime - firstBarTime) / bars.length;
      const minRange = avgBarInterval * 10;
      const maxRange = lastBarTime - firstBarTime;
      const clampedRange = Math.max(minRange, Math.min(maxRange, newRange));

      // Anchor zoom at right edge (TradingView style)
      const newEndTime = viewport.endTime;
      const newStartTime = newEndTime - clampedRange;

      onViewportChange({
        ...viewport,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    },
    [viewport, bars, dimensions, onViewportChange],
  );

  // Pinch zoom handler
  const updateViewportFromPinch = useCallback(
    (newScale: number) => {
      if (!viewport || bars.length === 0) return;

      const timeRange = viewport.endTime - viewport.startTime;
      const centerTime = (viewport.startTime + viewport.endTime) / 2;

      const firstBarTime = bars[0].time;
      const lastBarTime = bars[bars.length - 1].time;
      const avgBarInterval = (lastBarTime - firstBarTime) / bars.length;
      const minTimeRange = avgBarInterval * 10;
      const maxTimeRange = lastBarTime - firstBarTime;

      const newTimeRange = Math.max(minTimeRange, Math.min(maxTimeRange, timeRange / newScale));

      if (Math.abs(newTimeRange - timeRange) > avgBarInterval * 0.5) {
        const newStartTime = centerTime - newTimeRange / 2;
        const newEndTime = centerTime + newTimeRange / 2;

        onViewportChange({
          ...viewport,
          startTime: newStartTime,
          endTime: newEndTime,
        });
      }
    },
    [viewport, bars, onViewportChange],
  );

  // Handler for pan start - processes zone detection and sets up initial values
  const handlePanStartAndSetValues = useCallback(
    (x: number, y: number, options?: ChartDrawingGestureOptions): boolean => {
      onInteraction?.(x, y);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;

      if (onDrawingEditStart?.(x, y, options)) {
        gestureZoneValue.value = 'outside';
        onSwipeBlockChange?.(true);
        return true;
      }

      const zone = getGestureZone(x, y, dimensions);

      if (zone === 'priceAxis' && viewport) {
        gestureZoneValue.value = zone;
        priceAxisStartRange.value = viewport.priceMax - viewport.priceMin;
        onAutoScaleDisabled?.('main');
      } else if (zone === 'timeAxis' && viewport) {
        gestureZoneValue.value = zone;
        timeAxisStartRange.value = viewport.endTime - viewport.startTime;
      } else if (zone === 'chart') {
        gestureZoneValue.value = zone;
        if (onSwipeBlockChange) {
          onSwipeBlockChange(true);
        }
      } else {
        gestureZoneValue.value = 'outside';
      }
      return false;
    },
    [
      dimensions,
      viewport,
      onSwipeBlockChange,
      onAutoScaleDisabled,
      onInteraction,
      onDrawingEditStart,
      gestureZoneValue,
      priceAxisStartRange,
      timeAxisStartRange,
      savedTranslateX,
      savedTranslateY,
    ],
  );

  // Memoize gestures to prevent recreating on every render
  const panGesture = useMemo(() => {
    const scheduleInteraction = (x: number, y: number) => {
      if (!onInteraction) return;

      interactionFrameX.value = x;
      interactionFrameY.value = y;

      if (interactionFramePending.value) return;

      interactionFramePending.value = true;
      requestAnimationFrame(() => {
        interactionFramePending.value = false;
        onInteraction(interactionFrameX.value, interactionFrameY.value);
      });
    };

    return Gesture.Pan()
      .enabled(enabled)
      .runOnJS(true)
      .onBegin((event) => {
        panBeginX.value = event.x;
        panBeginY.value = event.y;
        gestureCleanedUp.value = false;
      })
      .onStart((event) => {
        drawingEditClaimed.value = handlePanStartAndSetValues(
          panBeginX.value,
          panBeginY.value,
          getChartDrawingGestureOptions(event),
        );
      })
      .onUpdate((event) => {
        scheduleInteraction(event.x, event.y);

        const zone = gestureZoneValue.value;

        if (drawingEditClaimed.value) {
          onDrawingEditMove?.(event.x, event.y, getChartDrawingGestureOptions(event));
        } else if (zone === 'priceAxis') {
          updatePriceScale(event.translationY, priceAxisStartRange.value);
        } else if (zone === 'timeAxis') {
          updateTimeScale(event.translationX, timeAxisStartRange.value);
        } else if (zone === 'chart') {
          const deltaX = event.translationX - savedTranslateX.value;
          const deltaY = event.translationY - savedTranslateY.value;
          savedTranslateX.value = event.translationX;
          savedTranslateY.value = event.translationY;
          updateViewportFromPan(deltaX, deltaY);
        }
      })
      .onFinalize((_event, success) => {
        if (gestureCleanedUp.value) return;
        gestureCleanedUp.value = true;

        const zone = gestureZoneValue.value;
        if (drawingEditClaimed.value) {
          if (getDrawingPanFinalizeAction(success) === 'cancel') {
            onDrawingEditCancel?.();
          } else {
            onDrawingEditEnd?.();
          }
          onSwipeBlockChange?.(false);
          drawingEditClaimed.value = false;
        } else if (zone === 'chart' && onSwipeBlockChange) {
          onSwipeBlockChange(false);
        }
      });
  }, [
    handlePanStartAndSetValues,
    enabled,
    updatePriceScale,
    updateTimeScale,
    updateViewportFromPan,
    onSwipeBlockChange,
    onInteraction,
    onDrawingEditMove,
    onDrawingEditEnd,
    onDrawingEditCancel,
    gestureZoneValue,
    priceAxisStartRange,
    timeAxisStartRange,
    savedTranslateX,
    savedTranslateY,
    drawingEditClaimed,
    panBeginX,
    panBeginY,
    gestureCleanedUp,
    interactionFramePending,
    interactionFrameX,
    interactionFrameY,
  ]);

  // Pinch gesture for zoom
  const pinchGesture = useMemo(() => {
    const scheduleInteraction = (x: number, y: number) => {
      'worklet';

      if (!onInteraction) return;

      interactionFrameX.value = x;
      interactionFrameY.value = y;

      if (interactionFramePending.value) return;

      interactionFramePending.value = true;
      requestAnimationFrame(() => {
        interactionFramePending.value = false;
        runOnJS(onInteraction)(interactionFrameX.value, interactionFrameY.value);
      });
    };

    return Gesture.Pinch()
      .enabled(enabled)
      .onStart((event) => {
        if (drawingEditClaimed.value) return;

        savedScale.value = 1;
        if (onInteraction) {
          runOnJS(onInteraction)(event.focalX, event.focalY);
        }
      })
      .onUpdate((event) => {
        if (drawingEditClaimed.value) return;

        scheduleInteraction(event.focalX, event.focalY);
        const newScale = savedScale.value * event.scale;
        runOnJS(updateViewportFromPinch)(newScale);
      });
  }, [
    enabled,
    onInteraction,
    updateViewportFromPinch,
    savedScale,
    drawingEditClaimed,
    interactionFramePending,
    interactionFrameX,
    interactionFrameY,
  ]);

  // Compose gestures
  const composedGesture = useMemo(() => {
    return Gesture.Simultaneous(panGesture, pinchGesture);
  }, [panGesture, pinchGesture]);

  return {
    composedGesture,
  };
}
