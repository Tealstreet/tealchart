import type { GestureType } from 'react-native-gesture-handler';

import { Gesture } from 'react-native-gesture-handler';

export type NativeChartGesture = ReturnType<typeof Gesture.Simultaneous>;

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
}: NativeChartGestureInput): NativeChartGesture {
  // Canvas taps are owned by canvasTapGesture, which resolves the point once
  // and dispatches a single outcome. Drag/scale gestures are mutually exclusive:
  // a touch can resize a divider, scale an axis, move a drawing, drag a trade
  // line, move the crosshair, or pan the chart - never more than one. Android's
  // gesture arbiter is stricter about top-level simultaneous pans, so keeping
  // this group explicit avoids viewport gestures cancelling each other.
  return Gesture.Simultaneous(
    canvasTapGesture,
    selectedDrawingActionTapGesture,
    overlayActionTapGesture,
    leftToolRailToggleTapGesture,
    chartAxisPinchGesture,
    crosshairLongPressGesture,
    Gesture.Exclusive(
      bracketDragGesture,
      orderDragGesture,
      priceScaleGesture,
      timeScaleGesture,
      drawingEditDragGesture,
      crosshairPanGesture,
      chartPanGesture,
    ),
    resetViewTapGesture,
    paneMaximizeTapGesture,
    priceAxisResetTapGesture,
  );
}
