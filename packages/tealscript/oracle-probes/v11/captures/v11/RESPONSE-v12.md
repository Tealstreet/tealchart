# TradingView v11 capture response v12

23/59 sources captured; 23 retained attempts. Selected native outcomes: {'RUNS': 13, 'COMPILE-ERROR': 10}.

Frozen source master 2a413d81d1; canonical bundle-manifest-v9.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T15:24:37.335967+00:00; reportUTC: 2026-10-04T15:40:47.715677+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source defaults, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context cross-round-reuse-v1.json](cross-round-reuse-v1.json).

[Context matrix-startup-context-v1.json](matrix-startup-context-v1.json).

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
| hline-gradient-six-slots-v1.pine / 1 | RUNS | [raw](hline-gradient-six-slots-v1-attempt1.csv) {"MIDPOINT":"50"} |
| all-na-seed-matrix-v1.pine / 1 | RUNS | [raw](all-na-seed-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","FIXNAN_ALL_NA":"","MAX_ALL_NA":"","MIN_ALL_NA":""} |
| legacy-cross-hole-matrix-v1.pine / 1 | RUNS | [raw](legacy-cross-hole-matrix-v1-attempt1.csv) {"BAR_INDEX":"0","X":"","Y":"0","CROSSOVER_STATE":"-1","CROSSUNDER_STATE":"-1","CROSS_STATE":"-1"} |

Pending: analyst-target-context-matrix-v1.pine, chart-context-lifecycle-matrix-v1.pine, default-string-text-pair-v1.pine, inactive-if-string-pair-v1.pine, matrix-predicate-orientation-epsilon-v1.pine, modulo-assignment-sign-matrix-v1.pine, requested-confirmation-pair-v1.pine, numeric-array-every-float-method-v1.pine, numeric-array-every-float-namespace-v1.pine, numeric-array-every-int-method-v1.pine, numeric-array-every-int-namespace-v1.pine, numeric-array-some-float-method-v1.pine, numeric-array-some-float-namespace-v1.pine, numeric-array-some-int-method-v1.pine, numeric-array-some-int-namespace-v1.pine, plotbar-four-input-reorder-v1.pine, sparse-udf-history-pair-v1.pine, tagged-udt-equal-key-sort-v1.pine, visual-curves-point-copy-v6-v1.pine, visual-offset-bgcolor-v3-v1.pine, visual-offset-bgcolor-v4-v1.pine, visual-offset-bgcolor-v5-v1.pine, visual-offset-plotarrow-v3-v1.pine, visual-offset-plotarrow-v4-v1.pine, visual-offset-plotarrow-v5-v1.pine, visual-offsets-grouped-v3-v1.pine, visual-offsets-grouped-v4-v1.pine, visual-offsets-grouped-v5-v1.pine, visual-retention-four-families-v6-v1.pine, udt-variable-ticker-namespace-v1.pine, udt-variable-holder-method-control-v1.pine, provider6m-snapshot-pack-v6-v1.pine, provider6m-revision-pack-v6-v1.pine, provider6m-direct-feed-v6-v1.pine, provider-daily-counter-prefix-v5-v1.pine, provider-daily-direct-feed-v5-v2.pine.

[All attempts](outcomes-v11.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v12.json). Earlier responses remain retained.
