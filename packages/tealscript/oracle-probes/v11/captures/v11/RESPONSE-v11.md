# TradingView v11 capture response v11

10/59 sources captured; 10 retained attempts. Selected native outcomes: {'RUNS': 6, 'COMPILE-ERROR': 4}.

Frozen source master 2a413d81d1; canonical bundle-manifest-v9.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T15:24:37.335967+00:00; reportUTC: 2026-10-04T15:31:36.566266+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source defaults, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context cross-round-reuse-v1.json](cross-round-reuse-v1.json).

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

Pending: ternary-int-string-v6-v1.pine, ternary-float-bool-v6-v1.pine, ternary-color-int-v6-v1.pine, ternary-string-bool-v6-v1.pine, ternary-bool-int-v6-v1.pine, ternary-color-string-v6-v1.pine, ternary-compatible-v6-control-v1.pine, source-window-hole-matrix-v1.pine, source-stateful-hole-matrix-v1.pine, array-linear-standardize-matrix-v1.pine, analyst-target-context-matrix-v1.pine, hline-gradient-six-slots-v1.pine, all-na-seed-matrix-v1.pine, legacy-cross-hole-matrix-v1.pine, chart-context-lifecycle-matrix-v1.pine, default-string-text-pair-v1.pine, inactive-if-string-pair-v1.pine, matrix-predicate-orientation-epsilon-v1.pine, modulo-assignment-sign-matrix-v1.pine, requested-confirmation-pair-v1.pine, numeric-array-every-float-method-v1.pine, numeric-array-every-float-namespace-v1.pine, numeric-array-every-int-method-v1.pine, numeric-array-every-int-namespace-v1.pine, numeric-array-some-float-method-v1.pine, numeric-array-some-float-namespace-v1.pine, numeric-array-some-int-method-v1.pine, numeric-array-some-int-namespace-v1.pine, plotbar-four-input-reorder-v1.pine, sparse-udf-history-pair-v1.pine, tagged-udt-equal-key-sort-v1.pine, visual-curves-point-copy-v6-v1.pine, visual-offset-bgcolor-v3-v1.pine, visual-offset-bgcolor-v4-v1.pine, visual-offset-bgcolor-v5-v1.pine, visual-offset-plotarrow-v3-v1.pine, visual-offset-plotarrow-v4-v1.pine, visual-offset-plotarrow-v5-v1.pine, visual-offsets-grouped-v3-v1.pine, visual-offsets-grouped-v4-v1.pine, visual-offsets-grouped-v5-v1.pine, visual-retention-four-families-v6-v1.pine, udt-variable-ticker-namespace-v1.pine, udt-variable-holder-method-control-v1.pine, provider6m-snapshot-pack-v6-v1.pine, provider6m-revision-pack-v6-v1.pine, provider6m-direct-feed-v6-v1.pine, provider-daily-counter-prefix-v5-v1.pine, provider-daily-direct-feed-v5-v2.pine.

[All attempts](outcomes-v11.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v11.json). Earlier responses remain retained.
