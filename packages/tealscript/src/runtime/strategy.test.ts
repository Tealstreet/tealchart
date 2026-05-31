import { describe, expect, it } from 'vitest';
import {
  cancelAllStrategyOrders,
  cancelStrategyOrder,
  createDefaultStrategySettings,
  createStrategyLedger,
  createStrategyOrder,
  createStrategyPosition,
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
    expect(ledger.position).toMatchObject({
      direction: 'long',
      size: 3,
      avgPrice: 101,
    });
  });
});
