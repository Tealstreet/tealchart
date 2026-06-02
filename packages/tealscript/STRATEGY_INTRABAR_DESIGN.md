# Strategy Intrabar And Bar Magnifier Design

This document defines the next strategy-parity boundary after the deterministic
OHLC broker emulator. It intentionally separates host data requirements from
runtime fill logic so TealScript does not silently invent lower-timeframe data
or produce misleading strategy results.

Primary Pine references:

- TradingView strategy concepts:
  https://www.tradingview.com/pine-script-docs/concepts/strategies/
- TradingView declaration statements:
  https://www.tradingview.com/pine-script-docs/language/declaration-statements

## Current State

The current runtime supports a deterministic OHLC broker emulator:

- market, limit, stop, stop-limit, bracket, trailing-stop, partial-exit,
  OCA-cancel, pyramiding, reversal, and close/cancel flows;
- next-open market fills by default;
- `process_orders_on_close` market fills;
- strategy settings, position state, open/closed trades, equity snapshots,
  commissions, runup/drawdown, trade accessors, and order-fill alerts.

This is intentionally chart-OHLC only. It does not implement TradingView's Bar
Magnifier mode or lower-timeframe order-fill simulation.

## Pine Behavior To Match

### Default Historical Fill Path

Without Bar Magnifier, TradingView's broker emulator infers an intrabar path
from the chart bar's OHLC values:

- if `open` is closer to `high` than `low`, use `open -> high -> low -> close`;
- otherwise use `open -> low -> high -> close`;
- assume no internal gaps inside the chart bar range;
- if a price-based order is crossed in the gap between previous close and
  current open, fill at current open rather than the requested order price.

This is the baseline path model for chart bars with no host intrabar data.

### Bar Magnifier

When `strategy(..., use_bar_magnifier = true)` is enabled, TradingView uses
available lower-timeframe data to simulate order fills inside chart bars. It
falls back to default chart-OHLC assumptions on chart bars without available
intrabar data. TradingView documents a lower-timeframe request cap, so host
integrations must be explicit about unavailable early-history intrabars.

### Recalculation Knobs

`calc_on_every_tick = true` affects realtime bars, but historical bars still
have only the OHLC ticks available to the broker emulator unless Bar Magnifier
data exists.

`calc_on_order_fills = true` recalculates immediately after a simulated fill.
On historical bars this can create additional fills on OHLC or lower-timeframe
ticks. The runtime must preserve deterministic ordering and prevent infinite
fill/recalculate loops.

`process_orders_on_close = true` permits market orders to fill on the closing
tick of the same bar. `strategy.close()` and `strategy.close_all()` also have an
`immediately` parameter that applies same-tick close behavior selectively.

## Host Data Contract

Strategy intrabar data should reuse the request-datafeed concept but remain a
separate runtime contract because order fills need ordered executable ticks, not
Pine arrays returned to script code.

Initial exported types and deterministic fixture helper:

```ts
export interface StrategyIntrabarContext {
  symbol: string;
  timeframe: string;
  chartBarTime: number;
  chartBarIndex: number;
  chartBar: Bar;
  ticks: StrategyExecutionTick[];
  source: 'chart_ohlc' | 'lower_timeframe';
  unavailableReason?: 'missing_context' | 'invalid_timeframe' | 'host_limit';
}

export interface StrategyExecutionTick {
  time: number;
  price: number;
  kind: 'open' | 'high' | 'low' | 'close' | 'intrabar_open' | 'intrabar_high' | 'intrabar_low' | 'intrabar_close';
  sequence: number;
  sourceBarTime?: number;
  sourceBarIndex?: number;
}

export interface StrategyIntrabarDatafeed {
  getStrategyIntrabars(request: StrategyIntrabarRequest): StrategyIntrabarResult;
}

export class InMemoryStrategyIntrabarDatafeed implements StrategyIntrabarDatafeed {
  getStrategyIntrabars(request: StrategyIntrabarRequest): StrategyIntrabarResult;
}

export function createDefaultStrategyOhlcIntrabarContext(request: StrategyIntrabarRequest): StrategyIntrabarContext;
```

The host must return ticks ordered by execution sequence. The runtime should not
sort or infer lower-timeframe order beyond preserving a deterministic fallback
for chart OHLC bars.

## Runtime Fill Pipeline

The strategy pass should be split into explicit stages:

1. Build the chart-bar execution path:
   - lower-timeframe ticks when `use_bar_magnifier` is enabled and data exists;
   - otherwise default chart-OHLC ticks.
2. Execute script calculation at the Pine-appropriate calculation ticks:
   - historical default: bar close;
   - realtime with `calc_on_every_tick`: every realtime tick;
   - after fills with `calc_on_order_fills`: immediately after each fill.
3. Queue orders from script calls with their creation tick sequence.
4. Fill eligible orders only on ticks after creation, except:
   - `process_orders_on_close` close-tick market fills;
   - close/close_all `immediately=true` market orders.
5. Apply fills to ledger state, emit order-fill events, and schedule
   recalculation when enabled.

Market orders fill on the next eligible tick. Price-based orders fill when the
execution path reaches or crosses the requested price. Gap-crossed price orders
fill at the current bar open per Pine's default gap rule.

## Deterministic Test Fixtures

The implementation should start with small fixed bars rather than live
TradingView comparisons:

1. Default OHLC path:
   - `open -> high -> low -> close` versus `open -> low -> high -> close`;
   - limit/stop fills that depend on path ordering;
   - gap crossing fills at current open.
2. Bar Magnifier path:
   - weekly chart bar with daily lower-timeframe ticks where entry and exit can
     both fill inside the same chart bar;
   - missing intrabar data falls back to chart OHLC path.
3. Recalculation:
   - `calc_on_order_fills` places a follow-up order after the first fill;
   - loop guard rejects runaway fill/recalculate cycles.
4. Close behavior:
   - default close order waits for next tick;
   - `process_orders_on_close` fills same-bar close;
   - `immediately=true` close orders fill selectively.

Real Pine checkpoint fixtures should be reduced from TradingView's documented
Bar Magnifier and recalculation examples, with source links in comments. CI
must stay offline and deterministic.

## Non-Goals For The First Implementation PR

- Live lower-timeframe fetching from exchanges or TradingView.
- Strategy behavior over synthetic ticker constructors beyond documented
  fallback semantics.
- Tick-by-tick historical data beyond lower-timeframe OHLC bars supplied by the
  host.
- Exact Strategy Tester UI rendering.

## Implementation Sequence

1. Add exported strategy intrabar data types and an in-memory fixture datafeed.
   Done.
2. Add chart-OHLC execution-path generation and tests for Pine's default path
   assumptions.
   Done.
3. Thread `use_bar_magnifier` from `strategy()` settings to the runtime ledger
   and path provider.
4. Implement lower-timeframe path selection with explicit fallback metadata.
5. Refactor order filling to consume execution ticks instead of a single
   per-bar OHLC fill point.
6. Implement bounded `calc_on_order_fills` recalculation.
7. Add reduced Pine checkpoint tests for Bar Magnifier and recalculation
   examples.

Each step should be a separate PR unless the diff is very small.
