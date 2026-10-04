# TradingView v11 capture response v18

57/59 sources captured; 92 retained attempts. Selected native outcomes: {'RUNS': 33, 'COMPILE-ERROR': 24}.

Frozen source master 2a413d81d1; canonical bundle-manifest-v9.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T15:24:37.335967+00:00; reportUTC: 2026-10-04T17:15:11.571017+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source inputs/default flags, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context cross-round-reuse-v1.json](cross-round-reuse-v1.json).

[Context matrix-startup-context-v1.json](matrix-startup-context-v1.json).

[Context string-array-history-context-v1.json](string-array-history-context-v1.json).

[Context matrix-epsilon-context-v1.json](matrix-epsilon-context-v1.json).

[Context offset-placement-context-v1.json](offset-placement-context-v1.json).

[Context curve-path-context-v2.json](curve-path-context-v2.json).

[Context retention-context-v1.json](retention-context-v1.json).

[Context provider6m-context-v1.json](provider6m-context-v1.json).

[Context analyst-context-v1.json](analyst-context-v1.json).

[Context lifecycle-context-v1.json](lifecycle-context-v1.json).

[Context requested-confirmation-context-v1.json](requested-confirmation-context-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| const-polyline-declaration-v6-v1.pine / 1 | RUNS | [raw](const-polyline-declaration-v6-v1-attempt1.csv) {"OUTCOME":"77674.04"} |
| const-polyline-reassignment-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/const-polyline-reassignment-v6-v1-attempt1-error.txt) CE10085 line 4: A variable declared with the "const" type form cannot be modified. |
| const-point-mutation-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/const-point-mutation-v6-v1-attempt1-error.txt) CE10085 line 4: A variable declared with the "const" type form cannot be modified. |
| const-point-reassignment-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/const-point-reassignment-v6-v1-attempt1-error.txt) CE10085 line 4: A variable declared with the "const" type form cannot be modified. |
| const-udt-declaration-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/const-udt-declaration-v6-v1-attempt1-error.txt) CE10260 line None: Cannot use the "const" keyword when declaring a variable or parameter that accepts a user-defined type. Use the "series" keyword instead or remove the qualifier keyword from the declaration. |
| ordinary-udt-declaration-v6-control-v1.pine / 1 | RUNS | [raw](ordinary-udt-declaration-v6-control-v1-attempt1.csv) {"OUTCOME":"77674.04"} |
| mutable-ema-first-two-v5-v1.pine / 1 | RUNS | [raw](../../../v6/captures/v6/mutable-ema-first-two-v5-v1-attempt1.csv) {"MUTABLE_TWO":"","FIXED_TWO":"","LIVE_LENGTH":"2"} |
| mutable-ema-udf-two-calls-v5-v1.pine / 2 | RUNS | [raw](../../../v6/captures/v6/mutable-ema-udf-two-calls-v5-v1-attempt2.csv) {"MUTABLE_UDF_TWO":"","FIXED_UDF_FOUR":"","FIXED_TWO":"","FIXED_FOUR":""} |
| fixed-ema-input-three-v5-control-v1.pine / 1 | RUNS | [raw](../../../v6/captures/v6/fixed-ema-input-three-v5-control-v1-attempt1.csv) {"FIXED_INPUT_THREE":"","FIXED_LITERAL_THREE":""} |
| corpus-909-history-limit-v1.pine / 1 | RUNS | [raw](corpus-909-history-limit-v1-attempt1.csv) {"A":"","B":"","C":"","D":"","E":""} |
| ternary-int-string-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-int-string-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr2"="one". An argument of "literal string" type was used but a "simple int"  is expected. |
| ternary-float-bool-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-float-bool-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr1"="1.5". An argument of "literal float" type was used but a "simple bool"  is expected. |
| ternary-color-int-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-color-int-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr2"="1". An argument of "literal int" type was used but a "simple color"  is expected. |
| ternary-string-bool-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-string-bool-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr1"="one". An argument of "literal string" type was used but a "simple bool"  is expected. |
| ternary-bool-int-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-bool-int-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr2"="1". An argument of "literal int" type was used but a "simple bool"  is expected. |
| ternary-color-string-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ternary-color-string-v6-v1-attempt1-error.txt) CE10123 line 3: Cannot call "operator ?:" with argument "expr2"="red". An argument of "literal string" type was used but a "simple color"  is expected. |
| ternary-compatible-v6-control-v1.pine / 1 | RUNS | [raw](ternary-compatible-v6-control-v1-attempt1.csv) {} |
| source-window-hole-matrix-v1.pine / 1 | RUNS | [raw](source-window-hole-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","CLEAN":"10","SOURCE":"","PEER":"","RSI4":"","CMO4":"","HMA4":"","HIGHESTBARS4":"","LOWESTBARS4":"","CORRELATION4":"","RISING4":"0","NEAREST4P50":"","PIVOTLOW2":"","PIVOTHIGH2":"","MIN":"","RCI4":""} |
| source-stateful-hole-matrix-v1.pine / 1 | RUNS | [raw](source-stateful-hole-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","CLEAN":"10","SOURCE":"","PEER":"","CUM":"","FIXNAN":"","VALUEWHEN0":"","VALUEWHEN3":"","MACD":"","SIGNAL":"","HISTOGRAM":""} |
| array-linear-standardize-matrix-v1.pine / 1 | RUNS | [raw](array-linear-standardize-matrix-v1-attempt1.csv) {"STANDARD_SIZE":"4","STANDARD_0":"-1.1111677990074322","STANDARD_1":"","STANDARD_2":"1.3131983079178744","STANDARD_3":"-0.2020305089104423","AF_P25_NS":"","AF_P25_METHOD":"","AF_P50_NS":"","AF_P50_METHOD":"","AF_P75_NS":"","AF_P75_METHOD":"","AI_P25_NS":"2.5","AI_P25_METHOD":"2.5","AI_P50_NS":"6.5","AI_P50_METHOD":"6.5","AI_P75_NS":"10.5","AI_P75_METHOD":"10.5"} |
| analyst-target-context-matrix-v1.pine / 2 | RUNS | [raw](analyst-target-context-matrix-v1-attempt2.csv) {"TARGET_AVERAGE":"","AVERAGE_MISSING":"1","TARGET_MEDIAN":"","MEDIAN_MISSING":"1","TARGET_DATE":"","DATE_MISSING":"1","TARGET_ESTIMATES":"","ESTIMATES_MISSING":"1","TARGET_HIGH":"","HIGH_MISSING":"1","TARGET_LOW":"","LOW_MISSING":"1","BAR_TIME":"1784554200000","OBSERVATION_TIME":"1791132382135"} |
| hline-gradient-six-slots-v1.pine / 1 | RUNS | [raw](hline-gradient-six-slots-v1-attempt1.csv) {"MIDPOINT":"50"} |
| all-na-seed-matrix-v1.pine / 1 | RUNS | [raw](all-na-seed-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","FIXNAN_ALL_NA":"","MAX_ALL_NA":"","MIN_ALL_NA":""} |
| legacy-cross-hole-matrix-v1.pine / 1 | RUNS | [raw](legacy-cross-hole-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","X":"","Y":"0","CROSSOVER_STATE":"-1","CROSSUNDER_STATE":"-1","CROSS_STATE":"-1"} |
| chart-context-lifecycle-matrix-v1.pine / 13 | RUNS | [raw](chart-context-lifecycle-matrix-v1-attempt13.csv) {"BAR_INDEX":"0","BAR_TIME":"1788134400000","CLOCK":"1791133173998","LIVE_UPDATES":"1","VISIBLE_LEFT":"1791129720000","VISIBLE_RIGHT":"1791133080000","BG_R":"255","BG_G":"255","BG_B":"255","FG_R":"15","FG_G":"15","FG_B":"15","EXECUTION_COUNT":"1"} |
| default-string-text-pair-v1.pine / 1 | RUNS | [raw](default-string-text-pair-v1-attempt1.csv) {"FIRST_LENGTH":"10","SECOND_LENGTH":"12"} |
| inactive-if-string-pair-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/inactive-if-string-pair-v1-attempt1-error.txt) CE10150 line 3: "text" cannot be used as a variable or function name. |
| matrix-predicate-orientation-epsilon-v1.pine / 5 | RUNS | [raw](matrix-predicate-orientation-epsilon-v1-attempt5.csv) {"ROW_STOCHASTIC":"1","COLUMN_STOCHASTIC":"0","ZERO":"0","BINARY":"0","IDENTITY":"0","SYMMETRIC":"0","EPSILON":"0.0001"} |
| modulo-assignment-sign-matrix-v1.pine / 1 | RUNS | [raw](modulo-assignment-sign-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","A":"-5","B":"3","MODULO":"-2","MODULO_ASSIGN":"-2"} |
| requested-confirmation-pair-v1.pine / 1 | RUNS | [raw](requested-confirmation-pair-v1-attempt1.csv) {"LOCAL_CONFIRMED":"1","REQUEST_CONFIRMED":"0","LOCAL_TIME":"1788134400000","REQUEST_TIME":""} |
| numeric-array-every-float-method-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-every-float-method-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.every" with argument "id"="items". An argument of "array<float>" type was used but a "array<bool>"  is expected. |
| numeric-array-every-float-namespace-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-every-float-namespace-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.every" with argument "id"="items". An argument of "array<float>" type was used but a "array<bool>"  is expected. |
| numeric-array-every-int-method-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-every-int-method-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.every" with argument "id"="items". An argument of "array<int>" type was used but a "array<bool>"  is expected. |
| numeric-array-every-int-namespace-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-every-int-namespace-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.every" with argument "id"="items". An argument of "array<int>" type was used but a "array<bool>"  is expected. |
| numeric-array-some-float-method-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-some-float-method-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.some" with argument "id"="items". An argument of "array<float>" type was used but a "array<bool>"  is expected. |
| numeric-array-some-float-namespace-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-some-float-namespace-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.some" with argument "id"="items". An argument of "array<float>" type was used but a "array<bool>"  is expected. |
| numeric-array-some-int-method-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-some-int-method-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.some" with argument "id"="items". An argument of "array<int>" type was used but a "array<bool>"  is expected. |
| numeric-array-some-int-namespace-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/numeric-array-some-int-namespace-v1-attempt1-error.txt) CE10123 line 4: Cannot call "array.some" with argument "id"="items". An argument of "array<int>" type was used but a "array<bool>"  is expected. |
| plotbar-four-input-reorder-v1.pine / 1 | RUNS | [raw](plotbar-four-input-reorder-v1-attempt1.csv) {"BAR_INDEX":"0","INPUT_OPEN":"10","INPUT_HIGH":"8","INPUT_LOW":"9","INPUT_CLOSE":"11"} |
| sparse-udf-history-pair-v1.pine / 1 | RUNS | [raw](sparse-udf-history-pair-v1-attempt1.csv) {"BAR_INDEX":"0","CURRENT":"0","PRIOR1":"","PRIOR2":"","PRIOR3":""} |
| tagged-udt-equal-key-sort-v1.pine / 1 | RUNS | [raw](tagged-udt-equal-key-sort-v1-attempt1.csv) {"TAG0":"20","TAG1":"50","TAG2":"10","TAG3":"30","TAG4":"40"} |
| visual-curves-point-copy-v6-v1.pine / 2 | RUNS | [raw](visual-curves-point-copy-v6-v1-attempt2.csv) {"BAR_INDEX":"0","DRAWING_END_INDEX":"","POLYLINE_COUNT":"0"} |
| visual-offset-bgcolor-v3-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/visual-offset-bgcolor-v3-v1-attempt2-error.txt) None line 3: Undeclared identifier `bar_index`; |
| visual-offset-bgcolor-v4-v1.pine / 3 | RUNS | [raw](visual-offset-bgcolor-v4-v1-attempt3.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0"} |
| visual-offset-bgcolor-v5-v1.pine / 2 | RUNS | [raw](visual-offset-bgcolor-v5-v1-attempt2.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0"} |
| visual-offset-plotarrow-v3-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/visual-offset-plotarrow-v3-v1-attempt2-error.txt) None line 3: Undeclared identifier `bar_index`; |
| visual-offset-plotarrow-v4-v1.pine / 2 | RUNS | [raw](visual-offset-plotarrow-v4-v1-attempt2.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0"} |
| visual-offset-plotarrow-v5-v1.pine / 2 | RUNS | [raw](visual-offset-plotarrow-v5-v1-attempt2.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0"} |
| visual-offsets-grouped-v3-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/visual-offsets-grouped-v3-v1-attempt2-error.txt) None line 3: Undeclared identifier `bar_index`; |
| visual-offsets-grouped-v4-v1.pine / 2 | RUNS | [raw](visual-offsets-grouped-v4-v1-attempt2.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0","DYNAMIC_PLOT":"102","ZERO_PLOT":"100","DYNAMIC_SHAPE":"","ZERO_SHAPE":"200","DYNAMIC_CHAR":"","ZERO_CHAR":"300"} |
| visual-offsets-grouped-v5-v1.pine / 2 | RUNS | [raw](visual-offsets-grouped-v5-v1-attempt2.csv) {"SOURCE_INDEX_SCALED":"0","SOURCE_SHIFT":"-2","EVENT_INDEX_SCALED":"0","DYNAMIC_PLOT":"102","ZERO_PLOT":"100","DYNAMIC_SHAPE":"","ZERO_SHAPE":"200","DYNAMIC_CHAR":"","ZERO_CHAR":"300"} |
| visual-retention-four-families-v6-v1.pine / 2 | RUNS | [raw](visual-retention-four-families-v6-v1-attempt2.csv) {"BAR_INDEX":"0","CREATED":"1","LABEL_COUNT":"1","LABEL_OLDEST_CREATED":"0","LINE_COUNT":"1","LINE_OLDEST_CREATED":"0","BOX_COUNT":"1","BOX_OLDEST_CREATED":"0","POLYLINE_COUNT":"1","POLYLINE_OLDEST_CREATED":"0"} |
| udt-variable-ticker-namespace-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/udt-variable-ticker-namespace-v1-attempt1-error.txt) CE10093 line 7: Invalid object name: ticker. Namespaces of built-ins cannot be used. |
| udt-variable-holder-method-control-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/udt-variable-holder-method-control-v1-attempt1-error.txt) CE10236 line 6: The "this" argument is not used. The first method argument should be used. |
| provider6m-snapshot-pack-v6-v1.pine / 3 | RUNS | [raw](provider6m-snapshot-pack-v6-v1-attempt3.csv) {"htf6_goff_lon_close_clean":"77740.01","htf6_goff_lon_sum_close_len3_clean":"","htf6_goff_lon_sum_close_len3_hole":"","htf6_goff_lon_range":"255.99000000000524","htf6_goff_lon_hl2":"77699.995","htf6_goff_lon_hlc3":"77713.33333333333","htf6_goff_lon_ohlc4":"77705.5","htf6_goff_lon_close_history2":"","htf6_goff_lon_time_close":"1788134760000","htf6_goff_lon_dayofweek":"2","htf6_goff_lon_daily_open":"1788134400000","htf6_goff_lon_close_hole97":"77740.01","htf6_goff_lon_INPUT_open":"77682","htf6_goff_lon_INPUT_high":"77827.99","htf6_goff_lon_INPUT_low":"77572","htf6_goff_lon_INPUT_volume":"118.48272","htf6_goff_lon_INPUT_time":"1788134400000","htf6_goff_lon_INPUT_index":"0","htf6_goff_lon_INPUT_first_time":"1788134400000","htf6_gon_lon_close_clean":"77740.01","htf6_gon_lon_sum_close_len3_clean":"","htf6_gon_lon_sum_close_len3_hole":"","htf6_gon_lon_range":"255.99000000000524","htf6_gon_lon_hl2":"77699.995","htf6_gon_lon_hlc3":"77713.33333333333","htf6_gon_lon_ohlc4":"77705.5","htf6_gon_lon_close_history2":"","htf6_gon_lon_time_close":"1788134760000","htf6_gon_lon_dayofweek":"2","htf6_gon_lon_daily_open":"1788134400000","htf6_gon_lon_close_hole97":"77740.01","htf6_gon_lon_INPUT_open":"77682","htf6_gon_lon_INPUT_high":"77827.99","htf6_gon_lon_INPUT_low":"77572","htf6_gon_lon_INPUT_volume":"118.48272","htf6_gon_lon_INPUT_time":"1788134400000","htf6_gon_lon_INPUT_index":"0","htf6_gon_lon_INPUT_first_time":"1788134400000","CHART_open":"77682","CHART_high":"77682.01","CHART_low":"77572","CHART_close":"77674.04","CHART_volume":"51.86295","CHART_time":"1788134400000","CHART_time_close":"1788134520000","CHART_bar_index":"0","CHART_timenow":"1791131985295"} |
| provider6m-revision-pack-v6-v1.pine / 3 | RUNS | [raw](provider6m-revision-pack-v6-v1-attempt3.csv) {"htf6_gapsoff_clean":"77740.01","htf6_gapsoff_hole":"77740.01","htf6_gapsoff_sma4":"","htf6_gapsoff_rma4":"","htf6_gapsoff_INPUT_open":"77682","htf6_gapsoff_INPUT_high":"77827.99","htf6_gapsoff_INPUT_low":"77572","htf6_gapsoff_INPUT_volume":"118.48272","htf6_gapsoff_INPUT_time":"1788134400000","htf6_gapsoff_INPUT_time_close":"1788134760000","htf6_gapsoff_INPUT_index":"0","htf6_gapsoff_INPUT_first_time":"1788134400000","htf6_gapson_clean":"77740.01","htf6_gapson_hole":"77740.01","htf6_gapson_sma4":"","htf6_gapson_rma4":"","htf6_gapson_INPUT_open":"77682","htf6_gapson_INPUT_high":"77827.99","htf6_gapson_INPUT_low":"77572","htf6_gapson_INPUT_volume":"118.48272","htf6_gapson_INPUT_time":"1788134400000","htf6_gapson_INPUT_time_close":"1788134760000","htf6_gapson_INPUT_index":"0","htf6_gapson_INPUT_first_time":"1788134400000","CHART_open":"77682","CHART_high":"77682.01","CHART_low":"77572","CHART_close":"77674.04","CHART_volume":"51.86295","CHART_time":"1788134400000","CHART_time_close":"1788134520000","CHART_bar_index":"0","CHART_timenow":"1791132006377"} |
| provider6m-direct-feed-v6-v1.pine / 3 | RUNS | [raw](provider6m-direct-feed-v6-v1-attempt3.csv) {"FEED_open":"63780","FEED_high":"64038","FEED_low":"63725.37","FEED_close":"63979.84","FEED_volume":"116.44631","FEED_time":"1783900800000","FEED_time_close":"1783901160000","FEED_bar_index":"0","FEED_timenow":"1791132026582","FEED_first_time":"1783900800000"} |

Pending: provider-daily-counter-prefix-v5-v1.pine, provider-daily-direct-feed-v5-v2.pine.

[All attempts](outcomes-v11.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v18.json). Earlier responses remain retained.
