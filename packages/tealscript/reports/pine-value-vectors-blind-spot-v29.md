> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V29

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-context-metadata-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v28.md`

## Summary

- Independent-oracle value-vector cases: `358`.
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
| Raw builtin audit denominator | `426/489` | `87.12%` | Up from `410/489`; this batch adds host-supplied syminfo metadata and `timeframe.main_period`. |
| Practical no-trace ceiling | `426/471` | `90.45%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Context Coverage

- Added host-supplied metadata vectors for `syminfo.main_tickerid`, `syminfo.exchange`, `syminfo.current_contract`, `syminfo.employees`, `syminfo.shareholders`, `syminfo.shares_outstanding_float`, `syminfo.shares_outstanding_total`, `syminfo.target_price_date`, `syminfo.target_price_average`, `syminfo.target_price_estimates`, `syminfo.target_price_high`, `syminfo.target_price_low`, `syminfo.target_price_median`, `syminfo.expiration_date`, `syminfo.isin`, and `syminfo.industry`.
- Added `timeframe.main_period` to the existing timeframe vector.
- The oracle is host metadata supplied through `TealscriptExecutionOptions`; no TradingView traces are needed for these fields.

## Practical Ceiling

- Remaining raw uncovered members: `63`.
- Remaining no-trace-verifiable members: `45`.
- The remaining no-trace-verifiable set is now mostly strategy risk edge cases, low-use visual residues, and the historical/realtime language boundary around `varip`.

## Gate Status

- Value-vector gate: `358` cases, `355` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` failed in dirty parser WIP outside this task: `src/parser/parser.test.ts(1547,14)` and `(1548,14)` index `fn.body` while its type is `Expression | Statement[]`.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
