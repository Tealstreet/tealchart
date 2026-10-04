# history-dynamic-negative-v5-v1.pine

Source SHA256: `7ced3b1dd8da5119332709cbf05df3aa935888a68448d2b5433d642b91409470`. Native outcome: UNOBSERVED.

Question: Native history subscript bar_index % 2 == 0 ? -1 : 1: phase and outcome.

Rows: ledger:34, ledger:35, ledger:1835, ledger:1857.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Reload independently and repeat once; keep each attempt separately.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: A refusal before indexing cannot settle runtime offset conversion.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
