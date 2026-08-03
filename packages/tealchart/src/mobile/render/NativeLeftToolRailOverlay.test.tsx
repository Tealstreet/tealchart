import type { ReactElement, ReactNode } from 'react';

import { Pressable, Text, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { resolveDrawingToolIconName, USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS } from '../../drawings';
import {
  createNativeLeftToolRailLayout,
  NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP,
  NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH,
} from '../utils/leftToolRailLayout';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import { NativeLeftToolRailOverlayImpl } from './NativeLeftToolRailOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  accessibilityState?: unknown;
  children?: ReactNode;
  color?: string;
  hitSlop?: unknown;
  name?: string;
  onPress?: () => void;
  pointerEvents?: string;
  style?: unknown;
}

type TestElement = ReactElement<TestElementProps>;

function walkElements(node: ReactNode, visitor: (element: TestElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as TestElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): TestElement[] {
  const elements: TestElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

describe('NativeLeftToolRailOverlay', () => {
  it('renders the drawing rail as RN overlay icons from the shared registry', () => {
    const layout = createNativeLeftToolRailLayout({ height: 520, bottomInset: 32, topBarHeight: 36 });
    expect(layout).not.toBeNull();
    const onCategoryOpenChange = vi.fn();
    const onToolSelect = vi.fn();
    const onToggleCollapsed = vi.fn();

    const overlay = NativeLeftToolRailOverlayImpl({
      activeBackgroundColor: '#20242a',
      activeTextColor: '#12c48b',
      backgroundColor: '#101418',
      gridColor: '#222831',
      leftToolRailLayout: layout!,
      mutedTextColor: '#8a8f98',
      onCategoryOpenChange,
      onToolSelect,
      onToggleCollapsed,
      toggleBackgroundColor: '#f0f3fa',
    });
    const views = collectElementsByType(overlay, View);
    const pressables = collectElementsByType(overlay, Pressable);
    const icons = collectElementsByType(overlay, NativeDrawingIcon);

    expect(layout!.items.map((item) => item.icon)).toEqual([
      'chevronLeft',
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(
        (category) => resolveDrawingToolIconName(category.tools[0]!) ?? 'select',
      ),
    ]);
    expect(icons.map((icon) => icon.props.name)).toEqual([
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(
        (category) => resolveDrawingToolIconName(category.tools[0]!) ?? 'select',
      ),
      'chevronLeft',
    ]);
    expect(icons.at(-1)!.props.color).toBe('#101418');
    expect(icons[0]!.props.color).toBe('#12c48b');
    expect(icons.slice(1, -1).every((icon) => icon.props.color === '#8a8f98')).toBe(true);
    expect(pressables).toHaveLength(USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.length + 1);
    expect(pressables[0].props.accessibilityLabel).toBe('Cursor drawing tools');
    expect(pressables[0].props.accessibilityState).toEqual({ selected: true, expanded: false });
    expect(pressables[0].props.hitSlop).toEqual({ top: 4, bottom: 4 });
    expect(flattenStyle(pressables[0].props.style)).toEqual(
      expect.objectContaining({
        left: 0,
        width: layout!.railRect.width,
      }),
    );
    pressables[0].props.onPress!();
    expect(onCategoryOpenChange).toHaveBeenCalledWith('cursor');
    expect(onToolSelect).not.toHaveBeenCalled();
    const toggle = pressables.at(-1)!;
    expect(toggle.props.accessibilityLabel).toBe('Collapse drawing toolbar');
    expect(toggle.props.accessibilityState).toEqual({ expanded: true });
    expect(toggle.props.pointerEvents).toBe('none');
    expect(flattenStyle(toggle.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: '#f0f3fa',
        borderBottomRightRadius: 10,
        borderTopRightRadius: 10,
      }),
    );
    toggle.props.onPress!();
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    expect(views[0].props.pointerEvents).toBe('box-none');
    expect(views[0].props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: 'absolute',
          zIndex: 40,
          elevation: 6,
        }),
        expect.objectContaining({
          left: layout!.x,
          top: layout!.y,
          width: layout!.width,
          height: layout!.height,
        }),
      ]),
    );
    expect(views.some((view) => flattenStyle(view.props.style).backgroundColor === '#101418')).toBe(true);
    let toggleWrapperStyle: Record<string, unknown> | null = null;
    walkElements(overlay, (element) => {
      const style = flattenStyle(element.props.style);
      if (
        style.bottom === NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP &&
        style.width === layout!.railRect.width + NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH - 1
      ) {
        toggleWrapperStyle = style;
      }
    });
    expect(toggleWrapperStyle).toEqual(
      expect.objectContaining({
        bottom: NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP,
        width: layout!.railRect.width + NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH - 1,
      }),
    );
    expect(toggleWrapperStyle?.top).toBeUndefined();
  });

  it('renders collapsed drawing rail as an RN expand button', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      collapsed: true,
      topBarHeight: 36,
    });
    expect(layout).not.toBeNull();
    const onCategoryOpenChange = vi.fn();
    const onToolSelect = vi.fn();
    const onToggleCollapsed = vi.fn();

    const overlay = NativeLeftToolRailOverlayImpl({
      activeBackgroundColor: '#20242a',
      activeTextColor: '#12c48b',
      backgroundColor: '#101418',
      gridColor: '#222831',
      leftToolRailLayout: layout!,
      mutedTextColor: '#8a8f98',
      onCategoryOpenChange,
      onToolSelect,
      onToggleCollapsed,
      toggleBackgroundColor: '#f0f3fa',
    });
    const pressables = collectElementsByType(overlay, Pressable);
    const icons = collectElementsByType(overlay, NativeDrawingIcon);
    const views = collectElementsByType(overlay, View);

    expect(pressables).toHaveLength(USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.length + 1);
    const toggle = pressables.at(-1)!;
    expect(toggle.props.accessibilityLabel).toBe('Expand drawing toolbar');
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });
    expect(toggle.props.pointerEvents).toBe('none');
    expect(icons.map((icon) => icon.props.name)).toEqual([
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(
        (category) => resolveDrawingToolIconName(category.tools[0]!) ?? 'select',
      ),
      'chevronRight',
    ]);
    expect(views.some((view) => flattenStyle(view.props.style).backgroundColor === '#101418')).toBe(true);
    expect(views.some((view) => view.props.pointerEvents === 'none')).toBe(true);
    toggle.props.onPress!();
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('marks the active shared drawing category selected', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      topBarHeight: 36,
      activeTool: 'rectangle',
    });
    expect(layout).not.toBeNull();

    const overlay = NativeLeftToolRailOverlayImpl({
      activeBackgroundColor: '#20242a',
      activeTextColor: '#12c48b',
      backgroundColor: '#101418',
      gridColor: '#222831',
      leftToolRailLayout: layout!,
      mutedTextColor: '#8a8f98',
      onCategoryOpenChange: vi.fn(),
      onToolSelect: vi.fn(),
      onToggleCollapsed: vi.fn(),
      toggleBackgroundColor: '#f0f3fa',
    });
    const pressables = collectElementsByType(overlay, Pressable);
    const rectangleButton = pressables.find(
      (pressable) => pressable.props.accessibilityLabel === 'Geometric Shapes drawing tools',
    );

    expect(rectangleButton?.props.accessibilityState).toEqual({ selected: true, expanded: false });
    const activeVisual = collectElementsByType(overlay, View).find((view) => {
      const style = flattenStyle(view.props.style);
      return style.backgroundColor === '#20242a' && style.borderColor === '#12c48b';
    });
    expect(flattenStyle(rectangleButton?.props.style)).toEqual(
      expect.objectContaining({ left: 0, width: layout!.railRect.width }),
    );
    expect(flattenStyle(activeVisual?.props.style)).toEqual(
      expect.objectContaining({ backgroundColor: '#20242a', borderColor: '#12c48b', height: 28, width: 28 }),
    );
  });

  it('opens a category drawer and selects only concrete tools from drawer rows', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      topBarHeight: 36,
    });
    expect(layout).not.toBeNull();
    const onCategoryOpenChange = vi.fn();
    const onToolSelect = vi.fn();

    const overlay = NativeLeftToolRailOverlayImpl({
      activeBackgroundColor: '#20242a',
      activeTextColor: '#12c48b',
      backgroundColor: '#101418',
      gridColor: '#222831',
      leftToolRailLayout: layout!,
      mutedTextColor: '#8a8f98',
      openCategoryId: 'lines',
      onCategoryOpenChange,
      onToolSelect,
      onToggleCollapsed: vi.fn(),
      toggleBackgroundColor: '#f0f3fa',
    });
    const pressables = collectElementsByType(overlay, Pressable);
    const texts = collectElementsByType(overlay, Text);
    const views = collectElementsByType(overlay, View);
    const linesCategory = pressables.find((pressable) => pressable.props.accessibilityLabel === 'Lines drawing tools');
    const trendLineRow = pressables.find((pressable) => pressable.props.accessibilityLabel === 'Trend line');
    const rayRow = pressables.find((pressable) => pressable.props.accessibilityLabel === 'Ray');

    expect(linesCategory?.props.accessibilityState).toEqual({ selected: false, expanded: true });
    expect(texts.some((text) => text.props.children === 'Lines')).toBe(true);
    expect(trendLineRow).not.toBeNull();
    expect(rayRow).not.toBeNull();
    expect(views.some((view) => {
      const style = flattenStyle(view.props.style);
      return style.zIndex === 41 && style.elevation === 7;
    })).toBe(true);
    linesCategory?.props.onPress!();
    expect(onCategoryOpenChange).toHaveBeenCalledWith(null);
    expect(onToolSelect).not.toHaveBeenCalled();

    rayRow?.props.onPress!();
    expect(onToolSelect).toHaveBeenCalledWith('ray');
    expect(onCategoryOpenChange).toHaveBeenCalledTimes(1);
  });
});
