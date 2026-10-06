# V54 rci-leading-interior-holes capture instructions v1

Row: 165. Pine version 6. This source targets this row only.

Question: What does RCI(4) publish through leading and interior source holes?

Competing hypotheses, not expected outcomes: physical-window NA mask; last4 finite observations; retention/reset on holes.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 13 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Exact nonmonotonic eight-phase fixture, firsttwoNA and holesphase2/5. Raw source/masks and matched clean call preserve startup and recovery; no tie policy or all-length RCI formula proof.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_SOURCE, CLEAN_SOURCE, SOURCE_NA, RCI_4, RCI_4_NA, RCI_4_NZ_SENTINEL, CLEAN_RCI_4, CLEAN_RCI_4_NA, CLEAN_RCI_4_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
