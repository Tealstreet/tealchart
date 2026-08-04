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
  priceScaleGesture,
  resetViewTapGesture,
  selectedDrawingActionTapGesture,
  timeScaleGesture,
  tradeLineActionTapGesture,
}: NativeChartGestureInput): SimultaneousGesture {
  return Gesture.Simultaneous(
    bracketDragGesture,
    tradeLineActionTapGesture,
    selectedDrawingActionTapGesture,
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
