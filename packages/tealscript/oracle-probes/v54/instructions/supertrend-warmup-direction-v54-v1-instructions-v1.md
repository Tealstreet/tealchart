# V54 supertrend-warmup-direction capture instructions v1

Row: 211. Pine version 6. This source targets this row only.

Question: What is Supertrend(3,3) direction before ATR/band warmup on loaded samples0..5?

Competing hypotheses, not expected outcomes: direction1 before readiness; NA direction before readiness; another native startup publication.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 19 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Adjudicate only firstloaded local samples0..5 and their exported actual OHLC. Later output is context only. Capture raw line/direction separately and masks, no synthetic OHLC override or v5/general Supertrend direction formula claim.

Attempts:
- {"id": "default", "inputs": {}}

Columns: SUPERTREND_LINE, SUPERTREND_LINE_NA, SUPERTREND_LINE_NZ_SENTINEL, SUPERTREND_DIRECTION, SUPERTREND_DIRECTION_NA, SUPERTREND_DIRECTION_NZ_SENTINEL, ATR_3_CONTROL, ELIGIBLE_WARMUP, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, HIGH_NA, LOW_NA, CLOSE_NA, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
