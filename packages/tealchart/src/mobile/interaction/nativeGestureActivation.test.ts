import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeTradeLineObjectType } from '../utils/tradeLineLayout';
import type {
  NativeBracketDragInteractionState,
  NativeOrderDragInteractionState,
  NativeTradeLineBracketType,
} from './nativeOemsDragState';
import type { NativePriceAutoScaleSharedValues, NativeViewportGestureMetrics } from './nativeViewportGestureState';

import { describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import { createNativeLeftToolRailLayout, resolveNativeLeftToolRailToggleHitRect } from '../utils/leftToolRailLayout';
import {
  createNativeCrosshairContextMenuTapGesture,
  createNativeCrosshairLongPressGesture,
  createNativeCrosshairPanGesture,
  createNativeCrosshairTapGesture,
} from './nativeCrosshairGestures';
import {
  resolveNativeCrosshairContextMenuButtonLayout,
  resolveNativeCrosshairPriceLabelText,
} from './nativeCrosshairContextMenu';
import { createNativeBracketDragGesture, createNativeOrderDragGesture } from './nativeOemsDragGestures';
import {
  NATIVE_RESET_VIEW_HIT_SIZE,
  NATIVE_RESET_VIEW_TAP_MOVE_TOLERANCE,
  resolveNativeResetViewButtonLayout,
} from './nativeResetViewButton';
import {
  createNativeLeftToolRailToggleTapGesture,
  createNativeResetViewTapGesture,
  createNativeUserDrawingTapGesture,
} from './nativeTapGestures';
import {
  createNativeChartAxisPinchGesture,
  createNativeChartPanGesture,
  createNativePriceScaleGesture,
  createNativeTimeScaleGesture,
} from './nativeViewportGestures';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
}));

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function sharedViewport(viewport: Viewport): NativeViewportSharedValues {
  return {
    startTime: shared(viewport.startTime),
    endTime: shared(viewport.endTime),
    priceMin: shared(viewport.priceMin),
    priceMax: shared(viewport.priceMax),
  };
}

function priceAutoScale(active = false): NativePriceAutoScaleSharedValues {
  return {
    active: shared(active),
    bars: shared([]),
  };
}

function readViewport(viewport: NativeViewportSharedValues): Viewport {
  return {
    startTime: viewport.startTime.value,
    endTime: viewport.endTime.value,
    priceMin: viewport.priceMin.value,
    priceMax: viewport.priceMax.value,
  };
}

function gestureMetrics(): NativeViewportGestureMetrics {
  return {
    intervalMs: shared(1),
    contentWidth: shared(10_000),
    timePerPixel: shared(999),
    pricePerPixel: shared(999),
  };
}

function mockStateManager() {
  return {
    activated: false,
    ended: false,
    failed: false,
    activate() {
      this.activated = true;
    },
    end() {
      this.ended = true;
    },
    fail() {
      this.failed = true;
    },
  };
}

function createOrderDragState(active = false): NativeOrderDragInteractionState {
  return {
    active: shared(active),
    activeObjectId: shared(''),
    activePrice: shared(0),
    startPrice: shared(0),
    pricePerPixel: shared(0),
  };
}

function createBracketDragState(active = false): NativeBracketDragInteractionState {
  return {
    active: shared(active),
    activeObjectId: shared(''),
    activeObjectType: shared<NativeTradeLineObjectType | ''>(''),
    activeBracketType: shared<NativeTradeLineBracketType | ''>(''),
    activePrice: shared(0),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared(''),
    startPrice: shared(0),
    pricePerPixel: shared(0),
  };
}

function createCrosshair(visible = false) {
  return {
    visible: shared(visible),
    x: shared(90),
    y: shared(80),
    dragOriginX: shared(0),
    dragOriginY: shared(0),
  };
}

function resetTapState() {
  return {
    blockedByContextMenuButton: shared(false),
    startX: shared(0),
    startY: shared(0),
    startedOnButton: shared(false),
  };
}

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 180, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 104, yMin: 62_000, yMax: 64_000 }],
});

const viewportValue: Viewport = {
  startTime: 1_000,
  endTime: 2_000,
  priceMin: 62_000,
  priceMax: 64_000,
};

describe('native gesture activation', () => {
  it('toggles crosshair on tap and moves it by drag translation while visible', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const crosshairTapGesture = createNativeCrosshairTapGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const crosshairPanGesture = createNativeCrosshairPanGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    expect(crosshairTapGesture.config.maxDistance).toBe(8);
    crosshairTapGesture.handlers.onEnd({ x: 80, y: 60 }, true);
    expect(crosshair.visible.value).toBe(true);
    expect(crosshair.x.value).toBe(80);
    expect(crosshair.y.value).toBe(60);

    const accepted = mockStateManager();
    crosshairPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 120, y: 100 }], allTouches: [{ x: 120, y: 100 }] },
      accepted,
    );
    expect(accepted.failed).toBe(false);

    crosshairPanGesture.handlers.onBegin({ x: 120, y: 100 });
    crosshairPanGesture.handlers.onUpdate({ translationX: 30, translationY: -40 });
    expect(crosshair.x.value).toBe(110);
    expect(crosshair.y.value).toBe(frame.mainPane.top);

    crosshairTapGesture.handlers.onEnd({ x: 80, y: 60 }, true);
    expect(crosshair.visible.value).toBe(false);
  });

  it('toggles crosshair after a stationary long press using the tap interaction rules', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const crosshairLongPressGesture = createNativeCrosshairLongPressGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    expect(crosshairLongPressGesture.config.minDuration).toBe(2_000);
    expect(crosshairLongPressGesture.config.maxDistance).toBe(NATIVE_RESET_VIEW_TAP_MOVE_TOLERANCE);

    crosshairLongPressGesture.handlers.onStart({ x: 80, y: 60 });
    expect(crosshair.visible.value).toBe(true);
    expect(crosshair.x.value).toBe(80);
    expect(crosshair.y.value).toBe(60);

    crosshairLongPressGesture.handlers.onStart({ x: 80, y: 60 });
    expect(crosshair.visible.value).toBe(false);
  });

  it('leaves the reset view reveal strip to reset gestures instead of crosshair toggles', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const crosshairTapGesture = createNativeCrosshairTapGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    crosshairTapGesture.handlers.onEnd({ x: 150, y: 100 }, true);
    expect(crosshair.visible.value).toBe(false);

    crosshair.visible.value = true;
    crosshairTapGesture.handlers.onEnd({ x: 150, y: 100 }, true);
    expect(crosshair.visible.value).toBe(true);
  });

  it('leaves reset and overlay zones to their owners on long press', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const controlZones = [{ x1: 70, x2: 130, y1: 70, y2: 120 }];
    const crosshairLongPressGesture = createNativeCrosshairLongPressGesture({
      controlZones,
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    crosshairLongPressGesture.handlers.onStart({ x: 150, y: 100 });
    expect(crosshair.visible.value).toBe(false);

    crosshairLongPressGesture.handlers.onStart({ x: 90, y: 90 });
    expect(crosshair.visible.value).toBe(false);
  });

  it('opens the context menu from the crosshair plus button without toggling crosshair', () => {
    const crosshair = createCrosshair(true);
    crosshair.x.value = (frame.contentLeft + frame.contentRight) / 2;
    crosshair.y.value = 80;
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const onContextMenuTap = vi.fn();
    const priceLabelText = resolveNativeCrosshairPriceLabelText(frame, viewport, crosshair.y.value, 2);
    const layout = resolveNativeCrosshairContextMenuButtonLayout(frame, crosshair.y.value, 2, priceLabelText);
    const crosshairTapGesture = createNativeCrosshairTapGesture({
      crosshair,
      frame,
      hasContextMenu: true,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const contextMenuTapGesture = createNativeCrosshairContextMenuTapGesture({
      crosshair,
      frame,
      hasContextMenu: true,
      onContextMenuTap,
      sharedViewport: viewport,
    }) as any;

    crosshairTapGesture.handlers.onEnd({ x: layout.centerX, y: layout.centerY }, true);
    expect(crosshair.visible.value).toBe(true);

    contextMenuTapGesture.handlers.onEnd({ x: layout.centerX, y: layout.centerY }, true);
    expect(onContextMenuTap).toHaveBeenCalledWith(1_500, expect.any(Number), layout.centerX, layout.centerY);
    expect(crosshair.visible.value).toBe(true);
  });

  it('does not start crosshair interactions over trade controls or with multiple touches', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([{ objectType: 'order' as const, objectId: 'order-1', price: 63_000 }]);
    const tradeLineActionZones = shared([
      {
        objectType: 'order' as const,
        objectId: 'order-1',
        actionType: 'cancel' as const,
        price: 63_000,
        partialEnabled: false,
        color: '#00a8d8',
        x1: 70,
        x2: 100,
      },
    ]);
    const orderDragZones = shared([{ objectId: 'order-1', price: 63_000, x1: 110, x2: 140 }]);
    const crosshairTapGesture = createNativeCrosshairTapGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const crosshairPanGesture = createNativeCrosshairPanGesture({
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    crosshairTapGesture.handlers.onEnd({ x: 80, y: 88 }, true);
    expect(crosshair.visible.value).toBe(false);

    crosshair.visible.value = true;
    const actionZone = mockStateManager();
    crosshairPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 80, y: 88 }], allTouches: [{ x: 80, y: 88 }] },
      actionZone,
    );
    expect(actionZone.failed).toBe(true);

    const orderZone = mockStateManager();
    crosshairPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 120, y: 88 }], allTouches: [{ x: 120, y: 88 }] },
      orderZone,
    );
    expect(orderZone.failed).toBe(true);

    const multiTouch = mockStateManager();
    crosshairPanGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 80, y: 88 }],
        allTouches: [
          { x: 80, y: 88 },
          { x: 120, y: 90 },
        ],
      },
      multiTouch,
    );
    expect(multiTouch.failed).toBe(true);
  });

  it('leaves overlay control zones to native Pressables instead of crosshair gestures', () => {
    const crosshair = createCrosshair();
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const controlZones = [{ x1: 70, x2: 130, y1: 70, y2: 120 }];
    const crosshairTapGesture = createNativeCrosshairTapGesture({
      controlZones,
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const crosshairPanGesture = createNativeCrosshairPanGesture({
      controlZones,
      crosshair,
      frame,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    crosshairTapGesture.handlers.onEnd({ x: 90, y: 90 }, true);
    expect(crosshair.visible.value).toBe(false);

    crosshair.visible.value = true;
    const blocked = mockStateManager();
    crosshairPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 90, y: 90 }], allTouches: [{ x: 90, y: 90 }] },
      blocked,
    );
    expect(blocked.failed).toBe(true);
  });

  it('keeps chart pan enabled while crosshair is hidden and blocks it while crosshair is visible', () => {
    const panActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const crosshair = createCrosshair(false);
    const chartPanGesture = createNativeChartPanGesture({
      beginNativeViewportInteraction: () => {},
      cancelNativeViewportInteraction: () => {},
      chartPanGestureState: {
        active: panActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeTimePerPixel: shared(0),
        activePricePerPixel: shared(0),
      },
      commitPanViewport: () => {},
      crosshair,
      frame,
      orderDragZones,
      panActive,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    const hiddenCrosshair = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 80, y: 60 }], allTouches: [{ x: 80, y: 60 }] },
      hiddenCrosshair,
    );
    expect(hiddenCrosshair.failed).toBe(false);

    crosshair.visible.value = true;
    const visibleCrosshair = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 80, y: 60 }], allTouches: [{ x: 80, y: 60 }] },
      visibleCrosshair,
    );
    expect(visibleCrosshair.failed).toBe(true);
  });

  it('leaves overlay control zones to native Pressables instead of chart pan', () => {
    const panActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const chartPanGesture = createNativeChartPanGesture({
      beginNativeViewportInteraction: () => {},
      cancelNativeViewportInteraction: () => {},
      chartPanGestureState: {
        active: panActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeTimePerPixel: shared(0),
        activePricePerPixel: shared(0),
      },
      commitPanViewport: () => {},
      controlZones: [{ x1: 70, x2: 130, y1: 70, y2: 120 }],
      frame,
      orderDragZones,
      panActive,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    const blocked = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 90, y: 90 }], allTouches: [{ x: 90, y: 90 }] },
      blocked,
    );
    expect(blocked.failed).toBe(true);
  });

  it('keeps reset reveal taps strict but makes the visible button forgiving', () => {
    const visibleReset = vi.fn();
    const layout = resolveNativeResetViewButtonLayout(frame);
    const hiddenResetTapGesture = createNativeResetViewTapGesture({
      frame,
      onResetViewTap: () => {},
      resetTapGestureState: resetTapState(),
      resetButtonVisible: false,
    }) as any;
    const visibleResetTapGesture = createNativeResetViewTapGesture({
      frame,
      onResetViewTap: visibleReset,
      resetTapGestureState: resetTapState(),
      resetButtonVisible: true,
    }) as any;

    expect(hiddenResetTapGesture.config.maxDistance).toBe(NATIVE_RESET_VIEW_TAP_MOVE_TOLERANCE);
    expect(visibleResetTapGesture.config.maxDistance).toBe(NATIVE_RESET_VIEW_HIT_SIZE / 2);

    visibleResetTapGesture.handlers.onTouchesDown({
      changedTouches: [{ x: layout.centerX, y: layout.centerY }],
      allTouches: [{ x: layout.centerX, y: layout.centerY }],
    });
    visibleResetTapGesture.handlers.onEnd({ x: layout.centerX + 12, y: layout.centerY }, true);
    expect(visibleReset).toHaveBeenCalledTimes(1);

    visibleResetTapGesture.handlers.onTouchesDown({
      changedTouches: [{ x: layout.centerX - layout.hitRadius - 5, y: layout.centerY }],
      allTouches: [{ x: layout.centerX - layout.hitRadius - 5, y: layout.centerY }],
    });
    visibleResetTapGesture.handlers.onEnd({ x: layout.centerX, y: layout.centerY }, true);
    expect(visibleReset).toHaveBeenCalledTimes(1);

    visibleResetTapGesture.handlers.onTouchesDown({
      changedTouches: [{ x: layout.centerX, y: layout.centerY }],
      allTouches: [{ x: layout.centerX, y: layout.centerY }],
    });
    visibleResetTapGesture.handlers.onEnd({ x: layout.centerX + layout.hitRadius + 1, y: layout.centerY }, true);
    expect(visibleReset).toHaveBeenCalledTimes(1);
  });

  it('does not route crosshair context-menu button taps to reset gestures', () => {
    const crosshair = createCrosshair(true);
    crosshair.y.value = resolveNativeResetViewButtonLayout(frame).centerY;
    const layout = resolveNativeCrosshairContextMenuButtonLayout(frame, crosshair.y.value);
    const onResetViewTap = vi.fn();
    const resetTapGesture = createNativeResetViewTapGesture({
      crosshair,
      frame,
      hasContextMenu: true,
      onResetViewTap,
      resetTapGestureState: resetTapState(),
      resetButtonVisible: true,
    }) as any;

    resetTapGesture.handlers.onTouchesDown({
      changedTouches: [{ x: layout.centerX, y: layout.centerY }],
      allTouches: [{ x: layout.centerX, y: layout.centerY }],
    });
    resetTapGesture.handlers.onEnd({ x: layout.centerX, y: layout.centerY }, true);

    expect(onResetViewTap).not.toHaveBeenCalled();
  });

  it('commits left tool rail toggle taps through the chart gesture layer', () => {
    const expandedLayout = createNativeLeftToolRailLayout({ height: 520, bottomInset: 32, topBarHeight: 36 });
    const collapsedLayout = createNativeLeftToolRailLayout({
      height: 520,
      bottomInset: 32,
      collapsed: true,
      topBarHeight: 36,
    });
    expect(expandedLayout).not.toBeNull();
    expect(collapsedLayout).not.toBeNull();
    const expandedRect = resolveNativeLeftToolRailToggleHitRect(expandedLayout!);
    const collapsedRect = resolveNativeLeftToolRailToggleHitRect(collapsedLayout!);
    const onToggle = vi.fn();
    const expandedGesture = createNativeLeftToolRailToggleTapGesture({
      leftToolRailLayout: expandedLayout,
      onToggleCollapsed: onToggle,
    }) as any;
    const collapsedGesture = createNativeLeftToolRailToggleTapGesture({
      leftToolRailLayout: collapsedLayout,
      onToggleCollapsed: onToggle,
    }) as any;

    expandedGesture.handlers.onEnd({ x: expandedRect!.x + 1, y: expandedRect!.y + 1 }, true);
    collapsedGesture.handlers.onEnd({ x: Math.max(0, collapsedRect!.x) + 1, y: collapsedRect!.y + 1 }, true);
    expandedGesture.handlers.onEnd({ x: collapsedRect!.x + 1, y: expandedRect!.y + 1 }, true);

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('blocks drawing taps over overlay control zones', () => {
    const onDrawingTap = vi.fn();
    const drawingTapGesture = createNativeUserDrawingTapGesture({
      controlZones: [{ x1: 0, x2: 40, y1: 40, y2: 140 }],
      enabled: true,
      frame,
      onDrawingTap,
    }) as any;

    drawingTapGesture.handlers.onEnd({ x: 20, y: 80 }, true);
    drawingTapGesture.handlers.onEnd({ x: 80, y: 80 }, true);

    expect(onDrawingTap).toHaveBeenCalledTimes(1);
    expect(onDrawingTap).toHaveBeenCalledWith(80, 80);
  });

  it('filters viewport gesture ownership at touch-down but begins after pan recognition', () => {
    const panActive = shared(false);
    const priceScaleActive = shared(false);
    const timeScaleActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const chartPanGesture = createNativeChartPanGesture({
      beginNativeViewportInteraction: () => {},
      cancelNativeViewportInteraction: () => {},
      chartPanGestureState: {
        active: panActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeTimePerPixel: shared(0),
        activePricePerPixel: shared(0),
      },
      commitPanViewport: () => {},
      frame,
      orderDragZones,
      panActive,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const priceScaleGesture = createNativePriceScaleGesture({
      beginNativeViewportInteraction: () => {},
      cancelNativeViewportInteraction: () => {},
      commitPanViewport: () => {},
      frame,
      priceScaleActive,
      priceScaleGestureState: {
        active: priceScaleActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        priceAutoScale: priceAutoScale(),
        activeAnchorPrice: shared(0),
      },
      sharedViewport: viewport,
    }) as any;
    const timeScaleGesture = createNativeTimeScaleGesture({
      beginNativeViewportInteraction: () => {},
      cancelNativeViewportInteraction: () => {},
      commitPanViewport: () => {},
      frame,
      sharedViewport: viewport,
      timeScaleActive,
      timeScaleGestureState: {
        active: timeScaleActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeAnchorTime: shared(0),
      },
    }) as any;

    for (const gesture of [chartPanGesture, priceScaleGesture, timeScaleGesture]) {
      expect(gesture.config.manualActivation).toBeUndefined();
      expect(gesture.config.minDistance).toBe(2);
      expect(typeof gesture.handlers.onTouchesDown).toBe('function');
      expect(typeof gesture.handlers.onBegin).toBe('function');
    }

    const rejected = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 10, y: 60 }], allTouches: [{ x: 10, y: 60 }] },
      rejected,
    );
    expect(rejected.failed).toBe(true);

    const accepted = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 80, y: 60 }], allTouches: [{ x: 80, y: 60 }] },
      accepted,
    );
    expect(accepted.failed).toBe(false);
    expect(panActive.value).toBe(false);

    const secondTouch = mockStateManager();
    chartPanGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 10, y: 10 }],
        allTouches: [
          { x: 80, y: 60 },
          { x: 10, y: 10 },
        ],
      },
      secondTouch,
    );
    expect(secondTouch.failed).toBe(true);

    chartPanGesture.handlers.onBegin({ x: 80, y: 60 });
    expect(panActive.value).toBe(true);
    chartPanGesture.handlers.onUpdate({ translationX: 0, translationY: 10 });
    expect(readViewport(viewport)).toEqual({
      ...viewportValue,
      priceMin:
        viewportValue.priceMin + 10 * ((viewportValue.priceMax - viewportValue.priceMin) / frame.mainPane.height),
      priceMax:
        viewportValue.priceMax + 10 * ((viewportValue.priceMax - viewportValue.priceMin) / frame.mainPane.height),
    });
  });

  it('updates chart viewport from independent two-finger axis components', () => {
    const panActive = shared(false);
    const pinchActive = shared(false);
    const priceScaleActive = shared(false);
    const timeScaleActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const commitPanViewport = vi.fn();
    const beginNativeViewportInteraction = vi.fn();
    const chartAxisPinchGesture = createNativeChartAxisPinchGesture({
      beginNativeViewportInteraction,
      bracketDragActive: shared(false),
      bracketDragInteractionState: createBracketDragState(),
      cancelNativeViewportInteraction: () => {},
      chartAxisPinchGestureState: {
        active: pinchActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeAnchorTime: shared(0),
        activeAnchorPrice: shared(0),
        activeStartSpanX: shared(0),
        activeStartSpanY: shared(0),
      },
      commitPanViewport,
      frame,
      orderDragState: createOrderDragState(),
      orderDragZones,
      panActive,
      pinchActive,
      priceScaleActive,
      sharedViewport: viewport,
      timeScaleActive,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    const initialTouch = mockStateManager();
    chartAxisPinchGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 60, y: 60 }], allTouches: [{ x: 60, y: 60 }] },
      initialTouch,
    );
    expect(initialTouch.activated).toBe(false);
    expect(pinchActive.value).toBe(false);

    const twoTouch = mockStateManager();
    chartAxisPinchGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 120, y: 100 }],
        allTouches: [
          { x: 60, y: 60 },
          { x: 120, y: 100 },
        ],
      },
      twoTouch,
    );
    expect(twoTouch.activated).toBe(true);
    expect(beginNativeViewportInteraction).toHaveBeenCalledTimes(1);
    expect(pinchActive.value).toBe(true);

    chartAxisPinchGesture.handlers.onTouchesMove({
      changedTouches: [{ x: 150, y: 90 }],
      allTouches: [
        { x: 30, y: 70 },
        { x: 150, y: 90 },
      ],
    });
    expect(readViewport(viewport).startTime).toBeCloseTo(1_175);
    expect(readViewport(viewport).endTime).toBeCloseTo(1_675);
    expect(readViewport(viewport).priceMin).toBeCloseTo(60_846.153846);
    expect(readViewport(viewport).priceMax).toBeCloseTo(64_846.153846);

    chartAxisPinchGesture.handlers.onTouchesUp(
      {
        numberOfTouches: 1,
        changedTouches: [{ x: 150, y: 90 }],
        allTouches: [{ x: 30, y: 70 }],
      },
      twoTouch,
    );
    expect(twoTouch.ended).toBe(true);
    expect(commitPanViewport).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        priceMin: expect.any(Number),
        priceMax: expect.any(Number),
      }),
    );
  });

  it('transitions an active chart pan into axis pinch when a second finger joins', () => {
    const panActive = shared(false);
    const pinchActive = shared(false);
    const priceScaleActive = shared(false);
    const timeScaleActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const panStartViewport = sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 });
    const tradeLineRows = shared([]);
    const tradeLineActionZones = shared([]);
    const orderDragZones = shared([]);
    const beginNativeViewportInteraction = vi.fn();
    const chartPanGesture = createNativeChartPanGesture({
      beginNativeViewportInteraction,
      cancelNativeViewportInteraction: () => {},
      chartPanGestureState: {
        active: panActive,
        sharedViewport: viewport,
        startViewport: panStartViewport,
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeTimePerPixel: shared(0),
        activePricePerPixel: shared(0),
      },
      commitPanViewport: () => {},
      frame,
      orderDragZones,
      panActive,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;
    const chartAxisPinchGesture = createNativeChartAxisPinchGesture({
      beginNativeViewportInteraction,
      bracketDragActive: shared(false),
      bracketDragInteractionState: createBracketDragState(),
      cancelNativeViewportInteraction: () => {},
      chartAxisPinchGestureState: {
        active: pinchActive,
        sharedViewport: viewport,
        startViewport: panStartViewport,
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeAnchorTime: shared(0),
        activeAnchorPrice: shared(0),
        activeStartSpanX: shared(0),
        activeStartSpanY: shared(0),
      },
      commitPanViewport: () => {},
      frame,
      orderDragState: createOrderDragState(),
      orderDragZones,
      panActive,
      pinchActive,
      priceScaleActive,
      sharedViewport: viewport,
      timeScaleActive,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    chartPanGesture.handlers.onBegin({ x: 80, y: 60 });
    chartPanGesture.handlers.onUpdate({ translationX: 10, translationY: 10 });
    const panViewport = readViewport(viewport);

    const secondTouch = mockStateManager();
    chartAxisPinchGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 120, y: 100 }],
        allTouches: [
          { x: 60, y: 60 },
          { x: 120, y: 100 },
        ],
      },
      secondTouch,
    );
    expect(secondTouch.activated).toBe(true);
    expect(panActive.value).toBe(false);
    expect(pinchActive.value).toBe(true);
    expect(readViewport(panStartViewport)).toEqual(panViewport);
    expect(beginNativeViewportInteraction).toHaveBeenCalledTimes(1);

    chartPanGesture.handlers.onFinalize({}, false);
    expect(readViewport(viewport)).toEqual(panViewport);
  });

  it('does not start axis pinch while trade-line drags are active', () => {
    const panActive = shared(false);
    const pinchActive = shared(false);
    const priceScaleActive = shared(false);
    const timeScaleActive = shared(false);
    const viewport = sharedViewport(viewportValue);
    const bracketDragActive = shared(true);
    const chartAxisPinchGesture = createNativeChartAxisPinchGesture({
      beginNativeViewportInteraction: () => {},
      bracketDragActive,
      bracketDragInteractionState: createBracketDragState(),
      cancelNativeViewportInteraction: () => {},
      chartAxisPinchGestureState: {
        active: pinchActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeAnchorTime: shared(0),
        activeAnchorPrice: shared(0),
        activeStartSpanX: shared(0),
        activeStartSpanY: shared(0),
      },
      commitPanViewport: () => {},
      frame,
      orderDragState: createOrderDragState(),
      orderDragZones: shared([]),
      panActive,
      pinchActive,
      priceScaleActive,
      sharedViewport: viewport,
      timeScaleActive,
      tradeLabelHeight: 18,
      tradeLineActionZones: shared([]),
      tradeLineRows: shared([]),
    }) as any;

    const bracketBlocked = mockStateManager();
    chartAxisPinchGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 120, y: 100 }],
        allTouches: [
          { x: 60, y: 60 },
          { x: 120, y: 100 },
        ],
      },
      bracketBlocked,
    );
    expect(bracketBlocked.failed).toBe(true);
    expect(pinchActive.value).toBe(false);

    bracketDragActive.value = false;
    const orderDragState = createOrderDragState(true);
    const orderBlockedGesture = createNativeChartAxisPinchGesture({
      beginNativeViewportInteraction: () => {},
      bracketDragActive,
      bracketDragInteractionState: createBracketDragState(),
      cancelNativeViewportInteraction: () => {},
      chartAxisPinchGestureState: {
        active: pinchActive,
        sharedViewport: viewport,
        startViewport: sharedViewport({ startTime: 0, endTime: 1, priceMin: 0, priceMax: 1 }),
        metrics: gestureMetrics(),
        priceAutoScale: priceAutoScale(),
        activeAnchorTime: shared(0),
        activeAnchorPrice: shared(0),
        activeStartSpanX: shared(0),
        activeStartSpanY: shared(0),
      },
      commitPanViewport: () => {},
      frame,
      orderDragState,
      orderDragZones: shared([]),
      panActive,
      pinchActive,
      priceScaleActive,
      sharedViewport: viewport,
      timeScaleActive,
      tradeLabelHeight: 18,
      tradeLineActionZones: shared([]),
      tradeLineRows: shared([]),
    }) as any;
    const orderBlocked = mockStateManager();
    orderBlockedGesture.handlers.onTouchesDown(
      {
        changedTouches: [{ x: 120, y: 100 }],
        allTouches: [
          { x: 60, y: 60 },
          { x: 120, y: 100 },
        ],
      },
      orderBlocked,
    );
    expect(orderBlocked.failed).toBe(true);
    expect(pinchActive.value).toBe(false);
  });

  it('does not commit an order move from touch-down without pan begin', () => {
    const viewport = sharedViewport(viewportValue);
    const centerY = 88;
    const price =
      viewportValue.priceMax -
      ((centerY - frame.mainPane.top) / frame.mainPane.height) * (viewportValue.priceMax - viewportValue.priceMin);
    const tradeLineRows = shared([{ objectType: 'order' as const, objectId: 'order-1', price }]);
    const orderDragZones = shared([{ objectId: 'order-1', price, x1: 40, x2: 120 }]);
    const tradeLineActionZones = shared([]);
    const commitOrderMove = vi.fn();
    const orderDragState = createOrderDragState();
    const orderDragGesture = createNativeOrderDragGesture({
      commitOrderMove,
      frame,
      orderDragState,
      orderDragZones,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    const accepted = mockStateManager();
    orderDragGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 80, y: centerY }], allTouches: [{ x: 80, y: centerY }] },
      accepted,
    );
    expect(accepted.failed).toBe(false);

    orderDragGesture.handlers.onEnd({ translationX: 0, translationY: 0 });
    expect(commitOrderMove).not.toHaveBeenCalled();

    orderDragGesture.handlers.onBegin({ x: 80, y: centerY });
    orderDragGesture.handlers.onUpdate({ translationY: 3 });
    orderDragGesture.handlers.onEnd({ translationX: 0, translationY: 3 });
    expect(commitOrderMove).not.toHaveBeenCalled();
    expect(orderDragState.active.value).toBe(false);
    expect(orderDragState.activeObjectId.value).toBe('');

    orderDragGesture.handlers.onBegin({ x: 80, y: centerY });
    orderDragGesture.handlers.onUpdate({ translationY: 8 });
    orderDragGesture.handlers.onEnd({ translationX: 0, translationY: 8 });
    expect(commitOrderMove).toHaveBeenCalledWith('order-1', expect.any(Number));
  });

  it('does not clear bracket drag state from a TP or SL tap without pan begin', () => {
    const viewport = sharedViewport(viewportValue);
    const centerY = 88;
    const price =
      viewportValue.priceMax -
      ((centerY - frame.mainPane.top) / frame.mainPane.height) * (viewportValue.priceMax - viewportValue.priceMin);
    const tradeLineRows = shared([{ objectType: 'position' as const, objectId: 'position-1', price }]);
    const tradeLineActionZones = shared([
      {
        objectType: 'position' as const,
        objectId: 'position-1',
        actionType: 'tp' as const,
        price,
        dragPrice: price + 10,
        partialEnabled: false,
        color: '#00bcd4',
        x1: 130,
        x2: 156,
      },
    ]);
    const clearNativeBracketDrag = vi.fn();
    const commitBracketMove = vi.fn();
    const bracketDragInteractionState = createBracketDragState();
    const bracketDragGesture = createNativeBracketDragGesture({
      bracketDragInteractionState,
      clearNativeBracketDrag,
      commitBracketMove,
      frame,
      sharedViewport: viewport,
      tradeLabelHeight: 18,
      tradeLineActionZones,
      tradeLineRows,
    }) as any;

    const accepted = mockStateManager();
    bracketDragGesture.handlers.onTouchesDown(
      { changedTouches: [{ x: 140, y: centerY }], allTouches: [{ x: 140, y: centerY }] },
      accepted,
    );
    expect(accepted.failed).toBe(false);

    bracketDragGesture.handlers.onEnd({ translationX: 0, translationY: 0 });
    expect(clearNativeBracketDrag).not.toHaveBeenCalled();
    expect(commitBracketMove).not.toHaveBeenCalled();

    bracketDragGesture.handlers.onBegin({ x: 140, y: centerY });
    bracketDragGesture.handlers.onUpdate({ translationX: 3, translationY: 3 });
    bracketDragGesture.handlers.onEnd({ translationX: 3, translationY: 3 });
    expect(clearNativeBracketDrag).not.toHaveBeenCalled();
    expect(commitBracketMove).not.toHaveBeenCalled();
    expect(bracketDragInteractionState.active.value).toBe(false);
    expect(bracketDragInteractionState.activeObjectId.value).toBe('');

    bracketDragGesture.handlers.onBegin({ x: 140, y: centerY });
    bracketDragGesture.handlers.onUpdate({ translationX: 0, translationY: -8 });
    bracketDragGesture.handlers.onEnd({ translationX: 0, translationY: -8 });
    expect(clearNativeBracketDrag).not.toHaveBeenCalled();
    expect(commitBracketMove).toHaveBeenCalledWith('position', 'position-1', 'tp', expect.any(Number), undefined);
  });
});
