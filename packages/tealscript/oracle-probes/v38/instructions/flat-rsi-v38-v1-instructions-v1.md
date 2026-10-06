# V38 flat-rsi-v38-v1 capture v1

Run `flat-rsi-v38-v1.pine` independently on BINANCE:BTCUSDT, 2-minute standard candles, Etc/UTC, default inputs, no Bar Replay. Load at least 260 closed bars. Preserve source bytes. Native phase and values are UNSPECIFIED.

Question: RSI at constant source with zero upward and downward movement; length7 startup and later output.

Export public CSV with time/OHLCV and all named columns: INDEX, SOURCE, TARGET, UP_CONTROL, DOWN_CONTROL. Preserve raw numeric text and missing cells. Include Pine INDEX=0 through INDEX=239. INDEX is bar_index, not a CSV ordinal; if zero is unavailable, report INITIAL-WINDOW-UNAVAILABLE. Exclude live rows. For embedded samples, only indices0..239 carry target credit; subsequent source values are deliberately missing. For constant probes, retain the same240-bar historical window.

Save Data Window screenshots at indices7,20,21,22,25,40,41,43 and239 when available. Record account/build, settings, historical count, origin and cutoff. On refusal, retain full text/code/line/column and first runtime bar; do not repair the source. Export/settings failures are UNOBSERVED, not native refusal. Neither TealScript nor Python is an expected answer.

Return to `v38/captures/v38/RESPONSE-v38.md` with source SHA256, CSV filename/hash and phase.
