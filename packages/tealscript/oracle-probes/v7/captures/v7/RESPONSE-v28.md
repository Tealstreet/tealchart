# TradingView capture response v28

196/215 frozen v7 sources captured; 367 attempts retained. Selected native outcomes: {'RUNS': 142, 'RUNTIME-ERROR': 20, 'COMPILE-ERROR': 33, 'COMPILE-ACCEPTED': 1}.

Frozen source master403b7983a9; canonical bundle-manifest-v3.json. Operator: Codex via Chrome MCP. Batch startUTC: 2026-10-04T05:05:16.109677+00:00. Last recorded export/error observationUTC: 2026-10-04T10:09:21.595Z. ReportUTC: 2026-10-04T10:11:33.110095+00:00. Capture continues.

Default chart BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off,mintick0.01. Native subscription is pro_premium. Source default inputs/styles, native initial OHLC/history/session, reset/export/cutoff timestamps and source hash are recorded per attempt. Each source was pasted unchanged into a fresh script; accepted sources have raw CSV, chart and Data Window evidence. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried. Native chart indices are separate from Pine indices; an unplotted execution index is UNKNOWN.

Raw Downloads bytes preserve blanks, strings and original headers. Compiler/runtime errors retain native code, text, location, first failing Pine bar if exposed, screenshot and warnings. Missing error-bar time is UNKNOWN rather than mapped from unrelated native chart indices. Siblings are executed independently. No source/manifest/handoff/prediction, local engine, full corpus/replay job or baseline is changed. Local preflight is not a native verdict. Output cannot establish an internal algorithm, complexity, optimizer behavior or inaccessible post-error state.

| Source / selected attempt | Native outcome | Raw evidence |
|---|---|---|
| collection-ranked08-historical-copy-slice-control-v1.pine / 1 | RUNS | [raw](collection-ranked08-historical-copy-slice-control-v1-attempt1.csv) {"current_first":"0"} |
| collection-ranked08-historical-slice-set-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/collection-ranked08-historical-slice-set-v1-attempt1-error.txt) RE10051; line7: Error on bar 1: Cannot modify the elements of a historical array or any slices of that array. Instead of modifying an array referenced by an ID retrieved with the `[]` operator, create a shallow copy of the array with `array.copy()`, then modify the copy or a slice of that copy. |
| collection-ranked08-slice-equal-v1.pine / 1 | RUNS | [raw](collection-ranked08-slice-equal-v1-attempt1.csv) {"slice_size":"0","parent_size":"3"} |
| collection-ranked08-slice-nonempty-control-v1.pine / 1 | RUNS | [raw](collection-ranked08-slice-nonempty-control-v1-attempt1.csv) {"slice_size":"1","slice_value":"20"} |
| collection24-matrix-sum-fractional-float-return-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/collection24-matrix-sum-fractional-float-return-v1-attempt1-error.txt) CE10173; line4: Cannot assign a value of the "matrix<int>" type to the "result" variable. The variable is declared with the "matrix<float>" type. |
| collection24-matrix-sum-fractional-inferred-v1.pine / 1 | RUNS | [raw](collection24-matrix-sum-fractional-inferred-v1-attempt1.csv) {"INT_PLUS_POSITIVE_FLOAT":"1.5","INT_PLUS_NEGATIVE_FLOAT":"0.5","FLOAT_CONTROL":"1.5","UNCHANGED_INT_SOURCE":"1"} |
| collection24-matrix-sum-fractional-int-return-v1.pine / 1 | RUNS | [raw](collection24-matrix-sum-fractional-int-return-v1-attempt1.csv) {"OUTCOME":"1.5"} |
| corpus-v5-color-get-finite-control-namespace-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-finite-control-namespace-v1-attempt1.csv) {"OUTCOME":"1"} |
| corpus-v5-color-get-finite-control-receiver-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-finite-control-receiver-v1-attempt1.csv) {"OUTCOME":"1"} |
| corpus-v5-color-get-literal-na-namespace-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-literal-na-namespace-v1-attempt1.csv) {"OUTCOME":"1"} |
| corpus-v5-color-get-literal-na-receiver-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-literal-na-receiver-v1-attempt1.csv) {"OUTCOME":"1"} |
| corpus-v5-color-get-round-na-namespace-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-round-na-namespace-v1-attempt1.csv) {"OUTCOME":"1"} |
| corpus-v5-color-get-round-na-receiver-v1.pine / 1 | RUNS | [raw](corpus-v5-color-get-round-na-receiver-v1-attempt1.csv) {"OUTCOME":"1"} |
| plot-series-offset-v3-v1.pine / 1 | RUNS | [raw](plot-series-offset-v3-v1-attempt1.csv) {"TARGET":"77858.24"} |
| plot-zero-offset-v3-control-v1.pine / 2 | RUNS | [raw](plot-zero-offset-v3-control-v1-attempt2.csv) {"TARGET":"77774.04"} |
| plot-series-offset-v4-v1.pine / 1 | RUNS | [raw](plot-series-offset-v4-v1-attempt1.csv) {"TARGET":"77858.24"} |
| plot-zero-offset-v4-control-v1.pine / 2 | RUNS | [raw](plot-zero-offset-v4-control-v1-attempt2.csv) {"TARGET":"77774.04"} |
| plotchar-series-offset-v3-v1.pine / 2 | RUNS | [raw](plotchar-series-offset-v3-v1-attempt2.csv) {"TARGET":""} |
| plotchar-zero-offset-v3-control-v1.pine / 2 | RUNS | [raw](plotchar-zero-offset-v3-control-v1-attempt2.csv) {"TARGET":"0"} |
| plotchar-series-offset-v4-v1.pine / 1 | RUNS | [raw](plotchar-series-offset-v4-v1-attempt1.csv) {"TARGET":"1"} |
| plotchar-zero-offset-v4-control-v1.pine / 2 | RUNS | [raw](plotchar-zero-offset-v4-control-v1-attempt2.csv) {"TARGET":"0"} |
| plotchar-series-offset-v5-v1.pine / 1 | RUNS | [raw](plotchar-series-offset-v5-v1-attempt1.csv) {"TARGET":"1"} |
| plotchar-zero-offset-v5-control-v1.pine / 2 | RUNS | [raw](plotchar-zero-offset-v5-control-v1-attempt2.csv) {"TARGET":"0"} |
| barcolor-series-offset-v3-v1.pine / 1 | RUNS | [raw](barcolor-series-offset-v3-v1-attempt1.csv) {} |
| barcolor-zero-offset-v3-control-v1.pine / 2 | RUNS | [raw](barcolor-zero-offset-v3-control-v1-attempt2.csv) {} |
| barcolor-series-offset-v4-v1.pine / 1 | RUNS | [raw](barcolor-series-offset-v4-v1-attempt1.csv) {} |
| barcolor-zero-offset-v4-control-v1.pine / 2 | RUNS | [raw](barcolor-zero-offset-v4-control-v1-attempt2.csv) {} |
| barcolor-series-offset-v5-v1.pine / 1 | RUNS | [raw](barcolor-series-offset-v5-v1-attempt1.csv) {} |
| barcolor-zero-offset-v5-control-v1.pine / 2 | RUNS | [raw](barcolor-zero-offset-v5-control-v1-attempt2.csv) {} |
| history-negative-v5-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-negative-v5-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-dynamic-negative-v5-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-dynamic-negative-v5-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-na-v5-v1.pine / 2 | RUNS | [raw](history-na-v5-v1-attempt2.csv) {"TARGET":"77674.04","CONTROL":"77674.04"} |
| history-fraction-near-zero-v5-v1.pine / 2 | RUNS | [raw](history-fraction-near-zero-v5-v1-attempt2.csv) {"TARGET":"77674.04","CONTROL":"77674.04"} |
| history-fraction-negative-v5-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-fraction-negative-v5-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-negative-v6-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-dynamic-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-dynamic-negative-v6-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-na-v6-v1.pine / 2 | RUNS | [raw](history-na-v6-v1-attempt2.csv) {"TARGET":"77674.04","CONTROL":"77674.04"} |
| history-fraction-near-zero-v6-v1.pine / 2 | RUNS | [raw](history-fraction-near-zero-v6-v1-attempt2.csv) {"TARGET":"77674.04","CONTROL":"77674.04"} |
| history-fraction-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/history-fraction-negative-v6-v1-attempt2-error.txt) RE10008; line4: Error on bar 0: The script attempts to reference historical data that is too far from the current bar (-1 bars back). The history-referencing length for the expression must be a value between 0 and 10000. |
| history-buffer-late-jump-v6-v1.pine / 3 | RUNS | [raw](history-buffer-late-jump-v6-v1-attempt3.csv) {"TARGET":"","OFFSET":"1"} |
| ta-rising-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-rising-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"0","CONTROL":"0"} |
| ta-falling-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-falling-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"0","CONTROL":"0"} |
| ta-highest-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-highest-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-highestbars-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-highestbars-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-lowestbars-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-lowestbars-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-rsi-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-rsi-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-cmo-leading-interior-holes-v6-v1.pine / 2 | RUNS | [raw](ta-cmo-leading-interior-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-pivotlow-candidate-holes-v6-v1.pine / 2 | RUNS | [raw](ta-pivotlow-candidate-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-pivothigh-candidate-holes-v6-v1.pine / 2 | RUNS | [raw](ta-pivothigh-candidate-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","TARGET":"","CONTROL":""} |
| ta-cum-fixnan-leading-holes-v6-v1.pine / 2 | RUNS | [raw](ta-cum-fixnan-leading-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","CUM":"","FIXNAN":"","FIXNAN_ALL_NA":""} |
| ta-cross-nullable-operands-v5-v1.pine / 2 | RUNS | [raw](ta-cross-nullable-operands-v5-v1-attempt2.csv) {"A":"0","B":"3.5","BOOL_NA_MINUS1":"0"} |
| ta-crossover-nullable-operands-v5-v1.pine / 2 | RUNS | [raw](ta-crossover-nullable-operands-v5-v1-attempt2.csv) {"A":"0","B":"3.5","BOOL_NA_MINUS1":"0"} |
| ta-crossunder-nullable-operands-v5-v1.pine / 2 | RUNS | [raw](ta-crossunder-nullable-operands-v5-v1-attempt2.csv) {"A":"0","B":"3.5","BOOL_NA_MINUS1":"0"} |
| ta-correlation-asymmetric-holes-v6-v1.pine / 3 | RUNS | [raw](ta-correlation-asymmetric-holes-v6-v1-attempt3.csv) {"A":"0","B":"0","TARGET":""} |
| ta-valuewhen-missing-and-insufficient-v6-v1.pine / 2 | RUNS | [raw](ta-valuewhen-missing-and-insufficient-v6-v1-attempt2.csv) {"HIT":"0","SOURCE":"0","OCCURRENCE0":"","OCCURRENCE2":""} |
| ta-macd-first-bar-warmup-v6-v1.pine / 2 | RUNS | [raw](ta-macd-first-bar-warmup-v6-v1-attempt2.csv) {"SOURCE":"10","MACD":"","SIGNAL":"","HIST":""} |
| ta-vwap-mfi-source-holes-v6-v1.pine / 2 | RUNS | [raw](ta-vwap-mfi-source-holes-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","ACTUAL_VOLUME":"51.86295","ANCHOR":"1","VWAP_SOURCE_HOLE":"","MFI_SOURCE_HOLE":""} |
| implicit-sar-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-sar-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","TARGET":""} |
| implicit-pivot-levels-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-pivot-levels-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","TARGET":""} |
| implicit-obv-pvt-wad-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-obv-pvt-wad-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","OBV":"","PVT":"","WAD":"0"} |
| implicit-vwap-variable-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-vwap-variable-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","VWAP":""} |
| implicit-dmi-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-dmi-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","PLUS":"","MINUS":"","ADX":""} |
| implicit-mfi-actual-chart-gaps-v6-v1.pine / 2 | RUNS | [raw](implicit-mfi-actual-chart-gaps-v6-v1-attempt2.csv) {"ACTUAL_OPEN":"98.856","ACTUAL_HIGH":"98.887","ACTUAL_LOW":"98.846","ACTUAL_CLOSE":"98.882","ACTUAL_VOLUME":"","OHLC_MISSING":"0","VOLUME_MISSING":"1","MFI":""} |
| color-new-dynamic-negative-v6-v1.pine / 2 | RUNS | [raw](color-new-dynamic-negative-v6-v1-attempt2.csv) {"TRANSP":"50","R":"242","G":"54","B":"69","T":"50","SWATCH":"1"} |
| color-new-dynamic-over-v6-v1.pine / 2 | RUNS | [raw](color-new-dynamic-over-v6-v1-attempt2.csv) {"TRANSP":"50","R":"242","G":"54","B":"69","T":"50","SWATCH":"1"} |
| color-new-dynamic-missing-v6-v1.pine / 2 | RUNS | [raw](color-new-dynamic-missing-v6-v1-attempt2.csv) {"TRANSP":"50","R":"242","G":"54","B":"69","T":"50","SWATCH":"1"} |
| color-rgb-red-negative-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-red-negative-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"100","G":"128","B":"192","T":"0","SWATCH":"1"} |
| color-rgb-red-over-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-red-over-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"100","G":"128","B":"192","T":"0","SWATCH":"1"} |
| color-rgb-green-negative-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-green-negative-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"64","G":"100","B":"192","T":"0","SWATCH":"1"} |
| color-rgb-green-over-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-green-over-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"64","G":"100","B":"192","T":"0","SWATCH":"1"} |
| color-rgb-blue-negative-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-blue-negative-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"64","G":"128","B":"100","T":"0","SWATCH":"1"} |
| color-rgb-blue-over-dynamic-v6-v1.pine / 2 | RUNS | [raw](color-rgb-blue-over-dynamic-v6-v1-attempt2.csv) {"CHANNEL_INPUT":"100","R":"64","G":"128","B":"100","T":"0","SWATCH":"1"} |
| color-gradient-equal-bounds-v6-v1.pine / 2 | RUNS | [raw](color-gradient-equal-bounds-v6-v1-attempt2.csv) {"INPUT":"-1","R":"0","G":"0","B":"0","T":"100","SWATCH":"1"} |
| array-fill-range-2-1-v6-v1.pine / 3 | RUNS | [raw](array-fill-range-2-1-v6-v1-attempt3.csv) {"FIRST":"1","SECOND":"2","THIRD":"3"} |
| array-fill-range--1-2-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-fill-range--1-2-v6-v1-attempt2-error.txt) RE10045; line5: Error on bar 3: In 'array.fill()' function. Index -1 is out of bounds, array size is 3. |
| array-fill-range-0-5-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-fill-range-0-5-v6-v1-attempt2-error.txt) RE10045; line5: Error on bar 3: In 'array.fill()' function. Index 5 is out of bounds, array size is 3. |
| array-covariance-unequal-2-3-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-covariance-unequal-2-3-v6-v1-attempt2-error.txt) RE10073; line5: Error on bar 0: The sizes of the `id1` and `id2` arrays must be equal. |
| array-covariance-unequal-3-2-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-covariance-unequal-3-2-v6-v1-attempt2-error.txt) RE10073; line5: Error on bar 0: The sizes of the `id1` and `id2` arrays must be equal. |
| array-percentrank-index-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-percentrank-index-negative-v6-v1-attempt2-error.txt) RE10045; line6: Error on bar 3: In 'array.percentrank()' function. Index -1 is out of bounds, array size is 3. |
| array-percentrank-index-upper-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-percentrank-index-upper-v6-v1-attempt2-error.txt) RE10045; line6: Error on bar 3: In 'array.percentrank()' function. Index 3 is out of bounds, array size is 3. |
| array-percentrank-index-missing-v6-v1.pine / 2 | RUNS | [raw](array-percentrank-index-missing-v6-v1-attempt2.csv) {"INDEX":"1","TARGET":"50"} |
| array-linear-percentile-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-linear-percentile-negative-v6-v1-attempt2-error.txt) RE10002; line6: Error on bar 3: Invalid value of the 'percentage' argument (-1) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100]. |
| array-linear-percentile-over-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/array-linear-percentile-over-v6-v1-attempt2-error.txt) RE10002; line6: Error on bar 3: Invalid value of the 'percentage' argument (101) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100]. |
| array-linear-percentile-missing-v6-v1.pine / 2 | RUNS | [raw](array-linear-percentile-missing-v6-v1-attempt2.csv) {"PERCENT":"50","TARGET":"2"} |
| map-float-key-missing-v6-v1.pine / 2 | RUNS | [raw](map-float-key-missing-v6-v1-attempt2.csv) {"KEY":"","SIZE":"1","VALUE":"7"} |
| map-float-key-overflow-v6-v1.pine / 2 | RUNS | [raw](map-float-key-overflow-v6-v1-attempt2.csv) {"KEY":"","SIZE":"1","VALUE":"7"} |
| map-put-all-capacity-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/map-put-all-capacity-v6-v1-attempt2-error.txt) RE10070; line13: Error on bar 500: A map cannot have more than 50000 key-value pairs. The current size is 50001. |
| axis-last-defined-color-v6-v1.pine / 1 | RUNS | [raw](axis-last-defined-color-v6-v1-attempt1.csv) {"LAST_DEFINED":"77674.04"} |
| barstate-security-confirmed-v6-v1.pine / 3 | RUNS | [raw](barstate-security-confirmed-v6-v1-attempt3.csv) {"CHART_CONFIRMED":"1","REQUESTED_CONFIRMED":""} |
| session-lastbar-missing-v6-v1.pine / 2 | RUNS | [raw](session-lastbar-missing-v6-v1-attempt2.csv) {"LASTBAR":"0","TIME":"1782412800000"} |
| analyst-target-availability-v6-v1.pine / 3 | RUNS | [raw](analyst-target-availability-v6-v1-attempt3.csv) {"HIGH":"","LOW":"","MEDIAN":"","AVERAGE":"","DATE":"","ESTIMATES":""} |
| label-approx-count-v6-v1.pine / 2 | RUNS | [raw](label-approx-count-v6-v1-attempt2.csv) {"COUNT":"1"} |
| line-approx-count-v6-v1.pine / 2 | RUNS | [raw](line-approx-count-v6-v1-attempt2.csv) {"COUNT":"1"} |
| polyline-approx-count-v6-v1.pine / 2 | RUNS | [raw](polyline-approx-count-v6-v1-attempt2.csv) {"COUNT":"1"} |
| polyline-curved-asymmetric-v6-v1.pine / 1 | RUNS | [raw](polyline-curved-asymmetric-v6-v1-attempt1.csv) {} |
| table-dimension-negative-v6-v1.pine / 2 | RUNTIME-ERROR | [raw](evidence/table-dimension-negative-v6-v1-attempt2-error.txt) RE10001; line4: Error on bar 0: Invalid value of the 'columns' argument (-1) in the 'table.new' function. It must be >= 0. |
| table-dimension-zero-v6-v1.pine / 2 | RUNS | [raw](table-dimension-zero-v6-v1-attempt2.csv) {"DIMENSION":"0"} |
| table-dimension-float-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/table-dimension-float-v6-v1-attempt2-error.txt) CE10123; line4: Cannot call "table.new" with argument "columns"="n". An argument of "series float" type was used but a "series int"  is expected. |
| varip-enum-eligibility-v6-v1.pine / 2 | RUNS | [raw](varip-enum-eligibility-v6-v1-attempt2.csv) {"VALUE":"1"} |
| varip-point-eligibility-v6-v1.pine / 2 | RUNS | [raw](varip-point-eligibility-v6-v1-attempt2.csv) {"PRICE":"77674.04"} |
| varip-footprint-eligibility-v6-v1.pine / 2 | RUNS | [raw](varip-footprint-eligibility-v6-v1-attempt2.csv) {"MISSING":"1"} |
| varip-volume-row-eligibility-v6-v1.pine / 2 | RUNS | [raw](varip-volume-row-eligibility-v6-v1-attempt2.csv) {"MISSING":"1"} |
| nonstandard-history-ticks-v6-v1.pine / 5 | RUNS | [raw](nonstandard-history-ticks-v6-v1-attempt5.csv) {"UPDATES":"1","CURRENT":"80340","PREVIOUS":"","CONFIRMED":"1"} |
| sparse-udf-history-buffer-v6-v1.pine / 2 | RUNS | [raw](sparse-udf-history-buffer-v6-v1-attempt2.csv) {"SPARSE":"","DENSE":""} |
| undeclared-reference-v5-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/undeclared-reference-v5-v1-attempt2-error.txt) None; line3: Undeclared identifier 'missingName' |
| undeclared-reference-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/undeclared-reference-v6-v1-attempt2-error.txt) CE10272; line3: Undeclared identifier "missingName" |
| duplicate-global-declaration-v5-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/duplicate-global-declaration-v5-v1-attempt2-error.txt) None; line4: 'x' is already defined |
| duplicate-global-declaration-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/duplicate-global-declaration-v6-v1-attempt2-error.txt) CE10095; line4: "x" is already defined |
| corpus-hline-alpha-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-hline-alpha-v1-attempt2-error.txt) CE10120; line3: The "hline" function does not have an argument with the name "alpha" |
| corpus-indicator-margin-top-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-indicator-margin-top-v1-attempt2-error.txt) None; line2: The 'indicator' function does not have an argument with the name 'margin_top' |
| corpus-label-bgcolor-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-label-bgcolor-v1-attempt2-error.txt) None; line3: The 'label.new' function does not have an argument with the name 'bgcolor' |
| corpus-input-step-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-input-step-v1-attempt2-error.txt) None; line3: The arguments 'maxval', 'minval', and 'step' cannot be used with the input() function. You can use the input.int() or input.float() functions to specify a range of input data values |
| corpus-local-alertcondition-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-local-alertcondition-v1-attempt2-error.txt) None; line4: Cannot use 'alertcondition' in local scope |
| corpus-array-map-unparameterized-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-array-map-unparameterized-v1-attempt2-error.txt) None; line3: 'map' is not a valid type keyword. |
| corpus-array-matrix-unparameterized-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-array-matrix-unparameterized-v1-attempt2-error.txt) None; line3: 'matrix' is not a valid type keyword. |
| corpus-inline-callback-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-inline-callback-v1-attempt2-error.txt) None; line4: Mismatched input '=>' expecting ')' |
| corpus-if-then-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-if-then-v1-attempt2-error.txt) None; line3: Syntax error at input 'then' |
| corpus-return-keyword-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-return-keyword-v1-attempt2-error.txt) None; line4: Syntax error at input 'end of line without line continuation' |
| corpus-duplicate-label-size-v1.pine / 2 | RUNS | [raw](corpus-duplicate-label-size-v1-attempt2.csv) {} |
| corpus-math-cbrt-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-math-cbrt-v1-attempt2-error.txt) CE10271; line3: Could not find function or function reference 'math.cbrt' |
| corpus-fullwidth-code-indent-v5-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-fullwidth-code-indent-v5-v1-attempt2-error.txt) None; line3: Syntax error at input 'x' |
| corpus-typed-template-original-v5-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-typed-template-original-v5-v1-attempt2-error.txt) None; line4: 'as' cannot be used as a variable or function name. |
| corpus-corpus-v56-1180-original-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-corpus-v56-1180-original-v1-attempt2-error.txt) None; line3: Undeclared identifier 'src' |
| corpus-corpus-v56-1342-original-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/corpus-corpus-v56-1342-original-v1-attempt2-error.txt) None; line3: Undeclared identifier 'error_log_level' |
| drawing-glyph-metrics-v6-v1.pine / 1 | RUNS | [raw](drawing-glyph-metrics-v6-v1-attempt1.csv) {"SCALE":"1"} |
| ta-min-all-na-v6-v1.pine / 2 | RUNS | [raw](ta-min-all-na-v6-v1-attempt2.csv) {"TARGET":""} |
| plotshape-series-offset-v3-v1.pine / 1 | RUNS | [raw](plotshape-series-offset-v3-v1-attempt1.csv) {"TARGET":"1"} |
| plotshape-zero-offset-v3-control-v1.pine / 2 | RUNS | [raw](plotshape-zero-offset-v3-control-v1-attempt2.csv) {"CONTROL":"0"} |
| plotshape-series-offset-v4-v1.pine / 1 | RUNS | [raw](plotshape-series-offset-v4-v1-attempt1.csv) {"TARGET":"1"} |
| plotshape-zero-offset-v4-control-v1.pine / 2 | RUNS | [raw](plotshape-zero-offset-v4-control-v1-attempt2.csv) {"CONTROL":"0"} |
| plotshape-series-offset-v5-v1.pine / 1 | RUNS | [raw](plotshape-series-offset-v5-v1-attempt1.csv) {"TARGET":""} |
| plotshape-zero-offset-v5-control-v1.pine / 2 | RUNS | [raw](plotshape-zero-offset-v5-control-v1-attempt2.csv) {"CONTROL":"0"} |
| negative-remainder-v5-v1.pine / 2 | RUNS | [raw](negative-remainder-v5-v1-attempt2.csv) {"NEGATIVE_DIVIDEND":"-2","NEGATIVE_DIVISOR":"2","BOTH_NEGATIVE":"-2","COMPOUND":"-2"} |
| negative-remainder-v6-v1.pine / 2 | RUNS | [raw](negative-remainder-v6-v1-attempt2.csv) {"NEGATIVE_DIVIDEND":"-2","NEGATIVE_DIVISOR":"2","BOTH_NEGATIVE":"-2","COMPOUND":"-2"} |
| ta-bbw-tsi-hole-zero-v6-v1.pine / 2 | RUNS | [raw](ta-bbw-tsi-hole-zero-v6-v1-attempt2.csv) {"SOURCE":"","CLEAN":"10","BBW_HOLES":"","BBW_ZERO":"","TSI_HOLES":"","TSI_CONSTANT":""} |
| ta-wpr-actual-ohlc-gaps-v6-v1.pine / 1 | RUNS | [raw](ta-wpr-actual-ohlc-gaps-v6-v1-attempt1.csv) {"ACTUAL_OPEN":"77682","ACTUAL_HIGH":"77682.01","ACTUAL_LOW":"77572","ACTUAL_CLOSE":"77674.04","ACTUAL_VOLUME":"51.86295","OHLC_MISSING":"0","VOLUME_MISSING":"0","WPR":""} |
| array-min-allna-empty-v6-v1.pine / 2 | RUNS | [raw](array-min-allna-empty-v6-v1-attempt2.csv) {"ALL_NA":"","EMPTY":""} |
| array-standardize-allna-empty-v6-v1.pine / 2 | RUNS | [raw](array-standardize-allna-empty-v6-v1-attempt2.csv) {"ALL_NA_SIZE":"3","ALL_NA_FIRST":"","EMPTY_SIZE":"0"} |
| matrix-stochastic-row-column-v6-v1.pine / 2 | RUNS | [raw](matrix-stochastic-row-column-v6-v1-attempt2.csv) {"ROW_ONLY":"1","COLUMN_ONLY":"0"} |
| chart-context-lifecycle-v6-v1.pine / 2 | RUNS | [raw](chart-context-lifecycle-v6-v1-attempt2.csv) {"EXEC_COUNT":"1","WALL_CLOCK":"1791103673484","LEFT_VISIBLE":"1790820480000","RIGHT_VISIBLE":"1791103560000"} |
| named-session-futures-v6-v1.pine / 3 | RUNS | [raw](named-session-futures-v6-v1-attempt3.csv) {"REGULAR":"","CHART":"3740.5"} |
| display-host-options-v6-v1.pine / 1 | RUNS | [raw](display-host-options-v6-v1-attempt1.csv) {"ALL":"77674.04","STATUS_ONLY":"77675.04"} |
| nested-dynamic-request-v6-v1.pine / 2 | RUNS | [raw](nested-dynamic-request-v6-v1-attempt2.csv) {"INNER":"77682","OUTER":"","DIRECT":""} |
| legacy-atan-v4-v1.pine / 3 | RUNS | [raw](legacy-atan-v4-v1-attempt3.csv) {"TARGET":"0.4636476090008061"} |
| legacy-acos-v4-v1.pine / 2 | RUNS | [raw](legacy-acos-v4-v1-attempt2.csv) {"TARGET":"1.0471975511965979"} |
| legacy-barsince-v4-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/legacy-barsince-v4-v1-attempt2-error.txt) None; line3: Could not find function or function reference 'barsince'. |
| array-abs-copy-v6-v1.pine / 2 | RUNS | [raw](array-abs-copy-v6-v1-attempt2.csv) {"SOURCE":"-2","RESULT":"99"} |
| array-int-average-fraction-v6-v1.pine / 2 | RUNS | [raw](array-int-average-fraction-v6-v1-attempt2.csv) {"POSITIVE":"1.5","NEGATIVE":"-1.5"} |
| v5-unique-style-string-concat-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/v5-unique-style-string-concat-v1-attempt2-error.txt) None; line3: Invalid argument 'expr0' in 'operator +' call |
| v6-bool-array-omitted-seed-v1.pine / 2 | RUNS | [raw](v6-bool-array-omitted-seed-v1-attempt2.csv) {"BOOL":"0"} |
| plot-area-opaque-alpha-v6-v1.pine / 1 | RUNS | [raw](plot-area-opaque-alpha-v6-v1-attempt1.csv) {"TARGET":"2","BASE":"0"} |
| plot-areabr-opaque-alpha-v6-v1.pine / 1 | RUNS | [raw](plot-areabr-opaque-alpha-v6-v1-attempt1.csv) {"TARGET":"2","BASE":"0"} |
| plotshape-textcolor-na-v6-v1.pine / 1 | RUNS | [raw](plotshape-textcolor-na-v6-v1-attempt1.csv) {"TARGET":"1"} |
| plotchar-textcolor-na-v6-v1.pine / 2 | RUNS | [raw](plotchar-textcolor-na-v6-v1-attempt2.csv) {"TARGET":"1"} |
| nz-bool-default-v4-v1.pine / 2 | RUNS | [raw](nz-bool-default-v4-v1-attempt2.csv) {"OUTCOME":"0"} |
| nz-bool-default-v5-v1.pine / 2 | RUNS | [raw](nz-bool-default-v5-v1-attempt2.csv) {"OUTCOME":"0"} |
| global-function-value-same-name-v5-v1.pine / 3 | RUNS | [raw](global-function-value-same-name-v5-v1-attempt3.csv) {"CALL":"1","VALUE":"2"} |
| global-function-value-same-name-v6-v1.pine / 3 | RUNS | [raw](global-function-value-same-name-v6-v1-attempt3.csv) {"CALL":"1","VALUE":"2"} |
| object-size-shadow-v6-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/object-size-shadow-v6-v1-attempt2-error.txt) CE10093; line5: Invalid object name: size. Namespaces of built-ins cannot be used. |
| udf-size-shadow-v6-v1.pine / 2 | RUNS | [raw](udf-size-shadow-v6-v1-attempt2.csv) {"FIELD":"3"} |
| const-dead-switch-length-v5-v1.pine / 2 | COMPILE-ERROR | [raw](evidence/const-dead-switch-length-v5-v1-attempt2-error.txt) None; line7: Cannot call 'ta.ema' with argument 'length'='length'. An argument of 'series int' type was used but a 'simple int' is expected. |
| hline-gradient-cf011-reduced-v6-v1.pine / 1 | RUNS | [raw](hline-gradient-cf011-reduced-v6-v1-attempt1.csv) {} |
| array-02-get-index-literal-na.pine / 2 | RUNS | [raw](array-02-get-index-literal-na-attempt2.csv) {"OUTCOME":""} |
| array-03-get-index-math-round-na.pine / 2 | RUNS | [raw](array-03-get-index-math-round-na-attempt2.csv) {"OUTCOME":""} |
| plot-01-series-offset-v3.pine / 2 | RUNS | [raw](plot-01-series-offset-v3-attempt2.csv) {"OUTCOME":""} |
| plot-02-series-offset-v4.pine / 2 | RUNS | [raw](plot-02-series-offset-v4-attempt2.csv) {"OUTCOME":"77758.24"} |
| strings-01-tostring-default-precision.pine / 2 | RUNS | [raw](strings-01-tostring-default-precision-attempt2.csv) {"OUTCOME":"1"} |
| strings-03-tostring-eleven-decimal-rounding.pine / 2 | RUNS | [raw](strings-03-tostring-eleven-decimal-rounding-attempt2.csv) {"OUTCOME":"1"} |
| conditional-01-unmatched-string-if.pine / 2 | RUNS | [raw](conditional-01-unmatched-string-if-attempt2.csv) {"OUTCOME":"1"} |
| const-reference-array-accept-mutate.pine / 3 | RUNS | [raw](const-reference-array-accept-mutate-attempt3.csv) {"OUTCOME":"77675.04"} |
| const-reference-array-qualifier-diagnostic.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-array-qualifier-diagnostic-attempt2-error.txt) CE10123; line4: Cannot call "plot" with argument "series"="value". An argument of "array<float>" type was used but a "series float"  is expected. |
| const-reference-array-replace-id.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-array-replace-id-attempt2-error.txt) CE10085; line4: A variable declared with the "const" type form cannot be modified. |
| const-reference-matrix-accept-mutate.pine / 2 | RUNS | [raw](const-reference-matrix-accept-mutate-attempt2.csv) {"OUTCOME":"77675.04"} |
| const-reference-matrix-qualifier-diagnostic.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-matrix-qualifier-diagnostic-attempt2-error.txt) CE10123; line4: Cannot call "plot" with argument "series"="value". An argument of "matrix<float>" type was used but a "series float"  is expected. |
| const-reference-matrix-replace-id.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-matrix-replace-id-attempt2-error.txt) CE10085; line4: A variable declared with the "const" type form cannot be modified. |
| const-reference-map-accept-mutate.pine / 2 | RUNS | [raw](const-reference-map-accept-mutate-attempt2.csv) {"OUTCOME":"77675.04"} |
| const-reference-map-qualifier-diagnostic.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-map-qualifier-diagnostic-attempt2-error.txt) CE10123; line4: Cannot call "plot" with argument "series"="value". An argument of "map<string, float>" type was used but a "series float"  is expected. |
| const-reference-map-replace-id.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-map-replace-id-attempt2-error.txt) CE10085; line4: A variable declared with the "const" type form cannot be modified. |
| const-reference-line-accept-mutate.pine / 3 | RUNS | [raw](const-reference-line-accept-mutate-attempt3.csv) {"OUTCOME":"77675.04"} |
| const-reference-line-qualifier-diagnostic.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-line-qualifier-diagnostic-attempt2-error.txt) CE10123; line4: Cannot call "plot" with argument "series"="value". An argument of "series line" type was used but a "series float"  is expected. |
| const-reference-line-replace-id.pine / 2 | COMPILE-ERROR | [raw](evidence/const-reference-line-replace-id-attempt2-error.txt) CE10085; line4: A variable declared with the "const" type form cannot be modified. |
| ledger-division-v4-positive-const.pine / 2 | RUNS | [raw](ledger-division-v4-positive-const-attempt2.csv) {"OUTCOME":"2"} |
| ledger-division-v4-negative-numerator.pine / 2 | RUNS | [raw](ledger-division-v4-negative-numerator-attempt2.csv) {"OUTCOME":"-2"} |
| ledger-division-v4-negative-denominator.pine / 2 | RUNS | [raw](ledger-division-v4-negative-denominator-attempt2.csv) {"OUTCOME":"-2"} |
| ledger-division-v4-both-negative.pine / 2 | RUNS | [raw](ledger-division-v4-both-negative-attempt2.csv) {"OUTCOME":"2"} |
| ledger-division-v4-negative-exact.pine / 2 | RUNS | [raw](ledger-division-v4-negative-exact-attempt2.csv) {"OUTCOME":"-3"} |
| ledger-division-v4-float-control.pine / 2 | RUNS | [raw](ledger-division-v4-float-control-attempt2.csv) {"OUTCOME":"-2.5"} |
| ledger-division-v4-input-control.pine / 2 | RUNS | [raw](ledger-division-v4-input-control-attempt2.csv) {"OUTCOME":"-2.5"} |
| lower-tf-spread-symbol-v6-v1.pine / 2 | RUNS | [raw](lower-tf-spread-symbol-v6-v1-attempt2.csv) {"INTRABARS":"2","FIRST":"77625.93","LAST":"77674.04"} |
| export-request-library-v6-v1.pine / 1 | RUNS | [raw](export-request-library-v6-v1-attempt1.csv) {} |
| export-library-no-request-control-v6-v1.pine / 1 | COMPILE-ACCEPTED | [raw](evidence/export-library-no-request-control-v6-v1-attempt1-compile.txt) Library compilation admitted; exported execution unobserved |
| native-error-text-woodie-developing-v6-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/native-error-text-woodie-developing-v6-v1-attempt1-error.txt) RE10128; line3: Error on bar 0: The `developing` parameter of the `ta.pivot_point_levels()` cannot be `true` when `type` is "Woodie". |
| native-error-text-line-price-bar-time-v6-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/native-error-text-line-price-bar-time-v6-v1-attempt1-error.txt) RE10119; line4: Error on bar 0: 'line.get_price' must be used with lines created using 'xloc=xloc.bar_index'. |
| native-error-text-table-overlap-merge-v6-v1.pine / 1 | RUNS | [raw](native-error-text-table-overlap-merge-v6-v1-attempt1.csv) {} |
| native-error-text-format-unmatched-left-v6-v1.pine / 1 | RUNTIME-ERROR | [raw](evidence/native-error-text-format-unmatched-left-v6-v1-attempt1-error.txt) None; line3: Error on bar 0: Unmatched braces in the pattern. |
| native-error-text-log-unmatched-right-v6-v1.pine / 1 | RUNS | [raw](native-error-text-log-unmatched-right-v6-v1-attempt1.csv) {} |

Pending sources: table-cell-width-negative-v6-v1.pine, table-cell-height-negative-v6-v1.pine, table-cell-width-missing-v6-v1.pine, table-cell-height-missing-v6-v1.pine, table-cell-width-overflow-v6-v1.pine, table-cell-height-overflow-v6-v1.pine, label-arrow-outline-metrics-v6-v1.pine, label-viewport-clamp-eight-styles-v6-v1.pine, ta-percentrank-clean-ties-warmup-v6-v1.pine, random-seeded-cross-call-streams-v6-v1.pine, packet008-eigen-reference-v1.pine, packet008-pinv-cutoff-v1.pine, packet008-pinv-rankone-v1.pine, binary-search-bounded-duplicate-controls-v6-v1.pine, matrix-det-pivot-control-v6-v1.pine, array-float-index-floor-get-set-v6-v1.pine, trackprice-offset--1-v6-v1.pine, trackprice-offset-0-v6-v1.pine, trackprice-offset-1-v6-v1.pine.

[All attempts](outcomes-v7.json), [source-pinned plan](capture-plan-v1.json), [integrity and evidence SHA256](capture-integrity-v28.json). Earlier response versions remain retained. Context-specific visual/feed/event observations are separate supplements; unavailable contexts are recorded as NOT-EXERCISED, not native refusals. Optional library import execution requires an actual published ID; no source is published by this capture task.

Spread/library/error capture v1: spread lower-TF default and required BTC control RUNS; native resolved spread is type spread/dynamic, provider binance, legs BINANCE:BTCUSDT and BINANCE:ETHUSDT. Both leg metadata/session/timezone/subscription and requested1m are preserved. Default spread has leading zero-intrabar history; BTC control has2 intrabars throughout confirmed rows. These are observed availability differences, not reliability claims. Actual input changes and restoration are recorded.

Exact library declarations compile without publishing. Request library has native status2 and raw OHLC CSV with no exported-call result. No-request control has generated compiled metainfo matching unchanged editor bytes, no error markers,isLoading=false,isFailed=false,hasCompileError=false; inert status0/cache0 caused the numeric readiness helper to time out. Captured as COMPILE-ACCEPTED, not a native refusal or numerical run. Imported execution NOT-EXERCISED: no actual published library identifier.

Native error probes: Woodie/developing RE10128 bar0; line.get_price with xloc.bar_time RE10119 bar0; unmatched-left str.format runtime error bar0, no exposed numeric code. Duplicate identical table merge RUNS. Unmatched-right log.info RUNS and logs literal }. All10000 currently exposed native log entries are retained, not the entire historical log outside the native buffer. The shell-argument-size acquisition failure was fixed with direct artifact writes; no frozen script changed. [Context summary v1](spread-library-error-context-summary-v1.json).
