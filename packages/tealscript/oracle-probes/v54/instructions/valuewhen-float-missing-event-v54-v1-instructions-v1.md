# V54 valuewhen-float-missing-event capture instructions v1

Row: 151. Pine version 6. This source targets this row only.

Question: Does a true event with missing float source count toward occurrences0/1/2, and what is published before enough events?

Competing hypotheses, not expected outcomes: missing-source event counts and publishes missing; missing-source event skipped; insufficient occurrence fallback.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 12 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Only the selected float overload/event sequence (true,false,true,false,true), first-event missing source and startup0/1/2 occurrences. Do not generalize to other types. Finite source is3*sample+1. Raw cells and masks distinguish a counted missing event from skipping that event.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_EVENT, INPUT_SOURCE_ENCODED, INPUT_SOURCE_NA, OCCURRENCE_0_ENCODED, OCCURRENCE_0_NA, OCCURRENCE_1_ENCODED, OCCURRENCE_1_NA, OCCURRENCE_2_ENCODED, OCCURRENCE_2_NA, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
