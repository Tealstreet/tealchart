# provider-daily-direct-feed-v5-v2.pine capture instructions v3

Source SHA256: `7bf2000b22aba46d5212c79ef411ff9ad0e51ed35a5f73b979d815af88929dcf`. Native outcome: UNSPECIFIED. This is an indicator-only recapture of missing provider inputs, not a prediction of values or a parity closure.

Question: Capture the complete daily provider prefix required to replay the requested persistent counter naturally.

Original gap IDs: capture-replay:v4:corpus5-pivot-request-counter-v1.pine.

Run on BINANCE:BTCUSDT, standard candles, UTC, timeframe `1D`, default inputs and Bar Replay disabled. Verify full source bytes/SHA before pasting, preserve the source unchanged, record indicator title and setup screenshot. Record symbol/session/timezone/tick size and actual Pine first index/time, not browser dataset index.

Load/export full native daily history including actual Pine bar_index0. Verify first_time equals the2m requested-prefix witness, and preserve all daily OHLCV/time fields through the captured last daily bar. If native account/history limits prevent the first requested timestamp, record the explicit limitation and earliest available date rather than truncating silently.

Export every named plot plus original chart OHLC/time, retaining empty cells and the live row with an explicit historical cutoff. Save at least two attempts: immediately after a reset and after the next requested-bar boundary. Record UTC reset/export times, CSV and screenshot SHA256, active study/source identity, and each live update's execution clock. Treat reload attempts separately; do not combine their snapshots.

Daily chart and requested context must share symbol/session/origin before reuse. FEED_counter_control and requested OUTCOME are outputs; use raw feed dates/OHLC plus independent first execution metadata to drive replay, not either complete counter vector as input.

If refused, preserve the exact compile/runtime phase and full native diagnostic/line/column. Local preflight is readiness evidence only. Never substitute generated history or an expected output for an unobserved provider value.

Capture bundle: v12. Save each attempt under v12/captures/v12/ and report it in RESPONSE-v12.md. Pair requested and direct-feed snapshots by symbol, session, source hash, execution clock and actual first time/index.
