import { describe, expect, it } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import type {
  NativeBracketDragSharedValues,
  NativeOrderDragSharedValues,
} from './nativeOemsDragState';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import {
  canBeginNativeChartPan,
  findNativeBracketDragZone,
  findNativeBracketDragZoneIndex,
  findNativeOrderDragZone,
  findNativeOrderDragZoneIndex,
  findNativeTradeLineActionZone,
  findNativeTradeLineActionZoneIndex,
  findNativeTradeLineRow,
  isNativePriceAxisTagSourceSuppressedByBracketDrag,
  resolveNativePriceAxisTagCenters,
} from './nativeTradeLineHitTest';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 160,
    height: 120,
    margins: {
      top: 0,
      right: 40,
      bottom: 20,
      left: 0,
    },
  },
  panes: [
    {
      id: 'main',
      type: 'main',
      top: 0,
      height: 100,
      yMin: 0,
      yMax: 100,
    },
  ],
});

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

const sharedViewport: NativeViewportSharedValues = {
  startTime: shared(0),
  endTime: shared(1),
  priceMin: shared(0),
  priceMax: shared(100),
};

function orderDragState(objectId = '', price = 0): NativeOrderDragSharedValues {
  return {
    activeObjectId: shared(objectId),
    activePrice: shared(price),
    activeLabelText: shared(''),
    activePriceLabelText: shared(''),
  };
}

function bracketDragState(objectId = '', price = 0): NativeBracketDragSharedValues {
  return {
    activeObjectId: shared(objectId),
    activeObjectType: shared(objectId ? 'order' : ''),
    activeBracketType: shared('tp'),
    activePrice: shared(price),
    activeEntryPrice: shared(price),
    activeDragStartX: shared(0),
    activeDragCurrentX: shared(0),
    activeDragStartY: shared(0),
    activeDragCurrentY: shared(0),
    activePositionNotional: shared(0),
    activePositionIsLong: shared(true),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared('#00a8d8'),
  };
}

describe('native trade-line hit testing', () => {
  it('finds the topmost matching order drag zone using live label y positions', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'order', objectId: 'older', price: 50 },
      { objectType: 'order', objectId: 'newer', price: 50 },
    ];
    const zones: NativeOrderDragZone[] = [
      { objectId: 'older', price: 50, x1: 10, x2: 80 },
      { objectId: 'newer', price: 50, x1: 10, x2: 80 },
    ];

    expect(
      findNativeOrderDragZoneIndex({
        zones,
        rows,
        x: 30,
        y: 60,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(1);
    expect(
      findNativeOrderDragZone({
        zones,
        rows,
        x: 30,
        y: 60,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      })?.objectId,
    ).toBe('newer');
    expect(
      findNativeOrderDragZone({
        zones,
        rows,
        x: 90,
        y: 60,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBeNull();
  });

  it('distinguishes action zones from bracket drag zones', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'position', objectId: 'position-1', price: 50 },
    ];
    const zones: NativeTradeLineActionZone[] = [
      {
        objectType: 'position',
        objectId: 'position-1',
        actionType: 'close',
        price: 50,
        entryPrice: 50,
        partialEnabled: false,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00a8d8',
        lineColor: '#00a8d8',
        x1: 10,
        x2: 30,
      },
      {
        objectType: 'position',
        objectId: 'position-1',
        actionType: 'tp',
        price: 50,
        entryPrice: 50,
        partialEnabled: true,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00c878',
        lineColor: '#00c878',
        x1: 40,
        x2: 70,
      },
    ];

    expect(
      findNativeTradeLineActionZoneIndex({
        zones,
        rows,
        x: 20,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(0);
    expect(
      findNativeBracketDragZoneIndex({
        zones,
        rows,
        x: 20,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(-1);
    expect(
      findNativeBracketDragZoneIndex({
        zones,
        rows,
        x: 50,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(1);
    expect(
      findNativeTradeLineActionZone({
        zones,
        rows,
        x: 20,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      })?.actionType,
    ).toBe('close');
    expect(
      findNativeBracketDragZone({
        zones,
        rows,
        x: 50,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      })?.actionType,
    ).toBe('tp');
    expect(
      findNativeTradeLineActionZone({
        zones,
        rows,
        x: 90,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBeNull();
    expect(
      findNativeBracketDragZone({
        zones,
        rows,
        x: 20,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBeNull();
  });

  it('blocks chart panning over OEMS labels and outside the plot', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'order', objectId: 'order-1', price: 50 },
    ];
    const orderZones: NativeOrderDragZone[] = [
      { objectId: 'order-1', price: 50, x1: 10, x2: 80 },
    ];
    const actionZones: NativeTradeLineActionZone[] = [
      {
        objectType: 'order',
        objectId: 'order-1',
        actionType: 'cancel',
        price: 50,
        entryPrice: 50,
        partialEnabled: false,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00a8d8',
        lineColor: '#00a8d8',
        x1: 82,
        x2: 102,
      },
    ];

    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 40,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(false);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 90,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(false);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 150,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(false);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 110,
        y: 20,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(true);
  });

  it('hits trade-line rows across the visible line span when label bounds are absent', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'order', objectId: 'order-1', price: 50 },
    ];

    expect(
      findNativeTradeLineRow({
        rows,
        x: 80,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toEqual({ objectType: 'order', objectId: 'order-1', price: 50 });
    expect(
      canBeginNativeChartPan({
        actionZones: [],
        orderDragZones: [],
        rows,
        x: 80,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(false);
  });

  it('keeps OEMS hit zones on true chart-space trade-line centers', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'order', objectId: 'order-1', price: 50 },
    ];
    const orderZones: NativeOrderDragZone[] = [
      { objectId: 'order-1', price: 50, x1: 10, x2: 80 },
    ];
    const actionZones: NativeTradeLineActionZone[] = [
      {
        objectType: 'order',
        objectId: 'order-1',
        actionType: 'cancel',
        price: 50,
        entryPrice: 50,
        partialEnabled: false,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00a8d8',
        lineColor: '#00a8d8',
        x1: 82,
        x2: 102,
      },
    ];

    expect(
      findNativeOrderDragZoneIndex({
        zones: orderZones,
        rows,
        x: 40,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(0);
    expect(
      findNativeOrderDragZoneIndex({
        zones: orderZones,
        rows,
        x: 40,
        y: 85,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(-1);
    expect(
      findNativeTradeLineActionZoneIndex({
        zones: actionZones,
        rows,
        x: 90,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(0);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 40,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(false);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 40,
        y: 85,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(true);
  });

  // A dragged tag leaves the stack: in it, neighbours displaced it while it
  // shoved them back, and the whole axis re-resolved every frame of the drag.
  it('drops the dragged order from the tag stack and leaves the rest resolved', () => {
    const sources: NativePriceAxisTagSource[] = [
      {
        sourceType: 'order',
        tagId: 'order:order-1',
        objectId: 'order-1',
        price: 25,
        height: 18,
        priority: 90,
      },
      {
        sourceType: 'order',
        tagId: 'order:order-2',
        objectId: 'order-2',
        price: 25,
        height: 18,
        priority: 90,
      },
    ];
    const resolveWith = (dragged?: string) =>
      resolveNativePriceAxisTagCenters({
        priceAxisTagSources: sources,
        sharedViewport,
        frame,
        orderDragState: dragged ? orderDragState(dragged, 80) : orderDragState(),
        bracketDragState: bracketDragState(),
        priceAxisTagHeight: 22,
      });

    expect(resolveWith().map((tag) => tag.id).sort()).toEqual(['order:order-1', 'order:order-2']);
    expect(resolveWith('order-1').map((tag) => tag.id)).toEqual(['order:order-2']);
  });

  it('never adds a bracket drag source to the stack', () => {
    const resolved = resolveNativePriceAxisTagCenters({
      priceAxisTagSources: [],
      sharedViewport,
      frame,
      orderDragState: orderDragState(),
      bracketDragState: bracketDragState('order-1', 40),
      priceAxisTagHeight: 22,
    });

    expect(resolved).toEqual([]);
  });

  it('suppresses the stale static bracket tag source while the matching bracket drag preview is active', () => {
    const source: NativePriceAxisTagSource = {
      sourceType: 'priceLine',
      tagId: 'priceLine:order-1-tp',
      objectId: 'order-1-tp',
      price: 25,
      height: 22,
      priority: 70,
      bracketRef: {
        objectType: 'order',
        objectId: 'order-1',
        bracketType: 'tp',
      },
    };
    const activeBracketDragState = bracketDragState('order-1', 40);

    expect(isNativePriceAxisTagSourceSuppressedByBracketDrag(source, bracketDragState())).toBe(false);
    expect(isNativePriceAxisTagSourceSuppressedByBracketDrag(source, activeBracketDragState)).toBe(true);
    expect(
      resolveNativePriceAxisTagCenters({
        priceAxisTagSources: [source],
        sharedViewport,
        frame,
        orderDragState: orderDragState(),
        bracketDragState: activeBracketDragState,
        priceAxisTagHeight: 22,
      }),
      // The drag preview draws its own tag, pinned to the price, so nothing is
      // left in the stack for this bracket while the drag is live.
    ).toEqual([]);
  });

  it('clamps explicit offscreen price-line axis tags without stacking ordinary offscreen sources', () => {
    const sources: NativePriceAxisTagSource[] = [
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:last',
        objectId: 'last',
        price: 200,
        height: 22,
        priority: 100,
        clampToPane: true,
      },
      {
        sourceType: 'priceLine',
        tagId: 'priceLine:canvas-only',
        objectId: 'canvas-only',
        price: -100,
        height: 22,
        priority: 10,
      },
    ];

    const resolved = resolveNativePriceAxisTagCenters({
      priceAxisTagSources: sources,
      sharedViewport,
      frame,
      orderDragState: orderDragState(),
      bracketDragState: bracketDragState(),
      priceAxisTagHeight: 22,
    });

    expect(resolved).toEqual([
      expect.objectContaining({
        id: 'priceLine:last',
        centerY: frame.mainPane.top + 11,
      }),
    ]);
  });

  it('does not hit or stack offscreen trade lines', () => {
    const rows: NativeTradeLineRow[] = [
      { objectType: 'order', objectId: 'offscreen-order', price: 200 },
      { objectType: 'position', objectId: 'offscreen-position', price: 200 },
    ];
    const orderZones: NativeOrderDragZone[] = [
      { objectId: 'offscreen-order', price: 200, x1: 10, x2: 80 },
    ];
    const actionZones: NativeTradeLineActionZone[] = [
      {
        objectType: 'order',
        objectId: 'offscreen-order',
        actionType: 'cancel',
        price: 200,
        entryPrice: 200,
        partialEnabled: false,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00a8d8',
        lineColor: '#00a8d8',
        x1: 82,
        x2: 102,
      },
      {
        objectType: 'position',
        objectId: 'offscreen-position',
        actionType: 'tp',
        price: 200,
        entryPrice: 200,
        partialEnabled: true,
        positionNotional: 0,
        positionIsLong: true,
        color: '#00c878',
        lineColor: '#00c878',
        x1: 40,
        x2: 70,
      },
    ];
    const sources: NativePriceAxisTagSource[] = [
      {
        sourceType: 'order',
        tagId: 'order:offscreen-order',
        objectId: 'offscreen-order',
        price: 200,
        height: 18,
        priority: 90,
      },
      {
        sourceType: 'position',
        tagId: 'position:offscreen-position',
        objectId: 'offscreen-position',
        price: 200,
        height: 18,
        priority: 90,
      },
    ];

    expect(
      findNativeOrderDragZoneIndex({
        zones: orderZones,
        rows,
        x: 40,
        y: 50,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(-1);
    expect(
      findNativeTradeLineActionZoneIndex({
        zones: actionZones,
        rows,
        x: 90,
        y: 9,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(-1);
    expect(
      findNativeBracketDragZoneIndex({
        zones: actionZones,
        rows,
        x: 50,
        y: 9,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(-1);
    expect(
      canBeginNativeChartPan({
        actionZones,
        orderDragZones: orderZones,
        rows,
        x: 40,
        y: 9,
        sharedViewport,
        frame,
        tradeLabelHeight: 18,
      }),
    ).toBe(true);
    expect(
      resolveNativePriceAxisTagCenters({
        priceAxisTagSources: sources,
        sharedViewport,
        frame,
        orderDragState: orderDragState(),
        bracketDragState: bracketDragState('offscreen-order', 200),
        priceAxisTagHeight: 22,
      }),
    ).toEqual([]);
  });
});
