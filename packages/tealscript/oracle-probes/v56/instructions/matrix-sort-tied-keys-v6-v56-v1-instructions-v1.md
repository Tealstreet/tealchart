# Matrix equal-key row order capture v1

Use BINANCE:BTCUSDT, 2 minutes, UTC, at least 32 closed bars. Paste exact source unchanged into an indicator, Save and Add to chart. If refused, capture exact phase/text/site and screenshot; values remain UNOBSERVED. If it runs, export chart data CSV including all six named plots and a Data Window screenshot on a closed bar. No inputs or private renderer extraction.

Question: does sorting retain original equal-key row order? Ascending stable answer is IDs 43,17,29; reversing equal-key ties yields 43,29,17. Descending after ascending distinguishes retention (17,29,43) from reversal (29,17,43). Other outputs are retained verbatim. Native answer UNSPECIFIED; no stability inferred from the manual or JS implementation.

Bounded three-row fixture only: one captured ordering does not establish the sorting algorithm or stability for every size and key distribution.

## Round v56 capture contract v1

Use `matrix-sort-tied-keys-v6-v56-v1.pine` unchanged; verify its SHA256SUMS entry. Context: BINANCE:BTCUSDT, standard candles, 2 minutes, Etc/UTC; export 32 closed calculated bars. Record source SHA, exact symbol/exchange, chart and exchange timezone, settings, capture time and endpoints. The calc_bars_count=32 bound limits the historical pass; native bar_index is not assumed to start at zero. SOURCE_TIME/SOURCE_INDEX bind each row; SAMPLE_INDEX is an execution-pass counter, not a Pine index promise.

Columns (9): ASC_ID0, ASC_ID1, ASC_ID2, DESC_ID0, DESC_ID1, DESC_ID2, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME.

Save the full raw CSV with indicator plots and OHLCV, source, settings screenshot and closed-bar Data Window (or the required continuous live sequence). Preserve empty cells separately from numeric zero and do not repair a refused source. Earliest compile/runtime phase, exact diagnostic text/location and screenshot are outcomes, not hidden-value answers. For true/false channels 1/0 is an observer encoding only; preserve OTHER results. Use only the explicitly named cells; no general algorithm or precision claims.

Return source-bound evidence at `v56/captures/v56/RESPONSE-v56.md`; native phase/values remain UNSPECIFIED until returned evidence is adjudicated. Local parse/compile is instrument preflight only.
