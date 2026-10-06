# Missing matrix predicates capture v1

BINANCE:BTCUSDT, standard candles, 2 minutes, UTC; at least32 closed bars. Paste exact indicator source, Save and Add to chart; no inputs. If refused, record exact phase/text/site and screenshot. If it runs, export chart CSV including all eight named plots and a Data Window screenshot on a closed bar. Retain each column separately; a refusal leaves hidden predicates UNOBSERVED.

Discriminators: ZERO/BINARY/IDENTITY distinguish missing-as-invalid from missing coerced/ignored; SYMMETRIC/ANTISYMMETRIC distinguish field-value comparisons from structural identity handling on the one diagonal cell; DIAGONAL/ANTIDIAGONAL/TRIANGULAR distinguish constraints only on off-diagonal cells from a blanket missing rejection. Output1 means true,0false. Every native outcome UNSPECIFIED; do not infer answers from definitions using equality. Prices are unused; no numerical precision export issue.

## Round v56 capture contract v1

Use `matrix-missing-predicates-v6-v56-v1.pine` unchanged; verify its SHA256SUMS entry. Context: BINANCE:BTCUSDT, standard candles, 2 minutes, Etc/UTC; export 32 closed calculated bars. Record source SHA, exact symbol/exchange, chart and exchange timezone, settings, capture time and endpoints. The calc_bars_count=32 bound limits the historical pass; native bar_index is not assumed to start at zero. SOURCE_TIME/SOURCE_INDEX bind each row; SAMPLE_INDEX is an execution-pass counter, not a Pine index promise.

Columns (15): ZERO, BINARY, IDENTITY, SYMMETRIC, ANTISYMMETRIC, DIAGONAL, ANTIDIAGONAL, TRIANGULAR, MISSING_CELL_CONTROL, FINITE_ZERO_CONTROL, FINITE_BINARY_CONTROL, FINITE_IDENTITY_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME.

Save the full raw CSV with indicator plots and OHLCV, source, settings screenshot and closed-bar Data Window (or the required continuous live sequence). Preserve empty cells separately from numeric zero and do not repair a refused source. Earliest compile/runtime phase, exact diagnostic text/location and screenshot are outcomes, not hidden-value answers. For true/false channels 1/0 is an observer encoding only; preserve OTHER results. Use only the explicitly named cells; no general algorithm or precision claims.

Return source-bound evidence at `v56/captures/v56/RESPONSE-v56.md`; native phase/values remain UNSPECIFIED until returned evidence is adjudicated. Local parse/compile is instrument preflight only.
