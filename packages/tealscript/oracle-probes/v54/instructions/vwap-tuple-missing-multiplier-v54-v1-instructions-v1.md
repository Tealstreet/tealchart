# V54 vwap-tuple-missing-multiplier capture instructions v1

Row: 241. Pine version 6. This source targets this row only.

Question: Does a missing VWAP band multiplier affect basis, either band, or subsequent state?

Competing hypotheses, not expected outcomes: basis retained but bands masked; wholetuple missing; persistent state changed versus finite multiplier control.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 20 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Use actual finite source/positivevolume for the multiplier-only facet. Anchor0/16 and multiplierNA at8 isolate one missing multiplier between finite1.5 samples. Capture basis and both bands individually plus exact masks and recovery. Only v6tuple overload; no general missing-argument rule.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_SOURCE, INPUT_VOLUME, EXPLICIT_ANCHOR, INPUT_MULTIPLIER, MULTIPLIER_NA, VWAP_BASIS, VWAP_BASIS_NA, VWAP_BASIS_NZ_SENTINEL, VWAP_UPPER, VWAP_UPPER_NA, VWAP_UPPER_NZ_SENTINEL, VWAP_LOWER, VWAP_LOWER_NA, VWAP_LOWER_NZ_SENTINEL, FINITE_MULT_BASIS_CONTROL, FINITE_MULT_UPPER_CONTROL, FINITE_MULT_LOWER_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
