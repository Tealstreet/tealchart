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
  drawingSelectionTapGesture: GestureType;
  drawingTapGesture: GestureType;
  drawingEditDragGesture: GestureType;
  leftToolRailToggleTapGesture: GestureType;
  orderDragGesture: GestureType;
  priceScaleGesture: GestureType;
  resetViewTapGesture: GestureType;
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
  drawingSelectionTapGesture,
  drawingTapGesture,
  drawingEditDragGesture,
  leftToolRailToggleTapGesture,
  orderDragGesture,
  priceScaleGesture,
  resetViewTapGesture,
  timeScaleGesture,
  tradeLineActionTapGesture,
}: NativeChartGestureInput): SimultaneousGesture {
  return Gesture.Simultaneous(
    bracketDragGesture,
    tradeLineActionTapGesture,
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
    priceScaleGesture,
    timeScaleGesture,
  );
}
