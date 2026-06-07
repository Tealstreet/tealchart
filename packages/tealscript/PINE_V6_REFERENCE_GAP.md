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

## Symbol Info (3 gaps — LOW IMPACT)

- [ ] syminfo.minmove
- [ ] syminfo.shares_outstanding_float
- [ ] syminfo.shares_outstanding_total

## Misc (3 gaps — LOW IMPACT)

- [ ] math.rphi
- [ ] timeframe.isticks
- [ ] label.style_text_outline

## Deferred (host-dependent)

- [n/a] dividends.future_amount / future_ex_date / future_pay_date
- [n/a] earnings.future_eps / future_period_end_time / future_revenue / future_time
- [n/a] request.footprint (planned unsupported)
- [n/a] request.quandl (deprecated alias)

---

## Summary

| Category | Gaps | Impact |
| --- | ---: | --- |
| Strategy performance variables | 0 | CLOSED |
| Session state variables | 0 | CLOSED |
| Chart type detection | 0 | CLOSED |
| Symbol info fields | 3 | LOW |
| Misc constants | 3 | LOW |
| **Total actionable** | **6** | |
| Deferred (host-dependent) | 9 | — |
