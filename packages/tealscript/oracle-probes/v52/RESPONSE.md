# TradingView round 52 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes were unchanged. Defaults were retained except the separately listed input/feed attempts, whose actual inputs and contexts are stored in native.json.

Default context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 92 across 73 authored sources. Runs: 38; compile refusals: 54; runtime refusals: 0; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. Where present, chart-export.csv is the original Download chart data UI file, with its native headers and unmodified bytes; chart-export.json records its download identity/hash. The additional plots.csv uses TradingView’s chart PlotList through Chrome MCP serialization; no TealScript evaluator produced these values. CAPTURE_IS_OPEN_BAR separates the currently open candle from closed rows. Original unbounded captures include startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows. Separate UI-export receipts can reuse TradingView’s cached mature history; startupCovered and firstSourceIndex record their actual coverage, and they do not replace the original startup evidence. Sources specifying calc_bars_count=32 retain only the reached 32 calculated bars (typically 31 closed plus one live); their original index origin is retained, with no invented startup rows. They confer only the coverage in their instructions.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe / attempt | Context | Native outcome | Rows | Evidence |
| --- | --- | --- | ---: | --- |
| array-bool-join-control-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/array-bool-join-control/defaults-ui-export/native.json), [screenshot](captures/v52/array-bool-join-control/defaults-ui-export/settings.jpg) |
| array-bool-join-control-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/array-bool-join-control/native.json), [screenshot](captures/v52/array-bool-join-control/settings.jpg) |
| array-bool-join-namespace-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/array-bool-join-namespace/native.json), [screenshot](captures/v52/array-bool-join-namespace/diagnostic.jpg) |
| array-bool-join-method-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/array-bool-join-method/native.json), [screenshot](captures/v52/array-bool-join-method/diagnostic.jpg) |
| array-sort-indices-control-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/array-sort-indices-control/defaults-ui-export/native.json), [screenshot](captures/v52/array-sort-indices-control/defaults-ui-export/settings.jpg) |
| array-sort-indices-control-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/array-sort-indices-control/native.json), [screenshot](captures/v52/array-sort-indices-control/settings.jpg) |
| array-sort-indices-namespace-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/array-sort-indices-namespace/native.json), [screenshot](captures/v52/array-sort-indices-namespace/diagnostic.jpg) |
| array-sort-indices-method-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/array-sort-indices-method/native.json), [screenshot](captures/v52/array-sort-indices-method/diagnostic.jpg) |
| gradient-missing-lower-endpoint-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/gradient-missing-lower-endpoint/defaults-ui-export/native.json), [screenshot](captures/v52/gradient-missing-lower-endpoint/defaults-ui-export/settings.jpg) |
| gradient-missing-lower-endpoint-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/gradient-missing-lower-endpoint/native.json), [screenshot](captures/v52/gradient-missing-lower-endpoint/settings.jpg) |
| plot-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plot-format-base-type/native.json), [screenshot](captures/v52/plot-format-base-type/diagnostic.jpg) |
| plot-series-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plot-series-base-type/native.json), [screenshot](captures/v52/plot-series-base-type/diagnostic.jpg) |
| plotarrow-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotarrow-format-base-type/native.json), [screenshot](captures/v52/plotarrow-format-base-type/diagnostic.jpg) |
| plotbar-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotbar-format-base-type/native.json), [screenshot](captures/v52/plotbar-format-base-type/diagnostic.jpg) |
| plotcandle-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotcandle-format-base-type/native.json), [screenshot](captures/v52/plotcandle-format-base-type/diagnostic.jpg) |
| plotchar-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotchar-format-base-type/native.json), [screenshot](captures/v52/plotchar-format-base-type/diagnostic.jpg) |
| plotchar-location-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotchar-location-base-type/native.json), [screenshot](captures/v52/plotchar-location-base-type/diagnostic.jpg) |
| plotchar-series-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotchar-series-base-type/native.json), [screenshot](captures/v52/plotchar-series-base-type/diagnostic.jpg) |
| plotchar-size-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotchar-size-base-type/native.json), [screenshot](captures/v52/plotchar-size-base-type/diagnostic.jpg) |
| plotshape-format-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotshape-format-base-type/native.json), [screenshot](captures/v52/plotshape-format-base-type/diagnostic.jpg) |
| plotshape-location-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotshape-location-base-type/native.json), [screenshot](captures/v52/plotshape-location-base-type/diagnostic.jpg) |
| plotshape-series-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotshape-series-base-type/native.json), [screenshot](captures/v52/plotshape-series-base-type/diagnostic.jpg) |
| plotshape-size-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotshape-size-base-type/native.json), [screenshot](captures/v52/plotshape-size-base-type/diagnostic.jpg) |
| plotshape-style-base-type-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/plotshape-style-base-type/native.json), [screenshot](captures/v52/plotshape-style-base-type/diagnostic.jpg) |
| format-union-enum-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/format-union-enum/native.json), [screenshot](captures/v52/format-union-enum/diagnostic.jpg) |
| format-union-matrix-int-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/format-union-matrix-int/native.json), [screenshot](captures/v52/format-union-matrix-int/diagnostic.jpg) |
| format-union-matrix-float-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/format-union-matrix-float/native.json), [screenshot](captures/v52/format-union-matrix-float/diagnostic.jpg) |
| format-union-matrix-bool-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/format-union-matrix-bool/native.json), [screenshot](captures/v52/format-union-matrix-bool/diagnostic.jpg) |
| format-union-matrix-string-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/format-union-matrix-string/native.json), [screenshot](captures/v52/format-union-matrix-string/diagnostic.jpg) |
| tostring-union-bool-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-bool/native.json), [screenshot](captures/v52/tostring-union-bool/diagnostic.jpg) |
| tostring-union-string-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-string/native.json), [screenshot](captures/v52/tostring-union-string/diagnostic.jpg) |
| tostring-union-enum-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-enum/native.json), [screenshot](captures/v52/tostring-union-enum/diagnostic.jpg) |
| tostring-union-array-bool-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-array-bool/native.json), [screenshot](captures/v52/tostring-union-array-bool/diagnostic.jpg) |
| tostring-union-array-string-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-array-string/native.json), [screenshot](captures/v52/tostring-union-array-string/diagnostic.jpg) |
| tostring-union-matrix-bool-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-matrix-bool/native.json), [screenshot](captures/v52/tostring-union-matrix-bool/diagnostic.jpg) |
| tostring-union-matrix-string-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/tostring-union-matrix-string/native.json), [screenshot](captures/v52/tostring-union-matrix-string/diagnostic.jpg) |
| falling-float-length-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/falling-float-length/native.json), [screenshot](captures/v52/falling-float-length/diagnostic.jpg) |
| kc-float-length-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kc-float-length/native.json), [screenshot](captures/v52/kc-float-length/diagnostic.jpg) |
| kc-series-mult-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kc-series-mult/native.json), [screenshot](captures/v52/kc-series-mult/diagnostic.jpg) |
| kc-series-usetruerange-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kc-series-usetruerange/native.json), [screenshot](captures/v52/kc-series-usetruerange/diagnostic.jpg) |
| kcw-float-length-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kcw-float-length/native.json), [screenshot](captures/v52/kcw-float-length/diagnostic.jpg) |
| kcw-series-mult-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kcw-series-mult/native.json), [screenshot](captures/v52/kcw-series-mult/diagnostic.jpg) |
| kcw-series-usetruerange-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/kcw-series-usetruerange/native.json), [screenshot](captures/v52/kcw-series-usetruerange/diagnostic.jpg) |
| qualifier-format-time-consumer-control-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-format-time-consumer-control/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-format-time-consumer-control/defaults-ui-export/settings.jpg) |
| qualifier-format-time-consumer-control-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-format-time-consumer-control/native.json), [screenshot](captures/v52/qualifier-format-time-consumer-control/settings.jpg) |
| qualifier-format-time-const-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-format-time-const-active/native.json), [screenshot](captures/v52/qualifier-format-time-const-active/diagnostic.jpg) |
| qualifier-format-time-input-time-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-format-time-input-time-active/native.json), [screenshot](captures/v52/qualifier-format-time-input-time-active/diagnostic.jpg) |
| qualifier-format-time-input-format-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-format-time-input-format-active/native.json), [screenshot](captures/v52/qualifier-format-time-input-format-active/diagnostic.jpg) |
| qualifier-format-time-const-title-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-format-time-const-title/native.json), [screenshot](captures/v52/qualifier-format-time-const-title/diagnostic.jpg) |
| qualifier-format-time-const-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-format-time-const-simple/native.json), [screenshot](captures/v52/qualifier-format-time-const-simple/diagnostic.jpg) |
| qualifier-match-consumer-control-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-consumer-control/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-match-consumer-control/defaults-ui-export/settings.jpg) |
| qualifier-match-consumer-control-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-consumer-control/native.json), [screenshot](captures/v52/qualifier-match-consumer-control/settings.jpg) |
| qualifier-match-const-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-match-const-active/native.json), [screenshot](captures/v52/qualifier-match-const-active/diagnostic.jpg) |
| qualifier-match-const-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-const-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-match-const-simple/defaults-ui-export/settings.jpg) |
| qualifier-match-const-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-const-simple/native.json), [screenshot](captures/v52/qualifier-match-const-simple/settings.jpg) |
| qualifier-match-input-source-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-match-input-source-active/native.json), [screenshot](captures/v52/qualifier-match-input-source-active/diagnostic.jpg) |
| qualifier-match-input-source-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-match-input-source-simple/defaults-ui-export/settings.jpg) |
| qualifier-match-input-source-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-input-source-simple/native.json), [screenshot](captures/v52/qualifier-match-input-source-simple/settings.jpg) |
| qualifier-match-input-regex-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-match-input-regex-active/native.json), [screenshot](captures/v52/qualifier-match-input-regex-active/diagnostic.jpg) |
| qualifier-match-input-regex-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-input-regex-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-match-input-regex-simple/defaults-ui-export/settings.jpg) |
| qualifier-match-input-regex-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-match-input-regex-simple/native.json), [screenshot](captures/v52/qualifier-match-input-regex-simple/settings.jpg) |
| qualifier-match-const-title-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-match-const-title/native.json), [screenshot](captures/v52/qualifier-match-const-title/diagnostic.jpg) |
| qualifier-length-input-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-length-input-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-length-input-simple/defaults-ui-export/settings.jpg) |
| qualifier-length-input-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-length-input-simple/native.json), [screenshot](captures/v52/qualifier-length-input-simple/settings.jpg) |
| qualifier-length-input-width-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-length-input-width/native.json), [screenshot](captures/v52/qualifier-length-input-width/diagnostic.jpg) |
| qualifier-pos-input-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 33 | [native](captures/v52/qualifier-pos-input-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-pos-input-simple/defaults-ui-export/settings.jpg) |
| qualifier-pos-input-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-pos-input-simple/native.json), [screenshot](captures/v52/qualifier-pos-input-simple/settings.jpg) |
| qualifier-pos-input-width-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-pos-input-width/native.json), [screenshot](captures/v52/qualifier-pos-input-width/diagnostic.jpg) |
| qualifier-contains-input-source-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-contains-input-source-active/native.json), [screenshot](captures/v52/qualifier-contains-input-source-active/diagnostic.jpg) |
| qualifier-contains-input-source-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-contains-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-contains-input-source-simple/defaults-ui-export/settings.jpg) |
| qualifier-contains-input-source-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-contains-input-source-simple/native.json), [screenshot](captures/v52/qualifier-contains-input-source-simple/settings.jpg) |
| qualifier-contains-input-pattern-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-contains-input-pattern-active/native.json), [screenshot](captures/v52/qualifier-contains-input-pattern-active/diagnostic.jpg) |
| qualifier-contains-input-pattern-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-contains-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-contains-input-pattern-simple/defaults-ui-export/settings.jpg) |
| qualifier-contains-input-pattern-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-contains-input-pattern-simple/native.json), [screenshot](captures/v52/qualifier-contains-input-pattern-simple/settings.jpg) |
| qualifier-startswith-input-source-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-startswith-input-source-active/native.json), [screenshot](captures/v52/qualifier-startswith-input-source-active/diagnostic.jpg) |
| qualifier-startswith-input-source-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-startswith-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-startswith-input-source-simple/defaults-ui-export/settings.jpg) |
| qualifier-startswith-input-source-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-startswith-input-source-simple/native.json), [screenshot](captures/v52/qualifier-startswith-input-source-simple/settings.jpg) |
| qualifier-startswith-input-pattern-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-startswith-input-pattern-active/native.json), [screenshot](captures/v52/qualifier-startswith-input-pattern-active/diagnostic.jpg) |
| qualifier-startswith-input-pattern-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-startswith-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-startswith-input-pattern-simple/defaults-ui-export/settings.jpg) |
| qualifier-startswith-input-pattern-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-startswith-input-pattern-simple/native.json), [screenshot](captures/v52/qualifier-startswith-input-pattern-simple/settings.jpg) |
| qualifier-endswith-input-source-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-endswith-input-source-active/native.json), [screenshot](captures/v52/qualifier-endswith-input-source-active/diagnostic.jpg) |
| qualifier-endswith-input-source-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-endswith-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-endswith-input-source-simple/defaults-ui-export/settings.jpg) |
| qualifier-endswith-input-source-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-endswith-input-source-simple/native.json), [screenshot](captures/v52/qualifier-endswith-input-source-simple/settings.jpg) |
| qualifier-endswith-input-pattern-active-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v52/qualifier-endswith-input-pattern-active/native.json), [screenshot](captures/v52/qualifier-endswith-input-pattern-active/diagnostic.jpg) |
| qualifier-endswith-input-pattern-simple-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-endswith-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v52/qualifier-endswith-input-pattern-simple/defaults-ui-export/settings.jpg) |
| qualifier-endswith-input-pattern-simple-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/qualifier-endswith-input-pattern-simple/native.json), [screenshot](captures/v52/qualifier-endswith-input-pattern-simple/settings.jpg) |
| udt-search-indexof-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-indexof/defaults-ui-export/native.json), [screenshot](captures/v52/udt-search-indexof/defaults-ui-export/settings.jpg) |
| udt-search-indexof-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-indexof/native.json), [screenshot](captures/v52/udt-search-indexof/settings.jpg) |
| udt-search-lastindexof-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-lastindexof/defaults-ui-export/native.json), [screenshot](captures/v52/udt-search-lastindexof/defaults-ui-export/settings.jpg) |
| udt-search-lastindexof-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-lastindexof/native.json), [screenshot](captures/v52/udt-search-lastindexof/settings.jpg) |
| udt-search-includes-v52-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-includes/defaults-ui-export/native.json), [screenshot](captures/v52/udt-search-includes/defaults-ui-export/settings.jpg) |
| udt-search-includes-v52-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v52/udt-search-includes/native.json), [screenshot](captures/v52/udt-search-includes/settings.jpg) |

## Exact diagnostics

### array-bool-join-namespace-v52-v1.pine

CE10123; start {'line': 4, 'column': 28}; end {'line': 4, 'column': 34}

Cannot call "array.join" with argument "id"="values". An argument of "array<bool>" type was used but a "array<float>"  is expected.

### array-bool-join-namespace-v52-v1.pine

CE10122; start {'line': 9, 'column': 31}; end {'line': 9, 'column': 37}

Cannot call "log.info" with argument "arg_1"="joined". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### array-bool-join-namespace-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### array-bool-join-method-v52-v1.pine

CE10123; start {'line': 4, 'column': 17}; end {'line': 4, 'column': 23}

Cannot call "array.join" with argument "id"="values". An argument of "array<bool>" type was used but a "array<float>"  is expected.

### array-bool-join-method-v52-v1.pine

CE10122; start {'line': 9, 'column': 31}; end {'line': 9, 'column': 37}

Cannot call "log.info" with argument "arg_1"="joined". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### array-bool-join-method-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### array-sort-indices-namespace-v52-v1.pine

CE10123; start {'line': 8, 'column': 49}; end {'line': 8, 'column': 59}

Cannot call "array.sort_indices" with argument "sort_field"="fieldIndex". An argument of "series int" type was used but a "const int"  is expected.

### array-sort-indices-namespace-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### array-sort-indices-method-v52-v1.pine

CE10123; start {'line': 8, 'column': 42}; end {'line': 8, 'column': 52}

Cannot call "array.sort_indices" with argument "sort_field"="fieldIndex". An argument of "series int" type was used but a "const int"  is expected.

### array-sort-indices-method-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plot-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 25}; end {'line': 3, 'column': 26}

Cannot call "plot" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plot-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plot-series-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 13}; end {'line': 3, 'column': 18}

Cannot call "plot" with argument "series"="bad". An argument of "literal string" type was used but a "series float"  is expected.

### plot-series-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotarrow-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 30}; end {'line': 3, 'column': 31}

Cannot call "plotarrow" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotarrow-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotbar-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 56}; end {'line': 3, 'column': 57}

Cannot call "plotbar" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotbar-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotcandle-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 59}; end {'line': 3, 'column': 60}

Cannot call "plotcandle" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotcandle-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotchar-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 30}; end {'line': 3, 'column': 31}

Cannot call "plotchar" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotchar-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotchar-location-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 32}; end {'line': 3, 'column': 33}

Cannot call "plotchar" with argument "location"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotchar-location-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotchar-series-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 17}; end {'line': 3, 'column': 22}

Cannot call "plotchar" with argument "series"="bad". An argument of "literal string" type was used but a "series bool"  is expected.

### plotchar-series-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotchar-size-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 28}; end {'line': 3, 'column': 29}

Cannot call "plotchar" with argument "size"="7". An argument of "literal int" type was used but a "const string"  is expected.

### plotchar-size-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotshape-format-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 31}; end {'line': 3, 'column': 32}

Cannot call "plotshape" with argument "format"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotshape-format-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotshape-location-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 33}; end {'line': 3, 'column': 34}

Cannot call "plotshape" with argument "location"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotshape-location-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotshape-series-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 18}; end {'line': 3, 'column': 23}

Cannot call "plotshape" with argument "series"="bad". An argument of "literal string" type was used but a "series bool"  is expected.

### plotshape-series-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotshape-size-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 29}; end {'line': 3, 'column': 30}

Cannot call "plotshape" with argument "size"="7". An argument of "literal int" type was used but a "const string"  is expected.

### plotshape-size-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### plotshape-style-base-type-v52-v1.pine

CE10123; start {'line': 3, 'column': 30}; end {'line': 3, 'column': 31}

Cannot call "plotshape" with argument "style"="7". An argument of "literal int" type was used but a "input string"  is expected.

### plotshape-style-base-type-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-union-enum-v52-v1.pine

CE10124; start {'line': 5, 'column': 27}; end {'line': 5, 'column': 41}

Cannot call "str.format()" to collect the "one" field from an object of the "ReviewEnum" type. The field"s type is "const ReviewEnum", but the "simple int/float/bool/string" type is expected.

### format-union-enum-v52-v1.pine

CE10122; start {'line': 10, 'column': 30}; end {'line': 10, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### format-union-enum-v52-v1.pine

None; start None; end None

Cannot call "{funId}()" to collect the "{field}" field from an object of the "{name}" type. The field"s type is "{argumentType}", but the "{expectedType}" type is expected.

### format-union-matrix-int-v52-v1.pine

CE10122; start {'line': 3, 'column': 27}; end {'line': 3, 'column': 51}

Cannot call "str.format" with argument "arg_1"="call "matrix.new" (matrix<int>)". An argument of "matrix<int>" type was used but one from "simple int/float/bool/string" is expected

### format-union-matrix-int-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but one from "{expectedType}" is expected

### format-union-matrix-float-v52-v1.pine

CE10122; start {'line': 3, 'column': 27}; end {'line': 3, 'column': 55}

Cannot call "str.format" with argument "arg_1"="call "matrix.new" (matrix<float>)". An argument of "matrix<float>" type was used but one from "simple int/float/bool/string" is expected

### format-union-matrix-float-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but one from "{expectedType}" is expected

### format-union-matrix-bool-v52-v1.pine

CE10122; start {'line': 3, 'column': 27}; end {'line': 3, 'column': 55}

Cannot call "str.format" with argument "arg_1"="call "matrix.new" (matrix<bool>)". An argument of "matrix<bool>" type was used but one from "simple int/float/bool/string" is expected

### format-union-matrix-bool-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but one from "{expectedType}" is expected

### format-union-matrix-string-v52-v1.pine

CE10122; start {'line': 3, 'column': 27}; end {'line': 3, 'column': 58}

Cannot call "str.format" with argument "arg_1"="call "matrix.new" (matrix<string>)". An argument of "matrix<string>" type was used but one from "simple int/float/bool/string" is expected

### format-union-matrix-string-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but one from "{expectedType}" is expected

### tostring-union-bool-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 26}

Cannot call "str.tostring" with argument "value"="true". An argument of "literal bool" type was used but a "simple float"  is expected.

### tostring-union-bool-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-bool-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-union-string-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 27}

Cannot call "str.tostring" with argument "value"="abc". An argument of "literal string" type was used but a "simple float"  is expected.

### tostring-union-string-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-enum-v52-v1.pine

CE10123; start {'line': 5, 'column': 22}; end {'line': 5, 'column': 36}

Cannot call "str.tostring" with argument "value"="ReviewEnum.one". An argument of "const ReviewEnum" type was used but a "simple float"  is expected.

### tostring-union-enum-v52-v1.pine

CE10122; start {'line': 10, 'column': 30}; end {'line': 10, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-array-bool-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 46}

Cannot call "str.tostring" with argument "value"="call "array.new" (array<bool>)". An argument of "array<bool>" type was used but a "simple float"  is expected.

### tostring-union-array-bool-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-array-string-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 49}

Cannot call "str.tostring" with argument "value"="call "array.new" (array<string>)". An argument of "array<string>" type was used but a "simple float"  is expected.

### tostring-union-array-string-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-matrix-bool-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 50}

Cannot call "str.tostring" with argument "value"="call "matrix.new" (matrix<bool>)". An argument of "matrix<bool>" type was used but a "simple float"  is expected.

### tostring-union-matrix-bool-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### tostring-union-matrix-string-v52-v1.pine

CE10123; start {'line': 3, 'column': 22}; end {'line': 3, 'column': 53}

Cannot call "str.tostring" with argument "value"="call "matrix.new" (matrix<string>)". An argument of "matrix<string>" type was used but a "simple float"  is expected.

### tostring-union-matrix-string-v52-v1.pine

CE10122; start {'line': 8, 'column': 30}; end {'line': 8, 'column': 35}

Cannot call "log.info" with argument "arg_1"="value". An argument of "unknown" type was used but one from "series int/float/bool/string/array<int/float/bool/string>" is expected

### falling-float-length-v52-v1.pine

CE10123; start {'line': 3, 'column': 24}; end {'line': 3, 'column': 27}

Cannot call "ta.falling" with argument "length"="3". An argument of "literal float" type was used but a "series int"  is expected.

### falling-float-length-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kc-float-length-v52-v1.pine

CE10123; start {'line': 3, 'column': 39}; end {'line': 3, 'column': 42}

Cannot call "ta.kc" with argument "length"="3". An argument of "literal float" type was used but a "simple int"  is expected.

### kc-float-length-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kc-series-mult-v52-v1.pine

CE10123; start {'line': 4, 'column': 61}; end {'line': 4, 'column': 78}

Cannot call "ta.kc" with argument "mult"="candidateArgument". An argument of "series int" type was used but a "simple float"  is expected.

### kc-series-mult-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kc-series-usetruerange-v52-v1.pine

CE10123; start {'line': 4, 'column': 79}; end {'line': 4, 'column': 96}

Cannot call "ta.kc" with argument "useTrueRange"="candidateArgument". An argument of "series bool" type was used but a "simple bool"  is expected.

### kc-series-usetruerange-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kcw-float-length-v52-v1.pine

CE10123; start {'line': 3, 'column': 20}; end {'line': 3, 'column': 23}

Cannot call "ta.kcw" with argument "length"="3". An argument of "literal float" type was used but a "simple int"  is expected.

### kcw-float-length-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kcw-series-mult-v52-v1.pine

CE10123; start {'line': 4, 'column': 42}; end {'line': 4, 'column': 59}

Cannot call "ta.kcw" with argument "mult"="candidateArgument". An argument of "series int" type was used but a "simple float"  is expected.

### kcw-series-mult-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### kcw-series-usetruerange-v52-v1.pine

CE10123; start {'line': 4, 'column': 60}; end {'line': 4, 'column': 77}

Cannot call "ta.kcw" with argument "useTrueRange"="candidateArgument". An argument of "series bool" type was used but a "simple bool"  is expected.

### kcw-series-usetruerange-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-format-time-const-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### qualifier-format-time-const-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-format-time-input-time-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### qualifier-format-time-input-time-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-format-time-input-format-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### qualifier-format-time-input-format-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-format-time-const-title-v52-v1.pine

CE10123; start {'line': 4, 'column': 19}; end {'line': 4, 'column': 24}

Cannot call "plot" with argument "title"="value". An argument of "series string" type was used but a "const string"  is expected.

### qualifier-format-time-const-title-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-format-time-const-simple-v52-v1.pine

CE10123; start {'line': 5, 'column': 14}; end {'line': 5, 'column': 19}

Cannot call "consume" with argument "sampleText"="value". An argument of "series string" type was used but a "simple string"  is expected.

### qualifier-format-time-const-simple-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-match-const-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-match-const-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-match-input-source-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-match-input-source-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-match-input-regex-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-match-input-regex-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-match-const-title-v52-v1.pine

CE10123; start {'line': 4, 'column': 19}; end {'line': 4, 'column': 24}

Cannot call "plot" with argument "title"="value". An argument of "simple string" type was used but a "const string"  is expected.

### qualifier-match-const-title-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-length-input-width-v52-v1.pine

CE10123; start {'line': 5, 'column': 41}; end {'line': 5, 'column': 46}

Cannot call "plot" with argument "linewidth"="value". An argument of "simple int" type was used but a "input int"  is expected.

### qualifier-length-input-width-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-pos-input-width-v52-v1.pine

CE10123; start {'line': 5, 'column': 41}; end {'line': 5, 'column': 46}

Cannot call "plot" with argument "linewidth"="value". An argument of "simple int" type was used but a "input int"  is expected.

### qualifier-pos-input-width-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-contains-input-source-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-contains-input-source-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-contains-input-pattern-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-contains-input-pattern-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-startswith-input-source-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-startswith-input-source-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-startswith-input-pattern-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-startswith-input-pattern-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-endswith-input-source-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-endswith-input-source-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### qualifier-endswith-input-pattern-active-v52-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### qualifier-endswith-input-pattern-active-v52-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

