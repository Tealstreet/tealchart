# barstate-security-confirmed-v6-v1.pine

Source SHA256: `c89a17d7ba31106bbb67297c63770914313a84e4d6a59c82c4c4abde920df319`. Native outcome: UNOBSERVED.

Question: Requested context confirmation on historical/open/closing bars.

Rows: ledger:312, ledger:397.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Record live updates before and after a 2m close and a 5m close, wall-clock UTC, chart timestamps, and reload. Historical CSV alone cannot settle realtime confirmation.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Only this stimulus and observed phase; do not generalize to untested versions/inputs.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
