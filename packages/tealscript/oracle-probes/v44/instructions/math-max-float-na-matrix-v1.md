# V44 Float math.max NA-argument matrix capture v1

Source: `math-max-float-na-matrix-v1.pine`

SHA256: `81899b7cafc499981421231112994c24ba28bcc9337ad6b8dc909f902a573085`

Run this exact Pine v6 source independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 16 closed bars and no Bar Replay. Preserve source bytes and the recorded SHA256. Record chart symbol, timeframe, timezone, loaded history count, INDEX origin/cutoff, capture time, account/build and settings. Native phase and values are UNSPECIFIED.

If it runs, export the public chart CSV with time/OHLCV and every named plot column at full available precision, including INDEX=0..15 when available. Keep all missing cells and raw numeric representations; use the explicit NA flags to distinguish missing from zero. INDEX is Pine bar_index, never CSV ordinal. Save relevant Data Window and settings screenshots. Exclude the live bar from historical conclusions. If initial rows are unavailable, label them INITIAL-WINDOW-UNAVAILABLE; for the math matrices also export a later complete eight-mask cycle.

If it refuses, record the earliest full compile/runtime error text, any exposed native code, line/column, highlighted expression and first runtime INDEX/bar. Save a screenshot. An error is an outcome, not an instruction to repair the source. Masked later outputs remain UNOBSERVED. Unavailable exports/context are UNOBSERVED, not compiler refusals. Retain third outcomes and precision limits; do not infer hidden values from screenshots or local TealScript results.

## Exact question and controls

Each NA_MASK 0..7 selects missing A/B/C using bits 1/2/4. Present values are exactly representable negative dyadics (-8.5, -4.25, -2.125). Capture both MAX_AB/MAX_BA and MAX_ABC/MAX_CBA with each NA flag. Constant missing-first/last/all-missing calls and equal, negative, zero and positive finite controls are independent columns. All eight masks and their reverse-order calls distinguish propagating, ignoring, zero-filling and argument-position behavior. These are possible models, not expected native outputs. This covers two and three arguments only.

## Return artifacts

Write source-bound CSV/error evidence beside `captures/v44/RESPONSE-v44.md`. Name attempts `math-max-float-na-matrix-v1-attempt1` (then attempt2 if requested), retain CSV/evidence hashes, and list every exported column.
