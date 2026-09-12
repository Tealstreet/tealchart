> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Remaining Semantic Audit v1

This report covers the remaining semantic causes visible in the fixed-corpus
rerun. Verdicts use the pinned source files and Pine v6 declaration/scope
rules; no source code is changed here.

## Verdict Summary

| Cause | Rows | TealScript gaps | Invalid Pine |
| --- | ---: | ---: | ---: |
| `method-receiver-type` | 2 | 2 | 0 |
| `library-export` | 2 | 0 | 2 |
| `invalid-field-default` | 1 | 1 | 0 |
| `tuple-shape-mismatch` | 1 | 1 | 0 |
| `unknown-assignment-target` | 2 | 0 | 2 |
| `unknown-identifier` | 9 | 1 | 8 |

## Valid Pine Gaps

| Row | Pinned construct | Why Pine accepts it |
| --- | --- | --- |
| `0111` | `Gap` method calls `_box.delete()` where `_box` is a `box` | `box.delete(id)` is a v6 drawing builtin and method syntax binds the receiver |
| `0120` | `pivotGraphic` method calls `graphic.pivotLine.delete()` and `graphic.pivotLabel.delete()` | UDT fields retain their declared `line` and `label` IDs, whose delete methods are valid |
| `0271` | `LogLevel level = LogLevel.info` in `type LogEntry` | Enum members are compile-time values and are valid UDT field defaults |
| `0476` | `macd() => [macdLine, signalLine]` followed by `[macdLine, signalLine] = macd()` | The function and destructuring declaration both have two tuple elements; the reported three-value arm is not present in the pinned source |
| `0485` | `pair_ticker = na(string)` | `string(na)` is the v6 cast form for a typed `na` value; the checker misreports `string` as an identifier |

These five rows are direct implementation repros for 6ls4dx.

## Invalid Pine Rows

| Row | Construct | Verdict evidence |
| --- | --- | --- |
| `0211` | `export adl(src_high = high, ...)` | Exported library parameters must declare a type in v6; this library omits all parameter types |
| `0339` | `export calculate_ema(length) =>` | Exported library parameter `length` has no type declaration, which v6 forbids |
| `0170`, `0196` | `z_B := ...` before `var chart.point z_B = ...` | Pine variables are available only after declaration; the assignment precedes the declaration |
| `0088` | `missingArg` passed to `unresolved()` without declaration | The identifier has no declaration or builtin definition |
| `0129` | `string_float` used in a function arm before its later declaration | The map identifier is declared after the use and is not a forward reference |
| `0149` | `branchOnly` read after the conditional block that declares it | Local block scope does not escape into the outer scope |
| `0336` | `enabled` in the body of a commented-out function signature | The comment does not declare a parameter or variable |
| `0341` | `ce_l` in a label expression | The source declares `ce_l1` through `ce_l5`, but never declares `ce_l` |
| `0483` | `isNewDay[1]` inside the initializer of `isNewDay` | A variable cannot reference itself before its declaration is established |
| `0490` | `weekly_wick_high` used outside the local calculation that defines it | The identifier is not declared in the global scope where it is read |
| `0526` | `if enterLong` with no declaration | The strategy contains no declaration for `enterLong` |

Reference: [TradingView v6 variable declarations](https://www.tradingview.com/pine-script-docs/language/variable-declarations/), [libraries](https://www.tradingview.com/pine-script-docs/concepts/libraries/), and [v6 language reference](https://www.tradingview.com/pine-script-reference/v6/).
