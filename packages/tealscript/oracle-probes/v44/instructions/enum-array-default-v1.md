# V44 Enum array default slots capture v1

Source: `enum-array-default-v1.pine`

SHA256: `0098a85c2c674e4471bf3d6e05575e8375e627385d80065c0b3164d6d766a286`

Run this exact Pine v6 source independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 16 closed bars and no Bar Replay. Preserve source bytes and the recorded SHA256. Record chart symbol, timeframe, timezone, loaded history count, INDEX origin/cutoff, capture time, account/build and settings. Native phase and values are UNSPECIFIED.

If it runs, export the public chart CSV with time/OHLCV and every named plot column at full available precision, including INDEX=0..15 when available. Keep all missing cells and raw numeric representations; use the explicit NA flags to distinguish missing from zero. INDEX is Pine bar_index, never CSV ordinal. Save relevant Data Window and settings screenshots. Exclude the live bar from historical conclusions. If initial rows are unavailable, label them INITIAL-WINDOW-UNAVAILABLE; for the math matrices also export a later complete eight-mask cycle.

If it refuses, record the earliest full compile/runtime error text, any exposed native code, line/column, highlighted expression and first runtime INDEX/bar. Save a screenshot. An error is an outcome, not an instruction to repair the source. Masked later outputs remain UNOBSERVED. Unavailable exports/context are UNOBSERVED, not compiler refusals. Retain third outcomes and precision limits; do not infer hidden values from screenshots or local TealScript results.

## Exact question and controls

A fresh array.new<State>(3) omits initial_value; its three elements are read before setting slot 1 to Up. Capture all three default NA flags and both first-slot member comparisons, plus explicitly Down-filled and post-set controls. The first and last slots remain unset. Omitted fill, explicit member fill and explicit set are separate observations; do not replace omitted fill with na or a member.

## Return artifacts

Write source-bound CSV/error evidence beside `captures/v44/RESPONSE-v44.md`. Name attempts `enum-array-default-v1-attempt1` (then attempt2 if requested), retain CSV/evidence hashes, and list every exported column.
