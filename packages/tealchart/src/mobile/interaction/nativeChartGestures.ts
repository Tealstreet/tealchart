import type { GestureType, SimultaneousGesture } from 'react-native-gesture-handler';

import { Gesture } from 'react-native-gesture-handler';

interface NativeChartGestureInput {
  chartAxisPinchGesture: GestureType;
  bracketDragGesture: GestureType;
  canvasTapGesture: GestureType;
  chartPanGesture: GestureType;
  crosshairLongPressGesture: GestureType;
  crosshairPanGesture: GestureType;
  drawingEditDragGesture: GestureType;
  leftToolRailToggleTapGesture: GestureType;
  orderDragGesture: GestureType;
  overlayActionTapGesture: GestureType;
  paneMaximizeTapGesture: GestureType;
  priceAxisResetTapGesture: GestureType;
  priceScaleGesture: GestureType;
  resetViewTapGesture: GestureType;
  selectedDrawingActionTapGesture: GestureType;
  timeScaleGesture: GestureType;
}

/**
 * The canvas tap toggles the crosshair, and the first tap of a double tap is
 * still a tap - so maximising a pane also flipped the crosshair on the way
 * through. Making the canvas tap wait for the double tap to fail costs the
 * gesture-handler inter-tap window (200ms on iOS) and only where a double tap
 * can actually happen: `createNativePaneMaximizeTapGesture` disables itself
 * with a single pane, and waiting on a disabled gesture is not worth the risk.
 *
 * Applied to a freshly built gesture, never a memoised one - the relation
 * appends rather than replaces.
 */
export function deferNativeCanvasTapToPaneMaximize(
  canvasTapGesture: GestureType,
  paneMaximizeTapGesture: GestureType,
  paneCount: number,
): GestureType {
  if (paneCount <= 1) return canvasTapGesture;
  return canvasTapGesture.requireExternalGestureToFail(paneMaximizeTapGesture);
}

export function createNativeChartGesture({
  chartAxisPinchGesture,
  bracketDragGesture,
  canvasTapGesture,
  chartPanGesture,
  crosshairLongPressGesture,
  crosshairPanGesture,
  drawingEditDragGesture,
  leftToolRailToggleTapGesture,
  orderDragGesture,
  overlayActionTapGesture,
  paneMaximizeTapGesture,
  priceAxisResetTapGesture,
  priceScaleGesture,
  resetViewTapGesture,
  selectedDrawingActionTapGesture,
  timeScaleGesture,
}: NativeChartGestureInput): SimultaneousGesture {
  // Canvas taps are owned by canvasTapGesture, which resolves the point once
  // and dispatches a single outcome. The gestures listed alongside it are drags,
  // pinches and chrome - none of them competes for a plain tap on the plot.
  return Gesture.Simultaneous(
    bracketDragGesture,
    canvasTapGesture,
    selectedDrawingActionTapGesture,
    overlayActionTapGesture,
    orderDragGesture,
    leftToolRailToggleTapGesture,
    chartAxisPinchGesture,
    crosshairLongPressGesture,
    crosshairPanGesture,
    Gesture.Exclusive(drawingEditDragGesture, chartPanGesture),
    resetViewTapGesture,
    paneMaximizeTapGesture,
    priceAxisResetTapGesture,
    priceScaleGesture,
    timeScaleGesture,
  );
}
