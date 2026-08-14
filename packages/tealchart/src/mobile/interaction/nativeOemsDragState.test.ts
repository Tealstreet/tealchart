import type { SharedValue } from 'react-native-reanimated';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeOrderDragZone, NativeTradeLineActionZone } from '../utils/tradeLineLayout';

import { describe, expect, it } from 'vitest';

import {
  beginNativeBracketDragState,
  beginNativeOrderDragState,
  clearNativeBracketDragState,
  clearNativeOrderDragState,
  finalizeNativeBracketDragState,
  finalizeNativeOrderDragState,
  getNativeBracketDragCommit,
  getNativeOrderDragCommit,
  hasNativeBracketDragMoved,
  shouldClearNativeBracketDragForSnapshot,
  shouldClearNativeOrderDragForSnapshot,
  type NativeBracketDragInteractionState,
  type NativeOrderDragInteractionState,
  updateNativeBracketDragState,
  updateNativeOrderDragState,
} from './nativeOemsDragState';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function createOrderDragState(): NativeOrderDragInteractionState {
  return {
    active: shared(false),
    activeObjectId: shared(''),
    activePrice: shared(0),
    startPrice: shared(0),
    pricePerPixel: shared(0),
  };
}

function createBracketDragState(): NativeBracketDragInteractionState {
  return {
    active: shared(false),
    activeObjectId: shared(''),
    activeObjectType: shared(''),
    activeBracketType: shared(''),
    activePrice: shared(0),
    activeEntryPrice: shared(0),
    activeDragStartX: shared(0),
    activeDragCurrentX: shared(0),
    activeDragStartY: shared(0),
    activeDragCurrentY: shared(0),
    activePositionNotional: shared(0),
    activePositionIsLong: shared(true),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared(''),
    activeLineColor: shared(''),
    startPrice: shared(0),
    pricePerPixel: shared(0),
  };
}

function orderLine(id: string, price: number, isPending = false): OrderLineRenderData {
  return {
    id,
    price,
    quantity: '',
    side: 'buy',
    text: '',
    bodyText: '',
    lineColor: '#00a',
    lineStyle: 0,
    lineLength: 100,
    extendLeft: true,
    actionState: isPending ? { isPending: true } : undefined,
  } as OrderLineRenderData;
}

function positionLine(id: string, price: number, isPending = false): PositionLineRenderData {
  return {
    id,
    price,
    quantity: '',
    text: '',
    bodyText: '',
    lineColor: '#00a',
    lineStyle: 0,
    lineLength: 100,
    extendLeft: true,
    actionState: isPending ? { isPending: true } : undefined,
  } as PositionLineRenderData;
}

describe('native OEMS drag state', () => {
  it('starts, updates, and clears order drag state', () => {
    const state = createOrderDragState();
    const zone: NativeOrderDragZone = { objectId: 'order-1', price: 100, x1: 10, x2: 90 };

    beginNativeOrderDragState(state, zone, 0.5);
    expect(state.active.value).toBe(true);
    expect(state.activeObjectId.value).toBe('order-1');
    expect(state.activePrice.value).toBe(100);

    expect(updateNativeOrderDragState(state, 12)).toBe(true);
    expect(state.activePrice.value).toBe(94);

    clearNativeOrderDragState(state);
    expect(state.active.value).toBe(false);
    expect(state.activeObjectId.value).toBe('');
  });

  it('does not update inactive order drag state', () => {
    const state = createOrderDragState();

    expect(updateNativeOrderDragState(state, 12)).toBe(false);
    expect(state.activePrice.value).toBe(0);
  });

  it('reads an order drag commit only while active and moved past threshold', () => {
    const state = createOrderDragState();
    const zone: NativeOrderDragZone = { objectId: 'order-1', price: 100, x1: 10, x2: 90 };

    expect(getNativeOrderDragCommit(state, 12)).toBeNull();

    beginNativeOrderDragState(state, zone, 0.5);
    updateNativeOrderDragState(state, 3);
    expect(getNativeOrderDragCommit(state, 3)).toBeNull();

    updateNativeOrderDragState(state, 12);

    expect(getNativeOrderDragCommit(state, 12)).toEqual({ objectId: 'order-1', price: 94 });
  });

  it('finalizes failed order drags by clearing once', () => {
    const state = createOrderDragState();
    const zone: NativeOrderDragZone = { objectId: 'order-1', price: 100, x1: 10, x2: 90 };

    beginNativeOrderDragState(state, zone, 0.5);

    expect(finalizeNativeOrderDragState(state, false)).toBe(true);
    expect(state.active.value).toBe(false);
    expect(state.activeObjectId.value).toBe('');
    expect(finalizeNativeOrderDragState(state, false)).toBe(false);
  });

  it('starts, updates, and clears bracket drag state', () => {
    const state = createBracketDragState();
    const zone: NativeTradeLineActionZone = {
      objectType: 'position',
      objectId: 'position-1',
      actionType: 'tp',
      price: 200,
      entryPrice: 200,
      partialEnabled: true,
      positionNotional: 1000,
      positionIsLong: true,
      color: '#00a',
      lineColor: '#00a',
      x1: 20,
      x2: 40,
    };

    expect(beginNativeBracketDragState(state, zone, 2, 80)).toBe(true);
    expect(state.active.value).toBe(true);
    expect(state.activeObjectType.value).toBe('position');
    expect(state.activeBracketType.value).toBe('tp');
    expect(state.activeEntryPrice.value).toBe(200);
    expect(state.activeDragStartX.value).toBe(80);
    expect(state.activeDragCurrentX.value).toBe(80);
    expect(state.activePositionNotional.value).toBe(1000);
    expect(state.activePositionIsLong.value).toBe(true);

    expect(updateNativeBracketDragState(state, 120, -3)).toBe(true);
    expect(state.activePrice.value).toBe(206);
    expect(state.activeDragCurrentX.value).toBe(200);
    expect(state.activePartialPercent.value).toBeLessThan(100);

    clearNativeBracketDragState(state);
    expect(state.active.value).toBe(false);
    expect(state.activeObjectId.value).toBe('');
    expect(state.activeEntryPrice.value).toBe(0);
    expect(state.activeDragStartX.value).toBe(0);
    expect(state.activeDragCurrentX.value).toBe(0);
    expect(state.activePositionNotional.value).toBe(0);
    expect(state.activePositionIsLong.value).toBe(true);
    expect(state.activePartialPercent.value).toBe(100);
  });

  it('starts bracket drags from the bracket price while preserving the visible hit-test price', () => {
    const state = createBracketDragState();
    const zone: NativeTradeLineActionZone = {
      objectType: 'order',
      objectId: 'order-1',
      actionType: 'sl',
      price: 200,
      entryPrice: 200,
      dragPrice: 175,
      partialEnabled: false,
      positionNotional: 0,
      positionIsLong: true,
      color: '#00a',
      lineColor: '#00a',
      x1: 20,
      x2: 40,
    };

    expect(beginNativeBracketDragState(state, zone, 2)).toBe(true);
    expect(state.activePrice.value).toBe(175);
    expect(state.activeEntryPrice.value).toBe(200);
    expect(state.startPrice.value).toBe(175);

    expect(updateNativeBracketDragState(state, 0, -3)).toBe(true);
    expect(state.activePrice.value).toBe(181);
  });

  it('ignores non-bracket action zones', () => {
    const state = createBracketDragState();
    const zone: NativeTradeLineActionZone = {
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
      x1: 20,
      x2: 40,
    };

    expect(beginNativeBracketDragState(state, zone, 2)).toBe(false);
    expect(state.active.value).toBe(false);
  });

  it('uses the shared bracket move threshold', () => {
    expect(hasNativeBracketDragMoved(4, 5)).toBe(false);
    expect(hasNativeBracketDragMoved(6, 0)).toBe(true);
    expect(hasNativeBracketDragMoved(0, -6)).toBe(true);
  });

  it('reads a bracket drag commit only while active and moved past threshold', () => {
    const state = createBracketDragState();
    const zone: NativeTradeLineActionZone = {
      objectType: 'position',
      objectId: 'position-1',
      actionType: 'tp',
      price: 200,
      entryPrice: 200,
      partialEnabled: true,
      positionNotional: 1000,
      positionIsLong: true,
      color: '#00a',
      lineColor: '#00a',
      x1: 20,
      x2: 40,
    };

    expect(getNativeBracketDragCommit(state, 10, 10)).toBeNull();
    expect(beginNativeBracketDragState(state, zone, 2)).toBe(true);
    updateNativeBracketDragState(state, 120, -3);

    expect(getNativeBracketDragCommit(state, 1, 1)).toBeNull();
    expect(getNativeBracketDragCommit(state, 120, -3)).toEqual({
      objectType: 'position',
      objectId: 'position-1',
      bracketType: 'tp',
      price: 206,
      partialPercent: state.activePartialPercent.value,
    });
  });

  it('clears invalid bracket drag commit state instead of committing malformed payloads', () => {
    const state = createBracketDragState();
    state.active.value = true;
    state.activeObjectId.value = 'position-1';
    state.activeObjectType.value = '';
    state.activeBracketType.value = 'tp';

    expect(getNativeBracketDragCommit(state, 10, 0)).toBe('clear');
  });

  it('finalizes failed bracket drags by clearing once', () => {
    const state = createBracketDragState();
    const zone: NativeTradeLineActionZone = {
      objectType: 'position',
      objectId: 'position-1',
      actionType: 'tp',
      price: 200,
      entryPrice: 200,
      partialEnabled: true,
      positionNotional: 1000,
      positionIsLong: true,
      color: '#00a',
      lineColor: '#00a',
      x1: 20,
      x2: 40,
    };

    expect(beginNativeBracketDragState(state, zone, 2)).toBe(true);

    expect(finalizeNativeBracketDragState(state, false)).toBe(true);
    expect(state.active.value).toBe(false);
    expect(state.activeObjectId.value).toBe('');
    expect(finalizeNativeBracketDragState(state, false)).toBe(false);
  });

  it('clears order drags when snapshots become pending or catch up to the drag price', () => {
    const state = createOrderDragState();
    state.activeObjectId.value = 'order-1';
    state.activePrice.value = 125;
    const getOrderObjectId = (line: OrderLineRenderData) => line.id;

    expect(
      shouldClearNativeOrderDragForSnapshot({
        state,
        orderLines: [orderLine('order-1', 100)],
        getOrderObjectId,
      }),
    ).toBe(false);
    expect(
      shouldClearNativeOrderDragForSnapshot({
        state,
        orderLines: [orderLine('order-1', 125)],
        getOrderObjectId,
      }),
    ).toBe(true);
    expect(
      shouldClearNativeOrderDragForSnapshot({
        state,
        orderLines: [orderLine('order-1', 100, true)],
        getOrderObjectId,
      }),
    ).toBe(true);
  });

  it('clears bracket drags when the active order or position snapshot becomes pending', () => {
    const state = createBracketDragState();
    state.activeObjectId.value = 'position-1';
    state.activeObjectType.value = 'position';
    const getOrderObjectId = (line: OrderLineRenderData) => line.id;
    const getPositionObjectId = (line: PositionLineRenderData) => line.id;

    expect(
      shouldClearNativeBracketDragForSnapshot({
        state,
        orderLines: [orderLine('order-1', 100, true)],
        positionLines: [positionLine('position-1', 100)],
        getOrderObjectId,
        getPositionObjectId,
      }),
    ).toBe(false);
    expect(
      shouldClearNativeBracketDragForSnapshot({
        state,
        orderLines: [],
        positionLines: [positionLine('position-1', 100, true)],
        getOrderObjectId,
        getPositionObjectId,
      }),
    ).toBe(true);

    state.activeObjectId.value = 'order-1';
    state.activeObjectType.value = 'order';
    expect(
      shouldClearNativeBracketDragForSnapshot({
        state,
        orderLines: [orderLine('order-1', 100, true)],
        positionLines: [positionLine('position-1', 100)],
        getOrderObjectId,
        getPositionObjectId,
      }),
    ).toBe(true);
  });
});
