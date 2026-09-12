> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V28

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-strategy-state-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v27.md`

## Summary

- Independent-oracle value-vector cases: `357`.
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
| Raw builtin audit denominator | `410/489` | `83.84%` | Up from `400/489`; this batch adds deterministic strategy sizing, account, position-name, and trade excursion accessors. |
| Practical no-trace ceiling | `410/471` | `87.05%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Strategy Coverage

- Added `strategy.default_entry_qty` under percent-of-equity sizing.
- Added `strategy.cash`, `strategy.fixed`, and `strategy.percent_of_equity` declaration constants through sizing vectors.
- Added `strategy.account_currency` and `strategy.position_entry_name`.
- Added `strategy.closedtrades.max_runup`, `strategy.closedtrades.max_drawdown`, `strategy.opentrades.max_runup`, and `strategy.opentrades.max_drawdown`.

## Practical Ceiling

- Remaining raw uncovered members: `79`.
- Remaining no-trace-verifiable members: `61`.
- The remaining no-trace-verifiable set is now mostly strategy risk edge cases, lower-priority visual residues, and the historical/realtime language boundary around `varip`.

## Gate Status

- Value-vector gate: `357` cases, `354` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
