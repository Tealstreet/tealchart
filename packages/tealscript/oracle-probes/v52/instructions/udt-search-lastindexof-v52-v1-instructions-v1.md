# V52 udt-search-lastindexof capture instructions v1

Register row: `array.udt-search-comparator-native-hold`. This indicator covers this row only.

UDT lastindexof: reference versus structural field comparison

Use BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, at least 32 closed bars in the chart dataset, and unchanged input defaults. Capture only this indicator; remove the previous probe. Verify `sha256sum -c SHA256SUMS` before starting. Preserve the supplied source bytes and source SHA; do not repair a refusal or remove the disputed argument.

Native phase and values are UNSPECIFIED. On COMPILE-ERROR retain the complete first diagnostic, actual and required base types AND qualifiers, member/argument, line/column and a screenshot of the highlighted site. On RUNTIME-ERROR retain the earliest error, executing bar and reached output. An unrelated error is INCONCLUSIVE for this row.

On RUNS export raw CSV (preserve NA/empty cells) and a Data Window screenshot containing the last 32 closed bars' observations and named controls. Record dataset/index origin, closed/live cutoff, symbol, timeframe, chart type, exchange/chart timezones, session, account/build and inputs. Earlier CSV rows may be retained for alignment but confer no additional coverage. String probes also need exact Pine Logs text or result-title text; length alone cannot establish a string value.

Columns: SAME_REFERENCE, DISTINCT_EQUAL_FIELDS, EQUAL_FIELDS_NOT_STORED, SAME_REFERENCE_AFTER_FIELD_WRITE, DISTINCT_AFTER_FIELD_WRITE, NOT_STORED_AFTER_FIELD_WRITE, BAR_INDEX. Preserve native-generated OHLC subcolumn names verbatim.

Bound: indicator calc_bars_count=32 limits calculation to 32 bars (including any live bar); retain the actual reached closed-bar range without inventing startup indices. At most 32 observed bars, at most 64 plotted channels, at most three UDTs or two collection slots except the documented three-element search/join fixtures. No TA algorithm, initialization, precision, long-history or realtime claim.

Power limit: Six reached search results discriminate the two named models; OTHER and refusal remain independent outcomes. No equality-operator, missing-field, arbitrary UDT or comparator-native claim before capture.

Return source-bound artifacts under `v52/captures/v52/` and list this probe in `RESPONSE-v52.md`. Preserve RUNS, refusal, OTHER and INCONCLUSIVE separately.
