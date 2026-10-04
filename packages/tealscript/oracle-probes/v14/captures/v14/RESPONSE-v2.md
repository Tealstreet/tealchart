# TradingView v14 capture response v2

13/13 sources captured; 13 retained attempts. Selected native outcomes: {'RUNS': 11, 'RUNTIME-ERROR': 2}.

Frozen source master 27f4731f33; canonical bundle-manifest-v5.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T19:03:18.796319+00:00; reportUTC: 2026-10-04T19:16:43.317010+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source inputs/default flags, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context quotient-prefix-context-v1.json](quotient-prefix-context-v1.json).

[Context collections-context-v1.json](collections-context-v1.json).

[Context v13-reuse-context-v1.json](v13-reuse-context-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| const-quotient-precision-context-v14-v1.pine / 1 | RUNS | [raw](const-quotient-precision-context-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","INPUT_TIME":"1788739200000","INPUT_CLOSE":"80293.23","INPUT_NUMERATOR":"2","INPUT_DENOMINATOR":"15","INPUT_TIMEFRAME_MULTIPLIER":"2","INPUT_SERIES_NUMERATOR":"2","CONST_2_OVER_15":"0.1333333333333333","CONST_13_OVER_15":"0.8666666666666667","CONST_1_OVER_7":"0.1428571428571428","CONST_1_OVER_15":"0.0666666666666667","CONST_10_OVER_3":"3.3333333333333335","CONST_100_OVER_3":"33.333333333333336","CONST_SMALL_OVER_3":"3.3333333333333335e-11","CONST_LARGE_OVER_3":"3333333333.3333335","CONST_CHAIN_2_OVER_15":"0.1333333333333333","LITERAL_17_DIGITS":"0.1333333333333333","LITERAL_16_DIGITS":"0.1333333333333333","INPUT_QUOTIENT":"0.13333333333333333","SIMPLE_QUOTIENT":"0.13333333333333333","SERIES_QUOTIENT":"0.13333333333333333","UDF_CONST_ARGUMENTS":"0.1333333333333333","UDF_INPUT_ARGUMENTS":"0.13333333333333333","UDF_SIMPLE_ARGUMENTS":"0.13333333333333333","UDF_SERIES_ARGUMENTS":"0.13333333333333333","CONST_MINUS_INPUT_SCALED":"-27.755575615628914","CONST_MINUS_LITERAL_17_SCALED":"0","CONST_MINUS_LITERAL_16_SCALED":"27.755575615628914","LITERAL_17_MINUS_16_SCALED":"27.755575615628914","SMALL_QUOTIENT_SCALED":"3333333333.3333335","INPUT_HOLE_SOURCE":"80293.23","EMA_FIRST_CONST":"80293.23","EMA_SMA_CONST":"","EMA_FIRST_INPUT":"80293.23","EMA_SMA_INPUT":"","EMA_FIRST_SIMPLE":"80293.23","EMA_SMA_SIMPLE":"","EMA_FIRST_LITERAL17":"80293.23","EMA_SMA_LITERAL17":"","EMA_FIRST_LITERAL16":"80293.23","EMA_SMA_LITERAL16":"","EMA_FIRST_EXACT_CONTROL":"80293.23","EMA_SMA_EXACT_CONTROL":""} |
| map-signed-zero-key-identity-v14-v1.pine / 1 | RUNS | [raw](map-signed-zero-key-identity-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","SIZE_FIRST":"1","SIZE_SECOND":"1","POSITIVE_ZERO_VALUE":"22","NEGATIVE_ZERO_VALUE":"22"} |
| array-standardize-multihole-int-v14-v1.pine / 1 | RUNS | [raw](array-standardize-multihole-int-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","SOURCE_SIZE":"5","RESULT_SIZE":"5","SOURCE_0":"1","SOURCE_1":"","SOURCE_2":"5","SOURCE_3":"","SOURCE_4":"9","RESULT_0":"-1.2247448713915892","RESULT_1":"","RESULT_2":"0","RESULT_3":"","RESULT_4":"1.2247448713915892"} |
| array-standardize-multihole-float-v14-v1.pine / 1 | RUNS | [raw](array-standardize-multihole-float-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","SOURCE_SIZE":"5","RESULT_SIZE":"5","SOURCE_0":"1","SOURCE_1":"","SOURCE_2":"5","SOURCE_3":"","SOURCE_4":"9","RESULT_0":"-1.2247448713915892","RESULT_1":"","RESULT_2":"0","RESULT_3":"","RESULT_4":"1.2247448713915892"} |
| array-covariance-bias-paired-holes-v14-v1.pine / 1 | RUNS | [raw](array-covariance-bias-paired-holes-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","POPULATION":"4","SAMPLE":"6","DEFAULT":"4","METHOD_POPULATION":"4","METHOD_SAMPLE":"6","HOLE_POPULATION":"6","HOLE_SAMPLE":"12"} |
| array-percentrank-fraction-and-ties-v14-v1.pine / 1 | RUNS | [raw](array-percentrank-fraction-and-ties-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","INT_NAMESPACE":"0","INT_METHOD":"0","FLOAT_NAMESPACE":"0","FLOAT_METHOD":"0","TIE_NAMESPACE":"66.66666666666667","TIE_METHOD":"66.66666666666667"} |
| array-linear-overflow-percentage-positive-v14-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/array-linear-overflow-percentage-positive-v14-v1-attempt1-error.txt) RE10002 line 5: Error on bar 0: Invalid value of the 'percentage' argument ({value}) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100]. |
| array-linear-overflow-percentage-negative-v14-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/array-linear-overflow-percentage-negative-v14-v1-attempt1-error.txt) RE10002 line 5: Error on bar 0: Invalid value of the 'percentage' argument ({value}) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100]. |
| array-linear-fraction-int-namespace-v14-v1.pine / 1 | RUNS | [raw](array-linear-fraction-int-namespace-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","PERCENTILE_0":"10","PERCENTILE_25":"10","PERCENTILE_50":"15.5","PERCENTILE_75":"21","PERCENTILE_100":"21"} |
| array-linear-fraction-int-method-v14-v1.pine / 1 | RUNS | [raw](array-linear-fraction-int-method-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","PERCENTILE_0":"10","PERCENTILE_25":"10","PERCENTILE_50":"15.5","PERCENTILE_75":"21","PERCENTILE_100":"21"} |
| array-linear-fraction-float-namespace-v14-v1.pine / 1 | RUNS | [raw](array-linear-fraction-float-namespace-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","PERCENTILE_0":"10","PERCENTILE_25":"10","PERCENTILE_50":"15.5","PERCENTILE_75":"21","PERCENTILE_100":"21"} |
| array-linear-fraction-float-method-v14-v1.pine / 1 | RUNS | [raw](array-linear-fraction-float-method-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","PERCENTILE_0":"10","PERCENTILE_25":"10","PERCENTILE_50":"15.5","PERCENTILE_75":"21","PERCENTILE_100":"21"} |
| matrix-zero-binary-epsilon-boundary-v14-v1.pine / 1 | RUNS | [raw](matrix-zero-binary-epsilon-boundary-v14-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","CASE":"0","EPSILON":"0","ACTUAL_ZERO_ENTRY":"0","ACTUAL_BINARY_PLUS":"1","ACTUAL_BINARY_MINUS":"1","IS_ZERO":"1","IS_BINARY":"1"} |

Pending: none.

[All attempts](outcomes-v14.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v2.json). Earlier responses remain retained.
