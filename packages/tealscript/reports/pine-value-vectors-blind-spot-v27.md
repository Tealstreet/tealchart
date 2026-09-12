> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V27

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-order-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v26.md`

## Summary

- Independent-oracle value-vector cases: `353`.
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
| Raw builtin audit denominator | `400/489` | `81.80%` | Up from `389/489`; this batch adds alert/log payloads and strategy order-management coverage. |
| Practical no-trace ceiling | `400/471` | `84.93%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Output And Strategy Coverage

- Added alert payload assertions for `alertcondition`, `alert`, `alert.freq_all`, `alert.freq_once_per_bar`, and `alert.freq_once_per_bar_close`.
- Added log payload assertions for `log.info`, `log.warning`, and `log.error`.
- Added strategy order-management vectors for `strategy.order`, `strategy.close_all`, and `strategy.cancel_all`.
- The new alert/log vectors compare concrete event fields, rendered condition values, frequencies, bar indexes, times, and messages, not only plot carrier values.

## Practical Ceiling

- Remaining raw uncovered members: `89`.
- Remaining no-trace-verifiable members: `71`.
- The remaining no-trace-verifiable set is still mostly strategy risk/drawdown edge cases, less-used visual metadata, and the historical/realtime language boundary around `varip`.

## Gate Status

- Value-vector gate: `353` cases, `350` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
