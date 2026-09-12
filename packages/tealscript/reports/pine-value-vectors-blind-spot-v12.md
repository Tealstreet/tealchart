> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V12

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-v2.json`
- `pine-value-vector-context-comparison-v1.md`
- `external-pine-corpus-v5.fixture-profile-delta-v2.md`

## Summary

- Independent-oracle value-vector cases: `321`.
- Context-sensitive cases run under a second chart context: `61`.
- Changed and should have: `25`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects tracked by id: `3`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |
| Broader builtin surface | `245/489` | `50.10%` | Up from `227/489`; this batch adds strategy aggregate, timing, commission, open-trade percent, and risk-rule value vectors. |

## New Strategy Coverage

- Added `strategy.aggregate-performance-values` for `grossprofit`, `grossloss`, `avg_trade`, `avg_winning_trade`, `avg_losing_trade`, `wintrades`, `losstrades`, `eventrades`, and `percent_profitable`.
- Added `strategy.closedtrades-timing-commission-values` for closed-trade entry/exit bar, entry/exit time, and commission.
- Added `strategy.opentrades-timing-percent-values` for open-trade entry bar, entry time, and profit percent.
- Added `strategy.risk-allow-entry-direction-values` for `strategy.risk.allow_entry_in()` affecting order eligibility and closed-trade profit.

## New Finding

- `strategy.closedtrades-timing-commission-values` is an expected engine defect: `strategy.commission.cash_per_order` is applied as a percent commission in this path instead of a fixed cash fee per order.
- Pine rule cited in the fixture: `cash_per_order` is a fixed cash fee per order, and `strategy.closedtrades.commission()` returns total commission paid for the closed trade.

## Remaining Limits

- `244/489` documented builtin members still lack independent-oracle value verification.
- Realtime `varip`, unconfirmed-bar replacement, live rollback, and intrabar alert/order timing remain outside this historical vector runner.
- Real symbol metadata still requires host metadata or traces; this runner only proves behavior for synthetic metadata profiles.
- Event-backed requests and exact exchange calendars still require host feeds or TradingView traces.
