import { describe, expect, it } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import { getNativePriceAxisTagFloor } from '../render/nativeSharedViewport';
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

  // Native resolved indicator readouts in a second stack that never saw this
  // one, so a Bollinger tag and an order tag at the same price simply overlapped.
  // Web has shared the pass since 0f25f98a.
  describe('main-pane indicator readouts', () => {
    const outputSource = (id: string, price: number) => ({
      sourceType: 'indicatorOutput' as const,
      tagId: id,
      objectId: id,
      price,
      height: 11,
    });
    const lastTradeSource = (price: number) => ({
      sourceType: 'priceLine' as const,
      tagId: 'priceLine:last-trade',
      objectId: 'last-trade',
      price,
      height: 18,
      fixed: true,
    });
    const resolve = (sources: NativePriceAxisTagSource[]) =>
      resolveNativePriceAxisTagCenters({
        priceAxisTagSources: sources,
        sharedViewport,
        frame,
        orderDragState: orderDragState(),
        bracketDragState: bracketDragState(),
        priceAxisTagHeight: 22,
      });
    const centerOf = (resolved: ReturnType<typeof resolve>, id: string) =>
      resolved.find((tag) => tag.id === id)?.centerY;

    it('moves a readout off a fixed last-trade tag without moving the anchor', () => {
      const alone = resolve([lastTradeSource(50)]);
      const together = resolve([lastTradeSource(50), outputSource('main:indicator-output:bb:basis', 50)]);

      expect(centerOf(together, 'priceLine:last-trade')).toBe(centerOf(alone, 'priceLine:last-trade'));
      expect(centerOf(together, 'main:indicator-output:bb:basis')).not.toBe(
        centerOf(alone, 'priceLine:last-trade'),
      );
    });

    // An order outranks a readout - priority 90 against 0 - so the order holds
    // its line and the readout gives way. Web flattens every non-fixed tag to
    // one priority and lets either move; native is deliberately stricter.
    it('gives way to an order tag at the same price rather than moving it', () => {
      const order = {
        sourceType: 'order' as const,
        tagId: 'order:order-1',
        objectId: 'order-1',
        price: 50,
        height: 17,
        priority: 90,
      };
      const alone = resolve([order]);
      const together = resolve([order, outputSource('main:indicator-output:bb:basis', 50)]);

      const orderCenter = centerOf(together, 'order:order-1');
      const outputCenter = centerOf(together, 'main:indicator-output:bb:basis');

      expect(orderCenter).toBe(centerOf(alone, 'order:order-1'));
      expect(outputCenter).toBeDefined();
      expect(Math.abs(outputCenter! - orderCenter!)).toBeGreaterThanOrEqual(17 / 2 + 11 / 2);
    });

    // The stack's floor is the time axis, not the pane's bottom edge, so a
    // readout at the low of the range cannot ride down onto the axis.
    it('keeps a readout off the time axis', () => {
      const resolved = resolve([outputSource('main:indicator-output:bb:lower', 0)]);
      const centerY = centerOf(resolved, 'main:indicator-output:bb:lower');

      expect(centerY).toBeDefined();
      expect(centerY! + 11 / 2).toBeLessThanOrEqual(getNativePriceAxisTagFloor(frame));
    });

    it('drops a readout whose value has left the viewport', () => {
      expect(resolve([outputSource('main:indicator-output:bb:upper', 400)])).toEqual([]);
    });
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
