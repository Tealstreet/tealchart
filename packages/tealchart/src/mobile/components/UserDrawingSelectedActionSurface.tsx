import type {
  UserDrawingCommand,
  UserDrawingObjectTreeModel,
  UserDrawingPropertiesIntent,
  UserDrawingSelectedActionSurface,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
} from '../../drawings';

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  resolveUserDrawingActionSurfacePosition,
  shouldRenderUserDrawingSelectedActionSurface,
} from '../../drawings';
import { dispatchMobileUserDrawingActionCommand } from '../utils/drawingActionDispatch';

export const MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH = 304;
export const MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT = 70;
const MOBILE_USER_DRAWING_ACTION_POPOVER_OFFSET_Y = 30;
const MOBILE_USER_DRAWING_ACTION_POPOVER_HEIGHT = 74;

export interface UserDrawingSelectedActionSurfaceProps {
  state: UserDrawingState;
  surface: UserDrawingSelectedActionSurface;
  anchor: UserDrawingSelectionActionAnchor | null;
  dimensions: { width: number; height: number };
  topInset: number;
  createId: () => string;
  dispatchUserDrawingCommand: (command: UserDrawingCommand) => void;
  onUserDrawingPropertiesOpen?: (intent: UserDrawingPropertiesIntent) => void;
  onUserDrawingObjectTreeOpen?: (model: UserDrawingObjectTreeModel) => void;
}

export function UserDrawingSelectedActionSurfaceComponent({
  state,
  surface,
  anchor,
  dimensions,
  topInset,
  createId,
  dispatchUserDrawingCommand,
  onUserDrawingPropertiesOpen,
  onUserDrawingObjectTreeOpen,
}: UserDrawingSelectedActionSurfaceProps) {
  const [activePopoverGroupId, setActivePopoverGroupId] = useState<string | null>(null);
  const [activePopoverDrawingId, setActivePopoverDrawingId] = useState<string | null>(null);
  const shouldRender = shouldRenderUserDrawingSelectedActionSurface(state, anchor);
  const selectedDrawingId = surface.selectedDrawing?.id ?? null;
  const activePopoverGroupIdForSelection =
    activePopoverDrawingId === selectedDrawingId ? activePopoverGroupId : null;
  const activePopoverGroup = surface.groups.find((group) => group.id === activePopoverGroupIdForSelection);
  const surfaceHeight =
    activePopoverGroup?.presentation?.type === 'popover'
      ? MOBILE_USER_DRAWING_ACTION_POPOVER_OFFSET_Y +
        Math.max(MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT, MOBILE_USER_DRAWING_ACTION_POPOVER_HEIGHT)
      : MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT;

  useEffect(() => {
    if (!shouldRender) {
      setActivePopoverGroupId(null);
      setActivePopoverDrawingId(null);
    }
  }, [shouldRender]);

  useEffect(() => {
    if (activePopoverDrawingId !== null && activePopoverDrawingId !== selectedDrawingId) {
      setActivePopoverGroupId(null);
      setActivePopoverDrawingId(selectedDrawingId);
    }
  }, [activePopoverDrawingId, selectedDrawingId]);

  if (!shouldRender) return null;

  const dispatchItem = (
    item: UserDrawingSelectedActionSurface['groups'][number]['items'][number],
    options: { keepPopoverOpen?: boolean } = {},
  ) => {
    dispatchMobileUserDrawingActionCommand(item.command, {
      state,
      source: 'toolbar',
      createId,
      dispatchUserDrawingCommand,
      onUserDrawingPropertiesOpen,
      onUserDrawingObjectTreeOpen,
    });
    if (!options.keepPopoverOpen) {
      setActivePopoverGroupId(null);
    }
  };

  return (
    <View
      accessibilityLabel="Selected drawing actions"
      style={[
        styles.userDrawingActionSurface,
        resolveUserDrawingActionSurfacePosition({
          anchor: anchor.anchor,
          viewport: { width: dimensions.width, height: dimensions.height },
          surface: {
            width: MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH,
            height: surfaceHeight,
          },
          inset: { left: 8, right: 8, top: topInset + 6, bottom: 8 },
        }),
      ]}
      pointerEvents="auto"
    >
      {surface.groups.map((group, groupIndex) => (
        <View
          key={group.id}
          style={[
            styles.userDrawingActionSurfaceGroup,
            group.presentation?.type === 'popover' && styles.userDrawingActionSurfaceGroupPopover,
            groupIndex > 0 && styles.userDrawingActionSurfaceGroupSeparated,
          ]}
        >
          {group.presentation?.type === 'popover' ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={group.presentation.triggerLabel ?? group.label}
                accessibilityState={{ expanded: activePopoverGroupIdForSelection === group.id }}
                activeOpacity={0.72}
                style={[
                  styles.userDrawingActionButton,
                  activePopoverGroupIdForSelection === group.id && styles.userDrawingActionButtonActive,
                ]}
                onPress={() => {
                  setActivePopoverDrawingId(selectedDrawingId);
                  setActivePopoverGroupId(activePopoverGroupIdForSelection === group.id ? null : group.id);
                }}
              >
                <Text style={styles.userDrawingActionButtonText}>{group.presentation.triggerIcon ?? '...'}</Text>
              </TouchableOpacity>
              {activePopoverGroupIdForSelection === group.id && (
                <View
                  accessibilityLabel={group.presentation.popoverLabel ?? `${group.label} controls`}
                  style={[styles.userDrawingActionPopover, { width: group.presentation.popoverWidth ?? 272 }]}
                  pointerEvents="auto"
                >
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      disabled={!item.enabled}
                      activeOpacity={0.72}
                      style={[
                        styles.userDrawingActionButton,
                        item.swatchColor && { backgroundColor: item.swatchColor },
                        !item.enabled && styles.userDrawingActionButtonDisabled,
                      ]}
                      onPress={() => dispatchItem(item, { keepPopoverOpen: true })}
                    >
                      <Text style={[styles.userDrawingActionButtonText, !item.enabled && styles.userDrawingActionButtonTextDisabled]}>
                        {item.icon}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                disabled={!item.enabled}
                activeOpacity={0.72}
                style={[
                  styles.userDrawingActionButton,
                  item.swatchColor && { backgroundColor: item.swatchColor },
                  !item.enabled && styles.userDrawingActionButtonDisabled,
                ]}
                onPress={() => dispatchItem(item)}
              >
                <Text style={[styles.userDrawingActionButtonText, !item.enabled && styles.userDrawingActionButtonTextDisabled]}>
                  {item.icon}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  userDrawingActionSurface: {
    position: 'absolute',
    zIndex: 9,
    width: MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    gap: 3,
    padding: 4,
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 6,
    backgroundColor: 'rgba(19, 23, 34, 0.98)',
  },
  userDrawingActionSurfaceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  userDrawingActionSurfaceGroupPopover: {
    position: 'relative',
  },
  userDrawingActionSurfaceGroupSeparated: {
    borderLeftWidth: 1,
    borderLeftColor: '#363a45',
    paddingLeft: 3,
  },
  userDrawingActionButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDrawingActionButtonDisabled: {
    opacity: 0.35,
  },
  userDrawingActionButtonActive: {
    backgroundColor: 'rgba(41, 98, 255, 0.18)',
  },
  userDrawingActionButtonText: {
    color: '#d1d4dc',
    fontSize: 13,
    fontWeight: '600',
  },
  userDrawingActionButtonTextDisabled: {
    color: '#787b86',
  },
  userDrawingActionPopover: {
    position: 'absolute',
    left: 0,
    top: MOBILE_USER_DRAWING_ACTION_POPOVER_OFFSET_Y,
    zIndex: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 3,
    padding: 6,
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 6,
    backgroundColor: 'rgba(19, 23, 34, 0.98)',
  },
});
