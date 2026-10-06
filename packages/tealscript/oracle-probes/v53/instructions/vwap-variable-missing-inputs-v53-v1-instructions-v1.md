# V53 vwap-variable-missing-inputs-v53-v1 capture instructions v1

Native-pending row: lane-b:120. This source targets only this row in Pine v6.

For the direct ta.vwap variable, what happens on actual missing hlc3/volume bars, and on the first eligible finite bar after a missing-input bar?

Use standard candles, regular session and Etc/UTC chart display timezone. Default finite control context is BINANCE:BTCUSDT, 2-minute, with at least 32 historical bars. Native-input scripts require the actual eligible context specified below. Remove other probes. Verify sha256sum -c SHA256SUMS. Preserve the exact source/hash and input defaults except the separately listed attempts.

Native phase and values are UNSPECIFIED. Preserve RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with earliest diagnostic, member/site, line/column, reached bar and screenshot. A control/observer error is not automatically a builtin verdict. Do not repair source bytes to make it run.

On RUNS retain raw CSV (including empty/NA/zero cells), exact Pine Logs text, Data Window and settings screenshots, and chart symbol/tickerid/modifiers, timeframe, candle type, exchange/display timezones, session, inputs, account/build, data/index origin and closed/live cutoff. String lengths or equal numeric zero do not certify exact strings or signs.

Bound: calc_bars_count=32 includes any live bar. Adjudicate only reached closed calculations within that bound, aligned by SOURCE_INDEX/SOURCE_TIME; SAMPLE_INDEX is a local counter, not a claimed Pine index reset. At most 32 observed bars, fewer than 64 plot channels, no collection/UDT allocation. Preserve startup and actual eligible/recovery masks without inferring unobserved input conditions. No broad ta.* claim.

Capture a finite-input control window first. Then capture a standard-candle window with actual missing volume or hlc3, retaining identical source bytes and full symbol/session/exchange/timeframe context. A no-volume chart such as SP:SPX is only a candidate: require captured VOLUME_NA/ELIGIBLE_MISSING_INPUT flags or the actual native no-volume diagnostic, never assume its data policy. Separate account/datafeed attempts explicitly.

If no actual missing input or related diagnostic is present, this is INCONCLUSIVE for the missing policy. All-missing-volume evidence does not establish a leading/interior-hole recovery policy: FINITE_AFTER_MISSING must actually occur for that narrower recovery facet. Keep TRADING_DAY and prior output so daily/session changes are not silently treated as missing-data recovery. No scripted mask is applied to ta.vwap: its own implicit hlc3/volume inputs remain the native chart values.

Columns: INPUT_HLC3, SOURCE_NA, VOLUME_NA, ELIGIBLE_MISSING_INPUT, FINITE_AFTER_MISSING, VWAP_VARIABLE, VWAP_NA, VWAP_NZ_SENTINEL, PREVIOUS_VWAP, TRADING_DAY, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native export headers verbatim.

Power limit: Only direct variable output on observed real chart input masks and neighbors. No ta.vwap function-overload, session reset, general accumulator or synthetic-input missing-policy closure.

Return source-bound artifacts under v53/captures/v53/ and list the source/hash, attempt and observations in RESPONSE-v53.md.
