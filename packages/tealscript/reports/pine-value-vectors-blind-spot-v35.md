> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V35

Source reports:

- `/tmp/pine-value-vectors-blind-spot-v35.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v34.md`

Authoritative value-vector figures are indexed in
`pine-value-vectors-index-v1.md`. Earlier report versions are historical and
their headline counts are superseded.

## Summary

- Independent-oracle value-vector cases: `367`.
- Context-sensitive cases run under a second chart context: `64`.
- Expected engine defects or trace-required surfaces tracked by id: `6`.
- New covered members in this batch: `4`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `467/489` | `95.50%` | Adds line presentation setter payload coverage. |
| Practical no-trace ceiling | `467/471` | `99.15%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `22/23` | `95.65%` | Realtime `varip` replacement semantics remains trace-shaped; this batch stayed on builtin member coverage. |

## Remaining Surface Shape

- Remaining raw uncovered members: `22`.
- Remaining no-trace-verifiable members: `4`.
- Practical no-trace ceiling remains `471/489`: `18` members currently require TradingView traces or host/provider exactness.
- The remaining locally-verifiable surface is now the documented line presentation getter set: `line.get_color()`, `line.get_extend()`, `line.get_style()`, and `line.get_width()`.
- The raw remaining set is otherwise dominated by trace/provider-exact surfaces. The practical local ceiling is effectively blocked on the four missing line getters.

## New Coverage

- `drawing.line-style-payload-values` covers `line.set_color()`, `line.set_extend()`, `line.set_style()`, and `line.set_width()`.
- The vector creates one persistent line, mutates its presentation fields, then asserts the final drawing payload: concrete color, extend mode, style, and width.
- `drawing.line-style-getter-values` remains expected-red because the corresponding documented getters are not implemented.

## Gate Status

- Value-vector gate: `367` cases, `361` compiled/public matches, `6` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `drawing.line-style-getter-values` remains a missing documented line getter defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
- `strategy.aggregate-percent-contract-values` remains a strategy aggregate/max-contract value defect.
- `strategy.aggregate-runup-percent-values` remains a strategy aggregate percent excursion defect.
