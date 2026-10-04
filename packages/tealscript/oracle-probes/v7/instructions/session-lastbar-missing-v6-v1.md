# session-lastbar-missing-v6-v1.pine

Source SHA256: `71e333d475fc8540e0e5e1c5c2dff4b629991f0100b2f4230031ea4a78204db8`. Native outcome: UNOBSERVED.

Question: Session last bar publication when the final time slot has no trade.

Rows: ledger:1535.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Use an illiquid exchange-traded symbol and regular session, capture actual session boundary and absent final slot. Record symbol/session/timezone/date. BTC 24x7 control does not exercise this rule.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Only this stimulus and observed phase; do not generalize to untested versions/inputs.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
