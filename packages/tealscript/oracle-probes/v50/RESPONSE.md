# TradingView round 50 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes and authored defaults were unchanged.

Context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat, TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 9 / 9. Runs: 1; compile refusals: 8; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. This uses TradingView’s chart PlotList through Chrome MCP rather than the UI CSV download; no TealScript evaluator produced these values. IS_REALTIME separates the currently open candle from closed rows. Startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows were checked for successful runs.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe | Native outcome | Rows | Evidence |
| --- | --- | ---: | --- |
| tostring-onearg-int-const-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-int-const-title/native.json), [screenshot](captures/v50/tostring-onearg-int-const-title/diagnostic.jpg) |
| tostring-onearg-int-input-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-int-input-title/native.json), [screenshot](captures/v50/tostring-onearg-int-input-title/diagnostic.jpg) |
| tostring-onearg-float-const-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-float-const-title/native.json), [screenshot](captures/v50/tostring-onearg-float-const-title/diagnostic.jpg) |
| tostring-onearg-float-input-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-float-input-title/native.json), [screenshot](captures/v50/tostring-onearg-float-input-title/diagnostic.jpg) |
| tostring-onearg-bool-const-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-bool-const-title/native.json), [screenshot](captures/v50/tostring-onearg-bool-const-title/diagnostic.jpg) |
| tostring-onearg-bool-input-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-bool-input-title/native.json), [screenshot](captures/v50/tostring-onearg-bool-input-title/diagnostic.jpg) |
| tostring-onearg-string-const-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-string-const-title/native.json), [screenshot](captures/v50/tostring-onearg-string-const-title/diagnostic.jpg) |
| tostring-onearg-string-input-title-v50-v1.pine | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-string-input-title/native.json), [screenshot](captures/v50/tostring-onearg-string-input-title/diagnostic.jpg) |
| tostring-onearg-enum-const-title-v50-v1.pine | RUNS | 21753 | [native](captures/v50/tostring-onearg-enum-const-title/native.json), [screenshot](captures/v50/tostring-onearg-enum-const-title/settings.jpg) |

## Exact compile diagnostics

### tostring-onearg-int-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-int-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-float-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-float-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-bool-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-bool-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-string-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-string-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

