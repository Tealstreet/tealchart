# V44 Enum input default control capture v1

Source: `enum-input-default-v1.pine`

SHA256: `40e9541e48d89737d74250c94e09ad107e999cf9cdec7895406cdbcb32be7a23`

Run this exact Pine v6 source independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 16 closed bars and no Bar Replay. Preserve source bytes and the recorded SHA256. Record chart symbol, timeframe, timezone, loaded history count, INDEX origin/cutoff, capture time, account/build and settings. Native phase and values are UNSPECIFIED.

If it runs, export the public chart CSV with time/OHLCV and every named plot column at full available precision, including INDEX=0..15 when available. Keep all missing cells and raw numeric representations; use the explicit NA flags to distinguish missing from zero. INDEX is Pine bar_index, never CSV ordinal. Save relevant Data Window and settings screenshots. Exclude the live bar from historical conclusions. If initial rows are unavailable, label them INITIAL-WINDOW-UNAVAILABLE; for the math matrices also export a later complete eight-mask cycle.

If it refuses, record the earliest full compile/runtime error text, any exposed native code, line/column, highlighted expression and first runtime INDEX/bar. Save a screenshot. An error is an outcome, not an instruction to repair the source. Masked later outputs remain UNOBSERVED. Unavailable exports/context are UNOBSERVED, not compiler refusals. Retain third outcomes and precision limits; do not infer hidden values from screenshots or local TealScript results.

## Exact question and controls

Capture attempt 1 immediately after Reset settings with STATE=Down (the declared default), including a settings screenshot. Then capture attempt 2 with STATE=Up selected explicitly and a second screenshot/CSV. Keep attempt sources identical and settings separately labeled. Capture SELECTED_NA and both member comparisons. This tests a defined enum input default/control, not input.enum(na) or implicit first-member selection.

## Return artifacts

Write source-bound CSV/error evidence beside `captures/v44/RESPONSE-v44.md`. Name attempts `enum-input-default-v1-attempt1` (then attempt2 if requested), retain CSV/evidence hashes, and list every exported column.
