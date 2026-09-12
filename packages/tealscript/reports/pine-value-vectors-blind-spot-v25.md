> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V25

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-order-v2.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v24.md`

## Summary

- Independent-oracle value-vector cases: `346`.
- Context-sensitive cases run under a second chart context: `64`.
- Changed and should have: `28`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects or trace-required surfaces tracked by id: `3`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `381/489` | `77.91%` | Up from `378/489`; this batch adds pending-order cancellation and strategy currency conversion coverage. |
| Practical no-trace ceiling | `381/471` | `80.89%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Strategy Coverage

- Added `strategy.cancel-pending-order-values`: one pending limit entry is retained, one pending limit entry is cancelled, and the uncancelled fill becomes visible to strategy variables on the next script calculation after broker processing.
- Added `strategy.currency-conversion-values`: `strategy.convert_to_account` and `strategy.convert_to_symbol` with deterministic `USD/JPY` request data and a JPY strategy account currency.

## Practical Ceiling

- Remaining raw uncovered members: `108`.
- Remaining no-trace-verifiable members: `90`.
- The remaining no-trace-verifiable set is mostly strategy risk/drawdown edge cases, visual object deletion/all edge cases, and uncovered language semantics that need dedicated realtime or object-history oracles.

## Gate Status

- Value-vector gate: `346` cases, `343` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
