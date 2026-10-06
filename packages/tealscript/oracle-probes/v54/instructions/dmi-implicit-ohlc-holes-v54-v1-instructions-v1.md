# V54 dmi-implicit-ohlc-holes capture instructions v1

Row: 166. Pine version 6. This source targets this row only.

Question: What do DI+/DI-/ADX publish at actual implicit OHLC holes and after recovery?

Competing hypotheses, not expected outcomes: missing mask with retained smoothing; missing resets both smoothing stages; holes skipped with delayed readiness.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 22 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Actual native high/low/close holes are mandatory. Finite BTC is a control only. Select and record a real standard-candle dataset/window with OHLC_MISSING=1 at startup and after mature state, plus finite neighbors; export the individual input masks. Do not assume a symbol has holes, inject a synthetic OHLC source, use custom candles, or count missing volume as missing OHLC. If no eligible event is reached the hole facet is INCONCLUSIVE; an unreached recovery stays HELD. This v6 capture gives no v5 result.

Attempts:
- {"id": "default", "inputs": {}}

Columns: OHLC_MISSING, RECOVERY_AFTER_MISSING, PLUS_DI_3, PLUS_DI_3_NA, PLUS_DI_3_NZ_SENTINEL, MINUS_DI_3, MINUS_DI_3_NA, MINUS_DI_3_NZ_SENTINEL, ADX_3, ADX_3_NA, ADX_3_NZ_SENTINEL, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, HIGH_NA, LOW_NA, CLOSE_NA, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
