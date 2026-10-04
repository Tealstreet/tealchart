# TradingView capture response v3

21/33 frozen v8 sources captured; 44 attempts retained. Selected native outcomes: {'RUNS': 19, 'RUNTIME-ERROR': 1, 'COMPILE-ERROR': 1}.

Frozen source masterac9a6ac1b3; canonical bundle-manifest-v12.json. Operator: Codex via Chrome MCP. Batch startUTC: 2026-10-04T11:06:39.502664+00:00. Last recorded export/error observationUTC: 2026-10-04T11:52:35.393Z. ReportUTC: 2026-10-04T11:53:55.357916+00:00. Capture continues.

Default chart BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off except explicit fixed-history replay contexts,mintick0.01. Native subscription is pro_premium. Source default inputs/styles, native initial OHLC/history/session, reset/export/cutoff timestamps and source hash are recorded per attempt. Each source was pasted unchanged into a fresh script; accepted sources have raw CSV, chart and Data Window evidence. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried. Native chart indices are separate from Pine indices; an unplotted execution index is UNKNOWN.

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

Pending sources: authority-framework-guarded-factor-v5-v1.pine, authority-framework-negative-control-v5-v1.pine, authority-sma-float-length-v6-v1.pine, authority-wma-division-length-v6-v1.pine, authority-atr-mutable-length-v6-v1.pine, authority-framework-na-search-v5-v1.pine, authority-label-published-constant-v6-v1.pine, authority-point-published-input-v5-v1.pine, authority-framework-reference-na-factorization-v5-v1.pine, corpus-input-float-sma-dminutes-v6-v1.pine, corpus-input-float-ema-half-length-v5-v1.pine, cmo-ready-zero-sum-v6-v1.pine.

[All attempts](outcomes-v8.json), [source-pinned plan](capture-plan-v1.json), [integrity and evidence SHA256](capture-integrity-v3.json). Earlier response versions remain retained. Context-specific visual/feed/event observations are separate supplements; unavailable contexts are recorded as NOT-EXERCISED, not native refusals. Optional library import execution requires an actual published ID; no source is published by this capture task.

Percentile/coordinate/table supplement v1: linear percentile source runs twice and its literal source_index0 is observed in both raw exports. Requested first eight rows, missing-current/single-hole columns and replacement control remain raw. Input-int label/box division sources and v5 point division run, with point offset output1.5. Explicit input.float box source is refused twice; exact CE10123 diagnostic is retained. Native label/box graphics and index map preserve observed placement without replacing it with an expected casting rule.

Both table repeated-merge and merge-once sources run with independent repeats. Native merged text/colSpan2 are preserved; repeated-merge boundary-crossing attempt1 remains retained and stable attempts2/3 follow. Geometry/visual observations have their own native UTC/host context, including any live-bar rollover effects. [Percentile/coordinate/table context](percentile-coordinate-table-context-summary-v1.json), [summary hashes](context-summary-sha256-v2.json). Prior marker/color and qualifier/retention supplements remain in responses v1/v2. No source repair, engine/baseline change or algorithm adjudication.
