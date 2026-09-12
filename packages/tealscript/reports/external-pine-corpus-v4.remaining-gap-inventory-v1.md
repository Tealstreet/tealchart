> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# V4 Remaining Gap Inventory V1

This inventory is the 40-row remainder of the audited `518 / 558` result recorded at `64aaa568c0`. It uses the registry-enabled run at `/tmp/pine-corpus-v4-rerun/report-20260905-with-registry.json` and the same fixed v4 sources. Source repository, path, and commit SHA are authoritative in `external-pine-corpus-v4.report.json`; the local paths below are the stable row keys.

The source agent subsequently landed `53ad02740b` (official-alias fallback). This inventory intentionally describes the 40-row snapshot requested before that fix is remeasured; it is not a claim that the set is unchanged at the newer source head.

## Root-Cause Ranking

| Rank | Root cause | Rows | Known C class | New / unresolved |
| ---: | --- | ---: | ---: | ---: |
| 1 | Collection runtime errors | 11 | none | 11 |
| 2 | Unknown functions | 9 | alias-resolution C: 2 | 7 |
| 3 | Conditional/data-gated output not triggered | 4 | none | 4 |
| 4 | Method receiver typing | 2 | none | 2 |
| 5 | Global output suppressed by compiled bar errors | 2 | UDT receiver C: 1; array runtime C: 1 | 0 new |
| 6 | Unknown assignment target | 2 | none | 2 |
| 7 | Library export declaration | 2 | none | 2 |
| 8 | Unknown identifier | 1 | none | 1 |
| 9 | Matrix method argument count | 1 | none | 1 |
| 10 | Invalid field default | 1 | none | 1 |
| 11 | Lower-timeframe request runtime guard | 1 | none | 1 |
| 12 | Parser unexpected token | 1 | none | 1 |
| 13 | Tuple shape mismatch | 1 | none | 1 |
| 14 | Classifier timeout | 1 | none | 1 |

The largest single cause is **collection runtime errors: 11 rows**. The four previously identified C classes account for exactly four rows: alias-member resolution (`0069`, `0226`), local UDT receiver typing (`0128`), and array aggregate/runtime handling (`0279`). The remaining 36 rows are different causes, not repetitions of those four.

## 1. Collection Runtime Errors

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0089__helenananaa-pine-compat-runtime__matrix_trace.pine` | execute | `Matrix trace requires a square matrix. Matrix is 2x3` | new |
| `sources/0095__helenananaa-pine-compat-runtime__unsupported_matrix_remove_col.pine` | execute | `Matrix column 100 is out of bounds. column count is 1` | new |
| `sources/0151__helenananaa-pine-compat-runtime__unsupported_matrix_pow_power.pine` | execute | `Matrix power must be a non-negative integer` | new |
| `sources/0155__helenananaa-pine-compat-runtime__supported_object_array_element_method_return_qualifier.pine` | execute | `Cannot use shift() if array is empty.` | new |
| `sources/0287__helenananaa-pine-compat-runtime__matrix_add_col_size_mismatch.pine` | execute | `Matrix column length 1 does not match row count 2` | new |
| `sources/0373__helenananaa-pine-compat-runtime__unsupported_bound_matrix_eigenvectors_call_result_reads.pine` | execute | `Matrix row NaN is out of bounds. row count is 2` | new |
| `sources/0393__folknor-pine-tools__p08-array-history-not-element.pine` | execute | `Array index 1 is out of bounds. Array size is 1` | new |
| `sources/0435__helenananaa-pine-compat-runtime__unsupported_matrix_reshape_column_type.pine` | execute | `Matrix columns must be a non-negative integer` | new |
| `sources/0438__helenananaa-pine-compat-runtime__matrix_reshape_negative_row_count.pine` | execute | `Matrix rows must be a non-negative integer` | new |
| `sources/0439__helenananaa-pine-compat-runtime__supported_map_operation_return_qualifier.pine` | execute | `Matrix column length 2 does not match row count 1` | new |
| `sources/0571__helenananaa-pine-compat-runtime__array_linefill_slice_history.pine` | execute | `Array index 1 is out of bounds. Array size is 1` | new |

These are all execute-stage failures after parse, semantic, and compile success. Several are negative or edge-case fixtures whose v6 validity still needs an explicit semantic audit; they are not evidence that every matrix error is a product gap.

## 2. Unknown Functions

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0069__regalouisei-collect-tradingview__asset-rotation-system-investorunknown.pine` | semantic | `64:11: unknown-function: Unknown library function: ta.rsi` | known C: imported alias should fall back to builtin |
| `sources/0084__AllienNova-CreditMaster-Pro-app__RG_Structure_Strategy_v2.pine` | semantic | `117:21: unknown-function: Unknown function: ta.sum` | new |
| `sources/0202__regalouisei-collect-tradingview__strategic-trend-filter.pine` | semantic | `29:7: unknown-function: Unknown library function: ta.correlation` | new |
| `sources/0226__deepentropy-oakscriptJS__SuperTrend-Relative-Volume-Kernel-Optimized-.pine` | semantic | `79:16: unknown-function: Unknown library function: ta.crossover` | known C: imported alias should fall back to builtin |
| `sources/0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine` | semantic | `60:39: unknown-function: Unknown function: ta.requestVolumeDelta` | new |
| `sources/0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine` | semantic | `61:39: unknown-function: Unknown function: ta.requestVolumeDelta` | new |
| `sources/0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | semantic | `31:6: unknown-function: Unknown library function: ta.tr` | new |
| `sources/0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine` | semantic | `26:50: unknown-function: Unknown function: ta.requestVolumeDelta` | new |
| `sources/0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine` | semantic | `31:6: unknown-function: Unknown library function: ta.tr` | new |

The two C rows were unchanged in the prior comparison because the registry cannot change namespace resolution. `53ad02740b` is the implementation under test for the next fixed-corpus rerun.

## 3. Conditional Or Data-Gated Output

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0206__majixai-majixai.github.io__session_raid_stats.pine` | output | `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.` | new: corpus stimulus insufficient |
| `sources/0263__Focal-QuantAI-QuantAI-Blog__1XLAET958P9JG-sg0CX5_code.pine` | output | `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.` | new: corpus stimulus insufficient |
| `sources/0468__James-Idiens-levels-futures__indicator.pine` | output | `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.` | new: corpus stimulus insufficient |
| `sources/0492__might-tree-SoC-Developing-Trading-Strategy-with-Pine-Script__Intraday_Gap_Detector.pine` | output | `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.` | new: corpus stimulus insufficient |

These rows are in the audited gap remainder because output was not proven, but the diagnostic itself says they are undecided. They should be resolved with deterministic stimulus or TradingView outputs before being called engine gaps.

## 4. Method Receiver Typing

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0111__0xpoot-poot-ml-trading__gaps.pine` | semantic | `41:9: method-receiver-type: No method delete() overload accepts box receiver` | new |
| `sources/0120__learn-win-pinescript__FibonacciPivots_SMA_Volume.pine` | semantic | `99:5: method-receiver-type: No method delete() overload accepts line receiver` | new |

## 5. Global Output Hidden By Compiled Errors

| Row | Stage | Exact diagnostic | Hidden compiled diagnostic | Class |
| --- | --- | --- | --- | --- |
| `sources/0128__helenananaa-pine-compat-runtime__user_type_non_scalar_typed_na_history.pine` | output | `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `No local method overload matched retain for receiver number` at bar `0` | known C: UDT receiver |
| `sources/0279__easyspace-ai-pine-rs__array_core.pine` | output | `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.` | `Cannot read properties of undefined (reading 'length')` at bar `0` | known C: array runtime |

## 6. Unknown Assignment Target

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0170__Pesci1134-gbpjpy-macd-divergence-strategy__sukepoyo_sub.pine` | semantic | `88:9: unknown-assignment-target: Cannot assign to undeclared identifier: z_B` | new |
| `sources/0196__emayu323-gbpjpy-macd-divergence-strategy__sukepoyo_sub.pine` | semantic | `88:9: unknown-assignment-target: Cannot assign to undeclared identifier: z_B` | new |

## 7. Library Export Declarations

| Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- |
| `sources/0211__ainell-owi-LePine__accumulation_distribution_line.pine` | semantic | `18:12: library-export: Exported function adl parameter src_high must declare a type` | new |
| `sources/0339__DubbedIndian-fibonacci-trail-breakout-system__technical_indicators.pine` | semantic | `11:22: library-export: Exported function calculate_ema parameter length must declare a type` | new |

## 8-14. Remaining Singleton And Small Groups

| Root cause | Row | Stage | Exact diagnostic | Class |
| --- | --- | --- | --- | --- |
| unknown identifier | `sources/0129__helenananaa-pine-compat-runtime__unsupported_map_udf_method_return_templates.pine` | semantic | `9:9: unknown-identifier: Unknown identifier: string_float` | new |
| matrix method argument count | `sources/0216__helenananaa-pine-compat-runtime__supported_bound_matrix_inv_call_result_reads.pine` | semantic | `argument-count: matrix.sum() expects at least 1 argument` | new |
| invalid field default | `sources/0271__aryan1919-web-xau-ai-institutional-scalper-pro__MASTER_STRATEGY.pine` | semantic | `238:26: invalid-field-default: Default value for field LogEntry.level must be a literal value or compatible built-in variable` | new |
| method argument count | `sources/0291__helenananaa-pine-compat-runtime__supported_user_type_array_udf_method_returns.pine` | semantic | `187:47: argument-count: Too many arguments for method exposeFirst: expected 1, got 2` | new |
| lower-timeframe request guard | `sources/0323__emmamunene0000-gif-TronJarvis-Absolute-Dollar-Agent__TRON_Glassbox_SignalGenerator.pine` | execute | `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60` | new |
| parser unexpected token | `sources/0329__levanelereal-pruebatrading__Estructura_Mayor.pine` | parse | `1404:54: Expected ".", "/*", "=", "[", "[]", or [ \t] but "+" found.` | new |
| tuple shape mismatch | `sources/0476__CjHare-pinescript-v5-snippets__macd.pine` | semantic | `32:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns 3` | new |
| classifier timeout | `sources/0254__davidadff7-blip-CODE23__Aoi_alert_all.pine` | execute | `external corpus classifier timeout after 45s on isolated row` | new: scale/runtime |

## Value-Parity Ceiling

The funnel measures syntax acceptance, semantic acceptance, compilation, execution, and whether TealScript emits any normalized output. It does **not** measure whether the emitted plot values, drawing coordinates, table contents, alerts, or strategy state equal TradingView's values. In the current v4 corpus, value parity comparisons are `0 / 650`; therefore **100% of value parity is unmeasured** even though the run/output headline is `518 / 558`.

The missing ground truth is a pinned TradingView execution trace for each script using the same source, Pine version, inputs, symbol, timeframe, session, timezone, and historical bars. The trace must be normalized into per-bar `na`/numeric/string/color values plus ordered drawing/table/alert events and declaration metadata. A useful parity harness would then compare those traces with explicit numeric tolerances and exact `na`, event-order, object-lifecycle, and metadata rules. Without that trace, `518 / 558` means “runs and produces output,” not “matches TradingView.”
