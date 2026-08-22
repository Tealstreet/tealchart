import type { OrderLineRenderData, PositionLineRenderData } from '../types';

import { describe, expect, it } from 'vitest';

import { OemsActionManager } from './oemsActionManager';
import {
  applyOemsBracketActionState,
  confirmOemsOrderLineSnapshots,
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
  // The adapter's id, never the venue's. On most venues an amend is a cancel
  // and a place, so `orderId` changes mid-action; keying on it orphaned the
  // pending action and left the retired line drawn beside its replacement.
  it('identifies a line by its adapter, not by the venue id it carries', () => {
    expect(getOemsOrderObjectId(orderLine({ id: 'line-x', orderId: 'order-9' }))).toBe('line-x');
    expect(getOemsPositionObjectId(positionLine({ id: 'line-y', positionId: 'position-9' }))).toBe('line-y');
  });

  it('is unmoved by the venue re-keying an order mid-flight', () => {
    const before = orderLine({ id: 'line-x', orderId: 'venue-1' });
    const after = orderLine({ id: 'line-x', orderId: 'venue-2' });
    expect(getOemsOrderObjectId(after)).toBe(getOemsOrderObjectId(before));
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

describe('confirmOemsOrderLineSnapshots', () => {
  const startMove = (manager: OemsActionManager<OemsTradingLineState>, callback: () => Promise<void>) =>
    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderMove',
      originalState: { price: 100, visible: true },
      optimisticState: { price: 101, visible: true },
      callback,
    });

  // A host that retires the adapter on an amend instead of re-pointing it takes
  // the object away from under the action. Held to the timeout, the line it was
  // replaced by inherited nothing but the pending state stayed on the books.
  it('abandons a move whose line left the snapshot', async () => {
    const settled: string[] = [];
    const manager = new OemsActionManager<OemsTradingLineState>({
      onSettle: (settlement) => settled.push(settlement.status),
    });
    startMove(manager, () => Promise.resolve());
    await Promise.resolve();
    await Promise.resolve();

    confirmOemsOrderLineSnapshots(manager, []);

    expect(settled).toEqual(['abandoned']);
    expect(manager.getAction('order', 'order-1')).toBeNull();
  });

  it('still reads a departure as confirmation for a cancel', async () => {
    const settled: string[] = [];
    const manager = new OemsActionManager<OemsTradingLineState>({
      onSettle: (settlement) => settled.push(settlement.status),
    });
    manager.startAction({
      objectType: 'order',
      objectId: 'order-1',
      kind: 'orderCancel',
      originalState: { price: 100, visible: true },
      optimisticState: { price: 100, visible: true },
      confirmsRemoved: true,
      callback: () => Promise.resolve(),
    });
    await Promise.resolve();
    await Promise.resolve();

    confirmOemsOrderLineSnapshots(manager, []);

    expect(settled).toEqual(['confirmed']);
  });

  // A host is free to clear its lines and re-add them in one pass; that must not
  // cancel a round trip that is still in the air.
  it('leaves a move whose callback has not resolved alone', () => {
    const manager = new OemsActionManager<OemsTradingLineState>();
    startMove(manager, () => new Promise<never>(() => {}));

    confirmOemsOrderLineSnapshots(manager, []);

    expect(manager.getAction('order', 'order-1')).not.toBeNull();
  });
});
