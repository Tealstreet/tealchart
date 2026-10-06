# color-gradient-missing-endpoint-v35-v1 capture instructions v1

Ledger rule: `e49:r53` in `authority-review/color-plot-v3.json`.

Question: Does a missing lower color endpoint yield a visible partially transparent red or missing color at value5 in0..10?

Documented expectation (not a native result): Manual example predicts a visible partially transparent red; engine emits missing color. Exact channel quantization is unspecified.

1. Open BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC; disable Bar Replay. Load only this indicator and preserve exact source bytes. No repairs, casts, enum substitutions, removed arguments or version edits.
2. Record compile admission or the earliest full diagnostic: code, exact text, line and column, screenshot, source SHA and TradingView build/account/context. A different earlier diagnostic leaves the intended boundary unobserved.
3. If admitted, record runtime completion or earliest error with bar/time/site; export chart CSV with raw timestamp/OHLCV and every available plot column, preserving blank cells. Save visual and Data Window screenshots. Admission alone settles only the type boundary; it does not establish rendered semantics.
4. Read RESULT_R/G/B/T, RESULT_NA and PINE_INDEX. RESULT_NA=1 with missing channels supports missing output; RESULT_NA=0 with finite red channels and partial transparency supports the documented visible endpoint. Other values or compilation errors are retained as third outcomes. Preserve the original color plot visual too; do not infer color from price CSV. Observe at least16 closed bars and exclude the live cutoff.
5. Return under `v35/captures/v35/` and add the attempt to `v35/captures/v35/RESPONSE-v35.md`, with source hash, phase, diagnostic/evidence paths, context, historical cutoff and unavailable facets.

Original engine probe: `color.gradient:na-endpoint`. Engine baseline pin: `0d1fe64dc465d3cb898b72bcde61380d42856a9f`. All native outcomes remain UNOBSERVED.
