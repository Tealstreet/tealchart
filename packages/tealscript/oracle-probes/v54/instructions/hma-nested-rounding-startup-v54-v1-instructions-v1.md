# V54 hma-nested-rounding-startup capture instructions v1

Row: 231. Pine version 6. This source targets this row only.

Question: What HMA(9/10) startup masks and values occur on ramp and impulse, and which explicit nested-WMA rounding candidates differ?

Competing hypotheses, not expected outcomes: half-length floor or ceiling for9; square-root floor or ceiling for10; nested startup/mask conventions.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 25 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Only v6 lengths9/10,32cells, risingramp and impulse at12. Floor/ceil models are separately labelled candidates using public WMA; no formula truth or general rounding policy is assumed. V5 remains unobserved.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_RAMP, INPUT_IMPULSE, RAMP_HMA_9, RAMP_HMA_9_NA, RAMP_HMA_9_NZ_SENTINEL, RAMP_MODEL_9_HALF_FLOOR, RAMP_MODEL_9_HALF_CEIL, RAMP_HMA_10, RAMP_HMA_10_NA, RAMP_HMA_10_NZ_SENTINEL, RAMP_MODEL_10_SQRT_FLOOR, RAMP_MODEL_10_SQRT_CEIL, IMPULSE_HMA_9, IMPULSE_HMA_9_NA, IMPULSE_HMA_9_NZ_SENTINEL, IMPULSE_MODEL_9_HALF_FLOOR, IMPULSE_MODEL_9_HALF_CEIL, IMPULSE_HMA_10, IMPULSE_HMA_10_NA, IMPULSE_HMA_10_NZ_SENTINEL, IMPULSE_MODEL_10_SQRT_FLOOR, IMPULSE_MODEL_10_SQRT_CEIL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
