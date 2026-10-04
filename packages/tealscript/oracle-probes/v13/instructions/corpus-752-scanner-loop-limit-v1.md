Corpus v56:752 scanner loop limit capture v1

Question: Does the unchanged default scanner produce a TradingView 500 ms loop-limit error on its first historical bar, or process past that bar? Native phase and values are UNSPECIFIED until captured.

Source: corpus-752-scanner-loop-limit-v1.pine. Pine v6 indicator. This is the FULL original corpus source, including original CRLF bytes, comments and all default inputs. Do not rewrite the source, restrict its symbol list or remove drawings to obtain acceptance.

Context: Start with BINANCE:BTCUSDT, 2-minute chart, default script inputs and full available historical data. Aim for approximately 23924 loaded bars, recording actual history start/end, loaded-bar count if available, chart session, capture time and account tier. Local evidence used synthetic requested-symbol histories; a native run with real NSE feeds is a different data context.

Defaults: Scanning Method Continuous Break; original 40 NSE symbols; Display Table, Long Signals and Short Signals enabled; 12 displayed rows; bottom-left/small table; RSI 14 from close and SMA 14. Preserve every other source default. Capture actual input values in screenshots.

Capture: Paste the exact source, compile and add to chart. Save the compiler/runtime outcome, exact error text, phase, line and bar/time when available, plus a screenshot of the error or rendered indicator/table. If successful, record that execution progressed beyond the first bar and export available indicator CSV with chart time/OHLCV. If unavailable symbols, data entitlements or another earlier error intervene, preserve that distinct outcome; do not label it a loop-limit result. Distinguish a 500 ms loop error from total-script timeout, request-budget errors, invalid symbols or history errors.

Observation of interest: The scanner for-loop starts at source line 702; its dynamic request.security call is at 704. Local engine 6acff1fce5681e8349a84ad88c62cad514f4e774 processed one bar and reported: Loop at line 702 exceeds the 500 ms execution time limit. Native agreement with that outcome is currently UNOBSERVED.

Authority: https://www.tradingview.com/pine-script-docs/writing/limitations/#loop-execution documents a 500 ms per-loop per-bar limit. It does not establish elapsed time for this exact scanner. https://www.tradingview.com/pine-script-docs/writing/profiling-and-optimization/ describes request-call extraction from function scopes; it does not settle timing/accounting of this exact v6 dynamic-symbol loop. No predicted native timeout or acceptance is asserted.
