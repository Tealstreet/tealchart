# ta-vwap-mfi-source-holes-v6-v1.pine

Source SHA256: `d8d9449d171b55949a72f1ec6cba88b6b28ddbff659b3bfd74eb9da77b219433`. Native outcome: UNOBSERVED.

Question: Controlled source holes with actual native volume.

Rows: ledger:625, ledger:948, ledger:950.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Reload independently and repeat once; keep each attempt separately.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Pine cannot replace implicit chart volume. Volume-hole clause remains unexercised unless capture includes actual missing volume.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
