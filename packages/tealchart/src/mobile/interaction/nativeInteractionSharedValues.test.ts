import type { SharedValue } from 'react-native-reanimated';
import type { NativePriceAxisTagSource } from '../utils/priceAxisTagSources';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineGeometry,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';

import { describe, expect, it } from 'vitest';

import {
  syncNativePriceAxisTagSources,
  syncNativeTradeLineInteractionGeometry,
} from './nativeInteractionSharedValues';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

describe('native interaction shared values', () => {
  it('syncs trade-line drag, action, and row shared values from geometries', () => {
    const orderDragZones = shared<NativeOrderDragZone[]>([]);
    const actionZones = shared<NativeTradeLineActionZone[]>([]);
    const rows = shared<NativeTradeLineRow[]>([]);
    const geometries = [
      {
        objectType: 'order',
        objectId: 'order-1',
        price: 100,
        leftLineStartX: 10,
        priceLabelX: 90,
        priceLabelWidth: 50,
        dragZone: { objectId: 'order-1', price: 100, x1: 10, x2: 80 },
        actionZones: [
          {
            objectType: 'order',
            objectId: 'order-1',
            actionType: 'cancel',
            price: 100,
            entryPrice: 100,
            partialEnabled: false,
            positionNotional: 0,
            positionIsLong: true,
            color: '#00a',
            lineColor: '#00a',
            x1: 82,
            x2: 102,
          },
        ],
      },
      {
        objectType: 'position',
        objectId: 'position-1',
        price: 110,
        leftLineStartX: 12,
        priceLabelX: 92,
        priceLabelWidth: 50,
        actionZones: [],
      },
    ] as NativeTradeLineGeometry[];

    syncNativeTradeLineInteractionGeometry({
      orderDragZones,
      actionZones,
      rows,
      geometries,
    });

    expect(orderDragZones.value).toEqual([{ objectId: 'order-1', price: 100, x1: 10, x2: 140 }]);
    expect(actionZones.value).toHaveLength(1);
    expect(rows.value).toEqual([
      { objectType: 'order', objectId: 'order-1', price: 100, x1: 10, x2: 140 },
      { objectType: 'position', objectId: 'position-1', price: 110, x1: 12, x2: 142 },
    ]);
  });

  it('refreshes row hit boxes when layout x bounds change without a price change', () => {
    const orderDragZones = shared<NativeOrderDragZone[]>([]);
    const actionZones = shared<NativeTradeLineActionZone[]>([]);
    const rows = shared<NativeTradeLineRow[]>([]);
    const baseGeometry = {
      objectType: 'order',
      objectId: 'order-1',
      price: 100,
      leftLineStartX: 10,
      priceLabelX: 90,
      priceLabelWidth: 50,
      dragZone: { objectId: 'order-1', price: 100, x1: 40, x2: 80 },
      actionZones: [],
    } as NativeTradeLineGeometry;

    syncNativeTradeLineInteractionGeometry({ orderDragZones, actionZones, rows, geometries: [baseGeometry] });
    const firstRows = rows.value;

    syncNativeTradeLineInteractionGeometry({
      orderDragZones,
      actionZones,
      rows,
      geometries: [{ ...baseGeometry, leftLineStartX: 24, priceLabelX: 104 }],
    });

    expect(rows.value).not.toBe(firstRows);
    expect(rows.value).toEqual([{ objectType: 'order', objectId: 'order-1', price: 100, x1: 24, x2: 154 }]);
  });

  it('refreshes action zones when bracket preview metadata changes', () => {
    const orderDragZones = shared<NativeOrderDragZone[]>([]);
    const actionZones = shared<NativeTradeLineActionZone[]>([]);
    const rows = shared<NativeTradeLineRow[]>([]);
    const actionZone = {
      objectType: 'position',
      objectId: 'position-1',
      actionType: 'tp',
      price: 110,
      entryPrice: 100,
      dragPrice: 125,
      partialEnabled: true,
      positionNotional: 1_000,
      positionIsLong: true,
      color: '#00a',
      lineColor: '#00a',
      x1: 82,
      x2: 108,
    } satisfies NativeTradeLineActionZone;
    const geometries = [
      {
        objectType: 'position',
        objectId: 'position-1',
        price: 110,
        actionZones: [actionZone],
      },
    ] as NativeTradeLineGeometry[];

    syncNativeTradeLineInteractionGeometry({ orderDragZones, actionZones, rows, geometries });
    const firstZones = actionZones.value;
    syncNativeTradeLineInteractionGeometry({
      orderDragZones,
      actionZones,
      rows,
      geometries: [
        {
          ...geometries[0],
          actionZones: [{ ...actionZone, entryPrice: 101 }],
        },
      ] as NativeTradeLineGeometry[],
    });

    expect(actionZones.value).not.toBe(firstZones);
    expect(actionZones.value[0]?.entryPrice).toBe(101);
  });

  it('syncs price-axis tag sources without rebuilding unchanged sources', () => {
    const target = shared<NativePriceAxisTagSource[]>([]);
    const sources = [
      {
        sourceType: 'order',
        tagId: 'order:order-1',
        objectId: 'order-1',
        price: 100,
        height: 22,
        priority: 90,
      },
    ] satisfies NativePriceAxisTagSource[];

    syncNativePriceAxisTagSources({ target, sources });

    expect(target.value).toEqual(sources);

    const syncedSources = target.value;
    syncNativePriceAxisTagSources({ target, sources: [...sources] });

    expect(target.value).toBe(syncedSources);

    syncNativePriceAxisTagSources({
      target,
      sources: [{ ...sources[0], fixed: true }],
    });

    expect(target.value).not.toBe(syncedSources);
    expect(target.value[0].fixed).toBe(true);
  });
});
