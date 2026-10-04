# Market-profile float-grid capture v2

Paste the exact Pine v5 indicator. Use BINANCE:BTCUSDT, 2-minute standard candles, default settings; at least 32 historical bars. Record exact compile phase and diagnostic text first. On success, export all 13 named columns and certify historical cutoff/live exclusion. Preserve source and original CSV bytes.

Expected observations remain unspecified. FIRST_PASS_SIZE and OVERLAP_PASS_SIZE measure overlapping fractional price grids. NEAR_INDEX searches for 0.1 + 0.2 against stored 0.3; NEAR_EQUAL independently records ==. AFTER_CLEAR_SIZE, SHIFT_VALUE, AFTER_SHIFT_SIZE separate deletion from search behavior.

INDEX_DELTA_1E12 and EQUAL_DELTA_1E12 compare stored 0.3 with 0.3 + 1e-12. INDEX_DELTA_1E9 and EQUAL_DELTA_1E9 compare stored 0.3 with 0.3 + 1e-9. INDEX_BOUNDARY_1E10 and EQUAL_BOUNDARY_1E10 compare stored 0.0 with exactly the literal 1e-10, avoiding an added nonzero base at the inclusive-boundary check.

Hypothesis to discriminate, not a native verdict: if array.indexof uses the same inclusive absolute 1e-10 equality as ==, the 1e-12 pair should be index 0/equality 1, the 1e-9 pair index -1/equality 0, and the literal 1e-10 boundary pair index 0/equality 1. Record every pair independently; disagreeing search/equality results identify different policies. The hypothesis does not prescribe a price-grid count: accumulated error and loop stepping also matter. No engine equality/counter policy may change before native evidence.

This mechanism probe links to v7:114/115 and supersedes the unobserved v1 probe. It does not alone certify full-source completion or equivalence of the synthetic requested-data feed. Engine readiness values are not native predictions.
