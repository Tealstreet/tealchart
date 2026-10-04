# TradingView capture response v4

Numeric checkpoint: 12/75 active scripts captured from source master74f113d7a4. {'RUNS': 4, 'COMPILE-ERROR': 8}. Capture continues.

Operator: Codex via Chrome MCP. Batch startUTC 2026-10-04T01:42:53.166239+00:00; checkpointUTC 2026-10-04T01:55:12.372566+00:00; batch end unknown.

BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off,mintick0.01,unchanged default inputs/styles. All four success CSVs contain over24,000 rows, all requested columns and confirmed unchanged live boundaries. Statistical and ranked-window exports start at explicit input_bar_index0. Superseded ranked-window v1 is intentionally skipped.

The ranked-window attempt1 is UNKNOWN after a transient MCP transport interruption. Retry attempt2 is selected. Retry reload exceeded the initial15second readiness wait; native MCP healthcheck passed and restoration resumed using the unchanged saved probe state. Future readiness wait is60seconds. Instrument issues are not target refusals.

| Script/attempt | Status | Capture or diagnostic |
|---|---|---|
| statistical-native-moments-order-v1.pine/1 | RUNS | [evidence](statistical-native-moments-order-v1-attempt1.csv) |
| ranked-window-missing-slots-v2.pine/2 | RUNS | [evidence](ranked-window-missing-slots-v2-attempt2.csv) |
| v5-float-length-ema-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-ema-v1-attempt1-error.txt) None Cannot call 'ta.ema' with argument 'length'='7.5'. An argument of 'literal float' type was used but a 'simple int' is expected. |
| v5-float-length-highest-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-highest-v1-attempt1-error.txt) None Cannot call 'ta.highest' with argument 'length'='7.5'. An argument of 'literal float' type was used but a 'simple int' is expected. |
| v5-float-length-macd-fastlen-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-macd-fastlen-v1-attempt1-error.txt) None Cannot call 'ta.macd' with argument 'fastlen'='1.5'. An argument of 'literal float' type was used but a 'simple int' is expected. |
| v5-float-length-macd-siglen-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-macd-siglen-v1-attempt1-error.txt) None Cannot call 'ta.macd' with argument 'siglen'='9.5'. An argument of 'literal float' type was used but a 'simple int' is expected. |
| v5-float-length-macd-slowlen-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-macd-slowlen-v1-attempt1-error.txt) None Cannot call 'ta.macd' with argument 'slowlen'='26.5'. An argument of 'literal float' type was used but a 'simple int' is expected. |
| v5-float-length-percentile-linear-interpolation-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-percentile-linear-interpolation-v1-attempt1-error.txt) None Cannot call 'ta.percentile_linear_interpolation' with argument 'length'='2.5'. An argument of 'literal float' type was used but a 'series int' is expected. |
| v5-float-length-sma-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-sma-v1-attempt1-error.txt) None Cannot call 'ta.sma' with argument 'length'='7.5'. An argument of 'literal float' type was used but a 'series int' is expected. |
| v5-float-length-wma-v1.pine/1 | COMPILE-ERROR | [evidence](evidence/v5-float-length-wma-v1-attempt1-error.txt) None Cannot call 'ta.wma' with argument 'length'='7.5'. An argument of 'literal float' type was used but a 'series int' is expected. |
| native-float-comparison-boundary-v1.pine/1 | RUNS | [evidence](native-float-comparison-boundary-v1-attempt1.csv) |
| native-float-magnitude-output-v1.pine/1 | RUNS | [evidence](native-float-magnitude-output-v1-attempt1.csv) |

Full attempt metadata, exact initial float logs and screenshots: [outcomes-v4.json](outcomes-v4.json). This captures native outputs; no local A/B verdict or prediction changes.
