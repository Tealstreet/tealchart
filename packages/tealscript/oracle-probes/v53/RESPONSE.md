# TradingView round 53 capture response

Captured through Chrome MCP on 2026-10-07. Source bytes were unchanged. Defaults were retained except the separately listed input/feed attempts, whose actual inputs and contexts are stored in native.json.

Default context: BINANCE:BTCUSDT, standard candles, 2 minutes, regular 24x7 session, display/exchange timezone Etc/UTC, account sours-lat (pro_premium/Premium), TradingView build 2026-10-06T09:00:32. Bar Replay was not active.

Attempts: 12 across 5 authored sources. Runs: 12; compile refusals: 0; runtime refusals: 0; other: 0.

Each native.json contains the exact editor source, source hash, compiler console/markers, actual plot names, inputs, status, logs, and all loaded native plot rows. plots.csv serializes those native rows with matching time/OHLCV and every plot column. Where present, chart-export.csv is the original Download chart data UI file, with its native headers and unmodified bytes; chart-export.json records its download identity/hash. The additional plots.csv uses TradingView’s chart PlotList through Chrome MCP serialization; no TealScript evaluator produced these values. CAPTURE_IS_OPEN_BAR separates the currently open candle from closed rows. Original unbounded captures include startup INDEX/SOURCE_INDEX 0..15 and at least 32 closed rows. Separate UI-export receipts can reuse TradingView’s cached mature history; startupCovered and firstSourceIndex record their actual coverage, and they do not replace the original startup evidence. Sources specifying calc_bars_count=32 retain only the reached 32 calculated bars (typically 31 closed plus one live); their original index origin is retained, with no invented startup rows. They confer only the coverage in their instructions.

Compile refusals retain the full actual/required type message, native code/location and diagnostic screenshot. Hidden plots remain unobserved for refused sources. Admission establishes the authored consumer boundary only, not broader qualifier rules.

| Probe / attempt | Context | Native outcome | Rows | Evidence |
| --- | --- | --- | ---: | --- |
| ema-rma-length-one-signed-zero-v53-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/ema-rma-length-one-signed-zero/native.json), [screenshot](captures/v53/ema-rma-length-one-signed-zero/settings.jpg) |
| ema-rma-length-one-signed-zero-v53-v1.pine / reciprocal | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/ema-rma-length-one-signed-zero/reciprocal/native.json), [screenshot](captures/v53/ema-rma-length-one-signed-zero/reciprocal/settings.jpg) |
| iii-wvad-flat-zero-range-v53-v1.pine / flat-dogebtc | BINANCE:DOGEBTC / 2m | RUNS | 32 | [native](captures/v53/iii-wvad-flat-zero-range/flat-dogebtc/native.json), [screenshot](captures/v53/iii-wvad-flat-zero-range/flat-dogebtc/settings.jpg) |
| iii-wvad-flat-zero-range-v53-v1.pine / flat-recovery-dogebtc-5m | BINANCE:DOGEBTC / 5m | RUNS | 32 | [native](captures/v53/iii-wvad-flat-zero-range/flat-recovery-dogebtc-5m/native.json), [screenshot](captures/v53/iii-wvad-flat-zero-range/flat-recovery-dogebtc-5m/settings.jpg) |
| iii-wvad-flat-zero-range-v53-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/iii-wvad-flat-zero-range/native.json), [screenshot](captures/v53/iii-wvad-flat-zero-range/settings.jpg) |
| max-all-missing-seed-v53-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/max-all-missing-seed/native.json), [screenshot](captures/v53/max-all-missing-seed/settings.jpg) |
| vwap-variable-missing-inputs-v53-v1.pine / missing-volume-dxy | TVC:DXY / 2m | RUNS | 32 | [native](captures/v53/vwap-variable-missing-inputs/missing-volume-dxy/native.json), [screenshot](captures/v53/vwap-variable-missing-inputs/missing-volume-dxy/settings.jpg) |
| vwap-variable-missing-inputs-v53-v1.pine / missing-volume-spx | SP_DLY:SPX / 2m | RUNS | 32 | [native](captures/v53/vwap-variable-missing-inputs/missing-volume-spx/native.json), [screenshot](captures/v53/vwap-variable-missing-inputs/missing-volume-spx/settings.jpg) |
| vwap-variable-missing-inputs-v53-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/vwap-variable-missing-inputs/native.json), [screenshot](captures/v53/vwap-variable-missing-inputs/settings.jpg) |
| accdist-variable-missing-inputs-v53-v1.pine / missing-volume-dxy | TVC:DXY / 2m | RUNS | 32 | [native](captures/v53/accdist-variable-missing-inputs/missing-volume-dxy/native.json), [screenshot](captures/v53/accdist-variable-missing-inputs/missing-volume-dxy/settings.jpg) |
| accdist-variable-missing-inputs-v53-v1.pine / missing-volume-spx | SP_DLY:SPX / 2m | RUNS | 32 | [native](captures/v53/accdist-variable-missing-inputs/missing-volume-spx/native.json), [screenshot](captures/v53/accdist-variable-missing-inputs/missing-volume-spx/settings.jpg) |
| accdist-variable-missing-inputs-v53-v1.pine / defaults | BINANCE:BTCUSDT / 2m | RUNS | 32 | [native](captures/v53/accdist-variable-missing-inputs/native.json), [screenshot](captures/v53/accdist-variable-missing-inputs/settings.jpg) |

## Exact diagnostics

