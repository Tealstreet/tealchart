# V39 or Pine v6 dynamic requests true capture v1

Paste `global-request-or-v6-enabled-control-v1.pine` unchanged into TradingView's Pine Editor and add it to BINANCE:BTCUSDT on a 2-minute standard-candle chart, regular session, Etc/UTC. Use at least 32 closed historical bars and no Bar Replay. Record chart context, account/build and the exact source SHA `e8d415c5859daadc913cdddbce447e5cfce6c77819a74e32af0b8d73d7000d08`. No settings or inputs need changing.

Question: Positive enabled-mode control. Native compilation and CSV if runs; preserve exact source.

The request is in a global or operand; the declaration explicitly sets dynamic_requests=true. This is an indicator with no loops, local request wrapper, imported library or changing requested context. Native outcome is UNSPECIFIED.

If it refuses, retain the earliest compile/runtime diagnostic verbatim, including any code, line/column and execution bar. Save a screenshot of the diagnostic and the source. Do not repair, hoist, replace or remove a request. A later masked value remains UNOBSERVED.

If it runs, export raw chart CSV with time/OHLCV and both VALUE and CONTROL_CLOSE, and save a Data Window screenshot. Preserve missing cells and available precision; exclude the open realtime bar from historical value comparison. CSV values provide context only: this round certifies compile/refusal scope, not requested-history arithmetic, first-bar behavior or preload semantics. If exports/history/provider context are unavailable, record that separately rather than calling it a compile refusal.

Return this probe's phase (COMPILE-REFUSED, RUNTIME-REFUSED, RUNS or UNOBSERVED), exact diagnostic, source/CSV SHA and relative evidence paths in `captures/v39/RESPONSE-v39.md`. Every probe is independent; an error in this source must not mask another source.
