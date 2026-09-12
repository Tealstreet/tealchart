# Semantic TA Qualifier Live Reference Correction v1

Date: 2026-09-12

## Verdict

The TA qualifier enforcement table landed from
`semantic-argument-qualifier-enforcement-v1.md` was over-broad.

It generalized TradingView's documented `ta.ema(..., series int length)` error
to the whole TA length surface. The live TradingView v5/v6 reference bundle
does not support that generalization: 35 of the previously enforced TA
parameter pairs are documented as accepting `series int` or `series int/float`.

The fix is to derive the enforced table from per-parameter `allowedTypeIDs`:

| Declared version | Enforced simple-only TA pairs |
| --- | ---: |
| v5 | 21 |
| v6+ | 22 |

The v6+ table is the v5 table plus `ta.rci:length`. The same version-aware
table feeds both direct builtin call diagnostics and UDF parameter qualifier
inference.

## Derived Scope

I loaded the live TradingView reference bundle with the same bundle-loading
method used by `scripts/report-pine-v6-reference-snapshot-integrity.ts`, then
read the `allowedTypeIDs` for the TA pairs that TealScript had been enforcing
as simple-only.

The derived v5 simple-only pairs are:

```text
ta.atr:length
ta.dmi:diLength
ta.dmi:adxSmoothing
ta.ema:length
ta.hma:length
ta.kc:length
ta.kcw:length
ta.linreg:offset
ta.macd:fastlen
ta.macd:slowlen
ta.macd:siglen
ta.percentile_linear_interpolation:percentage
ta.percentile_nearest_rank:percentage
ta.rma:length
ta.rsi:length
ta.sar:start
ta.sar:inc
ta.sar:max
ta.supertrend:atrPeriod
ta.tsi:short_length
ta.tsi:long_length
```

The derived v6 simple-only set adds:

```text
ta.rci:length
```

The pairs that were previously enforced but are documented as accepting series
values in both v5 and v6 are:

```text
ta.alma:length
ta.bb:length
ta.bbw:length
ta.cci:length
ta.cmo:length
ta.correlation:length
ta.cog:length
ta.dev:length
ta.falling:length
ta.highest:length
ta.highestbars:length
ta.linreg:length
ta.lowest:length
ta.lowestbars:length
ta.median:length
ta.mfi:length
ta.mode:length
ta.mom:length
ta.percentile_linear_interpolation:length
ta.percentile_nearest_rank:length
ta.percentrank:length
ta.pivothigh:leftbars
ta.pivothigh:rightbars
ta.pivotlow:leftbars
ta.pivotlow:rightbars
ta.range:length
ta.rising:length
ta.roc:length
ta.sma:length
ta.stdev:length
ta.stoch:length
ta.variance:length
ta.vwma:length
ta.wma:length
ta.wpr:length
```

The following names from the prior table are not live builtins in the bundle
checked here and are not enforced by the corrected table:

```text
ta.adx
ta.covariance
ta.dema
ta.kst
ta.smma
ta.tema
```

`ta.rci` is absent from v5 and present in v6. `ta.sum` is a live v5/v6
builtin, but its removal from the simple-only qualifier table is still correct
because the reference bundle documents its `length` parameter as `series int`.

## Blast Radius Re-Measurement

The previous blast-radius report named six accepted corpus rows as expected
new refusals. Those six were not genuine simple-parameter violations. They hit
documented-series TA length slots:

| Row | Trigger | Correct classification |
| --- | --- | --- |
| `0416 kantomu/prm STRICT_RSI.pine` | `ta.lowest(..., bars_since_ob + 1)` | documented `series int` length |
| `0425 regalouisei LOMV` | `ta.correlation(..., math.min(...))` | documented `series int` length |
| `0557 tripolskypetr backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` | documented `series int` length |
| `0586 helenananaa fixture weighted_averages_dynamic_length.pine` | `ta.vwma(close, length)` | documented `series int` length |
| `0626 agutinbaigo28 trading-backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` | documented `series int` length |
| `0258 JasonTeixeira NexTransform.pine` | `ta.highest(weighted_source, adaptive_length)` | documented `series int` length |

With the corrected table, the committed fast/refusal corpus gates are green:

```text
yarn pine:external-corpus:fast-gate
12 rows, 12 output rows, 12 achievable output rows

yarn pine:external-corpus:refusal-gate
6 rows, 6 expected refusals, 0 output rows
```

The full corpus source cache is not present in this worktree, so this report
does not claim a fresh full-corpus source walk. A diagnostic search over the
committed corpus reports found no existing `qualifier-mismatch` rows for the
corrected live-derived simple-only TA set. The actionable correction is clear:
the previously reported six-row drop was a false-refusal measurement, not an
intentional acceptance decrease.

## Guard Coverage

Added a value vector for a documented-series TA length call:

```pine
//@version=6
indicator("TA SMA series length accepted")
dynamicLength = int(math.max(1, bar_index % 3 + 1))
plot(ta.sma(close, dynamicLength))
```

This vector is discriminating because the pre-correction table rejects it with:

```text
Cannot pass series value to simple parameter 'length' for ta.sma
```

The red proof temporarily restored the old checker table and the vector failed
as an unexpected failure. After the fix, the full value-vector gate passed with
only the existing trace-required expected red:

```json
{
  "cases": 997,
  "compiledMatches": 996,
  "publicPathMatches": 996,
  "failedCases": ["strategy.calc-on-order-fills-values"],
  "expectedFailures": ["strategy.calc-on-order-fills-values"],
  "unexpectedFailures": [],
  "unexpectedPasses": [],
  "invalidExpectedFailureMetadata": [],
  "missingSourceCitations": [],
  "incompleteSourceCitations": [],
  "invalidDiscriminationProofs": []
}
```

Focused checker coverage also asserts that `ta.sma(..., series length)` and
`ta.highest(..., series length)` are accepted while `ta.ema(..., series length)`
still raises the documented simple-parameter diagnostic.

## Instrument Lesson

This was an instrument artifact that shipped. The previous measurement sampled
real corpus calls, but judged them against a rule derived from one documented
`ta.ema()` example rather than from each parameter's `allowedTypeIDs`. The
sample was real; the standard used to classify it was wrong.

This is the same discipline failure family as the earlier consensus plot-count
ceiling, missing syminfo context, output-family under-capture, JavaScript
string-coercion contamination, and input-cast classifier artifact: a surprising
or broad measurement is an instrument suspect before it is a finding.

## Sources

- TradingView type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- TradingView v6 `ta.sma` reference:
  https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma
- TradingView v6 `ta.ema` reference:
  https://www.tradingview.com/pine-script-reference/v6/#fun_ta.ema
