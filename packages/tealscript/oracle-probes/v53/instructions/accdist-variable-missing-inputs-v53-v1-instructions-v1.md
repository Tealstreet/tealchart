# V53 accdist-variable-missing-inputs-v53-v1 capture instructions v1

Native-pending row: lane-b:121. This source targets only this row in Pine v6.

For the direct ta.accdist variable, what happens on actual missing OHLC/volume bars, and on the first eligible finite bar after a missing-input bar?

Use standard candles, regular session and Etc/UTC chart display timezone. Default finite control context is BINANCE:BTCUSDT, 2-minute, with at least 32 historical bars. Native-input scripts require the actual eligible context specified below. Remove other probes. Verify sha256sum -c SHA256SUMS. Preserve the exact source/hash and input defaults except the separately listed attempts.

Native phase and values are UNSPECIFIED. Preserve RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with earliest diagnostic, member/site, line/column, reached bar and screenshot. A control/observer error is not automatically a builtin verdict. Do not repair source bytes to make it run.

On RUNS retain raw CSV (including empty/NA/zero cells), exact Pine Logs text, Data Window and settings screenshots, and chart symbol/tickerid/modifiers, timeframe, candle type, exchange/display timezones, session, inputs, account/build, data/index origin and closed/live cutoff. String lengths or equal numeric zero do not certify exact strings or signs.

Bound: calc_bars_count=32 includes any live bar. Adjudicate only reached closed calculations within that bound, aligned by SOURCE_INDEX/SOURCE_TIME; SAMPLE_INDEX is a local counter, not a claimed Pine index reset. At most 32 observed bars, fewer than 64 plot channels, no collection/UDT allocation. Preserve startup and actual eligible/recovery masks without inferring unobserved input conditions. No broad ta.* claim.

Capture a finite-input nonzero-range control window first. Then capture a standard-candle native window with actually missing high/low/close or volume. Retain the exact raw OHLCV, range, masks, output, previous output and Pine Logs. A no-volume chart such as SP:SPX is only a candidate; require actual missing flags or the exact native no-volume diagnostic rather than assuming it.

MISSING_VOLUME_NONZERO_RANGE isolates missing volume from zero-range 0/0. If those conditions do not occur, keep the relevant subfacet INCONCLUSIVE. Recovery credit requires an observed FINITE_NONFLAT_AFTER_MISSING=1 neighbor; an all-missing feed cannot establish interior-hole recovery. No source/volume mask is fabricated and no formula is substituted for the direct ta.accdist variable.

Columns: PRICE_NA, VOLUME_NA, ELIGIBLE_MISSING_INPUT, MISSING_VOLUME_NONZERO_RANGE, FINITE_NONFLAT_AFTER_MISSING, INPUT_RANGE, ACCDIST_VARIABLE, ACCDIST_NA, ACCDIST_NZ_SENTINEL, PREVIOUS_ACCDIST, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native export headers verbatim.

Power limit: Only direct variable output on observed missing masks and finite nonflat neighbors. No general cumulative formula, zero-range policy, session or synthetic-input closure.

Return source-bound artifacts under v53/captures/v53/ and list the source/hash, attempt and observations in RESPONSE-v53.md.
