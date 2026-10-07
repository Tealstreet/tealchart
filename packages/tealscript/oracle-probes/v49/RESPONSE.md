# TradingView round 49 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes were unchanged. Defaults were retained except the separately listed input/feed attempts, whose actual inputs and contexts are stored in native.json.

Default context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 41 across 29 authored sources. Runs: 24; compile refusals: 17; runtime refusals: 0; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. Where present, chart-export.csv is the original Download chart data UI file, with its native headers and unmodified bytes; chart-export.json records its download identity/hash. The additional plots.csv uses TradingView’s chart PlotList through Chrome MCP serialization; no TealScript evaluator produced these values. CAPTURE_IS_OPEN_BAR separates the currently open candle from closed rows. Original unbounded captures include startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows. Separate UI-export receipts can reuse TradingView’s cached mature history; startupCovered and firstSourceIndex record their actual coverage, and they do not replace the original startup evidence. Sources specifying calc_bars_count retain their actual calculated range (normally bound minus one closed plus one live at attachment); their original index origin is retained, with no invented startup rows. They confer only the coverage in their instructions.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe / attempt | Context | Native outcome | Rows | Evidence |
| --- | --- | --- | ---: | --- |
| qualifier-consumer-controls-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/qualifier-consumer-controls/defaults-ui-export/native.json), [screenshot](captures/v49/qualifier-consumer-controls/defaults-ui-export/settings.jpg) |
| qualifier-consumer-controls-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/qualifier-consumer-controls/native.json), [screenshot](captures/v49/qualifier-consumer-controls/settings.jpg) |
| match-const-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/match-const-active/native.json), [screenshot](captures/v49/match-const-active/diagnostic.jpg) |
| match-const-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/match-const-simple/defaults-ui-export/native.json), [screenshot](captures/v49/match-const-simple/defaults-ui-export/settings.jpg) |
| match-const-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/match-const-simple/native.json), [screenshot](captures/v49/match-const-simple/settings.jpg) |
| match-input-source-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/match-input-source-active/native.json), [screenshot](captures/v49/match-input-source-active/diagnostic.jpg) |
| match-input-source-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/match-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v49/match-input-source-simple/defaults-ui-export/settings.jpg) |
| match-input-source-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/match-input-source-simple/native.json), [screenshot](captures/v49/match-input-source-simple/settings.jpg) |
| match-input-regex-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/match-input-regex-active/native.json), [screenshot](captures/v49/match-input-regex-active/diagnostic.jpg) |
| match-input-regex-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/match-input-regex-simple/defaults-ui-export/native.json), [screenshot](captures/v49/match-input-regex-simple/defaults-ui-export/settings.jpg) |
| match-input-regex-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/match-input-regex-simple/native.json), [screenshot](captures/v49/match-input-regex-simple/settings.jpg) |
| format-time-const-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/format-time-const-active/native.json), [screenshot](captures/v49/format-time-const-active/diagnostic.jpg) |
| format-time-input-time-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/format-time-input-time-active/native.json), [screenshot](captures/v49/format-time-input-time-active/diagnostic.jpg) |
| format-time-input-format-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/format-time-input-format-active/native.json), [screenshot](captures/v49/format-time-input-format-active/diagnostic.jpg) |
| length-input-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/length-input-simple/defaults-ui-export/native.json), [screenshot](captures/v49/length-input-simple/defaults-ui-export/settings.jpg) |
| length-input-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/length-input-simple/native.json), [screenshot](captures/v49/length-input-simple/settings.jpg) |
| pos-input-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/pos-input-simple/defaults-ui-export/native.json), [screenshot](captures/v49/pos-input-simple/defaults-ui-export/settings.jpg) |
| pos-input-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/pos-input-simple/native.json), [screenshot](captures/v49/pos-input-simple/settings.jpg) |
| contains-input-source-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/contains-input-source-active/native.json), [screenshot](captures/v49/contains-input-source-active/diagnostic.jpg) |
| contains-input-source-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/contains-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v49/contains-input-source-simple/defaults-ui-export/settings.jpg) |
| contains-input-source-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/contains-input-source-simple/native.json), [screenshot](captures/v49/contains-input-source-simple/settings.jpg) |
| contains-input-pattern-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/contains-input-pattern-active/native.json), [screenshot](captures/v49/contains-input-pattern-active/diagnostic.jpg) |
| contains-input-pattern-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/contains-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v49/contains-input-pattern-simple/defaults-ui-export/settings.jpg) |
| contains-input-pattern-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/contains-input-pattern-simple/native.json), [screenshot](captures/v49/contains-input-pattern-simple/settings.jpg) |
| startswith-input-source-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/startswith-input-source-active/native.json), [screenshot](captures/v49/startswith-input-source-active/diagnostic.jpg) |
| startswith-input-source-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 306 | [native](captures/v49/startswith-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v49/startswith-input-source-simple/defaults-ui-export/settings.jpg) |
| startswith-input-source-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/startswith-input-source-simple/native.json), [screenshot](captures/v49/startswith-input-source-simple/settings.jpg) |
| startswith-input-pattern-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/startswith-input-pattern-active/native.json), [screenshot](captures/v49/startswith-input-pattern-active/diagnostic.jpg) |
| startswith-input-pattern-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 306 | [native](captures/v49/startswith-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v49/startswith-input-pattern-simple/defaults-ui-export/settings.jpg) |
| startswith-input-pattern-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/startswith-input-pattern-simple/native.json), [screenshot](captures/v49/startswith-input-pattern-simple/settings.jpg) |
| endswith-input-source-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/endswith-input-source-active/native.json), [screenshot](captures/v49/endswith-input-source-active/diagnostic.jpg) |
| endswith-input-source-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/endswith-input-source-simple/defaults-ui-export/native.json), [screenshot](captures/v49/endswith-input-source-simple/defaults-ui-export/settings.jpg) |
| endswith-input-source-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/endswith-input-source-simple/native.json), [screenshot](captures/v49/endswith-input-source-simple/settings.jpg) |
| endswith-input-pattern-active-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/endswith-input-pattern-active/native.json), [screenshot](captures/v49/endswith-input-pattern-active/diagnostic.jpg) |
| endswith-input-pattern-simple-v49-v1.pine / defaults-ui-export | BINANCE:BTCUSDT / 2m | RUNS | 305 | [native](captures/v49/endswith-input-pattern-simple/defaults-ui-export/native.json), [screenshot](captures/v49/endswith-input-pattern-simple/defaults-ui-export/settings.jpg) |
| endswith-input-pattern-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 21752 | [native](captures/v49/endswith-input-pattern-simple/native.json), [screenshot](captures/v49/endswith-input-pattern-simple/settings.jpg) |
| match-const-title-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/match-const-title/native.json), [screenshot](captures/v49/match-const-title/diagnostic.jpg) |
| format-time-const-title-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/format-time-const-title/native.json), [screenshot](captures/v49/format-time-const-title/diagnostic.jpg) |
| format-time-const-simple-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/format-time-const-simple/native.json), [screenshot](captures/v49/format-time-const-simple/diagnostic.jpg) |
| length-input-width-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/length-input-width/native.json), [screenshot](captures/v49/length-input-width/diagnostic.jpg) |
| pos-input-width-v49-v1.pine / defaults | BINANCE:BTCUSDT / 2m | COMPILE_REFUSAL | 0 | [native](captures/v49/pos-input-width/native.json), [screenshot](captures/v49/pos-input-width/diagnostic.jpg) |

## Exact diagnostics

### match-const-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### match-const-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### match-input-source-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### match-input-source-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### match-input-regex-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 61}

Cannot call "input.bool" with argument "active"="call "operator ==" (simple bool)". An argument of "simple bool" type was used but a "input bool"  is expected.

### match-input-regex-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-time-const-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### format-time-const-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-time-input-time-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### format-time-input-time-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-time-input-format-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 63}

Cannot call "input.bool" with argument "active"="call "operator ==" (series bool)". An argument of "series bool" type was used but a "input bool"  is expected.

### format-time-input-format-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### contains-input-source-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### contains-input-source-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### contains-input-pattern-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### contains-input-pattern-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### startswith-input-source-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### startswith-input-source-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### startswith-input-pattern-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### startswith-input-pattern-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### endswith-input-source-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### endswith-input-source-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### endswith-input-pattern-active-v49-v1.pine

CE10123; start {'line': 6, 'column': 48}; end {'line': 6, 'column': 53}

Cannot call "input.bool" with argument "active"="value". An argument of "simple bool" type was used but a "input bool"  is expected.

### endswith-input-pattern-active-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### match-const-title-v49-v1.pine

CE10123; start {'line': 4, 'column': 19}; end {'line': 4, 'column': 24}

Cannot call "plot" with argument "title"="value". An argument of "simple string" type was used but a "const string"  is expected.

### match-const-title-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-time-const-title-v49-v1.pine

CE10123; start {'line': 4, 'column': 19}; end {'line': 4, 'column': 24}

Cannot call "plot" with argument "title"="value". An argument of "series string" type was used but a "const string"  is expected.

### format-time-const-title-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### format-time-const-simple-v49-v1.pine

CE10123; start {'line': 5, 'column': 14}; end {'line': 5, 'column': 19}

Cannot call "consume" with argument "sampleText"="value". An argument of "series string" type was used but a "simple string"  is expected.

### format-time-const-simple-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### length-input-width-v49-v1.pine

CE10123; start {'line': 5, 'column': 41}; end {'line': 5, 'column': 46}

Cannot call "plot" with argument "linewidth"="value". An argument of "simple int" type was used but a "input int"  is expected.

### length-input-width-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

### pos-input-width-v49-v1.pine

CE10123; start {'line': 5, 'column': 41}; end {'line': 5, 'column': 46}

Cannot call "plot" with argument "linewidth"="value". An argument of "simple int" type was used but a "input int"  is expected.

### pos-input-width-v49-v1.pine

None; start None; end None

Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.

