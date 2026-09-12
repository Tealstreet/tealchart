> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V16

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-timeframe-v2.json`
- `/tmp/pine-value-vector-context-timeframe-v2.md`
- `external-pine-corpus-v5.fixture-profile-delta-v2.md`

## Summary

- Independent-oracle value-vector cases: `329`.
- Context-sensitive cases run under a second chart context: `63`.
- Changed and should have: `27`.
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
| Broader builtin surface | `268/489` | `54.81%` | Up from `259/489`; this batch adds remaining high-use timeframe flags and conversions. |

## New Timeframe Coverage

- Added `runtime.timeframe-conversion-change-values`.
- Newly covered members: `timeframe.isdwm`, `timeframe.isdaily`, `timeframe.isweekly`, `timeframe.ismonthly`, `timeframe.isseconds`, `timeframe.isticks`, `timeframe.to_seconds`, `timeframe.from_seconds`, and `timeframe.change`.
- The case is context-sensitive from the start: it passes on its baseline 60-minute chart context and changes under the alternate 15-minute context exactly where Pine exposes chart timeframe as data.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` remains a fixed-cash commission defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.

## Remaining Limits

- `221/489` documented builtin members still lack independent-oracle value vectors.
- Realtime `varip`, unconfirmed-bar replacement, live rollback, and intrabar alert/order timing remain outside this historical vector runner.
- Real symbol metadata still requires host metadata or traces; this runner only proves behavior for synthetic metadata profiles.
- Event-backed requests and exact exchange calendars still require host feeds or TradingView traces.
