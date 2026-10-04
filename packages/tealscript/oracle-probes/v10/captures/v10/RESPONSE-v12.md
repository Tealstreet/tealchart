# TradingView v10 capture response v12

13/13 sources captured; 13 retained attempts. Selected native outcomes: {'COMPILE-ERROR': 7, 'RUNS': 6}.

Frozen source master 03d5367aef; canonical bundle-manifest-v8.json. Exact frozen source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T14:39:31.301261+00:00; reportUTC: 2026-10-04T15:18:37.499448+00:00. Capture complete.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source defaults, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context tuple-request-context-v1.json](tuple-request-context-v1.json).

[Context magnitude-context-v1.json](magnitude-context-v1.json).

[Context nvi-magnitude-context-v2.json](nvi-magnitude-context-v2.json).

[Context framework-context-v1.json](framework-context-v1.json).

[Context framework-test-report-v1.txt](framework-test-report-v1.txt).

[Context prior-1657-context-v1.json](prior-1657-context-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| input-generic-computed-source-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-computed-source-v5-v1-attempt1-error.txt) None line 3: Arguments of input function must be of constant type, or 'source' builtin variables. |
| input-generic-source-metadata-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-source-metadata-v5-v1-attempt1-error.txt) None line 3: Too many arguments passed into the `input()` function call. Passed 8 arguments but expected 6. |
| input-generic-bare-volume-v6-v1.pine / 1 | RUNS | [raw](input-generic-bare-volume-v6-v1-attempt1.csv) {"OUTCOME":"77674.04"} |
| tuple-udf-64-plus63-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus63-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4895417.520000001"} |
| tuple-udf-64-plus64-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus64-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4973154.560000001"} |
| plot-magnitude-cutoff-signed-v6-v1.pine / 1 | RUNS | [raw](plot-magnitude-cutoff-signed-v6-v1-attempt1.csv) {"Raw signed magnitude":"9.26e+99","Magnitude scaled by 1e99":"9.260000000000002","Source is NA":"0","Magnitude case index":"0","Input bar index":"0"} |
| nvi-formula-holes-magnitude-v6-v1.pine / 1 | RUNS | [raw](nvi-formula-holes-magnitude-v6-v1-attempt1.csv) {"nvi_na_synthetic_doc":"1","nvi_na_synthetic_legacy":"1","NVI doc scaled by 1e99":"1e-99","NVI legacy scaled by 1e99":"1e-99","NVI doc source is NA":"0","NVI legacy source is NA":"0","Input synthetic price":"10","Input synthetic volume":"100","Input cycle phase":"0","Input bar index":"0"} |
| corpus-framework-exact-v5-v1.pine / 1 | RUNS | [raw](corpus-framework-exact-v5-v1-attempt1.csv) {} |
| sort-v56-815-exact-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/sort-v56-815-exact-v5-v1-attempt1-error.txt) None line 5: Cannot call 'array.sort_indices' with argument 'id'='values'. An argument of 'array<bool>' type was used but a 'array<float>' is expected. |
| sort-v56-977-exact-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/sort-v56-977-exact-v5-v1-attempt1-error.txt) None line 5: Cannot call 'array.sort' with argument 'id'='values'. An argument of 'array<box>' type was used but a 'array<float>' is expected. |
| sort-v56-1676-exact-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/sort-v56-1676-exact-v5-v1-attempt1-error.txt) None line 3: Could not find function or function reference 'array.new_polyline' |
| documented49-corpus-v7-258-exact-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/documented49-corpus-v7-258-exact-v6-v1-attempt1-error.txt) CE10123 line 5: Cannot call "operator +" with argument "expr0"="scale.left". An argument of "const scale_type" type was used but a "const string"  is expected. |
| ledger-909-max-bars-back-10001-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/ledger-909-max-bars-back-10001-v6-v1-attempt1-error.txt) CE10041 line 3: Invalid value "10001" for "num" parameter of the "max_bars_back()" function. It must be between 0 and 5000 |

Pending: none.

[All attempts](outcomes-v10.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v12.json). Earlier responses remain retained.
