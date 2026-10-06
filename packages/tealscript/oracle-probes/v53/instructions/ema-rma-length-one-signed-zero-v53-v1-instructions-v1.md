# V53 ema-rma-length-one-signed-zero-v53-v1 capture instructions v1

Native-pending row: ema-rma-singleton-signed-zero-v1. This source targets only this row in Pine v6.

At length 1, do ta.ema and ta.rma preserve the initial and returning -3*0.0 source sign, or publish another zero/missing result?

Use standard candles, regular session and Etc/UTC chart display timezone. Default finite control context is BINANCE:BTCUSDT, 2-minute, with at least 32 historical bars. Native-input scripts require the actual eligible context specified below. Remove other probes. Verify sha256sum -c SHA256SUMS. Preserve the exact source/hash and input defaults except the separately listed attempts.

Native phase and values are UNSPECIFIED. Preserve RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with earliest diagnostic, member/site, line/column, reached bar and screenshot. A control/observer error is not automatically a builtin verdict. Do not repair source bytes to make it run.

On RUNS retain raw CSV (including empty/NA/zero cells), exact Pine Logs text, Data Window and settings screenshots, and chart symbol/tickerid/modifiers, timeframe, candle type, exchange/display timezones, session, inputs, account/build, data/index origin and closed/live cutoff. String lengths or equal numeric zero do not certify exact strings or signs.

Bound: calc_bars_count=32 includes any live bar. Adjudicate only reached closed calculations within that bound, aligned by SOURCE_INDEX/SOURCE_TIME; SAMPLE_INDEX is a local counter, not a claimed Pine index reset. At most 32 observed bars, fewer than 64 plot channels, no collection/UDT allocation. Preserve startup and actual eligible/recovery masks without inferring unobserved input conditions. No broad ta.* claim.

Required attempts: first leave Enable reciprocal observers=false and save the exact Pine Logs; then set only that input=true and save a separate attempt. The first calculated source is exactly -3*0.0; later phases include +0, finite +/-2 and one missing source. This is a length-1 signed-zero instrument, not a missing-data or general EMA/RMA formula certificate.

At SAMPLE_INDEX=0 and each phase0/3/7 compare exact source, EMA and RMA strings and reciprocal strings/signs, retaining the +0 phase controls. The TEXT_NEG_ZERO columns recognize the literal -0 only: they cannot stand in for raw strings with other formatting. Both -0 and +0 compare equal numerically. If native masks all signs, or if reciprocals error, retain that boundary and mark the bit question INCONCLUSIVE. The direct-value log is before reciprocal evaluation so its evidence is retained if the observer attempt errors.

Columns: PHASE, INPUT_SOURCE, EMA_LENGTH_1, RMA_LENGTH_1, SOURCE_NA, EMA_NA, RMA_NA, SOURCE_TEXT_NEG_ZERO, EMA_TEXT_NEG_ZERO, RMA_TEXT_NEG_ZERO, SOURCE_RECIPROCAL, EMA_RECIPROCAL, RMA_RECIPROCAL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native export headers verbatim.

Power limit: Exact length-1 eight-phase source only. Ordinary zero equality/CSV zero does not establish a sign. If string/reciprocal observers collapse signs, mark sign INCONCLUSIVE. Reciprocal refusal/error belongs to the observer attempt, not an inferred EMA/RMA defect.

Return source-bound artifacts under v53/captures/v53/ and list the source/hash, attempt and observations in RESPONSE-v53.md.
