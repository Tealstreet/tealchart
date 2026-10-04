# TradingView v10 capture response v10

5/13 sources captured; 5 retained attempts. Selected native outcomes: {'COMPILE-ERROR': 2, 'RUNS': 3}.

Frozen source master 03d5367aef; canonical bundle-manifest-v8.json. Exact frozen source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T14:39:31.301261+00:00; reportUTC: 2026-10-04T14:45:27.641924+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source defaults, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context tuple-request-context-v1.json](tuple-request-context-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| input-generic-computed-source-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-computed-source-v5-v1-attempt1-error.txt) None line 3: Arguments of input function must be of constant type, or 'source' builtin variables. |
| input-generic-source-metadata-v5-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/input-generic-source-metadata-v5-v1-attempt1-error.txt) None line 3: Too many arguments passed into the `input()` function call. Passed 8 arguments but expected 6. |
| input-generic-bare-volume-v6-v1.pine / 1 | RUNS | [raw](input-generic-bare-volume-v6-v1-attempt1.csv) {"OUTCOME":"77674.04"} |
| tuple-udf-64-plus63-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus63-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4895417.520000001"} |
| tuple-udf-64-plus64-v6-v1.pine / 1 | RUNS | [raw](tuple-udf-64-plus64-v6-v1-attempt1.csv) {"a sum":"4973154.560000001","b sum":"4973154.560000001"} |

Pending: plot-magnitude-cutoff-signed-v6-v1.pine, nvi-formula-holes-magnitude-v6-v1.pine, corpus-framework-exact-v5-v1.pine, sort-v56-815-exact-v5-v1.pine, sort-v56-977-exact-v5-v1.pine, sort-v56-1676-exact-v5-v1.pine, documented49-corpus-v7-258-exact-v6-v1.pine, ledger-909-max-bars-back-10001-v6-v1.pine.

[All attempts](outcomes-v10.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v10.json). Earlier responses remain retained.
