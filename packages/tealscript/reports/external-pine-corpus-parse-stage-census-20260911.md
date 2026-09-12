# External Pine Corpus Parse-Stage Census

Measured: 2026-09-11
Code under test: `a75ebd88d7e060fbdb5ad8d773f4eef15778cf92`
Worktree: `tealscript-parser`

## Purpose

This replaces stale row-level parser dispatch lists with a direct parse-stage census at current HEAD. The measurement parses every cached Pine source from the v5 and v6 external corpora, buckets current parse failures by source shape, and separates likely TealScript parser gaps from invalid Pine or corpus artifacts by each script's declared version.

This pass is parse-stage only. It does not run semantic checking, codegen, runtime, or output comparison.

## Inputs

| Corpus | Cache | Sources measured |
| --- | --- | ---: |
| v5 | `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/sources` | 1000 |
| v6 | `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/sources` | 1000 |

Note: the v6 cache contains one uppercase `.PINE` filename (`0622__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__PIEKI_ALGO.PINE`). The census uses a case-insensitive `.pine` extension filter so that source is included.

## Summary

| Corpus | Total | Parsed | Parse failures |
| --- | ---: | ---: | ---: |
| v5 | 1000 | 989 | 11 |
| v6 | 1000 | 988 | 12 |
| Total | 2000 | 1977 | 23 |

Current parser-owned queue from this census:

| Bucket | Rows | Verdict |
| --- | ---: | --- |
| Parenthesized switch discriminant in function body | 2 | Parser gap candidate |

All other current parse failures are invalid Pine or corpus artifacts for their declared version.

## Buckets

| Bucket | Rows | Corpora | Verdict |
| --- | ---: | --- | --- |
| Paid-version placeholder `...` followed by prose | 8 | v5 | Corpus artifact |
| JavaScript semicolon statement separators | 3 | v6 | Invalid Pine |
| Pine `return` statement | 2 | v5, v6 | Invalid Pine |
| Prompt/prose before source header | 2 | v6 | Corpus artifact |
| Full-width space U+3000 in layout/comment indentation | 2 | v6 | Invalid Pine / byte artifact |
| Parenthesized switch discriminant in function body | 2 | v5, v6 | Parser gap candidate |
| Shorthand import path `import notlib as n` | 1 | v5 | Invalid Pine syntax |
| JavaScript inline callback passed to `array.sort` | 1 | v6 | Invalid Pine |
| JavaScript `then` after `if` | 1 | v6 | Invalid Pine |
| JavaScript `||` operator | 1 | v6 | Invalid Pine |

## Parser-Owned Queue

### Parenthesized switch discriminant in function body

Rows:

| Corpus | Source | Declared | Location | First failing source line |
| --- | --- | ---: | --- | --- |
| v5 | `0989__SynergOps-AlgoTrading__atr-bands.pine` | v5 | 93:9 | `"Top Right" => posOut := position.top_right` |
| v6 | `0397__itmakesyousick-HTF-Candles-Pivots__v14.0.pine` | v5 | 282:9 | `option_candle_label1 => str.format(f_price, _chg)` |

Observed shape:

```pine
getTablePosition(posIn) =>
    posOut = position.bottom_right
    switch (posIn)
        "Top Right" => posOut := position.top_right
```

Reduced parser checks:

| Snippet | Result |
| --- | --- |
| `switch (posIn)` with value arms | Fails at first arm |
| `switch posIn` with the same value arms | Parses |
| `switch posIn` with expression consequents | Parses |

Assessment: likely parser-owned. The parser already accepts the same switch arms and consequents when the discriminant is unparenthesized, and Pine expressions generally allow parenthesized subexpressions in expression positions. Before changing grammar, this bucket should still get the same TradingView-validity check used elsewhere in the parity work, because the failure is specifically `switch (expr)` notation rather than switch arms.

## Invalid Or Artifact Rows

### Paid-version placeholders

Rows:

`0796`, `0798`, `0880`, `0894`, `0895`, `0897`, `0916`, `0936`

All eight fail at the literal placeholder line:

```text
...
The rest of this Pine script is part of the paid version. Visit the website for more info.
```

Verdict: corpus artifact, not Pine source.

### JavaScript semicolon statement separators

Rows:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0845__raybird-pine-trading-strategies__TnSovereignScalpingProV6.pine` | v6 | 60:13 | `var os=0; var int tx=na; var int bx=na` |
| v6 | `0883__raybird-pine-trading-strategies__TnSovereignGapFillOpeningRangeV6.pine` | v6 | 67:15 | `orHigh:=na; orLow:=na` |
| v6 | `0912__raybird-pine-trading-strategies__TnSovereignHFTEngineV6.pine` | v6 | 60:19 | `atr14 = ta.atr(14); atr50 = ta.atr(50)` |

Verdict: invalid Pine. The current diagnostic correctly says Pine statements are separated by new lines or supported comma chains, not semicolons.

### Pine `return` statement

Rows:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v5 | `0601__casoon-pine-scripts__RTAAdvanced.pine` | v6 | 2342:9 | `return` |
| v6 | `0628__alboogycOdR-dev-projects__DanielM_SnR_Optimized.pine` | v5 | 82:9 | `return` |

Verdict: invalid Pine. Pine functions return the value of their last expression; there is no `return` statement.

### Prompt/prose before Pine source

Rows:

| Corpus | Source | Declared by scanner | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0188__trsdn-meta-strategy__ai-rsi.pine` | v5 | 1:55 | `You are a professional PineScript version=6 developer.` |
| v6 | `0189__trsdn-meta-strategy__ai-macd.pine` | v5 | 1:55 | `You are a professional PineScript version=6 developer.` |

Verdict: corpus artifact. These files contain natural-language prompt text before an embedded `//@version=5` script starting at line 37, so line 1 is not Pine source.

### Full-width space U+3000

Rows:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0461__deepentropy-lightweight-charts-indicators__Realtime-Footprint.pine` | v5 | 241:5 | full-width spaces before a comment |
| v6 | `0562__deepentropy-oakscriptJS__Realtime-Footprint.pine` | v5 | 241:5 | full-width spaces before a comment |

Verdict: invalid Pine / byte artifact. The current diagnostic names `U+3000 IDEOGRAPHIC SPACE` and distinguishes it from tolerated NBSP.

### Shorthand import path

Row:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v5 | `0927__ferranbt-pinecone__not_a_library.pine` | v5 | 4:15 | `import notlib as n` |

Verdict: invalid Pine syntax for TradingView import declarations. TealScript parses full Pine imports such as `import User/Lib/1 as n`; this row uses a single identifier path from a negative fixture whose comment expects an imported-library error, not TradingView import syntax.

### JavaScript inline callback passed to `array.sort`

Row:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0496__alboogycOdR-dev-projects__v0.7.0-0801DST_ALERTS-V0.7.0.pine` | v5 | 409:42 | `array.sort(aboveMidnightIndices, function(a, b) sortComparator(...))` |

Verdict: invalid Pine. Pine has named `=>` function declarations, not JavaScript-style inline callback functions, and the `array.sort` forms supported by Pine do not take callback comparators.

### JavaScript `then` after `if`

Row:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0560__shevateshubham-tradingbot__smc_connector.pine` | v5 | 237:25 | `if not na(bsl_line) then line.delete(bsl_line)` |

Verdict: invalid Pine. Pine `if` blocks use the next indented line; they do not use `then`.

### JavaScript `||` operator

Row:

| Corpus | Source | Declared | Location | Source line |
| --- | --- | ---: | --- | --- |
| v6 | `0910__raybird-pine-trading-strategies__TnSovereignReversalEngineV6.pine` | v6 | 67:33 | `window_range / (path_length || 1)` |

Verdict: invalid Pine. Pine uses word operators such as `or`, not JavaScript `||`.

## Measurement Notes

The census was run by importing `parse` from `packages/tealscript/src/parser` and reading every case-insensitive `.pine` file in the two cache directories. For each parse failure, the script recorded corpus, filename, declared `//@version`, parser location, first diagnostic line, and the failing source line.

No grammar files were changed for this report, so no parser regeneration was required.
