# V54 tsi-leading-interior-holes capture instructions v1

Row: 168. Pine version 6. This source targets this row only.

Question: How do TSI difference adjacency and double-smoothing startup/recovery behave around source holes?

Competing hypotheses, not expected outcomes: difference against previous physical bar; difference against previous finite source; retain versus reset EMA stages.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 14 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Nonmonotonic source with firsttwoNA and interiorholesphase3/5; direct native output and masks only. The clean call is a control. Separate from the finite TSI(3,5) formula row; no complete TSI formula or arbitrary seed closure.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_SOURCE, PHYSICAL_PREVIOUS, SOURCE_NA, CLEAN_SOURCE, TSI_2_3, TSI_2_3_NA, TSI_2_3_NZ_SENTINEL, CLEAN_TSI_2_3, CLEAN_TSI_2_3_NA, CLEAN_TSI_2_3_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
