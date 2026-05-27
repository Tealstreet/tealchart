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
}

export interface UseChartGesturesResult {
  composedGesture: ReturnType<typeof Gesture.Simultaneous>;
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
}: UseChartGesturesOptions): UseChartGesturesResult {
  // Shared values for gesture state (UI thread)
  const gestureZoneValue = useSharedValue<GestureZone>('chart');
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const priceAxisStartRange = useSharedValue(0);
  const timeAxisStartRange = useSharedValue(0);
  const savedScale = useSharedValue(1);

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
    (x: number, y: number) => {
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
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    },
    [
      dimensions,
      viewport,
      onSwipeBlockChange,
      onAutoScaleDisabled,
      gestureZoneValue,
      priceAxisStartRange,
      timeAxisStartRange,
      savedTranslateX,
      savedTranslateY,
    ],
  );

  // Memoize gestures to prevent recreating on every render
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .onStart((event) => {
        // Determine zone and get initial values on JS thread
        runOnJS(handlePanStartAndSetValues)(event.x, event.y);
      })
      .onUpdate((event) => {
        const zone = gestureZoneValue.value;

        if (zone === 'priceAxis') {
          runOnJS(updatePriceScale)(event.translationY, priceAxisStartRange.value);
        } else if (zone === 'timeAxis') {
          runOnJS(updateTimeScale)(event.translationX, timeAxisStartRange.value);
        } else if (zone === 'chart') {
          const deltaX = event.translationX - savedTranslateX.value;
          const deltaY = event.translationY - savedTranslateY.value;
          savedTranslateX.value = event.translationX;
          savedTranslateY.value = event.translationY;
          runOnJS(updateViewportFromPan)(deltaX, deltaY);
        }
      })
      .onEnd(() => {
        const zone = gestureZoneValue.value;
        if (zone === 'chart' && onSwipeBlockChange) {
          runOnJS(onSwipeBlockChange)(false);
        }
      });
  }, [
    handlePanStartAndSetValues,
    enabled,
    updatePriceScale,
    updateTimeScale,
    updateViewportFromPan,
    onSwipeBlockChange,
    gestureZoneValue,
    priceAxisStartRange,
    timeAxisStartRange,
    savedTranslateX,
    savedTranslateY,
  ]);

  // Pinch gesture for zoom
  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .enabled(enabled)
      .onStart(() => {
        savedScale.value = 1;
      })
      .onUpdate((event) => {
        const newScale = savedScale.value * event.scale;
        runOnJS(updateViewportFromPinch)(newScale);
      });
  }, [enabled, updateViewportFromPinch, savedScale]);

  // Compose gestures
  const composedGesture = useMemo(() => {
    return Gesture.Simultaneous(panGesture, pinchGesture);
  }, [panGesture, pinchGesture]);

  return {
    composedGesture,
  };
}
