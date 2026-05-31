import { describe, it, expect, vi } from 'vitest';
import { TealscriptEngine, executeScript } from './engine';
import { parse } from '../parser/parser';
import type { Bar } from './context';

// Helper to create test bars
function createBars(count: number, startPrice = 100): Bar[] {
  const bars: Bar[] = [];
  const baseTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const price = startPrice + i * 0.5;
    bars.push({
      time: baseTime + i * 60000,
      open: price,
      high: price + 0.5,
      low: price - 0.3,
      close: price + 0.2,
      volume: 1000 + i * 10,
    });
  }

  return bars;
}

function roundSeries(values: Array<number | null>, digits: number = 6): Array<number | null> {
  const factor = 10 ** digits;
  return values.map((value) => (value === null ? null : Math.round(value * factor) / factor));
}

describe('TealscriptEngine', () => {
  describe('Pine strategy declarations', () => {
    it('applies strategy declaration settings to the ledger', () => {
      const script = `//@version=6
strategy("Test strategy",
    overlay=true,
    initial_capital=25000,
    currency="EUR",
    default_qty_type=strategy.percent_of_equity,
    default_qty_value=10,
    pyramiding=2,
    commission_type=strategy.commission.percent,
    commission_value=0.05,
    slippage=1,
    margin_long=50,
    margin_short=60,
    calc_on_order_fills=true,
    calc_on_every_tick=true,
    process_orders_on_close=true)
plot(strategy.equity)
plot(strategy.position_size)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.indicatorTitle).toBe('Test strategy');
      expect(result.strategy.settings).toMatchObject({
        title: 'Test strategy',
        initialCapital: 25000,
        currency: 'EUR',
        defaultQtyType: 'percent_of_equity',
        defaultQtyValue: 10,
        pyramiding: 2,
        commissionType: 'percent',
        commissionValue: 0.05,
        slippageTicks: 1,
        marginLong: 50,
        marginShort: 60,
        calcOnOrderFills: true,
        calcOnEveryTick: true,
        processOrdersOnClose: true,
      });
      expect(result.strategy.equity).toBe(25000);
      expect(result.plots.map((plot) => plot.values)).toEqual([[25000], [0]]);
    });

    it('applies explicit zero and false strategy declaration settings', () => {
      const script = `//@version=6
strategy("Zero settings",
    initial_capital=0,
    default_qty_value=0,
    pyramiding=0,
    commission_value=0,
    slippage=0,
    margin_long=0,
    margin_short=0,
    calc_on_order_fills=false,
    calc_on_every_tick=false,
    process_orders_on_close=false)
plot(strategy.initial_capital)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.settings).toMatchObject({
        initialCapital: 0,
        defaultQtyValue: 0,
        pyramiding: 0,
        commissionValue: 0,
        slippageTicks: 0,
        marginLong: 0,
        marginShort: 0,
        calcOnOrderFills: false,
        calcOnEveryTick: false,
        processOrdersOnClose: false,
      });
      expect(result.strategy.equity).toBe(0);
      expect(result.plots[0]?.values).toEqual([0]);
    });

    it('requires strategy.exit to specify a supported exit price', () => {
      const script = `//@version=6
strategy("Strategy call")
strategy.entry("Long", strategy.long)
strategy.exit("Long exit", "Long")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('strategy.exit requires a limit or stop price');
    });

    it('records strategy entry and order calls as pending ledger orders', () => {
      const script = `//@version=6
strategy("Orders", default_qty_value=1)
strategy.entry("Long", strategy.long, qty=2, limit=101, stop=99, oca_name="grp", oca_type=strategy.oca.cancel, comment="breakout", alert_message="long")
strategy.order("Short", strategy.short)
strategy.cancel("Short")
plot(strategy.equity)`;

      const bars = createBars(1);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders).toHaveLength(2);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        direction: 'long',
        type: 'stop_limit',
        status: 'pending',
        qty: 2,
        qtyType: 'fixed',
        qtyValue: 2,
        filledQty: 0,
        avgFillPrice: null,
        limitPrice: 101,
        stopPrice: 99,
        ocaName: 'grp',
        ocaType: 'cancel',
        comment: 'breakout',
        alertMessage: 'long',
        createdBarIndex: 0,
        createdTime: bars[0].time,
      });
      expect(result.strategy.orders[1]).toMatchObject({
        id: 'Short',
        direction: 'short',
        type: 'market',
        status: 'filled',
        qty: 1,
        qtyType: 'fixed',
        qtyValue: 1,
        filledQty: 1,
        avgFillPrice: bars[0].close,
        updatedBarIndex: 0,
        updatedTime: bars[0].time,
      });
      expect(result.strategy.position).toMatchObject({
        direction: 'short',
        size: -1,
        avgPrice: bars[0].close,
      });
    });

    it('cancels all pending strategy orders', () => {
      const script = `//@version=6
strategy("Orders")
strategy.entry("Long", strategy.long, limit=101)
strategy.entry("Add", strategy.long, qty=3, limit=102)
strategy.cancel_all()`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['cancelled', 'cancelled']);
    });

    it('resolves percent-of-equity default quantity on omitted order qty', () => {
      const script = `//@version=6
strategy("Orders", default_qty_type=strategy.percent_of_equity, default_qty_value=10)
strategy.entry("Long", strategy.long)`;

      const bars = createBars(1);
      const result = executeScript(parse(script), bars);
      const expectedQty = (100000 * 0.10) / bars[0].close;

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        status: 'filled',
        qtyType: 'percent_of_equity',
        qtyValue: 10,
      });
      expect(result.strategy.orders[0]?.qty).toBeCloseTo(expectedQty);
      expect(result.strategy.position.size).toBeCloseTo(expectedQty);
    });

    it('rejects percent-of-equity orders when equity cannot produce a positive quantity', () => {
      const script = `//@version=6
strategy("No equity", initial_capital=0, default_qty_type=strategy.percent_of_equity, default_qty_value=10)
strategy.entry("Long", strategy.long)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors[0]?.message).toBe('strategy order resolved qty must be a positive number');
      expect(result.strategy.orders).toEqual([]);
    });

    it('cancels all pending strategy orders that reuse an id', () => {
      const script = `//@version=6
strategy("Orders")
strategy.entry("Long", strategy.long, limit=101)
strategy.entry("Long", strategy.long, qty=2, limit=102)
strategy.cancel("Long")`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['cancelled', 'cancelled']);
    });

    it('fills fixed-size market strategy orders at the current close', () => {
      const script = `//@version=6
strategy("Orders")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.order("Add", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.position_avg_price)
plot(strategy.opentrades)`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['filled', 'filled']);
      expect(result.strategy.fills.map(({ orderId, direction, qty, price, barIndex }) => ({
        orderId,
        direction,
        qty,
        price,
        barIndex,
      }))).toEqual([
        { orderId: 'Long', direction: 'long', qty: 2, price: bars[0].close, barIndex: 0 },
        { orderId: 'Add', direction: 'long', qty: 1, price: bars[1].close, barIndex: 1 },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: 'long',
        size: 3,
        avgPrice: ((bars[0].close * 2) + bars[1].close) / 3,
      });
      expect(result.strategy.openTrades).toHaveLength(2);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 3],
        [bars[0].close, ((bars[0].close * 2) + bars[1].close) / 3],
        [1, 2],
      ]);
    });

    it('rolls back strategy fills between realtime updateBar calls', () => {
      const script = `//@version=6
strategy("Realtime strategy")
if barstate.islast
    strategy.entry("Last", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open Trades")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.strategy.orders).toHaveLength(1);
      expect(result.strategy.fills).toHaveLength(1);

      const firstUpdate = engine.updateBar(ast, { ...bars[2], close: 200 });
      expect(firstUpdate.find((plot) => plot.title === 'Position')?.values.at(-1)).toBe(1);
      expect(firstUpdate.find((plot) => plot.title === 'Open Trades')?.values.at(-1)).toBe(1);

      const secondUpdate = engine.updateBar(ast, { ...bars[2], close: 300 });
      expect(secondUpdate.find((plot) => plot.title === 'Position')?.values.at(-1)).toBe(1);
      expect(secondUpdate.find((plot) => plot.title === 'Open Trades')?.values.at(-1)).toBe(1);
    });

    it('closes matching entry trades with strategy.close market orders', () => {
      const script = `//@version=6
strategy("Close")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Long", qty=1, comment="reduce", alert_message="close")
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)
plot(strategy.netprofit)`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        status: order.status,
        qty: order.qty,
        fromEntry: order.fromEntry,
      }))).toEqual([
        { id: 'Long', direction: 'long', status: 'filled', qty: 2, fromEntry: undefined },
        { id: 'Close Long', direction: 'short', status: 'filled', qty: 1, fromEntry: 'Long' },
      ]);
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        exitOrderId: 'Close Long',
        qty: 1,
        entryPrice: bars[0].close,
        exitPrice: bars[1].close,
        profit: bars[1].close - bars[0].close,
      });
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 1],
        [1, 1],
        [0, 1],
        [0, bars[1].close - bars[0].close],
      ]);
    });

    it('closes the full net position with strategy.close_all', () => {
      const script = `//@version=6
strategy("Close all")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.close_all(comment="flat")
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Close All']);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.openTrades).toEqual([]);
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 0],
        [1, 0],
        [0, 1],
      ]);
    });

    it('records strategy.exit limit and stop brackets as pending exit orders', () => {
      const script = `//@version=6
strategy("Exit brackets")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.exit("Bracket", "Long", qty_percent=50, limit=102, stop=99, comment_profit="tp", comment_loss="sl")
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        type: order.type,
        status: order.status,
        qty: order.qty,
        fromEntry: order.fromEntry,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        comment: order.comment,
      }))).toEqual([
        {
          id: 'Long',
          direction: 'long',
          type: 'market',
          status: 'filled',
          qty: 2,
          fromEntry: undefined,
          limitPrice: undefined,
          stopPrice: undefined,
          comment: undefined,
        },
        {
          id: 'Bracket Limit',
          direction: 'short',
          type: 'limit',
          status: 'pending',
          qty: 1,
          fromEntry: 'Long',
          limitPrice: 102,
          stopPrice: undefined,
          comment: 'tp',
        },
        {
          id: 'Bracket Stop',
          direction: 'short',
          type: 'stop',
          status: 'pending',
          qty: 1,
          fromEntry: 'Long',
          limitPrice: undefined,
          stopPrice: 99,
          comment: 'sl',
        },
      ]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 2],
        [1, 1],
        [0, 0],
      ]);
    });

    it('updates an existing pending strategy.exit order with the same id', () => {
      const script = `//@version=6
strategy("Exit updates")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Target", "Long", limit=102)
if bar_index == 2
    strategy.exit("Target", "Long", limit=103)
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        limitPrice: order.limitPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', limitPrice: undefined, updatedBarIndex: 0 },
        { id: 'Target', status: 'pending', limitPrice: 103, updatedBarIndex: 2 },
      ]);
    });

    it('cancels stale strategy.exit orders when switching between single and bracket exits', () => {
      const script = `//@version=6
strategy("Exit shape updates")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Target", "Long", limit=102)
if bar_index == 2
    strategy.exit("Target", "Long", limit=103, stop=99)
if bar_index == 3
    strategy.exit("Target", "Long", stop=98)
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(4));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', type: 'market', status: 'filled', limitPrice: undefined, stopPrice: undefined, updatedBarIndex: 0 },
        { id: 'Target', type: 'limit', status: 'cancelled', limitPrice: 102, stopPrice: undefined, updatedBarIndex: 2 },
        { id: 'Target Limit', type: 'limit', status: 'cancelled', limitPrice: 103, stopPrice: undefined, updatedBarIndex: 3 },
        { id: 'Target Stop', type: 'stop', status: 'cancelled', limitPrice: undefined, stopPrice: 99, updatedBarIndex: 3 },
        { id: 'Target', type: 'stop', status: 'pending', limitPrice: undefined, stopPrice: 98, updatedBarIndex: 3 },
      ]);
    });

    it('fills pending limit entry orders on later bars when price crosses', () => {
      const script = `//@version=6
strategy("Limit fill")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=100.3)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        type: 'limit',
        status: 'filled',
        avgFillPrice: 100.3,
        updatedBarIndex: 1,
      });
      expect(result.strategy.position).toMatchObject({
        direction: 'long',
        size: 1,
        avgPrice: 100.3,
      });
      expect(result.plots[0]?.values).toEqual([0, 0, 1]);
    });

    it('resolves cash default quantity using limit order price basis', () => {
      const script = `//@version=6
strategy("Cash sizing", default_qty_type=strategy.cash, default_qty_value=1000)
if bar_index == 0
    strategy.entry("Long", strategy.long, limit=100.3)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        qtyType: 'cash',
        qtyValue: 1000,
        status: 'filled',
        avgFillPrice: 100.3,
      });
      expect(result.strategy.orders[0]?.qty).toBeCloseTo(1000 / 100.3);
      expect(result.strategy.position.size).toBeCloseTo(1000 / 100.3);
      expect(result.plots[0]?.values.map((value) => (value === null ? null : Math.round(value * 1000) / 1000))).toEqual([
        0,
        0,
        Math.round((1000 / 100.3) * 1000) / 1000,
      ]);
    });

    it('blocks same-direction strategy.entry calls above the pyramiding limit', () => {
      const script = `//@version=6
strategy("Pyramiding default")
if bar_index == 0
    strategy.entry("First", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("Second", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['First']);
      expect(result.strategy.position.size).toBe(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 1],
        [1, 1],
      ]);
    });

    it('allows additional strategy.entry calls up to the pyramiding setting', () => {
      const script = `//@version=6
strategy("Pyramiding allowed", pyramiding=1)
if bar_index == 0
    strategy.entry("First", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("Second", strategy.long, qty=1)
if bar_index == 2
    strategy.entry("Third", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['First', 'Second']);
      expect(result.strategy.position.size).toBe(2);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 2, 2],
        [1, 2, 2],
      ]);
    });

    it('reverses positions when strategy.entry submits the opposite direction', () => {
      const script = `//@version=6
strategy("Entry reversal")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("Short", strategy.short, qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        qty: order.qty,
        status: order.status,
      }))).toEqual([
        { id: 'Long', direction: 'long', qty: 2, status: 'filled' },
        { id: 'Short', direction: 'short', qty: 3, status: 'filled' },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: 'short',
        size: -1,
        avgPrice: bars[1].close,
      });
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.strategy.openTrades).toHaveLength(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, -1],
        [1, 1],
        [0, 1],
      ]);
    });

    it('does not auto-reverse raw strategy.order calls', () => {
      const script = `//@version=6
strategy("Order no reversal")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.order("Short", strategy.short, qty=1)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({ id: order.id, qty: order.qty }))).toEqual([
        { id: 'Long', qty: 2 },
        { id: 'Short', qty: 1 },
      ]);
      expect(result.strategy.position.size).toBe(1);
      expect(result.plots[0]?.values).toEqual([2, 1]);
    });

    it('fills strategy.exit brackets and cancels the sibling OCA order', () => {
      const script = `//@version=6
strategy("Exit bracket fill")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=101.4, stop=99)
plot(strategy.position_size)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', type: 'market', status: 'filled', avgFillPrice: 100.2, updatedBarIndex: 0 },
        { id: 'Bracket Limit', type: 'limit', status: 'filled', avgFillPrice: 101.4, updatedBarIndex: 2 },
        { id: 'Bracket Stop', type: 'stop', status: 'cancelled', avgFillPrice: null, updatedBarIndex: 2 },
      ]);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        exitOrderId: 'Bracket Limit',
        entryPrice: 100.2,
        exitPrice: 101.4,
      });
      expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(1.2);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 1, 1],
        [0, 0, 0],
      ]);
    });

    it('keeps strategy.exit OCA cancellation scoped to from_entry', () => {
      const script = `//@version=6
strategy("OCA scope", pyramiding=1)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
    strategy.entry("B", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "A", limit=101.4, stop=99)
    strategy.exit("Bracket", "B", limit=110, stop=99)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        fromEntry: order.fromEntry,
        status: order.status,
        ocaName: order.ocaName,
      }))).toEqual([
        { id: 'A', fromEntry: undefined, status: 'filled', ocaName: undefined },
        { id: 'B', fromEntry: undefined, status: 'filled', ocaName: undefined },
        { id: 'Bracket Limit', fromEntry: 'A', status: 'filled', ocaName: 'A:Bracket' },
        { id: 'Bracket Stop', fromEntry: 'A', status: 'cancelled', ocaName: 'A:Bracket' },
        { id: 'Bracket Limit', fromEntry: 'B', status: 'pending', ocaName: 'B:Bracket' },
        { id: 'Bracket Stop', fromEntry: 'B', status: 'pending', ocaName: 'B:Bracket' },
      ]);
    });

    it('does not fill updated strategy.exit prices until a later bar', () => {
      const script = `//@version=6
strategy("Exit activation")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Target", "Long", limit=110)
if bar_index == 2
    strategy.exit("Target", "Long", limit=101.4)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(4));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        limitPrice: order.limitPrice,
        activationBarIndex: order.activationBarIndex,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', limitPrice: undefined, activationBarIndex: 0, updatedBarIndex: 0 },
        { id: 'Target', status: 'filled', limitPrice: 101.4, activationBarIndex: 2, updatedBarIndex: 3 },
      ]);
      expect(result.strategy.closedTrades[0]?.exitBarIndex).toBe(3);
    });
  });

  describe('user-defined types', () => {
    it('constructs objects and reads fields', () => {
      const script = `//@version=6
indicator("UDT Constructor")
type pivotPoint
    int x
    float y
    float strength = 1.5
point = pivotPoint.new(bar_index, close)
plot(point.x, title="X")
plot(point.y, title="Y")
plot(point.strength, title="Strength")`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'X')?.values).toEqual([0, 1, 2]);
      expect(result.plots.find((plot) => plot.title === 'Y')?.values).toEqual([100.2, 100.7, 101.2]);
      expect(result.plots.find((plot) => plot.title === 'Strength')?.values).toEqual([1.5, 1.5, 1.5]);
    });

    it('supports named constructor arguments and field reassignment', () => {
      const script = `//@version=6
indicator("UDT Fields")
type accumulator
    float total = 0
    float last = na
var acc = accumulator.new(last=close)
acc.total += close
acc.last := close
plot(acc.total, title="Total")
plot(acc.last, title="Last")`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Total')?.values).toEqual([100.2, 200.9, 302.1]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([100.2, 100.7, 101.2]);
    });

    it('uses reference semantics for assigned objects', () => {
      const script = `//@version=6
indicator("UDT References")
type boxState
    float value = 0
left = boxState.new(1)
right = left
right.value := 5
plot(left.value, title="Left")
plot(right.value, title="Right")`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Left')?.values).toEqual([5]);
      expect(result.plots.find((plot) => plot.title === 'Right')?.values).toEqual([5]);
    });

    it('rolls back realtime field mutations between updateBar calls', () => {
      const script = `//@version=6
indicator("UDT Rollback")
type state
    float last = na
    float firstUpdate = na
var s = state.new()
if barstate.islast and barstate.isrealtime
    if na(s.firstUpdate)
        s.firstUpdate := close
    s.last := close
plot(s.last, title="Last")
plot(s.firstUpdate, title="First Update")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);
      expect(result.errors).toEqual([]);

      const plots1 = engine.updateBar(ast, { ...bars[4], close: 200 });
      expect(plots1.find((plot) => plot.title === 'Last')?.values.at(-1)).toBe(200);
      expect(plots1.find((plot) => plot.title === 'First Update')?.values.at(-1)).toBe(200);

      const plots2 = engine.updateBar(ast, { ...bars[4], close: 300 });
      expect(plots2.find((plot) => plot.title === 'Last')?.values.at(-1)).toBe(300);
      expect(plots2.find((plot) => plot.title === 'First Update')?.values.at(-1)).toBe(300);
    });

    it('preserves shared UDT identity after realtime rollback', () => {
      const script = `//@version=6
indicator("UDT Shared Rollback")
type state
    float value = 0
var left = state.new()
var right = left
if barstate.islast and barstate.isrealtime
    right.value := close
plot(left.value, title="Left")
plot(right.value, title="Right")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);
      expect(result.errors).toEqual([]);

      const plots = engine.updateBar(ast, { ...bars[4], close: 200 });
      expect(plots.find((plot) => plot.title === 'Left')?.values.at(-1)).toBe(200);
      expect(plots.find((plot) => plot.title === 'Right')?.values.at(-1)).toBe(200);
    });

    it('preserves varip UDT fields across realtime rollback', () => {
      const script = `//@version=6
indicator("UDT Varip Field")
type state
    varip int ticks = 0
    float last = na
var s = state.new()
if barstate.islast and barstate.isrealtime
    s.ticks += 1
    s.last := close
plot(s.ticks, title="Ticks")
plot(s.last, title="Last")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);
      expect(result.errors).toEqual([]);

      const plots1 = engine.updateBar(ast, { ...bars[4], close: 200 });
      expect(plots1.find((plot) => plot.title === 'Ticks')?.values.at(-1)).toBe(1);
      expect(plots1.find((plot) => plot.title === 'Last')?.values.at(-1)).toBe(200);

      const plots2 = engine.updateBar(ast, { ...bars[4], close: 300 });
      expect(plots2.find((plot) => plot.title === 'Ticks')?.values.at(-1)).toBe(2);
      expect(plots2.find((plot) => plot.title === 'Last')?.values.at(-1)).toBe(300);
    });
  });

  describe('basic execution', () => {
    it('executes a simple script', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.indicatorTitle).toBe('Test');
      expect(result.errors).toHaveLength(0);
    });

    it('returns plot outputs', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close Price")`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.plots.length).toBeGreaterThan(0);
      const closePlot = result.plots.find((p) => p.title === 'Close Price');
      expect(closePlot).toBeDefined();
      expect(closePlot!.values.length).toBe(10);
    });

    it('records indicator max_bars_back metadata', () => {
      const script = `//@version=6
indicator("Buffered", max_bars_back=500)
plot(close[3])`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorMaxBarsBack).toBe(500);
      expect(result.plots[0].values).toEqual([null, null, null, 100.2, 100.7]);
    });

    it('reports invalid indicator max_bars_back values', () => {
      const script = `//@version=6
indicator("Buffered", max_bars_back=-1)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('indicator max_bars_back must be a non-negative integer');
    });

    it('exposes Pine barstate booleans through member access', () => {
      const script = `//@version=6
indicator("Barstate")
plot(barstate.isfirst ? 1 : 0, title="First")
plot(barstate.islast ? 1 : 0, title="Last")
plot(barstate.ishistory ? 1 : 0, title="History")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
plot(barstate.isnew ? 1 : 0, title="New")
plot(barstate.isconfirmed ? 1 : 0, title="Confirmed")
plot(barstate.islastconfirmedhistory ? 1 : 0, title="Last Confirmed History")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([1, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([0, 0, 1]);
      expect(result.plots.find((plot) => plot.title === 'History')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Realtime')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'New')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Confirmed')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Last Confirmed History')?.values).toEqual([0, 0, 1]);
    });

    it('exposes Pine calendar variables and timestamp helpers', () => {
      const script = `//@version=6
indicator("Calendar")
plot(year, title="Year")
plot(month, title="Month")
plot(dayofmonth, title="Day")
plot(dayofweek == dayofweek.friday ? 1 : 0, title="Friday")
plot(hour, title="Hour")
plot(minute, title="Minute")
plot(second, title="Second")
plot(timestamp("GMT+2", 2024, 1, 5, 9, 30), title="Timestamp")
plot(hour(timestamp("GMT+2", 2024, 1, 5, 9, 30), "GMT+2"), title="Timestamp Hour")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 7, 30, 15), open: 1, high: 2, low: 1, close: 2, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Year')?.values).toEqual([2024]);
      expect(result.plots.find((plot) => plot.title === 'Month')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Day')?.values).toEqual([5]);
      expect(result.plots.find((plot) => plot.title === 'Friday')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Hour')?.values).toEqual([7]);
      expect(result.plots.find((plot) => plot.title === 'Minute')?.values).toEqual([30]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([15]);
      expect(result.plots.find((plot) => plot.title === 'Timestamp')?.values).toEqual([Date.UTC(2024, 0, 5, 7, 30)]);
      expect(result.plots.find((plot) => plot.title === 'Timestamp Hour')?.values).toEqual([9]);
    });

    it('supports IANA timezones in calendar, timestamp, and format helpers', () => {
      const script = `//@version=6
indicator("IANA Timezones")
nyStamp = timestamp("America/New_York", 2024, 1, 5, 9, 30)
summerStamp = timestamp("America/New_York", 2024, 7, 5, 9, 30)
plot(hour(time, "America/New_York"), title="NY Hour")
plot(hour(nyStamp, "America/New_York"), title="NY Timestamp Hour")
plot(nyStamp, title="NY Timestamp")
plot(summerStamp, title="NY Summer Timestamp")
plot(hour(timestamp("America/New_York", 2024, 3, 10, 2, 30), "America/New_York"), title="NY DST Gap Hour")
plot(minute(timestamp("America/New_York", 2024, 3, 10, 2, 30), "America/New_York"), title="NY DST Gap Minute")
plot(str.format_time(time, "yyyy-MM-dd HH:mm:ss", "America/New_York") == "2024-01-05 09:30:00" ? 1 : 0, title="Formatted NY")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 14, 30), open: 1, high: 2, low: 1, close: 2, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'NY Hour')?.values).toEqual([9]);
      expect(result.plots.find((plot) => plot.title === 'NY Timestamp Hour')?.values).toEqual([9]);
      expect(result.plots.find((plot) => plot.title === 'NY Timestamp')?.values).toEqual([Date.UTC(2024, 0, 5, 14, 30)]);
      expect(result.plots.find((plot) => plot.title === 'NY Summer Timestamp')?.values).toEqual([Date.UTC(2024, 6, 5, 13, 30)]);
      expect(result.plots.find((plot) => plot.title === 'NY DST Gap Hour')?.values).toEqual([3]);
      expect(result.plots.find((plot) => plot.title === 'NY DST Gap Minute')?.values).toEqual([30]);
      expect(result.plots.find((plot) => plot.title === 'Formatted NY')?.values).toEqual([1]);
    });

    it('exposes timenow as a runtime timestamp series', () => {
      const script = `//@version=6
indicator("Time Now")
plot(timenow, title="Now")
plot(timenow[1], title="Previous Now")`;

      const now = Date.UTC(2024, 0, 5, 8, 15);
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
      try {
        const ast = parse(script);
        const bars = createBars(3, 100);
        const result = executeScript(ast, bars);

        expect(result.errors).toHaveLength(0);
        expect(result.plots.find((plot) => plot.title === 'Now')?.values).toEqual([now, now, now]);
        expect(result.plots.find((plot) => plot.title === 'Previous Now')?.values).toEqual([null, now, now]);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('refreshes timenow for realtime bar updates', () => {
      const script = `//@version=6
indicator("Realtime Time Now")
plot(timenow, title="Now")`;

      const historicalNow = Date.UTC(2024, 0, 5, 8, 15);
      const realtimeNow = Date.UTC(2024, 0, 5, 8, 16);
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(historicalNow);
      try {
        const ast = parse(script);
        const bars = createBars(2, 100);
        const engine = new TealscriptEngine();
        const result = engine.execute(ast, bars);

        expect(result.plots.find((plot) => plot.title === 'Now')?.values).toEqual([historicalNow, historicalNow]);

        nowSpy.mockReturnValue(realtimeNow);
        const plots = engine.updateBar(ast, { ...bars[1], close: 101.5 });

        expect(plots.find((plot) => plot.title === 'Now')?.values).toEqual([historicalNow, realtimeNow]);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('evaluates Pine time and time_close session filters', () => {
      const script = `//@version=6
indicator("Sessions")
plot(time, title="Open Time")
plot(time_close, title="Close Time")
plot(last_bar_time, title="Last Bar Time")
plot(time_close[1], title="Previous Close Time")
plot(time("60", "1430-1600") == time ? 1 : 0, title="In Session")
plot(na(time("60", "1600-1700")) ? 1 : 0, title="Out Session")
plot(time_close("30", "1430-1600"), title="Filtered Close")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 14, 0), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 14, 30), open: 2, high: 3, low: 2, close: 3, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 16, 0), open: 3, high: 4, low: 3, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Open Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 14, 0),
        Date.UTC(2024, 0, 5, 14, 30),
        Date.UTC(2024, 0, 5, 16, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Close Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 15, 0),
        Date.UTC(2024, 0, 5, 15, 30),
        Date.UTC(2024, 0, 5, 17, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Last Bar Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Previous Close Time')?.values).toEqual([
        null,
        Date.UTC(2024, 0, 5, 15, 0),
        Date.UTC(2024, 0, 5, 15, 30),
      ]);
      expect(result.plots.find((plot) => plot.title === 'In Session')?.values).toEqual([0, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Out Session')?.values).toEqual([1, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Filtered Close')?.values).toEqual([null, Date.UTC(2024, 0, 5, 15, 0), null]);
    });

    it('exposes Pine syminfo and timeframe values through member access', () => {
      const script = `//@version=6
indicator("Chart Info")
plot(str.length(syminfo.ticker), title="Ticker Length")
plot(str.length(syminfo.tickerid), title="Ticker ID Length")
plot(str.length(syminfo.root), title="Root Length")
plot(syminfo.mintick, title="Min Tick")
plot(syminfo.minmove, title="Min Move")
plot(timeframe.multiplier, title="Timeframe Multiplier")
plot(str.length(timeframe.period), title="Timeframe Period Length")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.isdwm ? 1 : 0, title="DWM")
plot(str.length(timeframe.main_period), title="Main Period Length")
plot(timeframe.in_seconds(), title="Current Seconds")
plot(timeframe.in_seconds("1D"), title="Daily Seconds")
plot(timeframe.in_seconds("15"), title="Minute Seconds")
plot(timeframe.in_seconds("bad"), title="Invalid Seconds")`;

      const ast = parse(script);
      const bars = createBars(2);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Ticker Length')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Ticker ID Length')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Root Length')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Min Tick')?.values).toEqual([0.01, 0.01]);
      expect(result.plots.find((plot) => plot.title === 'Min Move')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Timeframe Multiplier')?.values).toEqual([60, 60]);
      expect(result.plots.find((plot) => plot.title === 'Timeframe Period Length')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Intraday')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'DWM')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Main Period Length')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Current Seconds')?.values).toEqual([3600, 3600]);
      expect(result.plots.find((plot) => plot.title === 'Daily Seconds')?.values).toEqual([86400, 86400]);
      expect(result.plots.find((plot) => plot.title === 'Minute Seconds')?.values).toEqual([900, 900]);
      expect(result.plots.find((plot) => plot.title === 'Invalid Seconds')?.values).toEqual([null, null]);
    });

    it('keeps multiple untitled plots as separate series', () => {
      const script = `//@version=6
indicator("Test")
plot(open, color=color.blue)
plot(high, color=color.green)
plot(low, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(3);
      expect(result.plots.map((plot) => plot.id)).toEqual([
        'plot_untitled_0',
        'plot_untitled_1',
        'plot_untitled_2',
      ]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5, 101],
        [100.5, 101, 101.5],
        [99.7, 100.2, 100.7],
      ]);
    });

    it('does not collide untitled plot ids with explicit numeric titles', () => {
      const script = `//@version=6
indicator("Test")
plot(open)
plot(high, title="0")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.map((plot) => plot.id)).toEqual(['plot_untitled_0', 'plot_0']);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5],
        [100.5, 101],
      ]);
    });

    it('collects alertcondition output values', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green bar", message="Close is above open")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alertcondition_Green bar',
        type: 'alertcondition',
        title: 'Green bar',
        message: 'Close is above open',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events).toEqual([]);
    });

    it('aligns conditional alertcondition output to bar indexes', () => {
      const script = `//@version=6
indicator("Alerts")
if bar_index >= 2
    alertcondition(true, title="Late", message="late condition")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].values).toEqual([null, null, true, true, true]);
    });

    it('renders alertcondition OHLCV and chart placeholders per triggered bar', () => {
      const script = `//@version=6
indicator("Alerts", timeframe="15")
alertcondition(close > open, title="Green", message="{{ticker}} {{exchange}} {{interval}} {{open}} {{high}} {{low}} {{close}} {{volume}}")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts[0]).toMatchObject({
        title: 'Green',
        message: '{{ticker}} {{exchange}} {{interval}} {{open}} {{high}} {{low}} {{close}} {{volume}}',
      });
      expect(result.alerts[0].values).toEqual([true, true]);
      expect(result.alerts[0].renderedMessages).toEqual([
        'BTCUSDT  15 100 100.5 99.7 100.2 1000',
        'BTCUSDT  15 100.5 101 100.2 100.7 1010',
      ]);
    });

    it('renders alertcondition plot placeholders by index and title', () => {
      const script = `//@version=6
indicator("Alerts")
basis = close + 1
plot(basis, title="Basis")
alertcondition(true, title="Plot alert", message='basis={{plot_0}} named={{plot("Basis")}} missing={{plot_9}}')`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts[0].renderedMessages).toEqual([
        'basis=101.2 named=101.2 missing={{plot_9}}',
        'basis=101.7 named=101.7 missing={{plot_9}}',
      ]);
    });

    it('collects direct alert events with frequency constants', () => {
      const script = `//@version=6
indicator("Alerts")
if close > open
    alert("Green bar", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alert_alert_4_5',
        type: 'alert',
        title: 'alert',
        message: 'Green bar',
        frequency: 'once_per_bar_close',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 1, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 2, message: 'Green bar', frequency: 'once_per_bar_close' },
      ]);
    });

    it('emits all alert events when using freq_all', () => {
      const script = `//@version=6
indicator("Alerts")
alert("First", alert.freq_all)
alert("Second", alert.freq_all)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const events = result.alerts.flatMap((alert) => alert.events);
      expect(events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      })).sort((left, right) => left.barIndex - right.barIndex || left.message.localeCompare(right.message))).toEqual([
        { barIndex: 0, message: 'First', frequency: 'all' },
        { barIndex: 0, message: 'Second', frequency: 'all' },
        { barIndex: 1, message: 'First', frequency: 'all' },
        { barIndex: 1, message: 'Second', frequency: 'all' },
      ]);
    });

    it('emits once per non-all alert call site per bar', () => {
      const script = `//@version=6
indicator("Alerts")
alert("First", alert.freq_once_per_bar)
alert("Second", alert.freq_once_per_bar)
alert("Close", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const events = result.alerts.flatMap((alert) => alert.events);
      expect(events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'First', frequency: 'once_per_bar' },
        { barIndex: 1, message: 'First', frequency: 'once_per_bar' },
        { barIndex: 0, message: 'Second', frequency: 'once_per_bar' },
        { barIndex: 1, message: 'Second', frequency: 'once_per_bar' },
        { barIndex: 0, message: 'Close', frequency: 'once_per_bar_close' },
        { barIndex: 1, message: 'Close', frequency: 'once_per_bar_close' },
      ]);
    });

    it('suppresses repeated execution of the same non-all alert call site per bar', () => {
      const script = `//@version=6
indicator("Alerts")
for i = 0 to 2
    alert("Loop", alert.freq_once_per_bar)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const events = result.alerts.flatMap((alert) => alert.events);
      expect(events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'Loop', frequency: 'once_per_bar' },
        { barIndex: 1, message: 'Loop', frequency: 'once_per_bar' },
      ]);
    });

    it('suppresses once-per-bar-close alerts on unconfirmed realtime updates', () => {
      const script = `//@version=6
indicator("Alerts")
alert("Close", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.alerts[0]?.events.map((event) => event.barIndex)).toEqual([0, 1, 2]);

      const updatedBar = { ...bars[2], close: bars[2].close + 1 };
      engine.updateBar(ast, updatedBar);

      const alerts = engine.getAlerts();
      expect(alerts[0]?.values).toEqual([true, true]);
      expect(alerts[0]?.events.map((event) => event.barIndex)).toEqual([0, 1]);
    });

    it('marks direct alert events from realtime bar updates', () => {
      const script = `//@version=6
indicator("Alerts")
alert("Tick", alert.freq_once_per_bar)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.alerts[0]?.events.map((event) => ({
        barIndex: event.barIndex,
        isRealtime: event.isRealtime,
      }))).toEqual([
        { barIndex: 0, isRealtime: false },
        { barIndex: 1, isRealtime: false },
        { barIndex: 2, isRealtime: false },
      ]);

      const updatedBar = { ...bars[2], close: bars[2].close + 1 };
      engine.updateBar(ast, updatedBar);

      expect(engine.getAlerts()[0]?.events.map((event) => ({
        barIndex: event.barIndex,
        isRealtime: event.isRealtime,
      }))).toEqual([
        { barIndex: 0, isRealtime: false },
        { barIndex: 1, isRealtime: false },
        { barIndex: 2, isRealtime: true },
      ]);
    });

    it('dispatches array method calls to array builtins', () => {
      const script = `//@version=6
indicator("Array Methods")
var array<float> values = array.new_float()
values.push(close)
values.unshift(open)
first = values.shift()
lastIndex = values.size() - 1
last = values.get(lastIndex)
values.set(0, 42)
plot(first, title="First")
plot(last, title="Last")
plot(values.get(0), title="Head")
plot(values.size(), title="Size")
values.clear()`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([100, 100.5, 101]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([100.2, 100.7, 101.2]);
      expect(result.plots.find((plot) => plot.title === 'Head')?.values).toEqual([42, 42, 42]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([1, 1, 1]);
    });

    it('executes extended array helpers and methods', () => {
      const script = `//@version=6
indicator("Array Extras")
values = array.from(3, 5, 3)
copy = values.copy()
copy.insert(1, 4)
removed = copy.remove(2)
plot(values.first(), title="First")
plot(values.last(), title="Last")
plot(values.includes(5) ? 1 : 0, title="Includes")
plot(values.indexof(3), title="Index")
plot(values.lastindexof(3), title="Last Index")
plot(copy.sum(), title="Sum")
plot(copy.avg(), title="Avg")
plot(copy.min(), title="Min")
plot(copy.max(), title="Max")
plot(removed, title="Removed")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Includes')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Index')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Last Index')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Avg')?.values).toEqual([10 / 3, 10 / 3]);
      expect(result.plots.find((plot) => plot.title === 'Min')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Max')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Removed')?.values).toEqual([5, 5]);
    });

    it('fills arrays by optional index range', () => {
      const script = `//@version=6
indicator("Array Fill")
values = array.from(1, 2, 3, 4)
array.fill(values, 9, 1, 3)
plot(values.get(0), title="First")
plot(values.get(1), title="Filled A")
plot(values.get(2), title="Filled B")
plot(values.get(3), title="Last")
values.fill(5)
plot(values.sum(), title="Method Filled Sum")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Filled A')?.values).toEqual([9, 9, 9]);
      expect(result.plots.find((plot) => plot.title === 'Filled B')?.values).toEqual([9, 9, 9]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([4, 4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Method Filled Sum')?.values).toEqual([20, 20, 20]);
    });

    it('fills arrays from the start, to the end, and rejects invalid bounds', () => {
      const validScript = `//@version=6
indicator("Array Fill Bounds")
values = array.from(1, 2, 3, 4)
array.fill(values, 8, 0, 2)
array.fill(values, 7, 2)
values.fill(6, 2, 2)
withNa = array.from(1, na, 3)
withNa.fill(5, 1)
plot(values.get(0), title="First")
plot(values.get(1), title="Second")
plot(values.get(2), title="Third")
plot(values.get(3), title="Fourth")
plot(withNa.sum(), title="Filled NA")`;

      const result = executeScript(parse(validScript), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([8, 8]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([8, 8]);
      expect(result.plots.find((plot) => plot.title === 'Third')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Fourth')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Filled NA')?.values).toEqual([11, 11]);

      const invalidScripts = [
        'array.fill(values, 9, -1, 2)',
        'array.fill(values, 9, 0, 5)',
        'array.fill(values, 9, 3, 2)',
        'array.fill(values, 9, na, 2)',
      ];

      for (const fillCall of invalidScripts) {
        const invalidResult = executeScript(parse(`//@version=6
indicator("Invalid Fill")
values = array.from(1, 2, 3, 4)
${fillCall}
plot(values.get(0))`), createBars(1, 100));

        expect(invalidResult.errors[0]?.message).toBe('Array fill indices are out of bounds');
      }
    });

    it('executes array ordering helpers and methods', () => {
      const script = `//@version=6
indicator("Array Ordering")
values = array.from(3, 1, 2)
values.sort(order.descending)
top = values.get(0)
values.reverse()
bottom = values.get(0)
more = array.from(4, 5)
values.concat(more)
joined = values.join("|")
plot(top, title="Top")
plot(bottom, title="Bottom")
plot(joined == "1|2|3|4|5" ? 1 : 0, title="Joined")
plot(values.size(), title="Size")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Top')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Bottom')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Joined')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([5, 5]);
    });

    it('executes array slice windows', () => {
      const script = `//@version=6
indicator("Array Slice")
values = array.from(0, 1, 2, 3)
window = values.slice(0, 3)
removed = values.remove(0)
window.push(4)
window.set(1, 20)
plot(window.get(0), title="Window First")
plot(window.get(1), title="Window Second")
plot(values.size(), title="Parent Size")
plot(values.get(3), title="Parent Tail")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Window First')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Window Second')?.values).toEqual([20, 20]);
      expect(result.plots.find((plot) => plot.title === 'Parent Size')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Parent Tail')?.values).toEqual([4, 4]);
    });

    it('executes array index reads and assignments', () => {
      const script = `//@version=6
indicator("Array Index Assignment")
values = array.from(1, 2, 3)
values[0] := 10
values[1] += 5
literal = [4, 5, 6]
literal[2] *= 2
plot(values[0], title="First")
plot(values[1], title="Second")
plot(literal[2], title="Literal")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Literal')?.values).toEqual([12, 12]);
    });

    it('executes array slice index assignment against the parent array', () => {
      const script = `//@version=6
indicator("Array Slice Index Assignment")
values = array.from(1, 2, 3, 4)
window = values.slice(1, 3)
window[0] := 20
window[1] += 7
plot(values[1], title="Parent First")
plot(values[2], title="Parent Second")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Parent First')?.values).toEqual([20, 20]);
      expect(result.plots.find((plot) => plot.title === 'Parent Second')?.values).toEqual([10, 10]);
    });

    it('keeps array index access distinct from series history access', () => {
      const script = `//@version=6
indicator("Array Index History")
values = array.from(10, 20)
spread = close - open
plot(values[0], title="Array First")
plot(close[1], title="Previous Close")
plot(spread[1], title="Previous Spread")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Array First')?.values).toEqual([10, 10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Previous Close')?.values).toEqual([null, 100.2, 100.7]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Previous Spread')?.values ?? [])).toEqual([null, 0.2, 0.2]);
    });

    it('rejects invalid array index assignments', () => {
      const nonArrayScript = `//@version=6
indicator("Non Array Assignment")
close[0] := 1
plot(close)`;
      const nonArrayResult = executeScript(parse(nonArrayScript), createBars(1, 100));
      expect(nonArrayResult.errors[0]?.message).toBe('Index assignment expects an array');

      const nonFiniteScript = `//@version=6
indicator("Non Finite Index Assignment")
values = array.from(1, 2)
values[na] := 1
plot(values[0])`;
      const nonFiniteResult = executeScript(parse(nonFiniteScript), createBars(1, 100));
      expect(nonFiniteResult.errors[0]?.message).toBe('Array assignment index must be a finite non-negative number');

      const outOfBoundsScript = `//@version=6
indicator("Out Of Bounds Assignment")
values = array.from(1, 2)
values[9] := 1
plot(values[0])`;
      const outOfBoundsResult = executeScript(parse(outOfBoundsScript), createBars(1, 100));
      expect(outOfBoundsResult.errors[0]?.message).toBe('Array index 9 is out of bounds. Array size is 2');
    });

    it('iterates array slice windows', () => {
      const script = `//@version=6
indicator("Array Slice Loop")
values = array.from(1, 2, 3, 4)
window = values.slice(1, 3)
total = 0
for value in window
    total += value
indexed = 0
for [index, value] in window
    indexed += index + value
plot(total, title="Total")
plot(indexed, title="Indexed")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Total')?.values).toEqual([5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Indexed')?.values).toEqual([6, 6]);
    });

    it('returns expression results from user function if branches', () => {
      const script = `//@version=6
indicator("Function If")
positive(value) =>
    if value > 0
        1
negative(value) =>
    if value < 0
        -1
plot(positive(close - open), title="Positive")
plot(negative(close - open), title="Negative")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Positive')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Negative')?.values).toEqual([null, null, null]);
    });

    it('returns expression results from user function else branches', () => {
      const script = `//@version=6
indicator("Function If Else")
classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
plot(classify(bar_index - 1), title="Classified")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Classified')?.values).toEqual([-1, 0, 1]);
    });

    it('reports direct recursive user function calls', () => {
      const script = `//@version=6
indicator("Direct Recursive Function")
countdown(value) => value <= 0 ? 0 : countdown(value - 1)
plot(countdown(2), title="Countdown")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Recursive user function calls are not supported: countdown -> countdown');
    });

    it('reports mutual recursive user function calls', () => {
      const script = `//@version=6
indicator("Mutual Recursive Function")
even(value) => value <= 0 ? 1 : odd(value - 1)
odd(value) => value <= 0 ? 0 : even(value - 1)
plot(even(2), title="Even")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Recursive user function calls are not supported: even -> odd -> even');
    });

    it('halts execution on runtime.error with a message', () => {
      const script = `//@version=6
indicator("Runtime Error")
plot(close, title="Before")
runtime.error("stop here")
plot(open, title="After")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('stop here');
      expect(result.plots.find((plot) => plot.title === 'Before')?.values).toEqual([100.2]);
      expect(result.plots.find((plot) => plot.title === 'After')).toBeUndefined();
    });

    it('accepts runtime.error named message arguments', () => {
      const script = `//@version=6
indicator("Runtime Error Named")
runtime.error(message="named stop")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('named stop');
      expect(result.plots).toHaveLength(0);
    });

    it('fills gaps with fixnan and casts primitive values explicitly', () => {
      const script = `//@version=6
indicator("Global Helpers")
source = bar_index == 0 or bar_index == 2 ? na : close
plot(nz(source), title="NZ Default")
plot(nz(source, open), title="NZ Replacement")
plot(fixnan(source), title="Fixed")
plot(float("4.5"), title="Float")
plot(int(4.9), title="Int")
plot(bool(1), title="Bool True")
plot(bool(0), title="Bool False")
plot(string(12.5) == "12.5", title="String Cast")`;

      const ast = parse(script);
      const bars = createBars(4, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'NZ Default')?.values).toEqual([0, 100.7, 0, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'NZ Replacement')?.values).toEqual([100, 100.7, 101, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Fixed')?.values).toEqual([null, 100.7, 100.7, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Float')?.values).toEqual([4.5, 4.5, 4.5, 4.5]);
      expect(result.plots.find((plot) => plot.title === 'Int')?.values).toEqual([4, 4, 4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Bool True')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Bool False')?.values).toEqual([false, false, false, false]);
      expect(result.plots.find((plot) => plot.title === 'String Cast')?.values).toEqual([true, true, true, true]);
    });

    it('rejects bool arguments for v6 na replacement helpers', () => {
      const nzScript = `//@version=6
indicator("NZ Bool")
plot(nz(close > open) ? 1 : 0)`;
      const fixnanScript = `//@version=6
indicator("Fixnan Bool")
plot(fixnan(close > open) ? 1 : 0)`;

      const nzResult = executeScript(parse(nzScript), createBars(1));
      const fixnanResult = executeScript(parse(fixnanScript), createBars(1));

      expect(nzResult.errors[0]?.message).toBe('nz() does not accept bool arguments in Pine v6');
      expect(fixnanResult.errors[0]?.message).toBe('fixnan() does not accept bool arguments in Pine v6');
    });

    it('keeps fixnan state independent per call site', () => {
      const script = `//@version=6
indicator("Fixnan Call Sites")
sourceA = bar_index == 1 ? na : close
sourceB = bar_index == 2 ? na : open
plot(fixnan(sourceA), title="Fixed A")
plot(fixnan(sourceB), title="Fixed B")`;

      const result = executeScript(parse(script), createBars(4, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Fixed A')?.values).toEqual([100.2, 100.2, 101.2, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Fixed B')?.values).toEqual([100, 100.5, 100.5, 101.5]);
    });

    it('parses numeric strings with str.tonumber', () => {
      const script = `//@version=6
indicator("String To Number")
plot(str.tonumber("42.5"), title="Decimal")
plot(str.tonumber("  -3e2  "), title="Scientific")
plot(str.tonumber("bad"), title="Invalid")
plot(na(str.tonumber("")) ? 1 : 0, title="Empty Is NA")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Decimal')?.values).toEqual([42.5, 42.5]);
      expect(result.plots.find((plot) => plot.title === 'Scientific')?.values).toEqual([-300, -300]);
      expect(result.plots.find((plot) => plot.title === 'Invalid')?.values).toEqual([null, null]);
      expect(result.plots.find((plot) => plot.title === 'Empty Is NA')?.values).toEqual([1, 1]);
    });

    it('runs string match, repeat, split, and occurrence replace helpers', () => {
      const script = `//@version=6
indicator("String Extra Helpers")
parts = str.split("NASDAQ:AAPL", ":")
chars = str.split("ABC", "")
plot(array.size(parts), title="Parts")
plot(array.get(parts, 1) == "AAPL", title="Second Part")
plot(array.join(chars, "-") == "A-B-C", title="Split Characters")
plot(str.match("Go NASDAQ:AAPL now", "[A-Z]+:[A-Z]+") == "NASDAQ:AAPL", title="Regex Match")
plot(str.match("no symbol", "[0-9]+") == "", title="Missing Match")
plot(str.repeat("?", 3, ",") == "?,?,?", title="Repeat With Separator")
plot(na(str.repeat(na, 2)) ? 1 : 0, title="Repeat NA")
plot(str.replace("a-b-a-b", "b", "x", 1) == "a-b-a-x", title="Replace Occurrence")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Parts')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Second Part')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Split Characters')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Regex Match')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Missing Match')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Repeat With Separator')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Repeat NA')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Replace Occurrence')?.values).toEqual([true, true]);
    });

    it('formats timestamps with str.format_time', () => {
      const script = `//@version=6
indicator("String Format Time")
stamp = timestamp("GMT+2", 2024, 1, 5, 9, 30, 15)
plot(str.format_time(stamp, "yyyy-MM-dd HH:mm:ss", "GMT+2") == "2024-01-05 09:30:15", title="Offset")
plot(str.format_time(stamp, "yy/MM/dd HH:mm", "UTC") == "24/01/05 07:30", title="UTC")
plot(str.format_time(na, "yyyy-MM-dd", "UTC") == "NaN", title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Offset')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'UTC')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([true, true]);
    });

    it('rounds values to syminfo.mintick', () => {
      const script = `//@version=6
indicator("Round To Min Tick")
plot(math.round_to_mintick(1.234), title="Down")
plot(math.round_to_mintick(1.235), title="Up")
plot(math.round_to_mintick(na), title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Down')?.values).toEqual([1.23, 1.23]);
      expect(result.plots.find((plot) => plot.title === 'Up')?.values).toEqual([1.24, 1.24]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([null, null]);
    });

    it('generates math.random values in exclusive bounds', () => {
      const script = `//@version=6
indicator("Math Random")
plot(math.random(), title="Default")
plot(math.random(10, 20), title="Bounded")
plot(math.random(min=5, max=6, seed=3), title="Named Seeded")
plot(math.random(1, 1), title="Invalid")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Default')?.values.every((value) => value !== null && value > 0 && value < 1)).toBe(true);
      expect(result.plots.find((plot) => plot.title === 'Bounded')?.values.every((value) => value !== null && value > 10 && value < 20)).toBe(true);
      expect(result.plots.find((plot) => plot.title === 'Named Seeded')?.values.every((value) => value !== null && value > 5 && value < 6)).toBe(true);
      expect(result.plots.find((plot) => plot.title === 'Invalid')?.values).toEqual([null, null, null, null, null]);
    });

    it('makes seeded math.random sequences repeatable', () => {
      const script = `//@version=6
indicator("Seeded Random")
plot(math.random(10, 20, 42), title="Seeded")
plot(math.random(10, 20, 43), title="Other Seed")`;

      const ast = parse(script);
      const bars = createBars(6, 100);
      const first = executeScript(ast, bars);
      const second = executeScript(ast, bars);
      const firstSeeded = first.plots.find((plot) => plot.title === 'Seeded')?.values ?? [];
      const secondSeeded = second.plots.find((plot) => plot.title === 'Seeded')?.values ?? [];
      const otherSeed = first.plots.find((plot) => plot.title === 'Other Seed')?.values ?? [];

      expect(first.errors).toHaveLength(0);
      expect(second.errors).toHaveLength(0);
      expect(firstSeeded).toHaveLength(bars.length);
      expect(otherSeed).toHaveLength(bars.length);
      expect(firstSeeded).toEqual(secondSeeded);
      expect(new Set(firstSeeded).size).toBeGreaterThan(1);
      expect(otherSeed).not.toEqual(firstSeeded);
    });

    it('halts realtime updateBar execution on runtime.error', () => {
      const script = `//@version=6
indicator("Realtime Runtime Error")
if barstate.isrealtime
    runtime.error("realtime stop")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(() => engine.updateBar(ast, { ...bars[1], close: 101.5 })).toThrow('realtime stop');
    });

    it('captures Pine log levels and formatted messages', () => {
      const script = `//@version=6
indicator("Pine Logs")
if barstate.isfirst
    log.info("started at {0}", close)
if bar_index == 1
    log.warning("bar={0} close={1:#.0}", bar_index, close)
if barstate.islast
    log.error(message="finished {0}", close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.logs).toEqual([
        { level: 'info', barIndex: 0, time: bars[0].time, message: 'started at 100.2' },
        { level: 'warning', barIndex: 1, time: bars[1].time, message: 'bar=1 close=100.7' },
        { level: 'error', barIndex: 2, time: bars[2].time, message: 'finished 101.2' },
      ]);
    });

    it('rolls back realtime Pine logs before re-executing the current bar', () => {
      const script = `//@version=6
indicator("Realtime Pine Logs")
if barstate.isrealtime
    log.info("tick {0}", close)
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.logs).toEqual([]);

      engine.updateBar(ast, { ...bars[1], close: 101.5 });
      expect(engine.getLogs()).toEqual([
        { level: 'info', barIndex: 1, time: bars[1].time, message: 'tick 101.5' },
      ]);

      engine.updateBar(ast, { ...bars[1], close: 102 });
      expect(engine.getLogs()).toEqual([
        { level: 'info', barIndex: 1, time: bars[1].time, message: 'tick 102' },
      ]);
    });

    it('evaluates keyed switch expressions', () => {
      const script = `//@version=6
indicator("Switch Test")
mode = "EMA"
selected = switch mode
    "SMA" => open
    "EMA" => close
    => high
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([100.2, 100.7, 101.2]);
    });

    it('evaluates condition-only switch expressions', () => {
      const script = `//@version=6
indicator("Switch Conditions")
direction = switch
    close > open => 1
    close < open => -1
    => 0
plot(direction, title="Direction")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Direction')?.values).toEqual([1, 1, 1]);
    });

    it('evaluates switch expression block arms', () => {
      const script = `//@version=6
indicator("Switch Block")
mode = "EMA"
selected = switch mode
    "SMA" =>
        basis = open + 1
        basis
    "EMA" =>
        basis = close + 1
        basis
    =>
        high
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([101.2, 101.7, 102.2]);
    });

    it('returns na for switch block arms without an expression result', () => {
      const script = `//@version=6
indicator("Switch Block NA")
selected = switch
    close > open =>
        temp = close + 1
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values[0]).toBeNull();
    });

    it('returns plotcandle OHLC and color outputs with na gaps', () => {
      const script = `//@version=6
indicator("Synthetic candles", overlay=true)
o = bar_index == 1 ? na : open
h = bar_index == 1 ? na : high
l = bar_index == 1 ? na : low
c = bar_index == 1 ? na : close
body = c >= o ? color.green : color.red
plotcandle(o, h, l, c, title="Synthetic", color=body, wickcolor=color.blue, bordercolor=color.orange)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([100, null, 101]);
      expect(candles?.highValues).toEqual([100.5, null, 101.5]);
      expect(candles?.lowValues).toEqual([99.7, null, 100.7]);
      expect(candles?.closeValues).toEqual([100.2, null, 101.2]);
      expect(candles?.values).toEqual([100.2, null, 101.2]);
      expect(candles?.color).toEqual(['#4CAF50', null, '#4CAF50']);
      expect(candles?.wickColor).toEqual(['#2196F3', null, '#2196F3']);
      expect(candles?.borderColor).toEqual(['#FF9800', null, '#FF9800']);
    });

    it('returns plotbar OHLC outputs with directional colors', () => {
      const script = `//@version=6
indicator("Synthetic bars", overlay=true)
barColor = close >= open ? color.green : color.red
plotbar(open, high, low, close, title="Bars", color=barColor)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const plotBars = result.plots.find((plot) => plot.type === 'plotbar');
      expect(plotBars).toBeDefined();
      expect(plotBars?.openValues).toEqual([100, 100.5]);
      expect(plotBars?.highValues).toEqual([100.5, 101]);
      expect(plotBars?.lowValues).toEqual([99.7, 100.2]);
      expect(plotBars?.closeValues).toEqual([100.2, 100.7]);
      expect(plotBars?.values).toEqual([100.2, 100.7]);
      expect(plotBars?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('aligns conditionally executed plotcandle outputs to bar indexes', () => {
      const script = `//@version=6
indicator("Conditional candles", overlay=true)
if bar_index > 0
    plotcandle(open, high, low, close, title="Late", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([null, 100.5, 101]);
      expect(candles?.values).toEqual([null, 100.7, 101.2]);
      expect(candles?.color).toEqual([null, '#4CAF50', '#4CAF50']);
    });

    it('handles empty bar data', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const result = executeScript(ast, []);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.length).toBe(0);
    });
  });

  describe('built-in series', () => {
    it('provides access to close prices', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[0]).toBeCloseTo(100.2, 1);
    });

    it('provides access to OHLCV', () => {
      const script = `//@version=6
indicator("Test")
plot(open, title="O")
plot(high, title="H")
plot(low, title="L")
plot(close, title="C")
plot(volume, title="V")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(5);
    });

    it('provides bar_index', () => {
      const script = `//@version=6
indicator("Test")
plot(bar_index)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('variable declarations', () => {
    it('handles simple variable declaration', () => {
      const script = `//@version=6
indicator("Test")
x = 42
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([42, 42, 42]);
    });

    it('handles var keyword for persistence', () => {
      const script = `//@version=6
indicator("Test")
var counter = 0
counter := counter + 1
plot(counter)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('arithmetic expressions', () => {
    it('evaluates addition', () => {
      const script = `//@version=6
indicator("Test")
x = 1 + 2
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(3);
    });

    it('evaluates complex expressions', () => {
      const script = `//@version=6
indicator("Test")
x = (1 + 2) * 3 - 1
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(8);
    });

    it('respects operator precedence', () => {
      const script = `//@version=6
indicator("Test")
x = 2 + 3 * 4
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(14);
    });
  });

  describe('comparison and logical operations', () => {
    it('evaluates comparisons', () => {
      const script = `//@version=6
indicator("Test")
x = close > open ? 1 : 0
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(1);
    });

    it('evaluates logical operators', () => {
      const script = `//@version=6
indicator("Test")
a = true
b = false
x = a and b ? 1 : 0
y = a or b ? 1 : 0
plot(x, title="And")
plot(y, title="Or")`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      const andPlot = result.plots.find((p) => p.title === 'And');
      const orPlot = result.plots.find((p) => p.title === 'Or');

      expect(andPlot!.values[0]).toBe(0);
      expect(orPlot!.values[0]).toBe(1);
    });
  });

  describe('conditional expressions', () => {
    it('evaluates ternary expression', () => {
      const script = `//@version=6
indicator("Test")
x = bar_index == 0 ? 100 : 200
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 200, 200]);
    });
  });

  describe('if statements', () => {
    it('executes if branch', () => {
      const script = `//@version=6
indicator("Test")
var x = 0
if bar_index == 0
    x := 100
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 100, 100]);
    });
  });

  describe('for loops', () => {
    it('executes for loop', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 5
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(15);
    });

    it('executes for loop with step', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 0 to 10 by 2
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(30);
    });

    it('executes descending for loop with negative step', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 5 to 1 by -2
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(9);
    });

    it('rejects zero-step for loops', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 3 by 0
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('For loop step cannot be zero');
    });

    it('caps numeric for loop iterations', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 10001
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Maximum loop iterations exceeded');
    });

    it('evaluates numeric for loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
value = for i = 0 to 3
    i * 2
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('evaluates while loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
i = 0
value = while i < 3
    i += 1
    i * 2
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('executes collection for loop over Pine arrays', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3)
sum = 0
for value in values
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('executes collection for loop with Pine index and value tuple', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(10, 20, 30)
sum = 0
for [index, value] in values
    sum := sum + index + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(63);
    });

    it('evaluates collection for loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(10, 20, 30)
value = for [index, item] in values
    index + item
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(32);
    });

    it('preserves the last collection loop expression value across break and continue', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3, 4)
value = for item in values
    if item == 2
        continue
    if item == 4
        break
    item * 10
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(30);
    });

    it('honors break and continue inside collection for loop', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3, 4)
sum = 0
for value in values
    if value == 2
        continue
    if value == 4
        break
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(4);
    });

    it('caps collection for loop iterations', () => {
      const script = `//@version=6
indicator("Test")
values = array.new_float(10001, 1)
sum = 0
for value in values
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Maximum loop iterations exceeded');
    });
  });

  describe('math functions', () => {
    it('evaluates math.abs', () => {
      const script = `//@version=6
indicator("Test")
x = math.abs(-5)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.max', () => {
      const script = `//@version=6
indicator("Test")
x = math.max(1, 5, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.sqrt', () => {
      const script = `//@version=6
indicator("Test")
x = math.sqrt(16)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(4);
    });

    it('calculates math.sum over the latest non-na values', () => {
      const script = `//@version=6
indicator("Math Sum")
source = bar_index == 2 ? na : close
plot(math.sum(close, 3), title="Close Sum")
plot(math.sum(source, 3), title="Sparse Sum")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Close Sum')?.values).toEqual([null, null, 307, 310, 315]);
      expect(result.plots.find((plot) => plot.title === 'Sparse Sum')?.values).toEqual([null, null, null, 305, 312]);
    });
  });

  describe('TA functions', () => {
    it('calculates ta.sma', () => {
      const script = `//@version=6
indicator("Test")
x = ta.sma(close, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[2]).not.toBeNull();
      expect(plot.values[3]).not.toBeNull();
      expect(plot.values[4]).not.toBeNull();
    });

    it('calculates ta.highest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.highest(high, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });

    it('calculates ta.change for boolean sources', () => {
      const script = `//@version=6
indicator("TA change bool")
flag = bar_index >= 2
plot(ta.change(flag) ? 1 : 0, title="Changed")
plot(ta.change(flag, 2) ? 1 : 0, title="Changed 2")
plot(ta.change(close), title="Close Change")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Changed')?.values).toEqual([0, 0, 1, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Changed 2')?.values).toEqual([0, 0, 1, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Close Change')?.values).toEqual([null, 2, 3, -2, 4]);
    });

    it('calculates ta.lowest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.lowest(low, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });

    it('calculates Pine-style scalar ta.stoch', () => {
      const script = `//@version=6
indicator("TA stoch")
plot(ta.stoch(close, high, low, 3), title="Stoch")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 103, low: 99, close: 102, volume: 100 },
        { time: 2, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 3, open: 105, high: 108, low: 104, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Stoch')?.values[2]).toBeCloseTo(88.888889);
    });

    it('calculates Pine-style CCI over the provided source', () => {
      const script = `//@version=6
indicator("TA CCI")
plot(ta.cci(close, 3), title="Close CCI")
plot(ta.cci(hlc3, 3), title="Typical CCI")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 103, low: 99, close: 102, volume: 100 },
        { time: 2, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 3, open: 105, high: 108, low: 104, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Close CCI')?.values[2]).toBeCloseTo(87.5);
      expect(result.plots.find((plot) => plot.title === 'Typical CCI')?.values[2]).toBeCloseTo(95.652174);
    });

    it('calculates CMO over source changes', () => {
      const script = `//@version=6
indicator("TA CMO")
plot(ta.cmo(close, 3), title="CMO")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'CMO')?.values).toEqual([null, null, null, (3 / 7) * 100, (5 / 9) * 100]);
    });

    it('calculates TSI over double-smoothed source momentum', () => {
      const script = `//@version=6
indicator("TA TSI")
plot(ta.tsi(close, 2, 3), title="TSI")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'TSI')?.values).toEqual([
        null,
        1,
        1,
        0.4146341463414634,
        0.6091205211726384,
      ]);
    });

    it('calculates Keltner channels and widths', () => {
      const script = `//@version=6
indicator("TA KC")
[basis, upper, lower] = ta.kc(close, 3, 1.5)
[hlBasis, hlUpper, hlLower] = ta.kc(close, 3, 1.5, false)
plot(basis, title="Basis")
plot(upper, title="Upper")
plot(lower, title="Lower")
plot(ta.kcw(close, 3, 1.5), title="Width")
plot(hlUpper, title="HL Upper")
plot(ta.kcw(close, 3, 1.5, false), title="HL Width")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 118, high: 120, low: 119, close: 119, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Basis')?.values ?? [])).toEqual([100, 101, 103, 103, 111]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Upper')?.values ?? [])).toEqual([103, 104.75, 108.625, 108.8125, 126.65625]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Lower')?.values ?? [])).toEqual([97, 97.25, 97.375, 97.1875, 95.34375]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Width')?.values ?? [])).toEqual([0.06, 0.074257, 0.109223, 0.112864, 0.282095]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'HL Upper')?.values ?? [])).toEqual([103, 104.75, 108.625, 108.8125, 114.65625]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'HL Width')?.values ?? [])).toEqual([0.06, 0.074257, 0.109223, 0.112864, 0.065878]);
    });

    it('preserves source history when TA lookback length grows', () => {
      const script = `//@version=6
indicator("Growing lookback")
length = bar_index < 3 ? 2 : 4
plot(ta.linreg(close, length, 0), title="LinReg")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'LinReg')?.values[3]).toBeCloseTo(104.3);
      expect(result.plots.find((plot) => plot.title === 'LinReg')?.values[4]).toBeCloseTo(106.2);
    });

    it('calculates cumulative and window statistic TA helpers', () => {
      const script = `//@version=6
indicator("TA stats")
plot(ta.cum(close), title="Cum")
plot(ta.variance(close, 3), title="Variance")
plot(ta.dev(close, 3), title="Deviation")
plot(ta.correlation(close, open, 3), title="Correlation")
plot(ta.correlation(close, close, 3), title="Self Correlation")
plot(ta.correlation(close, 1, 3), title="Flat Correlation")
plot(ta.cog(close, 3), title="COG")
plot(ta.cog(close - open, 3), title="Derived COG")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: 2, open: 101, high: 103, low: 100, close: 102, volume: 100 },
        { time: 3, open: 102, high: 106, low: 101, close: 105, volume: 100 },
        { time: 4, open: 105, high: 106, low: 102, close: 103, volume: 100 },
        { time: 5, open: 103, high: 108, low: 103, close: 107, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Cum')?.values).toEqual([100, 202, 307, 410, 517]);
      expect(result.plots.find((plot) => plot.title === 'Variance')?.values).toEqual([null, null, 38 / 9, 14 / 9, 8 / 3]);
      const deviationValues = result.plots.find((plot) => plot.title === 'Deviation')?.values ?? [];
      expect(deviationValues.slice(0, 2)).toEqual([null, null]);
      expect(deviationValues[2]).toBeCloseTo(16 / 9);
      expect(deviationValues[3]).toBeCloseTo(10 / 9);
      expect(deviationValues[4]).toBeCloseTo(4 / 3);
      expect(result.plots.find((plot) => plot.title === 'Correlation')?.values[2]).toBeCloseTo(0.993399);
      expect(result.plots.find((plot) => plot.title === 'Self Correlation')?.values[2]).toBeCloseTo(1);
      expect(result.plots.find((plot) => plot.title === 'Flat Correlation')?.values).toEqual([null, null, null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'COG')?.values).toEqual([null, null, -1.98371335504886, -1.9967741935483871, -1.9936507936507937]);
      expect(result.plots.find((plot) => plot.title === 'Derived COG')?.values).toEqual([null, null, -1.25, -3.5, -1.8]);
    });

    it('calculates median, mode, and percentile TA helpers', () => {
      const script = `//@version=6
indicator("TA percentiles")
plot(ta.median(close, 3), title="Median")
plot(ta.mode(close, 3), title="Mode")
plot(ta.percentile_nearest_rank(close, 3, 75), title="Nearest")
plot(ta.percentile_linear_interpolation(close, 3, 75), title="Linear")
plot(ta.percentrank(close, 3), title="Percent Rank")
plot(ta.median(close - open, 3), title="Derived Median")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: 2, open: 0, high: 3, low: 0, close: 3, volume: 100 },
        { time: 3, open: 1, high: 2, low: 0, close: 2, volume: 100 },
        { time: 4, open: 4, high: 5, low: 0, close: 5, volume: 100 },
        { time: 5, open: 5, high: 4, low: 0, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Median')?.values).toEqual([null, null, 2, 3, 4]);
      expect(result.plots.find((plot) => plot.title === 'Mode')?.values).toEqual([null, null, 1, 2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Nearest')?.values).toEqual([null, null, 3, 5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Linear')?.values).toEqual([null, null, 2.5, 4, 4.5]);
      expect(result.plots.find((plot) => plot.title === 'Percent Rank')?.values).toEqual([null, null, (2 / 3) * 100, 100, (2 / 3) * 100]);
      expect(result.plots.find((plot) => plot.title === 'Derived Median')?.values).toEqual([null, null, 1, 1, 1]);
    });

    it('calculates ALMA and SWMA helpers', () => {
      const script = `//@version=6
indicator("TA averages")
plot(ta.swma(close), title="SWMA")
plot(ta.alma(close, 3, 0.5, 6), title="ALMA")
plot(ta.swma(close - open), title="Derived SWMA")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: 2, open: 0, high: 3, low: 0, close: 3, volume: 100 },
        { time: 3, open: 1, high: 2, low: 0, close: 2, volume: 100 },
        { time: 4, open: 4, high: 5, low: 0, close: 5, volume: 100 },
        { time: 5, open: 5, high: 4, low: 0, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'SWMA')?.values).toEqual([null, null, null, 8 / 3, 3.5]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'ALMA')?.values ?? [])).toEqual([null, null, 2.680479, 2.426028, 4.573972]);
      expect(result.plots.find((plot) => plot.title === 'Derived SWMA')?.values).toEqual([null, null, null, 5 / 3, 1]);
    });

    it('calculates rising and falling TA helpers', () => {
      const script = `//@version=6
indicator("TA direction")
plot(ta.rising(close, 2), title="Rising")
plot(ta.falling(close, 2), title="Falling")
plot(ta.falling(close - open, 2), title="Derived Falling")
plot(ta.rising(close), title="Missing Length")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 9, high: 11, low: 9, close: 10, volume: 100 },
        { time: 2, open: 9, high: 12, low: 10, close: 11, volume: 100 },
        { time: 3, open: 10, high: 13, low: 11, close: 12, volume: 100 },
        { time: 4, open: 12, high: 12, low: 9, close: 9, volume: 100 },
        { time: 5, open: 9, high: 10, low: 8, close: 8, volume: 100 },
        { time: 6, open: 8, high: 9, low: 7, close: 7, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Rising')?.values).toEqual([false, false, true, false, false, false]);
      expect(result.plots.find((plot) => plot.title === 'Falling')?.values).toEqual([false, false, false, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Derived Falling')?.values).toEqual([false, false, false, true, false, false]);
      expect(result.plots.find((plot) => plot.title === 'Missing Length')?.values).toEqual([false, false, false, false, false, false]);
    });
  });

  describe('history access', () => {
    it('accesses previous bar values', () => {
      const script = `//@version=6
indicator("Test")
x = close[1]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values[1]).toBeCloseTo(bars[0].close, 1);
    });

    it('supports dynamic history offsets', () => {
      const script = `//@version=6
indicator("Dynamic History")
length = input.int(2, title="Length")
x = close[length]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual([null, null, 100.2, 100.7, 101.2]);
    });

    it('supports history offsets on derived OHLC source series', () => {
      const script = `//@version=6
indicator("Derived Source History")
plot(hl2[1], title="HL2")
plot(hlc3[1], title="HLC3")
plot(ohlc4[1], title="OHLC4")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'HL2')?.values).toEqual([
        null,
        (bars[0]!.high + bars[0]!.low) / 2,
        (bars[1]!.high + bars[1]!.low) / 2,
      ]);
      expect(result.plots.find((plot) => plot.title === 'HLC3')?.values).toEqual([
        null,
        (bars[0]!.high + bars[0]!.low + bars[0]!.close) / 3,
        (bars[1]!.high + bars[1]!.low + bars[1]!.close) / 3,
      ]);
      expect(result.plots.find((plot) => plot.title === 'OHLC4')?.values).toEqual([
        null,
        (bars[0]!.open + bars[0]!.high + bars[0]!.low + bars[0]!.close) / 4,
        (bars[1]!.open + bars[1]!.high + bars[1]!.low + bars[1]!.close) / 4,
      ]);
    });

    it('truncates fractional dynamic history offsets', () => {
      const script = `//@version=6
indicator("Fractional History")
offset = bar_index > 1 ? 1.9 : 0
x = close[offset]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual([100.2, 100.7, 100.7]);
    });

    it('returns na for future or unavailable history offsets', () => {
      const script = `//@version=6
indicator("Invalid History")
future = close[-1]
tooFar = close[100]
plot(future, title="Future")
plot(tooFar, title="Too Far")
plot(na(future) ? 1 : 0, title="Future Is NA")
plot(na(tooFar) ? 1 : 0, title="Too Far Is NA")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Future')?.values).toEqual([null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'Too Far')?.values).toEqual([null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'Future Is NA')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Too Far Is NA')?.values).toEqual([1, 1, 1]);
    });
  });

  describe('inputs', () => {
    it('registers input definitions', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.inputs.length).toBe(1);
      expect(result.inputs[0].title).toBe('Length');
      expect(result.inputs[0].defval).toBe(14);
    });

    it('uses default input value', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([14, 14, 14]);
    });

    it('accepts custom input values', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const inputs = new Map([['input_Length', 20]]);
      const result = executeScript(ast, bars, inputs);

      expect(result.plots[0].values).toEqual([20, 20, 20]);
    });
  });

  describe('color functions', () => {
    it('provides color constants', () => {
      const script = `//@version=6
indicator("Test")
plot(close, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      // Color can be a string or an array of colors per bar
      const color = result.plots[0].color;
      const firstColor = Array.isArray(color) ? color[0] : color;
      expect(firstColor).toBe('#F44336');
    });
  });

  describe('error handling', () => {
    it('records errors without crashing', () => {
      const script = `//@version=6
indicator("Test")
x = undefined_var
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateBar (incremental execution)', () => {
    it('updates plot values on same-timestamp bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const lastPlotValue = result.plots[0].values[4];
      expect(lastPlotValue).toBeCloseTo(bars[4].close, 5);

      // Update last bar with a different close price
      const updatedBar = { ...bars[4], close: 999 };
      const plots = engine.updateBar(ast, updatedBar);

      const closePlot = plots.find((p) => p.title === 'Close');
      expect(closePlot).toBeDefined();
      // Plot array length must match bar count (no duplicates from re-execution)
      expect(closePlot!.values.length).toBe(bars.length);
      // The last value should reflect the updated close
      expect(closePlot!.values[closePlot!.values.length - 1]).toBe(999);
    });

    it('rollback works correctly between updateBar calls', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const closePlot = result.plots.find((p) => p.title === 'Close')!;
      const originalLastValue = closePlot.values[4];
      expect(originalLastValue).toBeCloseTo(bars[4].close, 5);

      // First updateBar with new close
      const updatedBar1 = { ...bars[4], close: 200 };
      const plots1 = engine.updateBar(ast, updatedBar1);
      const close1 = plots1.find((p) => p.title === 'Close')!;
      expect(close1.values.length).toBe(bars.length);
      expect(close1.values[close1.values.length - 1]).toBe(200);

      // Second updateBar — rollback should restore to committed state,
      // so the new close value replaces the previous updateBar's value
      const updatedBar2 = { ...bars[4], close: 300 };
      const plots2 = engine.updateBar(ast, updatedBar2);
      const close2 = plots2.find((p) => p.title === 'Close')!;
      expect(close2.values.length).toBe(bars.length);
      expect(close2.values[close2.values.length - 1]).toBe(300);
    });

    it('rolls back map mutations between updateBar calls', () => {
      const script = `//@version=6
indicator("Map Rollback")
var m = map.new<string, float>()
if barstate.islast
    m.put(str.tostring(close), close)
plot(m.get(str.tostring(close)), title="Last")
plot(na(m.get("200")) ? 1 : 0, title="First Update Missing")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);

      const plots1 = engine.updateBar(ast, { ...bars[4], close: 200 });
      const last1 = plots1.find((p) => p.title === 'Last')!;
      expect(last1.values[last1.values.length - 1]).toBe(200);
      const firstMissing1 = plots1.find((p) => p.title === 'First Update Missing')!;
      expect(firstMissing1.values[firstMissing1.values.length - 1]).toBe(0);

      const plots2 = engine.updateBar(ast, { ...bars[4], close: 300 });
      const last2 = plots2.find((p) => p.title === 'Last')!;
      const firstMissing2 = plots2.find((p) => p.title === 'First Update Missing')!;
      expect(last2.values.length).toBe(bars.length);
      expect(last2.values[last2.values.length - 1]).toBe(300);
      expect(firstMissing2.values[firstMissing2.values.length - 1]).toBe(1);
    });

    it('snapshot is only taken on the last bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10, 100);
      const engine = new TealscriptEngine();

      // Full execute
      engine.execute(ast, bars);

      // Verify updateBar works (which requires a snapshot from the last bar)
      const updatedBar = { ...bars[9], close: 555 };
      const plots = engine.updateBar(ast, updatedBar);

      // If snapshot wasn't taken on last bar, rollback would fail
      // and values would be wrong. The fact that we get correct plots
      // means the snapshot was taken on the last bar.
      expect(plots.length).toBeGreaterThan(0);
      expect(plots[0].values.length).toBe(bars.length);
      expect(plots[0].values[plots[0].values.length - 1]).toBe(555);
    });

    it('truncates OHLC plot arrays before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Conditional OHLC", overlay=true)
if close > open
    plotcandle(open, high, low, close, title="Conditional", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      const initialPlot = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(initialPlot?.closeValues?.[2]).toBe(101.2);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      const plots = engine.updateBar(ast, updatedBar);
      const updatedPlot = plots.find((plot) => plot.type === 'plotcandle');

      expect(updatedPlot?.values).toEqual([100.2, 100.7]);
      expect(updatedPlot?.openValues).toEqual([100, 100.5]);
      expect(updatedPlot?.closeValues).toEqual([100.2, 100.7]);
      expect(updatedPlot?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('truncates alerts before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green", message="green condition")
if isUp
    alert("Green event", alert.freq_once_per_bar)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, true]);
      expect(result.alerts.find((alert) => alert.type === 'alert')?.events).toHaveLength(3);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      engine.updateBar(ast, updatedBar);
      const alerts = engine.getAlerts();

      expect(alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, null]);
      expect(alerts.find((alert) => alert.type === 'alert')?.values).toEqual([true, true]);
      expect(alerts.find((alert) => alert.type === 'alert')?.events.map((event) => event.barIndex)).toEqual([0, 1]);
    });
  });
});
