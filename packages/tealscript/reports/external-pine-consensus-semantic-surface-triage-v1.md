# External Pine Consensus Semantic Surface Triage v1

Generated from `tealscript-parser` after fetching `origin/tealscript-corpus`.

Inputs:

- `external-pine-consensus-vector-crosscheck-v1.{md,json}` from `origin/tealscript-corpus`
  - crosscheck measured commit: `41f4ad2d387da5e46a0cc2d03860f0dd6e249d8b`
  - input full consensus measured commit: `0a5c87fe05b6542616b6331bab7956a79beb38a0`
- `external-pine-consensus-full-v1.md`
- Existing local corroboration:
  - `external-pine-corpus-v7-semantic-stage-census-20260911.md`
  - `pine-corpus-invalid-clusters-v1.json`
  - `pine-v6-accepted-surface-inversion-v1.md`

Scope: the `123` rows parked as `semantic-surface-owned-elsewhere`.

## Summary

No confirmed TealScript semantic acceptance defect was found in this parked set.

| Verdict | Rows | Meaning |
| --- | ---: | --- |
| a | 101 | TealScript correctly refuses invalid Pine; the external engine ran the source because it is semantically loose. |
| a, separate-surface overlap | 9 | Correct refusal by Pine qualifier rules, but overlaps the separately owned qualifier-enforcement measurement. Do not rework here. |
| b | 0 | No confirmed case where TealScript refuses Pine that TradingView accepts. |
| c | 0 | This parked set is made of TealScript semantic refusals, so it did not expose missing diagnostics. |
| evidence-bound | 13 | Function/value duplicate-name collisions need TradingView compiler evidence before they can honestly be called invalid or ours. |

Mass by cause: the largest three confirmed-invalid buckets are miscellaneous documented refusals (`33`), implicit float-to-int assignment (`21`), and `linewidth` placed inside `color.new()` (`16`). Together they account for `70 / 123` rows and all are correct refusals.

## Ranked Causes

| Cause | Rows | Verdict | Notes |
| --- | ---: | --- | --- |
| Miscellaneous documented semantic refusals | 33 | a | Mixed invalid argument, invalid value, missing identifier, collection/template mismatch, domain, and arity errors. Representative examples: `ta.highest()` length passed a string; `hline(alpha=...)`; `str.length()` source passed a float; `strategy.entry(when=...)` in v6; `runtime.log`; invalid `table.set_position(position.bad)`; `request.footprint()` with too few args; `hline()` passed `chart.point`/matrix values. These are all weaker-external-engine tolerance, not evidence that Pine accepts the source. |
| Implicit float-to-int assignment | 21 | a | Declared v5/v6 sources assign float results into `int` variables. Pine does not silently round floats into ints; use `int(...)` or declare `float`. This matches the existing diagnostic family. |
| `linewidth` inside `color.new()` | 16 | a | `color.new()` documents color/transparency. `linewidth` belongs on `plot()`, `hline()`, and drawing calls, not inside the color expression. The external engines tolerate a JavaScript-style extra property. |
| Duplicate declaration / function-value duplicate name | 13 | evidence-bound | Examples include `dirty(float ...) => ...` followed by `dirty = dirty(...)`, `psar(...) => ...` followed by `psar = psar(...)`, and similar `ma`/`sar`/`buyVolume` rows. The v7 semantic census deliberately left this exact function/value namespace shape unclassified because published namespace duplicate rows have existed elsewhere. Do not classify as invalid or ours without TradingView compiler evidence. |
| Series-to-simple UDF parameter | 7 | a, separate-surface overlap | Passing a series value into a UDF parameter declared `simple` is a qualifier refusal. This overlaps the separately measured 84-parameter qualifier-enforcement surface, so this report does not duplicate that work. |
| Duplicate `color` argument for `plot()` | 7 | a | A Pine parameter can be supplied once. These rows bind `color` both positionally/named or more than once. |
| v6 numeric expression used as bool | 7 | a | All rows in this bucket declare Pine v6. v3-v5 compatibility does not apply; v6 requires an explicit comparison or `bool(...)`. |
| `strategy.exit()` trailing stop without `trail_offset` | 5 | a | Pine trailing exits require `trail_offset` with `trail_price`/`trail_points`. External execution is loose here. |
| One-argument `matrix.sum()` aggregate form | 5 | a | Current committed signature and existing invalid-cluster report treat `matrix.sum(id1, id2)` as binary matrix addition, not a one-argument collection aggregate. The v7 census already classified this shape as invalid Pine absent contrary compiler evidence. |
| Untyped declaration initialized with `na` | 3 | a | Declared v5/v6 rows. Untyped `x = na` is invalid from v4 onward; add an explicit type. |
| v6 bool initialized with `na` | 2 | a | Declared v6 rows. Pine v6 bool values cannot be `na`; this is a version-rule refusal. |
| `alertcondition()` series message | 2 | a, separate-surface overlap | `alertcondition()` title/message require const strings. Correct refusal, but qualifier-owned and not reworked here. |
| Duplicate `transp` argument for `fill()` | 2 | a | A Pine parameter can be supplied once. Correct duplicate-argument refusal. |

## Miscellaneous 33 Split

The `tealscript-semantic-other-refusal` bucket is not one root cause. Its mass is spread across small, conventional invalid-Pine shapes:

- Unknown identifiers: `buy`, `emaFast`, `cleanTicker`.
- Unknown or removed arguments: `hline(alpha=...)`, `label.new(bgcolor=...)`, `strategy(contract_size=...)`, `strategy.entry(when=...)`, `strategy.close_all(when=...)`, generic `input(..., step=...)`, `table.cell(text_wrap=...)`.
- Wrong argument types: `box.new(top=bool)`, `ta.highest(length=string)`, `str.length(source=float)`, `time_close(session=int)`, `hline(price=chart.point|matrix<int>)`.
- Collection/type mismatch: float into int array, string into float matrix, `matrix<float>` assigned to `matrix<int>`, collection element templates missing for `array<map>` / `array<matrix>`, incompatible UDT array element writes.
- Invalid enum/domain values: `table.set_position(position.bad)`, `plot.style_dashed`, `input.float()` default below `minval`, `strategy.risk.max_cons_loss_days()` count not positive.
- Arity/unknown member: `request.footprint()` missing required arguments, `runtime.log`.

These line up with Pine's documented argument, type, version, and domain rules. The external consensus signal is weak here because PineTS/Pine-A-Script run many semantically invalid scripts.

## High-Risk Checks

- `matrix.sum()` was checked against the existing accepted-surface and invalid-cluster reports. The one-argument examples are synthetic compatibility fixtures (`supported_matrix_sum.pine`, `matrix_sum.pine`) rather than published TradingView evidence. Keep the current refusal unless compiler evidence says TradingView accepts unary aggregate `matrix.sum(id)`.
- `table.cell(text_wrap=...)` is the same shape as the v7 census `Nonexistent table text_wrap API` bucket. The committed reference includes box text wrapping (`box.set_text_wrap`), not `table.cell(text_wrap=...)` or `table.cell_set_text_wrap(...)`.
- Duplicate function/value names are intentionally not collapsed into invalid. The evidence is not strong enough from docs or external JavaScript execution alone. They should remain on the compile-evidence path.

## Outcome

The parked semantic-surface set is not a new fix queue.

Actionable follow-up:

- Preserve the existing qualifier measurement ownership for the 9 overlap rows.
- Add the 13 duplicate function/value namespace rows to the compile-evidence queue if they are not already covered by a paste batch.
- No engine behavior change is justified by this triage report.
