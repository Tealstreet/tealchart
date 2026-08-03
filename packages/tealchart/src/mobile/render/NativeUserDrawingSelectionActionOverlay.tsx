import type {
  UserDrawing,
  UserDrawingDraft,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroup,
  UserDrawingSelectedActionSurfaceGroupId,
  UserDrawingSelectedActionSurfaceItem,
  UserDrawingSelectionActionAnchor,
  UserDrawingSelection,
  UserDrawingState,
  UserDrawingTextEdit,
} from '../../drawings';

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
const POPOVER_HEIGHT = 52;

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

function resolveNativeSelectedDrawingActionGroups(
  state: UserDrawingState,
): UserDrawingSelectedActionSurfaceGroup[] {
  return resolveUserDrawingSelectedActionSurface(state).groups
    .map((group) => ({
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
  const groupWidth = groups.reduce((total, group, index) => (
    total + resolveGroupWidth(group) + (index > 0 ? GROUP_GAP : 0)
  ), 0);
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
    surfaceWidth: Math.min(
      Math.max(0, viewportWidth - leftInset - rightInset),
      resolveSurfaceWidth(groups),
    ),
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

  const activePopoverGroup = surfaceModel.groups.find(
    (group) => group.id === openPopoverGroupId && group.presentation?.type === 'popover',
  ) ?? null;
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
        <NativeDrawingIcon
          name={iconName}
          size={17}
          color={item.enabled ? color : disabledColor}
          strokeWidth={1.9}
        />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.actionText,
            { color: item.enabled ? color : disabledColor },
          ]}
        >
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

  return (
    <View
      accessibilityLabel="Selected drawing actions"
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          left: position.left,
          top: position.top,
          width: surfaceWidth,
        },
      ]}
    >
      <View
        pointerEvents="auto"
        style={[
          styles.surface,
          {
            backgroundColor,
            borderColor: gridColor,
          },
        ]}
      >
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.surfaceScroll}
          contentContainerStyle={styles.surfaceContent}
        >
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
        </ScrollView>
      </View>
      {activePopoverGroup && (
        <ScrollView
          accessibilityLabel={activePopoverGroup.presentation?.popoverLabel ?? activePopoverGroup.label}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={[
            styles.popover,
            {
              backgroundColor,
              borderColor: gridColor,
            },
          ]}
          contentContainerStyle={styles.popoverContent}
        >
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
        </ScrollView>
      )}
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
    overflow: 'visible',
    position: 'absolute',
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
    paddingHorizontal: SURFACE_PADDING - ACTION_GAP / 2,
  },
  surfaceScroll: {
    height: ACTION_SIZE + SURFACE_PADDING * 2,
  },
  swatch: {
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 18,
  },
});
