# plot-series-type-boundary-v35-v1 capture instructions v1

Ledger rule: `e17:r10` in `authority-review/color-plot-v3.json`.

Question: Does TradingView admit the exact plot.series substitution in this source, or reject it?

Documented expectation (not a native result): Reference type contract predicts rejection; pinned engine admits this exact source. Native outcome is UNOBSERVED; record any third outcome.

1. Open BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC; disable Bar Replay. Load only this indicator and preserve exact source bytes. No repairs, casts, enum substitutions, removed arguments or version edits.
2. Record compile admission or the earliest full diagnostic: code, exact text, line and column, screenshot, source SHA and TradingView build/account/context. A different earlier diagnostic leaves the intended boundary unobserved.
3. If admitted, record runtime completion or earliest error with bar/time/site; export chart CSV with raw timestamp/OHLCV and every available plot column, preserving blank cells. Save visual and Data Window screenshots. Admission alone settles only the type boundary; it does not establish rendered semantics.
4. The source already contains the exact visual call. Preserve the full named argument list and any rendered/CSV outputs if it runs. No numeric or visual output is required to establish compile refusal. Observe at least16 closed bars if admitted; do not classify missing exports as refusal.
5. Return under `v35/captures/v35/` and add the attempt to `v35/captures/v35/RESPONSE-v35.md`, with source hash, phase, diagnostic/evidence paths, context, historical cutoff and unavailable facets.

Original engine probe: `e17:p0:wrong-type`. Engine baseline pin: `0d1fe64dc465d3cb898b72bcde61380d42856a9f`. All native outcomes remain UNOBSERVED.
