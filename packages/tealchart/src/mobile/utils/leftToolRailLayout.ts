import type { DrawingIconName, UserDrawingRecentToolByCategory, UserDrawingTool } from '../../drawings';

import {
  resolveDrawingToolIconName,
  resolveUserDrawingToolCategoryButtonTool,
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
} from '../../drawings';
import { MOBILE_CHART_CHROME_METRICS, resolveLeftToolRailMetrics } from '../../layout/chartGeometry';

export type NativeLeftToolRailIcon = DrawingIconName;

export type NativeLeftToolRailItemKind = 'category' | 'collapseToggle';

export interface NativeLeftToolRailRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeLeftToolRailItem {
  active?: boolean;
  categoryId?: string;
  categoryLabel?: string;
  icon: NativeLeftToolRailIcon;
  kind: NativeLeftToolRailItemKind;
  label?: string;
  displayTool?: UserDrawingTool;
  tools?: readonly UserDrawingTool[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeLeftToolRailLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  activeTool: UserDrawingTool;
  collapsed: boolean;
  railRect: NativeLeftToolRailRect;
  items: NativeLeftToolRailItem[];
}

export interface NativeLeftToolRailLayoutInput {
  height: number;
  bottomInset: number;
  activeTool?: UserDrawingTool;
  collapsed?: boolean;
  userDrawingRecentToolsByCategory?: UserDrawingRecentToolByCategory;
  topBarHeight: number;
}

export const NATIVE_LEFT_TOOL_RAIL_CATEGORY_COUNT = USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.length;

const ITEM_SIZE = 28;
const ITEM_GAP = 2;
export const NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH = 10;
export const NATIVE_LEFT_TOOL_RAIL_TOGGLE_HEIGHT = 42;
export const NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP = 10;
export const NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP = { left: 10, right: 10, top: 6, bottom: 6 };

const COLLAPSE_TOGGLE_ICON: NativeLeftToolRailIcon = 'chevronLeft';
const EXPAND_TOGGLE_ICON: NativeLeftToolRailIcon = 'chevronRight';

export function createNativeLeftToolRailLayout(input: NativeLeftToolRailLayoutInput): NativeLeftToolRailLayout | null {
  const collapsed = input.collapsed === true;
  const metrics = resolveLeftToolRailMetrics(MOBILE_CHART_CHROME_METRICS, false);
  const x = 0;
  const y = input.topBarHeight + MOBILE_CHART_CHROME_METRICS.leftToolRailTopGap;
  const bottom = Math.max(y, input.height - input.bottomInset);
  const height = bottom - y;
  if (height < ITEM_SIZE) return null;

  const itemX = Math.round(x + (metrics.leftToolRailWidth - ITEM_SIZE) / 2);
  const activeTool = input.activeTool ?? 'select';
  const recentTools = input.userDrawingRecentToolsByCategory ?? {};
  const toggleHeight = Math.min(NATIVE_LEFT_TOOL_RAIL_TOGGLE_HEIGHT, height);
  const toggleBottomGap = Math.min(NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP, Math.max(0, height - toggleHeight));
  const toggleY = y + Math.max(0, height - toggleHeight - toggleBottomGap);
  const toggleItem: NativeLeftToolRailItem = {
    icon: collapsed ? EXPAND_TOGGLE_ICON : COLLAPSE_TOGGLE_ICON,
    kind: 'collapseToggle',
    x,
    y: toggleY,
    width: NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH,
    height: toggleHeight,
  };

  const availableToolSlots = Math.max(0, Math.floor((height - ITEM_SIZE) / (ITEM_SIZE + ITEM_GAP)));
  const maxItems = Math.min(USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.length, availableToolSlots);
  const items = USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.slice(0, maxItems).map((category, index) => {
    const displayTool = resolveUserDrawingToolCategoryButtonTool(category, activeTool, recentTools);
    return {
      active: category.tools.includes(activeTool),
      categoryId: category.id,
      categoryLabel: category.label,
      displayTool,
      icon: resolveDrawingToolIconName(displayTool) ?? 'select',
      kind: 'category' as const,
      label: `${category.label} drawing tools`,
      tools: category.tools,
      x: itemX,
      y: y + ITEM_SIZE + ITEM_GAP + index * (ITEM_SIZE + ITEM_GAP),
      width: ITEM_SIZE,
      height: ITEM_SIZE,
    };
  });

  return {
    x,
    y,
    width: metrics.leftToolRailWidth + NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH - 1,
    height,
    activeTool,
    collapsed,
    railRect: {
      x,
      y,
      width: metrics.leftToolRailWidth,
      height,
    },
    items: [toggleItem, ...items],
  };
}

export function resolveNativeLeftToolRailToggleHitRect(
  layout: NativeLeftToolRailLayout,
): NativeLeftToolRailRect | null {
  'worklet';
  let toggleItem: NativeLeftToolRailItem | null = null;
  for (let index = 0; index < layout.items.length; index += 1) {
    const item = layout.items[index];
    if (item.kind === 'collapseToggle') {
      toggleItem = item;
      break;
    }
  }
  if (!toggleItem) return null;

  const translateX = layout.collapsed ? 0 : layout.railRect.width - 1;
  return {
    x: toggleItem.x + translateX - NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.left,
    y: toggleItem.y - NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.top,
    width: toggleItem.width + NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.left + NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.right,
    height: toggleItem.height + NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.top + NATIVE_LEFT_TOOL_RAIL_TOGGLE_HIT_SLOP.bottom,
  };
}

export function isNativeLeftToolRailToggleTap(layout: NativeLeftToolRailLayout, x: number, y: number): boolean {
  'worklet';
  const rect = resolveNativeLeftToolRailToggleHitRect(layout);
  if (!rect) return false;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
