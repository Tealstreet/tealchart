import { describe, expect, it } from 'vitest';
import {
  cancelAllStrategyOrders,
  cancelStrategyOrder,
  cloneStrategyIntrabarContext,
  cloneStrategyLedger,
  createDefaultStrategySettings,
  createDefaultStrategyOhlcIntrabarContext,
  createStrategyLedger,
  createStrategyOrder,
  createStrategyPosition,
  fillPendingStrategyOrders,
  fillPendingStrategyOrdersOnTicks,
  fillStrategyMarketOrder,
  InMemoryStrategyIntrabarDatafeed,
  markStrategyLedgerToMarket,
  selectStrategyIntrabarContext,
  strategyIntrabarContextKey,
  submitStrategyOrder,
  type StrategyIntrabarContext,
} from './strategy';

describe('strategy ledger model', () => {
  it('stores deterministic strategy intrabar fixture contexts', () => {
    const chartBar = { time: 1_700_000_000_000, open: 100, high: 110, low: 95, close: 105, volume: 1_000 };
    const context: StrategyIntrabarContext = {
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 4,
      chartBar,
      source: 'lower_timeframe',
      ticks: [
        { time: chartBar.time, price: 100, kind: 'intrabar_open', sequence: 0, sourceBarTime: chartBar.time },
        { time: chartBar.time + 60_000, price: 108, kind: 'intrabar_high', sequence: 1, sourceBarTime: chartBar.time },
        { time: chartBar.time + 120_000, price: 99, kind: 'intrabar_low', sequence: 2, sourceBarTime: chartBar.time },
        { time: chartBar.time + 180_000, price: 105, kind: 'intrabar_close', sequence: 3, sourceBarTime: chartBar.time },
      ],
    };

    expect(strategyIntrabarContextKey('BINANCE:BTCUSDT', '1D', chartBar.time)).toBe('BINANCE:BTCUSDT\u00001D\u00001700000000000');

    const cloned = cloneStrategyIntrabarContext(context);
    cloned.chartBar.close = 999;
    cloned.ticks[0].price = 999;
    expect(context.chartBar.close).toBe(105);
    expect(context.ticks[0].price).toBe(100);

    const datafeed = new InMemoryStrategyIntrabarDatafeed([context]);
    context.ticks[0].price = 777;

    const result = datafeed.getStrategyIntrabars({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 4,
      chartBar,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.ticks[0].price).toBe(100);

    result.context.ticks[0].price = 888;
    const second = datafeed.getStrategyIntrabars({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 4,
      chartBar,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.message);
    expect(second.context.ticks[0].price).toBe(100);
  });

  it('reports missing strategy intrabar fixture contexts without throwing', () => {
    const chartBar = { time: 1_700_000_000_000, open: 100, high: 110, low: 95, close: 105, volume: 1_000 };
    const datafeed = new InMemoryStrategyIntrabarDatafeed();

    expect(datafeed.getStrategyIntrabars({
      symbol: 'BINANCE:ETHUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 0,
      chartBar,
    })).toEqual({
      ok: false,
      code: 'missing_context',
      message: 'No strategy intrabar context for BINANCE:ETHUSDT 1D 1700000000000',
    });
  });

  it('builds Pine default OHLC execution paths for chart bars', () => {
    const highFirst = createDefaultStrategyOhlcIntrabarContext({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: 1_700_000_000_000,
      chartBarIndex: 7,
      chartBar: { time: 1_700_000_000_000, open: 108, high: 110, low: 95, close: 101, volume: 1_000 },
    });

    expect(highFirst.source).toBe('chart_ohlc');
    expect(highFirst.ticks.map((tick) => tick.kind)).toEqual(['open', 'high', 'low', 'close']);
    expect(highFirst.ticks.map((tick) => tick.price)).toEqual([108, 110, 95, 101]);
    expect(highFirst.ticks.map((tick) => tick.sequence)).toEqual([0, 1, 2, 3]);
    expect(highFirst.ticks.every((tick) => tick.sourceBarIndex === 7)).toBe(true);

    const lowFirst = createDefaultStrategyOhlcIntrabarContext({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: 1_700_086_400_000,
      chartBarIndex: 8,
      chartBar: { time: 1_700_086_400_000, open: 97, high: 110, low: 95, close: 104, volume: 1_100 },
    });

    expect(lowFirst.ticks.map((tick) => tick.kind)).toEqual(['open', 'low', 'high', 'close']);
    expect(lowFirst.ticks.map((tick) => tick.price)).toEqual([97, 95, 110, 104]);

    const equalDistance = createDefaultStrategyOhlcIntrabarContext({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: 1_700_172_800_000,
      chartBarIndex: 9,
      chartBar: { time: 1_700_172_800_000, open: 100, high: 105, low: 95, close: 102, volume: 1_200 },
    });

    expect(equalDistance.ticks.map((tick) => tick.kind)).toEqual(['open', 'low', 'high', 'close']);
  });

  it('selects chart OHLC paths when bar magnifier is disabled', () => {
    const chartBar = { time: 1_700_000_000_000, open: 100, high: 110, low: 95, close: 105, volume: 1_000 };
    const context = selectStrategyIntrabarContext({
      useBarMagnifier: false,
      datafeed: new InMemoryStrategyIntrabarDatafeed(),
      request: {
        symbol: 'BINANCE:BTCUSDT',
        timeframe: '1D',
        chartBarTime: chartBar.time,
        chartBarIndex: 3,
        chartBar,
      },
    });

    expect(context.source).toBe('chart_ohlc');
    expect(context.unavailableReason).toBeUndefined();
    expect(context.ticks.map((tick) => tick.kind)).toEqual(['open', 'low', 'high', 'close']);
  });

  it('falls back to chart OHLC paths with explicit metadata when magnifier data is unavailable', () => {
    const chartBar = { time: 1_700_000_000_000, open: 100, high: 110, low: 95, close: 105, volume: 1_000 };
    const request = {
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 3,
      chartBar,
    };

    const noDatafeed = selectStrategyIntrabarContext({
      useBarMagnifier: true,
      request,
    });
    const missingFixture = selectStrategyIntrabarContext({
      useBarMagnifier: true,
      datafeed: new InMemoryStrategyIntrabarDatafeed(),
      request,
    });

    expect(noDatafeed.source).toBe('chart_ohlc');
    expect(noDatafeed.unavailableReason).toBe('missing_context');
    expect(missingFixture.source).toBe('chart_ohlc');
    expect(missingFixture.unavailableReason).toBe('missing_context');
  });

  it('selects lower-timeframe paths when bar magnifier data is available', () => {
    const chartBar = { time: 1_700_000_000_000, open: 100, high: 110, low: 95, close: 105, volume: 1_000 };
    const datafeed = new InMemoryStrategyIntrabarDatafeed([{
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 3,
      chartBar,
      source: 'lower_timeframe',
      ticks: [
        { time: chartBar.time, price: 100, kind: 'intrabar_open', sequence: 0 },
        { time: chartBar.time + 60_000, price: 109, kind: 'intrabar_high', sequence: 1 },
        { time: chartBar.time + 120_000, price: 98, kind: 'intrabar_low', sequence: 2 },
        { time: chartBar.time + 180_000, price: 105, kind: 'intrabar_close', sequence: 3 },
      ],
    }]);

    const context = selectStrategyIntrabarContext({
      useBarMagnifier: true,
      datafeed,
      request: {
        symbol: 'BINANCE:BTCUSDT',
        timeframe: '1D',
        chartBarTime: chartBar.time,
        chartBarIndex: 3,
        chartBar,
      },
    });

    expect(context.source).toBe('lower_timeframe');
    expect(context.unavailableReason).toBeUndefined();
    expect(context.ticks.map((tick) => tick.kind)).toEqual(['intrabar_open', 'intrabar_high', 'intrabar_low', 'intrabar_close']);

    context.ticks[0].price = 999;
    const second = datafeed.getStrategyIntrabars({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '1D',
      chartBarTime: chartBar.time,
      chartBarIndex: 3,
      chartBar,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.message);
    expect(second.context.ticks[0].price).toBe(100);
  });

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
      useBarMagnifier: false,
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

  it('records and replaces equity curve points when marked with bar metadata', () => {
    const ledger = createStrategyLedger({ initialCapital: 1_000 });
    const order = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 100,
    });
    fillStrategyMarketOrder(ledger, order, 100, 0, 100);

    markStrategyLedgerToMarket(ledger, 105, 110, 95, { barIndex: 0, time: 100 });
    markStrategyLedgerToMarket(ledger, 104, 108, 96, { barIndex: 0, time: 100 });
    markStrategyLedgerToMarket(ledger, 98, 100, 97, { barIndex: 1, time: 200 });

    expect(ledger.equityCurve).toEqual([
      {
        barIndex: 0,
        time: 100,
        equity: 1_004,
        openProfit: 4,
        netProfit: 0,
        drawdown: 0,
        runup: 4,
      },
      {
        barIndex: 1,
        time: 200,
        equity: 998,
        openProfit: -2,
        netProfit: 0,
        drawdown: 6,
        runup: 0,
      },
    ]);
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
    })).toThrow('strategy order requestedQty must be a non-negative number');
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

  it('applies configured slippage ticks to market fills in trade direction', () => {
    const ledger = createStrategyLedger({ slippageTicks: 2 });
    const long = submitStrategyOrder(ledger, {
      id: 'Long',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    });
    const short = submitStrategyOrder(ledger, {
      id: 'Short',
      direction: 'short',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 1,
      time: 2,
    });

    expect(fillStrategyMarketOrder(ledger, long, 100, 0, 1, 0.25)).toMatchObject({
      orderId: 'Long',
      price: 100.5,
      slippage: 0.5,
    });
    expect(fillStrategyMarketOrder(ledger, short, 103, 1, 2, 0.25)).toMatchObject({
      orderId: 'Short',
      price: 102.5,
      slippage: -0.5,
    });
    expect(ledger.closedTrades[0]).toMatchObject({
      entryPrice: 100.5,
      exitPrice: 102.5,
      profit: 2,
    });
  });

  it('normalizes direct ledger slippage settings before fill math', () => {
    const fractionalLedger = createStrategyLedger({ slippageTicks: 1.9 });
    const fractionalOrder = submitStrategyOrder(fractionalLedger, {
      id: 'Fractional',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    });

    expect(fillStrategyMarketOrder(fractionalLedger, fractionalOrder, 100, 0, 1, 0.25)).toMatchObject({
      price: 100.25,
      slippage: 0.25,
    });

    const negativeLedger = createStrategyLedger({ slippageTicks: -2 });
    const negativeOrder = submitStrategyOrder(negativeLedger, {
      id: 'Negative',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      barIndex: 0,
      time: 1,
    });

    expect(fillStrategyMarketOrder(negativeLedger, negativeOrder, 100, 0, 1, 0.25)).toMatchObject({
      price: 100,
      slippage: 0,
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

  it('applies slippage to stop fills but leaves limit fills unchanged', () => {
    const ledger = createStrategyLedger({ slippageTicks: 2 });
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

    const fills = fillPendingStrategyOrders(ledger, 101, 97, 1, 2, 0.25);

    expect(fills.map((fill) => ({ orderId: fill.orderId, price: fill.price, slippage: fill.slippage }))).toEqual([
      { orderId: 'Long limit', price: 100, slippage: 0 },
      { orderId: 'Short stop', price: 97.5, slippage: -0.5 },
    ]);
    expect(limit).toMatchObject({ status: 'filled', avgFillPrice: 100 });
    expect(stop).toMatchObject({ status: 'filled', avgFillPrice: 97.5 });
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

  it('fills only the first OCA order crossed by the ordered execution ticks', () => {
    const ledger = createStrategyLedger();
    const stop = submitStrategyOrder(ledger, {
      id: 'Long stop',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      stopPrice: 105,
      ocaName: 'entry',
      ocaType: 'cancel',
      barIndex: 0,
      time: 1,
    });
    const limit = submitStrategyOrder(ledger, {
      id: 'Long limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      limitPrice: 95,
      ocaName: 'entry',
      ocaType: 'cancel',
      barIndex: 0,
      time: 1,
    });

    const fills = fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 2, price: 100, kind: 'open', sequence: 0 },
      { time: 3, price: 110, kind: 'high', sequence: 1 },
      { time: 4, price: 90, kind: 'low', sequence: 2 },
      { time: 5, price: 100, kind: 'close', sequence: 3 },
    ], 1);

    expect(fills.map((fill) => ({ orderId: fill.orderId, price: fill.price, time: fill.time }))).toEqual([
      { orderId: 'Long stop', price: 105, time: 3 },
    ]);
    expect(stop).toMatchObject({ status: 'filled', avgFillPrice: 105, updatedTime: 3 });
    expect(limit).toMatchObject({ status: 'cancelled', avgFillPrice: null, updatedTime: 3 });
  });

  it('fills opening gap crosses at the current open price', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Gap long limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      limitPrice: 100,
      barIndex: 0,
      time: 1,
    });

    const fills = fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 2, price: 98, kind: 'open', sequence: 0 },
      { time: 3, price: 101, kind: 'high', sequence: 1 },
      { time: 4, price: 97, kind: 'low', sequence: 2 },
      { time: 5, price: 99, kind: 'close', sequence: 3 },
    ], 1);

    expect(fills.map((fill) => ({ orderId: fill.orderId, price: fill.price, time: fill.time }))).toEqual([
      { orderId: 'Gap long limit', price: 98, time: 2 },
    ]);
    expect(order).toMatchObject({ status: 'filled', avgFillPrice: 98 });
  });

  it('fills stop-limit orders after same-bar activation when the ordered path reaches the limit', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Long stop-limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      stopPrice: 102,
      limitPrice: 99,
      barIndex: 0,
      time: 1,
    });

    const fills = fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 2, price: 100, kind: 'open', sequence: 0 },
      { time: 3, price: 103, kind: 'high', sequence: 1 },
      { time: 4, price: 98, kind: 'low', sequence: 2 },
      { time: 5, price: 100, kind: 'close', sequence: 3 },
    ], 1);

    expect(fills.map((fill) => ({ orderId: fill.orderId, price: fill.price, time: fill.time }))).toEqual([
      { orderId: 'Long stop-limit', price: 99, time: 4 },
    ]);
    expect(order).toMatchObject({
      status: 'filled',
      avgFillPrice: 99,
      stopLimitActivated: true,
      stopLimitActivatedBarIndex: 1,
      stopLimitActivatedTime: 3,
      updatedTime: 4,
    });
  });

  it('waits after same-bar stop-limit activation when the limit was crossed earlier in the path', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Long stop-limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      stopPrice: 102,
      limitPrice: 99,
      barIndex: 0,
      time: 1,
    });

    expect(fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 2, price: 100, kind: 'open', sequence: 0 },
      { time: 3, price: 98, kind: 'low', sequence: 1 },
      { time: 4, price: 103, kind: 'high', sequence: 2 },
      { time: 5, price: 100, kind: 'close', sequence: 3 },
    ], 1)).toEqual([]);
    expect(order).toMatchObject({
      status: 'pending',
      stopLimitActivated: true,
      stopLimitActivatedBarIndex: 1,
      stopLimitActivatedTime: 4,
    });
  });

  it('fills activated stop-limit opening gaps against the limit price', () => {
    const ledger = createStrategyLedger();
    const order = submitStrategyOrder(ledger, {
      id: 'Stop limit',
      direction: 'long',
      qty: 1,
      qtyType: 'fixed',
      qtyValue: 1,
      stopPrice: 102,
      limitPrice: 100,
      barIndex: 0,
      time: 1,
    });

    expect(fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 2, price: 101, kind: 'open', sequence: 0 },
      { time: 3, price: 103, kind: 'high', sequence: 1 },
      { time: 4, price: 101, kind: 'low', sequence: 2 },
      { time: 5, price: 101, kind: 'close', sequence: 3 },
    ], 1)).toEqual([]);
    expect(order).toMatchObject({
      status: 'pending',
      stopLimitActivated: true,
      stopLimitActivatedBarIndex: 1,
    });

    const fills = fillPendingStrategyOrdersOnTicks(ledger, [
      { time: 6, price: 98, kind: 'open', sequence: 0 },
      { time: 7, price: 101, kind: 'high', sequence: 1 },
      { time: 8, price: 97, kind: 'low', sequence: 2 },
      { time: 9, price: 99, kind: 'close', sequence: 3 },
    ], 2, 0.25);

    expect(fills.map((fill) => ({ orderId: fill.orderId, price: fill.price, time: fill.time }))).toEqual([
      { orderId: 'Stop limit', price: 98, time: 6 },
    ]);
    expect(order).toMatchObject({ status: 'filled', avgFillPrice: 98 });
  });
});
