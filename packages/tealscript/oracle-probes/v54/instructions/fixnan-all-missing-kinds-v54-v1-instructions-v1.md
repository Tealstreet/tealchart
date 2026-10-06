# V54 fixnan-all-missing-kinds capture instructions v1

Row: 303. Pine version 6. This source targets this row only.

Question: What does fixnan publish on allmissing int/float/color from the first loaded sample?

Competing hypotheses, not expected outcomes: NA for every kind; kind-specific initial defaults; runtime or compile refusal.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 11 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

All32source samples are typed missing. No finite predecessor is introduced; colorRGB uses explicitNA sentinel-1. V6only; separate row205 finite-predecessor probe remains independent.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INT_ALL_MISSING, INT_ALL_MISSING_NA, INT_ALL_MISSING_NZ_SENTINEL, FLOAT_ALL_MISSING, FLOAT_ALL_MISSING_NA, FLOAT_ALL_MISSING_NZ_SENTINEL, COLOR_ALL_MISSING_NA, COLOR_ALL_MISSING_RGB, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
