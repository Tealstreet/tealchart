# TradingView round 51 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes and authored defaults were unchanged.

Context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 12 / 12. Runs: 3; compile refusals: 9; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. This uses TradingView’s chart PlotList through Chrome MCP rather than the UI CSV download; no TealScript evaluator produced these values. IS_REALTIME separates the currently open candle from closed rows. Startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows were checked for successful runs.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe | Native outcome | Rows | Evidence |
| --- | --- | ---: | --- |
| str-lower-input-source-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-lower-input-source-title/native.json), [screenshot](captures/v51/str-lower-input-source-title/diagnostic.jpg) |
| str-upper-input-source-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-upper-input-source-title/native.json), [screenshot](captures/v51/str-upper-input-source-title/diagnostic.jpg) |
| str-substring-input-source-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-substring-input-source-title/native.json), [screenshot](captures/v51/str-substring-input-source-title/diagnostic.jpg) |
| str-substring-input-begin-pos-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-substring-input-begin-pos-title/native.json), [screenshot](captures/v51/str-substring-input-begin-pos-title/diagnostic.jpg) |
| str-substring-input-end-pos-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-substring-input-end-pos-title/native.json), [screenshot](captures/v51/str-substring-input-end-pos-title/diagnostic.jpg) |
| str-replace-input-source-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-replace-input-source-title/native.json), [screenshot](captures/v51/str-replace-input-source-title/diagnostic.jpg) |
| str-replace-input-target-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-replace-input-target-title/native.json), [screenshot](captures/v51/str-replace-input-target-title/diagnostic.jpg) |
| str-replace-input-replacement-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-replace-input-replacement-title/native.json), [screenshot](captures/v51/str-replace-input-replacement-title/diagnostic.jpg) |
| str-replace-input-occurrence-title-v51-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v51/str-replace-input-occurrence-title/native.json), [screenshot](captures/v51/str-replace-input-occurrence-title/diagnostic.jpg) |
| udt-search-indexof-v51-v1.pine | RUNS | 21756 | [native](captures/v51/udt-search-indexof/native.json), [screenshot](captures/v51/udt-search-indexof/settings.jpg) |
| udt-search-lastindexof-v51-v1.pine | RUNS | 21756 | [native](captures/v51/udt-search-lastindexof/native.json), [screenshot](captures/v51/udt-search-lastindexof/settings.jpg) |
| udt-search-includes-v51-v1.pine | RUNS | 21756 | [native](captures/v51/udt-search-includes/native.json), [screenshot](captures/v51/udt-search-includes/settings.jpg) |

## Exact compile diagnostics

### str-lower-input-source-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-upper-input-source-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-substring-input-source-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-substring-input-begin-pos-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-substring-input-end-pos-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-replace-input-source-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-replace-input-target-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-replace-input-replacement-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### str-replace-input-occurrence-title-v51-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

