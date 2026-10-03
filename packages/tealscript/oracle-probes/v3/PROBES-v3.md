# Probe capture procedure v3

All paths are relative to this bundle. The operator can be a person or an authorized agent on the capture machine. Follow [HANDOFF-v3.md](HANDOFF-v3.md); sources remain unchanged and agents adjudicate afterward.

104 outcome-only scripts, each with one field named OUTCOME (the fill witness also exports FILL_FIRST and FILL_SECOND handle plots). Sources pin their Pine version; two ledger plot-offset probes use v3/v4 study declarations. Documented predictions do not specify native numeric codes or exact text. UNSPECIFIED predictions preserve uncertainty, including the four ledger history/offset probes.

Keep BINANCE:BTCUSDT / 2-minute / standard candles / UTC / Bar Replay off, unchanged default inputs/styles, and at least 100 historical bars. This floor applies to successful value observations. A compile/runtime error before 100 outputs is valid error evidence; do not edit the script to obtain an export. Retain the first execution's chart time/OHLC separately when relevant; no script has a bar-index control, so CSV row number alone does not prove Pine bar_index.

For each attempt save `captures/v3/<stem>-attempt<N>.csv` on success, or exact diagnostics on error; save screenshots/logs under `captures/v3/evidence/<stem>-attempt<N>-...`. All statuses and paths belong in `captures/v3/outcomes-v3.json`. A RUNS label alone does not complete the value/appearance portion. Preserve every successful OUTCOME value and missingness in the original CSV.

## Outcome sources and evidence

| Outcome source / indicator title | Target / expected phase | Defaults / min history | Required success/error evidence |
|---|---|---|---|
| [bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine](bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine)<br>V3-BOUNDS-01 | V3-BOUNDS-01; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine](bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine)<br>V3-BOUNDS-02 | V3-BOUNDS-02; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine](bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine)<br>V3-BOUNDS-03 | V3-BOUNDS-03; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine](bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine)<br>V3-BOUNDS-04 | V3-BOUNDS-04; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-05-ta-valuewhen-occurrence--1.pine](bounds-05-ta-valuewhen-occurrence--1.pine)<br>V3-BOUNDS-05 | V3-BOUNDS-05; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-06-str-repeat-repeat--1.pine](bounds-06-str-repeat-repeat--1.pine)<br>V3-BOUNDS-06 | V3-BOUNDS-06; UNSPECIFIED | 100 historical bars; unchanged defaults; input.int default −1 | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-07-ta-pivot-point-levels-invalid-type.pine](bounds-07-ta-pivot-point-levels-invalid-type.pine)<br>V3-BOUNDS-07 | V3-BOUNDS-07; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-08-color-rgb-component-or-transparency.pine](bounds-08-color-rgb-component-or-transparency.pine)<br>V3-BOUNDS-08 | V3-BOUNDS-08; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-09-color-new-component-or-transparency.pine](bounds-09-color-new-component-or-transparency.pine)<br>V3-BOUNDS-09 | V3-BOUNDS-09; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-10-label-set-size-text-size--1.pine](bounds-10-label-set-size-text-size--1.pine)<br>V3-BOUNDS-10 | V3-BOUNDS-10; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-11-table-cell-text-size--1.pine](bounds-11-table-cell-text-size--1.pine)<br>V3-BOUNDS-11 | V3-BOUNDS-11; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [bounds-12-table-cell-set-text-size-text-size--1.pine](bounds-12-table-cell-set-text-size-text-size--1.pine)<br>V3-BOUNDS-12 | V3-BOUNDS-12; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-01-str-format-unbalanced-left-brace.pine](scalar-01-str-format-unbalanced-left-brace.pine)<br>V3-SCALAR-01 | V3-SCALAR-01; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-02-log-info-unbalanced-left-brace.pine](scalar-02-log-info-unbalanced-left-brace.pine)<br>V3-SCALAR-02 | V3-SCALAR-02; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-03-log-warning-unbalanced-left-brace.pine](scalar-03-log-warning-unbalanced-left-brace.pine)<br>V3-SCALAR-03 | V3-SCALAR-03; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-04-log-error-unbalanced-left-brace.pine](scalar-04-log-error-unbalanced-left-brace.pine)<br>V3-SCALAR-04 | V3-SCALAR-04; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-05-ta-pivot-point-levels-Woodie-developing.pine](scalar-05-ta-pivot-point-levels-Woodie-developing.pine)<br>V3-SCALAR-05 | V3-SCALAR-05; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-06-line-get-price-time-xloc.pine](scalar-06-line-get-price-time-xloc.pine)<br>V3-SCALAR-06 | V3-SCALAR-06; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [scalar-07-table-merge-cells-merge-already-merged.pine](scalar-07-table-merge-cells-merge-already-merged.pine)<br>V3-SCALAR-07 | V3-SCALAR-07; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-01-request-financial-invalid-provider-key.pine](request-01-request-financial-invalid-provider-key.pine)<br>V3-REQUEST-01 | V3-REQUEST-01; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-02-request-quandl-invalid-provider-key.pine](request-02-request-quandl-invalid-provider-key.pine)<br>V3-REQUEST-02 | V3-REQUEST-02; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-03-request-earnings-invalid-provider-key.pine](request-03-request-earnings-invalid-provider-key.pine)<br>V3-REQUEST-03 | V3-REQUEST-03; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-04-request-dividends-invalid-provider-key.pine](request-04-request-dividends-invalid-provider-key.pine)<br>V3-REQUEST-04 | V3-REQUEST-04; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-05-request-splits-invalid-provider-key.pine](request-05-request-splits-invalid-provider-key.pine)<br>V3-REQUEST-05 | V3-REQUEST-05; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-06-request-economic-invalid-provider-key.pine](request-06-request-economic-invalid-provider-key.pine)<br>V3-REQUEST-06 | V3-REQUEST-06; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [request-07-request-currency-rate-invalid-provider-key.pine](request-07-request-currency-rate-invalid-provider-key.pine)<br>V3-REQUEST-07 | V3-REQUEST-07; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-01-line-new-future-index-501.pine](drawing-01-line-new-future-index-501.pine)<br>V3-DRAWING-01 | V3-DRAWING-01; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-02-line-set-x1-future-index-501.pine](drawing-02-line-set-x1-future-index-501.pine)<br>V3-DRAWING-02 | V3-DRAWING-02; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-03-line-set-xy1-future-index-501.pine](drawing-03-line-set-xy1-future-index-501.pine)<br>V3-DRAWING-03 | V3-DRAWING-03; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-04-line-set-x2-future-index-501.pine](drawing-04-line-set-x2-future-index-501.pine)<br>V3-DRAWING-04 | V3-DRAWING-04; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-05-box-set-left-future-index-501.pine](drawing-05-box-set-left-future-index-501.pine)<br>V3-DRAWING-05 | V3-DRAWING-05; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-06-box-set-right-future-index-501.pine](drawing-06-box-set-right-future-index-501.pine)<br>V3-DRAWING-06 | V3-DRAWING-06; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-07-label-new-future-index-501.pine](drawing-07-label-new-future-index-501.pine)<br>V3-DRAWING-07 | V3-DRAWING-07; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-08-label-set-x-future-index-501.pine](drawing-08-label-set-x-future-index-501.pine)<br>V3-DRAWING-08 | V3-DRAWING-08; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-09-label-set-xy-future-index-501.pine](drawing-09-label-set-xy-future-index-501.pine)<br>V3-DRAWING-09 | V3-DRAWING-09; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-10-line-set-xy2-future-index-501.pine](drawing-10-line-set-xy2-future-index-501.pine)<br>V3-DRAWING-10 | V3-DRAWING-10; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [drawing-11-box-new-future-index-501.pine](drawing-11-box-new-future-index-501.pine)<br>V3-DRAWING-11 | V3-DRAWING-11; RUNTIME-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [varip-01-chart-point.pine](varip-01-chart-point.pine)<br>V3-VARIP-01 | V3-VARIP-01; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [varip-02-footprint.pine](varip-02-footprint.pine)<br>V3-VARIP-02 | V3-VARIP-02; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [varip-03-volume-row.pine](varip-03-volume-row.pine)<br>V3-VARIP-03 | V3-VARIP-03; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [varip-04-enum.pine](varip-04-enum.pine)<br>V3-VARIP-04 | V3-VARIP-04; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [varip-05-array-chart-point.pine](varip-05-array-chart-point.pine)<br>V3-VARIP-05 | V3-VARIP-05; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [varip-06-map-int-float.pine](varip-06-map-int-float.pine)<br>V3-VARIP-06 | V3-VARIP-06; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Declaration eligibility only, not intrabar persistence. |
| [scalar-08-table-anchor-reset-identical-remerge.pine](scalar-08-table-anchor-reset-identical-remerge.pine)<br>V3-TABLE-ANCHOR-RESET | V3-TABLE-ANCHOR-RESET; UNSPECIFIED | 100 historical bars; unchanged defaults; at least two executions distinguish outcomes | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [array-01-generic-bool-default.pine](array-01-generic-bool-default.pine)<br>V3-GENERIC-BOOL-DEFAULT | V3-GENERIC-BOOL-DEFAULT; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. OUTCOME=0 does not identify false versus hypothetical na. |
| [strings-01-tostring-default-precision.pine](strings-01-tostring-default-precision.pine)<br>V3-TOSTRING-DEFAULT-PRECISION | V3-TOSTRING-DEFAULT-PRECISION; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Exact PRICE and THIRD table + log text required; OUTCOME alone is insufficient. |
| [array-02-get-index-literal-na.pine](array-02-get-index-literal-na.pine)<br>V3-ARRAY-NA-INDEX-01 | V3-ARRAY-NA-INDEX-01; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [array-03-get-index-math-round-na.pine](array-03-get-index-math-round-na.pine)<br>V3-ARRAY-NA-INDEX-02 | V3-ARRAY-NA-INDEX-02; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [strings-02-split-empty-separator-sizes.pine](strings-02-split-empty-separator-sizes.pine)<br>V3-SPLIT-EMPTY-SEPARATOR-SIZES | V3-SPLIT-EMPTY-SEPARATOR-SIZES; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [history-01-negative-offset.pine](history-01-negative-offset.pine)<br>V3-HISTORY-NEGATIVE-OFFSET | V3-HISTORY-NEGATIVE-OFFSET; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [history-02-unavailable-offset.pine](history-02-unavailable-offset.pine)<br>V3-HISTORY-UNAVAILABLE-OFFSET | V3-HISTORY-UNAVAILABLE-OFFSET; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [plot-01-series-offset-v3.pine](plot-01-series-offset-v3.pine)<br>V3-PLOT-SERIES-OFFSET-PINE3 | V3-PLOT-SERIES-OFFSET-PINE3; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [plot-02-series-offset-v4.pine](plot-02-series-offset-v4.pine)<br>V3-PLOT-SERIES-OFFSET-PINE4 | V3-PLOT-SERIES-OFFSET-PINE4; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-positive-const.pine](ledger-division-v5-positive-const.pine)<br>V3-LEDGER-DIV-V5-POSITIVE-CONST | LEDGER-613-DIV-POSITIVE-CONST; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-negative-numerator.pine](ledger-division-v5-negative-numerator.pine)<br>V3-LEDGER-DIV-V5-NEGATIVE-NUMERATOR | LEDGER-613-DIV-NEGATIVE-NUMERATOR; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-negative-denominator.pine](ledger-division-v5-negative-denominator.pine)<br>V3-LEDGER-DIV-V5-NEGATIVE-DENOMINATOR | LEDGER-613-DIV-NEGATIVE-DENOMINATOR; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-both-negative.pine](ledger-division-v5-both-negative.pine)<br>V3-LEDGER-DIV-V5-BOTH-NEGATIVE | LEDGER-613-DIV-BOTH-NEGATIVE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-negative-exact.pine](ledger-division-v5-negative-exact.pine)<br>V3-LEDGER-DIV-V5-NEGATIVE-EXACT | LEDGER-613-DIV-NEGATIVE-EXACT; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-float-control.pine](ledger-division-v5-float-control.pine)<br>V3-LEDGER-DIV-V5-FLOAT-CONTROL | LEDGER-613-DIV-FLOAT-CONTROL; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v5-input-control.pine](ledger-division-v5-input-control.pine)<br>V3-LEDGER-DIV-V5-INPUT-CONTROL | LEDGER-613-DIV-INPUT-CONTROL; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-positive-const.pine](ledger-division-v4-positive-const.pine)<br>V3-LEDGER-DIV-V4-POSITIVE-CONST | LEDGER-614-DIV-POSITIVE-CONST; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-negative-numerator.pine](ledger-division-v4-negative-numerator.pine)<br>V3-LEDGER-DIV-V4-NEGATIVE-NUMERATOR | LEDGER-614-DIV-NEGATIVE-NUMERATOR; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-negative-denominator.pine](ledger-division-v4-negative-denominator.pine)<br>V3-LEDGER-DIV-V4-NEGATIVE-DENOMINATOR | LEDGER-614-DIV-NEGATIVE-DENOMINATOR; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-both-negative.pine](ledger-division-v4-both-negative.pine)<br>V3-LEDGER-DIV-V4-BOTH-NEGATIVE | LEDGER-614-DIV-BOTH-NEGATIVE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-negative-exact.pine](ledger-division-v4-negative-exact.pine)<br>V3-LEDGER-DIV-V4-NEGATIVE-EXACT | LEDGER-614-DIV-NEGATIVE-EXACT; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-float-control.pine](ledger-division-v4-float-control.pine)<br>V3-LEDGER-DIV-V4-FLOAT-CONTROL | LEDGER-614-DIV-FLOAT-CONTROL; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [ledger-division-v4-input-control.pine](ledger-division-v4-input-control.pine)<br>V3-LEDGER-DIV-V4-INPUT-CONTROL | LEDGER-614-DIV-INPUT-CONTROL; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [strings-04-na-initializer.pine](strings-04-na-initializer.pine)<br>V3-STRING-NA-INITIALIZER | V3-STRING-NA-INITIALIZER; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [strings-03-tostring-eleven-decimal-rounding.pine](strings-03-tostring-eleven-decimal-rounding.pine)<br>V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING | V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. Exact POSITIVE and NEGATIVE table + log text required; OUTCOME alone is insufficient. |
| [conditional-01-unmatched-string-if.pine](conditional-01-unmatched-string-if.pine)<br>V3-UNMATCHED-STRING-IF | V3-UNMATCHED-STRING-IF; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. OUTCOME discriminator plus exact RESULT table + log text required. |
| [const-reference-array-accept-mutate.pine](const-reference-array-accept-mutate.pine)<br>V3-CONST-REF-ARRAY-ACCEPT-MUTATE | V3-CONST-REF-ARRAY-ACCEPT-MUTATE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-array-qualifier-diagnostic.pine](const-reference-array-qualifier-diagnostic.pine)<br>V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC | V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-array-replace-id.pine](const-reference-array-replace-id.pine)<br>V3-CONST-REF-ARRAY-REPLACE-ID | V3-CONST-REF-ARRAY-REPLACE-ID; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-matrix-accept-mutate.pine](const-reference-matrix-accept-mutate.pine)<br>V3-CONST-REF-MATRIX-ACCEPT-MUTATE | V3-CONST-REF-MATRIX-ACCEPT-MUTATE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-matrix-qualifier-diagnostic.pine](const-reference-matrix-qualifier-diagnostic.pine)<br>V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC | V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-matrix-replace-id.pine](const-reference-matrix-replace-id.pine)<br>V3-CONST-REF-MATRIX-REPLACE-ID | V3-CONST-REF-MATRIX-REPLACE-ID; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-map-accept-mutate.pine](const-reference-map-accept-mutate.pine)<br>V3-CONST-REF-MAP-ACCEPT-MUTATE | V3-CONST-REF-MAP-ACCEPT-MUTATE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-map-qualifier-diagnostic.pine](const-reference-map-qualifier-diagnostic.pine)<br>V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC | V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-map-replace-id.pine](const-reference-map-replace-id.pine)<br>V3-CONST-REF-MAP-REPLACE-ID | V3-CONST-REF-MAP-REPLACE-ID; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-line-accept-mutate.pine](const-reference-line-accept-mutate.pine)<br>V3-CONST-REF-LINE-ACCEPT-MUTATE | V3-CONST-REF-LINE-ACCEPT-MUTATE; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-line-qualifier-diagnostic.pine](const-reference-line-qualifier-diagnostic.pine)<br>V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC | V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [const-reference-line-replace-id.pine](const-reference-line-replace-id.pine)<br>V3-CONST-REF-LINE-REPLACE-ID | V3-CONST-REF-LINE-REPLACE-ID; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [colors-new-dynamic-low-v1.pine](colors-new-dynamic-low-v1.pine)<br>V3-COLOR-NEW-DYNAMIC-LOW | V3-COLOR-NEW-DYNAMIC-LOW; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [colors-new-dynamic-high-v1.pine](colors-new-dynamic-high-v1.pine)<br>V3-COLOR-NEW-DYNAMIC-HIGH | V3-COLOR-NEW-DYNAMIC-HIGH; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [colors-blue-constant-v1.pine](colors-blue-constant-v1.pine)<br>V3-COLOR-BLUE-CONSTANT | V3-COLOR-BLUE-CONSTANT; RUNS | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-matrix-sum-namespace.pine](corpus-matrix-sum-namespace.pine)<br>V3-CORPUS-MATRIX-SUM-NAMESPACE | V3-CORPUS-MATRIX-SUM-NAMESPACE; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-matrix-sum-method.pine](corpus-matrix-sum-method.pine)<br>V3-CORPUS-MATRIX-SUM-METHOD | V3-CORPUS-MATRIX-SUM-METHOD; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-matrix-float-to-int-id.pine](corpus-matrix-float-to-int-id.pine)<br>V3-CORPUS-MATRIX-FLOAT-TO-INT-ID | V3-CORPUS-MATRIX-FLOAT-TO-INT-ID; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-matrix-string-element.pine](corpus-matrix-string-element.pine)<br>V3-CORPUS-MATRIX-STRING-ELEMENT | V3-CORPUS-MATRIX-STRING-ELEMENT; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-array-string-element.pine](corpus-array-string-element.pine)<br>V3-CORPUS-ARRAY-STRING-ELEMENT | V3-CORPUS-ARRAY-STRING-ELEMENT; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-array-string-percentile.pine](corpus-array-string-percentile.pine)<br>V3-CORPUS-ARRAY-STRING-PERCENTILE | V3-CORPUS-ARRAY-STRING-PERCENTILE; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v6-na-bool.pine](corpus-v6-na-bool.pine)<br>V3-CORPUS-V6-NA-BOOL | V3-CORPUS-V6-NA-BOOL; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-fill-optional-color.pine](corpus-fill-optional-color.pine)<br>V3-CORPUS-FILL-OPTIONAL-COLOR | V3-CORPUS-FILL-OPTIONAL-COLOR; SUCCESS | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-hline-chart-point.pine](corpus-hline-chart-point.pine)<br>V3-CORPUS-HLINE-CHART-POINT | V3-CORPUS-HLINE-CHART-POINT; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-hline-matrix.pine](corpus-hline-matrix.pine)<br>V3-CORPUS-HLINE-MATRIX | V3-CORPUS-HLINE-MATRIX; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-fractional-series-division-int.pine](corpus-fractional-series-division-int.pine)<br>V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT | V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-fractional-timeframe-division-int.pine](corpus-fractional-timeframe-division-int.pine)<br>V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT | V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v5-tuple-call-target.pine](corpus-v5-tuple-call-target.pine)<br>V3-CORPUS-V5-TUPLE-CALL-TARGET | V3-CORPUS-V5-TUPLE-CALL-TARGET; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v5-ellipsis-placeholder.pine](corpus-v5-ellipsis-placeholder.pine)<br>V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER | V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v5-unary-plus-string.pine](corpus-v5-unary-plus-string.pine)<br>V3-CORPUS-V5-UNARY-PLUS-STRING | V3-CORPUS-V5-UNARY-PLUS-STRING; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v5-unknown-cbrt.pine](corpus-v5-unknown-cbrt.pine)<br>V3-CORPUS-V5-UNKNOWN-CBRT | V3-CORPUS-V5-UNKNOWN-CBRT; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-v5-unknown-hypot.pine](corpus-v5-unknown-hypot.pine)<br>V3-CORPUS-V5-UNKNOWN-HYPOT | V3-CORPUS-V5-UNKNOWN-HYPOT; UNSPECIFIED | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-footprint-missing-ticks.pine](corpus-footprint-missing-ticks.pine)<br>V3-CORPUS-FOOTPRINT-MISSING-TICKS | V3-CORPUS-FOOTPRINT-MISSING-TICKS; COMPILE-REJECTION | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |
| [corpus-function-value-shared-name.pine](corpus-function-value-shared-name.pine)<br>V3-CORPUS-FUNCTION-VALUE-SHARED-NAME | V3-CORPUS-FUNCTION-VALUE-SHARED-NAME; SUCCESS | 100 historical bars; unchanged defaults | Full exact native diagnostic if refused; otherwise complete OUTCOME CSV and relevant logs/visuals. |

## Copy-ready sources

Copy the entire Pine block for one script into a blank editor. Do not copy headings or backticks. Source SHA256 covers the standalone `.pine` file, including its final newline. Expected phases below use the prediction JSON terminology; observed statuses use COMPILE-ERROR / RUNTIME-ERROR / RUNS.

### 1. bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine

Source: [bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine](bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine). Indicator title: `V3-BOUNDS-01`. SHA256: `9a5aa1d04020621f39ec6d4d1864d2101a1901e831b1ffc5a9e7efb971c6f9c7`.

Target: `V3-BOUNDS-01` / `ta.percentile_nearest_rank`. Success file: `captures/v3/bounds-01-ta-percentile-nearest-rank-percentage--1-0-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_nearest_rank). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-01", max_bars_back=256)
plot(ta.percentile_nearest_rank(close, 5, -1.0), "OUTCOME")
```

### 2. bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine

Source: [bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine](bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine). Indicator title: `V3-BOUNDS-02`. SHA256: `a33168716db36e4f3d96de335e6fc8e87edaf6c4a7d5924634e0a5c7e771fc2a`.

Target: `V3-BOUNDS-02` / `ta.percentile_nearest_rank`. Success file: `captures/v3/bounds-02-ta-percentile-nearest-rank-percentage-101-0-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_nearest_rank). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-02", max_bars_back=256)
plot(ta.percentile_nearest_rank(close, 5, 101.0), "OUTCOME")
```

### 3. bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine

Source: [bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine](bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine). Indicator title: `V3-BOUNDS-03`. SHA256: `90f850193885b8d9589bcc7e4c19b344f1f1410914e40982f6ef9265b9236e85`.

Target: `V3-BOUNDS-03` / `ta.percentile_linear_interpolation`. Success file: `captures/v3/bounds-03-ta-percentile-linear-interpolation-percentage--1-0-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_linear_interpolation). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-03", max_bars_back=256)
plot(ta.percentile_linear_interpolation(close, 5, -1.0), "OUTCOME")
```

### 4. bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine

Source: [bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine](bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine). Indicator title: `V3-BOUNDS-04`. SHA256: `d794dce8bb0b3e3fc4837fd816ee867ae9e601eb9cb799cacbc3e930f9e70678`.

Target: `V3-BOUNDS-04` / `ta.percentile_linear_interpolation`. Success file: `captures/v3/bounds-04-ta-percentile-linear-interpolation-percentage-101-0-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_linear_interpolation). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-04", max_bars_back=256)
plot(ta.percentile_linear_interpolation(close, 5, 101.0), "OUTCOME")
```

### 5. bounds-05-ta-valuewhen-occurrence--1.pine

Source: [bounds-05-ta-valuewhen-occurrence--1.pine](bounds-05-ta-valuewhen-occurrence--1.pine). Indicator title: `V3-BOUNDS-05`. SHA256: `b539ec6523dfbfb220fa78ec8599935e74a3b1ae2c68676c5b9d022ebe7c20aa`.

Target: `V3-BOUNDS-05` / `ta.valuewhen`. Success file: `captures/v3/bounds-05-ta-valuewhen-occurrence--1-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.valuewhen). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-05", max_bars_back=256)
plot(ta.valuewhen(true, close, -1), "OUTCOME")
```

### 6. bounds-06-str-repeat-repeat--1.pine

Source: [bounds-06-str-repeat-repeat--1.pine](bounds-06-str-repeat-repeat--1.pine). Indicator title: `V3-BOUNDS-06`. SHA256: `4435c2fe8ba992c33432c67231dcfba0a2945d388876e86fb4ab660dca64a3f0`.

Target: `V3-BOUNDS-06` / `str.repeat`. Success file: `captures/v3/bounds-06-str-repeat-repeat--1-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_str.repeat). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-06", max_bars_back=256)
plot(str.length(str.repeat("x", input.int(-1))), "OUTCOME")
```

### 7. bounds-07-ta-pivot-point-levels-invalid-type.pine

Source: [bounds-07-ta-pivot-point-levels-invalid-type.pine](bounds-07-ta-pivot-point-levels-invalid-type.pine). Indicator title: `V3-BOUNDS-07`. SHA256: `d9878a478cabd6eb22b95cc8555052405d6a9af6306511ea3bed8c3f7b1a159e`.

Target: `V3-BOUNDS-07` / `ta.pivot_point_levels`. Success file: `captures/v3/bounds-07-ta-pivot-point-levels-invalid-type-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivot_point_levels). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-07", max_bars_back=256)
plot(array.size(ta.pivot_point_levels("INVALID", true, false)), "OUTCOME")
```

### 8. bounds-08-color-rgb-component-or-transparency.pine

Source: [bounds-08-color-rgb-component-or-transparency.pine](bounds-08-color-rgb-component-or-transparency.pine). Indicator title: `V3-BOUNDS-08`. SHA256: `16ac8ece6bb757aad83be103e773dfd229c4555edd699059859f68668c66dc74`.

Target: `V3-BOUNDS-08` / `color.rgb`. Success file: `captures/v3/bounds-08-color-rgb-component-or-transparency-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_color.rgb). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-08", max_bars_back=256)
plot(color.r(color.rgb(256, 0, 0)), "OUTCOME")
```

### 9. bounds-09-color-new-component-or-transparency.pine

Source: [bounds-09-color-new-component-or-transparency.pine](bounds-09-color-new-component-or-transparency.pine). Indicator title: `V3-BOUNDS-09`. SHA256: `060b1b418836e278861563de00fc7313990f140b65ea74c4535c0636fa549b35`.

Target: `V3-BOUNDS-09` / `color.new`. Success file: `captures/v3/bounds-09-color-new-component-or-transparency-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_color.new). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-09", max_bars_back=256)
plot(color.t(color.new(color.red, 101)), "OUTCOME")
```

### 10. bounds-10-label-set-size-text-size--1.pine

Source: [bounds-10-label-set-size-text-size--1.pine](bounds-10-label-set-size-text-size--1.pine). Indicator title: `V3-BOUNDS-10`. SHA256: `19dd856ab1d3a0446cac585487621ef1f2cab030ba1fef035ce9676edb170b16`.

Target: `V3-BOUNDS-10` / `label.set_size`. Success file: `captures/v3/bounds-10-label-set-size-text-size--1-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_label.set_size). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-10", max_bars_back=256)
l=label.new(bar_index,close)
label.set_size(l,-1)
plot(close, "OUTCOME")
```

### 11. bounds-11-table-cell-text-size--1.pine

Source: [bounds-11-table-cell-text-size--1.pine](bounds-11-table-cell-text-size--1.pine). Indicator title: `V3-BOUNDS-11`. SHA256: `390379f363368c2b8eeb039f644c78736dfd13abc6d48e7583421de2cf5fe247`.

Target: `V3-BOUNDS-11` / `table.cell`. Success file: `captures/v3/bounds-11-table-cell-text-size--1-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_table.cell). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-11", max_bars_back=256)
t=table.new(position.top_right,1,1)
table.cell(t,0,0,"x",text_size=-1)
plot(close, "OUTCOME")
```

### 12. bounds-12-table-cell-set-text-size-text-size--1.pine

Source: [bounds-12-table-cell-set-text-size-text-size--1.pine](bounds-12-table-cell-set-text-size-text-size--1.pine). Indicator title: `V3-BOUNDS-12`. SHA256: `e8bce681a9f90178a790d53f43f456ddb1635289b1be168be7c8faddf9976110`.

Target: `V3-BOUNDS-12` / `table.cell_set_text_size`. Success file: `captures/v3/bounds-12-table-cell-set-text-size-text-size--1-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current reference specifies accepted bounds; outside-domain consequence (runtime error vs compile refusal vs clamp/na) and exact stage are not established. No invented error is committed.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_table.cell_set_text_size). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-BOUNDS-12", max_bars_back=256)
t=table.new(position.top_right,1,1)
table.cell(t,0,0,"x")
table.cell_set_text_size(t,0,0,-1)
plot(close, "OUTCOME")
```

### 13. scalar-01-str-format-unbalanced-left-brace.pine

Source: [scalar-01-str-format-unbalanced-left-brace.pine](scalar-01-str-format-unbalanced-left-brace.pine). Indicator title: `V3-SCALAR-01`. SHA256: `887584e8eb04c7c8c61bcf18f9eaebfedec224f5ac189c712867bd30aa0db353`.

Target: `V3-SCALAR-01` / `str.format`. Success file: `captures/v3/scalar-01-str-format-unbalanced-left-brace-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Unquoted left braces must be balanced; explicit runtime error on imbalance.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_str.format). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-01", max_bars_back=256)
plot(str.length(str.format("ab {0", close)), "OUTCOME")
```

### 14. scalar-02-log-info-unbalanced-left-brace.pine

Source: [scalar-02-log-info-unbalanced-left-brace.pine](scalar-02-log-info-unbalanced-left-brace.pine). Indicator title: `V3-SCALAR-02`. SHA256: `31589a8942af56cc83605d1dd94e11ae25e2a7741470d65e16b69c258281983d`.

Target: `V3-SCALAR-02` / `log.info`. Success file: `captures/v3/scalar-02-log-info-unbalanced-left-brace-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Formatting placeholders must be balanced; logs use str.format formatting contract.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_log.info). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-02", max_bars_back=256)
log.info("ab {0", close)
plot(1, "OUTCOME")
```

### 15. scalar-03-log-warning-unbalanced-left-brace.pine

Source: [scalar-03-log-warning-unbalanced-left-brace.pine](scalar-03-log-warning-unbalanced-left-brace.pine). Indicator title: `V3-SCALAR-03`. SHA256: `eed710b13f3f76a69e41e903ae944052af9e80a10d9748d3132512b374dcc09f`.

Target: `V3-SCALAR-03` / `log.warning`. Success file: `captures/v3/scalar-03-log-warning-unbalanced-left-brace-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Formatting placeholders must be balanced; logs use str.format formatting contract.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_log.warning). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-03", max_bars_back=256)
log.warning("ab {0", close)
plot(1, "OUTCOME")
```

### 16. scalar-04-log-error-unbalanced-left-brace.pine

Source: [scalar-04-log-error-unbalanced-left-brace.pine](scalar-04-log-error-unbalanced-left-brace.pine). Indicator title: `V3-SCALAR-04`. SHA256: `c0cb728e5bc93e26bd4f87c26d109c8762cff3813681e90cd7261ca704972c20`.

Target: `V3-SCALAR-04` / `log.error`. Success file: `captures/v3/scalar-04-log-error-unbalanced-left-brace-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Formatting placeholders must be balanced; logs use str.format formatting contract.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_log.error). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-04", max_bars_back=256)
log.error("ab {0", close)
plot(1, "OUTCOME")
```

### 17. scalar-05-ta-pivot-point-levels-Woodie-developing.pine

Source: [scalar-05-ta-pivot-point-levels-Woodie-developing.pine](scalar-05-ta-pivot-point-levels-Woodie-developing.pine). Indicator title: `V3-SCALAR-05`. SHA256: `383adc0fd72e501b8d466246bb510ab75df32248da93ac8ea009ac73b29ff39e`.

Target: `V3-SCALAR-05` / `ta.pivot_point_levels`. Success file: `captures/v3/scalar-05-ta-pivot-point-levels-Woodie-developing-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Woodie with developing=true explicitly raises a runtime error.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivot_point_levels). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-05", max_bars_back=256)
plot(array.size(ta.pivot_point_levels("Woodie", true, true)), "OUTCOME")
```

### 18. scalar-06-line-get-price-time-xloc.pine

Source: [scalar-06-line-get-price-time-xloc.pine](scalar-06-line-get-price-time-xloc.pine). Indicator title: `V3-SCALAR-06`. SHA256: `9b7c16634b396d246d95656dfb321090dfcd5bce45f57e791e95bfd5c7bf688b`.

Target: `V3-SCALAR-06` / `line.get_price`. Success file: `captures/v3/scalar-06-line-get-price-time-xloc-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Calling line.get_price on a bar-time line explicitly generates an error.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_line.get_price). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-06", max_bars_back=256)
l=line.new(time,close,time+120000,close,xloc=xloc.bar_time)
plot(line.get_price(l, bar_index), "OUTCOME")
```

### 19. scalar-07-table-merge-cells-merge-already-merged.pine

Source: [scalar-07-table-merge-cells-merge-already-merged.pine](scalar-07-table-merge-cells-merge-already-merged.pine). Indicator title: `V3-SCALAR-07`. SHA256: `61b0bb3bf9b3c0f96b1c980b16b66ac6d00b10a7e19af1e499c9c66a6baad458`.

Target: `V3-SCALAR-07` / `table.merge_cells`. Success file: `captures/v3/scalar-07-table-merge-cells-merge-already-merged-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Attempt to merge an already merged cell explicitly results in an error.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_table.merge_cells). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SCALAR-07", max_bars_back=256)
t=table.new(position.top_right,2,2)
table.merge_cells(t, 0, 0, 1, 0)
table.merge_cells(t, 0, 0, 1, 0)
plot(1, "OUTCOME")
```

### 20. request-01-request-financial-invalid-provider-key.pine

Source: [request-01-request-financial-invalid-provider-key.pine](request-01-request-financial-invalid-provider-key.pine). Indicator title: `V3-REQUEST-01`. SHA256: `09cb064806e1b2bda568ab2928e0ad3426aa866e1a74de4a830f5a360c16cac7`.

Target: `V3-REQUEST-01` / `request.financial`. Success file: `captures/v3/request-01-request-financial-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.financial). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-01", max_bars_back=256)
plot(request.financial("INVALID:__ARG_AUDIT__","TOTAL_REVENUE","FQ",ignore_invalid_symbol=false), "OUTCOME")
```

### 21. request-02-request-quandl-invalid-provider-key.pine

Source: [request-02-request-quandl-invalid-provider-key.pine](request-02-request-quandl-invalid-provider-key.pine). Indicator title: `V3-REQUEST-02`. SHA256: `890fad073295c649da9768f46687f28273be67890ba6c225083a99119e37036c`.

Target: `V3-REQUEST-02` / `request.quandl`. Success file: `captures/v3/request-02-request-quandl-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.quandl). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-02", max_bars_back=256)
plot(request.quandl("INVALID/__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
```

### 22. request-03-request-earnings-invalid-provider-key.pine

Source: [request-03-request-earnings-invalid-provider-key.pine](request-03-request-earnings-invalid-provider-key.pine). Indicator title: `V3-REQUEST-03`. SHA256: `c233a8c9c0b08e5f43795e874f22d91d6c67132cef018a6c96d4421368115ad6`.

Target: `V3-REQUEST-03` / `request.earnings`. Success file: `captures/v3/request-03-request-earnings-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.earnings). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-03", max_bars_back=256)
plot(request.earnings("INVALID:__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
```

### 23. request-04-request-dividends-invalid-provider-key.pine

Source: [request-04-request-dividends-invalid-provider-key.pine](request-04-request-dividends-invalid-provider-key.pine). Indicator title: `V3-REQUEST-04`. SHA256: `46f2cf4065463ba7017fcfa248dfe943263a40f5eefa088c3275b55f920d3489`.

Target: `V3-REQUEST-04` / `request.dividends`. Success file: `captures/v3/request-04-request-dividends-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.dividends). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-04", max_bars_back=256)
plot(request.dividends("INVALID:__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
```

### 24. request-05-request-splits-invalid-provider-key.pine

Source: [request-05-request-splits-invalid-provider-key.pine](request-05-request-splits-invalid-provider-key.pine). Indicator title: `V3-REQUEST-05`. SHA256: `6c2c12b810e2c9e58ba003f38c18eeee55def020c2a11e21c805f96e3c1cac9e`.

Target: `V3-REQUEST-05` / `request.splits`. Success file: `captures/v3/request-05-request-splits-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.splits). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-05", max_bars_back=256)
plot(request.splits("INVALID:__ARG_AUDIT__",ignore_invalid_symbol=false), "OUTCOME")
```

### 25. request-06-request-economic-invalid-provider-key.pine

Source: [request-06-request-economic-invalid-provider-key.pine](request-06-request-economic-invalid-provider-key.pine). Indicator title: `V3-REQUEST-06`. SHA256: `e4bbce32f6d4943b84e1140becac092f09921e07013d7edbf5be083b6957f28d`.

Target: `V3-REQUEST-06` / `request.economic`. Success file: `captures/v3/request-06-request-economic-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.economic). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-06", max_bars_back=256)
plot(request.economic("INVALID","INVALID",ignore_invalid_symbol=false), "OUTCOME")
```

### 26. request-07-request-currency-rate-invalid-provider-key.pine

Source: [request-07-request-currency-rate-invalid-provider-key.pine](request-07-request-currency-rate-invalid-provider-key.pine). Indicator title: `V3-REQUEST-07`. SHA256: `c0bbc9ac09f77f027e3e3ad9f212f93bfc0f36204ca1c4eca1f584b66f49a47f`.

Target: `V3-REQUEST-07` / `request.currency_rate`. Success file: `captures/v3/request-07-request-currency-rate-invalid-provider-key-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Invalid symbol/currency with ignore-invalid=false must halt; true is its non-error control.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.currency_rate). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-REQUEST-07", max_bars_back=256)
plot(request.currency_rate("INVALID","USD",ignore_invalid_currency=false), "OUTCOME")
```

### 27. drawing-01-line-new-future-index-501.pine

Source: [drawing-01-line-new-future-index-501.pine](drawing-01-line-new-future-index-501.pine). Indicator title: `V3-DRAWING-01`. SHA256: `32915548a3b1301ba32ddd18bbe21ca6ced313f89ed31cb26d8c84fe23ce4a9a`.

Target: `V3-DRAWING-01` / `line.new`. Success file: `captures/v3/drawing-01-line-new-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-01", max_bars_back=256)
l = line.new(bar_index + 501, close, bar_index, close)
plot(1, "OUTCOME")
```

### 28. drawing-02-line-set-x1-future-index-501.pine

Source: [drawing-02-line-set-x1-future-index-501.pine](drawing-02-line-set-x1-future-index-501.pine). Indicator title: `V3-DRAWING-02`. SHA256: `65ff3bd4ec992178c14101bc8412466c26acdc42a8dfe1520b63e8e1688c988e`.

Target: `V3-DRAWING-02` / `line.set_x1`. Success file: `captures/v3/drawing-02-line-set-x1-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-02", max_bars_back=256)
l=line.new(bar_index,close,bar_index+1,close)
line.set_x1(l,bar_index+501)
plot(1, "OUTCOME")
```

### 29. drawing-03-line-set-xy1-future-index-501.pine

Source: [drawing-03-line-set-xy1-future-index-501.pine](drawing-03-line-set-xy1-future-index-501.pine). Indicator title: `V3-DRAWING-03`. SHA256: `77853668c937ce24a8e8fff12350e624e3ac6ce6d25e8fb28422e0d8368cdccc`.

Target: `V3-DRAWING-03` / `line.set_xy1`. Success file: `captures/v3/drawing-03-line-set-xy1-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-03", max_bars_back=256)
l=line.new(bar_index,close,bar_index+1,close)
line.set_xy1(l,bar_index+501,close)
plot(1, "OUTCOME")
```

### 30. drawing-04-line-set-x2-future-index-501.pine

Source: [drawing-04-line-set-x2-future-index-501.pine](drawing-04-line-set-x2-future-index-501.pine). Indicator title: `V3-DRAWING-04`. SHA256: `36c679d62a106e600e714d4bd7fc9c6ea32bd74095a18fd4f378ebc340c178bb`.

Target: `V3-DRAWING-04` / `line.set_x2`. Success file: `captures/v3/drawing-04-line-set-x2-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-04", max_bars_back=256)
l=line.new(bar_index,close,bar_index+1,close)
line.set_x2(l,bar_index+501)
plot(1, "OUTCOME")
```

### 31. drawing-05-box-set-left-future-index-501.pine

Source: [drawing-05-box-set-left-future-index-501.pine](drawing-05-box-set-left-future-index-501.pine). Indicator title: `V3-DRAWING-05`. SHA256: `f0f817a6d1a6ade7d504996d793d5cc3d2206cf711a4fc106fa9413e64ab07f2`.

Target: `V3-DRAWING-05` / `box.set_left`. Success file: `captures/v3/drawing-05-box-set-left-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-05", max_bars_back=256)
b=box.new(bar_index,high,bar_index+2,low)
box.set_left(b,bar_index+501)
plot(1, "OUTCOME")
```

### 32. drawing-06-box-set-right-future-index-501.pine

Source: [drawing-06-box-set-right-future-index-501.pine](drawing-06-box-set-right-future-index-501.pine). Indicator title: `V3-DRAWING-06`. SHA256: `1d4397e486d097706c3faaf3e7c6d492e7513695f815e19b39a8e7345d1b842a`.

Target: `V3-DRAWING-06` / `box.set_right`. Success file: `captures/v3/drawing-06-box-set-right-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-06", max_bars_back=256)
b=box.new(bar_index,high,bar_index+2,low)
box.set_right(b,bar_index+501)
plot(1, "OUTCOME")
```

### 33. drawing-07-label-new-future-index-501.pine

Source: [drawing-07-label-new-future-index-501.pine](drawing-07-label-new-future-index-501.pine). Indicator title: `V3-DRAWING-07`. SHA256: `cc2d4b84ffb9bea9a298f26e455bf8bd6572f8ae336fb7196b122fc0d3ab6b94`.

Target: `V3-DRAWING-07` / `label.new`. Success file: `captures/v3/drawing-07-label-new-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-07", max_bars_back=256)
label.new(bar_index+501,close)
plot(1, "OUTCOME")
```

### 34. drawing-08-label-set-x-future-index-501.pine

Source: [drawing-08-label-set-x-future-index-501.pine](drawing-08-label-set-x-future-index-501.pine). Indicator title: `V3-DRAWING-08`. SHA256: `4161bdd8a01681120a667c8d6991d4984996400bc06bd9d18a7a255d44a3b7d5`.

Target: `V3-DRAWING-08` / `label.set_x`. Success file: `captures/v3/drawing-08-label-set-x-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-08", max_bars_back=256)
l=label.new(bar_index,close)
label.set_x(l,bar_index+501)
plot(1, "OUTCOME")
```

### 35. drawing-09-label-set-xy-future-index-501.pine

Source: [drawing-09-label-set-xy-future-index-501.pine](drawing-09-label-set-xy-future-index-501.pine). Indicator title: `V3-DRAWING-09`. SHA256: `3ba9abfc76bbd01435c3e8a2308a0aea1ba36884c595734fe04e34e46275064a`.

Target: `V3-DRAWING-09` / `label.set_xy`. Success file: `captures/v3/drawing-09-label-set-xy-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-09", max_bars_back=256)
l=label.new(bar_index,close)
label.set_xy(l,bar_index+501,close)
plot(1, "OUTCOME")
```

### 36. drawing-10-line-set-xy2-future-index-501.pine

Source: [drawing-10-line-set-xy2-future-index-501.pine](drawing-10-line-set-xy2-future-index-501.pine). Indicator title: `V3-DRAWING-10`. SHA256: `b43728d831b7ebe26dbcf9f7657c094a6606a1e5ab8d15eb9154f6732d3c39c9`.

Target: `V3-DRAWING-10` / `line.set_xy2`. Success file: `captures/v3/drawing-10-line-set-xy2-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-10", max_bars_back=256)
l=line.new(bar_index,close,bar_index+1,close)
line.set_xy2(l,bar_index+501,close)
plot(1, "OUTCOME")
```

### 37. drawing-11-box-new-future-index-501.pine

Source: [drawing-11-box-new-future-index-501.pine](drawing-11-box-new-future-index-501.pine). Indicator title: `V3-DRAWING-11`. SHA256: `5a2e466670b351a9165015de65d98fbe6d3ffee02d23f3d6390fc9e163e80286`.

Target: `V3-DRAWING-11` / `box.new`. Success file: `captures/v3/drawing-11-box-new-future-index-501-attempt<N>.csv`.

Prediction: RUNTIME-REJECTION. Current v6 FAQ explicitly describes future bar-index drawing errors (>500), settling the runtime consequence; numeric code/stage details not captured.

Evidence to save:

- Unmodified source, SHA256, exact tickerid/timeframe/host and default inputs.
- Compile or runtime diagnostic: full text, code if exposed, line/column, function/argument/value and first failing bar/time.
- If successful: exported OUTCOME CSV including na, Pine Logs and relevant drawing/table screenshots.

Interpretation: Record the observed phase even when it differs from the documented prediction. Do not edit rejected scripts. Unrelated syntax, host, network or resource errors are instrument failures. A procedural OUTCOME=1 only establishes acceptance, not clamping semantics.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/faq/techniques/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-DRAWING-11", max_bars_back=256)
box.new(bar_index,high,bar_index+501,low)
plot(1, "OUTCOME")
```

### 38. varip-01-chart-point.pine

Source: [varip-01-chart-point.pine](varip-01-chart-point.pine). Indicator title: `V3-VARIP-01`. SHA256: `6b06837dfe53bfadfaa5c79e4f2d22fc0e5495f5027ddc080cb469a7b3326ae2`.

Target: `V3-VARIP-01` / `varip`. Success file: `captures/v3/varip-01-chart-point-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits chart.point. Prediction `SUCCESS`; OUTCOME equals the close from the first execution because the point is initialized once. Manual predicts declaration acceptance; intrabar object behavior is not measured.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-01")
varip chart.point value = chart.point.now(close)
plot(value.price, "OUTCOME")
```

### 39. varip-02-footprint.pine

Source: [varip-02-footprint.pine](varip-02-footprint.pine). Indicator title: `V3-VARIP-02`. SHA256: `284a1845edc76157df8402e151bedfc0590f0236c12619e2f69b77f5d857e865`.

Target: `V3-VARIP-02` / `varip`. Success file: `captures/v3/varip-02-footprint-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits footprint. Prediction `SUCCESS`; OUTCOME=1; only declaration eligibility is tested. No request.footprint or na(footprint) call introduces another acceptance contract. Manual predicts declaration acceptance; intrabar object behavior is not measured. Values: {"OUTCOME": 1}.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-02")
varip footprint value = na
plot(1, "OUTCOME")
```

### 40. varip-03-volume-row.pine

Source: [varip-03-volume-row.pine](varip-03-volume-row.pine). Indicator title: `V3-VARIP-03`. SHA256: `4689f5c5d31ae342624b416f29f014cd77ac06efc2eedb040a8bfde91bcb57fd`.

Target: `V3-VARIP-03` / `varip`. Success file: `captures/v3/varip-03-volume-row-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits volume_row. Prediction `SUCCESS`; OUTCOME=1; only declaration eligibility is tested. No footprint feed, row method or na(volume_row) call is required. Manual predicts declaration acceptance; intrabar object behavior is not measured. Values: {"OUTCOME": 1}.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-03")
varip volume_row value = na
plot(1, "OUTCOME")
```

### 41. varip-04-enum.pine

Source: [varip-04-enum.pine](varip-04-enum.pine). Indicator title: `V3-VARIP-04`. SHA256: `4fb4786a1602cae3648752c9fe66b5c42eadc87f6d5365991b7a761bd340b91f`.

Target: `V3-VARIP-04` / `varip`. Success file: `captures/v3/varip-04-enum-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits enum. Prediction `SUCCESS`; OUTCOME=1. Manual predicts declaration acceptance; intrabar object behavior is not measured. Values: {"OUTCOME": 1}.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-04")
enum V3Enum
    member
varip V3Enum value = V3Enum.member
plot(value == V3Enum.member ? 1 : 0, "OUTCOME")
```

### 42. varip-05-array-chart-point.pine

Source: [varip-05-array-chart-point.pine](varip-05-array-chart-point.pine). Indicator title: `V3-VARIP-05`. SHA256: `6f491465966b678d51d0782b7310b950f1000611bf73d74431a8a0c4c1aacd02`.

Target: `V3-VARIP-05` / `varip`. Success file: `captures/v3/varip-05-array-chart-point-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits array<chart.point>. Prediction `SUCCESS`; OUTCOME=0 for the empty array; this tests the declared element type, not element mutation/rollback. Manual predicts declaration acceptance; intrabar object behavior is not measured. Values: {"OUTCOME": 0}.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-05")
varip array<chart.point> value = array.new<chart.point>(0)
plot(array.size(value), "OUTCOME")
```

### 43. varip-06-map-int-float.pine

Source: [varip-06-map-int-float.pine](varip-06-map-int-float.pine). Indicator title: `V3-VARIP-06`. SHA256: `36743214425a8e4be4e9e4e8b31be7b115fb49765250e964f64cf069c40f72d1`.

Target: `V3-VARIP-06` / `varip`. Success file: `captures/v3/varip-06-map-int-float-attempt<N>.csv`.

Prediction: UNSPECIFIED. Conflicting official authority; capture native compile/runtime/success outcome before settling.

Claim a: Reference keyword entry restricts varip to fundamental types, UDTs, and arrays/matrices of those types; special types are excluded. Enum and map refusal follow the closed-whitelist reading, not a native observation. Prediction `COMPILE-REJECTION`; Literal reference whitelist excludes this declaration type. Refusal/stage is the conditional prediction of that reading; no code/text is known.

Claim b: Manual varip section permits map<int,float>. Prediction `SUCCESS`; OUTCOME=0 for the empty map. Manual predicts declaration acceptance; intrabar object behavior is not measured. Values: {"OUTCOME": 0}.

Evidence to save:

- Unmodified source/hash and full native compile/runtime diagnostic with exact line/code/text, or successful OUTCOME CSV.
- Record native acceptance of the declaration; footprint and volume_row intentionally remain na to avoid entitlement/datafeed confounds.

Interpretation: Match the observed declaration outcome to each conditional authority prediction. Do not infer intrabar persistence from a successful compile or constant sentinel. Any unrelated syntax/type/helper failure is an instrument failure.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#kw_varip), [source 2](https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-VARIP-06")
varip map<int, float> value = map.new<int, float>()
plot(map.size(value), "OUTCOME")
```

### 44. scalar-08-table-anchor-reset-identical-remerge.pine

Source: [scalar-08-table-anchor-reset-identical-remerge.pine](scalar-08-table-anchor-reset-identical-remerge.pine). Indicator title: `V3-TABLE-ANCHOR-RESET`. SHA256: `8cdb8a462866fc66294edd35aefbe6146c2c8657847456e3fb579c8ea35de7b6`.

Target: `V3-TABLE-ANCHOR-RESET` / `table.merge_cells`. Success file: `captures/v3/scalar-08-table-anchor-reset-identical-remerge-attempt<N>.csv`.

Prediction: UNSPECIFIED. TRACE-REQUIRED: reference refuses already merged cells; whether an intervening table.cell anchor redefinition permits the identical merge is unspecified. Provisional engine permits it based on published corpus v7:45, not a TV capture.

Claim a: Persistent merged state survives anchor redefinition. Prediction `RUNTIME-ERROR`;  First bar: 1.

Claim b: Anchor redefinition permits the same range again. Prediction `SUCCESS`;  Values: {"OUTCOME": 1}.

Evidence to save:

- Capture at least two bars. First bar succeeds under both predictions; second bar distinguishes them. Record native error phase, bar, code/text or all-ones OUTCOME CSV.

Interpretation: Single first-bar success is insufficient. Published source proves usage, not native acceptance.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_table.merge_cells), [source 2](https://www.tradingview.com/pine-script-docs/visuals/tables/#merging-cells). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-TABLE-ANCHOR-RESET")
var table panel = table.new(position.top_right, 3, 1)
table.cell(panel, 0, 0, str.tostring(bar_index))
table.merge_cells(panel, 0, 0, 2, 0)
plot(1, "OUTCOME")
```

### 45. array-01-generic-bool-default.pine

Source: [array-01-generic-bool-default.pine](array-01-generic-bool-default.pine). Indicator title: `V3-GENERIC-BOOL-DEFAULT`. SHA256: `0a772bd1ef3dbb22caa8335a8da894f8f8a6db5568c83dce4919a8b1942253a5`.

Target: `V3-GENERIC-BOOL-DEFAULT` / `array.new<bool>`. Success file: `captures/v3/array-01-generic-bool-default-attempt<N>.csv`.

Prediction: UNSPECIFIED. Capture acceptance or diagnostic. An OUTCOME=0 success does NOT distinguish false from a hypothetical na condition coerced false; this outcome-only probe cannot prove internal element identity.

Claim a: Generic array prose defaults elements to na. Applied literally to bool, this conflicts with the v6 bool domain; no rejection stage/code is specified. If a historical bool-na reading reaches the ternary, OUTCOME is 0. Prediction `UNSPECIFIED`; No documented error consequence for this contradictory bool default. Conditional successful output: {"OUTCOME": 0}.

Claim b: Typed array.new_bool default is false; v6 bool values have only true/false. Applying the bool-specific rule to the generic constructor predicts false elements. Prediction `SUCCESS`;  Values: {"OUTCOME": 0}.

Evidence to save:

- Native successful OUTCOME CSV or exact diagnostic phase/code/text.

Interpretation: Do not report output 0 as evidence uniquely settling the default element; both successful ternary readings produce it.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_array.new%3Ctype%3E), [source 2](https://www.tradingview.com/pine-script-docs/language/arrays/#declaring-arrays), [source 3](https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_bool), [source 4](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#boolean-values-cannot-be-na). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-GENERIC-BOOL-DEFAULT")
values = array.new<bool>(3)
plot(array.get(values, 0) ? 1 : 0, "OUTCOME")
```

### 46. strings-01-tostring-default-precision.pine

Source: [strings-01-tostring-default-precision.pine](strings-01-tostring-default-precision.pine). Indicator title: `V3-TOSTRING-DEFAULT-PRECISION`. SHA256: `92028223d991ce604ae5a5bffda7ef359ac6feb02847960c68332c2f2ea6320f`.

Target: `V3-TOSTRING-DEFAULT-PRECISION` / `str.tostring`. Success file: `captures/v3/strings-01-tostring-default-precision-attempt<N>.csv`.

Prediction: UNSPECIFIED. Both authorities predict acceptance but disagree on THIRD exact text. Capture native strings, not numeric parses or display precision. PRICE is a rounding control and is predicted identical under both readings.

Claim a: Current reference format argument defaults to #.########## (ten fractional places, without trailing zeros). Prediction `SUCCESS`; Predicted strings from ten-place rounding; capture exact native text. Exact text prediction: {"PRICE": "78477.5908", "THIRD": "0.3333333333"}. Values: {"OUTCOME": 1}.

Claim b: Current Strings manual defaults to #.######## (eight fractional places, without trailing zeros). Prediction `SUCCESS`; Predicted strings from eight-place rounding; capture exact native text. Exact text prediction: {"PRICE": "78477.5908", "THIRD": "0.33333333"}. Values: {"OUTCOME": 1}.

Evidence to save:

- Record exact PRICE and THIRD text from both table cells and both first-bar log.info messages; retain Pine Logs text and a table screenshot. Copy characters without converting to numbers or removing zeros.
- Retain successful OUTCOME CSV and full native diagnostic if any. OUTCOME=1 only demonstrates execution and does not settle string formatting.

Interpretation: THIRD distinguishes eight from ten decimal places; PRICE does not distinguish those predictions. Preserve actual strings even if neither predicted text matches. Chart/CSV numeric display precision is not string formatting.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring), [source 2](https://www.tradingview.com/pine-script-docs/concepts/strings/#converting-values-to-strings). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-TOSTRING-DEFAULT-PRECISION")
priceText = str.tostring(78477.59079999999)
thirdText = str.tostring(1.0 / 3.0)
var table display = table.new(position.top_right, 1, 2)
if barstate.isfirst
    table.cell(display, 0, 0, "PRICE=" + priceText)
    table.cell(display, 0, 1, "THIRD=" + thirdText)
    log.info("PRICE=" + priceText)
    log.info("THIRD=" + thirdText)
plot(1, "OUTCOME")
```

### 47. array-02-get-index-literal-na.pine

Source: [array-02-get-index-literal-na.pine](array-02-get-index-literal-na.pine). Indicator title: `V3-ARRAY-NA-INDEX-01`. SHA256: `250f383cef4e3c4309efb7b6bc8033c20b5383ba75ed63664d2cb133533d1b48`.

Target: `V3-ARRAY-NA-INDEX-01` / `array.get`. Success file: `captures/v3/array-02-get-index-literal-na-attempt<N>.csv`.

Prediction: UNSPECIFIED. Capture exact compile/runtime/success outcome for a missing index. Integer index domain does not by itself establish missing-index consequence. Do not classify na as error or assume index zero.

Evidence to save:

- Retain exact native diagnostic code/text, stage, line and failing bar/time if refused; otherwise export the full OUTCOME values/missingness.
- If accepted, distinguish value1 (index0), value2, value3 and missing output. No local engine result is authority.

Interpretation: Each script has one target; math.round(na) adds a possible helper/type refusal. Preserve exact failing call and do not attribute a math.round error to array.get.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_array.get), [source 2](https://www.tradingview.com/pine-script-docs/language/arrays/#index-xx-is-out-of-bounds-array-size-is-yy). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-ARRAY-NA-INDEX-01")
plot(array.get(array.from(1, 2, 3), na), "OUTCOME")
```

### 48. array-03-get-index-math-round-na.pine

Source: [array-03-get-index-math-round-na.pine](array-03-get-index-math-round-na.pine). Indicator title: `V3-ARRAY-NA-INDEX-02`. SHA256: `d59a1fa127804938ecd673e1be6da04b81f66a99e56f680b52990468f338c8bc`.

Target: `V3-ARRAY-NA-INDEX-02` / `array.get`. Success file: `captures/v3/array-03-get-index-math-round-na-attempt<N>.csv`.

Prediction: UNSPECIFIED. Capture exact compile/runtime/success outcome for a missing index. Integer index domain does not by itself establish missing-index consequence. Do not classify na as error or assume index zero.

Evidence to save:

- Retain exact native diagnostic code/text, stage, line and failing bar/time if refused; otherwise export the full OUTCOME values/missingness.
- If accepted, distinguish value1 (index0), value2, value3 and missing output. No local engine result is authority.

Interpretation: Each script has one target; math.round(na) adds a possible helper/type refusal. Preserve exact failing call and do not attribute a math.round error to array.get.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_array.get), [source 2](https://www.tradingview.com/pine-script-docs/language/arrays/#index-xx-is-out-of-bounds-array-size-is-yy). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-ARRAY-NA-INDEX-02")
plot(array.get(array.from(1, 2, 3), math.round(na)), "OUTCOME")
```

### 49. strings-02-split-empty-separator-sizes.pine

Source: [strings-02-split-empty-separator-sizes.pine](strings-02-split-empty-separator-sizes.pine). Indicator title: `V3-SPLIT-EMPTY-SEPARATOR-SIZES`. SHA256: `c5d67ee4c05e0b1c7a96cd677bebab828e2a3f312c67c6beb703f26ca67b81e2`.

Target: `V3-SPLIT-EMPTY-SEPARATOR-SIZES` / `str.split`. Success file: `captures/v3/strings-02-split-empty-separator-sizes-attempt<N>.csv`.

Prediction: UNSPECIFIED. Current Strings manual settles ABC=3 via single-character substrings. EMPTY=0 is an inference, not an explicit empty-source guarantee. Capture both exact native sizes.

Evidence to save:

- Copy exact first-bar Pine Logs messages EMPTY=<size> and ABC=<size>. Preserve exact diagnostic stage/text if either call fails.
- Save OUTCOME CSV as execution sentinel only; it does not establish either size.

Interpretation: These two closely related size observations share one script as requested. First-call refusal masks ABC; record that limit instead of assuming its result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_str.split), [source 2](https://www.tradingview.com/pine-script-docs/concepts/strings/#splitting-strings). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-SPLIT-EMPTY-SEPARATOR-SIZES")
a = str.split("", "")
b = str.split("abc", "")
if barstate.isfirst
    log.info("EMPTY=" + str.tostring(array.size(a)))
    log.info("ABC=" + str.tostring(array.size(b)))
plot(1, "OUTCOME")
```

### 50. history-01-negative-offset.pine

Source: [history-01-negative-offset.pine](history-01-negative-offset.pine). Indicator title: `V3-HISTORY-NEGATIVE-OFFSET`. SHA256: `ac82a6c6c4c7aa9cd81277aa3bf14660141a09bcd5860036654573d933a8965a`.

Target: `V3-HISTORY-NEGATIVE-OFFSET` / `close[]`. Success file: `captures/v3/history-01-negative-offset-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe literal negative history offset acceptance and its exact compile/runtime/value consequence. Do not assume na or an error.

Evidence to save:

- Keep the source and its Pine version unchanged. Save exact native diagnostic text/code, stage, line and first failing bar/time if refused.
- If successful, export every OUTCOME value and missingness; compare timestamps with the exported chart close. Literal-offset evidence does not settle all dynamic offset cases.

Interpretation: Record native observations without editing the source. Local parser/engine results are instrument checks only. Unrelated setup or helper refusal leaves any masked target consequence unresolved.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/operators/#-history-referencing-operator). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-HISTORY-NEGATIVE-OFFSET")
plot(close[-1], "OUTCOME")
```

### 51. history-02-unavailable-offset.pine

Source: [history-02-unavailable-offset.pine](history-02-unavailable-offset.pine). Indicator title: `V3-HISTORY-UNAVAILABLE-OFFSET`. SHA256: `e4990ac56b05ec36146a3d1d49498d9d36846c990a1261c8e92179a421e9ba75`.

Target: `V3-HISTORY-UNAVAILABLE-OFFSET` / `close[]`. Success file: `captures/v3/history-02-unavailable-offset-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe an unavailable integer history offset. This construction does not establish an infinity conversion or every nonfinite input consequence.

Evidence to save:

- Keep the source and its Pine version unchanged. Save exact native diagnostic text/code, stage, line and first failing bar/time if refused.
- Preserve whether refusal identifies int(na) or the history operator. If successful, export every OUTCOME value and missingness; do not treat missing output as a runtime error.

Interpretation: Record native observations without editing the source. Local parser/engine results are instrument checks only. Unrelated setup or helper refusal leaves any masked target consequence unresolved.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/operators/#-history-referencing-operator). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-HISTORY-UNAVAILABLE-OFFSET")
plot(close[int(na)], "OUTCOME")
```

### 52. plot-01-series-offset-v3.pine

Source: [plot-01-series-offset-v3.pine](plot-01-series-offset-v3.pine). Indicator title: `V3-PLOT-SERIES-OFFSET-PINE3`. SHA256: `d46334e18abac484583a7f2948031665504e66aec4d09977859f02845e955178`.

Target: `V3-PLOT-SERIES-OFFSET-PINE3` / `plot`. Success file: `captures/v3/plot-01-series-offset-v3-attempt<N>.csv`.

Prediction: UNSPECIFIED. Pine v3 series offset acceptance and rendered placement are unobserved. A later-version migration example does not settle this version.

Evidence to save:

- Keep the source and its Pine version unchanged. Save exact native diagnostic text/code, stage, line and first failing bar/time if refused.
- If accepted, retain chart screenshots with timestamp/price coordinates for bars where close > open and close <= open, plus the OUTCOME CSV and chart OHLC. Record the newest offset and the next update separately. CSV alone may not show rendered displacement.

Interpretation: Record native observations without editing the source. Local parser/engine results are instrument checks only. Unrelated setup or helper refusal leaves any masked target consequence unresolved.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#the-offset-parameter-no-longer-accepts-series-values). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=3
study("V3-PLOT-SERIES-OFFSET-PINE3")
o = close > open ? 1 : -1
plot(close, "OUTCOME", offset=o)
```

### 53. plot-02-series-offset-v4.pine

Source: [plot-02-series-offset-v4.pine](plot-02-series-offset-v4.pine). Indicator title: `V3-PLOT-SERIES-OFFSET-PINE4`. SHA256: `b185797f2f3d4fa725752c8ebfd76e8429c619de35f1095c77e1fe422aa94788`.

Target: `V3-PLOT-SERIES-OFFSET-PINE4` / `plot`. Success file: `captures/v3/plot-02-series-offset-v4-attempt<N>.csv`.

Prediction: UNSPECIFIED. Pine v4 series offset acceptance and rendered placement are unobserved. Do not extrapolate v5 acceptance or v6 refusal.

Evidence to save:

- Keep the source and its Pine version unchanged. Save exact native diagnostic text/code, stage, line and first failing bar/time if refused.
- If accepted, retain chart screenshots with timestamp/price coordinates for bars where close > open and close <= open, plus the OUTCOME CSV and chart OHLC. Record the newest offset and the next update separately. CSV alone may not show rendered displacement.

Interpretation: Record native observations without editing the source. Local parser/engine results are instrument checks only. Unrelated setup or helper refusal leaves any masked target consequence unresolved.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#the-offset-parameter-no-longer-accepts-series-values). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-PLOT-SERIES-OFFSET-PINE4")
o = close > open ? 1 : -1
plot(close, "OUTCOME", offset=o)
```

### 54. ledger-division-v5-positive-const.pine

Source: [ledger-division-v5-positive-const.pine](ledger-division-v5-positive-const.pine). Indicator title: `V3-LEDGER-DIV-V5-POSITIVE-CONST`. SHA256: `8fe652ac51e00e354315b993a4a49d836355a57571fa1b816e432fe3a50cfa41`.

Target: `LEDGER-613-DIV-POSITIVE-CONST` / `/`. Success file: `captures/v3/ledger-division-v5-positive-const-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-POSITIVE-CONST")
plot(5 / 2, "OUTCOME")
```

### 55. ledger-division-v5-negative-numerator.pine

Source: [ledger-division-v5-negative-numerator.pine](ledger-division-v5-negative-numerator.pine). Indicator title: `V3-LEDGER-DIV-V5-NEGATIVE-NUMERATOR`. SHA256: `4c88e9019bad21bd55bb812273141386f176d5ac6e8dd1a7370b06a48fdaf9a7`.

Target: `LEDGER-613-DIV-NEGATIVE-NUMERATOR` / `/`. Success file: `captures/v3/ledger-division-v5-negative-numerator-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-NEGATIVE-NUMERATOR")
plot((-5) / 2, "OUTCOME")
```

### 56. ledger-division-v5-negative-denominator.pine

Source: [ledger-division-v5-negative-denominator.pine](ledger-division-v5-negative-denominator.pine). Indicator title: `V3-LEDGER-DIV-V5-NEGATIVE-DENOMINATOR`. SHA256: `93b752d575b0367a20faed3a5184cb28071749959999e803649aa2f817b62d06`.

Target: `LEDGER-613-DIV-NEGATIVE-DENOMINATOR` / `/`. Success file: `captures/v3/ledger-division-v5-negative-denominator-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-NEGATIVE-DENOMINATOR")
plot(5 / (-2), "OUTCOME")
```

### 57. ledger-division-v5-both-negative.pine

Source: [ledger-division-v5-both-negative.pine](ledger-division-v5-both-negative.pine). Indicator title: `V3-LEDGER-DIV-V5-BOTH-NEGATIVE`. SHA256: `64010fe078ac397640337fc452a0e386744608b48bb1b386e5527fb490428d94`.

Target: `LEDGER-613-DIV-BOTH-NEGATIVE` / `/`. Success file: `captures/v3/ledger-division-v5-both-negative-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-BOTH-NEGATIVE")
plot((-5) / (-2), "OUTCOME")
```

### 58. ledger-division-v5-negative-exact.pine

Source: [ledger-division-v5-negative-exact.pine](ledger-division-v5-negative-exact.pine). Indicator title: `V3-LEDGER-DIV-V5-NEGATIVE-EXACT`. SHA256: `998a834a546bdc18743aff123fb6ba214ea29e87f008b45888b2223229f94147`.

Target: `LEDGER-613-DIV-NEGATIVE-EXACT` / `/`. Success file: `captures/v3/ledger-division-v5-negative-exact-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-NEGATIVE-EXACT")
plot((-6) / 2, "OUTCOME")
```

### 59. ledger-division-v5-float-control.pine

Source: [ledger-division-v5-float-control.pine](ledger-division-v5-float-control.pine). Indicator title: `V3-LEDGER-DIV-V5-FLOAT-CONTROL`. SHA256: `cf9677622d80b7d693703dedea812095c6d7b28e0d12832e92c8bb4484cc28dc`.

Target: `LEDGER-613-DIV-FLOAT-CONTROL` / `/`. Success file: `captures/v3/ledger-division-v5-float-control-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-FLOAT-CONTROL")
plot((-5.0) / 2.0, "OUTCOME")
```

### 60. ledger-division-v5-input-control.pine

Source: [ledger-division-v5-input-control.pine](ledger-division-v5-input-control.pine). Indicator title: `V3-LEDGER-DIV-V5-INPUT-CONTROL`. SHA256: `1bb141826a00b02997e69bc88fc0f1282e3ae44bbbe1e13d0b0e8987d0cd1eda`.

Target: `LEDGER-613-DIV-INPUT-CONTROL` / `/`. Success file: `captures/v3/ledger-division-v5-input-control-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5 migration guide documents positive const-int 5/2=2 and fractional input/float controls; it does not explicitly establish signed integer rounding. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-LEDGER-DIV-V5-INPUT-CONTROL")
denominator = input.int(2, "Denominator", minval=1)
plot((-5) / denominator, "OUTCOME")
```

### 61. ledger-division-v4-positive-const.pine

Source: [ledger-division-v4-positive-const.pine](ledger-division-v4-positive-const.pine). Indicator title: `V3-LEDGER-DIV-V4-POSITIVE-CONST`. SHA256: `a08ed746e6ed9914c2bb572da793258f76f129e104c66d5f4bbda0137f7f5f0b`.

Target: `LEDGER-614-DIV-POSITIVE-CONST` / `/`. Success file: `captures/v3/ledger-division-v4-positive-const-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-POSITIVE-CONST")
plot(5 / 2, "OUTCOME")
```

### 62. ledger-division-v4-negative-numerator.pine

Source: [ledger-division-v4-negative-numerator.pine](ledger-division-v4-negative-numerator.pine). Indicator title: `V3-LEDGER-DIV-V4-NEGATIVE-NUMERATOR`. SHA256: `1628a9890c2594ef5a44744f14a89544075d38f8c14c2befc478bc3c3e8ef6f8`.

Target: `LEDGER-614-DIV-NEGATIVE-NUMERATOR` / `/`. Success file: `captures/v3/ledger-division-v4-negative-numerator-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-NEGATIVE-NUMERATOR")
plot((-5) / 2, "OUTCOME")
```

### 63. ledger-division-v4-negative-denominator.pine

Source: [ledger-division-v4-negative-denominator.pine](ledger-division-v4-negative-denominator.pine). Indicator title: `V3-LEDGER-DIV-V4-NEGATIVE-DENOMINATOR`. SHA256: `1d4368347584a4bd996016a7c839e8bdd5a8e91407c1fa15f7cadcbf68842fe9`.

Target: `LEDGER-614-DIV-NEGATIVE-DENOMINATOR` / `/`. Success file: `captures/v3/ledger-division-v4-negative-denominator-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-NEGATIVE-DENOMINATOR")
plot(5 / (-2), "OUTCOME")
```

### 64. ledger-division-v4-both-negative.pine

Source: [ledger-division-v4-both-negative.pine](ledger-division-v4-both-negative.pine). Indicator title: `V3-LEDGER-DIV-V4-BOTH-NEGATIVE`. SHA256: `b1b311884924bdf98fffd16cbf5076c67e8be66c045e45747dae4075ae3b9c89`.

Target: `LEDGER-614-DIV-BOTH-NEGATIVE` / `/`. Success file: `captures/v3/ledger-division-v4-both-negative-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-BOTH-NEGATIVE")
plot((-5) / (-2), "OUTCOME")
```

### 65. ledger-division-v4-negative-exact.pine

Source: [ledger-division-v4-negative-exact.pine](ledger-division-v4-negative-exact.pine). Indicator title: `V3-LEDGER-DIV-V4-NEGATIVE-EXACT`. SHA256: `21aa8809f7399fca0829f9183583f0c80e2d9e948e2c2a44784b97ba8dc441d9`.

Target: `LEDGER-614-DIV-NEGATIVE-EXACT` / `/`. Success file: `captures/v3/ledger-division-v4-negative-exact-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-NEGATIVE-EXACT")
plot((-6) / 2, "OUTCOME")
```

### 66. ledger-division-v4-float-control.pine

Source: [ledger-division-v4-float-control.pine](ledger-division-v4-float-control.pine). Indicator title: `V3-LEDGER-DIV-V4-FLOAT-CONTROL`. SHA256: `737e22be83b7a967a13b14aeea67c4392ba66371acedfaea7fa61ca2146e6954`.

Target: `LEDGER-614-DIV-FLOAT-CONTROL` / `/`. Success file: `captures/v3/ledger-division-v4-float-control-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-FLOAT-CONTROL")
plot((-5.0) / 2.0, "OUTCOME")
```

### 67. ledger-division-v4-input-control.pine

Source: [ledger-division-v4-input-control.pine](ledger-division-v4-input-control.pine). Indicator title: `V3-LEDGER-DIV-V4-INPUT-CONTROL`. SHA256: `081aa5a175c9c84f1a4ad9d904366da3569da0902b8e2813260ca81fa982937d`.

Target: `LEDGER-614-DIV-INPUT-CONTROL` / `/`. Success file: `captures/v3/ledger-division-v4-input-control-attempt<N>.csv`.

Prediction: UNSPECIFIED. The v5-to-v6 migration statement is not direct v4 authority. Retain raw values and errors; do not choose floor, truncation or fractional division before capture.

Evidence to save:

- Keep source/version/default input unchanged. Save complete untouched CSV with OUTCOME including missingness and at least 100 historical bars on success.
- If refused, save exact diagnostic text/code/stage/line, screenshot/log and first failing bar/time if available. Errors before 100 outputs remain valid evidence.
- RUNS alone is insufficient: report observed raw signed values. Casts or rounded screenshots cannot settle the rule.

Interpretation: Local engine results and candidate models are instrument checks/predictions only; no TradingView observation is claimed.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=4
study("V3-LEDGER-DIV-V4-INPUT-CONTROL")
denominator = input(2, "Denominator", type=input.integer, minval=1)
plot((-5) / denominator, "OUTCOME")
```

### 68. strings-04-na-initializer.pine

Source: [strings-04-na-initializer.pine](strings-04-na-initializer.pine). Indicator title: `V3-STRING-NA-INITIALIZER`. SHA256: `b8e7b0f48e9a599d75670d43697f42e7ed42c2009e3d600e4196419d130290eb`.

Target: `V3-STRING-NA-INITIALIZER` / `string`. Success file: `captures/v3/strings-04-na-initializer-attempt<N>.csv`.

Prediction: UNSPECIFIED. Isolate the const string na initializer before drawing conclusions from string(absent). OUTCOME 1 is missing, 2 is defined empty text, 3 is another defined string.

Claim a: Official archived string keyword worked example equates a string na initializer with empty text. Prediction `SUCCESS`;  Exact text prediction: {"INITIALIZER": "INITIALIZER=<>"}. Values: {"OUTCOME": 2}.

Claim b: Type-system manual permits undefined string values and testing them with na(). The existing local cast witness assumes this initializer is missing. Prediction `SUCCESS`;  Exact text prediction: {"INITIALIZER": "INITIALIZER=NA"}. Values: {"OUTCOME": 1}.

Evidence to save:

- Retain the complete OUTCOME CSV plus exact INITIALIZER first-bar log text and table screenshot.
- Keep const string absent = na unchanged. If refused, capture the exact line and phase; do not convert to string(na) or remove the explicit const qualifier to get a success.

Interpretation: Predictions are not native observations. Keep sources unchanged; record the actual native phase/text/value even if neither prediction matches.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#type_string), [source 2](https://www.tradingview.com/pine-script-docs/language/type-system/#na-value). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-STRING-NA-INITIALIZER")
const string absent = na
outcome = na(absent) ? 1 : absent == "" ? 2 : 3
observedText = na(absent) ? "INITIALIZER=NA" : "INITIALIZER=<" + absent + ">"
var table results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    table.cell(results, 0, 0, observedText)
    log.info(observedText)
plot(outcome, "OUTCOME")
```

### 69. strings-03-tostring-eleven-decimal-rounding.pine

Source: [strings-03-tostring-eleven-decimal-rounding.pine](strings-03-tostring-eleven-decimal-rounding.pine). Indicator title: `V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING`. SHA256: `bb799178b83eedefc16ba204c927ddb3f6abd3e464f2fd9c1946e8bff4c117e5`.

Target: `V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING` / `str.tostring`. Success file: `captures/v3/strings-03-tostring-eleven-decimal-rounding-attempt<N>.csv`.

Prediction: UNSPECIFIED. Capture omitted-format rounding of the exact eleven-fractional-digit literal. Both archived readings shorten it, but disagree on the resulting strings. Preserve any other native result.

Claim a: Archived individual-reference default permits ten fractional places, suppressing optional zeros. Prediction `SUCCESS`;  Exact text prediction: {"POSITIVE": "1.123456789", "NEGATIVE": "-1.123456789"}.

Claim b: Archived Strings manual default permits eight fractional places, suppressing optional zeros. Prediction `SUCCESS`;  Exact text prediction: {"POSITIVE": "1.12345679", "NEGATIVE": "-1.12345679"}.

Evidence to save:

- Copy exact POSITIVE and NEGATIVE text from both first-bar Pine Logs messages and both table cells, with a table screenshot. Preserve all characters and trailing zeros; do not parse these strings as numbers.
- Export the full OUTCOME CSV. OUTCOME=1 is an execution sentinel and cannot settle either string prediction.

Interpretation: Predictions are not native observations. Keep sources unchanged; record the actual native phase/text/value even if neither prediction matches.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring), [source 2](https://www.tradingview.com/pine-script-docs/concepts/strings/#converting-values-to-strings). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING")
positiveText = str.tostring(1.12345678901)
negativeText = str.tostring(-1.12345678901)
var table results = table.new(position.top_right, 1, 2)
if barstate.isfirst
    table.cell(results, 0, 0, "POSITIVE=" + positiveText)
    table.cell(results, 0, 1, "NEGATIVE=" + negativeText)
    log.info("POSITIVE=" + positiveText)
    log.info("NEGATIVE=" + negativeText)
plot(1, "OUTCOME")
```

### 70. conditional-01-unmatched-string-if.pine

Source: [conditional-01-unmatched-string-if.pine](conditional-01-unmatched-string-if.pine). Indicator title: `V3-UNMATCHED-STRING-IF`. SHA256: `77521367f4681fd50e1345a7ffbe8ed07bc7235d62685335de8ad26e6165fe5c`.

Target: `V3-UNMATCHED-STRING-IF` / `if`. Success file: `captures/v3/conditional-01-unmatched-string-if-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe the default of a typed string if-expression with a false condition and no else. OUTCOME=1 identifies na, 2 identifies the defined empty string, 3 identifies another defined string.

Claim a: Frozen ledger language-grammar-v1#156 records an empty-string default for an unmatched string conditional. Prediction `SUCCESS`;  Exact text prediction: {"RESULT": "RESULT=<>"}. Values: {"OUTCOME": 2}.

Claim b: Current Conditional structures page says unmatched non-bool conditionals return na; checked 2026-10-03. This disagrees with the frozen ledger statement. Prediction `SUCCESS`;  Exact text prediction: {"RESULT": "RESULT=NA"}. Values: {"OUTCOME": 1}.

Evidence to save:

- Retain every OUTCOME value and missingness in the untouched CSV. Save exact first-bar RESULT Pine Logs text and the table screenshot.
- If compilation or execution fails, retain the complete diagnostic, stage, line/call and first failing bar/time. A diagnostic in na(), table or log instrumentation does not settle a masked conditional result.

Interpretation: Predictions are not native observations. Keep sources unchanged; record the actual native phase/text/value even if neither prediction matches.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/conditional-structures/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-UNMATCHED-STRING-IF")
string result = if false
    "selected"
outcome = na(result) ? 1 : result == "" ? 2 : 3
observedText = na(result) ? "RESULT=NA" : "RESULT=<" + result + ">"
var table results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    table.cell(results, 0, 0, observedText)
    log.info(observedText)
plot(outcome, "OUTCOME")
```

### 71. const-reference-array-accept-mutate.pine

Source: [const-reference-array-accept-mutate.pine](const-reference-array-accept-mutate.pine). Indicator title: `V3-CONST-REF-ARRAY-ACCEPT-MUTATE`. SHA256: `8b173165707dcb134dc1d4f9a6b9090ccfa8bdfc901b3640042674dae67e4682`.

Target: `V3-CONST-REF-ARRAY-ACCEPT-MUTATE` / `array`. Success file: `captures/v3/const-reference-array-accept-mutate-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe whether const construction and content setters are accepted. Successful OUTCOME must be close + 1 for each bar; retain OHLC/CSV. The frozen reference qualifier restriction and current manual reference exception disagree on declaration acceptance.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-ARRAY-ACCEPT-MUTATE")
const array<float> value = array.new<float>(1, close)
array.set(value, 0, close + 1)
plot(array.get(value, 0), "OUTCOME")
```

### 72. const-reference-array-qualifier-diagnostic.pine

Source: [const-reference-array-qualifier-diagnostic.pine](const-reference-array-qualifier-diagnostic.pine). Indicator title: `V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC`. SHA256: `987103f5303ab2e3469abe3db1b276e1f5eb681edfedbd69d5388efbb4e9a1aa`.

Target: `V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC` / `array`. Success file: `captures/v3/const-reference-array-qualifier-diagnostic-attempt<N>.csv`.

Prediction: UNSPECIFIED. Intentional plot(value) type mismatch asks native diagnostics to identify the actual reference qualifier. Record complete error text and line: declaration refusal masks the consumer and does not establish series/const classification. A generic plot type error without a qualifier leaves qualification unresolved.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC")
const array<float> value = array.new<float>(1, close)
plot(value, "OUTCOME")
```

### 73. const-reference-array-replace-id.pine

Source: [const-reference-array-replace-id.pine](const-reference-array-replace-id.pine). Indicator title: `V3-CONST-REF-ARRAY-REPLACE-ID`. SHA256: `49f46289af72b01c5e743fd53d6f523a428272d9f9b004a605a55e90e2b47e0f`.

Target: `V3-CONST-REF-ARRAY-REPLACE-ID` / `array`. Success file: `captures/v3/const-reference-array-replace-id-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe declaration versus replacement error location/text separately. An error at declaration does not prove that ID replacement was refused. Both sources prohibit replacement conditionally on a valid declaration, but disagree on that declaration.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-ARRAY-REPLACE-ID")
const array<float> value = array.new<float>(1, close)
value := array.new<float>(1, close)
plot(array.get(value, 0), "OUTCOME")
```

### 74. const-reference-matrix-accept-mutate.pine

Source: [const-reference-matrix-accept-mutate.pine](const-reference-matrix-accept-mutate.pine). Indicator title: `V3-CONST-REF-MATRIX-ACCEPT-MUTATE`. SHA256: `9ddf368e2090bb6c50371db7390235c1bbeacc4e21ae6edb52bbc6dd031dd418`.

Target: `V3-CONST-REF-MATRIX-ACCEPT-MUTATE` / `matrix`. Success file: `captures/v3/const-reference-matrix-accept-mutate-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe whether const construction and content setters are accepted. Successful OUTCOME must be close + 1 for each bar; retain OHLC/CSV. The frozen reference qualifier restriction and current manual reference exception disagree on declaration acceptance.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MATRIX-ACCEPT-MUTATE")
const matrix<float> value = matrix.new<float>(1, 1, close)
matrix.set(value, 0, 0, close + 1)
plot(matrix.get(value, 0, 0), "OUTCOME")
```

### 75. const-reference-matrix-qualifier-diagnostic.pine

Source: [const-reference-matrix-qualifier-diagnostic.pine](const-reference-matrix-qualifier-diagnostic.pine). Indicator title: `V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC`. SHA256: `884d9905b3e56dd7ff12f84a9722305c68d8f79eb0cb6799b09bd602da47458e`.

Target: `V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC` / `matrix`. Success file: `captures/v3/const-reference-matrix-qualifier-diagnostic-attempt<N>.csv`.

Prediction: UNSPECIFIED. Intentional plot(value) type mismatch asks native diagnostics to identify the actual reference qualifier. Record complete error text and line: declaration refusal masks the consumer and does not establish series/const classification. A generic plot type error without a qualifier leaves qualification unresolved.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC")
const matrix<float> value = matrix.new<float>(1, 1, close)
plot(value, "OUTCOME")
```

### 76. const-reference-matrix-replace-id.pine

Source: [const-reference-matrix-replace-id.pine](const-reference-matrix-replace-id.pine). Indicator title: `V3-CONST-REF-MATRIX-REPLACE-ID`. SHA256: `28a8e7b33a5f2e7c5398811fda88dfbf82e185820ab14dba6e8822340805d2f9`.

Target: `V3-CONST-REF-MATRIX-REPLACE-ID` / `matrix`. Success file: `captures/v3/const-reference-matrix-replace-id-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe declaration versus replacement error location/text separately. An error at declaration does not prove that ID replacement was refused. Both sources prohibit replacement conditionally on a valid declaration, but disagree on that declaration.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MATRIX-REPLACE-ID")
const matrix<float> value = matrix.new<float>(1, 1, close)
value := matrix.new<float>(1, 1, close)
plot(matrix.get(value, 0, 0), "OUTCOME")
```

### 77. const-reference-map-accept-mutate.pine

Source: [const-reference-map-accept-mutate.pine](const-reference-map-accept-mutate.pine). Indicator title: `V3-CONST-REF-MAP-ACCEPT-MUTATE`. SHA256: `0b74ea41e5e80f726bfc6eff5aada8794e4609390e4a85d8c4462bfef5b5dbad`.

Target: `V3-CONST-REF-MAP-ACCEPT-MUTATE` / `map`. Success file: `captures/v3/const-reference-map-accept-mutate-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe whether const construction and content setters are accepted. Successful OUTCOME must be close + 1 for each bar; retain OHLC/CSV. The frozen reference qualifier restriction and current manual reference exception disagree on declaration acceptance.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MAP-ACCEPT-MUTATE")
const map<string, float> value = map.new<string, float>()
map.put(value, "key", close + 1)
plot(map.get(value, "key"), "OUTCOME")
```

### 78. const-reference-map-qualifier-diagnostic.pine

Source: [const-reference-map-qualifier-diagnostic.pine](const-reference-map-qualifier-diagnostic.pine). Indicator title: `V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC`. SHA256: `d84eb9a51b98a8ee49da468d861e86902fe4fb5151efe2db8463c481142cbe62`.

Target: `V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC` / `map`. Success file: `captures/v3/const-reference-map-qualifier-diagnostic-attempt<N>.csv`.

Prediction: UNSPECIFIED. Intentional plot(value) type mismatch asks native diagnostics to identify the actual reference qualifier. Record complete error text and line: declaration refusal masks the consumer and does not establish series/const classification. A generic plot type error without a qualifier leaves qualification unresolved.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC")
const map<string, float> value = map.new<string, float>()
plot(value, "OUTCOME")
```

### 79. const-reference-map-replace-id.pine

Source: [const-reference-map-replace-id.pine](const-reference-map-replace-id.pine). Indicator title: `V3-CONST-REF-MAP-REPLACE-ID`. SHA256: `35419551a5e118fc67e79aa9cff28caf628d9f0d511d8f9ae101a7076bbfb0e2`.

Target: `V3-CONST-REF-MAP-REPLACE-ID` / `map`. Success file: `captures/v3/const-reference-map-replace-id-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe declaration versus replacement error location/text separately. An error at declaration does not prove that ID replacement was refused. Both sources prohibit replacement conditionally on a valid declaration, but disagree on that declaration.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-MAP-REPLACE-ID")
const map<string, float> value = map.new<string, float>()
value := map.new<string, float>()
plot(map.get(value, "key"), "OUTCOME")
```

### 80. const-reference-line-accept-mutate.pine

Source: [const-reference-line-accept-mutate.pine](const-reference-line-accept-mutate.pine). Indicator title: `V3-CONST-REF-LINE-ACCEPT-MUTATE`. SHA256: `c3fbbc9f0aefe13b91ef2e9b39fc523a58339f25f6177bcce94e4f5b76023e4b`.

Target: `V3-CONST-REF-LINE-ACCEPT-MUTATE` / `line`. Success file: `captures/v3/const-reference-line-accept-mutate-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe whether const construction and content setters are accepted. Successful OUTCOME must be close + 1 for each bar; retain OHLC/CSV. The frozen reference qualifier restriction and current manual reference exception disagree on declaration acceptance.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-LINE-ACCEPT-MUTATE")
const line value = line.new(bar_index, close, bar_index + 1, close)
line.set_y1(value, close + 1)
plot(line.get_y1(value), "OUTCOME")
```

### 81. const-reference-line-qualifier-diagnostic.pine

Source: [const-reference-line-qualifier-diagnostic.pine](const-reference-line-qualifier-diagnostic.pine). Indicator title: `V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC`. SHA256: `9069782e5682211c0bd079b102d727680788b70ec6d0dc998a7db5d418d9d04a`.

Target: `V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC` / `line`. Success file: `captures/v3/const-reference-line-qualifier-diagnostic-attempt<N>.csv`.

Prediction: UNSPECIFIED. Intentional plot(value) type mismatch asks native diagnostics to identify the actual reference qualifier. Record complete error text and line: declaration refusal masks the consumer and does not establish series/const classification. A generic plot type error without a qualifier leaves qualification unresolved.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC")
const line value = line.new(bar_index, close, bar_index + 1, close)
plot(value, "OUTCOME")
```

### 82. const-reference-line-replace-id.pine

Source: [const-reference-line-replace-id.pine](const-reference-line-replace-id.pine). Indicator title: `V3-CONST-REF-LINE-REPLACE-ID`. SHA256: `e614e6ad1e155377f846de85d779ebac84704edb6e985ad4b2c3e93c93a71010`.

Target: `V3-CONST-REF-LINE-REPLACE-ID` / `line`. Success file: `captures/v3/const-reference-line-replace-id-attempt<N>.csv`.

Prediction: UNSPECIFIED. Observe declaration versus replacement error location/text separately. An error at declaration does not prove that ID replacement was refused. Both sources prohibit replacement conditionally on a valid declaration, but disagree on that declaration.

Evidence to save:

- Keep source/version unchanged; fixed BINANCE:BTCUSDT/2-minute/standard/UTC/Bar Replay off. Retain exact stage, line and native diagnostic wording/code if exposed.
- Success needs100 historical bars and raw untouched OUTCOME CSV including blanks plus chart OHLC. Errors before100 outputs are valid evidence.
- Record whether the declaration or the target operation failed. Never infer qualifier or replacement behavior from a masked consumer.

Interpretation: No local implementation or documented prediction is native evidence; preserve both authorities. UDTs are explicitly excluded by the current manual and are not tested here.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types), [source 2](https://www.tradingview.com/pine-script-reference/v6/#type_const). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CONST-REF-LINE-REPLACE-ID")
const line value = line.new(bar_index, close, bar_index + 1, close)
value := line.new(bar_index, close, bar_index + 1, close)
plot(line.get_y1(value), "OUTCOME")
```

### 83. colors-new-dynamic-low-v1.pine

Source: [colors-new-dynamic-low-v1.pine](colors-new-dynamic-low-v1.pine). Indicator title: `V3-COLOR-NEW-DYNAMIC-LOW`. SHA256: `a82cc166ec3498350211a37dc3a8cea09b5a3649c4c8d0aed63447a243fb1605`.

Target: `V3-COLOR-NEW-DYNAMIC-LOW` / `color.new`. Success file: `captures/v3/colors-new-dynamic-low-v1-attempt<N>.csv`.

Prediction: UNSPECIFIED. The documented range is 0..100. The documented contract does not specify runtime treatment outside it. Observe valid bar 0 and the isolated invalid value from bar 1; do not predict clamping or refusal.

Evidence to save:

- Capture exact BEFORE and AFTER Pine Logs for bars 0 and 1. Missing AFTER alone is not a diagnostic.
- Preserve the exact native compile/runtime diagnostic, stage, line and first failing bar/time, or the successful full OUTCOME CSV including na.

Interpretation: A literal hex base avoids unrelated palette conflicts. The bar_index expression gives a series transparency argument; const-transparency acceptance/refusal does not settle this case.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_color.new), [source 2](https://www.tradingview.com/pine-script-docs/visuals/colors/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-COLOR-NEW-DYNAMIC-LOW")
transparency = bar_index == 0 ? 25.0 : -1.0
if bar_index < 2
    log.info("BEFORE bar=" + str.tostring(bar_index) + " transparency=" + str.tostring(transparency))
result = color.new(#123456, transparency)
if bar_index < 2
    log.info("AFTER bar=" + str.tostring(bar_index) + " transparency=" + str.tostring(color.t(result)))
plot(color.t(result), "OUTCOME")
```

### 84. colors-new-dynamic-high-v1.pine

Source: [colors-new-dynamic-high-v1.pine](colors-new-dynamic-high-v1.pine). Indicator title: `V3-COLOR-NEW-DYNAMIC-HIGH`. SHA256: `0b9701e862500c6b277709421315fd4daa588986b53507bed34cb37a1cc71e0f`.

Target: `V3-COLOR-NEW-DYNAMIC-HIGH` / `color.new`. Success file: `captures/v3/colors-new-dynamic-high-v1-attempt<N>.csv`.

Prediction: UNSPECIFIED. The documented range is 0..100. The documented contract does not specify runtime treatment outside it. Observe valid bar 0 and the isolated invalid value from bar 1; do not predict clamping or refusal.

Evidence to save:

- Capture exact BEFORE and AFTER Pine Logs for bars 0 and 1. Missing AFTER alone is not a diagnostic.
- Preserve the exact native compile/runtime diagnostic, stage, line and first failing bar/time, or the successful full OUTCOME CSV including na.

Interpretation: A literal hex base avoids unrelated palette conflicts. The bar_index expression gives a series transparency argument; const-transparency acceptance/refusal does not settle this case.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_color.new), [source 2](https://www.tradingview.com/pine-script-docs/visuals/colors/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-COLOR-NEW-DYNAMIC-HIGH")
transparency = bar_index == 0 ? 25.0 : 101.0
if bar_index < 2
    log.info("BEFORE bar=" + str.tostring(bar_index) + " transparency=" + str.tostring(transparency))
result = color.new(#123456, transparency)
if bar_index < 2
    log.info("AFTER bar=" + str.tostring(bar_index) + " transparency=" + str.tostring(color.t(result)))
plot(color.t(result), "OUTCOME")
```

### 85. colors-blue-constant-v1.pine

Source: [colors-blue-constant-v1.pine](colors-blue-constant-v1.pine). Indicator title: `V3-COLOR-BLUE-CONSTANT`. SHA256: `4947f3c3490bc964947ef1f9e13b28fee6956a484ca1749aec810d145768f70f`.

Target: `V3-COLOR-BLUE-CONSTANT` / `color.blue`. Success file: `captures/v3/colors-blue-constant-v1-attempt<N>.csv`.

Prediction: RUNS. Native CF009 v2 settles RGB41/98/255. This additional source remains unrun; packed RGB follows from the settled channels.

Evidence to save:

- Copy both exact first-bar Pine Logs. Save full OUTCOME CSV, source hash and v6 indicator title.
- If a channel/equality helper fails, preserve its exact diagnostic and leave the masked palette observation unresolved.

Interpretation: Both original claims remain recorded. Native CF009 settles v6; this additional source is a verification probe, not a new observation. Earlier versions remain outside capture scope.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#const_color.blue), [source 2](https://www.tradingview.com/pine-script-docs/visuals/colors/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-COLOR-BLUE-CONSTANT")
red = color.r(color.blue)
green = color.g(color.blue)
blue = color.b(color.blue)
packed = red * 65536 + green * 256 + blue
if barstate.isfirst
    log.info("BLUE R=" + str.tostring(red) + " G=" + str.tostring(green) + " B=" + str.tostring(blue) + " T=" + str.tostring(color.t(color.blue)))
    log.info("MANUAL=" + str.tostring(color.blue == #2196F3) + " REFERENCE=" + str.tostring(color.blue == #2962FF))
plot(packed, "OUTCOME")
```

### 86. corpus-matrix-sum-namespace.pine

Source: [corpus-matrix-sum-namespace.pine](corpus-matrix-sum-namespace.pine). Indicator title: `V3-CORPUS-MATRIX-SUM-NAMESPACE`. SHA256: `fe760d223b51796d4f3547f0d502750b42996423880675d044b82becdf674141`.

Target: `V3-CORPUS-MATRIX-SUM-NAMESPACE` / `matrix.sum`. Success file: `captures/v3/corpus-matrix-sum-namespace-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. Both documented overloads require id1 and id2. This call omits the second operand.

Claim a: Both documented overloads require id1 and id2. This call omits the second operand. Prediction `COMPILE-REJECTION`; Both documented overloads require id1 and id2. This call omits the second operand.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sum). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-MATRIX-SUM-NAMESPACE")
values = matrix.new<float>(1, 1, 1.0)
result = matrix.sum(values)
plot(result.get(0, 0), "OUTCOME")
```

### 87. corpus-matrix-sum-method.pine

Source: [corpus-matrix-sum-method.pine](corpus-matrix-sum-method.pine). Indicator title: `V3-CORPUS-MATRIX-SUM-METHOD`. SHA256: `579448bb450d70908196890e8a84089193adf4a8b8760c2e911c4a1a223d6f81`.

Target: `V3-CORPUS-MATRIX-SUM-METHOD` / `matrix.sum`. Success file: `captures/v3/corpus-matrix-sum-method-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The receiver supplies id1; the documented second operand id2 remains required.

Claim a: The receiver supplies id1; the documented second operand id2 remains required. Prediction `COMPILE-REJECTION`; The receiver supplies id1; the documented second operand id2 remains required.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sum). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-MATRIX-SUM-METHOD")
values = matrix.new<float>(1, 1, 1.0)
result = values.sum()
plot(result.get(0, 0), "OUTCOME")
```

### 88. corpus-matrix-float-to-int-id.pine

Source: [corpus-matrix-float-to-int-id.pine](corpus-matrix-float-to-int-id.pine). Indicator title: `V3-CORPUS-MATRIX-FLOAT-TO-INT-ID`. SHA256: `ca67352243a4c10c8703d977ed6c90e69aeb4cdc5b4d34ec7b75156883eaf809`.

Target: `V3-CORPUS-MATRIX-FLOAT-TO-INT-ID` / `matrix<int>`. Success file: `captures/v3/corpus-matrix-float-to-int-id-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. A matrix<float> reference does not become a matrix<int> reference through assignment.

Claim a: A matrix<float> reference does not become a matrix<int> reference through assignment. Prediction `COMPILE-REJECTION`; A matrix<float> reference does not become a matrix<int> reference through assignment.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-MATRIX-FLOAT-TO-INT-ID")
matrix<int> bad = matrix.new<float>(1, 1, 1.0)
plot(bad.get(0, 0), "OUTCOME")
```

### 89. corpus-matrix-string-element.pine

Source: [corpus-matrix-string-element.pine](corpus-matrix-string-element.pine). Indicator title: `V3-CORPUS-MATRIX-STRING-ELEMENT`. SHA256: `5515530ccf51cfa76ab8c1724a3432598d449c47646e64eb50d66258e3976fa1`.

Target: `V3-CORPUS-MATRIX-STRING-ELEMENT` / `matrix.fill`. Success file: `captures/v3/corpus-matrix-string-element-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The float matrix fill value is a string; documented element type is float.

Claim a: The float matrix fill value is a string; documented element type is float. Prediction `COMPILE-REJECTION`; The float matrix fill value is a string; documented element type is float.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.fill), [source 2](https://www.tradingview.com/pine-script-docs/language/type-system/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-MATRIX-STRING-ELEMENT")
values = matrix.new<float>(1, 1, 1.0)
values.fill("bad")
plot(values.get(0, 0), "OUTCOME")
```

### 90. corpus-array-string-element.pine

Source: [corpus-array-string-element.pine](corpus-array-string-element.pine). Indicator title: `V3-CORPUS-ARRAY-STRING-ELEMENT`. SHA256: `332861869d675741acdfc7d397f06ba52aa638a74609e1d10acd1b16dfa1ae59`.

Target: `V3-CORPUS-ARRAY-STRING-ELEMENT` / `array.push`. Success file: `captures/v3/corpus-array-string-element-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The string array receives an int element; numeric-to-string coercion is not documented.

Claim a: The string array receives an int element; numeric-to-string coercion is not documented. Prediction `COMPILE-REJECTION`; The string array receives an int element; numeric-to-string coercion is not documented.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_array.push), [source 2](https://www.tradingview.com/pine-script-docs/language/type-system/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-ARRAY-STRING-ELEMENT")
values = array.new<string>()
values.push(1)
plot(values.size(), "OUTCOME")
```

### 91. corpus-array-string-percentile.pine

Source: [corpus-array-string-percentile.pine](corpus-array-string-percentile.pine). Indicator title: `V3-CORPUS-ARRAY-STRING-PERCENTILE`. SHA256: `cef68e73825e0e8377d08a6cf16ef88a6265cf37dca46368a85f26407b9dedf7`.

Target: `V3-CORPUS-ARRAY-STRING-PERCENTILE` / `array.percentile_nearest_rank`. Success file: `captures/v3/corpus-array-string-percentile-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The percentage is a string; documented argument kind is numeric.

Claim a: The percentage is a string; documented argument kind is numeric. Prediction `COMPILE-REJECTION`; The percentage is a string; documented argument kind is numeric.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_nearest_rank). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-ARRAY-STRING-PERCENTILE")
values = array.from(1.0, 2.0, 3.0)
plot(values.percentile_nearest_rank("50"), "OUTCOME")
```

### 92. corpus-v6-na-bool.pine

Source: [corpus-v6-na-bool.pine](corpus-v6-na-bool.pine). Indicator title: `V3-CORPUS-V6-NA-BOOL`. SHA256: `0b86ae0679596df2025900d7bd7ad40f0b5967022f0c155e88ad180ff300f251`.

Target: `V3-CORPUS-V6-NA-BOOL` / `na`. Success file: `captures/v3/corpus-v6-na-bool-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. Pine v6 bool values have no na state; na() does not accept bool.

Claim a: Pine v6 bool values have no na state; na() does not accept bool. Prediction `COMPILE-REJECTION`; Pine v6 bool values have no na state; na() does not accept bool.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/type-system/#bool), [source 2](https://www.tradingview.com/pine-script-reference/v6/#fun_na). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-V6-NA-BOOL")
values = array.from(true)
plot(na(values.get(0)) ? 1 : 0, "OUTCOME")
```

### 93. corpus-fill-optional-color.pine

Source: [corpus-fill-optional-color.pine](corpus-fill-optional-color.pine). Indicator title: `V3-CORPUS-FILL-OPTIONAL-COLOR`. SHA256: `eee3f6f8b513b899dedf3dc700098a0ec75cff51148a779571e6c7f4e9151697`.

Target: `V3-CORPUS-FILL-OPTIONAL-COLOR` / `fill`. Success file: `captures/v3/corpus-fill-optional-color-attempt<N>.csv`.

Prediction: SUCCESS. The flat fill color is optional. Owner commit 4f0e903086 restores two-argument acceptance; capture this unchanged probe independently.

Claim a: The flat fill color is optional. Owner commit 4f0e903086 restores two-argument acceptance; capture this unchanged probe independently. Prediction `SUCCESS`; The flat fill color is optional. Owner commit 4f0e903086 restores two-argument acceptance; capture this unchanged probe independently.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_fill), [source 2](https://www.tradingview.com/pine-script-docs/visuals/fills/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-FILL-OPTIONAL-COLOR")
first = plot(close, "FILL_FIRST")
second = plot(open, "FILL_SECOND")
fill(first, second)
plot(1, "OUTCOME")
```

### 94. corpus-hline-chart-point.pine

Source: [corpus-hline-chart-point.pine](corpus-hline-chart-point.pine). Indicator title: `V3-CORPUS-HLINE-CHART-POINT`. SHA256: `f135b20fae7059903a0d0fa14881687e07613f08209a2deb221d3734d7a294c6`.

Target: `V3-CORPUS-HLINE-CHART-POINT` / `hline`. Success file: `captures/v3/corpus-hline-chart-point-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The price parameter is numeric; this argument is a chart.point reference.

Claim a: The price parameter is numeric; this argument is a chart.point reference. Prediction `COMPILE-REJECTION`; The price parameter is numeric; this argument is a chart.point reference.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_hline). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-HLINE-CHART-POINT")
hline(chart.point.now(close))
plot(1, "OUTCOME")
```

### 95. corpus-hline-matrix.pine

Source: [corpus-hline-matrix.pine](corpus-hline-matrix.pine). Indicator title: `V3-CORPUS-HLINE-MATRIX`. SHA256: `1afc327c449bd190e9097f79f31c457f9d24f75c326e14e7c51532cf86b056f0`.

Target: `V3-CORPUS-HLINE-MATRIX` / `hline`. Success file: `captures/v3/corpus-hline-matrix-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The price parameter is numeric; this argument is a matrix<int> reference.

Claim a: The price parameter is numeric; this argument is a matrix<int> reference. Prediction `COMPILE-REJECTION`; The price parameter is numeric; this argument is a matrix<int> reference.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_hline). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-HLINE-MATRIX")
hline(matrix.new<int>(1, 1, 1))
plot(1, "OUTCOME")
```

### 96. corpus-fractional-series-division-int.pine

Source: [corpus-fractional-series-division-int.pine](corpus-fractional-series-division-int.pine). Indicator title: `V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT`. SHA256: `76e16608ee1868cf88dea69655edff3711abc43b8336fd5fc8660c06b94c00ac`.

Target: `V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT` / `/`. Success file: `captures/v3/corpus-fractional-series-division-int-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. V6 division can return fractional values. Implicit float-to-int assignment is forbidden; capture the actual diagnostic even when this chart interval divides evenly.

Claim a: V6 division can return fractional values. Implicit float-to-int assignment is forbidden; capture the actual diagnostic even when this chart interval divides evenly. Prediction `COMPILE-REJECTION`; V6 division can return fractional values. Implicit float-to-int assignment is forbidden; capture the actual diagnostic even when this chart interval divides evenly.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/operators/#arithmetic-operators), [source 2](https://www.tradingview.com/pine-script-docs/language/type-system/#type-casting). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT")
int elapsed = (time - time[1]) / 1000
plot(elapsed, "OUTCOME")
```

### 97. corpus-fractional-timeframe-division-int.pine

Source: [corpus-fractional-timeframe-division-int.pine](corpus-fractional-timeframe-division-int.pine). Indicator title: `V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT`. SHA256: `6b189aa2275d7703c6404f4c8feada7016aa90a3314feead770756811e77a611`.

Target: `V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT` / `/`. Success file: `captures/v3/corpus-fractional-timeframe-division-int-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The v6 integer division expression is assigned to an int without an explicit cast. A whole value on a 2-minute chart does not determine its static type.

Claim a: The v6 integer division expression is assigned to an int without an explicit cast. A whole value on a 2-minute chart does not determine its static type. Prediction `COMPILE-REJECTION`; The v6 integer division expression is assigned to an int without an explicit cast. A whole value on a 2-minute chart does not determine its static type.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/operators/#arithmetic-operators), [source 2](https://www.tradingview.com/pine-script-docs/language/type-system/#type-casting). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT")
length() =>
    int tf_mins = timeframe.in_seconds() / 60
    tf_mins
plot(length(), "OUTCOME")
```

### 98. corpus-v5-tuple-call-target.pine

Source: [corpus-v5-tuple-call-target.pine](corpus-v5-tuple-call-target.pine). Indicator title: `V3-CORPUS-V5-TUPLE-CALL-TARGET`. SHA256: `1933e7407eab0d7c82d530f4719f712f19a89111018908db800f87da4f57a664`.

Target: `V3-CORPUS-V5-TUPLE-CALL-TARGET` / `tuple declaration`. Success file: `captures/v3/corpus-v5-tuple-call-target-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. The documented tuple target contains variable names. This target contains a map.get call.

Claim a: The documented tuple target contains variable names. This target contains a map.get call. Prediction `COMPILE-REJECTION`; The documented tuple target contains variable names. This target contains a map.get call.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/v5/language/variable-declarations/#tuple-declarations). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-CORPUS-V5-TUPLE-CALL-TARGET")
pair() => [1, 2]
values = map.new<string, int>()
[first, values.get("value")] = pair()
plot(first, "OUTCOME")
```

### 99. corpus-v5-ellipsis-placeholder.pine

Source: [corpus-v5-ellipsis-placeholder.pine](corpus-v5-ellipsis-placeholder.pine). Indicator title: `V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER`. SHA256: `b880ca1d0fd8fe9abbd41cb2b33d1464992fcdf6e3bb84a4ead92edd5b363cdd`.

Target: `V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER` / `ellipsis`. Success file: `captures/v3/corpus-v5-ellipsis-placeholder-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. Prediction only: a literal ellipsis placeholder is not a documented argument expression. Native refusal is still unobserved.

Claim a: Prediction only: a literal ellipsis placeholder is not a documented argument expression. Native refusal is still unobserved. Prediction `COMPILE-REJECTION`; Prediction only: a literal ellipsis placeholder is not a documented argument expression. Native refusal is still unobserved.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/v5/language/script-structure/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER")
value(x) => x
plot(value(...), "OUTCOME")
```

### 100. corpus-v5-unary-plus-string.pine

Source: [corpus-v5-unary-plus-string.pine](corpus-v5-unary-plus-string.pine). Indicator title: `V3-CORPUS-V5-UNARY-PLUS-STRING`. SHA256: `5d4d46bedc7d1888c442f76f31e8913f08fc7ab650dd95e56d89e0c3e5716900`.

Target: `V3-CORPUS-V5-UNARY-PLUS-STRING` / `unary +`. Success file: `captures/v3/corpus-v5-unary-plus-string-attempt<N>.csv`.

Prediction: UNSPECIFIED. The manual illustrates numeric unary plus and binary string concatenation; it does not explicitly settle unary plus on a string. Preserve the native result.

Claim a: The manual illustrates numeric unary plus and binary string concatenation; it does not explicitly settle unary plus on a string. Preserve the native result. Prediction `UNSPECIFIED`; The manual illustrates numeric unary plus and binary string concatenation; it does not explicitly settle unary plus on a string. Preserve the native result.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/v5/language/operators/#arithmetic-operators). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-CORPUS-V5-UNARY-PLUS-STRING")
text() => "value"
label.new(bar_index, close, "Prefix" + +text())
plot(1, "OUTCOME")
```

### 101. corpus-v5-unknown-cbrt.pine

Source: [corpus-v5-unknown-cbrt.pine](corpus-v5-unknown-cbrt.pine). Indicator title: `V3-CORPUS-V5-UNKNOWN-CBRT`. SHA256: `8065397110a146a55c69a2939a13fd68bcd3b8358184a0a192df4aacc803cd42`.

Target: `V3-CORPUS-V5-UNKNOWN-CBRT` / `math.cbrt`. Success file: `captures/v3/corpus-v5-unknown-cbrt-attempt<N>.csv`.

Prediction: UNSPECIFIED. No documented math.cbrt entry has been identified. Absence from the reviewed reference is not a native compile outcome.

Claim a: No documented math.cbrt entry has been identified. Absence from the reviewed reference is not a native compile outcome. Prediction `UNSPECIFIED`; No documented math.cbrt entry has been identified. Absence from the reviewed reference is not a native compile outcome.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v5/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-CORPUS-V5-UNKNOWN-CBRT")
plot(math.cbrt(close), "OUTCOME")
```

### 102. corpus-v5-unknown-hypot.pine

Source: [corpus-v5-unknown-hypot.pine](corpus-v5-unknown-hypot.pine). Indicator title: `V3-CORPUS-V5-UNKNOWN-HYPOT`. SHA256: `4b82c78050823d616ba7f4d8e36e266198b07e98bf4e1a0a40a77dc3a9f20695`.

Target: `V3-CORPUS-V5-UNKNOWN-HYPOT` / `math.hypot`. Success file: `captures/v3/corpus-v5-unknown-hypot-attempt<N>.csv`.

Prediction: UNSPECIFIED. No documented math.hypot entry has been identified. Capture separately so a cbrt refusal cannot hide this outcome.

Claim a: No documented math.hypot entry has been identified. Capture separately so a cbrt refusal cannot hide this outcome. Prediction `UNSPECIFIED`; No documented math.hypot entry has been identified. Capture separately so a cbrt refusal cannot hide this outcome.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v5/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=5
indicator("V3-CORPUS-V5-UNKNOWN-HYPOT")
plot(math.hypot(close, open), "OUTCOME")
```

### 103. corpus-footprint-missing-ticks.pine

Source: [corpus-footprint-missing-ticks.pine](corpus-footprint-missing-ticks.pine). Indicator title: `V3-CORPUS-FOOTPRINT-MISSING-TICKS`. SHA256: `42de802bd6815cf0d8cecdf184b6ddd14f2681aa0bb393de4d00814320cb8ef2`.

Target: `V3-CORPUS-FOOTPRINT-MISSING-TICKS` / `request.footprint`. Success file: `captures/v3/corpus-footprint-missing-ticks-attempt<N>.csv`.

Prediction: COMPILE-REJECTION. ticks_per_row is required. Preserve an entitlement or provider failure as unrelated evidence if it masks this arity outcome.

Claim a: ticks_per_row is required. Preserve an entitlement or provider failure as unrelated evidence if it masks this arity outcome. Prediction `COMPILE-REJECTION`; ticks_per_row is required. Preserve an entitlement or provider failure as unrelated evidence if it masks this arity outcome.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-reference/v6/#fun_request.footprint). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-FOOTPRINT-MISSING-TICKS")
value = request.footprint()
plot(close, "OUTCOME")
```

### 104. corpus-function-value-shared-name.pine

Source: [corpus-function-value-shared-name.pine](corpus-function-value-shared-name.pine). Indicator title: `V3-CORPUS-FUNCTION-VALUE-SHARED-NAME`. SHA256: `37779ef8ba0a1b0005d5413fde6e1f89dab94d60099fc69086ca0a63c307543b`.

Target: `V3-CORPUS-FUNCTION-VALUE-SHARED-NAME` / `function/value names`. Success file: `captures/v3/corpus-function-value-shared-name-attempt<N>.csv`.

Prediction: SUCCESS. The registered corpus-2 fix permits a function and variable to share a name. Capture this isolated accepted behavior; it does not certify either whole corpus source.

Claim a: The registered corpus-2 fix permits a function and variable to share a name. Capture this isolated accepted behavior; it does not certify either whole corpus source. Prediction `SUCCESS`; The registered corpus-2 fix permits a function and variable to share a name. Capture this isolated accepted behavior; it does not certify either whole corpus source.

Claim b: Native observation of this minimal source remains unrecorded. Retain any differing phase, value or diagnostic. Prediction `UNSPECIFIED`; 

Evidence to save:

- Preserve the unchanged standalone source, pinned Pine version and SHA256. Save exact native compile/runtime diagnostic text, code if exposed, line/column and screenshot.
- For RUNS, export the complete OUTCOME CSV with blanks/na. A success sentinel establishes acceptance only. Save relevant drawing/fill screenshots; fill exports include FILL_FIRST and FILL_SECOND.
- If an unrelated setup, helper, entitlement or provider error occurs, preserve its phase and diagnostic and leave the target unresolved.

Interpretation: Predictions are not native observations. Do not repair source to get a success, infer native invalidity from our checker, or certify later original-source constructs from this minimal result.

Authority: [source 1](https://www.tradingview.com/pine-script-docs/language/user-defined-functions/). Full per-authority predictions are preserved in expected-outcome-v3.json.

```pine
//@version=6
indicator("V3-CORPUS-FUNCTION-VALUE-SHARED-NAME")
ma(value) => value * 2
ma = close
plot(ma(ma), "OUTCOME")
```
