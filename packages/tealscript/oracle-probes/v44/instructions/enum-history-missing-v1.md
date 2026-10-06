# V44 Enum missing history capture v1

Source: `enum-history-missing-v1.pine`

SHA256: `46f57c23a8f847a1ad6c4bda829e8f703160a3e91fa9826a7ed6ba39851ad56e`

Run this exact Pine v6 source independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 16 closed bars and no Bar Replay. Preserve source bytes and the recorded SHA256. Record chart symbol, timeframe, timezone, loaded history count, INDEX origin/cutoff, capture time, account/build and settings. Native phase and values are UNSPECIFIED.

If it runs, export the public chart CSV with time/OHLCV and every named plot column at full available precision, including INDEX=0..15 when available. Keep all missing cells and raw numeric representations; use the explicit NA flags to distinguish missing from zero. INDEX is Pine bar_index, never CSV ordinal. Save relevant Data Window and settings screenshots. Exclude the live bar from historical conclusions. If initial rows are unavailable, label them INITIAL-WINDOW-UNAVAILABLE; for the math matrices also export a later complete eight-mask cycle.

If it refuses, record the earliest full compile/runtime error text, any exposed native code, line/column, highlighted expression and first runtime INDEX/bar. Save a screenshot. An error is an outcome, not an instruction to repair the source. Masked later outputs remain UNOBSERVED. Unavailable exports/context are UNOBSERVED, not compiler refusals. Retain third outcomes and precision limits; do not infer hidden values from screenshots or local TealScript results.

## Exact question and controls

The current enum alternates Up at even INDEX and Down at odd INDEX. Capture PREVIOUS and TWO_BACK NA/comparison flags at INDEX 0..15, especially 0 and 1, plus CURRENT controls. Missing initial history and populated history are separate facets. No explicit enum na initializer is used, so its refusal cannot mask this source. If INDEX=0/1 cannot be exported, mark those startup facets INITIAL-WINDOW-UNAVAILABLE; later alternating history remains a separate observation.

## Return artifacts

Write source-bound CSV/error evidence beside `captures/v44/RESPONSE-v44.md`. Name attempts `enum-history-missing-v1-attempt1` (then attempt2 if requested), retain CSV/evidence hashes, and list every exported column.
