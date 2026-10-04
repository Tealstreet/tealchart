# map-float-key-overflow-v6-v1.pine

Source SHA256: `74133c3272231b900e53b5f8b1a869f11dac4a92f45144d91b5d12a905c3c73e`. Native outcome: UNOBSERVED.

Question: Missing/nonfinite float map key acceptance, replacement and retrieval.

Rows: ledger:932.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Reload independently and repeat once; keep each attempt separately.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Overflow construction or conversion may fail before key insertion; record the first phase.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
