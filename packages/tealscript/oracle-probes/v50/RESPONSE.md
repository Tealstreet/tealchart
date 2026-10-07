# TradingView round 50 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes were unchanged. Defaults were retained except the separately listed input/feed attempts, whose actual inputs and contexts are stored in native.json.

Default context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 10 across 9 authored sources. Runs: 2; compile refusals: 8; runtime refusals: 0; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. Where present, chart-export.csv is the original Download chart data UI file, with its native headers and unmodified bytes; chart-export.json records its download identity/hash. The additional plots.csv uses TradingView’s chart PlotList through Chrome MCP serialization; no TealScript evaluator produced these values. CAPTURE_IS_OPEN_BAR separates the currently open candle from closed rows. Original unbounded captures include startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows. Separate UI-export receipts can reuse TradingView’s cached mature history; startupCovered and firstSourceIndex record their actual coverage, and they do not replace the original startup evidence. Sources specifying calc_bars_count retain their actual calculated range (normally bound minus one closed plus one live at attachment); their original index origin is retained, with no invented startup rows. They confer only the coverage in their instructions.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe / attempt | Context | Native outcome | Rows | Evidence |
| --- | --- | --- | ---: | --- |
| tostring-onearg-int-const-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-int-const-title/native.json), [screenshot](captures/v50/tostring-onearg-int-const-title/diagnostic.jpg) |
| tostring-onearg-int-input-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-int-input-title/native.json), [screenshot](captures/v50/tostring-onearg-int-input-title/diagnostic.jpg) |
| tostring-onearg-float-const-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-float-const-title/native.json), [screenshot](captures/v50/tostring-onearg-float-const-title/diagnostic.jpg) |
| tostring-onearg-float-input-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-float-input-title/native.json), [screenshot](captures/v50/tostring-onearg-float-input-title/diagnostic.jpg) |
| tostring-onearg-bool-const-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-bool-const-title/native.json), [screenshot](captures/v50/tostring-onearg-bool-const-title/diagnostic.jpg) |
| tostring-onearg-bool-input-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-bool-input-title/native.json), [screenshot](captures/v50/tostring-onearg-bool-input-title/diagnostic.jpg) |
| tostring-onearg-string-const-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-string-const-title/native.json), [screenshot](captures/v50/tostring-onearg-string-const-title/diagnostic.jpg) |
| tostring-onearg-string-input-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v50/tostring-onearg-string-input-title/native.json), [screenshot](captures/v50/tostring-onearg-string-input-title/diagnostic.jpg) |
| tostring-onearg-enum-const-title-v50-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 307 | [native](captures/v50/tostring-onearg-enum-const-title/defaults-ui-export/native.json), [screenshot](captures/v50/tostring-onearg-enum-const-title/defaults-ui-export/settings.jpg) |
| tostring-onearg-enum-const-title-v50-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21753 | [native](captures/v50/tostring-onearg-enum-const-title/native.json), [screenshot](captures/v50/tostring-onearg-enum-const-title/settings.jpg) |

## Exact diagnostics

### tostring-onearg-int-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-int-const-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-int-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-int-input-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-float-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-float-const-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-float-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-float-input-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-bool-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-bool-const-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-bool-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-bool-input-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-string-const-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-string-const-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### tostring-onearg-string-input-title-v50-v1.pine

CE10123; start {'line': 5, 'column': 19}; end {'line': 5, 'column': 25}

Cannot call "plot" with argument "title"="result". An argument of "simple string" type was used but a "const string"  is expected.

### tostring-onearg-string-input-title-v50-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

