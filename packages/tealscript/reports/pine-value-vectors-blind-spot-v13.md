> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V13

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-v4.json`
- `pine-value-vector-context-comparison-v1.md`
- `external-pine-corpus-v5.fixture-profile-delta-v2.md`

## Summary

- Independent-oracle value-vector cases: `324`.
- Context-sensitive cases run under a second chart context: `61`.
- Changed and should have: `25`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects or trace-required surfaces tracked by id: `4`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |
| Broader builtin surface | `248/489` | `50.72%` | Up from `245/489`; this batch adds pyramiding, calc-on-order-fills, and calc-on-every-history-tick strategy coverage. |

## New Strategy Coverage

- Added `strategy.pyramiding-cap-values` for pyramiding-limited successive entries.
- Added `strategy.calc-on-order-fills-values` for fill-triggered strategy recalculation.
- Added `strategy.calc-on-every-history-tick-values` for historical OHLC tick recalculation.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` remains a fixed-cash commission defect: `strategy.commission.cash_per_order` is applied as percent commission.
- `strategy.calc-on-order-fills-values` is trace-required: Pine recalculates immediately after fills, and TealScript currently rejects that mode rather than simulating untraced fill-triggered re-entry.

## Remaining Limits

- `241/489` documented builtin members still lack independent-oracle value vectors.
- `calc_on_order_fills=true` has an explicit vector and expected diagnostic, but it is not verified behavior until TradingView trace evidence exists or the mode is implemented.
- Realtime `varip`, unconfirmed-bar replacement, live rollback, and intrabar alert/order timing remain outside this historical vector runner.
- Real symbol metadata still requires host metadata or traces; this runner only proves behavior for synthetic metadata profiles.
- Event-backed requests and exact exchange calendars still require host feeds or TradingView traces.
