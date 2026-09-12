> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V19

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-risk-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `/tmp/pine-value-vector-context-syminfo-v1.md`

## Summary

- Independent-oracle value-vector cases: `332`.
- Context-sensitive cases run under a second chart context: `64`.
- Changed and should have: `28`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects or trace-required surfaces tracked by id: `4`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `295/489` | `60.33%` | Up from `294/489`; this batch adds `strategy.risk.max_position_size`. |
| Practical no-trace ceiling | `295/471` | `62.63%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Strategy Risk Coverage

- Added `strategy.risk-max-position-size-values`.
- The vector asserts that `strategy.risk.max_position_size(3)` clips a requested 5-contract entry to 3 contracts and prevents a later same-direction entry from exceeding the cap.

## Practical Ceiling

- Remaining raw uncovered members: `194`.
- Remaining no-trace-verifiable members: `176`.
- The remaining set is still dominated by locally-testable visual/drawing/table state and strategy/order/risk state, not by provider-only surfaces.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` remains a fixed-cash commission defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
