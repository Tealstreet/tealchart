> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V34

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-blind-spot-v34.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v33.md`

## Summary

- Independent-oracle value-vector cases: `366`.
- Context-sensitive cases run under a second chart context: `64`.
- Expected engine defects or trace-required surfaces tracked by id: `6`.
- New covered members in this batch: `0`.
- New tracked implementation defect: `1`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `463/489` | `94.68%` | No numerator movement; the attempted line presentation vector uncovered missing documented getters. |
| Practical no-trace ceiling | `463/471` | `98.30%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain high-yield; this batch stayed on builtin member coverage. |

## Remaining Surface Shape

- Remaining raw uncovered members: `26`.
- Remaining no-trace-verifiable members: `8`.
- Practical no-trace ceiling remains `471/489`: `18` members currently require TradingView traces or host/provider exactness.
- The remaining raw set is dominated by trace/provider-exact members plus the newly explicit line presentation getter gap.
- The practical local ceiling cannot honestly move past `463/471` until `line.get_color()`, `line.get_extend()`, `line.get_style()`, and `line.get_width()` exist and pass independent-oracle vectors.

## New Finding

- `drawing.line-style-metadata-values` is now a tracked expected defect.
- The documented setters `line.set_color()`, `line.set_extend()`, `line.set_style()`, and `line.set_width()` are accepted, but the corresponding documented getters are not recognized: `line.get_color()`, `line.get_extend()`, `line.get_style()`, and `line.get_width()`.
- The vector asserts concrete color channels, extend/style identity, and width. It currently fails at semantic checking with `unknown-function` diagnostics, so it is not counted as coverage.

## Gate Status

- Value-vector gate: `366` cases, `360` compiled/public matches, `6` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `drawing.line-style-metadata-values` remains a missing documented line getter defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
- `strategy.aggregate-percent-contract-values` remains a strategy aggregate/max-contract value defect.
- `strategy.aggregate-runup-percent-values` remains a strategy aggregate percent excursion defect.
