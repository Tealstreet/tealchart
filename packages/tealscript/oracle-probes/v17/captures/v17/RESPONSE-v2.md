# TradingView v17 capture response v2

15/15 sources captured; 31 retained attempts. Selected native outcomes: {'RUNS': 12, 'COMPILE-ERROR': 3}.

Frozen source master ca291fdcf4; canonical bundle-manifest-v8.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T20:45:31.895Z; reportUTC: 2026-10-04T21:09:01.487504+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source inputs/default flags, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context context-v1.md](context-v1.md).

[Context numeric-observations-v1.json](numeric-observations-v1.json).

[Context exact-v13-reuse-v1.json](exact-v13-reuse-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| log10-reference-literal-precision-v6-v1.pine / 1 | RUNS | [raw](log10-reference-literal-precision-v6-v1-attempt1.csv) {"REFERENCE_LITERAL":"0.2430380486862944","REFERENCE_SHORT":"0.2430380486862944","LOG10_VALUE":"0.24303804868629444","LOG10_RESIDUAL":"0.000005551115123125783","LITERAL_MINUS_SHORT_X1E18":"27.755575615628914","LITERAL_A":"0.1234567890123457","A_MINUS_SHORT_X1E18":"69.38893903907228","LITERAL_B":"1.7e-16","B_X1E18":"170","B_SCI_X1E18":"170","LOG_REFERENCE_LITERAL":"1.0986122886681096","LOG_RESIDUAL":"0.00002220446049250313","BAR_INDEX":"0","TIME_MS":"1788739200000"} |
| corpus-v56-150-self-declaration-exact-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/corpus-v56-150-self-declaration-exact-v1-attempt1-error.txt) CE10272 line 31: Undeclared identifier "ji" |
| corpus-v56-1042-self-declaration-exact-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/corpus-v56-1042-self-declaration-exact-v1-attempt1-error.txt) CE10272 line 33: Undeclared identifier "ji" |
| self-reference-own-declaration-minimal-v6-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/self-reference-own-declaration-minimal-v6-v1-attempt1-error.txt) CE10272 line 3: Undeclared identifier "x" |
| trace-line-width-0-v17-v1.pine / 1 | RUNS | [raw](trace-line-width-0-v17-v1-attempt1.csv) {"SCALE_MIN":"0","SCALE_MAX":"10","INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"0","CREATION_REACHED":""} |
| trace-line-width-151-v17-v1.pine / 1 | RUNS | [raw](trace-line-width-151-v17-v1-attempt1.csv) {"SCALE_MIN":"0","SCALE_MAX":"10","INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"151","CREATION_REACHED":""} |
| trace-box-width-151-v17-v1.pine / 1 | RUNS | [raw](trace-box-width-151-v17-v1-attempt1.csv) {"SCALE_MIN":"0","SCALE_MAX":"10","INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"151","CREATION_REACHED":""} |
| trace-polyline-width-151-v17-v1.pine / 1 | RUNS | [raw](trace-polyline-width-151-v17-v1-attempt1.csv) {"SCALE_MIN":"0","SCALE_MAX":"10","INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"151","CREATION_REACHED":""} |
| trace-table-border-width-negative1-v17-v1.pine / 1 | RUNS | [raw](trace-table-border-width-negative1-v17-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"-1","CELL_WRITES_REACHED":""} |
| trace-table-border-width-151-v17-v1.pine / 1 | RUNS | [raw](trace-table-border-width-151-v17-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"151","CELL_WRITES_REACHED":""} |
| trace-table-frame-width-negative1-v17-v1.pine / 1 | RUNS | [raw](trace-table-frame-width-negative1-v17-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"-1","CELL_WRITES_REACHED":""} |
| trace-table-frame-width-151-v17-v1.pine / 1 | RUNS | [raw](trace-table-frame-width-151-v17-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","REQUESTED_WIDTH":"151","CELL_WRITES_REACHED":""} |
| trace-eigen-complex-placeholder-v17-v1.pine / 1 | RUNS | [raw](trace-eigen-complex-placeholder-v17-v1-attempt1.csv) {"INPUT_BAR_INDEX":"0","RESULT_SIZE":"3","EIGEN0":"0","EIGEN1":"0","EIGEN2":"1"} |
| roc-toradians-reference-literals-v6-v1.pine / 1 | RUNS | [raw](roc-toradians-reference-literals-v6-v1-attempt1.csv) {"ROC_LITERAL_MINUS_SHORT":"55.51115123125783","ROC_LITERAL_MINUS_CONSTRUCTED":"-55.51115123125783","ROC_BUILTIN_MINUS_LITERAL":"","ROC_BUILTIN_MINUS_CONSTRUCTED":"","ROC_MULTIPLY_THEN_DIVIDE":"0.000008326672684688674","ROC_DIVIDE_THEN_MULTIPLY":"0.000005551115123125783","RADIANS_LITERAL_MINUS_SHORT":"45.102810375396984","RADIANS_LITERAL_MINUS_CONSTRUCTED":"-45.102810375396984","RADIANS_BUILTIN_MINUS_LITERAL":"0.000004163336342344337","RADIANS_BUILTIN_MINUS_CONSTRUCTED":"-3.469446951953614e-7","RADIANS_MULTIPLY_THEN_DIVIDE":"-3.469446951953614e-7","RADIANS_DIVIDE_CONSTANT_FIRST":"3.469446951953614e-7","ROC_SECOND_LITERAL_SHIFT":"-27.755575615628914","ROC_THIRD_LITERAL_SHIFT":"-13.877787807814457","RADIANS_HALF_LITERAL_SHIFT":"-27.755575615628914","TINY_DECIMAL_RUNTIME":"170","TINY_SCI_RUNTIME":"170","BAR_INDEX":"0","TIME_MS":"1788739200000"} |
| color-gradient-clamp-trace-v6-v1.pine / 17 | RUNS | [raw](color-gradient-clamp-trace-v6-v1-attempt17.csv) {"VALUE":"2","BOTTOM":"1","TOP":"1","RESULT_R":"0","RESULT_G":"0","RESULT_B":"0","RESULT_T":"100","RESULT_NA":"0","LOWER_R":"17","LOWER_G":"43","LOWER_B":"91","LOWER_T":"20","UPPER_R":"211","UPPER_G":"149","UPPER_B":"67","UPPER_T":"80","PINE_INDEX":"0","TIME_MS":"1788739200000"} |

Pending: none.

[All attempts](outcomes-v17.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v2.json). Earlier responses remain retained.
