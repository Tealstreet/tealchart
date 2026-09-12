> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V20

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-drawing-state-v1.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v19.md`

## Summary

- Independent-oracle value-vector cases: `335`.
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
| Raw builtin audit denominator | `314/489` | `64.21%` | Up from `295/489`; this batch adds drawing mutation and copy coverage. |
| Practical no-trace ceiling | `314/471` | `66.67%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## New Drawing Coverage

- Added `drawing.line-mutation-copy-values`: `line.copy`, `line.set_x1`, `line.set_y1`, `line.set_x2`, `line.set_y2`, `line.set_xy1`, and `line.set_xy2`.
- Added `drawing.box-mutation-copy-values`: `box.copy`, `box.set_left`, `box.set_top`, `box.set_right`, `box.set_bottom`, `box.set_lefttop`, and `box.set_rightbottom`.
- Added `drawing.label-mutation-copy-values`: `label.copy`, `label.set_x`, `label.set_y`, `label.set_xy`, and `label.set_text`.
- Each vector asserts the copied drawing keeps the pre-mutation coordinates or text while the source drawing reflects later mutation, using documented getters as the oracle surface.

## Practical Ceiling

- Remaining raw uncovered members: `175`.
- Remaining no-trace-verifiable members: `157`.
- The remaining set is still dominated by locally-testable visual/drawing/table state and strategy/order/risk state, not by provider-only surfaces.

## Gate Status

- The new drawing vectors matched on both the compiled and public paths.
- The run failed only because `strategy.closedtrades-timing-commission-values` unexpectedly passed under the current worktree, which contains uncommitted source changes outside this agent's ownership. That expected-failure entry should be removed in the same commit as the source fix that makes it pass on a clean tree.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.closedtrades-timing-commission-values` is still listed as expected-red in the checked-in harness, but passed in this dirty-tree run.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
