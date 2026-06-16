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
import {
  computeLeftToolRailAvoidanceInset,
  computeTopLeftLegendRect,
  MOBILE_CHART_CHROME_METRICS,
} from '../../layout/chartGeometry';
import { dispatchMobileUserDrawingActionCommand } from '../utils/drawingActionDispatch';

export const MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH = 304;
export const MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT = 70;
const MOBILE_USER_DRAWING_ACTION_POPOVER_OFFSET_Y = 30;
const MOBILE_USER_DRAWING_ACTION_BUTTON_SIZE = 24;
const MOBILE_USER_DRAWING_ACTION_GAP = 3;
const MOBILE_USER_DRAWING_ACTION_POPOVER_PADDING = 6;
const MOBILE_USER_DRAWING_ACTION_POPOVER_BORDER_WIDTH = 1;
const MOBILE_USER_DRAWING_ACTION_POPOVER_MIN_HEIGHT = 74;

function resolveMobileUserDrawingActionPopoverHeight(itemCount: number, width: number): number {
  const contentWidth = Math.max(1, width - MOBILE_USER_DRAWING_ACTION_POPOVER_PADDING * 2);
  const columns = Math.max(
    1,
    Math.floor(
      (contentWidth + MOBILE_USER_DRAWING_ACTION_GAP) /
        (MOBILE_USER_DRAWING_ACTION_BUTTON_SIZE + MOBILE_USER_DRAWING_ACTION_GAP),
    ),
  );
  const rows = Math.max(1, Math.ceil(itemCount / columns));
  return Math.max(
    MOBILE_USER_DRAWING_ACTION_POPOVER_MIN_HEIGHT,
    rows * MOBILE_USER_DRAWING_ACTION_BUTTON_SIZE +
      Math.max(0, rows - 1) * MOBILE_USER_DRAWING_ACTION_GAP +
      MOBILE_USER_DRAWING_ACTION_POPOVER_PADDING * 2 +
      MOBILE_USER_DRAWING_ACTION_POPOVER_BORDER_WIDTH * 2,
  );
}

export interface UserDrawingSelectedActionSurfaceProps {
  state: UserDrawingState;
  surface: UserDrawingSelectedActionSurface;
  anchor: UserDrawingSelectionActionAnchor | null;
  dimensions: { width: number; height: number };
  topInset: number;
  dismissPopoverSignal?: number;
  createId: () => string;
  dispatchUserDrawingCommand: (command: UserDrawingCommand) => void;
  onUserDrawingDuplicateEditDragChange?: (enabled: boolean) => void;
  onUserDrawingPropertiesOpen?: (intent: UserDrawingPropertiesIntent) => void;
  onUserDrawingObjectTreeOpen?: (model: UserDrawingObjectTreeModel) => void;
  onUserDrawingCopySelected?: () => void;
}

export function UserDrawingSelectedActionSurfaceComponent({
  state,
  surface,
  anchor,
  dimensions,
  topInset,
  dismissPopoverSignal,
  createId,
  dispatchUserDrawingCommand,
  onUserDrawingDuplicateEditDragChange,
  onUserDrawingPropertiesOpen,
  onUserDrawingObjectTreeOpen,
  onUserDrawingCopySelected,
}: UserDrawingSelectedActionSurfaceProps) {
  const [activePopoverGroupId, setActivePopoverGroupId] = useState<string | null>(null);
  const [activePopoverDrawingId, setActivePopoverDrawingId] = useState<string | null>(null);
  const shouldRender = shouldRenderUserDrawingSelectedActionSurface(state, anchor);
  const selectedDrawingId = surface.selectedDrawing?.id ?? null;
  const activePopoverGroupIdForSelection =
    activePopoverDrawingId === selectedDrawingId ? activePopoverGroupId : null;
  const activePopoverGroup = surface.groups.find((group) => group.id === activePopoverGroupIdForSelection);
  const activePopoverPresentation =
    activePopoverGroup?.presentation?.type === 'popover' ? activePopoverGroup.presentation : null;
  const activePopoverWidth = activePopoverPresentation
    ? Math.min(activePopoverPresentation.popoverWidth ?? 296, MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH - 8)
    : 0;
  const activePopoverHeight =
    activePopoverGroup && activePopoverPresentation
      ? resolveMobileUserDrawingActionPopoverHeight(activePopoverGroup.items.length, activePopoverWidth)
      : 0;
  const surfaceHeight =
    activePopoverGroup?.presentation?.type === 'popover'
      ? MOBILE_USER_DRAWING_ACTION_POPOVER_OFFSET_Y +
        Math.max(MOBILE_USER_DRAWING_ACTION_SURFACE_HEIGHT, activePopoverHeight)
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

  useEffect(() => {
    setActivePopoverGroupId(null);
  }, [dismissPopoverSignal]);

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
      onUserDrawingCopySelected,
      onUserDrawingDuplicateEditDragChange,
    });
    if (!options.keepPopoverOpen) {
      setActivePopoverGroupId(null);
    }
  };

  // null until the mobile chrome metrics declare a top-left legend rect.
  const legendRect = computeTopLeftLegendRect(MOBILE_CHART_CHROME_METRICS, {
    x: 0,
    y: 0,
    width: dimensions.width,
    height: dimensions.height,
  });

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
          inset: {
            left: computeLeftToolRailAvoidanceInset(
              MOBILE_CHART_CHROME_METRICS,
              dimensions.width,
              MOBILE_USER_DRAWING_ACTION_SURFACE_WIDTH,
            ),
            right: 8,
            top: topInset + 6,
            bottom: 8,
          },
          avoidRects: legendRect ? [legendRect] : undefined,
          selectionBounds: anchor.bounds,
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
            </>
          ) : (
            group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ disabled: !item.enabled, selected: item.selected }}
                disabled={!item.enabled}
                activeOpacity={0.72}
                style={[
                  styles.userDrawingActionButton,
                  item.selected && styles.userDrawingActionButtonActive,
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
      {activePopoverGroup && activePopoverPresentation && (
        <View
          accessibilityLabel={activePopoverPresentation.popoverLabel ?? activePopoverGroup.label}
          style={[
            styles.userDrawingActionPopover,
            {
              width: activePopoverWidth,
            },
          ]}
          pointerEvents="auto"
        >
          {activePopoverGroup.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ disabled: !item.enabled, selected: item.selected }}
              disabled={!item.enabled}
              activeOpacity={0.72}
              style={[
                styles.userDrawingActionButton,
                item.selected && styles.userDrawingActionButtonActive,
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
    left: 4,
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
