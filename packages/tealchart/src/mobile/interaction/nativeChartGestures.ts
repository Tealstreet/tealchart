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
