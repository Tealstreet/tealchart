# External Pine Corpus Semantic Type Invariant Coverage — 2026-09-11

Measures how much of the semantic-passing corpus expression surface is independently typed by `checkSemanticTypeInvariants()`. This is a coverage report for the invariant model, not an acceptance report.

Baseline before this widening pass was approximately 45% of semantic-passing expressions: literals, root symbols, core operators, simple calls, and the invariant gate cases. This pass widened the cheap modeled surface to local UDT declarations and field reads, builtin input/color/string/math/TA/time families, collection constructors and scalar helpers, matrix/map helper returns, history references, and collection call-result shapes where the receiver type is locally recoverable.

The model deliberately stays conservative. Unknown expression inputs now keep downstream expressions unknown instead of manufacturing a precise expected type. Collection element types are normalized to element kinds instead of carrying the const/input/series qualifier of the expression used to populate the collection.

## Summary

| Corpus | Total | Parse failed | Semantic failed | Semantic passed | Typed expressions | Total expressions | Coverage | Invariant rows |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v5 | 1000 | 10 | 95 | 895 | 371871 | 628666 | 59.15% | 0 |
| v6 | 999 | 11 | 122 | 866 | 341094 | 583800 | 58.43% | 0 |
| v7 | 456 | 16 | 99 | 341 | 263731 | 462021 | 57.08% | 1 |
| total | 2455 | 37 | 316 | 2102 | 976696 | 1674487 | 58.33% | 1 |

## Expression-Type Coverage

| Expression type | Total | Typed | Unknown | Coverage |
| --- | --- | --- | --- | --- |
| Identifier | 658178 | 313259 | 344919 | 47.59% |
| MemberExpression | 203913 | 41230 | 162683 | 20.22% |
| BinaryExpression | 195530 | 113509 | 82021 | 58.05% |
| CallExpression | 179130 | 115321 | 63809 | 64.38% |
| ConditionalExpression | 34213 | 14512 | 19701 | 42.42% |
| NaExpression | 18668 | 0 | 18668 | 0.00% |
| IndexExpression | 15656 | 12878 | 2778 | 82.26% |
| UnaryExpression | 20190 | 17933 | 2257 | 88.82% |
| SwitchExpression | 790 | 215 | 575 | 27.22% |
| ArrayExpression | 3040 | 2691 | 349 | 88.52% |
| ForStatement | 24 | 0 | 24 | 0.00% |
| WhileStatement | 7 | 0 | 7 | 0.00% |
| NumericLiteral | 190005 | 190005 | 0 | 100.00% |
| StringLiteral | 130655 | 130655 | 0 | 100.00% |
| BooleanLiteral | 18563 | 18563 | 0 | 100.00% |
| ColorLiteral | 5925 | 5925 | 0 | 100.00% |

## Largest Unknown Call Shapes

| Call | Count |
| --- | --- |
| table.cell | 7968 |
| input | 2185 |
| plotshape | 2041 |
| alertcondition | 1844 |
| request.security | 1493 |
| math.max | 1284 |
| line.delete | 1070 |
| strategy.entry | 1022 |
| nz | 1019 |
| math.abs | 825 |
| array.get | 811 |
| strategy.exit | 789 |

## Largest Unknown Member Shapes

| Member | Count |
| --- | --- |
| str.tostring | 9125 |
| table.cell | 7968 |
| input.int | 6495 |
| input.bool | 6430 |
| array.get | 4956 |
| input.float | 3989 |
| size.small | 3416 |
| math.max | 3215 |
| array.push | 2941 |
| array.size | 2856 |
| math.abs | 2412 |
| input.string | 2312 |

## Invariant Issue Samples

| Row | Issues |
| --- | --- |
| 0008__helenananaa-pine-compat-runtime__supported_builtin_array_call_result_reads.pine | constructor_range expected float from documented type rules, got series unknown<br>from_range expected float from documented type rules, got series unknown<br>copy_range expected float from documented type rules, got series unknown<br>slice_range expected float from documented type rules, got series unknown<br>concat_range expected float from documented type rules, got series unknown |

## Top Invariant Issue Messages

| Issue | Count |
| --- | --- |
| concat_median expected float from documented type rules, got series unknown | 1 |
| concat_mode expected int from documented type rules, got series unknown | 1 |
| concat_range expected float from documented type rules, got series unknown | 1 |
| constructor_median expected float from documented type rules, got series unknown | 1 |
| constructor_mode expected int from documented type rules, got series unknown | 1 |
| constructor_range expected float from documented type rules, got series unknown | 1 |
| copy_median expected float from documented type rules, got series unknown | 1 |
| copy_range expected float from documented type rules, got series unknown | 1 |
| empty_call_result_median expected float from documented type rules, got series unknown | 1 |
| empty_call_result_mode expected int from documented type rules, got series unknown | 1 |
| empty_call_result_range expected float from documented type rules, got series unknown | 1 |
| even_negative_int_median expected float from documented type rules, got series unknown | 1 |
| even_positive_int_median expected float from documented type rules, got series unknown | 1 |
| from_median expected float from documented type rules, got series unknown | 1 |
| from_range expected float from documented type rules, got series unknown | 1 |
| non_finite_call_result_median expected float from documented type rules, got series unknown | 1 |
| non_finite_call_result_range expected float from documented type rules, got series unknown | 1 |
| only_na_call_result_median expected float from documented type rules, got series unknown | 1 |
| only_na_call_result_mode expected int from documented type rules, got series unknown | 1 |
| only_na_call_result_range expected float from documented type rules, got series unknown | 1 |

## Cheapest Next Widenings

- The remaining invariant rows are one family: array call-result aggregate/member chains where the checker still reports `series unknown` or qualifier-light collection element values. Solving that cleanly means making call-result receiver typing and collection element qualifier propagation explicit in the checker, not adding more invariant guesses.
- High-frequency output-only calls (`table.cell`, `plotshape`, `alertcondition`, `strategy.*`) are still intentionally unknown because they do not produce useful expression values for root declaration comparisons.
- Generic `input(...)`, `request.security(...)`, and some `nz(...)` shapes remain unknown when their return type depends on an argument the invariant model cannot independently type. That is the right stop line unless the checker exposes more local expression facts.
- Local temporaries and UDF return symbols remain outside comparison because `SemanticCheckResult.symbols` exposes root symbols only. Widening this requires checker result-shape work, so it is expensive and should not be done as an invariant-only pass.
- Namespaced members beyond the modeled builtin families, imported/user methods, and full UDT flow through arrays/maps/matrices remain medium-to-expensive. They need either compiler evidence or broader checker-local type exposure before the invariant model should compare them.

## Boundary

This report counts expressions the invariant model can independently type. A typed expression count does not mean that expression is compared against a checker symbol; root declarations and tuple destructuring remain the primary comparison points. Unknown expressions are skipped, never treated as failures. The residual rows are measurement of the still-expensive collection receiver/element surface, not confirmed acceptance gaps.

