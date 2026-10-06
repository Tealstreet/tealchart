# V53 max-all-missing-seed-v53-v1 capture instructions v1

Native-pending row: lane-b:119. This source targets only this row in Pine v6.

What does ta.max publish before any finite sample when the source remains missing for every calculated bar?

Use standard candles, regular session and Etc/UTC chart display timezone. Default finite control context is BINANCE:BTCUSDT, 2-minute, with at least 32 historical bars. Native-input scripts require the actual eligible context specified below. Remove other probes. Verify sha256sum -c SHA256SUMS. Preserve the exact source/hash and input defaults except the separately listed attempts.

Native phase and values are UNSPECIFIED. Preserve RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with earliest diagnostic, member/site, line/column, reached bar and screenshot. A control/observer error is not automatically a builtin verdict. Do not repair source bytes to make it run.

On RUNS retain raw CSV (including empty/NA/zero cells), exact Pine Logs text, Data Window and settings screenshots, and chart symbol/tickerid/modifiers, timeframe, candle type, exchange/display timezones, session, inputs, account/build, data/index origin and closed/live cutoff. String lengths or equal numeric zero do not certify exact strings or signs.

Bound: calc_bars_count=32 includes any live bar. Adjudicate only reached closed calculations within that bound, aligned by SOURCE_INDEX/SOURCE_TIME; SAMPLE_INDEX is a local counter, not a claimed Pine index reset. At most 32 observed bars, fewer than 64 plot channels, no collection/UDT allocation. Preserve startup and actual eligible/recovery masks without inferring unobserved input conditions. No broad ta.* claim.

The allMissing source is typed series float na on every calculation, independent of chart prices. Compare ALL_MISSING_MAX, its direct na flag, nz sentinel and exact string log at the first reached calculated sample and throughout the window. Raw plots may suppress infinity, so do not interpret an empty plot alone as na. Preserve native text that distinguishes an infinity-like internal seed from missing. The independent negative constant and delayed-finite calls are observer/startup controls. If raw text and masks do not distinguish competing seeds, retain INCONCLUSIVE. SAMPLE_INDEX=0 marks the script's first calculation, not a guessed global bar_index origin.

Columns: ALL_MISSING_SOURCE, SOURCE_NA, ALL_MISSING_MAX, ALL_MISSING_MAX_NA, ALL_MISSING_MAX_NZ_SENTINEL, DELAYED_SOURCE_CONTROL, DELAYED_MAX_CONTROL, DELAYED_MAX_NA_CONTROL, FINITE_NEGATIVE_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native export headers verbatim.

Power limit: All-missing accumulator startup/output over 32 calculated bars only. Delayed and finite calls are controls, not new finite-hole/max-algorithm claims.

Return source-bound artifacts under v53/captures/v53/ and list the source/hash, attempt and observations in RESPONSE-v53.md.
