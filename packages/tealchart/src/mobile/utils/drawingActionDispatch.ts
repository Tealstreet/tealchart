import type {
  UserDrawingCommand,
  UserDrawingObjectTreeModel,
  UserDrawingPropertiesIntent,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingState,
} from '../../drawings';

import { resolveUserDrawingObjectTreeModel, resolveUserDrawingPropertiesIntent } from '../../drawings';

export interface DispatchMobileUserDrawingActionCommandOptions {
  state: UserDrawingState;
  source: 'toolbar' | 'contextMenu';
  createId: () => string;
  dispatchUserDrawingCommand: (command: UserDrawingCommand) => void;
  onUserDrawingPropertiesOpen?: (intent: UserDrawingPropertiesIntent) => void;
  onUserDrawingObjectTreeOpen?: (model: UserDrawingObjectTreeModel) => void;
  onUserDrawingCopySelected?: () => void;
  onUserDrawingDuplicateEditDragChange?: (enabled: boolean) => void;
}

export function dispatchMobileUserDrawingActionCommand(
  command: UserDrawingSelectedActionSurfaceCommand,
  options: DispatchMobileUserDrawingActionCommandOptions,
): boolean {
  if (command.type === 'openProperties') {
    const intent = resolveUserDrawingPropertiesIntent(options.state);
    if (intent) {
      options.onUserDrawingPropertiesOpen?.(intent);
    }
    return true;
  }

  if (command.type === 'openObjectTree') {
    options.onUserDrawingObjectTreeOpen?.(resolveUserDrawingObjectTreeModel(options.state));
    return true;
  }

  if (command.type === 'editText') {
    options.dispatchUserDrawingCommand({
      type: 'beginTextEdit',
      drawingId: command.drawingId,
      meta: { source: options.source },
    });
    return true;
  }

  if (command.type === 'copySelected') {
    options.onUserDrawingCopySelected?.();
    return true;
  }

  if (command.type === 'setDuplicateEditDrag') {
    options.onUserDrawingDuplicateEditDragChange?.(command.duplicate);
    return true;
  }

  if (command.type === 'styleAction') {
    if (command.visible !== undefined) {
      options.dispatchUserDrawingCommand({
        type: 'setVisibility',
        visible: command.visible,
        meta: { source: options.source },
      });
    }
    if (command.locked !== undefined) {
      options.dispatchUserDrawingCommand({
        type: 'setLocked',
        locked: command.locked,
        options: { includeLocked: command.includeLocked },
        meta: { source: options.source },
      });
    }
    return true;
  }

  if (command.type === 'updateStyle') {
    options.dispatchUserDrawingCommand({
      type: 'updateStyle',
      style: command.style,
      meta: { source: options.source },
    });
    return true;
  }

  if (command.type === 'setTextAlign') {
    options.dispatchUserDrawingCommand({
      type: 'setTextAlign',
      textAlign: command.textAlign,
      meta: { source: options.source },
    });
    return true;
  }

  if (command.type === 'setTrendLineExtend') {
    options.dispatchUserDrawingCommand({
      type: 'setTrendLineExtend',
      extend: command.extend,
      meta: { source: options.source },
    });
    return true;
  }

  if (command.type === 'setIconName') {
    options.dispatchUserDrawingCommand({
      type: 'setIconName',
      iconName: command.iconName,
      meta: { source: options.source },
    });
    return true;
  }

  if (command.type === 'toolbarAction') {
    if (command.action === 'duplicateSelected') {
      options.dispatchUserDrawingCommand({
        type: 'duplicate',
        options: { createId: options.createId },
        meta: { source: options.source },
      });
      return true;
    }

    if (command.action === 'deleteSelected') {
      options.dispatchUserDrawingCommand({ type: 'delete', meta: { source: options.source } });
      return true;
    }

    options.dispatchUserDrawingCommand({
      type: 'reorder',
      action: command.action,
      meta: { source: options.source },
    });
    return true;
  }

  return false;
}
