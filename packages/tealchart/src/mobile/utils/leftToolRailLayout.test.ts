import { describe, expect, it } from 'vitest';

import { resolveDrawingToolIconName, USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS } from '../../drawings';
import { MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';
import {
  createNativeLeftToolRailLayout,
  NATIVE_LEFT_TOOL_RAIL_CATEGORY_COUNT,
  NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP,
  NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH,
  isNativeLeftToolRailToggleTap,
  resolveNativeLeftToolRailToggleHitRect,
} from './leftToolRailLayout';

describe('native left tool rail layout', () => {
  it('lays out the expanded drawing rail below native top bar chrome', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      topBarHeight: 36,
    });

    expect(layout).not.toBeNull();
    expect(layout?.x).toBe(0);
    expect(layout?.y).toBe(MOBILE_CHART_CHROME_METRICS.topBarHeight + MOBILE_CHART_CHROME_METRICS.leftToolRailTopGap);
    expect(layout?.width).toBeGreaterThan(MOBILE_CHART_CHROME_METRICS.leftToolRailWidth);
    expect(layout?.railRect).toEqual({
      x: 0,
      y: MOBILE_CHART_CHROME_METRICS.topBarHeight + MOBILE_CHART_CHROME_METRICS.leftToolRailTopGap,
      width: MOBILE_CHART_CHROME_METRICS.leftToolRailWidth,
      height: layout?.height,
    });
    expect(layout?.collapsed).toBe(false);
    expect(layout?.activeTool).toBe('select');
    expect(layout?.items.map((item) => item.kind)).toEqual([
      'collapseToggle',
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(() => 'category' as const),
    ]);
    expect(layout?.items.map((item) => item.icon)).toEqual([
      'chevronLeft',
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(
        (category) => resolveDrawingToolIconName(category.tools[0]!) ?? 'select',
      ),
    ]);
    expect(layout?.items[1]).toEqual(
      expect.objectContaining({
        active: true,
        categoryId: 'cursor',
        categoryLabel: 'Cursor',
        displayTool: 'select',
        label: 'Cursor drawing tools',
        tools: ['select'],
      }),
    );
    expect(layout!.items[0]!.y + layout!.items[0]!.height).toBe(
      layout!.y + layout!.height - NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP,
    );
  });

  it('keeps rail geometry mounted with a bottom expand tab when collapsed', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      collapsed: true,
      topBarHeight: 36,
    });

    expect(layout).not.toBeNull();
    expect(layout?.activeTool).toBe('select');
    expect(layout?.x).toBe(0);
    expect(layout?.width).toBe(MOBILE_CHART_CHROME_METRICS.leftToolRailWidth + NATIVE_LEFT_TOOL_RAIL_TOGGLE_WIDTH - 1);
    expect(layout?.railRect).toEqual({
      x: 0,
      y: MOBILE_CHART_CHROME_METRICS.topBarHeight + MOBILE_CHART_CHROME_METRICS.leftToolRailTopGap,
      width: MOBILE_CHART_CHROME_METRICS.leftToolRailWidth,
      height: layout?.height,
    });
    expect(layout?.collapsed).toBe(true);
    expect(layout?.items.map((item) => item.icon)).toEqual([
      'chevronRight',
      ...USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map(
        (category) => resolveDrawingToolIconName(category.tools[0]!) ?? 'select',
      ),
    ]);
    expect(layout!.items[0]!.y + layout!.items[0]!.height).toBe(
      layout!.y + layout!.height - NATIVE_LEFT_TOOL_RAIL_TOGGLE_BOTTOM_GAP,
    );
  });

  it('hit-tests the animated collapse toggle position', () => {
    const expanded = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      collapsed: false,
      topBarHeight: 36,
    });
    const collapsed = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      collapsed: true,
      topBarHeight: 36,
    });
    expect(expanded).not.toBeNull();
    expect(collapsed).not.toBeNull();

    const expandedRect = resolveNativeLeftToolRailToggleHitRect(expanded!);
    const collapsedRect = resolveNativeLeftToolRailToggleHitRect(collapsed!);

    expect(expandedRect).toEqual(expect.objectContaining({ x: MOBILE_CHART_CHROME_METRICS.leftToolRailWidth - 11 }));
    expect(collapsedRect).toEqual(expect.objectContaining({ x: -10 }));
    expect(isNativeLeftToolRailToggleTap(expanded!, expandedRect!.x + 1, expandedRect!.y + 1)).toBe(true);
    expect(isNativeLeftToolRailToggleTap(collapsed!, collapsedRect!.x + 1, collapsedRect!.y + 1)).toBe(true);
    expect(isNativeLeftToolRailToggleTap(expanded!, collapsedRect!.x + 1, expandedRect!.y + 1)).toBe(false);
  });

  it('uses the active tool category and recent category tools from shared drawing state', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      topBarHeight: 36,
      activeTool: 'rectangle',
      userDrawingRecentToolsByCategory: { lines: 'horizontalLine' },
    });

    expect(layout).not.toBeNull();
    expect(layout?.items.find((item) => item.categoryId === 'lines')).toEqual(
      expect.objectContaining({ active: false, displayTool: 'horizontalLine', kind: 'category' }),
    );
    expect(layout?.items.find((item) => item.categoryId === 'geometric-shapes')).toEqual(
      expect.objectContaining({ active: true, displayTool: 'rectangle', kind: 'category' }),
    );
  });

  it('clips rail items instead of overflowing short chart surfaces', () => {
    const layout = createNativeLeftToolRailLayout({
      height: 160,
      bottomInset: 32,
      topBarHeight: 36,
    });

    expect(layout).not.toBeNull();
    expect(layout?.items[0]?.kind).toBe('collapseToggle');
    expect(layout?.items.length).toBeLessThan(NATIVE_LEFT_TOOL_RAIL_CATEGORY_COUNT + 1);
    const lastItem = layout!.items.at(-1)!;
    expect(lastItem.y + lastItem.height).toBeLessThanOrEqual(layout!.y + layout!.height);
  });

  it('omits the rail when there is no room for a touch-sized item', () => {
    expect(
      createNativeLeftToolRailLayout({
        height: 68,
        bottomInset: 20,
        topBarHeight: 36,
      }),
    ).toBeNull();
  });
});
