# V53 iii-wvad-flat-zero-range-v53-v1 capture instructions v1

Native-pending row: iii-wvad-flat-bar-zero-over-zero-v1. This source targets only this row in Pine v6.

On actual flat OHLC bars with finite positive volume, what do direct ta.iii/ta.wvad publish, and do they recover on the following finite nonzero-range bar?

Use standard candles, regular session and Etc/UTC chart display timezone. Default finite control context is BINANCE:BTCUSDT, 2-minute, with at least 32 historical bars. Native-input scripts require the actual eligible context specified below. Remove other probes. Verify sha256sum -c SHA256SUMS. Preserve the exact source/hash and input defaults except the separately listed attempts.

Native phase and values are UNSPECIFIED. Preserve RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with earliest diagnostic, member/site, line/column, reached bar and screenshot. A control/observer error is not automatically a builtin verdict. Do not repair source bytes to make it run.

On RUNS retain raw CSV (including empty/NA/zero cells), exact Pine Logs text, Data Window and settings screenshots, and chart symbol/tickerid/modifiers, timeframe, candle type, exchange/display timezones, session, inputs, account/build, data/index origin and closed/live cutoff. String lengths or equal numeric zero do not certify exact strings or signs.

Bound: calc_bars_count=32 includes any live bar. Adjudicate only reached closed calculations within that bound, aligned by SOURCE_INDEX/SOURCE_TIME; SAMPLE_INDEX is a local counter, not a claimed Pine index reset. At most 32 observed bars, fewer than 64 plot channels, no collection/UDT allocation. Preserve startup and actual eligible/recovery masks without inferring unobserved input conditions. No broad ta.* claim.

Mandatory direct-builtins attempt keeps Enable formula-only controls=false. Use a standard-candle native dataset whose reached window includes ELIGIBLE_FLAT_POSITIVE_VOLUME=1 (high=low=open=close, defined positive volume) and preferably the next finite nonzero-range bar. The default liquid BTC/2m context is a control only if it has no eligible bars; choose and record a real sparse symbol/timeframe or earlier chart window if needed. Do not substitute a synthetic OHLC formula, external source input, zero volume or custom candles for native builtin inputs.

If no eligible flat bar is observed, mark the flat-bar question INCONCLUSIVE. If no RECOVERY_AFTER_ELIGIBLE_FLAT=1 bar occurs, retain only the flat outcome and hold recovery. Inspect direct output, NA masks, sentinel cells and exact log text. An optional separate formulas attempt may enable formula-only controls on the same window; a formula-division refusal/error is not a builtin verdict. This source is explicitly v6; the v5 facet from the handoff remains unobserved rather than inheriting the v6 answer.

Columns: III_BUILTIN, WVAD_BUILTIN, III_NA, WVAD_NA, III_NZ_SENTINEL, WVAD_NZ_SENTINEL, INPUT_RANGE, ELIGIBLE_FLAT_POSITIVE_VOLUME, RECOVERY_AFTER_ELIGIBLE_FLAT, VOLUME_NA, PRICE_NA, FORMULA_ONLY_III, FORMULA_ONLY_WVAD, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native export headers verbatim.

Power limit: Only actual eligible flat bars and reached recovery neighbors in the 32-bar v6 window. Formula-only observers do not replace builtin evidence. No v5 verdict or broader zero-division policy follows.

Return source-bound artifacts under v53/captures/v53/ and list the source/hash, attempt and observations in RESPONSE-v53.md.
