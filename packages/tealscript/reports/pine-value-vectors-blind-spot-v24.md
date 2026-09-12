> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V24

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-visual-table-v3.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v23.md`

## Summary

- Independent-oracle value-vector cases: `344`.
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
| Raw builtin audit denominator | `378/489` | `77.30%` | Up from `367/489`; this batch adds `bgcolor`/`barcolor` and remaining table setter coverage. |
| Practical no-trace ceiling | `378/471` | `80.25%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Coverage

- Added `visual.bgcolor-barcolor-metadata-values`: `bgcolor` and `barcolor` color payloads plus editable, show_last, display, and force_overlay metadata.
- Added `drawing.table-cell-setter-clear-values`: `table.clear`, `table.cell_set_width`, `table.cell_set_height`, `table.cell_set_text_halign`, `table.cell_set_text_valign`, `table.cell_set_text_size`, `table.cell_set_text_font_family`, `table.cell_set_text_formatting`, and `table.cell_set_tooltip`.
- The `barcolor` oracle asserts color through plot payload metadata; its value series remains `na` by output contract.

## Practical Ceiling

- Remaining raw uncovered members: `111`.
- Remaining no-trace-verifiable members: `93`.
- The remaining no-trace-verifiable set is now mostly deeper strategy/order/risk edge cases, deletion/all edge cases for visual objects, and uncovered language semantics.

## Gate Status

- Value-vector gate: `344` cases, `341` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
