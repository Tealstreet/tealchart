import type { OrderLineRenderData, PositionLineRenderData } from '../types';

import { describe, expect, it } from 'vitest';

import { OemsActionManager } from './oemsActionManager';
import {
  applyOemsBracketActionState,
  OemsLineHold,
  applyOemsOrderActionState,
  defaultOemsOrderIdentity,
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

describe('OemsLineHold', () => {
  // What a host supplies: a comparison over what IT knows an order is. Size
  // here, deliberately not colour - the chart has no business reading styling,
  // and a faded in-flight line used to fail its own identity check.
  const sameOrder = (a: OrderLineRenderData, b: OrderLineRenderData) => a.quantity === b.quantity;

  const hold = (isSame: typeof sameOrder = sameOrder) =>
    new OemsLineHold<OrderLineRenderData>(
      'order',
      getOemsOrderObjectId,
      (line) => ({ price: line.price }),
      applyOemsOrderActionState,
      isSame,
    );

  const line = (id: string, price: number) =>
    orderLine({ id, orderId: id, price, quantity: '0.5', lineColor: '#ff0000' });

  const startMove = (manager: OemsActionManager<OemsTradingLineState>, id: string, to: number) =>
    manager.startAction({
      objectType: 'order',
      objectId: id,
      kind: 'orderMove',
      originalState: { price: 100 },
      optimisticState: { price: to },
      callback: () => new Promise<never>(() => {}),
    });

  // The default is TradingView's: an order is its order id. A host whose ids
  // survive an amend needs nothing else, and one that cancels-and-replaces has
  // to say so by passing its own comparison.
  describe('default identity', () => {
    const byId = (a: OrderLineRenderData, b: OrderLineRenderData) => defaultOemsOrderIdentity(a, b);

    it('treats two rows as one order only when the id matches', () => {
      expect(byId(line('order-1', 100), line('order-1', 110))).toBe(true);
      expect(byId(line('order-1', 100), line('order-2', 100))).toBe(false);
    });

    it('holds nothing for a line carrying no id at all', () => {
      const manager = pendingManager();
      const projector = hold(byId);
      const anonymous = orderLine({ id: 'line-x', orderId: undefined, price: 100 });

      projector.project([anonymous], manager);
      startMove(manager, 'line-x', 110);

      expect(projector.project([], manager)).toEqual([]);
    });

    it('still applies optimistic state to rows that are present', () => {
      const manager = pendingManager();
      const projector = hold(byId);

      projector.project([line('order-1', 100)], manager);
      startMove(manager, 'order-1', 110);

      const projected = projector.project([line('order-1', 100)], manager);
      expect(projected).toHaveLength(1);
      expect(projected[0].price).toBe(110);
    });
  });

  it('keeps the line on the chart at the dragged price after its row leaves the feed', () => {
    const manager = pendingManager();
    const projector = hold();

    projector.project([line('order-1', 100)], manager);
    startMove(manager, 'order-1', 110);

    const held = projector.project([], manager);

    expect(held).toHaveLength(1);
    expect(held[0].price).toBe(110);
    expect(held[0].actionState?.isPending).toBe(true);
  });

  // The replacement is a different order with a different id, so nothing keyed
  // on the old id will ever confirm it.
  it('retires the hold when the replacement shows up under a new id', () => {
    const manager = pendingManager();
    const projector = hold();

    projector.project([line('order-1', 100)], manager);
    startMove(manager, 'order-1', 110);
    projector.project([], manager);

    const settled = projector.project([line('order-2', 110)], manager);

    expect(settled).toHaveLength(1);
    expect(settled[0].id).toBe('order-2');
    expect(manager.getActions()).toHaveLength(0);
  });

  it('does not retire on a lookalike resting at a different price', () => {
    const manager = pendingManager();
    const projector = hold();

    projector.project([line('order-1', 100)], manager);
    startMove(manager, 'order-1', 110);

    const result = projector.project([line('order-2', 250)], manager);

    expect(manager.getActions()).toHaveLength(1);
    expect(result.map((entry) => entry.price).sort()).toEqual([110, 250]);
  });

  it('lets a cancelled order leave, which is the point of cancelling it', () => {
    const manager = pendingManager();
    const projector = hold();

    projector.project([line('order-1', 100)], manager);
    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderCancel',
      originalState: { price: 100 },
      confirmsRemoved: true,
      callback: () => new Promise<never>(() => {}),
    });

    expect(projector.project([], manager)).toHaveLength(0);
  });

  it('will not claim a row that is itself mid-drag', () => {
    const manager = pendingManager();
    const projector = hold();

    projector.project([line('order-1', 100), line('order-2', 100)], manager);
    startMove(manager, 'order-1', 110);
    startMove(manager, 'order-2', 110);

    const result = projector.project([line('order-2', 110)], manager);

    // order-2 is spoken for, so order-1's hold survives rather than retiring
    // against its neighbour.
    expect(result).toHaveLength(2);
    expect(manager.getActions().some((action) => action.objectId === 'order-1')).toBe(true);
  });
});
