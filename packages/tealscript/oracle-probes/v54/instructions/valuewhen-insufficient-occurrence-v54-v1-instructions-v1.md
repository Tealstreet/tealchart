# V54 valuewhen-insufficient-occurrence capture instructions v1

Row: 207. Pine version 6. This source targets this row only.

Question: What is returned for occurrences0/1/2 before events3/7 and when occurrence2 never exists?

Competing hypotheses, not expected outcomes: NA for nonexistent event; default or oldest-event fallback.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 14 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Float source is fully finite, with exactly two events at local3/7. This isolates absent occurrence from selected-source NA; no other overload credit.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_EVENT, INPUT_SOURCE, OCCURRENCE_0, OCCURRENCE_0_NA, OCCURRENCE_0_NZ_SENTINEL, OCCURRENCE_1, OCCURRENCE_1_NA, OCCURRENCE_1_NZ_SENTINEL, OCCURRENCE_2, OCCURRENCE_2_NA, OCCURRENCE_2_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
