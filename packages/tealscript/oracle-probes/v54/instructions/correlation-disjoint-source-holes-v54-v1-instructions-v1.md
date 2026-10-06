# V54 correlation-disjoint-source-holes capture instructions v1

Row: 167. Pine version 6. This source targets this row only.

Question: Does correlation filter each source independently or select complete pairs when holes are disjoint?

Competing hypotheses, not expected outcomes: independently retained finite source samples; pairwise qualifying observations; physical-window masking.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 15 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

The two non-affine sources have different holes and at least4 complete-pair phases per cycle. The complete-pair call is a labelled rival-control input, not assumed expected truth. Only length3 finite/missing startup and recovery.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_LEFT, INPUT_RIGHT, LEFT_NA, RIGHT_NA, COMPLETE_PAIR, CORRELATION_3, CORRELATION_3_NA, CORRELATION_3_NZ_SENTINEL, COMPLETE_PAIR_CONTROL_3, COMPLETE_PAIR_CONTROL_3_NA, COMPLETE_PAIR_CONTROL_3_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
