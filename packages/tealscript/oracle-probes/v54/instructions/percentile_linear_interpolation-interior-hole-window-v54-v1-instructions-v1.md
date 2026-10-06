# V54 percentile_linear_interpolation-interior-hole-window capture instructions v1

Row: 264. Pine version 6. This source targets this row only.

Question: What exact percentile_linear_interpolation length3 values/masks occur across leading and interior holes on asymmetric input?

Competing hypotheses, not expected outcomes: physical threebar window missing propagation; expand to last three finite samples; skip missing entries inside physical window.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 11 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

V6 length3 only; percentile60 for percentile members. Source is missing at loaded0/1 and phase2, so recovery neighborhoods repeat; export every source/value/mask. The clean call is a control only. V5 and arbitrary windows remain unobserved.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_SOURCE, CLEAN_SOURCE, SOURCE_NA, BUILTIN_RESULT, BUILTIN_RESULT_NA, BUILTIN_RESULT_NZ_SENTINEL, CLEAN_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
