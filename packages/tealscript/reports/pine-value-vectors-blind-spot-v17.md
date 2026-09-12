> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V17

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-syminfo-v1.json`
- `/tmp/pine-value-vector-context-syminfo-v1.md`
- `external-pine-corpus-v5.fixture-profile-delta-v2.md`

## Summary

- Independent-oracle value-vector cases: `330`.
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
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |
| Broader builtin surface | `280/489` | `57.26%` | Up from `268/489`; this batch adds symbol metadata values used in chart-context gates. |

## New Symbol Metadata Coverage

- Added `runtime.syminfo-metadata-values`.
- Newly covered members: `syminfo.tickerid`, `syminfo.prefix`, `syminfo.root`, `syminfo.description`, `syminfo.type`, `syminfo.session`, `syminfo.timezone`, `syminfo.pointvalue`, `syminfo.mincontract`, `syminfo.volumetype`, `syminfo.country`, and `syminfo.sector`.
- The case is context-sensitive from the start and changes under the alternate symbol/tick metadata context as Pine exposes those values as script data.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` remains a fixed-cash commission defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.

## Remaining Limits

- `209/489` documented builtin members still lack independent-oracle value vectors.
- Realtime `varip`, unconfirmed-bar replacement, live rollback, and intrabar alert/order timing remain outside this historical vector runner.
- Real symbol metadata still requires host metadata or traces; this runner only proves behavior for synthetic metadata profiles.
- Event-backed requests and exact exchange calendars still require host feeds or TradingView traces.
