> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V22

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-drawing-payload-v2.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v21.md`

## Summary

- Independent-oracle value-vector cases: `340`.
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
| Raw builtin audit denominator | `359/489` | `73.42%` | Up from `342/489`; this batch adds table and polyline payload coverage. |
| Practical no-trace ceiling | `359/471` | `76.22%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## Harness Change

- The value-vector runner now supports `expectedDrawings` alongside plot `expectedOutputs`.
- Drawing comparison normalizes generated ids and `scriptId`, then checks the expected payload fields by value.
- This keeps table/polyline coverage in the same independent-oracle harness instead of adding runtime or product surface.

## New Payload Coverage

- Added `drawing.table-payload-values`: `table.new`, `table.delete`, `table.all`, `table.set_position`, `table.set_bgcolor`, `table.set_frame_color`, `table.set_frame_width`, `table.set_border_color`, `table.set_border_width`, `table.cell`, `table.cell_set_text`, `table.cell_set_bgcolor`, `table.cell_set_text_color`, and `table.merge_cells`.
- Added `drawing.polyline-payload-values`: `polyline.new`, `polyline.copy`, `polyline.delete`, and `polyline.all`.
- The table oracle asserts the final table position, dimensions, table styling, two cells, cell styling/text, and merged-cell range.
- The polyline oracle asserts points, curved/closed flags, xloc, line/fill colors, style, width, force_overlay, and that the deleted copy is absent.

## Practical Ceiling

- Remaining raw uncovered members: `130`.
- Remaining no-trace-verifiable members: `112`.
- The remaining set is now concentrated in visual-output plot metadata, deeper strategy/order/risk edge cases, deletion/clear edge cases, and provider/trace-required surfaces.

## Gate Status

- The new drawing payload vectors matched on both the compiled and public paths.
- The run failed only because `strategy.closedtrades-timing-commission-values` unexpectedly passed under the current worktree, which contains uncommitted source changes outside this agent's ownership. That expected-failure entry should be removed in the same commit as the source fix that makes it pass on a clean tree.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` is still listed as expected-red in the checked-in harness, but passed in this dirty-tree run.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
