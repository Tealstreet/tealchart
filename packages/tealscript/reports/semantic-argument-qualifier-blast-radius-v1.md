# Semantic Argument Qualifier Blast Radius v1

Date: 2026-09-12

**Superseded on 2026-09-12 by
`semantic-ta-qualifier-live-reference-correction-v1.md`.** This blast-radius
measurement used an over-broad TA simple-parameter table that generalized the
documented `ta.ema()` requirement across TA parameters whose live reference
`allowedTypeIDs` accept `series int`. The six rows named below hit
`ta.highest`, `ta.lowest`, `ta.correlation`, or `ta.vwma`, all documented as
series-length-capable in the live v5/v6 bundle. They are false refusals, not
intentional acceptance losses. Use the corrected report for current counts.

## Question

The qualifier hole sweep found 84 builtin call-site requirements that exist in
the declaration tables and are already enforced when the same values flow
through UDF parameter inference:

- 73 TA `simple` parameters across 53 `ta.*` builtins.
- 11 `input.*` `defval` parameters requiring `const`.

This report measures the corpus blast radius before landing direct builtin
call-site enforcement. It does not change engine behavior.

The plot title `const string` edge remains a known adjacent scope gap and is
not included in the 84-row denominator.

## Inputs

Baseline accepted rows are the committed corpus reports named in
`packages/tealscript/PINE_CORPUS_BRIEFING.md`:

- v5 daily rerun: 867 accepted rows.
- v6 daily rerun: 787 accepted rows.
- v7 daily rerun: 305 accepted rows.
- v7 size-recovery rerun: 27 accepted rows.

Total currently accepted `produced-output-compiled` rows measured: 1986.

The measured scope is derived from `packages/tealscript/src/semantic/checker.ts`:

- `TA_SIMPLE_PARAMETER_NAMES_BY_CALL`
- `TA_NUMERIC_PARAMETER_NAMES_BY_CALL`
- `INPUT_DEFAULT_TYPE_REQUIREMENTS`

## Method

1. Walk the accepted corpus rows and parse each committed source script.
2. Derive candidate call sites from the semantic checker tables rather than a
   hand-written builtin list.
3. Resolve call names shadow-aware. User-defined functions named like legacy TA
   aliases, such as `vwma` or `median`, are not treated as `ta.*` calls.
4. Flag candidate arguments that statically appear to carry `series`
   qualification.
5. Validate each flagged call site without shipping the builtin diagnostic:
   replace the target argument with a wrapper UDF parameter and run the existing
   checker. Example shape:

   ```pine
   __qual_probe(x) => ta.highest(high, x)
   ```

   Existing UDF qualifier inference already enforces the same requirement, so a
   wrapper diagnostic is a dry-run signal that direct builtin enforcement would
   refuse the call.

Instrument corrections made during the sweep:

- TA parameter extraction was corrected to use the runtime checker tables
  directly.
- Legacy alias resolution was made shadow-aware for user UDF names.
- Bare casts such as `int(x)`, `float(x)`, and `bool(x)` were removed from the
  input-call classifier. Treating them like `input.int()`, `input.float()`, and
  `input.bool()` produced false `input.* defval` candidates.
- CRLF offsets were normalized for source snippets.

## Results

### Cluster Counts

| Cluster | Currently accepted scripts that would newly refuse |
| --- | ---: |
| TA `simple` parameters | 6 |
| `input.* defval` `const` parameters | 0 |
| Union | 6 |

The input cluster has zero corpus exposure on this baseline. A direct checker
probe still showed a real direct-call qualifier gap: `input.int(input.int(10))`
and `input.float(close)` were accepted before enforcement. Earlier apparent
corpus input rows were a classifier artifact from treating ordinary `int()`,
`float()`, and `bool()` casts as input constructors.

### TA Breakdown

| Corpus | Declared Pine version | Scripts |
| --- | --- | ---: |
| v6 corpus | v5 | 5 |
| v7 corpus | v6 | 1 |
| v5 corpus | any | 0 |
| recovery corpus | any | 0 |

By call:

| Call | Scripts |
| --- | ---: |
| `ta.highest` | 3 |
| `ta.lowest` | 1 |
| `ta.correlation` | 1 |
| `ta.vwma` | 1 |

The dry-run found 19 rejecting call sites across those 6 scripts. The blast
radius above is script-level because corpus acceptance rows are script-level.

### Newly Refusing Rows

These are the six currently accepted rows expected to move from
`produced-output-compiled` to semantic refusal when TA-simple builtin
call-site enforcement lands:

| Corpus | Declared version | Source | Trigger |
| --- | --- | --- | --- |
| v6 | v5 | `0416 kantomu/prm STRICT_RSI.pine` | `ta.lowest(..., bars_since_ob + 1)` |
| v6 | v5 | `0425 regalouisei LOMV` | `ta.correlation(..., math.min(frobenius_lookback, bar_index + 1))` |
| v6 | v5 | `0557 tripolskypetr backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` |
| v6 | v5 | `0586 helenananaa fixture weighted_averages_dynamic_length.pine` | `ta.vwma(close, length)` |
| v6 | v5 | `0626 agutinbaigo28 trading-backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` |
| v7 | v6 | `0258 JasonTeixeira NexTransform.pine` | `ta.highest(weighted_source, adaptive_length)` |

## Sample Verdict

The refusing sample was manually inspected. All six counted rows are genuine
series-where-simple cases rather than qualifier over-classification:

| Source | Call shape | Verdict |
| --- | --- | --- |
| `STRICT_RSI.pine` | `ta.lowest(smoothingMA, bars_since_ob + 1)` where `bars_since_ob = ta.barssince(...)` | Genuine series length |
| `langlands-operadic...lomv.pine` | `ta.correlation(close, volume, math.min(frobenius_lookback, bar_index + 1))` | Genuine series length via `bar_index` |
| `feb_2026.pine` / `backtest-kit` | `ta.highest(high, barsSinceEntry)` where `barsSinceEntry = ta.barssince(longEntry)` | Genuine series length |
| `weighted_averages_dynamic_length.pine` | `ta.vwma(close, length)` where `length = bar_index % 2 + 2` | Genuine series length |
| `feb_2026.pine` / second corpus copy | `ta.highest(high, barsSinceEntry)` | Genuine series length |
| `NexTransform.pine` | `ta.highest(weighted_source, adaptive_length)` where `adaptive_length` depends on `ta.atr(14)` | Genuine series length |

The sample also found one useful non-counted over-classification risk:

- `TCV_Regime_Engine_v0.0.2.pine` assigns `fast_len` and `slow_len` from a
  tuple `switch` whose branches are input/const values. A static pass alone
  treated those as series, but the wrapper/UDF dry-run did not reject them.
  They are excluded from the blast-radius count.

## Version Applicability

TradingView's current type-system documentation says qualified types determine
function-call compatibility, and the qualifier hierarchy is:

`const < input < simple < series`

The docs state that a weaker qualifier is accepted where a stronger value is
allowed, but a stronger qualifier is not accepted where a weaker value is
required. The current manual gives the direct TA example:

```pine
series int lengthInput = input.int(20)
ta.ema(close, length = lengthInput) // error: length requires simple int
```

Sources:

- Current type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- v5 type system:
  https://www.tradingview.com/pine-script-docs/v5/language/type-system/

For v5/v6 declared scripts, the TA-simple requirement is documented by the
qualifier hierarchy and by the explicit `ta.ema` length example in the current
manual. The measured affected scripts are declared v5 and v6.

For v4, the manual uses the older "form" vocabulary (`literal`, `const`,
`input`, `simple`, `series`) and describes series propagation and compile-time
overload checking. I did not find an explicit v4 manual statement covering the
exact 73 TA parameters by name during this measurement. That does not affect
the measured corpus blast radius: zero declared-v4 accepted rows were flagged.

Source:

- v4 type system:
  https://www.tradingview.com/pine-script-docs/v4/language/type-system/

For the `input.* defval` cluster, the v5/current input docs say most
`input.*()` parameters require `const` arguments, with documented exceptions
such as `input.source()`'s `defval`. The 11-row cluster excludes
`input.source()`. The measured corpus blast radius is zero.

Sources:

- Current inputs:
  https://www.tradingview.com/pine-script-docs/concepts/inputs/
- v5 inputs:
  https://www.tradingview.com/pine-script-docs/v5/concepts/inputs/

## Conclusion

If direct builtin qualifier enforcement lands against the current corpus
baseline, expect a script-level acceptance drop of 6, all from TA `simple`
parameters. This is a correctness win reported honestly, not an output
regression: the six sampled rows are passing documented-invalid `series`
arguments into `simple` TA parameters.

- 5 declared-v5 scripts.
- 1 declared-v6 script.
- 0 declared-v4 scripts.
- 0 `input.* defval` scripts.

The sampled refusing rows are genuine dynamic/series length arguments, not an
obvious inference regression. The input-defval cluster is a real direct-call
qualifier gap with no current corpus blast radius after correcting the
classifier.
