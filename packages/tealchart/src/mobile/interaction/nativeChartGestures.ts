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
    drawingSelectionTapGesture,
    leftToolRailToggleTapGesture,
    chartAxisPinchGesture,
    crosshairContextMenuTapGesture,
    crosshairTapGesture,
    crosshairLongPressGesture,
    crosshairPanGesture,
    chartPanGesture,
    resetViewTapGesture,
    priceScaleGesture,
    timeScaleGesture,
  );
}
