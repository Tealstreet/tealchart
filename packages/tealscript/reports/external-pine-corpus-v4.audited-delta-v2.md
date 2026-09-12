> Superseded by external-pine-corpus-v4.audited-delta-v4.md. Historical measurement only; use the superseding report for current figures.

# V4 Audited Delta V2: Post-C-Row Fix Rerun

This report follows `external-pine-corpus-v4.remaining-gap-inventory-v1.md`. It reruns the unchanged 649-row no-timeout view after source commits `53ad02740b` (official alias fallback) and `d330df7ec2` (typed UDT `na` method receivers), using the registry-enabled runner from `3ddb1222fa`.

## Comparable Headline

The same post-audit eligible denominator is used throughout: **558 rows**. The historical audited baseline and the preceding registry-enabled result remain included for a direct comparison.

| Measure | Audited baseline | Registry rerun before C fixes | Rerun after C fixes | Delta from prior |
| --- | ---: | ---: | ---: | ---: |
| Supported | 512 | 518 | 527 | +9 |
| TealScript gap | 46 | 40 | 31 | -9 |
| Achievable denominator | 558 | 558 | 558 | 0 |
| Parity | `512 / 558` (91.76%) | `518 / 558` (92.83%) | `527 / 558` (94.44%) | +1.61 pp |

Full audited buckets after the fixes are `527 supported / 31 TealScript gap / 61 invalid Pine / 20 unsupported by design / 11 corpus hygiene`, totaling 650 rows. The timeout row `0254` remains an execute-stage gap in the 31 and remains in the 650-row universe; it is excluded only from the running process to prevent the classifier from stalling.

## Rows Changed

| Row | Before | After |
| --- | --- | --- |
| `sources/0069__regalouisei-collect-tradingview__asset-rotation-system-investorunknown.pine` | `semantic`: `64:11: unknown-function: Unknown library function: ta.rsi` | `produced-output-compiled` |
| `sources/0128__helenananaa-pine-compat-runtime__user_type_non_scalar_typed_na_history.pine` | `output` silence; hidden compiled `No local method overload matched retain for receiver number` | `produced-output-compiled` |
| `sources/0202__regalouisei-collect-tradingview__strategic-trend-filter.pine` | `semantic`: `29:7: unknown-function: Unknown library function: ta.correlation` | `produced-output-compiled` |
| `sources/0226__deepentropy-oakscriptJS__SuperTrend-Relative-Volume-Kernel-Optimized-.pine` | `semantic`: `79:16: unknown-function: Unknown library function: ta.crossover` | `produced-output-compiled` |
| `sources/0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine` | `semantic`: `60:39: unknown-function: Unknown function: ta.requestVolumeDelta` | `produced-output-compiled` |
| `sources/0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine` | `semantic`: `61:39: unknown-function: Unknown function: ta.requestVolumeDelta` | `produced-output-compiled` |
| `sources/0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | `semantic`: `31:6: unknown-function: Unknown library function: ta.tr` | `produced-output-compiled` |
| `sources/0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine` | `semantic`: `26:50: unknown-function: Unknown function: ta.requestVolumeDelta` | `produced-output-compiled` |
| `sources/0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | `semantic`: `31:6: unknown-function: Unknown library function: ta.tr` | `produced-output-compiled` |

The eight official/builtin function rows now pass; `0084` (`ta.sum`) was not changed and remains in the 31-row remainder. The former C classes are reduced from four rows to one: alias-resolution C is `0`, UDT-receiver C is `0`, and array-runtime C remains `0279`. The remaining C-class row is therefore:

| Row | Stage | Exact diagnostic | Hidden runtime evidence |
| --- | --- | --- | --- |
| `sources/0279__easyspace-ai-pine-rs__array_core.pine` | output | `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `Cannot read properties of undefined (reading 'length')` at bar `0` |

## Raw Rerun

Command:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-after-c-fixes.json
```

The raw 649-row result was `523 supported / 87 TealScript gap / 19 invalid Pine / 20 unsupported by design`, with funnel `parse=618`, `semantic=545`, `compile=545`, `execute=530`, and `output=512`. Applying the committed audits and restoring the timeout disposition produces the single comparable `527 / 558` headline above.

## Value-Parity Boundary

This rerun still measures acceptance, execution, and non-empty normalized output only. It does not compare values or event traces to TradingView: value comparisons remain `0 / 650`, so 100% of numerical and rendering value parity is unmeasured. Ground truth requires pinned TradingView per-bar traces using identical source/version/inputs/symbol/timeframe/session/timezone/bars, normalized into plot values, `na`, drawings, tables, alerts, strategy state, and declaration metadata.
