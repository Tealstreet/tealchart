> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# V4 Engine Delta V4: Registry-Enabled Rerun

This report supersedes the zero-delta conclusion in `engine-delta-v2` and the pre-registry comparison in `engine-delta-v3`. It compares the committed v4 audited baseline with the fixed-corpus rerun at `/tmp/pine-corpus-v4-rerun/report-20260905-with-registry.json`. The corpus is unchanged: 649 rows, excluding timeout source `0254` from execution.

## Instrument Change

`run-external-pine-corpus.ts` now builds a host library registry from each parsed official TradingView import and passes it to `checkProgram`, `tryCompile`, `executeCompiled`, and both output probes. The runner still imports `parse` from `src/parser/parser.ts`, semantic checking and compilation from TypeScript source, and the parser delegates to checked-in `src/parser/generated.js`; no `dist` or cached report is loaded.

All parity numbers produced before commit `3ddb1222fa` are suspect for official-library coverage because the runner did not explicitly pass its host registry. The source implementation also recognizes built-in official libraries directly; therefore this wiring change is required for parity with the host integration, but it is not itself credited with rows that changed in this run. The two-row increase versus the immediately previous rerun coincides with source commit `fd1f18eab5` (`ta.max`/`ta.min` one-argument support), which was present during this run.

## Targeted Delta

`A` = now passes. `B` = different diagnostic, showing progress even when the row still fails. `C` = identical stage and diagnostic, so the attempted fix did not exercise that row.

| Result | Row | Before | After |
| --- | --- | --- | --- |
| A | `0137__helenananaa-pine-compat-runtime__supported_for_in_empty_array_slice_result_negative_body_history.pine` | `output`: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `pass`: `produced-output-compiled` |
| A | `0172__regalouisei-collect-tradingview__relative-crypto-dominance-polar-chart-luxalgo.pine` | `semantic`: `146:23: type-mismatch: Cannot use string value as udt array element` | `pass`: `produced-output-compiled` |
| A | `0408__regalouisei-collect-tradingview__stock-screener.pine` | `semantic`: `516:323: type-mismatch: vwap source must be a number, got bool` | `pass`: `produced-output-compiled` |
| A | `0477__hylal-snd-ufo__snd-ufo-indicator.pine` | `semantic`: `98:5: type-mismatch: Cannot assign float value to int variable bullLineX1` | `pass`: `produced-output-compiled` |
| B | `0129__helenananaa-pine-compat-runtime__unsupported_map_udf_method_return_templates.pine` | `semantic`: `7:8: duplicate-symbol: Duplicate declaration: badReturn` | `semantic`: `9:9: unknown-identifier: Unknown identifier: string_float` |
| B | `0291__helenananaa-pine-compat-runtime__supported_user_type_array_udf_method_returns.pine` | `semantic`: `99:8: duplicate-symbol: Duplicate declaration: first` | `semantic`: `187:47: argument-count: Too many arguments for method exposeFirst: expected 1, got 2` |
| B | `0202__regalouisei-collect-tradingview__strategic-trend-filter.pine` | `semantic`: `8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `29:7: unknown-function: Unknown library function: ta.correlation` |
| B | `0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | `semantic`: `8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `31:6: unknown-function: Unknown library function: ta.tr` |
| B | `0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | `semantic`: `8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `31:6: unknown-function: Unknown library function: ta.tr` |
| B | `0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine` | `semantic`: `4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `60:39: unknown-function: Unknown function: ta.requestVolumeDelta` |
| B | `0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine` | `semantic`: `4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `61:39: unknown-function: Unknown function: ta.requestVolumeDelta` |
| B | `0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine` | `semantic`: `4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import` | `semantic`: `26:50: unknown-function: Unknown function: ta.requestVolumeDelta` |
| C | `0128__helenananaa-pine-compat-runtime__user_type_non_scalar_typed_na_history.pine` | `output`: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `output`: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` |
| C | `0279__easyspace-ai-pine-rs__array_core.pine` | `output`: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `output`: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` |
| C | `0069__regalouisei-collect-tradingview__asset-rotation-system-investorunknown.pine` | `semantic`: `64:11: unknown-function: Unknown library function: ta.rsi` | `semantic`: `64:11: unknown-function: Unknown library function: ta.rsi` |
| C | `0226__deepentropy-oakscriptJS__SuperTrend-Relative-Volume-Kernel-Optimized-.pine` | `semantic`: `79:16: unknown-function: Unknown library function: ta.crossover` | `semantic`: `79:16: unknown-function: Unknown library function: ta.crossover` |

## C Explanations

- `0069` and `0226` import `TradingView/ta` under alias `ta` and call members that are builtins but are not exports of the imported library. The runner now supplies the official program, but the resolver still emits `Unknown library function` instead of falling back to the builtin namespace. This remains a language resolution-order gap.
- `0128` has a compiled bar error `No local method overload matched retain for receiver number` at bar `0`; the output classifier records only its identical output-silence diagnostic. The registry cannot affect this local UDT receiver typing issue.
- `0279` has a compiled bar error `Cannot read properties of undefined (reading 'length')` at bar `0`; the output classifier likewise records only output silence. The registry cannot affect this array aggregate/runtime issue.

## Rerun Summary

| Measure | Baseline audited report | Registry-enabled rerun | Delta |
| --- | ---: | ---: | ---: |
| Supported | 512 | 514 | +2 |
| TealScript gap | 53 | 96 | +43 raw classifier bucket; audited normalization is not recomputed here |
| Invalid Pine | 55 | 19 | different denominator: rerun excludes v4 hygiene/invalid overlays |
| Unsupported by design | 19 | 20 | different denominator: rerun excludes v4 hygiene/invalid overlays |
| Parse pass | 618 | 618 | 0 |
| Semantic pass | 532 | 537 | +5 |
| Compile pass | 532 | 537 | +5 |
| Execute pass | 517 | 522 | +5 |
| Output pass | 497 | 503 | +6 |

The raw rerun is not directly comparable to the audited 650-row headline because it is the 649-row no-timeout input and uses the runner's raw validity classifier. The trustworthy row-level result is `A=4`, `B=8`, `C=4`; no zero-delta claim remains.
