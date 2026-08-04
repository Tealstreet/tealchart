import type { UserDrawingSelectedActionSurfaceCommand, UserDrawingSelectedActionSurfaceGroupId } from '../../drawings';
import type {
  NativeSelectedDrawingActionCommand,
  NativeSelectedDrawingActionHitTarget,
} from '../render/NativeUserDrawingSelectionActionOverlay';

import { createNativeOverlayActionTapGesture } from './nativeOverlayActionGestures';

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
  const onSelectedDrawingActionCommand = (command: NativeSelectedDrawingActionCommand) => {
    if (command.type === 'popoverTrigger') {
      onPopoverGroupChange(command.nextGroupId);
      return;
    }

    onAction(command.command);
  };

  return createNativeOverlayActionTapGesture({
    enabled,
    onAction: onSelectedDrawingActionCommand,
    targets,
  });
}
