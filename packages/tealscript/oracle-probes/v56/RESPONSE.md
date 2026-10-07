# TradingView round 56 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes were unchanged. Defaults were retained except the separately listed input/feed attempts, whose actual inputs and contexts are stored in native.json.

Default context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 6 across 5 authored sources. Runs: 6; compile refusals: 0; runtime refusals: 0; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. Where present, chart-export.csv is the original Download chart data UI file, with its native headers and unmodified bytes; chart-export.json records its download identity/hash. The additional plots.csv uses TradingView’s chart PlotList through Chrome MCP serialization; no TealScript evaluator produced these values. IS_REALTIME separates the currently open candle from closed rows. For unbounded sources, startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows were checked. Sources specifying calc_bars_count=32 retain only the reached 32 calculated bars (typically 31 closed plus one live); their original index origin is retained, with no invented startup rows. They confer only the coverage in their instructions.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe / attempt | Context | Native outcome | Rows | Evidence |
| --- | --- | --- | ---: | --- |
| matrix-sort-tied-keys-v6-v56-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v56/matrix-sort-tied-keys-v6/native.json), [screenshot](captures/v56/matrix-sort-tied-keys-v6/settings.jpg) |
| matrix-missing-predicates-v6-v56-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v56/matrix-missing-predicates-v6/native.json), [screenshot](captures/v56/matrix-missing-predicates-v6/settings.jpg) |
| language-string-no-match-v5-v56-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v56/language-string-no-match-v5/native.json), [screenshot](captures/v56/language-string-no-match-v5/settings.jpg) |
| language-string-no-match-v6-v56-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v56/language-string-no-match-v6/native.json), [screenshot](captures/v56/language-string-no-match-v6/settings.jpg) |
| language-once-live-rollback-v56-v1.pine / live-sequence-end | BINANCE:BTCUSDT / 1m | RUNS | 33 | [native](captures/v56/language-once-live-rollback/live-sequence-end/native.json), [screenshot](captures/v56/language-once-live-rollback/live-sequence-end/settings.jpg) |
| language-once-live-rollback-v56-v1.pine / defaults | BINANCE:BTCUSDT / 1m | RUNS | 32 | [native](captures/v56/language-once-live-rollback/native.json), [screenshot](captures/v56/language-once-live-rollback/settings.jpg) |

## Exact diagnostics

