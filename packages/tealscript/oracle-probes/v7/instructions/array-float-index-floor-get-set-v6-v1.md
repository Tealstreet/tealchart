# array-float-index-floor-get-set-v6-v1.pine

Source SHA256: `b233f5b224debe569e7f9b367204094c52e34963218f68a03d18d59f9e431b14`. Native outcome: UNOBSERVED.

Question: Native array.get/set float-index floor versus int-signature admission.

Rows: supplement:float-index-floor-get-set.

1. Verify the source hash; paste the exact file into a new TradingView script and save without edits.
2. Run independently on BINANCE:BTCUSDT, 2-minute standard candles, UTC, default inputs, at least 64 historical bars. Record source version, symbol, interval, session, subscription and UTC capture time.
3. Record native compile/runtime/success phase and full diagnostic with highlighted line if refused. If running, export all plots/OHLC/time, preserving blanks; screenshot the chart and Data Window. Record last confirmed bar/time and export cutoff.
4. Export all12 columns across all8 phases if native accepts unchanged source. Capture compiler/runtime diagnostic otherwise. All inputs are finite; compare raw access/mutation with explicit int(math.floor(index)) control, including1.0,1.5,1.999,-0.5. Negative index control uses v6 indexing from array end; no v5 policy inferred.
5. Save original CSV/PNG/video/diagnostic under captures/v7/evidence with probe name and attempt number; record source/export/evidence SHA256.

Limits: Manual floor versus reference int-signature conflict is the question; no expected native phase or floor result is prefilled.

Local preflight is instrument/readiness evidence only; it defines no expected TradingView value.
