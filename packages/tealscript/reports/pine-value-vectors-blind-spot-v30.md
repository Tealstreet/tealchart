> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V30

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-percent-v3.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v29.md`

## Summary

- Independent-oracle value-vector cases: `360`.
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
| Raw builtin audit denominator | `431/489` | `88.14%` | Up from `426/489`; this batch adds passing strategy trade-percent accessors and variables. |
| Practical no-trace ceiling | `431/471` | `91.51%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Strategy Percent Coverage

- Added passing vectors for `strategy.avg_trade_percent`, `strategy.avg_winning_trade_percent`, `strategy.avg_losing_trade_percent`, `strategy.openprofit_percent`, and `strategy.closedtrades.profit_percent`.
- Corrected the oracle for `strategy.openprofit_percent`: with the open short trade, the expected value is `6 / 318 * 100`; bars with no open trade are `na` except the initial no-profit state.

## New Expected Defect

- Added `strategy.aggregate-percent-contract-values` to the expected-defect list.
- The failing fields are `strategy.netprofit_percent`, `strategy.grossprofit_percent`, `strategy.grossloss_percent`, `strategy.openprofit_percent` in aggregate form, plus `strategy.max_contracts_held_all`, `strategy.max_contracts_held_long`, and `strategy.max_contracts_held_short`.
- Both compiled/public paths currently emit zeros for that aggregate/max-contract vector even after closed trades and open exposure.

## Practical Ceiling

- Remaining raw uncovered members: `58`.
- Remaining no-trace-verifiable members: `40`.
- The remaining no-trace-verifiable set is now mostly the new strategy aggregate/max-contract defect, strategy risk edge cases, low-use visual residues, and the historical/realtime language boundary around `varip`.

## Gate Status

- Value-vector gate: `360` cases, `356` compiled/public matches, `4` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
- `strategy.aggregate-percent-contract-values` remains a strategy aggregate/max-contract value defect.
