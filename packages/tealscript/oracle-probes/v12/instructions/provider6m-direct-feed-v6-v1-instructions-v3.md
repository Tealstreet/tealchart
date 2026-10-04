# provider6m-direct-feed-v6-v1.pine capture instructions v3

Source SHA256: `199fae24c3f8a66e0eacf90c9f3b8657847065b4eacd9089b8110b6662e0c6db`. Native outcome: UNSPECIFIED. This is an indicator-only recapture of missing provider inputs, not a prediction of values or a parity closure.

Question: Export the raw requested6m provider history with independently observable dataset origin and execution clock.

Original gap IDs: native:coverage-request-1-v1.pine:24:htf6_goff_lon_close_clean, native:coverage-request-1-v1.pine:25:htf6_goff_lon_sum_close_len3_clean, native:coverage-request-1-v1.pine:26:htf6_goff_lon_sum_close_len3_hole, native:coverage-request-1-v1.pine:27:htf6_goff_lon_range, native:coverage-request-1-v1.pine:28:htf6_goff_lon_hl2, native:coverage-request-1-v1.pine:29:htf6_goff_lon_hlc3, native:coverage-request-1-v1.pine:30:htf6_goff_lon_ohlc4, native:coverage-request-1-v1.pine:35:htf6_goff_lon_close_hole97, native:coverage-request-1-v1.pine:48:htf6_gon_lon_close_clean, native:coverage-request-1-v1.pine:49:htf6_gon_lon_sum_close_len3_clean, native:coverage-request-1-v1.pine:50:htf6_gon_lon_sum_close_len3_hole, native:coverage-request-1-v1.pine:51:htf6_gon_lon_range, native:coverage-request-1-v1.pine:52:htf6_gon_lon_hl2, native:coverage-request-1-v1.pine:53:htf6_gon_lon_hlc3, native:coverage-request-1-v1.pine:54:htf6_gon_lon_ohlc4, native:coverage-request-1-v1.pine:59:htf6_gon_lon_close_hole97, native:coverage-req-1-v1.pine:35:htf6_clean_gapsoff_lookaheadon, native:coverage-req-1-v1.pine:36:htf6_hole_gapsoff_lookaheadon, native:coverage-req-1-v1.pine:45:htf6_clean_gapson_lookaheadon, native:coverage-req-1-v1.pine:46:htf6_hole_gapson_lookaheadon.

Run on BINANCE:BTCUSDT, standard candles, UTC, timeframe `6`, default inputs and Bar Replay disabled. Verify full source bytes/SHA before pasting, preserve the source unchanged, record indicator title and setup screenshot. Record symbol/session/timezone/tick size and actual Pine first index/time, not browser dataset index.

Load/export all available history through the partial last bar and preserve Pine bar_index0/start time. Pair each export with the same reset/boundary attempt IDs as both2m request-pack captures. Record a timestamped raw feed update alongside each requested snapshot; preserve previous CSVs when a price revises.

Export every named plot plus original chart OHLC/time, retaining empty cells and the live row with an explicit historical cutoff. Save at least two attempts: immediately after a reset and after the next requested-bar boundary. Record UTC reset/export times, CSV and screenshot SHA256, active study/source identity, and each live update's execution clock. Treat reload attempts separately; do not combine their snapshots.

This chart may expose a different history prefix from request.security. Validate FEED_first_time and FEED_bar_index against requested first-time/index witnesses; a mismatch is a remaining context gap, not permission to infer an index. Different capture times must remain separate provider snapshots.

If refused, preserve the exact compile/runtime phase and full native diagnostic/line/column. Local preflight is readiness evidence only. Never substitute generated history or an expected output for an unobserved provider value.

Capture bundle: v12. Save each attempt under v12/captures/v12/ and report it in RESPONSE-v12.md. Pair requested and direct-feed snapshots by symbol, session, source hash, execution clock and actual first time/index.
