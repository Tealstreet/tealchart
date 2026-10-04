# implicit-vwap-variable-actual-chart-gaps-v6-v1.pine

Source SHA256: `89959c4765ae32af544116a4c241beca14188924a7a570f2b07edcf01c26f855`. Native outcome: UNOBSERVED.

Question: Actual chart missing OHLC/volume state and post-hole recovery.

Rows: ledger:620.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Also capture a symbol/history with real missing OHLC or volume. Export ACTUAL_* and missing flags. If no flag occurs, record NOT-EXERCISED, never certify the hole rule.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Synthetic expression holes do not substitute for missing implicit chart fields.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
