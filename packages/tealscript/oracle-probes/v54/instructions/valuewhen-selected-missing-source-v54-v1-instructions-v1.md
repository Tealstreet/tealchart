# V54 valuewhen-selected-missing-source capture instructions v1

Row: 208. Pine version 6. This source targets this row only.

Question: Does the missing-source first event remain selectable after two finite events?

Competing hypotheses, not expected outcomes: count missing event and select NA; skip missing event; carry or fallback result.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 15 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Float only; first event at0 missing, events2/4 finite. Occurrence2 after4 isolates retained missing-event counting from absent-event startup. No nullable-bool or color policy credit.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_EVENT, INPUT_SOURCE, SOURCE_NA, OCCURRENCE_0, OCCURRENCE_0_NA, OCCURRENCE_0_NZ_SENTINEL, OCCURRENCE_1, OCCURRENCE_1_NA, OCCURRENCE_1_NZ_SENTINEL, OCCURRENCE_2, OCCURRENCE_2_NA, OCCURRENCE_2_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
