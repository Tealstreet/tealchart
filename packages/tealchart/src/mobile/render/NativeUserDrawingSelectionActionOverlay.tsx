import type {
  UserDrawing,
  UserDrawingDraft,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroup,
  UserDrawingSelectedActionSurfaceGroupId,
  UserDrawingSelectedActionSurfaceItem,
  UserDrawingSelection,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
  UserDrawingTextEdit,
} from '../../drawings';
import type { NativeGestureControlZone } from '../interaction/nativeGestureControlZones';

import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import {
  getSelectedUserDrawing,
  resolveDrawingSelectedActionIconName,
  resolveUserDrawingActionSurfacePosition,
  resolveUserDrawingSelectedActionSurface,
} from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';

const ACTION_SIZE = 28;
const ACTION_GAP = 2;
const GROUP_GAP = 8;
const SURFACE_PADDING = 4;
const SURFACE_CONTENT_PADDING_X = SURFACE_PADDING - ACTION_GAP / 2;
const POPOVER_HEIGHT = 52;
const CONTROL_ZONE_PADDING = 8;
const NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX = 60;

export interface NativeUserDrawingSelectionActionOverlayProps {
  activeBackgroundColor: string;
  activeTextColor: string;
  anchor: UserDrawingSelectionActionAnchor | null;
  backgroundColor: string;
  bottomInset?: number;
  gridColor: string;
  leftInset?: number;
  mutedTextColor: string;
  onAction: (command: UserDrawingSelectedActionSurfaceCommand) => void;
  onPopoverGroupChange: (groupId: UserDrawingSelectedActionSurfaceGroupId | null) => void;
  openPopoverGroupId?: UserDrawingSelectedActionSurfaceGroupId | null;
  rightInset?: number;
  textColor: string;
  topInset?: number;
  userDrawingDefaultStylesByKind?: UserDrawingState['defaultStylesByKind'];
  userDrawingDraft?: UserDrawingDraft | null;
  userDrawingDrawings: readonly UserDrawing[];
  userDrawingSelection: UserDrawingSelection | null;
  userDrawingTextEdit?: UserDrawingTextEdit | null;
  viewportHeight: number;
  viewportWidth: number;
}

export interface NativeSelectedDrawingActionSurfaceModel {
  groups: UserDrawingSelectedActionSurfaceGroup[];
  surfaceWidth: number;
}

export interface NativeSelectedDrawingActionOverlayModel extends NativeSelectedDrawingActionSurfaceModel {
  activePopoverGroup: UserDrawingSelectedActionSurfaceGroup | null;
  position: { left: number; top: number };
}

type NativeSelectedDrawingActionHitTarget =
  | {
      command: UserDrawingSelectedActionSurfaceCommand;
      enabled: boolean;
      id: string;
      label: string;
      type: 'action';
    }
  | {
      expanded: boolean;
      groupId: UserDrawingSelectedActionSurfaceGroupId;
      label: string;
      type: 'popover';
    };

function isNativeSelectedDrawingActionSupported(command: UserDrawingSelectedActionSurfaceCommand): boolean {
  switch (command.type) {
    case 'toolbarAction':
    case 'styleAction':
    case 'updateStyle':
    case 'setTextAlign':
    case 'setTrendLineExtend':
    case 'setIconName':
    case 'saveSelectedStyleAsDefault':
      return true;
    case 'editText':
    case 'copySelected':
    case 'openObjectTree':
    case 'openProperties':
    case 'setDuplicateEditDrag':
      return false;
  }
}

function resolveNativeSelectedDrawingActionGroups(state: UserDrawingState): UserDrawingSelectedActionSurfaceGroup[] {
  return resolveUserDrawingSelectedActionSurface(state)
    .groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => isNativeSelectedDrawingActionSupported(item.command)),
    }))
    .filter((group) => group.items.length > 0);
}

function createSelectedDrawingActionState({
  defaultStylesByKind,
  draft,
  drawings,
  selection,
  textEdit,
}: {
  defaultStylesByKind?: UserDrawingState['defaultStylesByKind'];
  draft?: UserDrawingDraft | null;
  drawings: readonly UserDrawing[];
  selection: UserDrawingSelection | null;
  textEdit?: UserDrawingTextEdit | null;
}): UserDrawingState {
  return {
    version: 1,
    activeTool: 'select',
    defaultStylesByKind,
    drawings,
    draft: draft ?? null,
    selection,
    textEdit: textEdit ?? null,
  };
}

function resolveGroupWidth(group: UserDrawingSelectedActionSurfaceGroup): number {
  const triggerCount = group.presentation?.type === 'popover' ? 1 : group.items.length;
  return triggerCount * ACTION_SIZE + Math.max(0, triggerCount - 1) * ACTION_GAP;
}

function resolveSurfaceWidth(groups: readonly UserDrawingSelectedActionSurfaceGroup[]): number {
  const groupWidth = groups.reduce(
    (total, group, index) => total + resolveGroupWidth(group) + (index > 0 ? GROUP_GAP : 0),
    0,
  );
  return SURFACE_PADDING * 2 + groupWidth;
}

export function resolveNativeSelectedDrawingActionSurfaceModel({
  leftInset = 8,
  rightInset = 8,
  userDrawingDefaultStylesByKind,
  userDrawingDraft,
  userDrawingDrawings,
  userDrawingSelection,
  userDrawingTextEdit,
  viewportWidth,
}: NativeUserDrawingSelectionActionOverlayProps): NativeSelectedDrawingActionSurfaceModel | null {
  const userDrawingActionState = createSelectedDrawingActionState({
    defaultStylesByKind: userDrawingDefaultStylesByKind,
    draft: userDrawingDraft,
    drawings: userDrawingDrawings,
    selection: userDrawingSelection,
    textEdit: userDrawingTextEdit,
  });

  if (userDrawingActionState.draft || userDrawingActionState.textEdit) return null;
  if (!getSelectedUserDrawing(userDrawingActionState)) return null;

  const groups = resolveNativeSelectedDrawingActionGroups(userDrawingActionState);
  if (groups.length === 0) return null;

  return {
    groups,
    surfaceWidth: Math.min(Math.max(0, viewportWidth - leftInset - rightInset), resolveSurfaceWidth(groups)),
  };
}

function resolveNativeSelectedDrawingActionOverlayModelFromSurface({
  anchor,
  bottomInset = 8,
  leftInset = 8,
  openPopoverGroupId = null,
  rightInset = 8,
  surfaceModel,
  topInset = 8,
  viewportHeight,
  viewportWidth,
}: NativeUserDrawingSelectionActionOverlayProps & {
  surfaceModel: NativeSelectedDrawingActionSurfaceModel | null;
}): NativeSelectedDrawingActionOverlayModel | null {
  if (!anchor || !surfaceModel) return null;

  const activePopoverGroup =
    surfaceModel.groups.find((group) => group.id === openPopoverGroupId && group.presentation?.type === 'popover') ??
    null;
  const surfaceHeight = ACTION_SIZE + SURFACE_PADDING * 2 + (activePopoverGroup ? POPOVER_HEIGHT + ACTION_GAP : 0);
  const position = resolveUserDrawingActionSurfacePosition({
    anchor: anchor.anchor,
    viewport: { width: viewportWidth, height: viewportHeight },
    surface: { width: surfaceModel.surfaceWidth, height: surfaceHeight },
    inset: {
      bottom: bottomInset,
      left: leftInset,
      right: rightInset,
      top: topInset,
    },
    selectionBounds: anchor.bounds,
  });

  return {
    ...surfaceModel,
    activePopoverGroup,
    position,
  };
}

export function resolveNativeSelectedDrawingActionOverlayModel(
  props: NativeUserDrawingSelectionActionOverlayProps,
): NativeSelectedDrawingActionOverlayModel | null {
  return resolveNativeSelectedDrawingActionOverlayModelFromSurface({
    ...props,
    surfaceModel: resolveNativeSelectedDrawingActionSurfaceModel(props),
  });
}

export function resolveNativeSelectedDrawingActionControlZones(
  model: NativeSelectedDrawingActionOverlayModel | null,
): NativeGestureControlZone[] {
  if (!model) return [];

  const surfaceHeight = ACTION_SIZE + SURFACE_PADDING * 2;
  const zones: NativeGestureControlZone[] = [
    {
      x1: model.position.left - CONTROL_ZONE_PADDING,
      x2: model.position.left + model.surfaceWidth + CONTROL_ZONE_PADDING,
      y1: model.position.top - CONTROL_ZONE_PADDING,
      y2: model.position.top + surfaceHeight + CONTROL_ZONE_PADDING,
    },
  ];

  if (model.activePopoverGroup) {
    const popoverTop = model.position.top + surfaceHeight + ACTION_GAP;
    zones.push({
      x1: model.position.left - CONTROL_ZONE_PADDING,
      x2: model.position.left + model.surfaceWidth + CONTROL_ZONE_PADDING,
      y1: popoverTop - CONTROL_ZONE_PADDING,
      y2: popoverTop + POPOVER_HEIGHT + CONTROL_ZONE_PADDING,
    });
  }

  return zones;
}

function resolveNativeSelectedDrawingActionRowHitTarget({
  groups,
  openPopoverGroupId,
  x,
  y,
}: {
  groups: readonly UserDrawingSelectedActionSurfaceGroup[];
  openPopoverGroupId: UserDrawingSelectedActionSurfaceGroupId | null;
  x: number;
  y: number;
}): NativeSelectedDrawingActionHitTarget | null {
  if (y < -CONTROL_ZONE_PADDING || y > ACTION_SIZE + SURFACE_PADDING * 2 + CONTROL_ZONE_PADDING) return null;

  let cursor = SURFACE_CONTENT_PADDING_X;
  for (const [groupIndex, group] of groups.entries()) {
    if (groupIndex > 0) cursor += GROUP_GAP;

    if (group.presentation?.type === 'popover') {
      if (x >= cursor - CONTROL_ZONE_PADDING && x <= cursor + ACTION_SIZE + CONTROL_ZONE_PADDING) {
        return {
          expanded: openPopoverGroupId === group.id,
          groupId: group.id,
          label: group.presentation.triggerLabel ?? group.label,
          type: 'popover',
        };
      }
      cursor += ACTION_SIZE + ACTION_GAP;
      continue;
    }

    for (const item of group.items) {
      if (x >= cursor - CONTROL_ZONE_PADDING && x <= cursor + ACTION_SIZE + CONTROL_ZONE_PADDING) {
        return {
          command: item.command,
          enabled: item.enabled,
          id: item.id,
          label: item.label,
          type: 'action',
        };
      }
      cursor += ACTION_SIZE + ACTION_GAP;
    }
  }

  return null;
}

export function resolveNativeSelectedDrawingActionHitTarget({
  model,
  openPopoverGroupId = null,
  x,
  y,
}: {
  model: NativeSelectedDrawingActionOverlayModel;
  openPopoverGroupId?: UserDrawingSelectedActionSurfaceGroupId | null;
  x: number;
  y: number;
}): NativeSelectedDrawingActionHitTarget | null {
  const surfaceHeight = ACTION_SIZE + SURFACE_PADDING * 2;
  const inHorizontalBounds = x >= -CONTROL_ZONE_PADDING && x <= model.surfaceWidth + CONTROL_ZONE_PADDING;
  if (!inHorizontalBounds) return null;

  if (y <= surfaceHeight + CONTROL_ZONE_PADDING) {
    return resolveNativeSelectedDrawingActionRowHitTarget({
      groups: model.groups,
      openPopoverGroupId,
      x,
      y,
    });
  }

  if (!model.activePopoverGroup) return null;

  const popoverY = y - surfaceHeight - ACTION_GAP;
  if (popoverY < -CONTROL_ZONE_PADDING || popoverY > POPOVER_HEIGHT + CONTROL_ZONE_PADDING) return null;

  return resolveNativeSelectedDrawingActionRowHitTarget({
    groups: [model.activePopoverGroup],
    openPopoverGroupId,
    x,
    y: popoverY,
  });
}

function resolveFallbackLabel(item: UserDrawingSelectedActionSurfaceItem): string {
  if (item.swatchColor) return '';
  return item.icon.length <= 2 ? item.icon : item.label.slice(0, 1);
}

function renderActionButton({
  activeBackgroundColor,
  activeTextColor,
  backgroundColor,
  gridColor,
  item,
  mutedTextColor,
  onAction,
  textColor,
}: {
  activeBackgroundColor: string;
  activeTextColor: string;
  backgroundColor: string;
  gridColor: string;
  item: UserDrawingSelectedActionSurfaceItem;
  mutedTextColor: string;
  onAction: (command: UserDrawingSelectedActionSurfaceCommand) => void;
  textColor: string;
}) {
  const iconName = resolveDrawingSelectedActionIconName(item.command, item.swatchColor);
  const color = item.destructive ? '#ff4d6d' : item.selected ? activeTextColor : textColor;
  const disabledColor = mutedTextColor;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !item.enabled, selected: item.selected === true }}
      disabled={!item.enabled}
      hitSlop={{ left: 4, right: 4, top: 4, bottom: 4 }}
      key={`native-selected-drawing-action-${item.id}`}
      onPress={() => onAction(item.command)}
      style={[
        styles.actionButton,
        {
          backgroundColor: item.selected ? activeBackgroundColor : backgroundColor,
          borderColor: item.selected ? activeTextColor : gridColor,
          opacity: item.enabled ? 1 : 0.38,
        },
      ]}
    >
      {item.swatchColor ? (
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: item.swatchColor,
              borderColor: gridColor,
            },
          ]}
        />
      ) : iconName ? (
        <NativeDrawingIcon name={iconName} size={17} color={item.enabled ? color : disabledColor} strokeWidth={1.9} />
      ) : (
        <Text numberOfLines={1} style={[styles.actionText, { color: item.enabled ? color : disabledColor }]}>
          {resolveFallbackLabel(item)}
        </Text>
      )}
    </Pressable>
  );
}

function NativeUserDrawingSelectionActionOverlayView({
  activeBackgroundColor,
  activeTextColor,
  backgroundColor,
  gridColor,
  model,
  mutedTextColor,
  onAction,
  onPopoverGroupChange,
  openPopoverGroupId = null,
  textColor,
}: NativeUserDrawingSelectionActionOverlayProps & {
  model: NativeSelectedDrawingActionOverlayModel | null;
}) {
  if (!model) return null;

  const { activePopoverGroup, groups, position, surfaceWidth } = model;
  const surfaceHeight = ACTION_SIZE + SURFACE_PADDING * 2;
  const resolveHitTarget = (x: number, y: number) =>
    resolveNativeSelectedDrawingActionHitTarget({
      model,
      openPopoverGroupId,
      x,
      y,
    });
  const handleTouchRelease = (x: number, y: number) => {
    const target = resolveHitTarget(x, y);
    if (!target) return;
    if (target.type === 'popover') {
      onPopoverGroupChange(target.expanded ? null : target.groupId);
      return;
    }
    if (target.enabled) onAction(target.command);
  };
  const tapGesture = Gesture.Tap()
    .maxDistance(12)
    .onEnd((event, success) => {
      if (!success) return;
      runOnJS(handleTouchRelease)(event.x, event.y);
    });

  return (
    <View
      accessibilityLabel="Selected drawing actions"
      collapsable={false}
      pointerEvents="box-none"
      style={styles.overlayRoot}
    >
      <View
        collapsable={false}
        style={[
          styles.overlay,
          {
            height: surfaceHeight + (activePopoverGroup ? POPOVER_HEIGHT + ACTION_GAP : 0),
            left: position.left,
            top: position.top,
            width: surfaceWidth,
          },
        ]}
      >
        <View
          collapsable={false}
          pointerEvents="auto"
          style={[
            styles.surface,
            {
              backgroundColor,
              borderColor: gridColor,
            },
          ]}
        >
          <View style={styles.surfaceContent}>
            {groups.map((group, groupIndex) => (
              <React.Fragment key={`native-selected-drawing-action-group-${group.id}`}>
                {groupIndex > 0 && <View style={[styles.separator, { backgroundColor: gridColor }]} />}
                {group.presentation?.type === 'popover' ? (
                  <Pressable
                    accessibilityLabel={group.presentation.triggerLabel ?? group.label}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: openPopoverGroupId === group.id }}
                    hitSlop={{ left: 4, right: 4, top: 4, bottom: 4 }}
                    onPress={() => onPopoverGroupChange(openPopoverGroupId === group.id ? null : group.id)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: openPopoverGroupId === group.id ? activeBackgroundColor : backgroundColor,
                        borderColor: openPopoverGroupId === group.id ? activeTextColor : gridColor,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.actionText,
                        { color: openPopoverGroupId === group.id ? activeTextColor : textColor },
                      ]}
                    >
                      {group.presentation.triggerIcon ?? '*'}
                    </Text>
                  </Pressable>
                ) : (
                  group.items.map((item) =>
                    renderActionButton({
                      activeBackgroundColor,
                      activeTextColor,
                      backgroundColor,
                      gridColor,
                      item,
                      mutedTextColor,
                      onAction,
                      textColor,
                    }),
                  )
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
        {activePopoverGroup && (
          <View
            accessibilityLabel={activePopoverGroup.presentation?.popoverLabel ?? activePopoverGroup.label}
            collapsable={false}
            pointerEvents="auto"
            style={[
              styles.popover,
              {
                backgroundColor,
                borderColor: gridColor,
              },
            ]}
          >
            <View style={styles.popoverContent}>
              {activePopoverGroup.items.map((item) =>
                renderActionButton({
                  activeBackgroundColor,
                  activeTextColor,
                  backgroundColor,
                  gridColor,
                  item,
                  mutedTextColor,
                  onAction,
                  textColor,
                }),
              )}
            </View>
          </View>
        )}
        <GestureDetector gesture={tapGesture}>
          <View collapsable={false} pointerEvents="auto" style={styles.touchLayer} />
        </GestureDetector>
      </View>
    </View>
  );
}

export function NativeUserDrawingSelectionActionOverlayImpl(props: NativeUserDrawingSelectionActionOverlayProps) {
  return NativeUserDrawingSelectionActionOverlayView({
    ...props,
    model: resolveNativeSelectedDrawingActionOverlayModel(props),
  });
}

function NativeUserDrawingSelectionActionOverlayRuntime(props: NativeUserDrawingSelectionActionOverlayProps) {
  const surfaceModel = React.useMemo(
    () => resolveNativeSelectedDrawingActionSurfaceModel(props),
    [
      props.leftInset,
      props.rightInset,
      props.userDrawingDefaultStylesByKind,
      props.userDrawingDraft,
      props.userDrawingDrawings,
      props.userDrawingSelection,
      props.userDrawingTextEdit,
      props.viewportWidth,
    ],
  );
  const model = React.useMemo(
    () => resolveNativeSelectedDrawingActionOverlayModelFromSurface({ ...props, surfaceModel }),
    [
      props.anchor,
      props.bottomInset,
      props.leftInset,
      props.openPopoverGroupId,
      props.rightInset,
      props.topInset,
      props.viewportHeight,
      props.viewportWidth,
      surfaceModel,
    ],
  );

  return <NativeUserDrawingSelectionActionOverlayView {...props} model={model} />;
}

export const NativeUserDrawingSelectionActionOverlay = React.memo(NativeUserDrawingSelectionActionOverlayRuntime);
NativeUserDrawingSelectionActionOverlay.displayName = 'NativeUserDrawingSelectionActionOverlay';

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    height: ACTION_SIZE,
    justifyContent: 'center',
    marginHorizontal: ACTION_GAP / 2,
    width: ACTION_SIZE,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    elevation: NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX,
    overflow: 'visible',
    position: 'absolute',
    zIndex: NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX,
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    elevation: NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX,
    overflow: 'visible',
    zIndex: NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX,
  },
  popover: {
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    height: POPOVER_HEIGHT,
    marginTop: ACTION_GAP,
    overflow: 'hidden',
  },
  popoverContent: {
    alignItems: 'center',
    paddingHorizontal: SURFACE_PADDING,
  },
  separator: {
    height: 18,
    marginHorizontal: GROUP_GAP / 2,
    width: StyleSheet.hairlineWidth,
  },
  surface: {
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    height: ACTION_SIZE + SURFACE_PADDING * 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 7,
  },
  surfaceContent: {
    alignItems: 'center',
    flexDirection: 'row',
    height: ACTION_SIZE + SURFACE_PADDING * 2,
    paddingHorizontal: SURFACE_CONTENT_PADDING_X,
  },
  swatch: {
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 18,
  },
  touchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: NATIVE_SELECTED_DRAWING_ACTION_Z_INDEX + 1,
  },
});
