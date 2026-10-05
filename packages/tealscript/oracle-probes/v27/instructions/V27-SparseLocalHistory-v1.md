# V27 V27-SparseLocalHistory-v1 v1

Ranks: 1792. Native expected phase and values: UNSPECIFIED.

Question: Which committed values do UDF argument and local histories at offsets2/3 refer to for two differently sparse call sites, and are their persistent counters independent?

Use exact source bytes on BINANCE:BTCUSDT, 2-minute candles, display zone Etc/UTC. Retain at least96 historical bars. Record source SHA256, symbol/exchange/timeframe/timezone, all input values, loaded chart range and indicator version. Export all named plots with time/OHLC. Keep initial rows; they distinguish initialization and sparse history. Do not shorten the CSV to the visible viewport or change code to force a result.

Record compile/runtime outcome first, including exact native code/text/line/column and failing bar if present. If it runs, export every column; if it fails, retain the complete diagnostic and screenshot rather than substituting NA cells. A failure in one source must not suppress capture of the other two sources.

Prior V11 sparse-udf-history-pair-v1 captures parameter history on one every-third-bar callsite. This source adds a persistent local counter/local derived series, a second every-fifth-bar callsite and a dense callsite. Exported masks, source values and invocation counters identify the actual call history without assuming chart-index or invocation-index behavior.

Capture a settings screenshot and indicator data-window screenshot. Keep chart source/history fixed across input variants. No Pine source edits between variants.

Scope limits: V6 three static UDF callsites and argument/local offsets2/3 only. No request evaluator, deep-history sizing, varip/realtime rollback, dynamic call graph or arbitrary offsets closure.

Authority candidates: https://www.tradingview.com/pine-script-docs/language/execution-model/#time-series-in-scopes. These are the question's provenance, not a prediction of TV behavior.
