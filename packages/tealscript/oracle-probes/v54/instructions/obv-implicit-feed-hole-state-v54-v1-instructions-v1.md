# V54 obv-implicit-feed-hole-state capture instructions v1

Row: 247. Pine version 6. This source targets this row only.

Question: What does OBV publish through actual feed holes and recovery, compared with the explicitly labelled increment observer?

Competing hypotheses, not expected outcomes: retain accumulated state; skip missing increment; mask/reset/poison after missing feed.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 19 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Use actual native input masks at a mature missing bar and subsequent finite recovery. A finite chart or unreached recovery is INCONCLUSIVE; do not inject custom OHLC or equate volume0 with volumeNA. Capture startup separately. No broad formula or version claim. The increment and cum columns are hypothesis observers, not replacements for the native builtin.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, HIGH_NA, LOW_NA, CLOSE_NA, OHLC_MISSING, VOLUME_MISSING, FINITE_RECOVERY, MODEL_RAW_INCREMENT, OBV, OBV_NA, OBV_NZ_SENTINEL, MODEL_CUM_INCREMENT, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
