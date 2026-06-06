import { describe, it, expect, vi } from 'vitest';
import { TealscriptEngine, executeScript } from './engine';
import { parse } from '../parser/parser';
import { InMemoryRequestDatafeed } from './requestDatafeed';
import { InMemoryStrategyIntrabarDatafeed } from './strategy';
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

function stripSourceLocations<T>(node: T): T {
  if (!node || typeof node !== 'object') return node;

  delete (node as { loc?: unknown }).loc;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        stripSourceLocations(item);
      }
    } else {
      stripSourceLocations(value);
    }
  }

  return node;
}

describe('TealscriptEngine', () => {
  describe('runtime profile', () => {
    it('exposes bid and ask on 1T host bars and supports history/source mapping', () => {
      const script = `//@version=6
indicator("Bid Ask")
plot(bid, title="Bid")
plot(ask, title="Ask")
plot(bid[1], title="Previous Bid")
plot(ta.sma(ask, 2), title="Ask SMA")`;

      const bars = createBars(3).map((bar, index) => ({
        ...bar,
        bid: 100 + index,
        ask: 100.25 + index,
      }));
      const result = executeScript(parse(script), bars, undefined, {
        runtime: {
          timeframe: {
            period: '1T',
            multiplier: 1,
            isminutes: false,
            isdaily: false,
            isweekly: false,
            ismonthly: false,
            isintraday: true,
            isseconds: false,
            isticks: true,
          },
        },
      });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Bid')?.values).toEqual([100, 101, 102]);
      expect(result.plots.find((plot) => plot.title === 'Ask')?.values).toEqual([100.25, 101.25, 102.25]);
      expect(result.plots.find((plot) => plot.title === 'Previous Bid')?.values).toEqual([null, 100, 101]);
      expect(result.plots.find((plot) => plot.title === 'Ask SMA')?.values).toEqual([null, 100.75, 101.75]);
    });

    it('returns na for bid and ask outside 1T or without host-provided quotes', () => {
      const script = `//@version=6
indicator("Bid Ask NA")
plot(bid, title="Bid")
plot(ask, title="Ask")`;

      const nonTickResult = executeScript(parse(script), createBars(2).map((bar, index) => ({
        ...bar,
        bid: 100 + index,
        ask: 100.25 + index,
      })));
      const missingQuoteResult = executeScript(parse(script), createBars(2), undefined, {
        runtime: {
          timeframe: {
            period: '1T',
            multiplier: 1,
            isminutes: false,
            isdaily: false,
            isweekly: false,
            ismonthly: false,
            isintraday: true,
            isseconds: false,
            isticks: true,
          },
        },
      });

      expect(nonTickResult.errors).toEqual([]);
      expect(nonTickResult.plots.find((plot) => plot.title === 'Bid')?.values).toEqual([null, null]);
      expect(nonTickResult.plots.find((plot) => plot.title === 'Ask')?.values).toEqual([null, null]);
      expect(missingQuoteResult.errors).toEqual([]);
      expect(missingQuoteResult.plots.find((plot) => plot.title === 'Bid')?.values).toEqual([null, null]);
      expect(missingQuoteResult.plots.find((plot) => plot.title === 'Ask')?.values).toEqual([null, null]);
    });

    it('updates bid and ask on realtime tick replacement', () => {
      const script = `//@version=6
indicator("Bid Ask Realtime")
plot(bid, title="Bid")
plot(ask, title="Ask")`;
      const bars = createBars(2).map((bar, index) => ({
        ...bar,
        bid: 100 + index,
        ask: 100.25 + index,
      }));
      const engine = new TealscriptEngine({
        runtime: {
          timeframe: {
            period: '1T',
            multiplier: 1,
            isminutes: false,
            isdaily: false,
            isweekly: false,
            ismonthly: false,
            isintraday: true,
            isseconds: false,
            isticks: true,
          },
        },
      });
      const ast = parse(script);

      const initial = engine.execute(ast, bars);
      const initialBidValues = [...initial.plots.find((plot) => plot.title === 'Bid')!.values];
      const updated = engine.updateBar(ast, { ...bars[1], bid: 105, ask: 105.5 });

      expect(initial.errors).toEqual([]);
      expect(initialBidValues).toEqual([100, 101]);
      expect(updated.find((plot) => plot.title === 'Bid')?.values).toEqual([100, 105]);
      expect(updated.find((plot) => plot.title === 'Ask')?.values).toEqual([100.25, 105.5]);
    });

    it('evaluates bid and ask inside 1T request.security contexts', () => {
      const script = `//@version=6
indicator("Requested Quotes")
requestedBid = request.security(syminfo.tickerid, "1T", bid, lookahead=barmerge.lookahead_on)
requestedAsk = request.security(syminfo.tickerid, "1T", ask, lookahead=barmerge.lookahead_on)
plot(requestedBid, title="Requested Bid")
plot(requestedAsk, title="Requested Ask")`;
      const bars = createBars(2);
      const requestedBars = bars.map((bar, index) => ({
        ...bar,
        bid: 200 + index,
        ask: 200.25 + index,
      }));
      const datafeed = new InMemoryRequestDatafeed([{
        symbol: 'BTCUSDT',
        timeframe: '1T',
        bars: requestedBars,
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      }]);

      const result = executeScript(parse(script), bars, undefined, { requestDatafeed: datafeed });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Requested Bid')?.values).toEqual([200, 201]);
      expect(result.plots.find((plot) => plot.title === 'Requested Ask')?.values).toEqual([200.25, 201.25]);
    });

    it('reports execution counters for compatibility profiling', () => {
      const script = `//@version=6
indicator("Profile")
basis = ta.sma(close, 2)
plot(basis, title="Basis")`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.profile.bars).toBe(3);
      expect(result.profile.statements).toBeGreaterThanOrEqual(9);
      expect(result.profile.expressions).toBeGreaterThan(0);
      expect(result.profile.builtinCalls).toBeGreaterThan(0);
      expect(result.profile.requestContexts).toBe(0);
      expect(result.profile.maxBarsBack).toBe(1);
      expect(result.profile.errors).toBe(0);
      expect(result.profile.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('includes runtime errors in the execution profile', () => {
      const script = `//@version=6
indicator("Profile Error")
if bar_index == 1
    runtime.error("stop")
plot(close)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors[0]?.message).toBe('stop');
      expect(result.profile.bars).toBe(2);
      expect(result.profile.errors).toBe(1);
    });

    it('counts statements executed inside function bodies', () => {
      const script = `//@version=6
indicator("Function Profile")
adjust(value) =>
    shifted = value + 1
    if shifted > 0
        shifted := shifted + 1
    shifted
plot(adjust(close))`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.profile.statements).toBeGreaterThan(3);
    });

    it('isolates locationless function call-site state', () => {
      const script = `//@version=6
indicator("Locationless call sites")
nextCount() =>
    var counter = 0
    counter += 1
    counter
first = nextCount()
other = nextCount()
plot(first, title="First")
plot(other, title="Second")`;

      const result = executeScript(stripSourceLocations(parse(script)), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([1, 2, 3]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([1, 2, 3]);
    });

    it('reports fresh profile counters for realtime updates', () => {
      const script = `//@version=6
indicator("Realtime Profile")
basis = ta.sma(close, 2)
plot(basis, title="Basis")`;

      const ast = parse(script);
      const engine = new TealscriptEngine();
      const bars = createBars(3);
      const result = engine.execute(ast, bars);

      expect(result.profile.bars).toBe(3);

      engine.updateBar(ast, { ...bars[2], close: 200 });
      const firstProfile = engine.getProfile();

      engine.updateBar(ast, { ...bars[2], close: 300 });
      const secondProfile = engine.getProfile();

      expect(firstProfile.bars).toBe(1);
      expect(firstProfile.statements).toBeGreaterThan(0);
      expect(firstProfile.expressions).toBeGreaterThan(0);
      expect(firstProfile.builtinCalls).toBeGreaterThan(0);
      expect(firstProfile.errors).toBe(0);
      expect(secondProfile.bars).toBe(1);
      expect(secondProfile.statements).toBe(firstProfile.statements);
      expect(secondProfile.errors).toBe(0);
    });
  });

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
    process_orders_on_close=true,
    use_bar_magnifier=true,
    risk_free_rate=1.75)
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
        useBarMagnifier: true,
        riskFreeRate: 1.75,
        backtestFillLimitsAssumptionTicks: 0,
        closeEntriesRule: 'FIFO',
        fillOrdersOnStandardOhlc: false,
      });
      expect(result.strategy.equity).toBe(25000);
      expect(result.plots.map((plot) => plot.values)).toEqual([[25000], [0]]);
    });

    it('records strategy equity curve points during execution', () => {
      const script = `//@version=6
strategy("Equity curve", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
plot(strategy.equity)`;
      const bars = [
        { time: 100, open: 100, high: 102, low: 99, close: 100, volume: 100 },
        { time: 200, open: 100, high: 106, low: 100, close: 105, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.equityCurve).toEqual([
        {
          barIndex: 0,
          time: 100,
          equity: 100_000,
          openProfit: 0,
          netProfit: 0,
          drawdown: 0,
          runup: 0,
        },
        {
          barIndex: 1,
          time: 200,
          equity: 100_005,
          openProfit: 5,
          netProfit: 0,
          drawdown: 0,
          runup: 5,
        },
      ]);
      expect(result.plots[0]?.values).toEqual([100_000, 100_005]);
    });

    it('applies strategy named-prefix positional tail settings', () => {
      const script = `//@version=6
strategy(title="Mixed strategy", "Mixed", true, format.price, 3, scale.right, 100, "60", true, false, true, 10, 20, 30, 40, 50, true, 25000, "EUR", strategy.percent_of_equity, 10, 2, strategy.commission.percent, 0.05, 1, 50, 60, true, true, true, true, 1.75, 3, "ANY", true)
plot(strategy.equity)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.indicatorTitle).toBe('Mixed strategy');
      expect(result.strategy.settings).toMatchObject({
        title: 'Mixed strategy',
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
        useBarMagnifier: true,
        riskFreeRate: 1.75,
        backtestFillLimitsAssumptionTicks: 3,
        closeEntriesRule: 'ANY',
        fillOrdersOnStandardOhlc: true,
      });
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
    process_orders_on_close=false,
    use_bar_magnifier=false,
    risk_free_rate=0)
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
        useBarMagnifier: false,
        riskFreeRate: 0,
        backtestFillLimitsAssumptionTicks: 0,
        closeEntriesRule: 'FIFO',
        fillOrdersOnStandardOhlc: false,
      });
      expect(result.strategy.equity).toBe(0);
      expect(result.plots[0]?.values).toEqual([0]);
    });

    it('uses close_entries_rule ANY to close the matching entry id before FIFO trades', () => {
      const script = `//@version=6
strategy("Close entries any", process_orders_on_close=true, pyramiding=2, close_entries_rule="ANY")
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=1)
if bar_index == 2
    strategy.close("B")
plot(strategy.position_size)`;
      const bars = createBars(3);

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'B',
        exitOrderId: 'Close B',
        entryPrice: bars[1].close,
        exitPrice: bars[2].close,
      });
      expect(result.strategy.openTrades.map((trade) => trade.entryOrderId)).toEqual(['A']);
      expect(result.plots[0]?.values).toEqual([1, 2, 1]);
    });

    it('delays long limit fills until price exceeds the limit verification ticks', () => {
      const script = `//@version=6
strategy("Verified limit", process_orders_on_close=true, backtest_fill_limits_assumption=3)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=100.3)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1_700_000_000_000, open: 101, high: 102, low: 100.5, close: 101, volume: 100 },
        { time: 1_700_000_060_000, open: 101, high: 102, low: 100.28, close: 101, volume: 100 },
        { time: 1_700_000_120_000, open: 101, high: 102, low: 100.26, close: 101, volume: 100 },
        { time: 1_700_000_180_000, open: 101, high: 102, low: 100.2, close: 101, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        type: 'limit',
        status: 'filled',
        avgFillPrice: 100.3,
        updatedBarIndex: 2,
      });
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Long', price: 100.3, barIndex: 2 },
      ]);
      expect(result.plots[0]?.values).toEqual([0, 0, 0, 1]);
    });

    it('delays short limit fills until price exceeds the limit verification ticks', () => {
      const script = `//@version=6
strategy("Verified short limit", process_orders_on_close=true, backtest_fill_limits_assumption=3)
if bar_index == 0
    strategy.entry("Short", strategy.short, qty=1, limit=100.3)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1_700_000_000_000, open: 100, high: 100.1, low: 99, close: 100, volume: 100 },
        { time: 1_700_000_060_000, open: 100, high: 100.32, low: 99, close: 100, volume: 100 },
        { time: 1_700_000_120_000, open: 100, high: 100.34, low: 99, close: 100, volume: 100 },
        { time: 1_700_000_180_000, open: 100, high: 100.4, low: 99, close: 100, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Short',
        type: 'limit',
        status: 'filled',
        avgFillPrice: 100.3,
        updatedBarIndex: 2,
      });
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Short', price: 100.3, barIndex: 2 },
      ]);
      expect(result.plots[0]?.values).toEqual([0, 0, 0, -1]);
    });

    it('uses the official default strategy risk-free rate', () => {
      const result = executeScript(parse('//@version=6\nstrategy("Defaults")\nplot(strategy.equity)\n'), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.settings.riskFreeRate).toBe(2);
    });

    it('records lower-timeframe strategy execution paths when bar magnifier data is available', () => {
      const bars = createBars(1);
      const script = `//@version=6
strategy("Magnifier", use_bar_magnifier=true)
plot(strategy.equity)`;
      const datafeed = new InMemoryStrategyIntrabarDatafeed([{
        symbol: 'BTCUSDT',
        timeframe: '60',
        chartBarTime: bars[0].time,
        chartBarIndex: 0,
        chartBar: bars[0],
        source: 'lower_timeframe',
        ticks: [
          { time: bars[0].time, price: bars[0].open, kind: 'intrabar_open', sequence: 0 },
          { time: bars[0].time + 15_000, price: bars[0].high, kind: 'intrabar_high', sequence: 1 },
          { time: bars[0].time + 30_000, price: bars[0].low, kind: 'intrabar_low', sequence: 2 },
          { time: bars[0].time + 45_000, price: bars[0].close, kind: 'intrabar_close', sequence: 3 },
        ],
      }]);

      const result = executeScript(parse(script), bars, undefined, { strategyIntrabarDatafeed: datafeed });

      expect(result.errors).toEqual([]);
      expect(result.strategy.intrabarContexts).toHaveLength(1);
      expect(result.strategy.intrabarContexts[0]).toMatchObject({
        source: 'lower_timeframe',
        chartBarIndex: 0,
      });
      expect(result.strategy.intrabarContexts[0]?.unavailableReason).toBeUndefined();
      expect(result.strategy.intrabarContexts[0]?.ticks.map((tick) => tick.kind)).toEqual([
        'intrabar_open',
        'intrabar_high',
        'intrabar_low',
        'intrabar_close',
      ]);
    });

    it('records chart OHLC fallback metadata when bar magnifier data is unavailable', () => {
      const bars = createBars(1);
      const script = `//@version=6
strategy("Magnifier", use_bar_magnifier=true)
plot(strategy.equity)`;

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.intrabarContexts).toHaveLength(1);
      expect(result.strategy.intrabarContexts[0]).toMatchObject({
        source: 'chart_ohlc',
        unavailableReason: 'missing_context',
        chartBarIndex: 0,
      });
      expect(result.strategy.intrabarContexts[0]?.ticks.map((tick) => tick.kind)).toEqual(['open', 'low', 'high', 'close']);
    });

    it('fills price orders using lower-timeframe tick order when bar magnifier data is available', () => {
      const baseTime = Date.now() - 180000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
        { time: baseTime + 60000, open: 100, high: 100.5, low: 99.5, close: 100, volume: 1000 },
        { time: baseTime + 120000, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      ];
      const script = `//@version=6
strategy("Magnifier fills", use_bar_magnifier=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=103, stop=97)
plot(strategy.closedtrades)`;
      const datafeed = new InMemoryStrategyIntrabarDatafeed([{
        symbol: 'BTCUSDT',
        timeframe: '60',
        chartBarTime: bars[2].time,
        chartBarIndex: 2,
        chartBar: bars[2],
        source: 'lower_timeframe',
        ticks: [
          { time: bars[2].time, price: 100, kind: 'intrabar_open', sequence: 0 },
          { time: bars[2].time + 15_000, price: 104, kind: 'intrabar_high', sequence: 1 },
          { time: bars[2].time + 30_000, price: 96, kind: 'intrabar_low', sequence: 2 },
          { time: bars[2].time + 45_000, price: 100, kind: 'intrabar_close', sequence: 3 },
        ],
      }]);

      const result = executeScript(parse(script), bars, undefined, { strategyIntrabarDatafeed: datafeed });

      expect(result.errors).toEqual([]);
      expect(result.strategy.intrabarContexts.map((context) => context.source)).toEqual([
        'chart_ohlc',
        'chart_ohlc',
        'lower_timeframe',
      ]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
        updatedTime: order.updatedTime,
      }))).toEqual([
        { id: 'Long', status: 'filled', avgFillPrice: 100, updatedBarIndex: 0, updatedTime: bars[0].time },
        { id: 'Bracket Limit', status: 'filled', avgFillPrice: 103, updatedBarIndex: 2, updatedTime: bars[2].time + 15_000 },
        { id: 'Bracket Stop', status: 'cancelled', avgFillPrice: null, updatedBarIndex: 2, updatedTime: bars[2].time + 15_000 },
      ]);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        exitOrderId: 'Bracket Limit',
        exitPrice: 103,
        exitBarIndex: 2,
        exitTime: bars[2].time + 15_000,
      });
    });

    it('recalculates historical bars after order fills when calc_on_order_fills is enabled', () => {
      const baseTime = Date.now() - 120000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 100.5, low: 99.5, close: 100.2, volume: 1000 },
        { time: baseTime + 60000, open: 100, high: 100.5, low: 99.6, close: 100.4, volume: 1000 },
      ];
      const script = `//@version=6
strategy("Order fill recalc", calc_on_order_fills=true, process_orders_on_close=true)
var recalculations = 0
recalculations += 1
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=99.8, alert_message="entry filled")
if strategy.position_size > 0
    strategy.close("Long")
plot(strategy.position_size)
plot(strategy.closedtrades)
plot(recalculations)`;

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
        updatedTime: order.updatedTime,
      }))).toEqual([
        { id: 'Long', status: 'filled', avgFillPrice: 99.8, updatedBarIndex: 1, updatedTime: bars[1].time },
        { id: 'Close Long', status: 'filled', avgFillPrice: 100.4, updatedBarIndex: 1, updatedTime: bars[1].time },
      ]);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        exitOrderId: 'Close Long',
        entryBarIndex: 1,
        exitBarIndex: 1,
      });
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [0, 0],
        [0, 1],
        [1, 2],
      ]);
      expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events).toEqual([
        {
          barIndex: 1,
          time: bars[1].time,
          message: 'entry filled',
          frequency: 'all',
          isRealtime: false,
        },
      ]);
      expect(result.strategy.intrabarContexts).toHaveLength(2);
    });

    it('does not fill recalc-created bar magnifier orders on ticks before the triggering fill', () => {
      const baseTime = Date.now() - 180000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
        { time: baseTime + 60000, open: 100, high: 105, low: 96, close: 100, volume: 1000 },
        { time: baseTime + 120000, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      ];
      const script = `//@version=6
strategy("Magnifier fill recalc timeline", calc_on_order_fills=true, use_bar_magnifier=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=97)
if strategy.position_size > 0
    strategy.exit("Take", "Long", limit=104)
plot(strategy.position_size)
plot(strategy.closedtrades)`;
      const datafeed = new InMemoryStrategyIntrabarDatafeed([{
        symbol: 'BTCUSDT',
        timeframe: '60',
        chartBarTime: bars[1].time,
        chartBarIndex: 1,
        chartBar: bars[1],
        source: 'lower_timeframe',
        ticks: [
          { time: bars[1].time, price: 100, kind: 'intrabar_open', sequence: 0 },
          { time: bars[1].time + 15_000, price: 105, kind: 'intrabar_high', sequence: 1 },
          { time: bars[1].time + 30_000, price: 96, kind: 'intrabar_low', sequence: 2 },
          { time: bars[1].time + 45_000, price: 100, kind: 'intrabar_close', sequence: 3 },
        ],
      }]);

      const result = executeScript(parse(script), bars, undefined, { strategyIntrabarDatafeed: datafeed });

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map(({ orderId, price, barIndex, time }) => ({ orderId, price, barIndex, time }))).toEqual([
        { orderId: 'Long', price: 97, barIndex: 1, time: bars[1].time + 30_000 },
      ]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', avgFillPrice: 97, updatedBarIndex: 1 },
        { id: 'Take', status: 'pending', avgFillPrice: null, updatedBarIndex: 2 },
      ]);
      expect(result.strategy.position.size).toBe(1);
      expect(result.strategy.closedTrades).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [0, 1, 1],
        [0, 0, 0],
      ]);
    });

    it('does not record intrabar metadata when the strategy declaration fails', () => {
      const script = `//@version=6
strategy("Invalid", initial_capital=-1, use_bar_magnifier=true)
plot(close)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors[0]?.message).toBe('strategy initial_capital must be a non-negative number');
      expect(result.strategy.intrabarContexts).toEqual([]);
    });

    it('requires strategy.exit to specify a supported exit price', () => {
      const script = `//@version=6
strategy("Strategy call", process_orders_on_close=true)
strategy.entry("Long", strategy.long)
strategy.exit("Long exit", "Long")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('strategy.exit requires a limit, stop, or trailing stop price');
    });

    it('fills default market strategy orders at the next bar open', () => {
      const script = `//@version=6
strategy("Default market timing")
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1_700_000_000_000, open: 10, high: 13, low: 9, close: 12, volume: 100 },
        { time: 1_700_000_060_000, open: 20, high: 22, low: 19, close: 21, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Long', price: 20, barIndex: 1 },
      ]);
      expect(result.strategy.openTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        entryPrice: 20,
        entryBarIndex: 1,
      });
      expect(result.plots[0]?.values).toEqual([0, 2]);
    });

    it('fills process-on-close market strategy orders at the signal bar close', () => {
      const script = `//@version=6
strategy("Close market timing", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1_700_000_000_000, open: 10, high: 13, low: 9, close: 12, volume: 100 },
        { time: 1_700_000_060_000, open: 20, high: 22, low: 19, close: 21, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Long', price: 12, barIndex: 0 },
      ]);
      expect(result.strategy.openTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        entryPrice: 12,
        entryBarIndex: 0,
      });
      expect(result.plots[0]?.values).toEqual([2, 2]);
    });

    it('records strategy entry and order calls as pending ledger orders', () => {
      const script = `//@version=6
strategy("Orders", default_qty_value=1, process_orders_on_close=true)
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
strategy("Orders", process_orders_on_close=true)
strategy.entry("Long", strategy.long, limit=101)
strategy.entry("Add", strategy.long, qty=3, limit=102)
strategy.cancel_all()`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['cancelled', 'cancelled']);
    });

    it('resolves percent-of-equity default quantity on omitted order qty', () => {
      const script = `//@version=6
strategy("Orders", default_qty_type=strategy.percent_of_equity, default_qty_value=10, process_orders_on_close=true)
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
strategy("No equity", initial_capital=0, default_qty_type=strategy.percent_of_equity, default_qty_value=10, process_orders_on_close=true)
strategy.entry("Long", strategy.long)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors[0]?.message).toBe('strategy order resolved qty must be a positive number');
      expect(result.strategy.orders).toEqual([]);
    });

    it('cancels all pending strategy orders that reuse an id', () => {
      const script = `//@version=6
strategy("Orders", process_orders_on_close=true)
strategy.entry("Long", strategy.long, limit=101)
strategy.entry("Long", strategy.long, qty=2, limit=102)
strategy.cancel("Long")`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['cancelled', 'cancelled']);
    });

    it('fills fixed-size market strategy orders at the current close', () => {
      const script = `//@version=6
strategy("Orders", process_orders_on_close=true)
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

    it('applies percent strategy commissions to fills and net profit', () => {
      const script = `//@version=6
strategy("Percent commission",
    process_orders_on_close=true,
    initial_capital=1000,
    commission_type=strategy.commission.percent,
    commission_value=0.1)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.close("Long")
plot(strategy.netprofit)
plot(strategy.equity)`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);
      const entryCommission = bars[0].close * 2 * 0.001;
      const exitCommission = bars[1].close * 2 * 0.001;
      const grossProfit = (bars[1].close - bars[0].close) * 2;
      const netProfit = grossProfit - entryCommission - exitCommission;

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map((fill) => fill.commission)).toEqual([
        entryCommission,
        exitCommission,
      ]);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        profit: grossProfit,
        commission: entryCommission + exitCommission,
      });
      expect(result.strategy.netProfit).toBeCloseTo(netProfit);
      expect(result.strategy.equity).toBeCloseTo(1000 + netProfit);
      expect(result.plots[0]?.values[0]).toBeCloseTo(-entryCommission);
      expect(result.plots[1]?.values[1]).toBeCloseTo(1000 + netProfit);
    });

    it('applies cash per order and cash per contract strategy commissions', () => {
      const perOrder = executeScript(parse(`//@version=6
strategy("Cash per order",
    process_orders_on_close=true,
    initial_capital=1000,
    commission_type=strategy.commission.cash_per_order,
    commission_value=2)
strategy.entry("Long", strategy.long, qty=3)
plot(strategy.equity)`), createBars(1));

      const perContract = executeScript(parse(`//@version=6
strategy("Cash per contract",
    process_orders_on_close=true,
    initial_capital=1000,
    commission_type=strategy.commission.cash_per_contract,
    commission_value=2)
strategy.entry("Long", strategy.long, qty=3)
plot(strategy.equity)`), createBars(1));

      expect(perOrder.errors).toEqual([]);
      expect(perOrder.strategy.fills[0]?.commission).toBe(2);
      expect(perOrder.strategy.equity).toBe(998);
      expect(perOrder.plots[0]?.values).toEqual([998]);

      expect(perContract.errors).toEqual([]);
      expect(perContract.strategy.fills[0]?.commission).toBe(6);
      expect(perContract.strategy.equity).toBe(994);
      expect(perContract.plots[0]?.values).toEqual([994]);
    });

    it('exposes basic strategy.opentrades accessors', () => {
      const script = `//@version=6
strategy("Open access",
    process_orders_on_close=true,
    pyramiding=1,
    commission_type=strategy.commission.cash_per_contract,
    commission_value=1)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2, comment="entry comment")
if bar_index == 1
    strategy.entry("Add", strategy.long, qty=1)
plot(strategy.opentrades.entry_price(0), title="Entry Price")
plot(strategy.opentrades.entry_bar_index(0), title="Entry Bar")
plot(strategy.opentrades.entry_time(0), title="Entry Time")
plot(strategy.opentrades.size(0), title="Size")
plot(strategy.opentrades.profit(0), title="Profit")
plot(strategy.opentrades.commission(0), title="Commission")
plot(strategy.opentrades.profit_percent(0), title="Profit Percent")
plot(strategy.opentrades.capital_held, title="Capital Held")
plot(strategy.account_currency == "USDT" ? 1 : 0, title="Account Currency")
plot(strategy.position_entry_name == "Long" ? 1 : 0, title="Position Entry Name")
plot(strategy.opentrades.max_runup(0), title="Max Runup")
plot(strategy.opentrades.max_drawdown(0), title="Max Drawdown")
plot(strategy.opentrades.max_runup_percent(0), title="Max Runup Percent")
plot(strategy.opentrades.max_drawdown_percent(0), title="Max Drawdown Percent")
plot(strategy.opentrades.entry_comment(0) == "entry comment" ? 1 : 0, title="Entry Comment")
plot(strategy.opentrades.entry_id(1) == "Add" ? 1 : 0, title="Second Id")
plot(strategy.opentrades.size(99), title="Missing")`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Entry Price')?.values).toEqual([
        bars[0].close,
        bars[0].close,
      ]);
      expect(result.plots.find((plot) => plot.title === 'Entry Bar')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Entry Time')?.values).toEqual([bars[0].time, bars[0].time]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Profit')?.values).toEqual([
        0,
        (bars[1].close - bars[0].close) * 2,
      ]);
      expect(result.plots.find((plot) => plot.title === 'Commission')?.values).toEqual([2, 2]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Profit Percent')?.values ?? [])).toEqual([0, 0.499002]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Capital Held')?.values ?? [])).toEqual([200.4, 301.1]);
      expect(result.plots.find((plot) => plot.title === 'Account Currency')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Position Entry Name')?.values).toEqual([1, 1]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Runup')?.values ?? [])).toEqual([0, 1.6]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Drawdown')?.values ?? [])).toEqual([0, 0]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Runup Percent')?.values ?? [])).toEqual([0, 0.798403]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Drawdown Percent')?.values ?? [])).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Entry Comment')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Second Id')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([null, null]);
    });

    it('requires a trade number for strategy.opentrades accessors', () => {
      const script = `//@version=6
strategy("Missing trade num", process_orders_on_close=true)
strategy.entry("Long", strategy.long, qty=1)
plot(strategy.opentrades.entry_price())`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors[0]?.message).toBe('strategy trade_num is required');
    });

    it('exposes basic strategy.closedtrades accessors', () => {
      const script = `//@version=6
strategy("Closed access",
    process_orders_on_close=true,
    commission_type=strategy.commission.cash_per_order,
    commission_value=2)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2, comment="entry comment")
if bar_index == 1
    strategy.close("Long", comment="exit comment")
plot(strategy.closedtrades.entry_id(0) == "Long" ? 1 : 0, title="Entry Id")
plot(strategy.closedtrades.exit_id(0) == "Close Long" ? 1 : 0, title="Exit Id")
plot(strategy.closedtrades.entry_comment(0) == "entry comment" ? 1 : 0, title="Entry Comment")
plot(strategy.closedtrades.exit_comment(0) == "exit comment" ? 1 : 0, title="Exit Comment")
plot(strategy.closedtrades.entry_price(0), title="Entry Price")
plot(strategy.closedtrades.exit_price(0), title="Exit Price")
plot(strategy.closedtrades.entry_bar_index(0), title="Entry Bar")
plot(strategy.closedtrades.exit_bar_index(0), title="Exit Bar")
plot(strategy.closedtrades.entry_time(0), title="Entry Time")
plot(strategy.closedtrades.exit_time(0), title="Exit Time")
plot(strategy.closedtrades.size(0), title="Size")
plot(strategy.closedtrades.profit(0), title="Profit")
plot(strategy.closedtrades.profit_percent(0), title="Profit Percent")
plot(strategy.closedtrades.commission(0), title="Commission")
plot(strategy.closedtrades.max_runup(0), title="Max Runup")
plot(strategy.closedtrades.max_drawdown(0), title="Max Drawdown")
plot(strategy.closedtrades.max_runup_percent(0), title="Max Runup Percent")
plot(strategy.closedtrades.max_drawdown_percent(0), title="Max Drawdown Percent")
plot(strategy.closedtrades.profit(99), title="Missing")`;

      const bars = createBars(2);
      const result = executeScript(parse(script), bars);
      const grossProfit = (bars[1].close - bars[0].close) * 2;

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Entry Id')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Exit Id')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Entry Comment')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Exit Comment')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Entry Price')?.values).toEqual([null, bars[0].close]);
      expect(result.plots.find((plot) => plot.title === 'Exit Price')?.values).toEqual([null, bars[1].close]);
      expect(result.plots.find((plot) => plot.title === 'Entry Bar')?.values).toEqual([null, 0]);
      expect(result.plots.find((plot) => plot.title === 'Exit Bar')?.values).toEqual([null, 1]);
      expect(result.plots.find((plot) => plot.title === 'Entry Time')?.values).toEqual([null, bars[0].time]);
      expect(result.plots.find((plot) => plot.title === 'Exit Time')?.values).toEqual([null, bars[1].time]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([null, 2]);
      expect(result.plots.find((plot) => plot.title === 'Profit')?.values).toEqual([null, grossProfit]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Profit Percent')?.values ?? [])).toEqual([null, 0.499002]);
      expect(result.plots.find((plot) => plot.title === 'Commission')?.values).toEqual([null, 4]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Runup')?.values ?? [])).toEqual([null, 1.6]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Drawdown')?.values ?? [])).toEqual([null, 0]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Runup Percent')?.values ?? [])).toEqual([null, 0.798403]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Max Drawdown Percent')?.values ?? [])).toEqual([null, 0]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([null, null]);
    });

    it('exposes strategy trade outcome counters', () => {
      const script = `//@version=6
strategy("Trade counters", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Win", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Win")
if bar_index == 2
    strategy.entry("Loss", strategy.short, qty=1)
if bar_index == 3
    strategy.close("Loss")
if bar_index == 4
    strategy.entry("Even", strategy.long, qty=1)
    strategy.close("Even")
plot(strategy.wintrades, title="Wins")
plot(strategy.losstrades, title="Losses")
plot(strategy.eventrades, title="Evens")`;

      const result = executeScript(parse(script), createBars(5));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Wins')?.values).toEqual([0, 1, 1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Losses')?.values).toEqual([0, 0, 0, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Evens')?.values).toEqual([0, 0, 0, 0, 1]);
      expect(result.strategy.closedTrades.map((trade) => trade.profit)).toEqual([0.5, -0.5, 0]);
    });

    it('rolls back strategy fills between realtime updateBar calls', () => {
      const script = `//@version=6
strategy("Realtime strategy", process_orders_on_close=true, calc_on_every_tick=true)
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

    it('fills default strategy market orders when a realtime bar starts', () => {
      const script = `//@version=6
strategy("Realtime default market timing")
if bar_index == 2
    strategy.entry("Last", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.position_avg_price, title="Average Price")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders).toHaveLength(1);
      expect(result.strategy.fills).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0]);

      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 150,
        high: 151,
        low: 149,
        close: 150.5,
      };
      const firstUpdate = engine.updateBar(ast, realtimeBar);
      const secondUpdate = engine.updateBar(ast, { ...realtimeBar, close: 150.75 });

      expect(firstUpdate.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0]);
      expect(firstUpdate.find((plot) => plot.title === 'Average Price')?.values).toEqual([null, null, null]);
      expect(secondUpdate.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0]);
      expect(secondUpdate.find((plot) => plot.title === 'Average Price')?.values).toEqual([null, null, null]);
      expect(engine.getStrategyLedger().position).toMatchObject({
        size: 1,
        avgPrice: 150,
      });
    });

    it('does not recalculate default strategies on unconfirmed realtime ticks', () => {
      const script = `//@version=6
strategy("Realtime default calculation", process_orders_on_close=true, calc_on_every_tick=false)
var executions = 0
if barstate.isrealtime
    executions := executions + 1
    strategy.entry("Realtime", strategy.long, qty=1)
plot(executions, title="Executions")
plot(strategy.position_size, title="Position")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Executions')?.values).toEqual([0, 0, 0]);

      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 150,
        high: 151,
        low: 149,
        close: 150.5,
      };
      const firstTick = engine.updateBar(ast, realtimeBar);
      const secondTick = engine.updateBar(ast, { ...realtimeBar, high: 152, close: 151.5 });

      expect(firstTick.find((plot) => plot.title === 'Executions')?.values).toEqual([0, 0, 0]);
      expect(secondTick.find((plot) => plot.title === 'Executions')?.values).toEqual([0, 0, 0]);
      expect(engine.getStrategyLedger().orders).toHaveLength(0);

      const nextBar = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 152,
        high: 153,
        low: 151,
        close: 152.5,
      });

      expect(nextBar.find((plot) => plot.title === 'Executions')?.values).toEqual([0, 0, 0, 1]);
      expect(nextBar.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0, 1]);
      expect(engine.getStrategyLedger().orders).toHaveLength(1);
      expect(engine.getStrategyLedger().fills).toHaveLength(1);
    });

    it('recalculates calc_on_every_tick strategies on unconfirmed realtime ticks', () => {
      const script = `//@version=6
strategy("Realtime every tick", calc_on_every_tick=true)
varip executions = 0
if barstate.isrealtime
    executions := executions + 1
plot(executions, title="Executions")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 150,
        high: 151,
        low: 149,
        close: 150.5,
      };
      const firstTick = engine.updateBar(ast, realtimeBar);
      const firstValues = [...firstTick.find((plot) => plot.title === 'Executions')!.values];
      const secondTick = engine.updateBar(ast, { ...realtimeBar, high: 152, close: 151.5 });
      const secondValues = [...secondTick.find((plot) => plot.title === 'Executions')!.values];

      expect(firstValues).toEqual([0, 0, 0, 1]);
      expect(secondValues).toEqual([0, 0, 0, 2]);
    });

    it('refreshes strategy execution paths between realtime ticks', () => {
      const script = `//@version=6
strategy("Realtime refreshed paths")
if bar_index == 2
    strategy.entry("Buy", strategy.long, limit=90, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open Trades")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();
      engine.execute(ast, bars);

      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 105,
        high: 106,
        low: 104,
        close: 105.5,
      };
      const firstTick = engine.updateBar(ast, realtimeBar);
      const secondTick = engine.updateBar(ast, { ...realtimeBar, low: 89, close: 90.5 });

      expect(firstTick.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0]);
      expect(firstTick.find((plot) => plot.title === 'Open Trades')?.values).toEqual([0, 0, 0]);
      expect(secondTick.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0]);
      expect(secondTick.find((plot) => plot.title === 'Open Trades')?.values).toEqual([0, 0, 0]);
      expect(engine.getStrategyLedger().fills).toHaveLength(1);
      expect(engine.getStrategyLedger().fills[0]).toMatchObject({
        orderId: 'Buy',
        price: 90,
      });
    });

    it('recalculates default realtime strategies after order fills when calc_on_order_fills is enabled', () => {
      const script = `//@version=6
strategy("Realtime fill recalc", calc_on_order_fills=true, calc_on_every_tick=false, process_orders_on_close=true)
var recalculations = 0
if barstate.isrealtime
    recalculations += 1
    alert("user realtime alert", alert.freq_all)
if bar_index == 2 and barstate.ishistory
    strategy.entry("Buy", strategy.long, limit=99, qty=1, alert_message="entry filled")
if strategy.position_size > 0
    strategy.close("Buy")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(recalculations, title="Recalculations")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['pending']);
      expect(result.plots.find((plot) => plot.title === 'Recalculations')?.values).toEqual([0, 0, 0]);

      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 105,
        high: 106,
        low: 98,
        close: 104,
      };
      const plots = engine.updateBar(ast, realtimeBar);
      const ledger = engine.getStrategyLedger();
      const alerts = engine.getAlerts();

      expect(plots.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0, 0]);
      expect(plots.find((plot) => plot.title === 'Closed Trades')?.values).toEqual([0, 0, 0, 1]);
      expect(plots.find((plot) => plot.title === 'Recalculations')?.values).toEqual([0, 0, 0, 1]);
      expect(engine.getProfile().bars).toBe(2);
      expect(ledger.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
      }))).toEqual([
        { id: 'Buy', status: 'filled', avgFillPrice: 99 },
        { id: 'Close Buy', status: 'filled', avgFillPrice: 104 },
      ]);
      expect(ledger.closedTrades[0]).toMatchObject({
        entryOrderId: 'Buy',
        exitOrderId: 'Close Buy',
        entryBarIndex: 3,
        exitBarIndex: 3,
      });
      expect(alerts.find((alert) => alert.type === 'alert' && alert.message === 'user realtime alert')?.events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 3, message: 'user realtime alert', frequency: 'all' },
      ]);
      expect(alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 3, message: 'entry filled', frequency: 'all' },
      ]);
    });

    it('recalculates after pending market orders fill at a new realtime bar open', () => {
      const script = `//@version=6
strategy("Realtime open fill recalc", calc_on_order_fills=true, calc_on_every_tick=false)
if bar_index == 2 and barstate.ishistory
    strategy.entry("Open Buy", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open Trades")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.status)).toEqual(['pending']);

      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 105,
        high: 106,
        low: 104,
        close: 105.5,
      };
      const plots = engine.updateBar(ast, realtimeBar);
      const ledger = engine.getStrategyLedger();

      expect(plots.find((plot) => plot.title === 'Position')?.values).toEqual([0, 0, 0, 1]);
      expect(plots.find((plot) => plot.title === 'Open Trades')?.values).toEqual([0, 0, 0, 1]);
      expect(engine.getProfile().bars).toBe(1);
      expect(ledger.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
      }))).toEqual([
        { id: 'Open Buy', status: 'filled', avgFillPrice: 105 },
      ]);
    });

    it('throws when realtime order-fill recalculation exceeds the loop guard', () => {
      const script = `//@version=6
strategy("Realtime recalc loop",
    calc_on_order_fills=true,
    calc_on_every_tick=true,
    process_orders_on_close=true,
    pyramiding=100)
if barstate.isrealtime
    strategy.entry("Loop", strategy.long, qty=1)
plot(strategy.position_size, title="Position")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toEqual([]);
      expect(() => engine.updateBar(ast, {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 105,
        high: 106,
        low: 104,
        close: 105.5,
      })).toThrow('strategy calc_on_order_fills exceeded 20 recalculations on bar 3');
    });

    it('closes matching entry trades with strategy.close market orders', () => {
      const script = `//@version=6
strategy("Close", process_orders_on_close=true)
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

    it('fills strategy.close immediately on the current bar when requested', () => {
      const script = `//@version=6
strategy("Close immediately", process_orders_on_close=false)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long", immediately=true)
plot(strategy.position_size)
plot(strategy.closedtrades)`;

      const bars = createBars(3);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', avgFillPrice: bars[1].open, updatedBarIndex: 1 },
        { id: 'Close Long', status: 'filled', avgFillPrice: bars[1].close, updatedBarIndex: 1 },
      ]);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        exitOrderId: 'Close Long',
        entryBarIndex: 1,
        exitBarIndex: 1,
        entryPrice: bars[1].open,
        exitPrice: bars[1].close,
      });
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [0, 0, 0],
        [0, 1, 1],
      ]);
    });

    it('emits strategy order-fill alerts from alert_message fields', () => {
      const script = `//@version=6
strategy("Fill alerts", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, alert_message="entry filled")
if bar_index == 1
    strategy.close("Long", alert_message="close filled")
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));
      const fillAlerts = result.alerts.find((alert) => alert.id === 'strategy_order_fills');

      expect(result.errors).toEqual([]);
      expect(fillAlerts).toMatchObject({
        id: 'strategy_order_fills',
        type: 'alert',
        title: 'alert',
      });
      expect(fillAlerts?.events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'entry filled', frequency: 'all' },
        { barIndex: 1, message: 'close filled', frequency: 'all' },
      ]);
    });

    it('suppresses strategy order-fill alerts when disable_alert is true', () => {
      const script = `//@version=6
strategy("Suppressed fill alerts", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, alert_message="entry suppressed", disable_alert=true)
if bar_index == 1
    strategy.close("Long", alert_message="close suppressed", disable_alert=true)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')).toBeUndefined();
      expect(result.strategy.fills.map((fill) => ({
        orderId: fill.orderId,
        alertMessage: fill.alertMessage,
        disableAlert: fill.disableAlert,
      }))).toEqual([
        { orderId: 'Long', alertMessage: 'entry suppressed', disableAlert: true },
        { orderId: 'Close Long', alertMessage: 'close suppressed', disableAlert: true },
      ]);
    });

    it('does not emit strategy order-fill alerts without alert_message fields', () => {
      const script = `//@version=6
strategy("No fill alerts", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long")
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')).toBeUndefined();
    });

    it('closes the full net position with strategy.close_all', () => {
      const script = `//@version=6
strategy("Close all", process_orders_on_close=true)
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

    it('fills strategy.close_all immediately on the current bar when requested', () => {
      const script = `//@version=6
strategy("Close all immediately", process_orders_on_close=false)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.close_all(immediately=true)
plot(strategy.position_size)
plot(strategy.closedtrades)`;

      const bars = createBars(3);
      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', avgFillPrice: bars[1].open, updatedBarIndex: 1 },
        { id: 'Close All', status: 'filled', avgFillPrice: bars[1].close, updatedBarIndex: 1 },
      ]);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryOrderId: 'Long',
        exitOrderId: 'Close All',
        qty: 2,
        entryBarIndex: 1,
        exitBarIndex: 1,
      });
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [0, 0, 0],
        [0, 1, 1],
      ]);
    });

    it('resolves mixed named and positional strategy arguments in Pine order', () => {
      const script = `//@version=6
strategy("Mixed strategy args", process_orders_on_close=true)
if bar_index == 0
    strategy.entry(id="Long", strategy.long, 2, na, na, "entry-group", strategy.oca.cancel, "entry comment", "entry alert")
    strategy.order(id="ShortLimit", strategy.short, 1, 999, na, "short-group", strategy.oca.reduce, "order comment", "order alert")
if bar_index == 1
    strategy.exit(id="Bracket", "Long", na, 50, na, 103, na, 97, na, na, na, na, "exit comment", "tp comment", "sl comment")
    strategy.close(id="Long", "reduce comment", 1, na, "close alert")
if bar_index == 2
    strategy.close_all(comment="flat comment", "flat alert")
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        type: order.type,
        status: order.status,
        qty: order.qty,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        ocaName: order.ocaName,
        ocaType: order.ocaType,
        fromEntry: order.fromEntry,
        comment: order.comment,
        alertMessage: order.alertMessage,
      }))).toEqual([
        {
          id: 'Long',
          direction: 'long',
          type: 'market',
          status: 'filled',
          qty: 2,
          limitPrice: undefined,
          stopPrice: undefined,
          ocaName: 'entry-group',
          ocaType: 'cancel',
          fromEntry: undefined,
          comment: 'entry comment',
          alertMessage: 'entry alert',
        },
        {
          id: 'ShortLimit',
          direction: 'short',
          type: 'limit',
          status: 'pending',
          qty: 1,
          limitPrice: 999,
          stopPrice: undefined,
          ocaName: 'short-group',
          ocaType: 'reduce',
          fromEntry: undefined,
          comment: 'order comment',
          alertMessage: 'order alert',
        },
        {
          id: 'Bracket Limit',
          direction: 'short',
          type: 'limit',
          status: 'pending',
          qty: 1,
          limitPrice: 103,
          stopPrice: undefined,
          ocaName: 'Long:Bracket',
          ocaType: 'cancel',
          fromEntry: 'Long',
          comment: 'tp comment',
          alertMessage: undefined,
        },
        {
          id: 'Bracket Stop',
          direction: 'short',
          type: 'stop',
          status: 'pending',
          qty: 1,
          limitPrice: undefined,
          stopPrice: 97,
          ocaName: 'Long:Bracket',
          ocaType: 'cancel',
          fromEntry: 'Long',
          comment: 'sl comment',
          alertMessage: undefined,
        },
        {
          id: 'Close Long',
          direction: 'short',
          type: 'market',
          status: 'filled',
          qty: 1,
          limitPrice: undefined,
          stopPrice: undefined,
          ocaName: undefined,
          ocaType: undefined,
          fromEntry: 'Long',
          comment: 'reduce comment',
          alertMessage: 'close alert',
        },
        {
          id: 'Close All',
          direction: 'short',
          type: 'market',
          status: 'filled',
          qty: 1,
          limitPrice: undefined,
          stopPrice: undefined,
          ocaName: undefined,
          ocaType: undefined,
          fromEntry: undefined,
          comment: 'flat comment',
          alertMessage: 'flat alert',
        },
      ]);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.closedTrades).toHaveLength(2);
    });

    it('uses trailing-specific strategy.exit metadata with mixed arguments', () => {
      const script = `//@version=6
strategy("Mixed trailing exit", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit(id="Trail", "Long", na, na, na, na, na, na, na, 2, 1, na, "base comment", na, na, "trail comment", "base alert", na, na, "trail alert")
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(2), undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[1]).toMatchObject({
        id: 'Trail',
        type: 'trailing_stop',
        status: 'pending',
        fromEntry: 'Long',
        trailOffset: 0.25,
        comment: 'trail comment',
        alertMessage: 'trail alert',
      });
    });

    it('records strategy.exit limit and stop brackets as pending exit orders', () => {
      const script = `//@version=6
strategy("Exit brackets", process_orders_on_close=true)
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

    it('cancels generated strategy.exit bracket orders by their source id', () => {
      const script = `//@version=6
strategy("Cancel exit brackets", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=101.4, stop=99)
if bar_index == 2
    strategy.cancel("Bracket")
plot(strategy.position_size)
plot(strategy.closedtrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.5, low: 99.8, close: 100.3, volume: 1000 },
        { time: 3, open: 100.3, high: 101.5, low: 98.5, close: 100.1, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        sourceId: order.sourceId,
        status: order.status,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', sourceId: undefined, status: 'filled', avgFillPrice: 100.2, updatedBarIndex: 0 },
        { id: 'Bracket Limit', sourceId: 'Bracket', status: 'cancelled', avgFillPrice: null, updatedBarIndex: 2 },
        { id: 'Bracket Stop', sourceId: 'Bracket', status: 'cancelled', avgFillPrice: null, updatedBarIndex: 2 },
      ]);
      expect(result.strategy.position.size).toBe(1);
      expect(result.strategy.closedTrades).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 1, 1],
        [0, 0, 0],
      ]);
    });

    it('records long strategy.exit profit and loss offsets as tick-based brackets', () => {
      const script = `//@version=6
strategy("Exit profit loss", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.exit("Bracket", "Long", profit=4, loss=2)
plot(strategy.opentrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.5, low: 99.8, close: 100.1, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        type: order.type,
        status: order.status,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        ocaType: order.ocaType,
      }))).toEqual([
        {
          id: 'Long',
          direction: 'long',
          type: 'market',
          status: 'filled',
          limitPrice: undefined,
          stopPrice: undefined,
          ocaType: undefined,
        },
        {
          id: 'Bracket Limit',
          direction: 'short',
          type: 'limit',
          status: 'pending',
          limitPrice: 101.2,
          stopPrice: undefined,
          ocaType: 'cancel',
        },
        {
          id: 'Bracket Stop',
          direction: 'short',
          type: 'stop',
          status: 'pending',
          limitPrice: undefined,
          stopPrice: 99.7,
          ocaType: 'cancel',
        },
      ]);
    });

    it('records short strategy.exit profit and loss offsets as tick-based brackets', () => {
      const script = `//@version=6
strategy("Short exit profit loss", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Short", strategy.short, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Short", profit=4, loss=2)
plot(strategy.opentrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.6, low: 99.4, close: 100.1, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        type: order.type,
        status: order.status,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
      }))).toEqual([
        {
          id: 'Short',
          direction: 'short',
          type: 'market',
          status: 'filled',
          limitPrice: undefined,
          stopPrice: undefined,
        },
        {
          id: 'Bracket Limit',
          direction: 'long',
          type: 'limit',
          status: 'pending',
          limitPrice: 99.2,
          stopPrice: undefined,
        },
        {
          id: 'Bracket Stop',
          direction: 'long',
          type: 'stop',
          status: 'pending',
          limitPrice: undefined,
          stopPrice: 100.7,
        },
      ]);
    });

    it('prefers absolute strategy.exit limit and stop prices over profit and loss offsets', () => {
      const script = `//@version=6
strategy("Exit absolute precedence", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", profit=4, limit=102, loss=2, stop=99)
plot(strategy.opentrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.5, low: 99.8, close: 100.1, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[1]).toMatchObject({
        id: 'Bracket Limit',
        limitPrice: 102,
      });
      expect(result.strategy.orders[2]).toMatchObject({
        id: 'Bracket Stop',
        stopPrice: 99,
      });
    });

    it('applies strategy slippage using syminfo mintick for market and stop fills', () => {
      const script = `//@version=6
strategy("Slippage fills", slippage=2, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Stop", "Long", stop=100.8)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(3), undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map((fill) => ({
        orderId: fill.orderId,
        price: fill.price,
        slippage: fill.slippage,
        barIndex: fill.barIndex,
      }))).toEqual([
        { orderId: 'Long', price: 100.7, slippage: 0.5, barIndex: 0 },
        { orderId: 'Stop', price: 100.3, slippage: -0.5, barIndex: 2 },
      ]);
      expect(result.strategy.closedTrades[0]).toMatchObject({
        entryPrice: 100.7,
        exitPrice: 100.3,
      });
      expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(-0.4);
      expect(result.plots[0]?.values).toEqual([0, 0, 0]);
    });

    it('updates an existing pending strategy.exit order with the same id', () => {
      const script = `//@version=6
strategy("Exit updates", process_orders_on_close=true)
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
strategy("Exit shape updates", process_orders_on_close=true)
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
strategy("Limit fill", process_orders_on_close=true)
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
strategy("Cash sizing", default_qty_type=strategy.cash, default_qty_value=1000, process_orders_on_close=true)
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

    it('activates and fills long stop-limit entry orders on later ticks in the same bar', () => {
      const script = `//@version=6
strategy("Long stop-limit", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, stop=101, limit=100.7)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(4));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Long',
        type: 'stop_limit',
        status: 'filled',
        stopLimitActivated: true,
        stopLimitActivatedBarIndex: 1,
        avgFillPrice: 100.7,
        updatedBarIndex: 1,
      });
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Long', price: 100.7, barIndex: 1 },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: 'long',
        size: 1,
        avgPrice: 100.7,
      });
      expect(result.plots[0]?.values).toEqual([0, 0, 1, 1]);
    });

    it('activates and fills short stop-limit strategy.order calls on later ticks in the same bar', () => {
      const script = `//@version=6
strategy("Short stop-limit", process_orders_on_close=true)
if bar_index == 0
    strategy.order("Short", strategy.short, qty=1, stop=100.2, limit=101)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(4));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[0]).toMatchObject({
        id: 'Short',
        type: 'stop_limit',
        status: 'filled',
        stopLimitActivated: true,
        stopLimitActivatedBarIndex: 1,
        avgFillPrice: 101,
        updatedBarIndex: 1,
      });
      expect(result.strategy.fills.map(({ orderId, price, barIndex }) => ({ orderId, price, barIndex }))).toEqual([
        { orderId: 'Short', price: 101, barIndex: 1 },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: 'short',
        size: -1,
        avgPrice: 101,
      });
      expect(result.plots[0]?.values).toEqual([0, 0, -1, -1]);
    });

    it('blocks same-direction strategy.entry calls above the pyramiding limit', () => {
      const script = `//@version=6
strategy("Pyramiding default", process_orders_on_close=true)
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
strategy("Pyramiding allowed", pyramiding=1, process_orders_on_close=true)
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
strategy("Entry reversal", process_orders_on_close=true)
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
        filledQty: order.filledQty,
        status: order.status,
      }))).toEqual([
        { id: 'Long', direction: 'long', qty: 2, filledQty: 2, status: 'filled' },
        { id: 'Short', direction: 'short', qty: 1, filledQty: 3, status: 'filled' },
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

    it('sizes pending strategy.entry reversals from the live position at fill time', () => {
      const script = `//@version=6
strategy("Pending entry reversal", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("ShortStop", strategy.short, qty=1, stop=100.8)
    strategy.close("Long", qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
        status: order.status,
      }))).toEqual([
        { id: 'Long', qty: 2, requestedQty: 2, filledQty: 2, status: 'filled' },
        { id: 'ShortStop', qty: 1, requestedQty: 1, filledQty: 2, status: 'filled' },
        { id: 'Close Long', qty: 1, requestedQty: 1, filledQty: 1, status: 'filled' },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: 'short',
        size: -1,
        avgPrice: 100.8,
      });
      expect(result.strategy.closedTrades).toHaveLength(2);
      expect(result.strategy.openTrades).toHaveLength(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 1, 1],
        [1, 1, 1],
        [0, 1, 1],
      ]);
    });

    it('limits strategy.entry reversals with strategy.risk.allow_entry_in', () => {
      const script = `//@version=6
strategy("Entry direction risk", process_orders_on_close=true)
strategy.risk.allow_entry_in(strategy.direction.long)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("Blocked Short", strategy.short, qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.settings.allowedEntryDirection).toBe('long');
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        direction: order.direction,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
        status: order.status,
      }))).toEqual([
        { id: 'Long', direction: 'long', qty: 2, requestedQty: 2, filledQty: 2, status: 'filled' },
        { id: 'Blocked Short', direction: 'short', qty: 2, requestedQty: 0, filledQty: 2, status: 'filled' },
      ]);
      expect(result.strategy.position).toMatchObject({
        direction: null,
        size: 0,
        avgPrice: null,
      });
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.strategy.openTrades).toHaveLength(0);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 0],
        [1, 0],
        [0, 1],
      ]);
    });

    it('does not auto-reverse raw strategy.order calls', () => {
      const script = `//@version=6
strategy("Order no reversal", process_orders_on_close=true)
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

    it('does not apply strategy.risk.allow_entry_in to raw strategy.order calls', () => {
      const script = `//@version=6
strategy("Order ignores entry direction risk", process_orders_on_close=true)
strategy.risk.allow_entry_in(strategy.direction.long)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.order("Short", strategy.short, qty=1)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'Long', qty: 2, requestedQty: 2, filledQty: 2 },
        { id: 'Short', qty: 1, requestedQty: 1, filledQty: 1 },
      ]);
      expect(result.strategy.position.size).toBe(1);
      expect(result.plots[0]?.values).toEqual([2, 1]);
    });

    it('caps strategy.entry exposure with strategy.risk.max_position_size', () => {
      const script = `//@version=6
strategy("Max position risk", process_orders_on_close=true, pyramiding=2)
strategy.risk.max_position_size(3)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=2)
if bar_index == 2
    strategy.entry("C", strategy.long, qty=1)
plot(strategy.position_size)
plot(strategy.opentrades)`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.strategy.settings.maxPositionSize).toBe(3);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'A', qty: 2, requestedQty: 2, filledQty: 2 },
        { id: 'B', qty: 1, requestedQty: 1, filledQty: 1 },
      ]);
      expect(result.strategy.position.size).toBe(3);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [2, 3, 3],
        [1, 2, 2],
      ]);
    });

    it('counts pending same-direction entries toward strategy.risk.max_position_size', () => {
      const script = `//@version=6
strategy("Pending max position risk", pyramiding=2)
strategy.risk.max_position_size(3)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=2)
    strategy.entry("B", strategy.long, qty=2)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'A', qty: 2, requestedQty: 2, filledQty: 2 },
        { id: 'B', qty: 1, requestedQty: 1, filledQty: 1 },
      ]);
      expect(result.strategy.position.size).toBe(3);
      expect(result.plots[0]?.values).toEqual([0, 3]);
    });

    it('does not apply strategy.risk.max_position_size to raw strategy.order calls', () => {
      const script = `//@version=6
strategy("Raw order ignores max position", process_orders_on_close=true)
strategy.risk.max_position_size(1)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.order("Add", strategy.long, qty=2)
plot(strategy.position_size)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        qty: order.qty,
        requestedQty: order.requestedQty,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'Long', qty: 1, requestedQty: 1, filledQty: 1 },
        { id: 'Add', qty: 2, requestedQty: 2, filledQty: 2 },
      ]);
      expect(result.strategy.position.size).toBe(3);
      expect(result.plots[0]?.values).toEqual([1, 3]);
    });

    it('captures common strategy.risk guard metadata', () => {
      const script = `//@version=6
strategy("Risk metadata")
strategy.risk.max_drawdown(value=25, type=strategy.percent_of_equity, alert_message="drawdown")
strategy.risk.max_intraday_loss(value=1000, type=strategy.cash, alert_message="loss")
strategy.risk.max_intraday_filled_orders(10, "fills")
strategy.risk.max_cons_loss_days(count=3, alert_message="days")
plot(close)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.strategy.settings.riskRules).toEqual({
        maxDrawdown: { value: 25, type: 'percent_of_equity', alertMessage: 'drawdown' },
        maxIntradayLoss: { value: 1000, type: 'cash', alertMessage: 'loss' },
        maxIntradayFilledOrders: { count: 10, alertMessage: 'fills' },
        maxConsLossDays: { count: 3, alertMessage: 'days' },
      });
    });

    it('blocks new non-exit orders after strategy.risk.max_intraday_filled_orders is reached', () => {
      const script = `//@version=6
strategy("Intraday fill cap", process_orders_on_close=true)
strategy.risk.max_intraday_filled_orders(count=1)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.order("Add", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = createBars(2).map((bar, index) => ({
        ...bar,
        time: Date.UTC(2024, 0, 1, 9, index),
      }));

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
      expect(result.plots[0]?.values).toEqual([0, 0]);
    });

    it('cancels excess pending non-exit fills after strategy.risk.max_intraday_filled_orders is reached', () => {
      const script = `//@version=6
strategy("Pending intraday fill cap", pyramiding=2)
strategy.risk.max_intraday_filled_orders(count=1)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
    strategy.entry("B", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = createBars(2).map((bar, index) => ({
        ...bar,
        time: Date.UTC(2024, 0, 1, 9, index),
      }));

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'A', status: 'filled', filledQty: 1 },
        { id: 'B', status: 'cancelled', filledQty: 0 },
        { id: 'Risk Close All', status: 'filled', filledQty: 1 },
      ]);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['A', 'Risk Close All']);
      expect(result.plots[0]?.values).toEqual([0, 0]);
    });

    it('force-closes before restricted close-only entries after strategy.risk.max_intraday_filled_orders is reached', () => {
      const script = `//@version=6
strategy("Close-only after intraday cap", process_orders_on_close=true)
strategy.risk.max_intraday_filled_orders(count=1)
strategy.risk.allow_entry_in(strategy.direction.long)
if bar_index == 0
    strategy.order("RawLong", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("CloseOnlyShort", strategy.short, qty=1)
plot(strategy.position_size)`;
      const bars = createBars(2).map((bar, index) => ({
        ...bar,
        time: Date.UTC(2024, 0, 1, 9, index),
      }));

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['RawLong', 'Risk Close All']);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        requestedQty: order.requestedQty,
      }))).toEqual([
        { id: 'RawLong', status: 'filled', requestedQty: 1 },
        { id: 'Risk Close All', status: 'filled', requestedQty: 1 },
      ]);
      expect(result.plots[0]?.values).toEqual([0, 0]);
    });

    it('blocks new non-exit orders after strategy.risk.max_cons_loss_days is reached', () => {
      const script = `//@version=6
strategy("Consecutive loss day cap", process_orders_on_close=true)
strategy.risk.max_cons_loss_days(count=2)
if bar_index == 0
    strategy.entry("Day 1", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Day 1")
if bar_index == 2
    strategy.entry("Day 2", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Day 2")
if bar_index == 4
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 98, close: 99, volume: 100 },
        { time: Date.UTC(2024, 0, 2, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 2, 10), open: 100, high: 101, low: 97, close: 98, volume: 100 },
        { time: Date.UTC(2024, 0, 3, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Day 1', 'Close Day 1', 'Day 2', 'Close Day 2']);
      expect(result.strategy.closedTrades.map((trade) => ({
        entryOrderId: trade.entryOrderId,
        exitOrderId: trade.exitOrderId,
        profit: trade.profit,
        exitTime: trade.exitTime,
      }))).toEqual([
        { entryOrderId: 'Day 1', exitOrderId: 'Close Day 1', profit: -1, exitTime: Date.UTC(2024, 0, 1, 10) },
        { entryOrderId: 'Day 2', exitOrderId: 'Close Day 2', profit: -2, exitTime: Date.UTC(2024, 0, 2, 10) },
      ]);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Day 1', 'Close Day 1', 'Day 2', 'Close Day 2']);
      expect(result.plots[0]?.values).toEqual([1, 0, 1, 0, 0]);
    });

    it('cancels pending non-exit fills after strategy.risk.max_cons_loss_days is reached', () => {
      const script = `//@version=6
strategy("Pending consecutive loss day cap", pyramiding=2, process_orders_on_close=true)
strategy.risk.max_cons_loss_days(count=1)
if bar_index == 0
    strategy.entry("Loss", strategy.long, qty=1)
    strategy.entry("Pending", strategy.long, qty=1, limit=95)
if bar_index == 1
    strategy.close("Loss")
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 98, close: 99, volume: 100 },
        { time: Date.UTC(2024, 0, 2, 9), open: 99, high: 100, low: 94, close: 96, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        filledQty: order.filledQty,
      }))).toEqual([
        { id: 'Loss', status: 'filled', filledQty: 1 },
        { id: 'Pending', status: 'cancelled', filledQty: 0 },
        { id: 'Close Loss', status: 'filled', filledQty: 1 },
      ]);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Loss', 'Close Loss']);
      expect(result.plots[0]?.values).toEqual([1, 0, 0]);
    });

    it('blocks new non-exit orders after strategy.risk.max_intraday_loss cash is reached', () => {
      const script = `//@version=6
strategy("Intraday loss cap", process_orders_on_close=true)
strategy.risk.max_intraday_loss(value=5, type=strategy.cash)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 89, close: 90, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 11), open: 90, high: 92, low: 88, close: 91, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
        { equity: 100_000, drawdown: 0 },
        { equity: 99_990, drawdown: 10 },
        { equity: 99_990, drawdown: 10 },
      ]);
      expect(result.plots[0]?.values).toEqual([1, 0, 0]);
    });

    it('blocks new non-exit orders after strategy.risk.max_intraday_loss percent is reached', () => {
      const script = `//@version=6
strategy("Intraday percent loss cap", initial_capital=1000, process_orders_on_close=true)
strategy.risk.max_intraday_loss(value=1, type=strategy.percent_of_equity)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 2
    strategy.order("Blocked", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 94, close: 94, volume: 100 },
        { time: Date.UTC(2024, 0, 1, 11), open: 94, high: 95, low: 93, close: 95, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
        { equity: 1000, drawdown: 0 },
        { equity: 988, drawdown: 12 },
        { equity: 988, drawdown: 12 },
      ]);
      expect(result.plots[0]?.values).toEqual([2, 0, 0]);
    });

    it('blocks new non-exit orders after strategy.risk.max_drawdown cash is reached', () => {
      const script = `//@version=6
strategy("Max drawdown cash cap", process_orders_on_close=true)
strategy.risk.max_drawdown(value=5, type=strategy.cash)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 2, 9), open: 100, high: 101, low: 89, close: 90, volume: 100 },
        { time: Date.UTC(2024, 0, 3, 9), open: 90, high: 92, low: 88, close: 91, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
        { equity: 100_000, drawdown: 0 },
        { equity: 99_990, drawdown: 10 },
        { equity: 99_990, drawdown: 10 },
      ]);
      expect(result.plots[0]?.values).toEqual([1, 0, 0]);
    });

    it('blocks new non-exit orders after strategy.risk.max_drawdown percent is reached', () => {
      const script = `//@version=6
strategy("Max drawdown percent cap", initial_capital=1000, process_orders_on_close=true)
strategy.risk.max_drawdown(value=1, type=strategy.percent_of_equity)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 2
    strategy.order("Blocked", strategy.long, qty=1)
plot(strategy.position_size)`;
      const bars = [
        { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
        { time: Date.UTC(2024, 0, 2, 9), open: 100, high: 101, low: 94, close: 94, volume: 100 },
        { time: Date.UTC(2024, 0, 3, 9), open: 94, high: 95, low: 93, close: 95, volume: 100 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
      expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
        { equity: 1000, drawdown: 0 },
        { equity: 988, drawdown: 12 },
        { equity: 988, drawdown: 12 },
      ]);
      expect(result.plots[0]?.values).toEqual([2, 0, 0]);
    });

    it('fills strategy.exit brackets and cancels the sibling OCA order', () => {
      const script = `//@version=6
strategy("Exit bracket fill", process_orders_on_close=true)
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
strategy("OCA scope", pyramiding=1, process_orders_on_close=true)
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

    it('cancels stale strategy.exit orders instead of reversing the position', () => {
      const script = `//@version=6
strategy("Exit overfill cap", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Take", "Long", qty=1, limit=101.4)
    strategy.exit("Stop", "Long", qty=1, stop=98)
plot(strategy.position_size)
plot(strategy.closedtrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.5, low: 99.8, close: 100.3, volume: 1000 },
        { time: 3, open: 100.3, high: 101.5, low: 97.5, close: 100.1, volume: 1000 },
        { time: 4, open: 100.1, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        isExit: order.isExit,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'Long', status: 'filled', isExit: false, avgFillPrice: 100.2, updatedBarIndex: 0 },
        { id: 'Take', status: 'filled', isExit: true, avgFillPrice: 101.4, updatedBarIndex: 2 },
        { id: 'Stop', status: 'cancelled', isExit: true, avgFillPrice: null, updatedBarIndex: 2 },
      ]);
      expect(result.strategy.position.size).toBe(0);
      expect(result.strategy.openTrades).toEqual([]);
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 1, 1, 0],
        [0, 0, 0, 1],
      ]);
    });

    it('keeps raw strategy.order fills able to reverse positions', () => {
      const script = `//@version=6
strategy("Raw order reversal", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.order("Reverse", strategy.short, qty=2, limit=101.4)
plot(strategy.position_size)
plot(strategy.opentrades)
plot(strategy.closedtrades)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 1000 },
        { time: 2, open: 100.2, high: 100.5, low: 99.8, close: 100.3, volume: 1000 },
        { time: 3, open: 100.3, high: 101.5, low: 99.8, close: 101, volume: 1000 },
        { time: 4, open: 101, high: 101.2, low: 100.5, close: 100.8, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        isExit: order.isExit,
        avgFillPrice: order.avgFillPrice,
      }))).toEqual([
        { id: 'Long', status: 'filled', isExit: false, avgFillPrice: 100.2 },
        { id: 'Reverse', status: 'filled', isExit: false, avgFillPrice: 101.4 },
      ]);
      expect(result.strategy.position.size).toBe(-1);
      expect(result.strategy.openTrades).toHaveLength(1);
      expect(result.strategy.openTrades[0]).toMatchObject({
        entryOrderId: 'Reverse',
        direction: 'short',
        qty: 1,
      });
      expect(result.strategy.closedTrades).toHaveLength(1);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [1, 1, 1, -1],
        [1, 1, 1, 1],
        [0, 0, 0, 1],
      ]);
    });

    it('reduces pending strategy.oca.reduce sibling quantities after a fill', () => {
      const script = `//@version=6
strategy("OCA reduce partial")
if bar_index == 0
    strategy.order("A", strategy.long, qty=3, limit=99, oca_name="grp", oca_type=strategy.oca.reduce)
    strategy.order("B", strategy.long, qty=5, limit=95, oca_name="grp", oca_type=strategy.oca.reduce)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99.5, close: 100, volume: 1000 },
        { time: 2, open: 100, high: 101, low: 98.5, close: 100, volume: 1000 },
        { time: 3, open: 100, high: 101, low: 99.5, close: 100, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        qty: order.qty,
        requestedQty: order.requestedQty,
        qtyValue: order.qtyValue,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'A', status: 'filled', qty: 3, requestedQty: 3, qtyValue: 3, avgFillPrice: 99, updatedBarIndex: 1 },
        { id: 'B', status: 'pending', qty: 2, requestedQty: 2, qtyValue: 2, avgFillPrice: null, updatedBarIndex: 1 },
      ]);
      expect(result.strategy.position.size).toBe(3);
      expect(result.plots[0]?.values).toEqual([0, 0, 3]);
    });

    it('cancels strategy.oca.reduce siblings when a fill consumes their quantity', () => {
      const script = `//@version=6
strategy("OCA reduce cancel")
if bar_index == 0
    strategy.order("A", strategy.long, qty=3, limit=99, oca_name="grp", oca_type=strategy.oca.reduce)
    strategy.order("B", strategy.long, qty=2, limit=95, oca_name="grp", oca_type=strategy.oca.reduce)
plot(strategy.position_size)`;
      const bars: Bar[] = [
        { time: 1, open: 100, high: 101, low: 99.5, close: 100, volume: 1000 },
        { time: 2, open: 100, high: 101, low: 98.5, close: 100, volume: 1000 },
        { time: 3, open: 100, high: 101, low: 99.5, close: 100, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars);

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        status: order.status,
        qty: order.qty,
        requestedQty: order.requestedQty,
        qtyValue: order.qtyValue,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        { id: 'A', status: 'filled', qty: 3, requestedQty: 3, qtyValue: 3, avgFillPrice: 99, updatedBarIndex: 1 },
        { id: 'B', status: 'cancelled', qty: 0, requestedQty: 0, qtyValue: 0, avgFillPrice: null, updatedBarIndex: 1 },
      ]);
      expect(result.strategy.position.size).toBe(3);
      expect(result.plots[0]?.values).toEqual([0, 0, 3]);
    });

    it('does not fill updated strategy.exit prices until a later bar', () => {
      const script = `//@version=6
strategy("Exit activation", process_orders_on_close=true)
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

    it('fills long strategy.exit trailing stops after activation', () => {
      const script = `//@version=6
strategy("Long trail", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Trail", "Long", trail_points=5, trail_offset=4)
plot(strategy.position_size)`;
      const baseTime = Date.now() - 240000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 100.5, low: 99.5, close: 100, volume: 1000 },
        { time: baseTime + 60000, open: 100.2, high: 100.6, low: 99.8, close: 100.4, volume: 1000 },
        { time: baseTime + 120000, open: 101, high: 101.5, low: 100.8, close: 101.2, volume: 1000 },
        { time: baseTime + 180000, open: 101, high: 101, low: 100.9, close: 101, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.1 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders.map((order) => ({
        id: order.id,
        type: order.type,
        status: order.status,
        trailActivationPrice: order.trailActivationPrice,
        trailOffset: order.trailOffset,
        trailingActivated: order.trailingActivated,
        trailingStopPrice: order.trailingStopPrice,
        avgFillPrice: order.avgFillPrice,
        updatedBarIndex: order.updatedBarIndex,
      }))).toEqual([
        {
          id: 'Long',
          type: 'market',
          status: 'filled',
          trailActivationPrice: undefined,
          trailOffset: undefined,
          trailingActivated: false,
          trailingStopPrice: undefined,
          avgFillPrice: 100,
          updatedBarIndex: 0,
        },
        {
          id: 'Trail',
          type: 'trailing_stop',
          status: 'filled',
          trailActivationPrice: 100.5,
          trailOffset: 0.4,
          trailingActivated: true,
          trailingStopPrice: 101.1,
          avgFillPrice: 101.1,
          updatedBarIndex: 3,
        },
      ]);
      expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(1.1);
    });

    it('fills short strategy.exit trailing stops after activation', () => {
      const script = `//@version=6
strategy("Short trail", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Short", strategy.short, qty=1)
if bar_index == 1
    strategy.exit("Trail", "Short", trail_points=2, trail_offset=1)
plot(strategy.position_size)`;
      const baseTime = Date.now() - 240000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
        { time: baseTime + 60000, open: 99.8, high: 100, low: 99, close: 99.5, volume: 1000 },
        { time: baseTime + 120000, open: 99, high: 99.4, low: 98.5, close: 99, volume: 1000 },
        { time: baseTime + 180000, open: 98.7, high: 98.8, low: 98.6, close: 98.7, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.25 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[1]).toMatchObject({
        id: 'Trail',
        type: 'trailing_stop',
        status: 'filled',
        trailActivationPrice: 99.5,
        trailOffset: 0.25,
        trailingActivated: true,
        trailingStopPrice: 99.25,
        avgFillPrice: 99.25,
        updatedBarIndex: 2,
      });
      expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(0.75);
    });

    it('uses weighted entry price for multi-fill strategy.exit trail_points activation', () => {
      const script = `//@version=6
strategy("Weighted trail", pyramiding=1, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=3)
if bar_index == 2
    strategy.exit("Trail", trail_points=2, trail_offset=1)
plot(strategy.opentrades)`;
      const baseTime = Date.now() - 180000;
      const bars: Bar[] = [
        { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 1000 },
        { time: baseTime + 60000, open: 102, high: 103, low: 101, close: 102, volume: 1000 },
        { time: baseTime + 120000, open: 102, high: 102, low: 101, close: 101.5, volume: 1000 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: { syminfo: { mintick: 0.5 } },
      });

      expect(result.errors).toEqual([]);
      expect(result.strategy.orders[2]).toMatchObject({
        id: 'Trail',
        type: 'trailing_stop',
        status: 'pending',
        trailActivationPrice: 102.5,
        trailOffset: 0.5,
      });
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

    it('defaults missing bool fields to false and other fields to na', () => {
      const script = `//@version=6
indicator("UDT Defaults")
type state
    bool active
    float price
state s = state.new()
plot(s.active ? 1 : 0, title="Active")
plot(na(s.price) ? 1 : 0, title="Price Is NA")`;

      const result = executeScript(parse(script), createBars(3));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Active')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Price Is NA')?.values).toEqual([1, 1, 1]);
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

    it('copies user-defined objects by value with shallow field references', () => {
      const script = `//@version=6
indicator("UDT Copy")
type nestedState
    float value = 0
type boxState
    float value = 0
    nestedState nested = na
left = boxState.new(1, nestedState.new(10))
right = boxState.copy(left)
methodCopy = left.copy()
right.value := 5
methodCopy.value := 7
right.nested.value := 20
plot(left.value, title="Left")
plot(right.value, title="Right")
plot(methodCopy.value, title="Method Copy")
plot(left.nested.value, title="Shared Nested")`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Left')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Right')?.values).toEqual([5]);
      expect(result.plots.find((plot) => plot.title === 'Method Copy')?.values).toEqual([7]);
      expect(result.plots.find((plot) => plot.title === 'Shared Nested')?.values).toEqual([20]);
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

    it('records indicator overlay and precision metadata', () => {
      const script = `//@version=6
indicator("Overlay Precision", overlay=true, precision=4)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorOverlay).toBe(true);
      expect(result.indicatorPrecision).toBe(4);
      expect(result.declaration).toMatchObject({
        title: 'Overlay Precision',
        overlay: true,
        precision: 4,
      });
    });

    it('records indicator named-prefix positional tail metadata', () => {
      const script = `//@version=6
indicator(title="Mixed Declaration", "Mixed", true, format.price, 3)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorTitle).toBe('Mixed Declaration');
      expect(result.indicatorShortTitle).toBe('Mixed');
      expect(result.indicatorOverlay).toBe(true);
      expect(result.declaration).toMatchObject({
        title: 'Mixed Declaration',
        shortTitle: 'Mixed',
        overlay: true,
        format: 'price',
        precision: 3,
      });
    });

    it('records indicator format and scale metadata', () => {
      const script = `//@version=6
indicator("Format Scale", format=format.price, scale=scale.right)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorFormat).toBe('price');
      expect(result.indicatorScale).toBe('right');
    });

    it('records advanced indicator declaration metadata', () => {
      const script = `//@version=6
indicator(
  "Advanced Metadata",
  timeframe="15",
  timeframe_gaps=false,
  explicit_plot_zorder=true,
  behind_chart=false,
  max_labels_count=2,
  max_lines_count=3,
  max_boxes_count=4,
  max_polylines_count=5,
  calc_bars_count=250,
  dynamic_requests=false
)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorTimeframe).toBe('15');
      expect(result.indicatorTimeframeGaps).toBe(false);
      expect(result.indicatorExplicitPlotZOrder).toBe(true);
      expect(result.indicatorBehindChart).toBe(false);
      expect(result.indicatorCalcBarsCount).toBe(250);
      expect(result.indicatorDynamicRequests).toBe(false);
      expect(result.indicatorDrawingLimits).toEqual({
        label: 2,
        line: 3,
        box: 4,
        polyline: 5,
      });
      expect(result.declaration).toMatchObject({
        title: 'Advanced Metadata',
        overlay: false,
        precision: 2,
        timeframe: '15',
        timeframeGaps: false,
        explicitPlotZOrder: true,
        behindChart: false,
        calcBarsCount: 250,
        dynamicRequests: false,
        drawingLimits: {
          label: 2,
          line: 3,
          box: 4,
          polyline: 5,
        },
      });
    });

    it('records library declaration metadata', () => {
      const script = `//@version=6
library("Library Metadata", overlay=true, dynamic_requests=false)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorTitle).toBe('Library Metadata');
      expect(result.indicatorOverlay).toBe(true);
      expect(result.indicatorDynamicRequests).toBe(false);
      expect(result.declaration).toMatchObject({
        title: 'Library Metadata',
        overlay: true,
        dynamicRequests: false,
      });
    });

    it('records indicator shorttitle metadata', () => {
      const script = `//@version=6
indicator("Long Declaration Title", shorttitle="Short")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorTitle).toBe('Long Declaration Title');
      expect(result.indicatorShortTitle).toBe('Short');
    });

    it('normalizes indicator shorttitle metadata to a string', () => {
      const script = `//@version=6
indicator("Long Declaration Title", shorttitle=42)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorShortTitle).toBe('42');
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

    it('uses runtime syminfo timezone as the default exchange timezone', () => {
      const script = `//@version=6
indicator("Runtime Timezone")
plot(hour, title="Default Hour")
plot(timestamp(2024, 1, 5, 9, 30), title="Default Timestamp")
plot(syminfo.timezone == "America/New_York" ? 1 : 0, title="Injected Timezone")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 14, 30), open: 1, high: 2, low: 1, close: 2, volume: 100 },
      ];
      const result = executeScript(ast, bars, undefined, {
        runtime: {
          syminfo: {
            timezone: 'America/New_York',
          },
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Default Hour')?.values).toEqual([9]);
      expect(result.plots.find((plot) => plot.title === 'Default Timestamp')?.values).toEqual([Date.UTC(2024, 0, 5, 14, 30)]);
      expect(result.plots.find((plot) => plot.title === 'Injected Timezone')?.values).toEqual([1]);
    });

    it('uses runtime timeframe metadata for timeframe built-ins', () => {
      const script = `//@version=6
indicator("Runtime Timeframe")
plot(timeframe.isdaily ? 1 : 0, title="Daily")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.period == "1D" ? 1 : 0, title="Period")`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars, undefined, {
        runtime: {
          timeframe: {
            period: '1D',
            multiplier: 1,
            isminutes: false,
            isdaily: true,
            isweekly: false,
            ismonthly: false,
            isintraday: false,
            isseconds: false,
            isticks: false,
          },
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Daily')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Intraday')?.values).toEqual([0]);
      expect(result.plots.find((plot) => plot.title === 'Period')?.values).toEqual([1]);
    });

    it('accepts named time and timezone arguments on calendar functions', () => {
      const script = `//@version=6
indicator("Named Calendar Args")
stamp = timestamp("Asia/Singapore", 2024, 1, 6, 0, 5, 7)
plot(year(time=stamp, timezone="Asia/Singapore"), title="Year")
plot(month(time=stamp, timezone="Asia/Singapore"), title="Month")
plot(weekofyear(time=stamp, timezone="Asia/Singapore"), title="Week")
plot(dayofmonth(time=stamp, timezone="Asia/Singapore"), title="Day")
plot(dayofweek(time=stamp, timezone="Asia/Singapore"), title="DOW")
plot(hour(time=stamp, timezone="Asia/Singapore"), title="Hour")
plot(minute(time=stamp, timezone="Asia/Singapore"), title="Minute")
plot(second(time=stamp, timezone="Asia/Singapore"), title="Second")`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(1));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Year')?.values).toEqual([2024]);
      expect(result.plots.find((plot) => plot.title === 'Month')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Week')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Day')?.values).toEqual([6]);
      expect(result.plots.find((plot) => plot.title === 'DOW')?.values).toEqual([7]);
      expect(result.plots.find((plot) => plot.title === 'Hour')?.values).toEqual([0]);
      expect(result.plots.find((plot) => plot.title === 'Minute')?.values).toEqual([5]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([7]);
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
plot(time_tradingday, title="Trading Day")
plot(time_close, title="Close Time")
plot(last_bar_time, title="Last Bar Time")
plot(last_bar_time[1], title="Previous Last Bar Time")
plot(time_close[1], title="Previous Close Time")
plot(time("60", "1430-1600") == time ? 1 : 0, title="In Session")
plot(na(time("60", "1600-1700")) ? 1 : 0, title="Out Session")
plot(time_close("30", "1430-1600"), title="Filtered Close")
plot(time(timeframe="60", session="1430-1600", timezone="UTC") == time ? 1 : 0, title="Named Time")
plot(time_close(timeframe="30", session="1430-1600", timezone="UTC"), title="Named Close")`;

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
      expect(result.plots.find((plot) => plot.title === 'Trading Day')?.values).toEqual([
        Date.UTC(2024, 0, 5),
        Date.UTC(2024, 0, 5),
        Date.UTC(2024, 0, 5),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Last Bar Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Previous Last Bar Time')?.values).toEqual([
        null,
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
      expect(result.plots.find((plot) => plot.title === 'Named Time')?.values).toEqual([0, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Named Close')?.values).toEqual([null, Date.UTC(2024, 0, 5, 15, 0), null]);
    });

    it('supports timestamp named arguments and date strings', () => {
      const script = `//@version=6
indicator("Timestamp Variants")
namedStamp = timestamp(timezone="America/New_York", year=2024, month=1, day=5, hour=9, minute=30)
dateStamp = timestamp("20 Aug 2024 00:00:00 +0000")
plot(namedStamp, title="Named Timestamp")
plot(dateStamp, title="Date String")`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(1));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Named Timestamp')?.values).toEqual([Date.UTC(2024, 0, 5, 14, 30)]);
      expect(result.plots.find((plot) => plot.title === 'Date String')?.values).toEqual([Date.UTC(2024, 7, 20)]);
    });

    it('handles Pine session day masks, overnight periods, and multi-segment sessions', () => {
      const script = `//@version=6
indicator("Session Strings")
plot(na(time("60", "0930-1000:2", "UTC")) ? 0 : 1, title="Monday Mask")
plot(na(time("60", "1700-0500:2", "UTC")) ? 0 : 1, title="Overnight Monday")
plot(na(time("60", "1700-1700:2", "UTC")) ? 0 : 1, title="Full Overnight Monday")
plot(na(time("60", "0900-1000,1400-1500", "UTC")) ? 0 : 1, title="Multi Segment")
plot(na(time("60", "24x7", "UTC")) ? 0 : 1, title="Always")
plot(na(time("60", session.regular, "UTC")) ? 0 : 1, title="Regular Session")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 7, 18, 0), open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: Date.UTC(2024, 0, 8, 3, 0), open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: Date.UTC(2024, 0, 8, 6, 0), open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: Date.UTC(2024, 0, 8, 9, 30), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 8, 14, 30), open: 2, high: 3, low: 2, close: 3, volume: 100 },
        { time: Date.UTC(2024, 0, 8, 18, 0), open: 3, high: 4, low: 3, close: 4, volume: 100 },
        { time: Date.UTC(2024, 0, 9, 3, 0), open: 4, high: 5, low: 4, close: 5, volume: 100 },
        { time: Date.UTC(2024, 0, 9, 6, 0), open: 5, high: 6, low: 5, close: 6, volume: 100 },
        { time: Date.UTC(2024, 0, 9, 18, 0), open: 6, high: 7, low: 6, close: 7, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Monday Mask')?.values).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Overnight Monday')?.values).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Full Overnight Monday')?.values).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Multi Segment')?.values).toEqual([0, 0, 0, 1, 1, 0, 0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Always')?.values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Regular Session')?.values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('fails fast for session state helpers until exchange session classification is available', () => {
      const script = `//@version=6
indicator("Session State")
plot(session.ismarket ? 1 : 0, title="Market State")`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(3));

      expect(result.errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining('session.ismarket requires exchange session classification'),
        }),
      ]);
    });

    it('evaluates session state helpers from runtime exchange session windows', () => {
      const script = `//@version=6
indicator("Session State")
plot(session.ispremarket ? 1 : 0, title="Premarket")
plot(session.ismarket ? 1 : 0, title="Market")
plot(session.ispostmarket ? 1 : 0, title="Postmarket")`;

      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 13, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 0, 5, 15, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 0, 5, 22, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 0, 6, 2, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: {
          session: {
            timezone: 'America/New_York',
            premarket: '0400-0930:23456',
            regular: '0930-1600:23456',
            postmarket: '1600-2000:23456',
          },
        },
      });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Premarket')?.values).toEqual([1, 0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Market')?.values).toEqual([0, 1, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Postmarket')?.values).toEqual([0, 0, 1, 0]);
    });

    it('applies host-provided closed dates to session-filtered time calls', () => {
      const script = `//@version=6
indicator("Exchange Calendar Closures")
plot(na(time("60", "0930-1600", "America/New_York")) ? 0 : 1, title="Explicit Session")
plot(na(time("60", session.regular, "America/New_York")) ? 0 : 1, title="Regular Session")
plot(na(time("60")) ? 0 : 1, title="Unfiltered Time")`;

      const bars: Bar[] = [
        { time: Date.UTC(2024, 6, 4, 14, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 6, 5, 14, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: {
          session: {
            timezone: 'America/New_York',
            closedDates: ['2024-07-04'],
          },
        },
      });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Explicit Session')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Regular Session')?.values).toEqual([0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Unfiltered Time')?.values).toEqual([1, 1]);
    });

    it('applies host-provided partial session closures to session state helpers', () => {
      const script = `//@version=6
indicator("Partial Session Closures")
plot(session.ispremarket ? 1 : 0, title="Premarket")
plot(session.ismarket ? 1 : 0, title="Market")
plot(session.ispostmarket ? 1 : 0, title="Postmarket")`;

      const bars: Bar[] = [
        { time: Date.UTC(2024, 10, 29, 13, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 10, 29, 15, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 10, 29, 22, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: {
          session: {
            timezone: 'America/New_York',
            premarket: '0400-0930:23456',
            regular: '0930-1600:23456',
            postmarket: '1600-2000:23456',
            closures: [
              {
                date: '2024-11-29',
                sessions: ['regular'],
                reason: 'early close fixture',
              },
            ],
          },
        },
      });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Premarket')?.values).toEqual([1, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Market')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Postmarket')?.values).toEqual([0, 0, 1]);
    });

    it('applies partial closures to literal sessions and session.extended', () => {
      const script = `//@version=6
indicator("Literal Session Closures")
plot(na(time("60", "0400-0930", "America/New_York")) ? 0 : 1, title="Literal Premarket")
plot(na(time("60", session.extended, "America/New_York")) ? 0 : 1, title="Extended")
plot(na(time("60", "0930-1600", "America/New_York")) ? 0 : 1, title="Literal Regular")`;

      const bars: Bar[] = [
        { time: Date.UTC(2024, 10, 29, 13, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 10, 29, 15, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: Date.UTC(2024, 10, 29, 22, 0), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ];

      const result = executeScript(parse(script), bars, undefined, {
        runtime: {
          session: {
            timezone: 'America/New_York',
            premarket: '0400-0930:23456',
            regular: '0930-1600:23456',
            postmarket: '1600-2000:23456',
            closures: [
              {
                date: '2024-11-29',
                sessions: ['premarket'],
              },
            ],
          },
        },
      });

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Literal Premarket')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Extended')?.values).toEqual([0, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Literal Regular')?.values).toEqual([0, 1, 0]);
    });

    it('computes time_tradingday from the exchange timezone', () => {
      const script = `//@version=6
indicator("Trading Day Timezone")
plot(time_tradingday, title="Trading Day")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 1), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 15), open: 2, high: 3, low: 2, close: 3, volume: 100 },
      ];
      const result = executeScript(ast, bars, undefined, {
        runtime: {
          syminfo: {
            timezone: 'America/New_York',
          },
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Trading Day')?.values).toEqual([
        Date.UTC(2024, 0, 4, 5),
        Date.UTC(2024, 0, 5, 5),
      ]);
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

    it('parses and validates Pine timeframe string specifications', () => {
      const validCases: Array<{
        timeframe: string;
        multiplier: number;
        flags: Partial<Record<'isticks' | 'isseconds' | 'isminutes' | 'isdaily' | 'isweekly' | 'ismonthly' | 'isintraday', boolean>>;
      }> = [
        { timeframe: '1T', multiplier: 1, flags: { isticks: true, isintraday: true } },
        { timeframe: '45S', multiplier: 45, flags: { isseconds: true, isintraday: true } },
        { timeframe: '15', multiplier: 15, flags: { isminutes: true, isintraday: true } },
        { timeframe: 'D', multiplier: 1, flags: { isdaily: true } },
        { timeframe: '2W', multiplier: 2, flags: { isweekly: true } },
        { timeframe: '3M', multiplier: 3, flags: { ismonthly: true } },
      ];

      for (const testCase of validCases) {
        const script = `//@version=6
indicator("Valid Timeframe", timeframe="${testCase.timeframe}")
plot(timeframe.multiplier, title="Multiplier")
plot(timeframe.isticks ? 1 : 0, title="Ticks")
plot(timeframe.isseconds ? 1 : 0, title="Seconds")
plot(timeframe.isminutes ? 1 : 0, title="Minutes")
plot(timeframe.isdaily ? 1 : 0, title="Daily")
plot(timeframe.isweekly ? 1 : 0, title="Weekly")
plot(timeframe.ismonthly ? 1 : 0, title="Monthly")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")`;
        const result = executeScript(parse(script), createBars(1));

        expect(result.errors).toHaveLength(0);
        expect(result.plots.find((plot) => plot.title === 'Multiplier')?.values).toEqual([testCase.multiplier]);
        expect(result.plots.find((plot) => plot.title === 'Ticks')?.values).toEqual([testCase.flags.isticks ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Seconds')?.values).toEqual([testCase.flags.isseconds ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Minutes')?.values).toEqual([testCase.flags.isminutes ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Daily')?.values).toEqual([testCase.flags.isdaily ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Weekly')?.values).toEqual([testCase.flags.isweekly ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Monthly')?.values).toEqual([testCase.flags.ismonthly ? 1 : 0]);
        expect(result.plots.find((plot) => plot.title === 'Intraday')?.values).toEqual([testCase.flags.isintraday ? 1 : 0]);
      }

      for (const timeframe of ['0', '2S', '1H', '1.5', '-1', 'bad']) {
        const result = executeScript(parse(`//@version=6
indicator("Invalid Timeframe", timeframe="${timeframe}")
plot(close)`), createBars(1));

        expect(result.errors[0]?.message).toBe(`Invalid indicator timeframe: ${timeframe.toUpperCase()}`);
      }
    });

    it('supports timeframe utility conversions and change comparisons', () => {
      const script = `//@version=6
indicator("Timeframe Utilities")
plot(timeframe.in_seconds(timeframe="45S"), title="Seconds")
plot(timeframe.in_seconds("2W"), title="Weeks")
plot(timeframe.in_seconds("3M"), title="Months")
plot(timeframe.in_seconds("1T"), title="Ticks")
plot(timeframe.to_seconds("1D"), title="Daily Alias")
plot(timeframe.to_seconds(timeframe="45S"), title="Named Alias")
plot(timeframe.from_seconds(seconds=44) == "45S" ? 1 : 0, title="From Seconds")
plot(timeframe.from_seconds(3601) == "61" ? 1 : 0, title="From Minutes")
plot(timeframe.change(timeframe="60") ? 1 : 0, title="Hourly Change")
plot(timeframe.in_seconds("15") < timeframe.in_seconds("1D") ? 1 : 0, title="Comparison")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 0, 0), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 0, 30), open: 2, high: 3, low: 2, close: 3, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 1, 0), open: 3, high: 4, low: 3, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Seconds')?.values).toEqual([45, 45, 45]);
      expect(result.plots.find((plot) => plot.title === 'Weeks')?.values).toEqual([1_209_600, 1_209_600, 1_209_600]);
      expect(result.plots.find((plot) => plot.title === 'Months')?.values).toEqual([7_776_000, 7_776_000, 7_776_000]);
      expect(result.plots.find((plot) => plot.title === 'Ticks')?.values).toEqual([null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'Daily Alias')?.values).toEqual([86_400, 86_400, 86_400]);
      expect(result.plots.find((plot) => plot.title === 'Named Alias')?.values).toEqual([45, 45, 45]);
      expect(result.plots.find((plot) => plot.title === 'From Seconds')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'From Minutes')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Hourly Change')?.values).toEqual([1, 0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Comparison')?.values).toEqual([1, 1, 1]);
    });

    it('aggregates time and time_close to requested higher timeframe buckets', () => {
      const script = `//@version=6
indicator("Higher Timeframe Time")
plot(time("60"), title="Hourly Open")
plot(time_close("60"), title="Hourly Close")
plot(time("D"), title="Daily Open")
plot(time_close("D"), title="Daily Close")
plot(time("W"), title="Weekly Open")
plot(time("M"), title="Monthly Open")
plot(time("D", timezone="America/New_York"), title="NY Daily Open")
plot(time_close("D", timezone="America/New_York"), title="NY Daily Close")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 0, 15), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 1, 15), open: 2, high: 3, low: 2, close: 3, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 23, 15), open: 3, high: 4, low: 3, close: 4, volume: 100 },
        { time: Date.UTC(2024, 0, 6, 0, 15), open: 4, high: 5, low: 4, close: 5, volume: 100 },
      ];
      const result = executeScript(ast, bars, undefined, {
        runtime: {
          timeframe: {
            period: '15',
            multiplier: 15,
            isminutes: true,
            isdaily: false,
            isweekly: false,
            ismonthly: false,
            isintraday: true,
            isseconds: false,
            isticks: false,
          },
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Hourly Open')?.values).toEqual([
        Date.UTC(2024, 0, 5, 0, 0),
        Date.UTC(2024, 0, 5, 1, 0),
        Date.UTC(2024, 0, 5, 23, 0),
        Date.UTC(2024, 0, 6, 0, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Hourly Close')?.values).toEqual([
        Date.UTC(2024, 0, 5, 1, 0),
        Date.UTC(2024, 0, 5, 2, 0),
        Date.UTC(2024, 0, 6, 0, 0),
        Date.UTC(2024, 0, 6, 1, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Daily Open')?.values).toEqual([
        Date.UTC(2024, 0, 5),
        Date.UTC(2024, 0, 5),
        Date.UTC(2024, 0, 5),
        Date.UTC(2024, 0, 6),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Daily Close')?.values).toEqual([
        Date.UTC(2024, 0, 6),
        Date.UTC(2024, 0, 6),
        Date.UTC(2024, 0, 6),
        Date.UTC(2024, 0, 7),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Weekly Open')?.values).toEqual([
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Monthly Open')?.values).toEqual([
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 1),
      ]);
      expect(result.plots.find((plot) => plot.title === 'NY Daily Open')?.values).toEqual([
        Date.UTC(2024, 0, 4, 5),
        Date.UTC(2024, 0, 4, 5),
        Date.UTC(2024, 0, 5, 5),
        Date.UTC(2024, 0, 5, 5),
      ]);
      expect(result.plots.find((plot) => plot.title === 'NY Daily Close')?.values).toEqual([
        Date.UTC(2024, 0, 5, 5),
        Date.UTC(2024, 0, 5, 5),
        Date.UTC(2024, 0, 6, 5),
        Date.UTC(2024, 0, 6, 5),
      ]);
    });

    it('keeps day and week time_close boundaries timezone-aware across DST', () => {
      const script = `//@version=6
indicator("DST Time Close")
plot(time("D", timezone="America/New_York"), title="NY Daily Open")
plot(time_close("D", timezone="America/New_York"), title="NY Daily Close")
plot(time("W", timezone="America/New_York"), title="NY Weekly Open")
plot(time_close("W", timezone="America/New_York"), title="NY Weekly Close")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 2, 10, 12), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 10, 3, 12), open: 2, high: 3, low: 2, close: 3, volume: 100 },
      ];
      const result = executeScript(ast, bars, undefined, {
        runtime: {
          timeframe: {
            period: '60',
            multiplier: 60,
            isminutes: true,
            isdaily: false,
            isweekly: false,
            ismonthly: false,
            isintraday: true,
            isseconds: false,
            isticks: false,
          },
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'NY Daily Open')?.values).toEqual([
        Date.UTC(2024, 2, 10, 5),
        Date.UTC(2024, 10, 3, 4),
      ]);
      expect(result.plots.find((plot) => plot.title === 'NY Daily Close')?.values).toEqual([
        Date.UTC(2024, 2, 11, 4),
        Date.UTC(2024, 10, 4, 5),
      ]);
      expect(result.plots.find((plot) => plot.title === 'NY Weekly Open')?.values).toEqual([
        Date.UTC(2024, 2, 4, 5),
        Date.UTC(2024, 9, 28, 4),
      ]);
      expect(result.plots.find((plot) => plot.title === 'NY Weekly Close')?.values).toEqual([
        Date.UTC(2024, 2, 11, 4),
        Date.UTC(2024, 10, 4, 5),
      ]);
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
alertcondition(isUp, title="Green bar", message="Close is above open")
alertcondition(condition=isUp, "Mixed green bar", "Mixed close is above open")
alert(message="Mixed alert", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(3);
      expect(result.alerts[0]).toMatchObject({
        id: 'alertcondition_Green bar',
        type: 'alertcondition',
        title: 'Green bar',
        message: 'Close is above open',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events).toEqual([]);
      expect(result.alerts[1]).toMatchObject({
        id: 'alertcondition_Mixed green bar',
        type: 'alertcondition',
        title: 'Mixed green bar',
        message: 'Mixed close is above open',
      });
      expect(result.alerts[1].values).toEqual([true, true, true]);
      expect(result.alerts[2]).toMatchObject({
        type: 'alert',
        message: 'Mixed alert',
        frequency: 'once_per_bar_close',
      });
      expect(result.alerts[2].events).toHaveLength(3);
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

    it('executes matrix sum and diff helpers with matrix and scalar operands', () => {
      const script = `//@version=6
indicator("Matrix Arithmetic")
left = matrix.new_float(2, 2, 0)
left.set(0, 0, 1)
left.set(0, 1, 2)
left.set(1, 0, 3)
left.set(1, 1, 4)
right = matrix.new_float(2, 2, 10)
sum = matrix.sum(left, right)
diff = right.diff(left)
scaled = left.sum(5)
plot(sum.get(1, 1), title="Sum")
plot(diff.get(1, 0), title="Diff")
plot(scaled.get(0, 1), title="Scalar")
plot(left.get(0, 1), title="Original")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([14, 14]);
      expect(result.plots.find((plot) => plot.title === 'Diff')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Scalar')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([2, 2]);
    });

    it('reports matrix sum and diff shape mismatches', () => {
      const script = `//@version=6
indicator("Matrix Shape Mismatch")
left = matrix.new_float(2, 2, 1)
right = matrix.new_float(1, 4, 1)
sum = matrix.sum(left, right)
plot(sum.get(0, 0))`;

      const result = executeScript(parse(script), createBars(1, 100));

      expect(result.errors[0]?.message).toBe('Matrix dimensions must match. Left is 2x2, right is 1x4');
    });

    it('executes matrix multiplication with matrix, array, and scalar operands', () => {
      const script = `//@version=6
indicator("Matrix Multiplication")
left = matrix.new_float(2, 3, 0)
left.set(0, 0, 1)
left.set(0, 1, 2)
left.set(0, 2, 3)
left.set(1, 0, 4)
left.set(1, 1, 5)
left.set(1, 2, 6)
right = matrix.new_float(3, 2, 0)
right.set(0, 0, 7)
right.set(0, 1, 8)
right.set(1, 0, 9)
right.set(1, 1, 10)
right.set(2, 0, 11)
right.set(2, 1, 12)
vector = array.from(10, 20, 30)
matrixProduct = matrix.mult(left, right)
vectorProduct = left.mult(vector)
scalarProduct = left.mult(2)
plot(matrixProduct.get(1, 1), title="Matrix")
plot(vectorProduct.get(1), title="Vector")
plot(scalarProduct.get(0, 2), title="Scalar")
plot(left.get(0, 2), title="Original")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Matrix')?.values).toEqual([154, 154]);
      expect(result.plots.find((plot) => plot.title === 'Vector')?.values).toEqual([320, 320]);
      expect(result.plots.find((plot) => plot.title === 'Scalar')?.values).toEqual([6, 6]);
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([3, 3]);
    });

    it('reports matrix multiplication dimension mismatches', () => {
      const script = `//@version=6
indicator("Matrix Multiplication Mismatch")
left = matrix.new_float(2, 3, 1)
right = matrix.new_float(2, 2, 1)
product = matrix.mult(left, right)
plot(product.get(0, 0))`;

      const result = executeScript(parse(script), createBars(1, 100));

      expect(result.errors[0]?.message).toBe('Matrix multiplication requires left columns to match right rows. Left is 2x3, right is 2x2');
    });

    it('executes matrix power and trace helpers', () => {
      const script = `//@version=6
indicator("Matrix Power Trace")
values = matrix.new_float(2, 2, 0)
values.set(0, 0, 1)
values.set(0, 1, 2)
values.set(1, 0, 3)
values.set(1, 1, 4)
squared = matrix.pow(values, 2)
identity = values.pow(0)
plot(values.trace(), title="Trace")
plot(squared.get(1, 1), title="Power")
plot(identity.get(0, 0), title="Identity")
plot(values.get(0, 1), title="Original")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Trace')?.values).toEqual([5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Power')?.values).toEqual([22, 22]);
      expect(result.plots.find((plot) => plot.title === 'Identity')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([2, 2]);
    });

    it('reports matrix power and trace errors', () => {
      const script = `//@version=6
indicator("Matrix Power Trace Errors")
values = matrix.new_float(2, 3, 1)
plot(values.trace())`;

      const traceResult = executeScript(parse(script), createBars(1, 100));
      expect(traceResult.errors[0]?.message).toBe('Matrix trace requires a square matrix. Matrix is 2x3');

      const powerScript = `//@version=6
indicator("Matrix Power Errors")
values = matrix.new_float(2, 2, 1)
powered = matrix.pow(values, 1.5)
plot(powered.get(0, 0))`;

      const powerResult = executeScript(parse(powerScript), createBars(1, 100));
      expect(powerResult.errors[0]?.message).toBe('Matrix power must be a non-negative integer');
    });

    it('executes matrix determinant and rank helpers', () => {
      const script = `//@version=6
indicator("Matrix Determinant Rank")
fullRank = matrix.new_float(3, 3, 0)
fullRank.set(0, 0, 3)
fullRank.set(0, 1, 2)
fullRank.set(0, 2, 3)
fullRank.set(1, 0, 4)
fullRank.set(1, 1, 6)
fullRank.set(1, 2, 6)
fullRank.set(2, 0, 7)
fullRank.set(2, 1, 4)
fullRank.set(2, 2, 9)
deficient = matrix.new_float(3, 3, 0)
deficient.set(0, 0, 1)
deficient.set(0, 1, 2)
deficient.set(0, 2, 3)
deficient.set(1, 0, 2)
deficient.set(1, 1, 4)
deficient.set(1, 2, 6)
deficient.set(2, 0, 3)
deficient.set(2, 1, 6)
deficient.set(2, 2, 9)
wide = matrix.new_float(2, 3, 0)
wide.set(0, 0, 1)
wide.set(0, 1, 2)
wide.set(0, 2, 3)
wide.set(1, 0, 4)
wide.set(1, 1, 5)
wide.set(1, 2, 6)
plot(matrix.det(fullRank), title="Det")
plot(fullRank.rank(), title="Rank")
plot(deficient.det(), title="Singular")
plot(wide.rank(), title="Wide Rank")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      result.plots.find((plot) => plot.title === 'Det')?.values.forEach((value) => expect(value).toBeCloseTo(24));
      expect(result.plots.find((plot) => plot.title === 'Rank')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Singular')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Wide Rank')?.values).toEqual([2, 2]);
    });

    it('reports matrix determinant dimension errors', () => {
      const script = `//@version=6
indicator("Matrix Determinant Error")
values = matrix.new_float(2, 3, 1)
plot(values.det())`;

      const result = executeScript(parse(script), createBars(1, 100));

      expect(result.errors[0]?.message).toBe('Matrix determinant requires a square matrix. Matrix is 2x3');
    });

    it('executes matrix inverse helpers', () => {
      const script = `//@version=6
indicator("Matrix Inverse")
values = matrix.new_float(2, 2, 0)
values.set(0, 0, 4)
values.set(0, 1, 7)
values.set(1, 0, 2)
values.set(1, 1, 6)
inverse = matrix.inv(values)
identity = values.mult(inverse)
plot(inverse.get(0, 0), title="Inv00")
plot(inverse.get(0, 1), title="Inv01")
plot(identity.get(0, 0), title="Identity00")
plot(identity.get(1, 1), title="Identity11")
plot(values.get(0, 0), title="Original")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      result.plots.find((plot) => plot.title === 'Inv00')?.values.forEach((value) => expect(value).toBeCloseTo(0.6));
      result.plots.find((plot) => plot.title === 'Inv01')?.values.forEach((value) => expect(value).toBeCloseTo(-0.7));
      result.plots.find((plot) => plot.title === 'Identity00')?.values.forEach((value) => expect(value).toBeCloseTo(1));
      result.plots.find((plot) => plot.title === 'Identity11')?.values.forEach((value) => expect(value).toBeCloseTo(1));
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([4, 4]);
    });

    it('reports matrix inverse errors', () => {
      const script = `//@version=6
indicator("Matrix Inverse Error")
values = matrix.new_float(2, 2, 0)
values.set(0, 0, 1)
values.set(0, 1, 2)
values.set(1, 0, 2)
values.set(1, 1, 4)
inverse = values.inv()
plot(inverse.get(0, 0))`;

      const result = executeScript(parse(script), createBars(1, 100));

      expect(result.errors[0]?.message).toBe('Matrix is singular and cannot be inverted');
    });

    it('executes matrix Kronecker products', () => {
      const script = `//@version=6
indicator("Matrix Kron")
left = matrix.new_float(2, 2, 0)
left.set(0, 0, 1)
left.set(0, 1, 2)
left.set(1, 0, 3)
left.set(1, 1, 4)
right = matrix.new_float(2, 2, 0)
right.set(0, 0, 0)
right.set(0, 1, 5)
right.set(1, 0, 6)
right.set(1, 1, 7)
product = left.kron(right)
plot(product.rows(), title="Rows")
plot(product.columns(), title="Columns")
plot(product.get(0, 3), title="Top")
plot(product.get(3, 3), title="Bottom")
plot(left.get(1, 1), title="Original")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Rows')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Columns')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Top')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Bottom')?.values).toEqual([28, 28]);
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([4, 4]);
    });

    it('executes matrix row sorting and submatrix extraction', () => {
      const script = `//@version=6
indicator("Matrix Sort Submatrix")
values = matrix.new_float(3, 3, 0)
values.set(0, 0, 3)
values.set(0, 1, 9)
values.set(0, 2, 1)
values.set(1, 0, 1)
values.set(1, 1, 5)
values.set(1, 2, 2)
values.set(2, 0, 2)
values.set(2, 1, 7)
values.set(2, 2, 3)
values.sort(1, order.descending)
slice = values.submatrix(0, 2, 1, 3)
slice.set(0, 0, 100)
plot(values.get(0, 0), title="Sorted First")
plot(values.get(2, 1), title="Sorted Last")
plot(slice.get(0, 1), title="Slice")
plot(values.get(0, 1), title="Original")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Sorted First')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Sorted Last')?.values).toEqual([5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Slice')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Original')?.values).toEqual([9, 9]);
    });

    it('reports matrix submatrix range errors', () => {
      const script = `//@version=6
indicator("Matrix Submatrix Error")
values = matrix.new_float(2, 2, 1)
slice = values.submatrix(1, 3, 0, 1)
plot(slice.rows())`;

      const result = executeScript(parse(script), createBars(1, 100));

      expect(result.errors[0]?.message).toBe('Matrix row range 1..3 is out of bounds. row count is 2');
    });

    it('executes matrix inspection predicates', () => {
      const script = `//@version=6
indicator("Matrix Inspection")
identity = matrix.new_float(3, 3, 0)
identity.set(0, 0, 1)
identity.set(1, 1, 1)
identity.set(2, 2, 1)
anti = matrix.new_float(2, 2, 0)
anti.set(0, 1, 4)
anti.set(1, 0, -4)
stochastic = matrix.new_float(2, 2, 0)
stochastic.set(0, 0, 0.25)
stochastic.set(0, 1, 0.75)
stochastic.set(1, 0, 0.4)
stochastic.set(1, 1, 0.6)
rect = matrix.new_float(2, 3, 0)
plot(identity.is_identity() ? 1 : 0, title="Identity")
plot(identity.is_diagonal() ? 1 : 0, title="Diagonal")
plot(identity.is_triangular() ? 1 : 0, title="Triangular")
plot(identity.is_binary() ? 1 : 0, title="Binary")
plot(matrix.is_zero(rect) ? 1 : 0, title="Zero")
plot(anti.is_antisymmetric() ? 1 : 0, title="Antisymmetric")
plot(stochastic.is_stochastic() ? 1 : 0, title="Stochastic")
plot(rect.is_symmetric() ? 1 : 0, title="Rect Symmetric")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Identity')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Diagonal')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Triangular')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Binary')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Zero')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Antisymmetric')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Stochastic')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Rect Symmetric')?.values).toEqual([0, 0]);
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
      expect(result.errors[0]?.code).toBe('runtime.error');
      expect(result.errors[0]?.runtimeError).toMatchObject({
        code: 'runtime.error',
        message: 'stop here',
        line: 4,
      });
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
      expect(result.errors[0]?.code).toBe('runtime.error');
      expect(result.plots).toHaveLength(0);
    });

    it('fills gaps with fixnan and casts primitive values explicitly', () => {
      const script = `//@version=6
indicator("Global Helpers")
source = bar_index == 0 or bar_index == 2 ? na : close
plot(nz(source), title="NZ Default")
plot(nz(source, open), title="NZ Replacement")
plot(nz(source=source, replacement=open), title="NZ Named")
plot(fixnan(source), title="Fixed")
plot(fixnan(source=source), title="Fixed Named")
plot(float("4.5"), title="Float")
plot(float(x="5.5"), title="Float Named")
plot(int(4.9), title="Int")
plot(int(x=5.9), title="Int Named")
plot(bool(1), title="Bool True")
plot(bool(x=1), title="Bool Named")
plot(bool(0), title="Bool False")
plot(string(12.5) == "12.5", title="String Cast")
plot(string(x=12.5) == "12.5", title="String Named")
plot(na(x=source) ? 1 : 0, title="NA Named")`;

      const ast = parse(script);
      const bars = createBars(4, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'NZ Default')?.values).toEqual([0, 100.7, 0, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'NZ Replacement')?.values).toEqual([100, 100.7, 101, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'NZ Named')?.values).toEqual([100, 100.7, 101, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Fixed')?.values).toEqual([null, 100.7, 100.7, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Fixed Named')?.values).toEqual([null, 100.7, 100.7, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Float')?.values).toEqual([4.5, 4.5, 4.5, 4.5]);
      expect(result.plots.find((plot) => plot.title === 'Float Named')?.values).toEqual([5.5, 5.5, 5.5, 5.5]);
      expect(result.plots.find((plot) => plot.title === 'Int')?.values).toEqual([4, 4, 4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Int Named')?.values).toEqual([5, 5, 5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Bool True')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Bool Named')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Bool False')?.values).toEqual([false, false, false, false]);
      expect(result.plots.find((plot) => plot.title === 'String Cast')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'String Named')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'NA Named')?.values).toEqual([1, 0, 1, 0]);
    });

    it('rejects bool arguments for v6 na replacement helpers', () => {
      const nzScript = `//@version=6
indicator("NZ Bool")
plot(nz(close > open) ? 1 : 0)`;
      const fixnanScript = `//@version=6
indicator("Fixnan Bool")
plot(fixnan(close > open) ? 1 : 0)`;
      const namedNzScript = `//@version=6
indicator("NZ Named Bool")
plot(nz(source=close > open) ? 1 : 0)`;

      const nzResult = executeScript(parse(nzScript), createBars(1));
      const fixnanResult = executeScript(parse(fixnanScript), createBars(1));
      const namedNzResult = executeScript(parse(namedNzScript), createBars(1));

      expect(nzResult.errors[0]?.message).toBe('nz() does not accept bool arguments in Pine v6');
      expect(fixnanResult.errors[0]?.message).toBe('fixnan() does not accept bool arguments in Pine v6');
      expect(namedNzResult.errors[0]?.message).toBe('nz() does not accept bool arguments in Pine v6');
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
plot(str.tonumber(string="+.5"), title="Named Fraction")
plot(str.tonumber("1."), title="Trailing Dot")
plot(str.tonumber("bad"), title="Invalid")
plot(str.tonumber("0x10"), title="Hex Invalid")
plot(str.tonumber("Infinity"), title="Infinity Invalid")
plot(na(str.tonumber("")) ? 1 : 0, title="Empty Is NA")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Decimal')?.values).toEqual([42.5, 42.5]);
      expect(result.plots.find((plot) => plot.title === 'Scientific')?.values).toEqual([-300, -300]);
      expect(result.plots.find((plot) => plot.title === 'Named Fraction')?.values).toEqual([0.5, 0.5]);
      expect(result.plots.find((plot) => plot.title === 'Trailing Dot')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Invalid')?.values).toEqual([null, null]);
      expect(result.plots.find((plot) => plot.title === 'Hex Invalid')?.values).toEqual([null, null]);
      expect(result.plots.find((plot) => plot.title === 'Infinity Invalid')?.values).toEqual([null, null]);
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

    it('formats numeric placeholders with str.format', () => {
      const script = `//@version=6
indicator("String Format Numbers")
plot(str.format("{0,number,#.#}", 1.34) == "1.3", title="Decimal Mask")
plot(str.format("{0, number, integer}", 1.34) == "1", title="Integer Style")
plot(str.format("{0,number,currency}", 1340000) == "$1,340,000.00", title="Currency Style")
plot(str.format("{0,number,currency}", -12.5) == "-$12.50", title="Negative Currency Style")
plot(str.format("{0, number, percent} - {1, number, percent}", 0.1, 0.2) == "10% - 20%", title="Percent Style")
plot(str.format("{0} != {0, number, #.#}", 1.34) == "1.34 != 1.3", title="Repeated Argument")
plot(str.format("{0,number,#.#}", na) == "NaN", title="NA Number Style")
plot(str.format(format="value={0:#.0}", 100.2) == "value=100.2", title="Named Colon Mask")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Decimal Mask')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Integer Style')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Currency Style')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Negative Currency Style')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Percent Style')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Repeated Argument')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'NA Number Style')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Named Colon Mask')?.values).toEqual([true, true]);
    });

    it('formats timestamps with str.format_time', () => {
      const script = `//@version=6
indicator("String Format Time")
stamp = timestamp("GMT+2", 2024, 1, 5, 9, 30, 15)
pmStamp = timestamp("UTC", 2024, 1, 5, 15, 5, 0)
midnight = timestamp("UTC", 2024, 1, 5, 0, 0, 0)
noon = timestamp("UTC", 2024, 1, 5, 12, 0, 0)
millis = timestamp("UTC", 2024, 1, 5, 7, 30, 15) + 123
august = timestamp("UTC", 2024, 8, 20, 0, 0, 0)
plot(str.format_time(stamp, "yyyy-MM-dd HH:mm:ss", "GMT+2") == "2024-01-05 09:30:15", title="Offset")
plot(str.format_time(stamp, "yy/MM/dd HH:mm", "UTC") == "24/01/05 07:30", title="UTC")
plot(str.format_time(time=stamp, timezone="GMT+2") == "2024-01-05T09:30:15+0200", title="Named Default")
plot(str.format_time(stamp, "M/d/yyyy H:m:s 'UTC'Z", "UTC") == "1/5/2024 7:30:15 UTC+0000", title="Single Tokens")
plot(str.format_time(stamp, "h:mm a", "UTC") == "7:30 AM", title="AM Tokens")
plot(str.format_time(pmStamp, "hh:mm a", "UTC") == "03:05 PM", title="PM Tokens")
plot(str.format_time(midnight, "h a", "UTC") == "12 AM", title="Midnight Token")
plot(str.format_time(noon, "h a", "UTC") == "12 PM", title="Noon Token")
plot(str.format_time(millis, "S SS SSS", "UTC") == "1 12 123", title="Fraction Tokens")
plot(str.format_time(august, "MMM MMMM", "UTC") == "Aug August", title="Month Name Tokens")
plot(str.format_time(august, "E EEEE", "UTC") == "Tue Tuesday", title="Weekday Name Tokens")
plot(str.format_time(stamp, "D DD DDD", "UTC") == "5 05 005", title="Day Of Year Tokens")
plot(str.format_time(august, "MMM-d-y", "UTC") == "Aug-20-2024", title="Single Year Token")
plot(str.format_time(stamp, "z zzzz", "UTC") == "UTC Coordinated Universal Time", title="Timezone Name Tokens")
plot(str.format_time(stamp, "w ww", "UTC") == "1 01", title="Week Of Year Tokens")
plot(str.format_time(august, "W", "UTC") == "4", title="Week Of Month Token")
plot(str.format_time(stamp, "yyyy'T''Z'HH", "UTC") == "2024T'Z07", title="Escaped Quote")
plot(str.format_time(na, "yyyy-MM-dd", "UTC") == "NaN", title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Offset')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'UTC')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Named Default')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Single Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'AM Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'PM Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Midnight Token')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Noon Token')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Fraction Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Month Name Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Weekday Name Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Day Of Year Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Single Year Token')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Timezone Name Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Week Of Year Tokens')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Week Of Month Token')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Escaped Quote')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([true, true]);
    });

    it('rounds values to syminfo.mintick', () => {
      const script = `//@version=6
indicator("Round To Min Tick")
plot(math.round_to_mintick(1.234), title="Down")
plot(math.round_to_mintick(1.235), title="Up")
plot(math.round_to_mintick(number=1.005), title="Named Half Up")
plot(math.round_to_mintick(1.2000000000000002), title="Residue")
plot(math.round_to_mintick(na), title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Down')?.values).toEqual([1.23, 1.23]);
      expect(result.plots.find((plot) => plot.title === 'Up')?.values).toEqual([1.24, 1.24]);
      expect(result.plots.find((plot) => plot.title === 'Named Half Up')?.values).toEqual([1.01, 1.01]);
      expect(result.plots.find((plot) => plot.title === 'Residue')?.values).toEqual([1.2, 1.2]);
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

    it('keeps unseeded math.random deterministic per call site', () => {
      const script = `//@version=6
indicator("Deterministic Random")
plot(math.random(), title="First")
plot(math.random(), title="Second")`;

      const ast = parse(script);
      const bars = createBars(6, 100);
      const first = executeScript(ast, bars);
      const second = executeScript(ast, bars);
      const firstValues = first.plots.find((plot) => plot.title === 'First')?.values ?? [];
      const secondValues = first.plots.find((plot) => plot.title === 'Second')?.values ?? [];

      expect(first.errors).toHaveLength(0);
      expect(second.errors).toHaveLength(0);
      expect(firstValues).toEqual(second.plots.find((plot) => plot.title === 'First')?.values);
      expect(secondValues).toEqual(second.plots.find((plot) => plot.title === 'Second')?.values);
      expect(new Set(firstValues).size).toBeGreaterThan(1);
      expect(secondValues).not.toEqual(firstValues);
    });

    it('does not perturb unseeded math.random with conditional call order', () => {
      const conditionalLead = `//@version=6
indicator("Conditional Random")
if bar_index == 0
    lead = math.random()
main = math.random()
plot(main, title="Main")`;
      const skippedLead = `//@version=6
indicator("Conditional Random")
if false
    lead = math.random()
main = math.random()
plot(main, title="Main")`;

      const bars = createBars(6, 100);
      const conditionalResult = executeScript(parse(conditionalLead), bars);
      const skippedResult = executeScript(parse(skippedLead), bars);

      expect(conditionalResult.errors).toHaveLength(0);
      expect(skippedResult.errors).toHaveLength(0);
      expect(conditionalResult.plots.find((plot) => plot.title === 'Main')?.values)
        .toEqual(skippedResult.plots.find((plot) => plot.title === 'Main')?.values);
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

    it('caps plot outputs at the Pine 64-output limit', () => {
      const plotCalls = Array.from({ length: 65 }, (_, index) => `plot(close, title="P${index}")`).join('\n');
      const script = `//@version=6
indicator("Plot limit")
${plotCalls}`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(1));

      expect(result.errors.map((error) => error.message)).toEqual(['Too many plot outputs: maximum is 64']);
      expect(result.plots).toHaveLength(64);
    });

    it('does not count hline outputs against the Pine plot-output limit', () => {
      const plotCalls = Array.from({ length: 64 }, (_, index) => `plot(close, title="P${index}")`).join('\n');
      const hlineCalls = Array.from({ length: 3 }, (_, index) => `hline(${index}, title="H${index}")`).join('\n');
      const script = `//@version=6
indicator("Plot limit with hlines")
${plotCalls}
${hlineCalls}`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(67);
      expect(result.plots.filter((plot) => plot.type === 'hline')).toHaveLength(3);
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
    it('evaluates if expression variable initializers', () => {
      const script = `//@version=6
indicator("If Initializer")
selected = if bar_index == 0
    close
else
    open
fallback = if bar_index < 0
    close
plot(selected, title="Selected")
plot(fallback, title="Fallback")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([100.2, 100.5, 101]);
      expect(result.plots.find((plot) => plot.title === 'Fallback')?.values).toEqual([null, null, null]);
    });

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
plot(math.sum(source, 3), title="Sparse Sum")
dynamicSource = bar_index == 4 ? na : close
dynamicLength = bar_index < 4 ? 3 : 2
plot(math.sum(dynamicSource, dynamicLength), title="Dynamic Sparse Sum")`;

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
      expect(result.plots.find((plot) => plot.title === 'Dynamic Sparse Sum')?.values).toEqual([
        null,
        null,
        307,
        310,
        208,
      ]);
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

    it('preserves direct source identity for rolling helpers when current values collide', () => {
      const script = `//@version=6
indicator("Source identity")
plot(ta.sma(open, 2), title="Open SMA")
plot(math.sum(open, 2), title="Open Sum")
plot(ta.change(open), title="Open Change")
plot(ta.correlation(open, close, 2), title="Open Close Correlation")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
        { time: 2, open: 20, high: 22, low: 9, close: 10, volume: 100 },
        { time: 3, open: 30, high: 32, low: 28, close: 30, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Open SMA')?.values).toEqual([null, 15, 25]);
      expect(result.plots.find((plot) => plot.title === 'Open Sum')?.values).toEqual([null, 30, 50]);
      expect(result.plots.find((plot) => plot.title === 'Open Change')?.values).toEqual([null, 10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Open Close Correlation')?.values).toEqual([null, null, 1]);
    });

    it('preserves source identity through simple source aliases when current values collide', () => {
      const script = `//@version=6
indicator("Source alias identity")
src = open
srcCopy = src
reassigned = close
reassigned := open
plot(ta.sma(src, 2), title="Alias SMA")
plot(math.sum(srcCopy, 2), title="Alias Copy Sum")
plot(ta.change(reassigned), title="Reassigned Change")
plot(src[1], title="Alias History")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
        { time: 2, open: 20, high: 22, low: 9, close: 10, volume: 100 },
        { time: 3, open: 30, high: 32, low: 28, close: 30, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Alias SMA')?.values).toEqual([null, 15, 25]);
      expect(result.plots.find((plot) => plot.title === 'Alias Copy Sum')?.values).toEqual([null, 30, 50]);
      expect(result.plots.find((plot) => plot.title === 'Reassigned Change')?.values).toEqual([null, 10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Alias History')?.values).toEqual([null, 10, 20]);
    });

    it('preserves source identity through UDF and method parameters when current values collide', () => {
      const script = `//@version=6
indicator("Source parameter identity")
delayedAverage(series float src) =>
    bar_index >= 1 ? ta.sma(src, 2) : na
method delayedMethod(series float src) =>
    bar_index >= 1 ? ta.sma(src, 2) : na
plot(delayedAverage(open), title="Function Average")
plot(delayedAverage(src=open), title="Named Function Average")
plot(open.delayedMethod(), title="Method Average")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 15, volume: 100 },
        { time: 2, open: 20, high: 22, low: 9, close: 20, volume: 100 },
        { time: 3, open: 30, high: 32, low: 28, close: 25, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Function Average')?.values).toEqual([null, 15, 25]);
      expect(result.plots.find((plot) => plot.title === 'Named Function Average')?.values).toEqual([null, 15, 25]);
      expect(result.plots.find((plot) => plot.title === 'Method Average')?.values).toEqual([null, 15, 25]);
    });

    it('preserves source identity through simple UDF and method return values', () => {
      const script = `//@version=6
indicator("Source return identity")
passthrough(series float src) => src
method passthroughMethod(series float src) => src
selected = passthrough(open)
selectedMethod = open.passthroughMethod()
plot(bar_index >= 1 ? ta.sma(selected, 2) : na, title="Function Return Average")
plot(bar_index >= 1 ? ta.sma(selectedMethod, 2) : na, title="Method Return Average")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 15, volume: 100 },
        { time: 2, open: 20, high: 22, low: 9, close: 20, volume: 100 },
        { time: 3, open: 30, high: 32, low: 28, close: 25, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Function Return Average')?.values).toEqual([null, 15, 25]);
      expect(result.plots.find((plot) => plot.title === 'Method Return Average')?.values).toEqual([null, 15, 25]);
    });

    it('keeps mixed named and positional source helper results numeric', () => {
      const script = `//@version=6
indicator("Mixed source binding")
plot(ta.valuewhen(condition=bar_index == 2, open, 0) + 1, title="ValueWhen")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 },
        { time: 2, open: 20, high: 22, low: 9, close: 10, volume: 100 },
        { time: 3, open: 30, high: 32, low: 28, close: 30, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual([null, null, 31]);
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

    it('reports history references beyond explicit max_bars_back', () => {
      const script = `//@version=6
indicator("Limited History", max_bars_back=2)
plot(close[3], title="Too Far")`;

      const result = executeScript(parse(script), createBars(5, 100));

      expect(result.errors.map((error) => error.message)).toEqual([
        'History reference [3] exceeds indicator max_bars_back 2',
        'History reference [3] exceeds indicator max_bars_back 2',
        'History reference [3] exceeds indicator max_bars_back 2',
        'History reference [3] exceeds indicator max_bars_back 2',
        'History reference [3] exceeds indicator max_bars_back 2',
      ]);
    });

    it('keeps array indexes separate from max_bars_back enforcement', () => {
      const script = `//@version=6
indicator("Array Index", max_bars_back=1)
values = array.from(10, 20, 30)
plot(values[2], title="Array Value")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Array Value')?.values).toEqual([30, 30]);
    });

    it('applies max_bars_back to indexed expressions', () => {
      const script = `//@version=6
indicator("Expression History Limit", max_bars_back=1)
plot((close + 1)[2], title="Too Far")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors.map((error) => error.message)).toEqual([
        'History reference [2] exceeds indicator max_bars_back 1',
        'History reference [2] exceeds indicator max_bars_back 1',
        'History reference [2] exceeds indicator max_bars_back 1',
      ]);
    });

    it('reports the inferred max history offset in the runtime profile', () => {
      const script = `//@version=6
indicator("Inferred History")
plot(close[2], title="Close")`;

      const result = executeScript(parse(script), createBars(4, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(2);
    });

    it('accepts max_bars_back function hints in the runtime profile', () => {
      const script = `//@version=6
indicator("Function Max Bars Back")
max_bars_back(close, 9)
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(9);
      expect(result.plots.find((plot) => plot.title === 'Close')?.values).toEqual([100.2, 100.7, 101.2]);
    });

    it('accepts named max_bars_back function hints', () => {
      const script = `//@version=6
indicator("Named Function Max Bars Back")
hint = input.int(defval=7, title="Hint")
max_bars_back(close, num=hint)
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(7);
    });

    it('reports math.sum lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Math Sum Profile")
length = input.int(defval=5, title="Length")
plot(math.sum(source=close, length=length), title="Sum")`;

      const result = executeScript(parse(script), createBars(6, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(4);
    });

    it('reports the largest dynamic math.sum lookback length in the runtime profile', () => {
      const script = `//@version=6
indicator("Dynamic Math Sum Profile")
length = bar_index < 3 ? 2 : 6
plot(math.sum(close, length), title="Sum")`;

      const result = executeScript(parse(script), createBars(7, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(5);
    });

    it('reports shared TA window lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("TA Window Profile")
plot(ta.sma(close, 3), title="SMA")
plot(ta.highest(high, 5), title="Highest")
plot(ta.stdev(close, 4), title="Stdev")`;

      const result = executeScript(parse(script), createBars(6, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(4);
    });

    it('reports recursive and retained TA lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Recursive TA Profile")
plot(ta.ema(close, 7), title="EMA")
plot(ta.rsi(close, 4), title="RSI")
[macdLine, signalLine, histLine] = ta.macd(close, 3, 9, 5)
plot(macdLine, title="MACD")
plot(signalLine, title="Signal")
plot(histLine, title="Hist")`;

      const result = executeScript(parse(script), createBars(10, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('reports direct OHLC TA lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("OHLC Profile")
length = bar_index < 3 ? 4 : 9
plot(ta.wpr(length), title="WPR")
plot(ta.tr(true), title="TR")`;

      const result = executeScript(parse(script), createBars(12, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports unexecuted rolling helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Rolling Profile")
length = input.int(defval=6, title="Length")
if false
    plot(math.sum(close, length), title="Sum")
    plot(ta.sma(close, 5), title="SMA")
    plot(ta.rsi(close, 4), title="RSI")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(5);
    });

    it('statically reports unexecuted trend helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Trend Profile")
length = input.int(defval=8, title="Length")
if false
    plot(ta.range(close, 5), title="Range")
    plot(ta.rising(close, length), title="Rising")
    plot(ta.falling(source=close, length=6), title="Falling")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports unexecuted statistical helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Statistics Profile")
length = input.int(defval=9, title="Length")
if false
    plot(ta.dev(close, length), title="Deviation")
    plot(ta.correlation(close, open, length=7), title="Correlation")
    plot(ta.cog(source=close, length=6), title="COG")
    plot(ta.median(close, 5), title="Median")
    plot(ta.mode(source=close, 4), title="Mode")
    plot(ta.percentile_nearest_rank(close, 8, 75), title="Nearest")
    plot(ta.percentile_linear_interpolation(source=close, length=6, percentage=75), title="Linear")
    plot(ta.percentrank(source=close, length=7), title="Percent Rank")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports unexecuted momentum helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Momentum Profile")
length = input.int(defval=10, title="Length")
if false
    plot(ta.cmo(close, length), title="CMO")
    plot(ta.mom(source=close, length=8), title="Momentum")
    plot(ta.roc(close, 6), title="ROC")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(10);
    });

    it('statically reports unexecuted band and average helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Bands Profile")
length = input.int(defval=9, title="Length")
if false
    plot(ta.vwma(close, length), title="VWMA")
    plot(ta.cci(source=close, length=8), title="CCI")
    plot(ta.wma(close, 7), title="WMA")
    plot(ta.alma(series=close, length=6, offset=0.85, sigma=6), title="ALMA")
    [middle, upper, lower] = ta.bb(close, length, 2)
    plot(middle, title="BB")
    plot(ta.bbw(series=close, length=8, mult=2), title="BBW")
    plot(ta.linreg(source=close, length=7, offset=0), title="LinReg")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports unexecuted fixed and default helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Fixed Profile")
if false
    plot(ta.cross(close, open) ? 1 : 0, title="Cross")
    plot(ta.crossover(source1=close, source2=open) ? 1 : 0, title="Crossover")
    plot(ta.crossunder(source1=close, open) ? 1 : 0, title="Crossunder")
    plot(ta.change(close), title="Change")
    plot(ta.swma(close), title="SWMA")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(3);
    });

    it('statically reports unexecuted defaulted TA helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Default Helpers Profile")
if false
    plot(ta.cmo(close), title="CMO")
    plot(ta.mom(close), title="Momentum")
    plot(ta.roc(close), title="ROC")
    plot(ta.cci(close), title="CCI")
    [macdLine, signalLine, histLine] = ta.macd(close)
    plot(macdLine, title="MACD")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(25);
    });

    it('statically reports unexecuted oscillator helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Oscillator Profile")
if false
    plot(ta.stoch(close, high, low), title="Stoch")
    plot(ta.mfi(series=hlc3), title="MFI")
    plot(ta.wpr(length=12), title="WPR")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(14);
    });

    it('statically reports unexecuted pivot helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Pivot Profile")
left = input.int(defval=4, title="Left")
if false
    plot(ta.pivothigh(high, left, 3), title="Explicit High")
    plot(ta.pivotlow(source=low, leftbars=2, rightbars=8), title="Named Low")
    plot(ta.pivothigh(2, rightbars=5), title="Default High")
    plot(ta.pivotlow(leftbars=3), title="Defaulted Right Low")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(10);
    });

    it('statically reports unexecuted remaining TA helper lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Remaining TA Profile")
length = input.int(defval=13, title="Length")
if false
    plot(ta.atr(length), title="ATR")
    plot(ta.hma(source=close, length=8), title="HMA")
    [kcBasis, kcUpper, kcLower] = ta.kc(close, 9, 1.5)
    plot(kcBasis, title="KC")
    plot(ta.kcw(series=close, length=4, mult=1.5, useTrueRange=false), title="KCW")
    plot(ta.tsi(close, 3, 7), title="TSI")
    [supertrend, direction] = ta.supertrend(factor=2.0, atrPeriod=11)
    plot(supertrend, title="Supertrend")
    [diPlus, diMinus, adx] = ta.dmi(diLength=10, adxSmoothing=5)
    plot(adx, title="ADX")
    plot(ta.sar(0.02, 0.02, 0.2), title="SAR")
    plot(ta.obv(close, volume), title="OBV")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(13);
    });

    it('reports direct TA variable and indexed OHLC lookbacks in the runtime profile', () => {
      const script = `//@version=6
indicator("TA Variable Profile")
plot(ta.obv, title="OBV")
plot(ta.nvi, title="NVI")
plot(ta.pvi, title="PVI")
plot(ta.pvt, title="PVT")
plot(ta.wad, title="WAD")
plot(ta.tr[3], title="TR")`;

      const result = executeScript(parse(script), createBars(6, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(4);
    });

    it('statically reports unexecuted MACD lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static MACD Profile")
if false
    [macdLine, signalLine, histLine] = ta.macd(close, 3, 9, 5)
    plot(macdLine, title="MACD")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports unexecuted default-source TA lookback lengths in the runtime profile', () => {
      const script = `//@version=6
indicator("Static Default Source Profile")
length = input.int(defval=7, title="Length")
if false
    plot(ta.highest(length), title="Highest")
    plot(ta.lowest(length=5), title="Lowest")
    plot(ta.highestbars(6), title="Highest Offset")
    plot(ta.lowestbars(length=4), title="Lowest Offset")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(6);
    });

    it('reports invalid max_bars_back function hint values', () => {
      const script = `//@version=6
indicator("Invalid Function Max Bars Back")
max_bars_back(close, -1)
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors[0]?.message).toBe('max_bars_back num must be a non-negative integer');
    });

    it('statically reports literal history offsets from unexecuted branches', () => {
      const script = `//@version=6
indicator("Static History")
neverUsed(value) =>
    if false
        value[5]
    else
        value
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(5);
    });

    it('keeps obvious array indexes out of static history inference', () => {
      const script = `//@version=6
indicator("Array Static History")
values = array.from(10, 20, 30)
alias = values
literal = [40, 50, 60][2]
plot(alias[2] + literal, title="Array Values")`;

      const result = executeScript(parse(script), createBars(2, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(0);
      expect(result.plots.find((plot) => plot.title === 'Array Values')?.values).toEqual([90, 90]);
    });

    it('keeps collection inference scoped when names are shadowed', () => {
      const script = `//@version=6
indicator("Scoped Static History")
values = array.from(10, 20, 30)
shadowed(values) =>
    values[4]
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(4);
    });

    it('statically reports input-derived history offsets from unexecuted branches', () => {
      const script = `//@version=6
indicator("Input Static History")
length = input.int(defval=6, title="Length")
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(6);
    });

    it('statically reports simple numeric alias history offsets', () => {
      const script = `//@version=6
indicator("Alias Static History")
base = 2
length = base + 3
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(5);
    });

    it('statically reports input bool conditional history offsets', () => {
      const script = `//@version=6
indicator("Conditional Static History")
useLong = input.bool(defval=true, title="Use Long")
length = useLong ? 8 : 3
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports boolean alias conditional history offsets', () => {
      const script = `//@version=6
indicator("Boolean Alias Static History")
useLong = input.bool(false, title="Use Long")
enabled = not useLong
length = enabled ? 7 : 2
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(7);
    });

    it('statically reports numeric comparison conditional history offsets', () => {
      const script = `//@version=6
indicator("Comparison Static History")
threshold = input.int(defval=21, title="Threshold")
length = threshold > 20 ? 13 : 4
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(13);
    });

    it('statically reports boolean equality conditional history offsets', () => {
      const script = `//@version=6
indicator("Boolean Equality Static History")
useLong = input.bool(true, title="Use Long")
same = useLong == true
length = same ? 9 : 3
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(9);
    });

    it('statically reports math max history offsets', () => {
      const script = `//@version=6
indicator("Math Max Static History")
shortLength = input.int(defval=5, title="Short")
longLength = input.int(defval=12, title="Long")
length = math.max(number0=shortLength, longLength, 8)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(12);
    });

    it('statically reports average math history offsets', () => {
      const script = `//@version=6
indicator("Math Avg Static History")
shortLength = input.int(defval=4, title="Short")
longLength = input.int(defval=12, title="Long")
length = math.avg(number0=shortLength, longLength, 14)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(10);
    });

    it('does not statically infer sparse average math history offsets', () => {
      const script = `//@version=6
indicator("Sparse Math Avg Static History")
length = math.avg(number0=4, number2=14)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors.map((error) => error.message)).toEqual([
        'Missing variadic argument: number1',
        'Missing variadic argument: number1',
        'Missing variadic argument: number1',
      ]);
      expect(result.profile.maxBarsBack).toBe(0);
    });

    it('statically reports rounded math history offsets', () => {
      const script = `//@version=6
indicator("Rounded Math Static History")
raw = input.float(defval=7.6, title="Raw")
length = math.floor(math.round(number=raw, precision=0))
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(8);
    });

    it('statically reports power math history offsets', () => {
      const script = `//@version=6
indicator("Power Math Static History")
base = input.int(defval=4, title="Base")
length = math.pow(base=base, exponent=2)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(16);
    });

    it('statically reports square root math history offsets', () => {
      const script = `//@version=6
indicator("Square Root Math Static History")
raw = input.int(defval=36, title="Raw")
length = math.sqrt(number=raw)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(6);
    });

    it('statically reports cast-normalized history offsets', () => {
      const script = `//@version=6
indicator("Cast Static History")
raw = input.float(defval=5.9, title="Raw")
length = int(x=raw + 1)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(6);
    });

    it('statically reports nz fallback history offsets', () => {
      const script = `//@version=6
indicator("NZ Static History")
fallback = input.int(defval=11, title="Fallback")
length = nz(source=na, replacement=fallback)
if false
    plot(close[length], title="Hidden")
plot(close, title="Close")`;

      const result = executeScript(parse(script), createBars(3, 100));

      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(11);
    });
  });

  describe('inputs', () => {
    it('registers input definitions', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
namedLength = input.int(defval=21, title="Named Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.inputs.length).toBe(2);
      expect(result.inputs[0].title).toBe('Length');
      expect(result.inputs[0].defval).toBe(14);
      expect(result.inputs[1].title).toBe('Named Length');
      expect(result.inputs[1].defval).toBe(21);
    });

    it('resolves mixed named and positional input arguments in Pine order', () => {
      const script = `//@version=6
indicator("Mixed Inputs")
rangeLength = input.int(defval=14, "Range Length", 1, 50, 1, "Range tooltip", "len", "Inputs", true, display.data_window, false)
optionMode = input.string(defval="EMA", "Mode", ["SMA", "EMA"], "Mode tooltip", "mode", "Inputs", false, display.status_line, true)
generic = input(defval=true, "Generic Enabled", "Generic tooltip", "gen", "Inputs", false, display.none, true)
source = input.source(defval=close, "Mixed Source", "Source tooltip", "src", "Inputs", true, display.data_window, true)
plot(rangeLength + (optionMode == "EMA" ? 1 : 0) + (generic ? 1 : 0) + source)`;

      const result = executeScript(parse(script), createBars(2));

      expect(result.errors).toEqual([]);
      expect(result.inputs).toMatchObject([
        {
          id: 'input_Range Length',
          type: 'int',
          title: 'Range Length',
          defval: 14,
          minval: 1,
          maxval: 50,
          step: 1,
          tooltip: 'Range tooltip',
          inline: 'len',
          group: 'Inputs',
          confirm: true,
          display: 2,
          active: false,
        },
        {
          id: 'input_Mode',
          type: 'string',
          title: 'Mode',
          defval: 'EMA',
          options: ['SMA', 'EMA'],
          tooltip: 'Mode tooltip',
          inline: 'mode',
          group: 'Inputs',
          confirm: false,
          display: 4,
          active: true,
        },
        {
          id: 'input_Generic Enabled',
          type: 'bool',
          title: 'Generic Enabled',
          defval: true,
          tooltip: 'Generic tooltip',
          inline: 'gen',
          group: 'Inputs',
          confirm: false,
          display: 0,
          active: true,
        },
        {
          id: 'input_Mixed Source',
          type: 'source',
          title: 'Mixed Source',
          defval: 100.2,
          tooltip: 'Source tooltip',
          inline: 'src',
          group: 'Inputs',
          confirm: true,
          display: 2,
          active: true,
        },
      ]);
      expect(result.plots[0].values).toEqual([116.2, 116.7]);
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

    it('registers source input metadata and accepts overrides', () => {
      const script = `//@version=6
indicator("Source Input")
source = input.source(defval=close, title="Source", tooltip="Select source")
plot(source)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);
      const overrideResult = executeScript(ast, bars, new Map([['input_Source', 42]]));
      const sourceOverrideResult = executeScript(ast, bars, new Map([['input_Source', 'open']]));

      expect(result.inputs).toEqual([
        {
          id: 'input_Source',
          type: 'source',
          title: 'Source',
          defval: 100.2,
          tooltip: 'Select source',
        },
      ]);
      expect(result.plots[0].values).toEqual([100.2, 100.7, 101.2]);
      expect(overrideResult.plots[0].values).toEqual([42, 42, 42]);
      expect(sourceOverrideResult.plots[0].values).toEqual([100, 100.5, 101]);
    });

    it('uses derived source input history for TA functions', () => {
      const script = `//@version=6
indicator("Source Input History")
source = input.source(defval=close, title="Source")
plot(ta.sma(source, 2))`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars, new Map([['input_Source', 'hlcc4']]));

      expect(roundSeries(result.plots[0].values, 4)).toEqual([null, 100.4, 100.9]);
    });

    it('preserves input source identity when current source values collide', () => {
      const script = `//@version=6
indicator("Source Input Identity")
source = input.source(defval=open, title="Source")
plot(ta.sma(source, 2), title="Average")
plot(bar_index >= 1 ? ta.sma(source, 2) : na, title="Delayed Average")
plot(math.sum(source, 2), title="Sum")
plot(ta.change(source), title="Change")`;

      const bars = [
        { time: 1_000_000, open: 10, high: 22, low: 9, close: 15, volume: 100 },
        { time: 1_060_000, open: 20, high: 23, low: 18, close: 20, volume: 100 },
        { time: 1_120_000, open: 30, high: 31, low: 24, close: 25, volume: 100 },
      ];
      const defaultResult = executeScript(parse(script), bars);
      const closeOverrideResult = executeScript(parse(script), bars, new Map([['input_Source', 'close']]));

      expect(defaultResult.errors).toEqual([]);
      expect(defaultResult.plots.find((plot) => plot.title === 'Average')?.values).toEqual([null, 15, 25]);
      expect(defaultResult.plots.find((plot) => plot.title === 'Delayed Average')?.values).toEqual([null, 15, 25]);
      expect(defaultResult.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([null, 30, 50]);
      expect(defaultResult.plots.find((plot) => plot.title === 'Change')?.values).toEqual([null, 10, 10]);

      expect(closeOverrideResult.errors).toEqual([]);
      expect(closeOverrideResult.plots.find((plot) => plot.title === 'Average')?.values).toEqual([null, 17.5, 22.5]);
      expect(closeOverrideResult.plots.find((plot) => plot.title === 'Delayed Average')?.values).toEqual([null, 17.5, 22.5]);
      expect(closeOverrideResult.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([null, 35, 45]);
      expect(closeOverrideResult.plots.find((plot) => plot.title === 'Change')?.values).toEqual([null, 5, 5]);
    });

    it('reports invalid Pine input defaults', () => {
      const script = `//@version=6
indicator("Invalid input")
length = input.int(3.5, "Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('input.int defval must be an integer');
    });

    it('reports timeframe defaults outside declared options', () => {
      const script = `//@version=6
indicator("Invalid timeframe input")
tf = input.timeframe("240", "Timeframe", ["15", "60"])
plot(tf == "240")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('input.timeframe defval must be one of options');
    });

    it('rejects input range metadata together with options', () => {
      const script = `//@version=6
indicator("Invalid input overload")
length = input.int(14, "Length", options=[7, 14, 21], minval=1)
plot(length)`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors[0]?.message).toBe('input.int cannot use options together with minval/maxval/step');
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
      expect(firstColor).toBe('#F23645');
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

    it('stores history for indexed expressions during historical execution', () => {
      const script = `//@version=6
indicator("Expression History")
plot((close + 1)[1], title="Shifted")`;

      const result = executeScript(parse(script), createBars(4, 100));
      const shifted = result.plots.find((plot) => plot.title === 'Shifted')!;

      expect(result.errors).toEqual([]);
      expect(shifted.values).toEqual([
        null,
        101.2,
        101.7,
        102.2,
      ]);
    });

    it('replaces indexed expression history on realtime bar updates', () => {
      const script = `//@version=6
indicator("Realtime Expression History")
plot((close + 1)[0], title="Current")
plot((close + 1)[1], title="Previous")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      engine.updateBar(ast, { ...bars[2], close: 200 });
      const plots = engine.updateBar(ast, { ...bars[2], close: 300 });

      const current = plots.find((plot) => plot.title === 'Current')!;
      const previous = plots.find((plot) => plot.title === 'Previous')!;

      expect(current.values.length).toBe(bars.length);
      expect(previous.values.length).toBe(bars.length);
      expect(current.values[current.values.length - 1]).toBe(301);
      expect(previous.values[previous.values.length - 1]).toBe(101.7);
    });

    it('appends a new realtime bar with Pine barstate flags', () => {
      const script = `//@version=6
indicator("Realtime New Bar")
var ticks = 0
ticks := ticks + (barstate.isrealtime ? 1 : 0)
plot(ticks, title="Ticks")
plot(barstate.isnew ? 1 : 0, title="New")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
plot(barstate.isconfirmed ? 1 : 0, title="Confirmed")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.plots.find((plot) => plot.title === 'Ticks')?.values).toEqual([0, 0, 0]);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };
      const plots = engine.updateBar(ast, realtimeBar);

      const ticks = plots.find((plot) => plot.title === 'Ticks')!;
      const isNew = plots.find((plot) => plot.title === 'New')!;
      const realtime = plots.find((plot) => plot.title === 'Realtime')!;
      const confirmed = plots.find((plot) => plot.title === 'Confirmed')!;

      expect(ticks.values).toEqual([0, 0, 0, 1]);
      expect(isNew.values).toEqual([1, 1, 1, 1]);
      expect(realtime.values).toEqual([0, 0, 0, 1]);
      expect(confirmed.values).toEqual([1, 1, 1, 0]);
    });

    it('rolls back regular variables between realtime ticks on an appended bar', () => {
      const script = `//@version=6
indicator("Realtime Rollback")
var ticks = 0
ticks := ticks + (barstate.isrealtime ? 1 : 0)
plot(ticks, title="Ticks")
plot(barstate.isnew ? 1 : 0, title="New")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };
      engine.updateBar(ast, realtimeBar);
      const sameBarPlots = engine.updateBar(ast, { ...realtimeBar, close: 102.75 });
      const sameBarTicks = [...sameBarPlots.find((plot) => plot.title === 'Ticks')!.values];
      const sameBarNew = [...sameBarPlots.find((plot) => plot.title === 'New')!.values];
      const nextBarPlots = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 103,
        high: 103.5,
        low: 102.8,
        close: 103.25,
      });

      expect(sameBarTicks).toEqual([0, 0, 0, 1]);
      expect(sameBarNew).toEqual([1, 1, 1, 0]);
      expect(nextBarPlots.find((plot) => plot.title === 'Ticks')?.values).toEqual([0, 0, 0, 1, 2]);
      expect(nextBarPlots.find((plot) => plot.title === 'New')?.values).toEqual([1, 1, 1, 0, 1]);
    });

    it('preserves primitive varip variables between realtime ticks', () => {
      const script = `//@version=6
indicator("Primitive Varip")
varip ticks = 0
if barstate.isnew
    ticks := 0
if barstate.isrealtime
    ticks := ticks + 1
plot(ticks, title="Ticks")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };

      const firstTick = engine.updateBar(ast, realtimeBar);
      const firstTickValue = firstTick.find((plot) => plot.title === 'Ticks')!.values.at(-1);
      const secondTick = engine.updateBar(ast, { ...realtimeBar, close: 102.75 });
      const secondTickValues = [...secondTick.find((plot) => plot.title === 'Ticks')!.values];
      const nextBar = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 103,
        high: 103.5,
        low: 102.8,
        close: 103.25,
      });

      expect(firstTickValue).toBe(1);
      expect(secondTickValues).toEqual([0, 0, 0, 2]);
      expect(nextBar.find((plot) => plot.title === 'Ticks')?.values).toEqual([0, 0, 0, 3, 1]);
    });

    it('rejects out-of-order realtime bars', () => {
      const script = `//@version=6
indicator("Out Of Order")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);

      expect(() => engine.updateBar(ast, { ...bars[1], close: 999 })).toThrow('Out-of-order bar update');
    });

    it('evaluates a closing realtime bar as confirmed before opening the next bar', () => {
      const script = `//@version=6
indicator("Realtime Close")
plot(barstate.isconfirmed ? close : na, title="Confirmed Close")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };
      engine.updateBar(ast, realtimeBar);
      const plots = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 103,
        high: 103.5,
        low: 102.8,
        close: 103.25,
      });

      expect(plots.find((plot) => plot.title === 'Confirmed Close')?.values).toEqual([
        100.2,
        100.7,
        101.2,
        102.25,
        null,
      ]);
    });

    it('keeps barstate transitions stable across realtime replay and close', () => {
      const script = `//@version=6
indicator("Barstate Transitions")
plot(barstate.islast ? 1 : 0, title="Last")
plot(barstate.ishistory ? 1 : 0, title="History")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
plot(barstate.isnew ? 1 : 0, title="New")
plot(barstate.isconfirmed ? 1 : 0, title="Confirmed")
plot(barstate.islastconfirmedhistory ? 1 : 0, title="Last Confirmed History")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };
      engine.updateBar(ast, realtimeBar);
      const replayPlots = engine.updateBar(ast, { ...realtimeBar, close: 102.75 });
      const replayNew = [...replayPlots.find((plot) => plot.title === 'New')!.values];
      const replayConfirmed = [...replayPlots.find((plot) => plot.title === 'Confirmed')!.values];
      const nextBarPlots = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 103,
        high: 103.5,
        low: 102.8,
        close: 103.25,
      });

      expect(replayNew).toEqual([1, 1, 1, 0]);
      expect(replayConfirmed).toEqual([1, 1, 1, 0]);
      expect(nextBarPlots.find((plot) => plot.title === 'Last')?.values).toEqual([0, 0, 1, 1, 1]);
      expect(nextBarPlots.find((plot) => plot.title === 'History')?.values).toEqual([1, 1, 1, 0, 0]);
      expect(nextBarPlots.find((plot) => plot.title === 'Realtime')?.values).toEqual([0, 0, 0, 1, 1]);
      expect(nextBarPlots.find((plot) => plot.title === 'New')?.values).toEqual([1, 1, 1, 0, 1]);
      expect(nextBarPlots.find((plot) => plot.title === 'Confirmed')?.values).toEqual([1, 1, 1, 1, 0]);
      expect(nextBarPlots.find((plot) => plot.title === 'Last Confirmed History')?.values).toEqual([0, 0, 1, 0, 0]);
    });

    it('keeps confirmed-gated values stable until the realtime bar closes', () => {
      const script = `//@version=6
indicator("Confirmed Repaint Fixture")
live = close
confirmedOnly = barstate.isconfirmed ? close : close[1]
plot(live, title="Live")
plot(confirmedOnly, title="Confirmed Only")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      engine.execute(ast, bars);
      const realtimeBar = {
        ...bars[2],
        time: bars[2].time + 60_000,
        open: 102,
        high: 102.5,
        low: 101.8,
        close: 102.25,
      };
      engine.updateBar(ast, realtimeBar);
      const replayPlots = engine.updateBar(ast, { ...realtimeBar, close: 102.75 });
      const replayLive = [...replayPlots.find((plot) => plot.title === 'Live')!.values];
      const replayConfirmed = [...replayPlots.find((plot) => plot.title === 'Confirmed Only')!.values];
      const nextBarPlots = engine.updateBar(ast, {
        ...realtimeBar,
        time: realtimeBar.time + 60_000,
        open: 103,
        high: 103.5,
        low: 102.8,
        close: 103.25,
      });

      expect(replayLive).toEqual([100.2, 100.7, 101.2, 102.75]);
      expect(replayConfirmed).toEqual([100.2, 100.7, 101.2, 101.2]);
      expect(nextBarPlots.find((plot) => plot.title === 'Live')?.values).toEqual([100.2, 100.7, 101.2, 102.75, 103.25]);
      expect(nextBarPlots.find((plot) => plot.title === 'Confirmed Only')?.values).toEqual([
        100.2,
        100.7,
        101.2,
        102.75,
        102.75,
      ]);
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

    it('supports color map keys through namespace constants', () => {
      const script = `//@version=6
indicator("Color Map Keys")
var m = map.new<color, string>()
if barstate.isfirst
    m.put(color.red, "sell")
    m.put(color.green, "buy")
    m.put(color.red, "exit")
keys = m.keys()
removed = m.remove(color.green)
plot(m.contains(color.red) ? 1 : 0, title="Has Red")
plot(m.get(color.red) == "exit" ? 1 : 0, title="Red Value")
plot(removed == "buy" ? 1 : 0, title="Removed Green")
plot(m.contains(color.green) ? 1 : 0, title="Has Green")
plot(array.get(keys, 0) == color.red ? 1 : 0, title="First Key")`;

      const result = executeScript(parse(script), createBars(1));

      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([[1], [1], [1], [0], [1]]);
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
