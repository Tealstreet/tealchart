import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeOemsTradingLineState } from './nativeOemsLineState';

import { describe, expect, it, vi } from 'vitest';

import { OemsActionManager } from '../../interaction/oemsActionManager';
import {
  startNativeBracketMoveAction,
  startNativeOrderMoveAction,
  startNativeTradeLineAction,
} from './nativeOemsLineActions';

function pendingCallback(): Promise<void> {
  return new Promise(() => {});
}

function createManager(): OemsActionManager<NativeOemsTradingLineState> {
  return new OemsActionManager<NativeOemsTradingLineState>();
}

function orderLine(overrides: Partial<OrderLineRenderData> = {}): OrderLineRenderData {
  return {
    id: 'generated-order',
    orderId: 'order-1',
    price: 100,
    cancellable: true,
    brackets: { takeProfit: 120, stopLoss: 90 },
    callbacks: {},
    ...overrides,
  } as OrderLineRenderData;
}

function positionLine(overrides: Partial<PositionLineRenderData> = {}): PositionLineRenderData {
  return {
    id: 'generated-position',
    positionId: 'position-1',
    price: 100,
    brackets: { takeProfit: 120, stopLoss: 90 },
    callbacks: {},
    ...overrides,
  } as PositionLineRenderData;
}

describe('native OEMS line actions', () => {
  it('clears and forces a render for synchronous order moves', () => {
    const manager = createManager();
    const onMove = vi.fn();

    const result = startNativeOrderMoveAction({
      manager,
      orderLines: [orderLine({ callbacks: { onMove } })],
      objectId: 'order-1',
      nextPrice: 105,
    });

    expect(onMove).toHaveBeenCalledWith(105);
    expect(result).toEqual({ clearDrag: true, forceUpdate: true });
    expect(manager.getAction('order', 'order-1')).toBeNull();
    manager.dispose();
  });

  it('keeps an async order move pending with an optimistic price', () => {
    const manager = createManager();

    const result = startNativeOrderMoveAction({
      manager,
      orderLines: [orderLine({ callbacks: { onMove: pendingCallback } })],
      objectId: 'order-1',
      nextPrice: 105,
    });

    expect(result).toEqual({ clearDrag: false, forceUpdate: false });
    expect(manager.getAction('order', 'order-1')).toMatchObject({
      kind: 'orderMove',
      optimisticState: { price: 105 },
    });
    manager.dispose();
  });

  it('starts async bracket moves with bracket-specific action kinds', () => {
    const manager = createManager();

    const result = startNativeBracketMoveAction({
      manager,
      orderLines: [],
      positionLines: [positionLine({ callbacks: { onSLMoveEnd: pendingCallback } })],
      objectType: 'position',
      objectId: 'position-1',
      bracketType: 'sl',
      price: 80,
      partialPercent: 50,
    });

    expect(result).toEqual({ clearDrag: false, forceUpdate: false });
    expect(manager.getAction('position', 'position-1')).toMatchObject({
      kind: 'positionSlMove',
      optimisticState: { stopLoss: 80, takeProfit: 120 },
      settleOnCallback: false,
    });
    manager.dispose();
  });

  it('settles new async bracket creates on callback completion', () => {
    const manager = createManager();

    const result = startNativeBracketMoveAction({
      manager,
      orderLines: [],
      positionLines: [
        positionLine({
          brackets: {},
          callbacks: { onSLMoveEnd: pendingCallback },
        }),
      ],
      objectType: 'position',
      objectId: 'position-1',
      bracketType: 'sl',
      price: 80,
    });

    expect(result).toEqual({ clearDrag: false, forceUpdate: false });
    expect(manager.getAction('position', 'position-1')).toMatchObject({
      kind: 'positionSlMove',
      optimisticState: { stopLoss: 80 },
      settleOnCallback: true,
    });
    manager.dispose();
  });

  it('starts cancel actions as remove-confirmed async actions', () => {
    const manager = createManager();

    const result = startNativeTradeLineAction({
      manager,
      orderLines: [orderLine({ callbacks: { onCancel: pendingCallback } })],
      positionLines: [],
      objectType: 'order',
      objectId: 'order-1',
      actionType: 'cancel',
    });

    expect(result).toEqual({ forceUpdate: false });
    expect(manager.getAction('order', 'order-1')).toMatchObject({
      kind: 'orderCancel',
      confirmsRemoved: true,
    });
    manager.dispose();
  });

  it('does not force updates when no callback owns the action', () => {
    const manager = createManager();

    expect(
      startNativeTradeLineAction({
        manager,
        orderLines: [orderLine()],
        positionLines: [],
        objectType: 'order',
        objectId: 'order-1',
        actionType: 'cancel',
      }),
    ).toEqual({ forceUpdate: false });
    expect(manager.getAction('order', 'order-1')).toBeNull();
    manager.dispose();
  });
});
