# TradingView v13 capture response v5

21/40 sources captured; 35 retained attempts. Selected native outcomes: {'RUNS': 18, 'RUNTIME-ERROR': 3}.

Frozen source master 7a7c36add7; canonical bundle-manifest-v13.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T17:43:59.905815+00:00; reportUTC: 2026-10-04T18:47:03.739102+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source inputs/default flags, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context single-hole-percentile-context-v1.json](single-hole-percentile-context-v1.json).

[Context minute-prefix-context-v1.json](minute-prefix-context-v1.json).

[Context sabres-companion-context-v1.json](sabres-companion-context-v1.json).

[Context style-controls-context-v1.json](style-controls-context-v1.json).

[Context coded-display-context-v1.json](coded-display-context-v1.json).

[Context joint-point-context-v1.json](joint-point-context-v1.json).

[Context spread-context-v2.json](spread-context-v2.json).

[Context volume-context-v1.json](volume-context-v1.json).

[Context analyst-context-v1.json](analyst-context-v1.json).

[Context arithmetic-history-context-v1.json](arithmetic-history-context-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| bool-simple-float-na-const-target-v1.pine / 1 | RUNS | [raw](bool-simple-float-na-const-target-v1-attempt1.csv) {"CONVERTED":"0"} |
| bool-simple-float-na-simple-target-v1.pine / 1 | RUNS | [raw](bool-simple-float-na-simple-target-v1-attempt1.csv) {"CONVERTED":"0"} |
| context-ltf1-direct-prefix-v6-v1.pine / 1 | RUNS | [raw](context-ltf1-direct-prefix-v6-v1-attempt1.csv) {"INPUT_open":"76842.01","INPUT_high":"76864","INPUT_low":"76842","INPUT_close":"76842","INPUT_volume":"3.14176","INPUT_time":"1789344000000","INPUT_time_close":"1789344060000","INPUT_index":"0","INPUT_first_time":"1789344000000","CTRL_sma7":"","INPUT_clock":"1791136038474"} |
| context-ltf1-paired-prefix-v6-v1.pine / 1 | RUNS | [raw](context-ltf1-paired-prefix-v6-v1-attempt1.csv) {"ltf1_clean_count":"2","ltf1_clean_non_na_count":"2","ltf1_clean_first":"77625.93","ltf1_clean_last":"77674.04","ltf1_clean_non_na_sum":"155299.96999999997","ltf1_clean_non_na_mean":"77649.98499999999","ltf1_hole_count":"2","ltf1_hole_non_na_count":"2","ltf1_hole_first":"77625.93","ltf1_hole_last":"77674.04","ltf1_hole_non_na_sum":"155299.96999999997","ltf1_hole_non_na_mean":"77649.98499999999","ltf1_warm_count":"2","ltf1_warm_non_na_count":"0","ltf1_warm_first":"","ltf1_warm_last":"","ltf1_warm_non_na_sum":"","ltf1_warm_non_na_mean":"","INPUT_minute_first_time":"1788134400000","INPUT_minute_last_time":"1788134460000","INPUT_minute_first_index":"0","INPUT_minute_last_index":"1","INPUT_requested_origin_first":"1788134400000","INPUT_requested_origin_last":"1788134400000","CHART_open":"77682","CHART_high":"77682.01","CHART_low":"77572","CHART_close":"77674.04","CHART_volume":"51.86295","CHART_time":"1788134400000","CHART_index":"0","CHART_clock":"1791136085832"} |
| context-sabres-origin-v5-v1.pine / 1 | RUNS | [raw](context-sabres-origin-v5-v1-attempt1.csv) {"ORIGINAL_close":"77674.04","INPUT_index":"0","INPUT_time":"1788134400000","INPUT_first_time":"1788134400000","INPUT_length":"50"} |
| linear-percentile-single-hole-len3-p50-v1.pine / 1 | RUNS | [raw](linear-percentile-single-hole-len3-p50-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","SOURCE":"10","PERCENTILE":"","RESULT_NA":"1"} |
| host-style-constant-control-v6-v1.pine / 3 | RUNS | [raw](host-style-constant-control-v6-v1-attempt3.csv) {"PRICE":"77674.04"} |
| host-style-dynamic-new-v6-v1.pine / 1 | RUNS | [raw](host-style-dynamic-new-v6-v1-attempt1.csv) {"PRICE":"77674.04"} |
| host-style-gradient-v6-v1.pine / 1 | RUNS | [raw](host-style-gradient-v6-v1-attempt1.csv) {"PRICE":"77674.04"} |
| host-display-window-reset-v6-v1.pine / 4 | RUNS | [raw](host-display-window-reset-v6-v1-attempt4.csv) {"WINDOW_ONLY":"77674.04"} |
| host-input-joint-point-v6-v1.pine / 2 | RUNS | [raw](host-input-joint-point-v6-v1-attempt2.csv) {"INPUT_TIME":"1791134520000","INPUT_PRICE":"85454.01267811372","SELECTED_POINT":""} |
| lower-tf-spread-symbol-v6-v1.pine / 2 | RUNS | [raw](../../../v7/captures/v7/lower-tf-spread-symbol-v6-v1-attempt2.csv) {"INTRABARS":"2","FIRST":"77625.93","LAST":"77674.04"} |
| implicit-volume-recovery-context-v6-v1.pine / 3 | RUNS | [raw](implicit-volume-recovery-context-v6-v1-attempt3.csv) {"INPUT_OPEN":"7388.85","INPUT_HIGH":"7395.42","INPUT_LOW":"7384.2","INPUT_CLOSE":"7395.13","INPUT_VOLUME":"153400431","INPUT_TIME":"1778506200000","INPUT_INDEX":"0","OHLC_MISSING":"0","VOLUME_MISSING":"0","VOLUME_RECOVERY":"0","FLAT_RANGE":"0","OBV":"","PVT":"","WAD":"0","ACCDIST":"145470640.44919905","MFI_HLC3":"","PATTERN_SOURCE":"","MFI_PATTERN":"","PREV_OBV":"","PREV_PVT":"","PREV_WAD":"","PREV_ACCDIST":"","PREV_MFI_HLC3":""} |
| analyst-target-unavailable-context-v13-v1.pine / 3 | RUNS | [raw](analyst-target-unavailable-context-v13-v1-attempt3.csv) {"TARGET_HIGH":"","HIGH_IS_NA":"1","TARGET_LOW":"","LOW_IS_NA":"1","TARGET_MEDIAN":"","MEDIAN_IS_NA":"1","TARGET_AVERAGE":"","AVERAGE_IS_NA":"1","TARGET_DATE":"","DATE_IS_NA":"1","TARGET_ESTIMATES":"","ESTIMATES_IS_NA":"1","INPUT_TIME":"345479400000","INPUT_CLOSE":"0.128348","IS_LAST":"0","TYPE_STOCK":"1"} |
| v5-negative-const-int-division-v1.pine / 1 | RUNS | [raw](v5-negative-const-int-division-v1-attempt1.csv) {"CONST_NEGATIVE":"","LITERAL_NEGATIVE":"","FLOAT_CONTROL":"","EXPLICIT_CAST_CONTROL":""} |
| implicit-dmi-missing-ohlc-observation-v1.pine / 1 | RUNS | [raw](implicit-dmi-missing-ohlc-observation-v1-attempt1.csv) {"INPUT_TIME":"","ACTUAL_HIGH":"","ACTUAL_LOW":"","ACTUAL_CLOSE":"","OHLC_MISSING":"","PLUS":"","MINUS":"","ADX":""} |
| implicit-sar-missing-extrema-observation-v1.pine / 1 | RUNS | [raw](implicit-sar-missing-extrema-observation-v1-attempt1.csv) {"INPUT_TIME":"1788739200000","ACTUAL_HIGH":"80356","ACTUAL_LOW":"80230.29","ACTUAL_CLOSE":"80293.23","OHLC_MISSING":"0","TARGET":""} |
| corpus-752-scanner-loop-limit-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/corpus-752-scanner-loop-limit-v1-attempt1-error.txt) None line None: Invalid symbol: NSE:ZOMATO |
| history-overflow-offset-bk-v13-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/history-overflow-offset-bk-v13-v1-attempt1-error.txt) RE10008 line 5: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (2147483647 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-inference-realtime-jump-bk-v13-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/history-inference-realtime-jump-bk-v13-v1-attempt1-error.txt) None line 4: Error on bar 20001: The requested historical offset (151) is beyond the historical buffer's limit (101). |
| security-confirmed-context-bk-v13-v1.pine / 3 | RUNS | [raw](security-confirmed-context-bk-v13-v1-attempt3.csv) {"CHART_CONFIRMED":"","REQUESTED_CONFIRMED":"","REQUESTED_TIME":"","REQUESTED_CLOSE_TIME":"","REQUESTED_INDEX":"","CHART_TIME":"","BAR_INDEX":""} |

Pending: matrix-predicate-epsilon-additional-families-v13-v1.pine, map-negative-overflow-key-v13-v1.pine, map-nonfinite-key-identity-v13-v1.pine, trace-line-width-0-v13-v1.pine, trace-line-width-151-v13-v1.pine, trace-box-width-151-v13-v1.pine, trace-polyline-width-151-v13-v1.pine, trace-table-width-negative1-v13-v1.pine, trace-table-width-151-v13-v1.pine, trace-drawing-count-501-v13-v1.pine, trace-time-offset-negative501-v13-v1.pine, trace-time-offset-5001-v13-v1.pine, trace-pivot-pivothigh-negative1-v13-v1.pine, trace-pivot-pivotlow-negative1-v13-v1.pine, trace-eigen-tiny-cleanup-v13-v1.pine, trace-merge-reversed-corners-v13-v1.pine, trace-eigen-complex-placeholder-v13-v1.pine, trace-array-linear-percentile101-v13-v1.pine, trace-table-zero-columns-v13-v1.pine.

[All attempts](outcomes-v13.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v5.json). Earlier responses remain retained.
