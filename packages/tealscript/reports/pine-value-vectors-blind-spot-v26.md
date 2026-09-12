> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V26

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-drawing-delete-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v25.md`

## Summary

- Independent-oracle value-vector cases: `347`.
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
| Raw builtin audit denominator | `389/489` | `79.55%` | Up from `381/489`; this batch adds deletion and `*.all` drawing coverage. |
| Practical no-trace ceiling | `389/471` | `82.59%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Drawing Coverage

- Added `drawing.delete-all-values`: `line.delete`, `line.all`, `label.delete`, `label.all`, `box.delete`, `box.all`, `linefill.delete`, and `linefill.all`.
- The oracle asserts both live-handle counts through plots and final retained drawing payloads.

## Practical Ceiling

- Remaining raw uncovered members: `100`.
- Remaining no-trace-verifiable members: `82`.
- The remaining no-trace-verifiable set is mostly strategy risk/drawdown edge cases, less-used visual metadata, and the historical/realtime language boundary around `varip`.

## Gate Status

- Value-vector gate: `347` cases, `344` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
