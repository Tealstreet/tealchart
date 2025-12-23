/**
 * useChartGestures - Unified gesture handling for tealchart mobile
 *
 * Handles pan, pinch, and axis scaling gestures with zone detection.
 * Determines gesture behavior based on where the touch started.
 *
 * IMPORTANT: This hook avoids accessing refs in worklets to prevent
 * "Tried to modify key current" warnings from Reanimated.
 */

import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { Bar } from '../../types';
import { getGestureZone, type GestureZone, type ChartDimensions } from '../utils/coordinates';

export interface UseChartGesturesOptions {
  dimensions: ChartDimensions;
  bars: Bar[];
  viewport: Viewport | null;
  onViewportChange: (viewport: Viewport) => void;
  onSwipeBlockChange?: (blocked: boolean) => void;
}

export interface UseChartGesturesResult {
  composedGesture: ReturnType<typeof Gesture.Simultaneous>;
  gestureZone: GestureZone;
}

export function useChartGestures({
  dimensions,
  bars,
  viewport,
  onViewportChange,
  onSwipeBlockChange,
}: UseChartGesturesOptions): UseChartGesturesResult {
  // Shared values for gesture state (UI thread)
  const gestureZoneValue = useSharedValue<GestureZone>('chart');
  const savedTranslateX = useSharedValue(0);
  const priceAxisStartRange = useSharedValue(0);
  const timeAxisStartRange = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Pan handler for chart scrolling (time-based)
  // All data access happens on JS thread via closure
  const updateViewportFromPan = useCallback((deltaX: number) => {
    if (!viewport || bars.length === 0 || !dimensions.width) return;

    const chartWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
    const timeRange = viewport.endTime - viewport.startTime;
    const msPerPixel = timeRange / chartWidth;
    const timeDelta = -deltaX * msPerPixel;

    const newStartTime = viewport.startTime + timeDelta;
    const newEndTime = viewport.endTime + timeDelta;

    // Find bars in the new time range
    const visibleBars = bars.filter(b => b.time >= newStartTime && b.time <= newEndTime);

    if (visibleBars.length > 0) {
      const prices = visibleBars.flatMap(b => [b.high, b.low]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = (maxPrice - minPrice) * 0.1;

      onViewportChange({
        startTime: newStartTime,
        endTime: newEndTime,
        priceMin: minPrice - padding,
        priceMax: maxPrice + padding,
      });
    } else {
      onViewportChange({
        startTime: newStartTime,
        endTime: newEndTime,
        priceMin: viewport.priceMin,
        priceMax: viewport.priceMax,
      });
    }
  }, [viewport, bars, dimensions, onViewportChange]);

  // Price axis drag handler
  const updatePriceScale = useCallback((deltaY: number, startRange: number) => {
    if (!viewport) return;

    const scaleFactor = 1 + (deltaY / dimensions.height) * 2;
    const newRange = startRange * scaleFactor;

    const minRange = startRange * 0.1;
    const maxRange = startRange * 10;
    const clampedRange = Math.max(minRange, Math.min(maxRange, newRange));

    const center = (viewport.priceMin + viewport.priceMax) / 2;

    onViewportChange({
      ...viewport,
      priceMin: center - clampedRange / 2,
      priceMax: center + clampedRange / 2,
    });
  }, [viewport, dimensions.height, onViewportChange]);

  // Time axis drag handler
  const updateTimeScale = useCallback((deltaX: number, startRange: number) => {
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

    const visibleBars = bars.filter(b => b.time >= newStartTime && b.time <= newEndTime);

    if (visibleBars.length > 0) {
      const prices = visibleBars.flatMap(b => [b.high, b.low]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = (maxPrice - minPrice) * 0.1;

      onViewportChange({
        startTime: newStartTime,
        endTime: newEndTime,
        priceMin: minPrice - padding,
        priceMax: maxPrice + padding,
      });
    }
  }, [viewport, bars, dimensions, onViewportChange]);

  // Pinch zoom handler
  const updateViewportFromPinch = useCallback((newScale: number) => {
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

      const visibleBars = bars.filter(b => b.time >= newStartTime && b.time <= newEndTime);

      if (visibleBars.length > 0) {
        const prices = visibleBars.flatMap(b => [b.high, b.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1;

        onViewportChange({
          startTime: newStartTime,
          endTime: newEndTime,
          priceMin: minPrice - padding,
          priceMax: maxPrice + padding,
        });
      }
    }
  }, [viewport, bars, onViewportChange]);

  // Handler for pan start - processes zone detection and sets up initial values
  const handlePanStartAndSetValues = useCallback((x: number, y: number) => {
    const zone = getGestureZone(x, y, dimensions);

    if (zone === 'priceAxis' && viewport) {
      gestureZoneValue.value = zone;
      priceAxisStartRange.value = viewport.priceMax - viewport.priceMin;
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
  }, [dimensions, viewport, onSwipeBlockChange, gestureZoneValue, priceAxisStartRange, timeAxisStartRange, savedTranslateX]);

  // Memoize gestures to prevent recreating on every render
  const panGesture = useMemo(() => {
    return Gesture.Pan()
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
          savedTranslateX.value = event.translationX;
          runOnJS(updateViewportFromPan)(deltaX);
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
    updatePriceScale,
    updateTimeScale,
    updateViewportFromPan,
    onSwipeBlockChange,
    gestureZoneValue,
    priceAxisStartRange,
    timeAxisStartRange,
    savedTranslateX,
  ]);

  // Pinch gesture for zoom
  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onStart(() => {
        savedScale.value = 1;
      })
      .onUpdate((event) => {
        const newScale = savedScale.value * event.scale;
        runOnJS(updateViewportFromPinch)(newScale);
      });
  }, [updateViewportFromPinch, savedScale]);

  // Compose gestures
  const composedGesture = useMemo(() => {
    return Gesture.Simultaneous(panGesture, pinchGesture);
  }, [panGesture, pinchGesture]);

  return {
    composedGesture,
    // Return 'chart' as default - actual zone is tracked via shared value
    gestureZone: 'chart' as GestureZone,
  };
}
