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
