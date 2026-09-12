> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V21

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-drawing-metadata-v2.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v20.md`

## Summary

- Independent-oracle value-vector cases: `338`.
- Context-sensitive cases run under a second chart context: `64`.
- Changed and should have: `28`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects or trace-required surfaces tracked by id: `4` in the checked-in expectation list.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `342/489` | `69.94%` | Up from `314/489`; this batch adds drawing metadata getter/setter coverage. |
| Practical no-trace ceiling | `342/471` | `72.61%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Drawing Metadata Coverage

- Added `drawing.label-style-metadata-values`: `label.set_point`, `label.set_xloc`, `label.set_yloc`, `label.set_style`, `label.set_color`, `label.set_textcolor`, `label.set_size`, `label.set_tooltip`, and the corresponding documented getters.
- Added `drawing.linefill-color-copy-values`: `linefill.set_color`, `linefill.get_color`, and `linefill.copy`.
- Added `drawing.box-style-text-values`: `box.set_bgcolor`, `box.set_border_color`, `box.set_text`, `box.set_text_halign`, `box.set_text_valign`, and the corresponding documented getters.
- Color assertions use concrete `color.r/g/b()` channel values rather than object equality, so a color regression remains observable as a numeric value mismatch.

## Practical Ceiling

- Remaining raw uncovered members: `147`.
- Remaining no-trace-verifiable members: `129`.
- The remaining set is still dominated by locally-testable table, polyline, visual-output metadata, and strategy/order/risk state.

## Gate Status

- The new drawing metadata vectors matched on both the compiled and public paths.
- The run failed only because `strategy.closedtrades-timing-commission-values` unexpectedly passed under the current worktree, which contains uncommitted source changes outside this agent's ownership. That expected-failure entry should be removed in the same commit as the source fix that makes it pass on a clean tree.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` is still listed as expected-red in the checked-in harness, but passed in this dirty-tree run.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
