# provider6m-revision-pack-v6-v1.pine capture instructions v3

Source SHA256: `1cdc583f11b8473f037101b1d44bdb2833440d9fccd467cc046083d2c5e238f0`. Native outcome: UNSPECIFIED. This is an indicator-only recapture of missing provider inputs, not a prediction of values or a parity closure.

Question: Record requested price corrections contemporaneously instead of replacing them with a later static provider snapshot.

Original gap IDs: native:coverage-req-1-v1.pine:35:htf6_clean_gapsoff_lookaheadon, native:coverage-req-1-v1.pine:36:htf6_hole_gapsoff_lookaheadon, native:coverage-req-1-v1.pine:45:htf6_clean_gapson_lookaheadon, native:coverage-req-1-v1.pine:46:htf6_hole_gapson_lookaheadon.

Run on BINANCE:BTCUSDT, standard candles, UTC, timeframe `2`, default inputs and Bar Replay disabled. Verify full source bytes/SHA before pasting, preserve the source unchanged, record indicator title and setup screenshot. Record symbol/session/timezone/tick size and actual Pine first index/time, not browser dataset index.

Collect complete chart CSV and synchronized provider6m-direct-feed-v6-v1 history from the same symbol/session. Observe at least one6m completion and subsequent reset/export; preserve any changing requested close at the same requested timestamp with its execution clock and corresponding OHLC fields. Export full requested prefix for RMA startup, not just a three-bar slice.

Export every named plot plus original chart OHLC/time, retaining empty cells and the live row with an explicit historical cutoff. Save at least two attempts: immediately after a reset and after the next requested-bar boundary. Record UTC reset/export times, CSV and screenshot SHA256, active study/source identity, and each live update's execution clock. Treat reload attempts separately; do not combine their snapshots.

Direct requested clean close is an input witness, not independent self-scoring proof. Hole/SMA/RMA remain held-out outputs. This new capture can establish future revision behavior; it cannot recreate the old84870.01 snapshot unless that exact old event was independently archived.

If refused, preserve the exact compile/runtime phase and full native diagnostic/line/column. Local preflight is readiness evidence only. Never substitute generated history or an expected output for an unobserved provider value.

Capture bundle: v12. Save each attempt under v12/captures/v12/ and report it in RESPONSE-v12.md. Pair requested and direct-feed snapshots by symbol, session, source hash, execution clock and actual first time/index.
