# TradingView v10 capture response v11

7/13 sources captured; 7 retained attempts. Selected native outcomes: {'COMPILE-ERROR': 2, 'RUNS': 5}.

Frozen source master 03d5367aef; canonical bundle-manifest-v8.json. Exact frozen source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T14:39:31.301261+00:00; reportUTC: 2026-10-04T14:54:03.319935+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source defaults, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context tuple-request-context-v1.json](tuple-request-context-v1.json).

[Context magnitude-context-v1.json](magnitude-context-v1.json).

[Context nvi-magnitude-context-v2.json](nvi-magnitude-context-v2.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| input-generic-computed-source-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-computed-source-v5-v1-attempt1-error.txt) None line 3: Arguments of input function must be of constant type, or 'source' builtin variables. |
| input-generic-source-metadata-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-source-metadata-v5-v1-attempt1-error.txt) None line 3: Too many arguments passed into the `input()` function call. Passed 8 arguments but expected 6. |
| input-generic-bare-volume-v6-v1.pine / 1 | RUNS | [raw](input-generic-bare-volume-v6-v1-attempt1.csv) {"OUTCOME":"77674.04"} |
| tuple-udf-64-plus63-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus63-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4895417.520000001"} |
| tuple-udf-64-plus64-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus64-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4973154.560000001"} |
| plot-magnitude-cutoff-signed-v6-v1.pine / 1 | RUNS | [raw](plot-magnitude-cutoff-signed-v6-v1-attempt1.csv) {"Raw signed magnitude":"9.26e+99","Magnitude scaled by 1e99":"9.260000000000002","Source is NA":"0","Magnitude case index":"0","Input bar index":"0"} |
| nvi-formula-holes-magnitude-v6-v1.pine / 1 | RUNS | [raw](nvi-formula-holes-magnitude-v6-v1-attempt1.csv) {"nvi_na_synthetic_doc":"1","nvi_na_synthetic_legacy":"1","NVI doc scaled by 1e99":"1e-99","NVI legacy scaled by 1e99":"1e-99","NVI doc source is NA":"0","NVI legacy source is NA":"0","Input synthetic price":"10","Input synthetic volume":"100","Input cycle phase":"0","Input bar index":"0"} |

Pending: corpus-framework-exact-v5-v1.pine, sort-v56-815-exact-v5-v1.pine, sort-v56-977-exact-v5-v1.pine, sort-v56-1676-exact-v5-v1.pine, documented49-corpus-v7-258-exact-v6-v1.pine, ledger-909-max-bars-back-10001-v6-v1.pine.

[All attempts](outcomes-v10.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v11.json). Earlier responses remain retained.
