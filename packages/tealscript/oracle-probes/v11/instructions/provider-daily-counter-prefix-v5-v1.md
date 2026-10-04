# provider-daily-counter-prefix-v5-v1.pine capture instructions v2

Source SHA256: `7dd9d11947f936a8a1edaa069a36d3cbade4f9d7328adeadaf90a29161c20a0b`. Native outcome: UNSPECIFIED. This is an indicator-only recapture of missing provider inputs, not a prediction of values or a parity closure.

Question: Observe requested daily execution start/index and initial counter state separately from visible-chart OUTCOME.

Original gap IDs: capture-replay:v4:corpus5-pivot-request-counter-v1.pine.

Run on BINANCE:BTCUSDT, standard candles, UTC, timeframe `2`, default inputs and Bar Replay disabled. Verify full source bytes/SHA before pasting, preserve the source unchanged, record indicator title and setup screenshot. Record symbol/session/timezone/tick size and actual Pine first index/time, not browser dataset index.

Export complete2m history with REQUEST_INPUT_first_time/index/first_count, and pair it with provider-daily-direct-feed-v5-v1. Daily companion must include every daily bar from that requested first_time, not merely daily bars overlapping the2m dataset. Record chart firstTime/Pine index separately.

Export every named plot plus original chart OHLC/time, retaining empty cells and the live row with an explicit historical cutoff. Save at least two attempts: immediately after a reset and after the next requested-bar boundary. Record UTC reset/export times, CSV and screenshot SHA256, active study/source identity, and each live update's execution clock. Treat reload attempts separately; do not combine their snapshots.

OUTCOME is held out. REQUEST_INPUT_first_count records the counter at its actual first requested execution; never initialize from visible-chart OUTCOME3301. If native daily companion starts later than REQUEST_INPUT_first_time, the needed prefix remains unavailable. No invented daily bars or assumed browser-index-to-Pine-index conversion.

If refused, preserve the exact compile/runtime phase and full native diagnostic/line/column. Local preflight is readiness evidence only. Never substitute generated history or an expected output for an unobserved provider value.
