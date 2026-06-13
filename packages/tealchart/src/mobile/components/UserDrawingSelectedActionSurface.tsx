import type {
  UserDrawingCommand,
  UserDrawingObjectTreeModel,
  UserDrawingPropertiesIntent,
  UserDrawingSelectedActionSurface,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
} from '../../drawings';

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  resolveUserDrawingActionSurfacePosition,
  shouldRenderUserDrawingSelectedActionSurface,
} from '../../drawings';
import { dispatchMobileUserDrawingActionCommand } from '../utils/drawingActionDispatch';

export const MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH = 304;
export const MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT = 70;

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
  if (!shouldRenderUserDrawingSelectedActionSurface(state, anchor)) return null;

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
            height: MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT,
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
            groupIndex > 0 && styles.userDrawingActionSurfaceGroupSeparated,
          ]}
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
              onPress={() => {
                dispatchMobileUserDrawingActionCommand(item.command, {
                  state,
                  source: 'toolbar',
                  createId,
                  dispatchUserDrawingCommand,
                  onUserDrawingPropertiesOpen,
                  onUserDrawingObjectTreeOpen,
                });
              }}
            >
              <Text style={[styles.userDrawingActionButtonText, !item.enabled && styles.userDrawingActionButtonTextDisabled]}>
                {item.icon}
              </Text>
            </TouchableOpacity>
          ))}
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
  userDrawingActionButtonText: {
    color: '#d1d4dc',
    fontSize: 13,
    fontWeight: '600',
  },
  userDrawingActionButtonTextDisabled: {
    color: '#787b86',
  },
});
