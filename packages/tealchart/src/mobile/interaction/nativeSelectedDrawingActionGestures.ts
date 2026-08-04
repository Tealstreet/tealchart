import type {
  NativeSelectedDrawingActionHitTarget,
} from '../render/NativeUserDrawingSelectionActionOverlay';
import type {
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroupId,
} from '../../drawings';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { findNativeSelectedDrawingActionHitTarget } from '../render/NativeUserDrawingSelectionActionOverlay';
import { NATIVE_RESET_VIEW_TAP_MOVE_TOLERANCE } from './nativeResetViewButton';

export interface NativeSelectedDrawingActionTapGestureInput {
  enabled: boolean;
  onAction: (command: UserDrawingSelectedActionSurfaceCommand) => void;
  onPopoverGroupChange: (groupId: UserDrawingSelectedActionSurfaceGroupId | null) => void;
  targets: readonly NativeSelectedDrawingActionHitTarget[];
}

export function createNativeSelectedDrawingActionTapGesture({
  enabled,
  onAction,
  onPopoverGroupChange,
  targets,
}: NativeSelectedDrawingActionTapGestureInput) {
  if (!enabled || targets.length === 0) return Gesture.Tap().enabled(false);

  return Gesture.Tap()
    .maxDistance(NATIVE_RESET_VIEW_TAP_MOVE_TOLERANCE)
    .onEnd((event, success) => {
      if (!success) return;
      const target = findNativeSelectedDrawingActionHitTarget(targets, event.x, event.y);
      if (!target) return;

      if (target.type === 'popoverTrigger') {
        runOnJS(onPopoverGroupChange)(target.nextGroupId);
        return;
      }

      if (!target.enabled) return;
      runOnJS(onAction)(target.command);
    });
}
