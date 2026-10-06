# V44 Enum explicit missing value capture v1

Source: `enum-explicit-missing-v1.pine`

SHA256: `43d1b956434552742a468cccf874b9912d5bd1fce3738928fbf9cafa1698ef6d`

Run this exact Pine v6 source independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 16 closed bars and no Bar Replay. Preserve source bytes and the recorded SHA256. Record chart symbol, timeframe, timezone, loaded history count, INDEX origin/cutoff, capture time, account/build and settings. Native phase and values are UNSPECIFIED.

If it runs, export the public chart CSV with time/OHLCV and every named plot column at full available precision, including INDEX=0..15 when available. Keep all missing cells and raw numeric representations; use the explicit NA flags to distinguish missing from zero. INDEX is Pine bar_index, never CSV ordinal. Save relevant Data Window and settings screenshots. Exclude the live bar from historical conclusions. If initial rows are unavailable, label them INITIAL-WINDOW-UNAVAILABLE; for the math matrices also export a later complete eight-mask cycle.

If it refuses, record the earliest full compile/runtime error text, any exposed native code, line/column, highlighted expression and first runtime INDEX/bar. Save a screenshot. An error is an outcome, not an instruction to repair the source. Masked later outputs remain UNOBSERVED. Unavailable exports/context are UNOBSERVED, not compiler refusals. Retain third outcomes and precision limits; do not infer hidden values from screenshots or local TealScript results.

## Exact question and controls

Tests State missing = na independently of history and arrays. Capture MISSING_NA and comparisons with both members beside the defined Down control. A refusal of the declaration or of na(enum) leaves later observations UNOBSERVED; copy that earliest diagnostic without editing the script. This does not test string coercion or equality between distinct enum types.

## Return artifacts

Write source-bound CSV/error evidence beside `captures/v44/RESPONSE-v44.md`. Name attempts `enum-explicit-missing-v1-attempt1` (then attempt2 if requested), retain CSV/evidence hashes, and list every exported column.
