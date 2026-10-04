# TradingView capture response v5

33/33 frozen v8 sources captured; 71 attempts retained. Selected native outcomes: {'RUNS': 28, 'RUNTIME-ERROR': 2, 'COMPILE-ERROR': 3}.

Frozen source masterac9a6ac1b3; canonical bundle-manifest-v12.json. Operator: Codex via Chrome MCP. Batch startUTC: 2026-10-04T11:06:39.502664+00:00. Last recorded export/error observationUTC: 2026-10-04T12:21:51.897Z. ReportUTC: 2026-10-04T12:23:02.708001+00:00. Capture complete.

Default chart BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off except explicit fixed-history replay contexts,mintick0.01. Native subscription is pro_premium. Default attempts use source defaults; separately labelled native parameter attempts retain actual inputs. Native initial OHLC/history/session, reset/export/cutoff timestamps and source hash are recorded per attempt. Each source was pasted unchanged into a fresh script; accepted sources have raw CSV, chart and Data Window evidence. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried. Native chart indices are separate from Pine indices; an unplotted execution index is UNKNOWN.

Raw Downloads bytes preserve blanks, strings and original headers. Compiler/runtime errors retain native code, text, location, first failing Pine bar if exposed, screenshot and warnings. Missing error-bar time is UNKNOWN rather than mapped from unrelated native chart indices. Siblings are executed independently. No source/manifest/handoff/prediction, local engine, full corpus/replay job or baseline is changed. Local preflight is not a native verdict. Output cannot establish an internal algorithm, complexity, optimizer behavior or inaccessible post-error state.

| Source / selected attempt | Native outcome | Raw evidence |
|---|---|---|
| marker-plotshape-metrics-v6-v1.pine / 2 | RUNS | [raw](marker-plotshape-metrics-v6-v1-attempt2.csv) {"Y_ZERO":"0","Y_ONE":"1","Y_TWO":"2","circle_tiny":"","square_tiny":"","triangleup_tiny":"","cross_tiny":"","circle_normal":"","square_normal":"","triangleup_normal":"","cross_normal":"","circle_huge":"","square_huge":"","triangleup_huge":"","cross_huge":""} |
| marker-plotchar-metrics-v6-v1.pine / 2 | RUNS | [raw](marker-plotchar-metrics-v6-v1-attempt2.csv) {"Y_ZERO":"0","Y_ONE":"1","Y_TWO":"2","char0_tiny":"","char1_tiny":"","char2_tiny":"","char3_tiny":"","char0_normal":"","char1_normal":"","char2_normal":"","char3_normal":"","char0_huge":"","char1_huge":"","char2_huge":"","char3_huge":""} |
| corpus-color-get-na-literal-v5-v1.pine / 2 | RUNS | [raw](corpus-color-get-na-literal-v5-v1-attempt2.csv) {"size":"101","color_code":"-1"} |
| corpus-color-get-na-rounded-v5-v1.pine / 2 | RUNS | [raw](corpus-color-get-na-rounded-v5-v1-attempt2.csv) {"size":"101","color_code":"-1"} |
| corpus-color-get-warmup-udf-v5-v1.pine / 2 | RUNS | [raw](corpus-color-get-warmup-udf-v5-v1-attempt2.csv) {"size":"101","color_code":"-1"} |
| corpus-color-get-finite-control-v5-v1.pine / 2 | RUNS | [raw](corpus-color-get-finite-control-v5-v1-attempt2.csv) {"size":"101","color_code":"100","first_blue":"1"} |
| corpus-color-get-na-size-control-v5-v1.pine / 2 | RUNS | [raw](corpus-color-get-na-size-control-v5-v1-attempt2.csv) {"size":"101","color_code":"-1"} |
| corpus-color-get-finite-oob-control-v5-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/corpus-color-get-finite-oob-control-v5-v1-attempt1-error.txt) RE10045; line5: Error on bar 0: In 'array.get()' function. Index 101 is out of bounds, array size is 101. |
| partial-g-bool-input-numeric-return-v1.pine / 3 | RUNS | [raw](partial-g-bool-input-numeric-return-v1-attempt3.csv) {"Plot":"1"} |
| partial-g-bool-simple-numeric-return-v1.pine / 2 | RUNS | [raw](partial-g-bool-simple-numeric-return-v1-attempt2.csv) {"Plot":"1"} |
| partial-g-bool-const-numeric-control-v1.pine / 2 | RUNS | [raw](partial-g-bool-const-numeric-control-v1-attempt2.csv) {"Plot":"1"} |
| partial-g-label-eviction-count-v1.pine / 2 | RUNS | [raw](partial-g-label-eviction-count-v1-attempt2.csv) {"VISIBLE_COUNT":"1","OLDEST_INDEX":"0"} |
| partial-g-line-eviction-count-v1.pine / 2 | RUNS | [raw](partial-g-line-eviction-count-v1-attempt2.csv) {"VISIBLE_COUNT":"1","OLDEST_INDEX":"0"} |
| partial-g-const-table-series-v1.pine / 2 | RUNS | [raw](partial-g-const-table-series-v1-attempt2.csv) {"Plot":"1"} |
| linear-percentile-missing-current-len3-v1.pine / 2 | RUNS | [raw](linear-percentile-missing-current-len3-v1-attempt2.csv) {"source_len3":"1","linear_len3_pct75_missing_current":"","linear_len3_pct75_replacement7":"","source_len4":"10","linear_len4_pct75_single_hole":"","source_index":"0"} |
| authority-label-division-v6-v1.pine / 3 | RUNS | [raw](authority-label-division-v6-v1-attempt3.csv) {"Plot":"77674.04"} |
| authority-point-division-v5-v1.pine / 2 | RUNS | [raw](authority-point-division-v5-v1-attempt2.csv) {"Plot":"1.5"} |
| authority-box-division-v6-v1.pine / 2 | RUNS | [raw](authority-box-division-v6-v1-attempt2.csv) {"Plot":"77674.04"} |
| authority-box-explicit-float-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/authority-box-explicit-float-v6-v1-attempt2-error.txt) CE10123; line5: Cannot call "box.new" with argument "right"="call "operator +" (series float)". An argument of "series float" type was used but a "series int"  is expected. |
| authority-table-remerge-v5-v1.pine / 3 | RUNS | [raw](authority-table-remerge-v5-v1-attempt3.csv) {"Plot":"77674.04"} |
| authority-table-remerge-once-v5-v1.pine / 2 | RUNS | [raw](authority-table-remerge-once-v5-v1-attempt2.csv) {"Plot":"77674.04"} |
| authority-framework-guarded-factor-v5-v1.pine / 2 | RUNS | [raw](authority-framework-guarded-factor-v5-v1-attempt2.csv) {"Plot":"0"} |
| authority-framework-negative-control-v5-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/authority-framework-negative-control-v5-v1-attempt2-error.txt) RE10045; line3: Error on bar 0: In 'array.get()' function. Index -1 is out of bounds, array size is 1. |
| authority-sma-float-length-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/authority-sma-float-length-v6-v1-attempt2-error.txt) CE10123; line4: Cannot call "ta.sma" with argument "length"="length". An argument of "input float" type was used but a "series int"  is expected. |
| authority-wma-division-length-v6-v1.pine / 2 | RUNS | [raw](authority-wma-division-length-v6-v1-attempt2.csv) {"Plot":""} |
| authority-atr-mutable-length-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/authority-atr-mutable-length-v6-v1-attempt2-error.txt) CE10123; line6: Cannot call "ta.atr" with argument "length"="length". An argument of "series int" type was used but a "simple int"  is expected. |
| authority-framework-na-search-v5-v1.pine / 2 | RUNS | [raw](authority-framework-na-search-v5-v1-attempt2.csv) {"includes":"0","indexof":"-1"} |
| authority-label-published-constant-v6-v1.pine / 2 | RUNS | [raw](authority-label-published-constant-v6-v1-attempt2.csv) {"Plot":"77674.04"} |
| authority-point-published-input-v5-v1.pine / 2 | RUNS | [raw](authority-point-published-input-v5-v1-attempt2.csv) {"Plot":"24"} |
| authority-framework-reference-na-factorization-v5-v1.pine / 2 | RUNS | [raw](authority-framework-reference-na-factorization-v5-v1-attempt2.csv) {"Plot":"2"} |
| corpus-input-float-sma-dminutes-v6-v1.pine / 4 | RUNS | [raw](corpus-input-float-sma-dminutes-v6-v1-attempt4.csv) {"OUTCOME":"","INPUT_LENGTH":"977.5","FLOOR_CONTROL":"","CEIL_CONTROL":"","INPUT_CLOSE":"77674.04","BAR_INDEX":"0"} |
| corpus-input-float-ema-half-length-v5-v1.pine / 3 | RUNS | [raw](corpus-input-float-ema-half-length-v5-v1-attempt3.csv) {"OUTCOME":"","INPUT_LENGTH":"15.5","FLOOR_CONTROL":"","CEIL_CONTROL":"","INPUT_CLOSE":"77674.04","BAR_INDEX":"0"} |
| cmo-ready-zero-sum-v6-v1.pine / 2 | RUNS | [raw](cmo-ready-zero-sum-v6-v1-attempt2.csv) {"Source":"0","Gains":"","Losses":"","Ready":"0","Builtin":"","Formula":"","Ready builtin is NA":"","Ready formula is NA":"","Moving control":""} |

Pending sources: none.

[All attempts](outcomes-v8.json), [source-pinned plan](capture-plan-v1.json), [integrity and evidence SHA256](capture-integrity-v5.json). Earlier response versions remain retained. Context-specific visual/feed/event observations are separate supplements; unavailable contexts are recorded as NOT-EXERCISED, not native refusals. Optional library import execution requires an actual published ID; no source is published by this capture task.

The selected SMA/EMA rows above are parameter captures. Their default attempts1/2 remain in all-attempts metadata and raw CSVs. SMA attempt4 records native input6.51 and INPUT_LENGTH977.5; EMA attempt3 records native input31 and INPUT_LENGTH15.5. SMA attempt3 is retained as a UI-mismatch attempt with actual input1 and INPUT_LENGTH150; it is not the requested parameter receipt. Both exact sources were admitted unchanged. BAR_INDEX starts at literal0 in these captures; each has more than2048 completed bars. Numerical target/floor/ceil differences belong to these exact inputs and history.

CMO attempts1/2 preserve startup and ready-window rows. In the observed Ready1/Gains0/Losses0 window, Builtin and Formula are blank, both ready NA flags are1, and Moving control is100. Its Pine index0 origin is UNKNOWN because the source does not export that index.

[Derived input/CMO contexts](derived-input-cmo-context-summary-v1.json), [all context summaries and SHA256](context-summary-sha256-v4.json). Earlier marker, color, qualifier, retention, percentile, coordinate and table observations remain in their versioned supplements. Primary captures for all33 sources are recorded; claims stay limited to each observed context.
