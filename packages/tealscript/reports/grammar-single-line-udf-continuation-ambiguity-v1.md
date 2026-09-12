# Grammar Single-Line UDF Continuation Ambiguity v1

Date: 2026-09-12

## Verdict

Recorded only. No parser change was made.

Review found that `grammar.peggy` no longer classifies a single-line UDF header
such as `f(x) => x` as an assignment statement for the
`startsWithAssignmentStatement` continuation heuristic. A following zero-indent
line beginning with `+` or `-` can therefore attach as a binary continuation
instead of being interpreted as a separate invalid statement.

Both interpretations are invalid Pine for the reported shape, so this is not a
runtime or acceptance-priority defect. It should stay recorded as a parser
ambiguity note unless a future TradingView trace or corpus row shows a valid
Pine script whose meaning depends on this boundary.
