# V54 wvad-actual-missing-feed capture instructions v1

Row: 251. Pine version 6. This source targets this row only.

Question: How does WVAD publish at actual missing OHLC or volume on otherwise nonflat feed bars?

Competing hypotheses, not expected outcomes: NA propagation; zero/default publication; retained prior output.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 19 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Use actual native input masks at a mature missing bar and subsequent finite recovery. A finite chart or unreached recovery is INCONCLUSIVE; do not inject custom OHLC or equate volume0 with volumeNA. Capture startup separately. No broad formula or version claim. Adjudicate only missing-feed neighborhoods; the flat0/0 companion was already shipped in v53 and is not recaptured here. If a flat range coincides with a hole, that does not isolate this missing-feed facet.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, HIGH_NA, LOW_NA, CLOSE_NA, OHLC_MISSING, VOLUME_MISSING, FINITE_RECOVERY, INPUT_RANGE, NONFLAT_OHLC_ELIGIBLE, WVAD, WVAD_NA, WVAD_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
