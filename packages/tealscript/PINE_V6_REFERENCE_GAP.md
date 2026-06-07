# Pine v6 Reference Gap Analysis

Verified gaps between the official Pine Script v6 reference and TealScript.
Cross-checked against engine.ts, drawings.ts, context.ts, builtinMetadata.ts
on 2026-06-07.

Source: [Pine Script v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/)

## Legend

- `[ ]` = confirmed missing — a parity gap
- `[x]` = gap closed (implemented + tested)
- `[n/a]` = deferred (needs host data, deprecated, or very rare)

---

## Strategy Performance Variables (0 gaps remaining — CLOSED)

Used by strategy stats tables and performance dashboards.

- [x] strategy.avg_trade
- [x] strategy.avg_trade_percent
- [x] strategy.avg_winning_trade
- [x] strategy.avg_winning_trade_percent
- [x] strategy.avg_losing_trade
- [x] strategy.avg_losing_trade_percent
- [x] strategy.max_drawdown_percent
- [x] strategy.max_runup_percent
- [x] strategy.max_contracts_held_all
- [x] strategy.max_contracts_held_long
- [x] strategy.max_contracts_held_short
- [x] strategy.margin_liquidation_price
- [x] strategy.closedtrades.first_index
- [x] strategy.opentrades.capital_held

## Session State Variables (0 gaps — MEDIUM IMPACT)

- [x] session.isfirstbar
- [x] session.isfirstbar_regular
- [x] session.islastbar
- [x] session.islastbar_regular

## Chart Type Detection (0 gaps remaining — CLOSED)

- [x] chart.is_heikinashi
- [x] chart.is_kagi
- [x] chart.is_linebreak
- [x] chart.is_pnf
- [x] chart.is_range
- [x] chart.is_renko

## Symbol Info (0 gaps remaining — CLOSED)

- [x] syminfo.minmove
- [x] syminfo.shares_outstanding_float
- [x] syminfo.shares_outstanding_total

## Misc (0 gaps remaining — CLOSED)

- [x] math.rphi
- [x] timeframe.isticks
- [x] label.style_text_outline

## Deferred (host-dependent)

- [n/a] dividends.future_amount / future_ex_date / future_pay_date
- [n/a] earnings.future_eps / future_period_end_time / future_revenue / future_time
- [n/a] request.footprint (planned unsupported)
- [n/a] request.quandl (deprecated alias)

---

## Real-World Corpus Gaps

Discovered by running 15 reduced real-world idioms through the runtime
(`tests/compat/pine-realworld-corpus.test.ts`) on 2026-06-08. All 15 pass
with no actionable gaps. No new deferred items were found.

### Probe results summary

| Script | Status | Notes |
| --- | --- | --- |
| RSI OB/OS Signal | pass | ta.rsi + threshold plots |
| MACD Crossover Signal | pass | ta.macd() tuple destructure + bullish flag |
| ATR Position Sizing | pass | ta.atr() + derived stop/size series |
| PVT Signal | pass | ta.pvt + EMA signal line |
| BB/KC Squeeze | pass | ta.bb() + ta.kc() width comparison |
| MA Ribbon | pass | 3-EMA ribbon with bull-trend flag |
| Barcolor Trend | pass | barcolor() + state plot |
| UDF Smoothed RSI | pass | user-defined function wrapping ta.rsi + ta.sma |
| RSI Divergence | pass | RSI vs price swing divergence gates |
| Volume Analysis (OBV) | pass | ta.obv + SMA signal + high-volume flag |
| Multi-Indicator Dashboard | pass | RSI + SMA + ATR feeding a table |
| Oscillator Combo (RSI+Stoch) | pass | Combined OB/OS from two oscillators |
| MA Crossover Alert | pass | alertcondition() with dynamic message templates |
| VWAP Dev Bands | pass | var-accumulated VWAP with ±2σ envelope |
| Pivot S/R Lines | pass | ta.highest/lowest pivots + line.new() drawings |

All 15 scripts ran without parse, semantic, runtime, or output gaps.
No new failure classes were introduced.

### Advanced corpus probe (10 scripts) — 2026-06-08

An additional 10 advanced scripts were added to `tests/compat/pine-realworld-corpus.test.ts`
targeting complex feature combinations. All 10 pass.

| Script | Status | Pattern |
| --- | --- | --- |
| Strategy stats table | pass | strategy.netprofit + avg_trade + max_drawdown + wintrades in table |
| UDT with methods + for-in | pass | type with method returning self; array of instances; for-in aggregation |
| UDF default parameters | pass | nested UDF calls with default args (normalize → smoothedNorm) |
| Drawing objects lifecycle | pass | label array with max-size eviction via label.delete + array.shift |
| Switch enum state machine | pass | local enum in switch expression for trend state |
| Matrix operations | pass | 3×3 matrix built from current + SMA series; row extraction + sum |
| Map-based state tracking | pass | persistent map<string,float> accumulating count + sum across bars |
| Complex conditional plotting | pass | dynamic plot color + fill() + plotshape() in one indicator |
| For-loop with array accumulate + sort | pass | rolling window array; numeric for aggregate; copy + sort for median |
| str.format multi-placeholder dashboard | pass | str.format with number format specifiers; table at last bar |

All 10 advanced scripts passed without any parse, semantic, runtime, or output gaps.
No new failure classes were introduced.

### Edge-case corpus probe (12 scripts) — 2026-06-08

12 edge-case scripts added to `tests/compat/pine-realworld-corpus.test.ts` targeting
parser and runtime edge cases. 11 pass; 1 skipped (trailing comma in function calls).

| Script | Status | Pattern |
| --- | --- | --- |
| Deeply nested calls | pass | ta.sma(ta.ema(close, math.round(length/2)), 20) — 3-deep nesting |
| Ternary in arg position | pass | ta.sma(close > open ? high : low, 3) |
| Empty UDF body (na) | pass | f() => na; nz(f(), 0.0) |
| Three-tuple UDF return | pass | [h, l, m] = getStats(close, 3) |
| NA propagation warm-up | pass | ta.sma null for first length-1 bars |
| Cumulative accumulation | pass | var float cumSum = 0.0; cumSum += close |
| valuewhen + crossover | pass | ta.valuewhen(ta.crossover(sma3, sma5), high, 0) |
| plotshape dynamic text | pass | plotshape(cond, text=str.tostring(close, "#.##")) |
| color.rgb boundary clamp | pass | transparency 0, 100, -10, 110 all clamp correctly |
| input.source UDF arg | pass | src = input.source(close); out = smoothed(src, 3) |
| Strategy multi-exit | pass | strategy.exit with profit=, loss=, trail_offset= together |
| Array copy + sort chain | pass | vals.copy(); sorted.sort(); sorted.get(0) |
| **Trailing comma in call** | **skip** | `ta.sma(close, 5,)` → parse error; gap below |

### Real-World Corpus Gaps — Edge Cases

#### Parser gap: trailing comma in function call argument list

**Pattern:** `ta.sma(close, 5,)` — some editors/formatters emit a trailing comma
after the last argument in a function call.

**Status:** Parser rejects this with a parse error. The `ArgumentList` grammar rule
requires each entry to be a valid `Argument` (positional or named), so a bare trailing
comma is invalid.

**Impact:** Low — almost no hand-written scripts use trailing commas; only machine-
formatted code does. Not blocking for copy-paste parity.

**Test:** `it.skip('trailing comma in function call args', ...)` in `pine-realworld-corpus.test.ts`.

**Fix path:** Add `(__ ",")?` after the last argument in `ArgumentList` in `grammar.peggy`,
rebuild the parser, and unskip the test.

---

## Summary

| Category | Gaps | Impact |
| --- | ---: | --- |
| Strategy performance variables | 0 | CLOSED |
| Session state variables | 0 | CLOSED |
| Chart type detection | 0 | CLOSED |
| Symbol info fields | 0 | CLOSED |
| Misc constants | 0 | CLOSED |
| **Total actionable** | **0** | |
| Deferred (host-dependent) | 9 | — |
| **Real-world corpus probe (15 scripts)** | **0** | All pass |
| **Advanced corpus probe (10 scripts)** | **0** | All pass |
| **Edge-case corpus probe (12 scripts)** | **1 (parser)** | 11 pass, 1 skipped (trailing comma) |
