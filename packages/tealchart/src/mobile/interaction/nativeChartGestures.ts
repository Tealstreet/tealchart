import type { GestureType, SimultaneousGesture } from 'react-native-gesture-handler';

import { Gesture } from 'react-native-gesture-handler';

interface NativeChartGestureInput {
  chartAxisPinchGesture: GestureType;
  bracketDragGesture: GestureType;
  chartPanGesture: GestureType;
  crosshairLongPressGesture: GestureType;
  crosshairPanGesture: GestureType;
  crosshairContextMenuTapGesture: GestureType;
  crosshairTapGesture: GestureType;
  drawingEditDragGesture: GestureType;
  drawingSelectionTapGesture: GestureType;
  drawingTapGesture: GestureType;
  leftToolRailToggleTapGesture: GestureType;
  orderDragGesture: GestureType;
  overlayActionTapGesture: GestureType;
  priceAxisResetTapGesture: GestureType;
  priceScaleGesture: GestureType;
  resetViewTapGesture: GestureType;
  selectedDrawingActionTapGesture: GestureType;
  timeScaleGesture: GestureType;
  tradeLineActionTapGesture: GestureType;
}

export function createNativeChartGesture({
  chartAxisPinchGesture,
  bracketDragGesture,
  chartPanGesture,
  crosshairLongPressGesture,
  crosshairPanGesture,
  crosshairContextMenuTapGesture,
  crosshairTapGesture,
  drawingEditDragGesture,
  drawingSelectionTapGesture,
  drawingTapGesture,
  leftToolRailToggleTapGesture,
  orderDragGesture,
  overlayActionTapGesture,
  priceAxisResetTapGesture,
  priceScaleGesture,
  resetViewTapGesture,
  selectedDrawingActionTapGesture,
  timeScaleGesture,
  tradeLineActionTapGesture,
}: NativeChartGestureInput): SimultaneousGesture {
  // Ordering is not ownership. Each broad canvas gesture must reject reserved
  // control zones before it can compete with overlay action gestures.
  return Gesture.Simultaneous(
    bracketDragGesture,
    tradeLineActionTapGesture,
    selectedDrawingActionTapGesture,
    overlayActionTapGesture,
    orderDragGesture,
    drawingTapGesture,
    leftToolRailToggleTapGesture,
    chartAxisPinchGesture,
    crosshairContextMenuTapGesture,
    crosshairTapGesture,
    crosshairLongPressGesture,
    crosshairPanGesture,
    Gesture.Exclusive(drawingEditDragGesture, drawingSelectionTapGesture, chartPanGesture),
    resetViewTapGesture,
    priceAxisResetTapGesture,
    priceScaleGesture,
    timeScaleGesture,
  );
}
