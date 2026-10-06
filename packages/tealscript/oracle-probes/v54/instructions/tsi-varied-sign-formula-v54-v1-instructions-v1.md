# V54 tsi-varied-sign-formula capture instructions v1

Row: tsi-exact-varied-sign-values-v1. Pine version 6. This source targets this row only.

Question: What exact TSI(3,5) values and startup masks occur on source0=100 followed by64 changes [1,2,3,4,1,2,-30,-2,-3,-4,-1,-2,30], including reflection and named calls?

Competing hypotheses, not expected outcomes: unit-normalized double smoothing; percent-scaled normalization; alternative EMA ordering/seed publication.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=65, no more than 65 reached calculation cells and 21 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Adjudicate only SAMPLE_INDEX0..64, price0=100 and the exact64 subsequent changes; the bound65 includes any live bar, so preserve the last cell phase or wait for its confirmation. Manual model columns are candidate observations, not substitute native outputs. Existing v2 TSI(5,14) seed/hole credit is retained separately; the new canonical column is a crosswalk control, not a universal seed proof.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_SOURCE, INPUT_CHANGE, ELIGIBLE_SAMPLE, TSI_3_5, TSI_3_5_NA, TSI_3_5_NZ_SENTINEL, TSI_NAMED_3_5, TSI_NAMED_3_5_NA, TSI_NAMED_3_5_NZ_SENTINEL, TSI_REFLECTED_3_5, TSI_REFLECTED_3_5_NA, TSI_REFLECTED_3_5_NZ_SENTINEL, TSI_5_14_CONTROL, TSI_5_14_CONTROL_NA, TSI_5_14_CONTROL_NZ_SENTINEL, MODEL_LONG_THEN_SHORT, MODEL_SHORT_THEN_LONG, MODEL_PERCENT_SCALE, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
