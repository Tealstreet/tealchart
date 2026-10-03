# TradingView capture response v4

Operator: Codex through Chrome MCP. Unchanged source master 27ddf1c202. Checkpoint: 70/111 scripts, 71 retained attempts. Capture work continues.

Batch start UTC: 2026-10-03T15:13:44.530504+00:00. Checkpoint UTC: 2026-10-03T16:04:17.756309+00:00. Batch end remains unknown.

Selected native statuses: {'RUNTIME-ERROR': 32, 'RUNS': 33, 'COMPILE-ERROR': 5}.

Chart: BINANCE:BTCUSDT, two-minute standard candles, Etc/UTC, Bar Replay off, mintick 0.01, default inputs/styles. Every success has at least 100 historical rows and a confirmed unchanged live candle boundary. Raw CSV bytes, missing values, decimals, native logs, source identity and screenshots are preserved in [outcomes-v3.json](outcomes-v3.json). Pine execution index is unknown for scripts without an independent index plot; native chart indices and CSV row order are not substitutes.

The v4 negative-numerator division attempt 1 crossed a live boundary. Its CSV remains recorded; select attempt 2. The first checkpoint and instrument recovery remain in [response v3](RESPONSE-v3.md). No source, prediction, handoff or runtime change was made.

Exact native string observations: `POSITIVE=1.123456789`, `NEGATIVE=-1.123456789`; unmatched string conditional: `RESULT=NA`. Each is present in both its native log and table screenshot. The explicit const string initialized with na stops at CE10127, line 3, column 23. Native v3/v4 series offset placement evidence includes both sign cases and actual live updates; see each placement-v1.json listed in the outcome record. Varip typed-na admission does not establish populated-object or intrabar persistence behavior.

| Script / selected attempt | Status | Raw capture or diagnostic |
|---|---|---|
| bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-01-ta-percentile-nearest-rank-percentage--1-0-attempt1-error.txt) Error on bar 0: Invalid value of the 'percentage' argument (-1) in the 'percentile_nearest_rank' function. It must be in the range [0..100]. |
| bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-02-ta-percentile-nearest-rank-percentage-101-0-attempt1-error.txt) Error on bar 0: Invalid value of the 'percentage' argument (101) in the 'percentile_nearest_rank' function. It must be in the range [0..100]. |
| bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-03-ta-percentile-linear-interpolation-percentage--1-0-attempt1-error.txt) Error on bar 0: Invalid value of the 'percentage' argument (-1) in the 'percentile_linear_interpolation' function. It must be in the range [0..100]. |
| bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-04-ta-percentile-linear-interpolation-percentage-101-0-attempt1-error.txt) Error on bar 0: Invalid value of the 'percentage' argument (101) in the 'percentile_linear_interpolation' function. It must be in the range [0..100]. |
| bounds-05-ta-valuewhen-occurrence--1.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-05-ta-valuewhen-occurrence--1-attempt1-error.txt) Error on bar 0: Invalid value of the 'occurrence' argument (-1) in the 'valuewhen' function. It must be >= 0. |
| bounds-06-str-repeat-repeat--1.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-06-str-repeat-repeat--1-attempt1-error.txt) Error on bar 0: Invalid value of the 'repeat' parameter '-1' in the 'str.repeat' function. It must be >= 0. |
| bounds-07-ta-pivot-point-levels-invalid-type.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-07-ta-pivot-point-levels-invalid-type-attempt1-error.txt) Error on bar 0: Invalid argument 'INVALID' for 'type' in the 'ta.pivot_point_levels' function. Possible values: ['Camarilla', 'Traditional', 'DM', 'Classic', 'Fibonacci', 'Woodie'] |
| bounds-08-color-rgb-component-or-transparency.pine / 1 | RUNS | [evidence](bounds-08-color-rgb-component-or-transparency-attempt1.csv) |
| bounds-09-color-new-component-or-transparency.pine / 1 | COMPILE-ERROR | [evidence](evidence/bounds-09-color-new-component-or-transparency-attempt1-error.txt) color.new: transp argument value should be between 0 and 100 |
| bounds-10-label-set-size-text-size--1.pine / 1 | RUNTIME-ERROR | [evidence](evidence/bounds-10-label-set-size-text-size--1-attempt1-error.txt) Error on bar 0: Invalid value of the 'size' argument (-1) in the 'label.set_size' function. It must be >= 0. |
| bounds-11-table-cell-text-size--1.pine / 1 | COMPILE-ERROR | [evidence](evidence/bounds-11-table-cell-text-size--1-attempt1-error.txt) The "table.cell()" function cannot have a negative "text_size" value. Use a positive value in the function call. |
| bounds-12-table-cell-set-text-size-text-size--1.pine / 1 | COMPILE-ERROR | [evidence](evidence/bounds-12-table-cell-set-text-size-text-size--1-attempt1-error.txt) The "table.cell_set_text_size()" function cannot have a negative "text_size" value. Use a positive value in the function call. |
| scalar-01-str-format-unbalanced-left-brace.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-01-str-format-unbalanced-left-brace-attempt1-error.txt) Error on bar 0: Unmatched braces in the pattern. |
| scalar-02-log-info-unbalanced-left-brace.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-02-log-info-unbalanced-left-brace-attempt1-error.txt) Error on bar 0: Unmatched braces in the pattern. |
| scalar-03-log-warning-unbalanced-left-brace.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-03-log-warning-unbalanced-left-brace-attempt1-error.txt) Error on bar 0: Unmatched braces in the pattern. |
| scalar-04-log-error-unbalanced-left-brace.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-04-log-error-unbalanced-left-brace-attempt1-error.txt) Error on bar 0: Unmatched braces in the pattern. |
| scalar-05-ta-pivot-point-levels-Woodie-developing.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-05-ta-pivot-point-levels-Woodie-developing-attempt1-error.txt) Error on bar 0: The `developing` parameter of the `ta.pivot_point_levels()` cannot be `true` when `type` is "Woodie". |
| scalar-06-line-get-price-time-xloc.pine / 1 | RUNTIME-ERROR | [evidence](evidence/scalar-06-line-get-price-time-xloc-attempt1-error.txt) Error on bar 0: 'line.get_price' must be used with lines created using 'xloc=xloc.bar_index'. |
| scalar-07-table-merge-cells-merge-already-merged.pine / 1 | RUNS | [evidence](scalar-07-table-merge-cells-merge-already-merged-attempt1.csv) |
| request-01-request-financial-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-01-request-financial-invalid-provider-key-attempt1-error.txt) Invalid symbol: FUND:INVALID;__ARG_AUDIT__;TOTAL_REVENUE_FQ |
| request-02-request-quandl-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-02-request-quandl-invalid-provider-key-attempt1-error.txt) Invalid symbol: QUANDL:INVALID/__ARG_AUDIT__&#124;0.0 |
| request-03-request-earnings-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-03-request-earnings-invalid-provider-key-attempt1-error.txt) Invalid symbol: ESD_FACTSET:INVALID;__ARG_AUDIT__;EARNINGS |
| request-04-request-dividends-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-04-request-dividends-invalid-provider-key-attempt1-error.txt) Invalid symbol: ESD_FACTSET:INVALID;__ARG_AUDIT__;DIVIDENDS |
| request-05-request-splits-invalid-provider-key.pine / 1 | COMPILE-ERROR | [evidence](evidence/request-05-request-splits-invalid-provider-key-attempt1-error.txt) No value assigned to the "field" parameter in request.splits() |
| request-06-request-economic-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-06-request-economic-invalid-provider-key-attempt1-error.txt) Invalid symbol: ECONOMICS:INVALIDINVALID |
| request-07-request-currency-rate-invalid-provider-key.pine / 1 | RUNTIME-ERROR | [evidence](evidence/request-07-request-currency-rate-invalid-provider-key-attempt1-error.txt) Symbol resolve error: ={"base-currency-id":"XTVCINVALID","currency-id":"USD"} |
| drawing-01-line-new-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-01-line-new-future-index-501-attempt1-error.txt) Error on bar 24223: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-02-line-set-x1-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-02-line-set-x1-future-index-501-attempt1-error.txt) Error on bar 24224: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-03-line-set-xy1-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-03-line-set-xy1-future-index-501-attempt1-error.txt) Error on bar 24224: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-04-line-set-x2-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-04-line-set-x2-future-index-501-attempt1-error.txt) Error on bar 24224: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-05-box-set-left-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-05-box-set-left-future-index-501-attempt1-error.txt) Error on bar 24224: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-06-box-set-right-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-06-box-set-right-future-index-501-attempt1-error.txt) Error on bar 24224: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-07-label-new-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-07-label-new-future-index-501-attempt1-error.txt) Error on bar 24225: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-08-label-set-x-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-08-label-set-x-future-index-501-attempt1-error.txt) Error on bar 24225: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-09-label-set-xy-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-09-label-set-xy-future-index-501-attempt1-error.txt) Error on bar 24225: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-10-line-set-xy2-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-10-line-set-xy2-future-index-501-attempt1-error.txt) Error on bar 24225: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| drawing-11-box-new-future-index-501.pine / 1 | RUNTIME-ERROR | [evidence](evidence/drawing-11-box-new-future-index-501-attempt1-error.txt) Error on bar 24226: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future. |
| varip-01-chart-point.pine / 1 | RUNS | [evidence](varip-01-chart-point-attempt1.csv) |
| varip-02-footprint.pine / 1 | RUNS | [evidence](varip-02-footprint-attempt1.csv) |
| varip-03-volume-row.pine / 1 | RUNS | [evidence](varip-03-volume-row-attempt1.csv) |
| varip-04-enum.pine / 1 | RUNS | [evidence](varip-04-enum-attempt1.csv) |
| varip-05-array-chart-point.pine / 1 | RUNS | [evidence](varip-05-array-chart-point-attempt1.csv) |
| varip-06-map-int-float.pine / 1 | RUNS | [evidence](varip-06-map-int-float-attempt1.csv) |
| scalar-08-table-anchor-reset-identical-remerge.pine / 1 | RUNS | [evidence](scalar-08-table-anchor-reset-identical-remerge-attempt1.csv) |
| array-01-generic-bool-default.pine / 1 | RUNS | [evidence](array-01-generic-bool-default-attempt1.csv) |
| strings-01-tostring-default-precision.pine / 1 | RUNS | [evidence](strings-01-tostring-default-precision-attempt1.csv) |
| array-02-get-index-literal-na.pine / 1 | RUNS | [evidence](array-02-get-index-literal-na-attempt1.csv) |
| array-03-get-index-math-round-na.pine / 1 | RUNS | [evidence](array-03-get-index-math-round-na-attempt1.csv) |
| strings-02-split-empty-separator-sizes.pine / 1 | RUNS | [evidence](strings-02-split-empty-separator-sizes-attempt1.csv) |
| history-01-negative-offset.pine / 1 | RUNTIME-ERROR | [evidence](evidence/history-01-negative-offset-attempt1-error.txt) Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-02-unavailable-offset.pine / 1 | RUNS | [evidence](history-02-unavailable-offset-attempt1.csv) |
| plot-01-series-offset-v3.pine / 1 | RUNS | [evidence](plot-01-series-offset-v3-attempt1.csv) |
| plot-02-series-offset-v4.pine / 1 | RUNS | [evidence](plot-02-series-offset-v4-attempt1.csv) |
| ledger-division-v5-positive-const.pine / 1 | RUNS | [evidence](ledger-division-v5-positive-const-attempt1.csv) |
| ledger-division-v5-negative-numerator.pine / 1 | RUNS | [evidence](ledger-division-v5-negative-numerator-attempt1.csv) |
| ledger-division-v5-negative-denominator.pine / 1 | RUNS | [evidence](ledger-division-v5-negative-denominator-attempt1.csv) |
| ledger-division-v5-both-negative.pine / 1 | RUNS | [evidence](ledger-division-v5-both-negative-attempt1.csv) |
| ledger-division-v5-negative-exact.pine / 1 | RUNS | [evidence](ledger-division-v5-negative-exact-attempt1.csv) |
| ledger-division-v5-float-control.pine / 1 | RUNS | [evidence](ledger-division-v5-float-control-attempt1.csv) |
| ledger-division-v5-input-control.pine / 1 | RUNS | [evidence](ledger-division-v5-input-control-attempt1.csv) |
| ledger-division-v4-positive-const.pine / 1 | RUNS | [evidence](ledger-division-v4-positive-const-attempt1.csv) |
| ledger-division-v4-negative-numerator.pine / 2 | RUNS | [evidence](ledger-division-v4-negative-numerator-attempt2.csv) |
| ledger-division-v4-negative-denominator.pine / 1 | RUNS | [evidence](ledger-division-v4-negative-denominator-attempt1.csv) |
| ledger-division-v4-both-negative.pine / 1 | RUNS | [evidence](ledger-division-v4-both-negative-attempt1.csv) |
| ledger-division-v4-negative-exact.pine / 1 | RUNS | [evidence](ledger-division-v4-negative-exact-attempt1.csv) |
| ledger-division-v4-float-control.pine / 1 | RUNS | [evidence](ledger-division-v4-float-control-attempt1.csv) |
| ledger-division-v4-input-control.pine / 1 | RUNS | [evidence](ledger-division-v4-input-control-attempt1.csv) |
| strings-04-na-initializer.pine / 1 | COMPILE-ERROR | [evidence](evidence/strings-04-na-initializer-attempt1-error.txt) A variable declared with the "const" keyword cannot accept values of the "simple na" form. Assign a "const" value to this variable or remove the "const" keyword from its declaration. |
| strings-03-tostring-eleven-decimal-rounding.pine / 1 | RUNS | [evidence](strings-03-tostring-eleven-decimal-rounding-attempt1.csv) |
| conditional-01-unmatched-string-if.pine / 1 | RUNS | [evidence](conditional-01-unmatched-string-if-attempt1.csv) |

Pending scripts: 41. RUNS records admission and exported values; no local A/B verdict is inferred. No v3 postprocessor was supplied; v2 processing was not used.
