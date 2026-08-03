import type { UserDrawingTool } from '../../drawings';
import type { NativeLeftToolRailItem, NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';

import React from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getUserDrawingToolDescriptor, resolveDrawingToolIconName } from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';

const RAIL_ANIMATION_DURATION_MS = 160;
export const NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH = 228;
const NATIVE_LEFT_TOOL_RAIL_Z_INDEX = 40;
const TOOL_DRAWER_HEADER_HEIGHT = 40;
const TOOL_DRAWER_ROW_HEIGHT = 38;
const TOOL_DRAWER_MIN_HEIGHT = 104;
const TOOL_DRAWER_VERTICAL_PADDING = 8;

export interface NativeLeftToolRailOverlayProps {
  activeBackgroundColor: string;
  activeTextColor: string;
  backgroundColor: string;
  gridColor: string;
  leftToolRailLayout: NativeLeftToolRailLayout;
  mutedTextColor: string;
  openCategoryId?: string | null;
  onCategoryOpenChange: (categoryId: string | null) => void;
  onToolSelect: (tool: UserDrawingTool) => void;
  onToggleCollapsed: () => void;
  toggleBackgroundColor: string;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveToolDrawerFrame(layout: NativeLeftToolRailLayout, item: NativeLeftToolRailItem) {
  const availableHeight = Math.max(TOOL_DRAWER_MIN_HEIGHT, layout.railRect.height - TOOL_DRAWER_VERTICAL_PADDING);
  const preferredHeight =
    TOOL_DRAWER_HEADER_HEIGHT + (item.tools?.length ?? 0) * TOOL_DRAWER_ROW_HEIGHT + TOOL_DRAWER_VERTICAL_PADDING;
  const height = Math.min(Math.max(TOOL_DRAWER_MIN_HEIGHT, preferredHeight), availableHeight);
  const maxTop = Math.max(4, layout.railRect.height - height - 4);
  const top = clampNumber(item.y - layout.railRect.y, 4, maxTop);

  return {
    height,
    left: layout.railRect.width,
    top,
    width: NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH,
  };
}

export function NativeLeftToolRailOverlayImpl({
  activeBackgroundColor,
  activeTextColor,
  backgroundColor,
  gridColor,
  leftToolRailLayout,
  mutedTextColor,
  openCategoryId = null,
  onCategoryOpenChange,
  onToolSelect,
  onToggleCollapsed,
  toggleBackgroundColor,
}: NativeLeftToolRailOverlayProps) {
  const railWidth = leftToolRailLayout.railRect.width;
  const railProgress = useSharedValue(leftToolRailLayout.collapsed ? 0 : 1);

  useAnimatedReaction(
    () => (leftToolRailLayout.collapsed ? 0 : 1),
    (targetProgress, previousProgress) => {
      if (targetProgress === previousProgress) return;
      railProgress.value = withTiming(targetProgress, {
        duration: RAIL_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    [leftToolRailLayout.collapsed],
  );

  const railAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -railWidth * (1 - railProgress.value) }],
  }));
  const toggleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (railWidth - 1) * railProgress.value }],
  }));
  const toggleItem = leftToolRailLayout.items.find((item) => item.kind === 'collapseToggle');
  const categoryItems = leftToolRailLayout.items.filter((item) => item.kind === 'category');
  const openCategoryItem = leftToolRailLayout.collapsed
    ? null
    : categoryItems.find((item) => item.categoryId === openCategoryId && item.tools?.length);
  const drawerFrame = openCategoryItem ? resolveToolDrawerFrame(leftToolRailLayout, openCategoryItem) : null;

  if (!toggleItem) return null;
  const toggleBottom = leftToolRailLayout.y + leftToolRailLayout.height - (toggleItem.y + toggleItem.height);
  const toggleTrackWidth = railWidth + toggleItem.width - 1;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          height: leftToolRailLayout.height,
          left: leftToolRailLayout.x,
          top: leftToolRailLayout.y,
          width: leftToolRailLayout.width + (drawerFrame ? NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH : 0),
        },
      ]}
    >
      <Animated.View
        pointerEvents={leftToolRailLayout.collapsed ? 'none' : 'box-none'}
        style={[
          styles.railGroup,
          {
            height: leftToolRailLayout.railRect.height,
            left: leftToolRailLayout.railRect.x - leftToolRailLayout.x,
            top: leftToolRailLayout.railRect.y - leftToolRailLayout.y,
            width: leftToolRailLayout.railRect.width + NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH,
          },
          railAnimatedStyle,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.rail,
            {
              backgroundColor,
              borderRightColor: gridColor,
              height: leftToolRailLayout.railRect.height,
              left: 0,
              top: 0,
              width: leftToolRailLayout.railRect.width,
            },
          ]}
        />
        {categoryItems.map((item) => {
          if (!item.categoryId) return null;
          const isOpen = openCategoryId === item.categoryId && !leftToolRailLayout.collapsed;
          const isHighlighted = item.active === true || isOpen;
          const itemStyle = [
            styles.item,
            styles.toolButton,
            {
              height: item.height,
              left: 0,
              top: item.y - leftToolRailLayout.railRect.y,
              width: leftToolRailLayout.railRect.width,
            },
          ];
          const visualStyle = [
            styles.itemVisual,
            styles.toolItem,
            {
              backgroundColor: isHighlighted ? activeBackgroundColor : 'transparent',
              borderColor: isHighlighted ? activeTextColor : 'transparent',
              height: item.height,
              width: item.width,
            },
          ];

          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: item.active === true, expanded: isOpen }}
              hitSlop={{ top: 4, bottom: 4 }}
              key={`native-left-tool-category-${item.categoryId}`}
              onPress={() => onCategoryOpenChange(isOpen ? null : (item.categoryId ?? null))}
              style={itemStyle}
            >
              <View pointerEvents="none" style={visualStyle}>
                <NativeDrawingIcon
                  name={item.icon}
                  size={22}
                  color={isHighlighted ? activeTextColor : mutedTextColor}
                  strokeWidth={1.75}
                />
              </View>
            </Pressable>
          );
        })}
        {openCategoryItem && drawerFrame && (
          <View
            accessibilityLabel={`${openCategoryItem.categoryLabel ?? 'Drawing'} tools`}
            pointerEvents="box-none"
            style={[
              styles.drawer,
              {
                backgroundColor,
                borderColor: gridColor,
                height: drawerFrame.height,
                left: drawerFrame.left,
                top: drawerFrame.top,
                width: drawerFrame.width,
              },
            ]}
          >
            <View style={[styles.drawerHeader, { borderBottomColor: gridColor }]}>
              <Text numberOfLines={1} style={[styles.drawerTitle, { color: mutedTextColor }]}>
                {openCategoryItem.categoryLabel ?? 'Drawing Tools'}
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.drawerList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {openCategoryItem.tools?.map((tool) => {
                const descriptor = getUserDrawingToolDescriptor(tool);
                const active = leftToolRailLayout.activeTool === tool;
                return (
                  <Pressable
                    accessibilityLabel={descriptor.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={`native-left-tool-drawer-${openCategoryItem.categoryId}-${tool}`}
                    onPress={() => onToolSelect(tool)}
                    style={[
                      styles.drawerRow,
                      {
                        backgroundColor: active ? activeBackgroundColor : 'transparent',
                      },
                    ]}
                  >
                    <NativeDrawingIcon
                      name={resolveDrawingToolIconName(tool) ?? 'select'}
                      size={18}
                      color={active ? activeTextColor : mutedTextColor}
                      strokeWidth={1.7}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.drawerLabel, { color: active ? activeTextColor : mutedTextColor }]}
                    >
                      {descriptor.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={[
          styles.toggleTrack,
          {
            bottom: toggleBottom,
            height: toggleItem.height,
            left: toggleItem.x - leftToolRailLayout.x,
            width: toggleTrackWidth,
          },
        ]}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.item,
            {
              height: toggleItem.height,
              left: 0,
              top: 0,
              width: toggleItem.width,
            },
            toggleAnimatedStyle,
          ]}
        >
          <Pressable
            accessibilityLabel={leftToolRailLayout.collapsed ? 'Expand drawing toolbar' : 'Collapse drawing toolbar'}
            accessibilityRole="button"
            accessibilityState={{ expanded: !leftToolRailLayout.collapsed }}
            onPress={onToggleCollapsed}
            pointerEvents="none"
            style={[
              styles.toggle,
              {
                backgroundColor: toggleBackgroundColor,
                borderColor: gridColor,
                height: toggleItem.height,
                width: toggleItem.width,
              },
            ]}
          >
            <NativeDrawingIcon name={toggleItem.icon} size={12} color={backgroundColor} strokeWidth={2.4} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

export const NativeLeftToolRailOverlay = React.memo(NativeLeftToolRailOverlayImpl);
NativeLeftToolRailOverlay.displayName = 'NativeLeftToolRailOverlay';

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  overlay: {
    elevation: 6,
    overflow: 'visible',
    position: 'absolute',
    zIndex: NATIVE_LEFT_TOOL_RAIL_Z_INDEX,
  },
  rail: {
    borderRightWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
  },
  railGroup: {
    overflow: 'visible',
    position: 'absolute',
  },
  toggleTrack: {
    overflow: 'visible',
    position: 'absolute',
  },
  drawer: {
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 7,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    zIndex: NATIVE_LEFT_TOOL_RAIL_Z_INDEX + 1,
  },
  drawerHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: TOOL_DRAWER_HEADER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  drawerLabel: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
  },
  drawerList: {
    paddingVertical: 4,
  },
  drawerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: TOOL_DRAWER_ROW_HEIGHT,
    paddingHorizontal: 12,
  },
  drawerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  toggle: {
    alignItems: 'center',
    borderBottomRightRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  toolItem: {
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemVisual: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
