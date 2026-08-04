import type { GestureType } from 'react-native-gesture-handler';
import type { NativeOverlayHitRect } from './nativeOverlayHitTargets';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { findNativeOverlayHitTarget } from './nativeOverlayHitTargets';
import { NATIVE_TAP_MAX_DISTANCE } from './nativeGestureThresholds';

export interface NativeOverlayActionHitTarget<TCommand = unknown> extends NativeOverlayHitRect {
  command: TCommand;
  enabled?: boolean;
}

export interface NativeOverlayActionTapGestureInput<TCommand = unknown> {
  enabled: boolean;
  onAction: (command: TCommand) => void;
  targets: readonly NativeOverlayActionHitTarget<TCommand>[];
}

/**
 * Native overlays publish gesture-level hit targets so Skia's simultaneous
 * chart gestures have one owner for action taps.
 */
export function createNativeOverlayActionTapGesture<TCommand = unknown>({
  enabled,
  onAction,
  targets,
}: NativeOverlayActionTapGestureInput<TCommand>): GestureType {
  if (!enabled || targets.length === 0) return Gesture.Tap().enabled(false);

  return Gesture.Tap()
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      const target = findNativeOverlayHitTarget(targets, event.x, event.y);
      if (!target || target.enabled === false) return;
      runOnJS(onAction)(target.command);
    });
}
