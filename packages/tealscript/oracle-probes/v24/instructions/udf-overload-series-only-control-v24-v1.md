# udf-overload-series-only-control-v24-v1 capture instructions v1

Question: Control: does a unique series int UDF accept a positional const int argument and publish its value?

Source SHA256: `06ce9cf916facab43a5e90e0f726e58ac7d2b8ed7888cff9c779ce8824761d7b`. Ledger row: 1815. Run this indicator by itself, unchanged, on BINANCE:BTCUSDT standard candles, chart timeframe 2 minutes and display timezone Etc/UTC. Use the same TradingView build/account settings for all three overload probes. Do not combine probes: a compile refusal in one must not suppress the other cases.

Record the native phase (compile error, runtime error, successful run, or another outcome). Preserve every diagnostic verbatim including error code, text, line and column; screenshot the editor diagnostic. If it runs, export raw CSV after at least 16 completed bars, including CHART_INDEX, CHART_TIME_MS, RESULT, RESULT_IS_NA, the three BRANCH_MATCH fields and SCRIPT_CONTROL. Do not replace blank RESULT cells with zero or omit the missing-value flag. Preserve original headers and numeric precision. The three branch markers discriminate arithmetic results 103, 203 and 303; they predict no native winner. A missing output is a distinct outcome and must be retained, not repaired.

Record actual symbol, chart timeframe, display timezone, build/account tier, Replay state, export UTC, first actual index, last certified completed bar/time and active inputs; unknown settings remain UNKNOWN. Return source/outcome, CSV if available, diagnostic/context screenshots and their SHA256s under `v24/captures/v24/RESPONSE-v24.md`. Expected native phase/values remain UNSPECIFIED and native diagnostics UNOBSERVED until returned evidence. Local engine preflight is instrument evidence only.
