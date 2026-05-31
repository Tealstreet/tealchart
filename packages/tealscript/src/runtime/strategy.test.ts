import { describe, expect, it } from 'vitest';
import {
  cancelAllStrategyOrders,
  cancelStrategyOrder,
  cloneStrategyLedger,
  createDefaultStrategySettings,
  createStrategyLedger,
  createStrategyOrder,
  createStrategyPosition,
  fillPendingStrategyOrders,
  fillStrategyMarketOrder,
  submitStrategyOrder,
} from './strategy';

describe('strategy ledger model', () => {
  it('creates Pine-like default strategy settings with overrides', () => {
    const settings = createDefaultStrategySettings({
      title: 'Breakout',
      initialCapital: 25_000,
      defaultQtyType: 'percent_of_equity',
      defaultQtyValue: 10,
      pyramiding: 2,
      commissionValue: 0.05,
    });

    expect(settings).toMatchObject({
      title: 'Breakout',
      initialCapital: 25_000,
      currency: 'USD',
      defaultQtyType: 'percent_of_equity',
      defaultQtyValue: 10,
      pyramiding: 2,
      commissionType: 'percent',
      commissionValue: 0.05,
      slippageTicks: 0,
      processOrdersOnClose: false,
    });
  });

  it('initializes an empty ledger from resolved settings', () => {
    const ledger = createStrategyLedger({
      title: 'Mean reversion',
      initialCapital: 50_000,
      currency: 'EUR',
    });

    expect(ledger.settings.title).toBe('Mean reversion');
    expect(ledger.initialCapital).toBe(50_000);
    expect(ledger.equity).toBe(50_000);
    expect(ledger.settings.currency).toBe('EUR');
    expect(ledger.orders).toEqual([]);
    expect(ledger.fills).toEqual([]);
    expect(ledger.openTrades).toEqual([]);
    expect(ledger.closedTrades).toEqual([]);
    expect(ledger.position).toEqual(createStrategyPosition());
  });

  it('supports explicit flat and open position snapshots', () => {
    expect(createStrategyPosition()).toMatchObject({
      direction: null,
      size: 0,
      avgPrice: null,
      openProfit: 0,
    });

    expect(createStrategyPosition({
      direction: 'long',
      size: 2,
      avgPrice: 100.5,
      openProfit: 12,
    })).toMatchObject({
      direction: 'long',
      size: 2,
      avgPrice: 100.5,
      openProfit: 12,
    });
  });

  it('creates, submits, and cancels pending orders', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 2,
      qtyType: 'fixed',
      qtyValue: 2,
      limitPrice: 101,
      stopPrice: 99,
      barIndex: 4,
      time: 123,
    });

    expect(order).toMatchObject({
      id: 'Long',
      direction: 'long',
      type: 'stop_limit',
      status: 'pending',
      qty: 2,
      qtyType: 'fixed',
      qtyValue: 2,
    });
    expect(ledger.orders).toHaveLength(1);

    expect(cancelStrategyOrder(ledger, 'Long', 5, 456)).toBe(true);
    expect(ledger.orders[0]).toMatchObject({
      status: 'cancelled',
      updatedBarIndex: 5,
      updatedTime: 456,
    });
  });

  it('cancels all pending orders and leaves filled orders alone', () => {
    const ledger = createStrategyLedger();
    const filledOrder = createStrategyOrder({
      id: 'B',
      direction: 'short',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    });
    filledOrder.status = 'filled';
    ledger.orders.push(
      createStrategyOrder({ id: 'A', direction: 'long', qty: 1, qtyType: 'fixed', qtyValue: 1, barIndex: 0, time: 1 }),
      filledOrder,
    );

    expect(cancelAllStrategyOrders(ledger, 2, 3)).toBe(1);
    expect(ledger.orders.map((order) => order.status)).toEqual(['cancelled', 'filled']);
  });

  it('validates exported order helper inputs', () => {
    const ledger = createStrategyLedger();

    expect(() => submitStrategyOrder(ledger, {
      id: '',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    })).toThrow('strategy order id must not be empty');

    expect(() => createStrategyOrder({
      id: 'Bad',
      direction: 'long',
      qty: -1,
      qtyType: 'fixed',
      qtyValue: -1,
      barIndex: 0,
      time: 1,
    })).toThrow('strategy order qty must be a positive number');

    expect(() => createStrategyOrder({
      id: 'Bad price',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      limitPrice: Number.NaN,
      barIndex: 0,
      time: 1,
    })).toThrow('strategy order limitPrice must be finite');

    expect(() => createStrategyOrder({
      id: 'Bad requested qty',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      requestedQty: Number.NaN,
      barIndex: 0,
      time: 1,
    })).toThrow('strategy order requestedQty must be a positive number');
  });

  it('fills market orders and updates position average price', () => {
    const ledger = createStrategyLedger();
    const first = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 2,
      qtyType: 'fixed',
      qtyValue: 2,
      barIndex: 0,
      time: 1,
    });
    const second = submitStrategyOrder(ledger, {
      id: 'Add',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 1,
      time: 2,
    });

    expect(fillStrategyMarketOrder(ledger, first, 100, 0, 1)).toMatchObject({ orderId: 'Long', qty: 2, price: 100 });
    expect(fillStrategyMarketOrder(ledger, second, 103, 1, 2)).toMatchObject({ orderId: 'Add', qty: 1, price: 103 });

    expect(ledger.orders.map((order) => order.status)).toEqual(['filled', 'filled']);
    expect(ledger.fills).toHaveLength(2);
    expect(ledger.openTrades.map(({ entryOrderId, direction, qty, entryPrice }) => ({
      entryOrderId,
      direction,
      qty,
      entryPrice,
    }))).toEqual([
      { entryOrderId: 'Long', direction: 'long', qty: 2, entryPrice: 100 },
      { entryOrderId: 'Add', direction: 'long', qty: 1, entryPrice: 103 },
    ]);
    expect(ledger.position).toMatchObject({
      direction: 'long',
      size: 3,
      avgPrice: 101,
    });
  });

  it('closes open trades when opposite market fills reduce exposure', () => {
    const ledger = createStrategyLedger();
    const entry = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 2,
      qtyType: 'fixed',
      qtyValue: 2,
      barIndex: 0,
      time: 1,
    });
    const exit = submitStrategyOrder(ledger, {
      id: 'Reduce',
      direction: 'short',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 1,
      time: 2,
    });

    fillStrategyMarketOrder(ledger, entry, 100, 0, 1);
    fillStrategyMarketOrder(ledger, exit, 105, 1, 2);

    expect(ledger.position).toMatchObject({ direction: 'long', size: 1, avgPrice: 100 });
    expect(ledger.openTrades).toHaveLength(1);
    expect(ledger.openTrades[0]).toMatchObject({ entryOrderId: 'Long', qty: 1 });
    expect(ledger.closedTrades).toHaveLength(1);
    expect(ledger.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Reduce',
      qty: 1,
      entryPrice: 100,
      exitPrice: 105,
      profit: 5,
    });
  });

  it('clones strategy ledgers without sharing mutable arrays', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    });
    fillStrategyMarketOrder(ledger, order, 100, 0, 1);

    const cloned = cloneStrategyLedger(ledger);
    cloned.orders[0]!.status = 'cancelled';
    cloned.openTrades[0]!.qty = 10;
    cloned.position.size = 10;

    expect(ledger.orders[0]?.status).toBe('filled');
    expect(ledger.openTrades[0]?.qty).toBe(1);
    expect(ledger.position.size).toBe(1);
  });

  it('fills eligible pending limit and stop orders after their creation bar', () => {
    const ledger = createStrategyLedger();
    const limit = submitStrategyOrder(ledger, {
      id: 'Long limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      limitPrice: 100,
      barIndex: 0,
      time: 1,
    });
    const stop = submitStrategyOrder(ledger, {
      id: 'Short stop',
      direction: 'short',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      stopPrice: 98,
      barIndex: 0,
      time: 1,
    });

    expect(fillPendingStrategyOrders(ledger, 101, 99, 0, 1)).toEqual([]);
    expect(fillPendingStrategyOrders(ledger, 101, 97, 1, 2).map((fill) => fill.orderId)).toEqual([
      'Long limit',
      'Short stop',
    ]);
    expect(limit).toMatchObject({ status: 'filled', avgFillPrice: 100 });
    expect(stop).toMatchObject({ status: 'filled', avgFillPrice: 98 });
  });
});
