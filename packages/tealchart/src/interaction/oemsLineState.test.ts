import type { OrderLineRenderData, PositionLineRenderData } from '../types';

import { describe, expect, it } from 'vitest';

import { OemsActionManager } from './oemsActionManager';
import {
  applyOemsBracketActionState,
  applyOemsOrderActionState,
  applyOemsPositionActionState,
  getOemsOrderObjectId,
  getOemsPositionObjectId,
  type OemsTradingLineState,
} from './oemsLineState';

const orderLine = (overrides: Partial<OrderLineRenderData> = {}): OrderLineRenderData =>
  ({
    id: 'order-1',
    orderId: 'order-1',
    price: 100,
    brackets: null,
    cancellable: true,
    ...overrides,
  }) as OrderLineRenderData;

const positionLine = (overrides: Partial<PositionLineRenderData> = {}): PositionLineRenderData =>
  ({
    id: 'position-1',
    positionId: 'position-1',
    price: 100,
    brackets: null,
    ...overrides,
  }) as PositionLineRenderData;

const pendingManager = () => {
  const manager = new OemsActionManager<OemsTradingLineState>();
  return manager;
};

describe('getOems*ObjectId', () => {
  it('prefers the trading id over the render id, on both object types', () => {
    expect(getOemsOrderObjectId(orderLine({ id: 'line-x', orderId: 'order-9' }))).toBe('order-9');
    expect(getOemsPositionObjectId(positionLine({ id: 'line-y', positionId: 'position-9' }))).toBe('position-9');
  });

  it('falls back to the render id when there is no trading id', () => {
    expect(getOemsOrderObjectId(orderLine({ id: 'line-x', orderId: undefined }))).toBe('line-x');
  });
});

// A bracket the user has just dragged into existence has nowhere else to live.
// The native copy of this returned early when `brackets` was null and dropped
// the optimistic price, so dragging a stop onto a position that had none drew
// nothing until the exchange echoed back.
describe('applyOemsBracketActionState', () => {
  it('materializes brackets for an optimistic stop on a line that had none', () => {
    expect(applyOemsBracketActionState(null, { stopLoss: 59_000 })).toEqual({ stopLoss: 59_000 });
  });

  it('materializes brackets for an optimistic take profit too', () => {
    expect(applyOemsBracketActionState(null, { takeProfit: 71_000 })).toEqual({ takeProfit: 71_000 });
  });

  it('leaves a bracketless line alone when there is nothing optimistic to show', () => {
    expect(applyOemsBracketActionState(null, { price: 100 })).toBeNull();
  });

  it('keeps the bracket it was not asked about', () => {
    expect(applyOemsBracketActionState({ takeProfit: 71_000 }, { stopLoss: 59_000 })).toEqual({
      takeProfit: 71_000,
      stopLoss: 59_000,
    });
  });
});

describe('applyOems*ActionState with no existing brackets', () => {
  it('shows a dragged stop on an order whose brackets were null', () => {
    const manager = pendingManager();
    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderSlMove',
      originalState: { price: 100 },
      optimisticState: { price: 100, stopLoss: 59_000 },
      callback: () => new Promise<never>(() => {}),
    });

    expect(applyOemsOrderActionState(orderLine(), manager).brackets).toEqual({ stopLoss: 59_000 });
  });

  it('shows a dragged stop on a position whose brackets were null', () => {
    const manager = pendingManager();
    manager.startAction({
      objectType: 'position',
      objectId: 'position-1',
      kind: 'positionSlMove',
      originalState: { price: 100 },
      optimisticState: { price: 100, stopLoss: 59_000 },
      callback: () => new Promise<never>(() => {}),
    });

    expect(applyOemsPositionActionState(positionLine(), manager).brackets).toEqual({ stopLoss: 59_000 });
  });

  it('clears actionState on a line with nothing in flight', () => {
    expect(applyOemsOrderActionState(orderLine(), pendingManager()).actionState).toBeUndefined();
  });
});
