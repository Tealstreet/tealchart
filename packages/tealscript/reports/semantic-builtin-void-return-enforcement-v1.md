# Semantic Builtin Void Return Enforcement v1

Date: 2026-09-12

## Verdict

The 114-row builtin `void` return cluster from
`semantic-builtin-return-type-audit-v1.md` is fixable as one shared semantic
return-inference path.

The pre-fix blast radius for actual documented `void` returns was zero.

- Current public corpus scripts parsed and semantically accepted before the
  fix: 2,086 of 2,456 rows.
- Current size-recovery scripts parsed and semantically accepted before the
  fix: 34 of 50 rows.
- Accepted scripts consuming a newly enforced `void` return: 0.

The dry-run initially reported three v7 matrix-removal rows, but that was an
instrument classification error: `matrix.remove_row()`, `matrix.remove_col()`,
and `matrix.remove_column()` return row/column arrays, not `void`. Those calls
were removed from the void cluster and given explicit array return inference.

## Version Scope

The newly derived 114-name side-effect cluster is active for declared Pine v5
and newer. TradingView's current and v5 type-system documentation define
`void` as the return type for side-effect functions that return no usable
value, and specifically name plot-family side effects such as `plotshape()`,
`plotchar()`, `plotarrow()`, `plotbar()`, `plotcandle()`, `barcolor()`, and
`bgcolor()` as `void` while `plot()` and `hline()` return usable IDs.

The pre-existing array namespace path is not limited to v5+: array mutators
such as `array.push()` already returned semantic `void` before this 114-name
cluster landed, and they continue to refuse value consumption in declared v4
sources. That v4 refusal is correct for the array mutators, but the earlier
report wording was too broad because it implied every void-return path had the
same v5+ scope.

## Blast Radius Measurement

The dry-run scanner walked these committed corpus inputs and parsed/checked
them with current TealScript before changing behavior:

| Corpus | Rows | Parsed | Semantic-passed |
| --- | ---: | ---: | ---: |
| v5 | 1000 | 990 | 893 |
| v6 | 1000 | 989 | 855 |
| v7 | 456 | 442 | 338 |
| recovery | 50 | 50 | 34 |

It then scanned semantic-passed ASTs for one of the 117 newly enforced
side-effect calls in a consumed value position rather than as a standalone
statement.

Newly refusing rows:

None.

## Implementation Shape

The fix is one shared return-inference path:

- direct builtin names that are documented side effects resolve to semantic
  `void`;
- namespace-form object methods such as `label.delete(id)` and `table.cell(id,
  ...)` consult the same method table;
- receiver-method forms such as `id.set_text(...)`, `matrixId.remove_row(...)`,
  and `tableId.cell(...)` consult the same table by inferred receiver type;
- array mutators and `map.clear()`/`map.put_all()` remain covered by explicit
  `void` inference rather than standing as the only correctly handled siblings.
  The array path is documented and guarded as v4-compatible behavior rather
  than part of the newly scoped v5+ cluster.

## Pattern Note

This is the third semantic sweep to find the same transferable defect shape:
a shared Pine rule implemented for some members and not others, with the
correct siblings making the feature look present.

The three instances so far are:

- `array.percentile_*` missed string-argument type diagnostics while sibling
  numeric builtins already refused strings.
- live-reference-derived direct `ta.*` simple-only parameter slots missed
  qualifier enforcement while UDF inference already carried the same
  requirements. A later correction narrowed the table from an over-broad
  73-slot sweep to 21 v5 pairs and 22 v6+ pairs.
- 114 side-effect builtins missed `void` return inference while array mutators
  and `map.clear()`/`map.put_all()` already refused assignment.

The durable rule is now in `packages/tealscript/CLAUDE.md`: semantic builtin
coverage should be audited by derived declaration-table sweeps, not member spot
checks.

## Sources

- TradingView current type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- TradingView v5 type system:
  https://www.tradingview.com/pine-script-docs/v5/language/type-system/
