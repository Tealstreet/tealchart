import type { GestureStateManager } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeGestureControlZone } from './nativeGestureControlZones';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { isNativeGestureControlPoint, isNativeReservedControlPoint } from './nativeGestureControlZones';

interface NativeGestureTouchEvent {
  allTouches: { x: number; y: number }[];
  changedTouches: { x: number; y: number }[];
}

export interface NativeUserDrawingEditDragGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  dragActive: SharedValue<boolean>;
  /**
   * A shared value, not a plain array. The drag zones are derived from bar data
   * and so change on every tick; as a captured worklet value they forced this
   * gesture — and therefore the whole composed chart gesture — to be rebuilt
   * several times a second, reconfiguring every native handler on the main
   * thread while Fabric committed on the JS thread.
   */
  dragZones: SharedValue<readonly NativeGestureControlZone[]>;
  enabled: boolean;
  frame: NativeChartFrame | null;
  onBeginDrag: (x: number, y: number) => void;
  onEndDrag: () => void;
  onMoveDrag: (x: number, y: number) => void;
}

function getNativeTouchPoint(event: NativeGestureTouchEvent): { x: number; y: number } | null {
  'worklet';
  const touch = event.changedTouches[0] ?? event.allTouches[0];
  return touch ? { x: touch.x, y: touch.y } : null;
}

export function createNativeUserDrawingEditDragGesture({
  controlZones = [],
  resetViewVisible,
  dragActive,
  dragZones,
  enabled,
  frame,
  onBeginDrag,
  onEndDrag,
  onMoveDrag,
}: NativeUserDrawingEditDragGestureInput) {
  if (!frame || !enabled) return Gesture.Pan().enabled(false);

  return Gesture.Pan()
    .maxPointers(1)
    .minDistance(2)
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      'worklet';
      dragActive.value = false;
      if (event.allTouches.length !== 1) {
        stateManager.fail();
        return;
      }

      const point = getNativeTouchPoint(event);
      if (
        !point ||
        isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y }) ||
        !isNativeGestureControlPoint(dragZones.value, point.x, point.y)
      ) {
        stateManager.fail();
      }
    })
    .onBegin((event) => {
      'worklet';
      dragActive.value = true;
      runOnJS(onBeginDrag)(event.x, event.y);
    })
    .onUpdate((event) => {
      'worklet';
      if (!dragActive.value) return;
      runOnJS(onMoveDrag)(event.x, event.y);
    })
    .onFinalize(() => {
      'worklet';
      if (dragActive.value) runOnJS(onEndDrag)();
      dragActive.value = false;
    });
}
