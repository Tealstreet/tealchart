# V54 kc-true-range-hole-startup capture instructions v1

Row: 227. Pine version 6. This source targets this row only.

Question: How do omitted/true/false true-range selectors differ at firstloaded calculation and after actual missing previous close?

Competing hypotheses, not expected outcomes: true/default handle prior-close NA using high-low; true/default propagate previous-close missing; different EMA seed/reset publication.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 30 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Actual native high/low/close holes are mandatory. Finite BTC is a control only. Select and record a real standard-candle dataset/window with OHLC_MISSING=1 at startup and after mature state, plus finite neighbors; export the individual input masks. Do not assume a symbol has holes, inject a synthetic OHLC source, use custom candles, or count missing volume as missing OHLC. If no eligible event is reached the hole facet is INCONCLUSIVE; an unreached recovery stays HELD. This v6 capture gives no v5 result. Preserve startup independently even if no mature hole is found; startup alone does not settle mature-hole recovery. False-selector controls retain existing certificate credit separately.

Attempts:
- {"id": "default", "inputs": {}}

Columns: OHLC_MISSING, PREVIOUS_CLOSE_NA, TR_VARIABLE, TR_TRUE_CONTROL, DEFAULT_BASIS, DEFAULT_BASIS_NA, DEFAULT_BASIS_NZ_SENTINEL, DEFAULT_UPPER, DEFAULT_LOWER, TRUE_BASIS, TRUE_BASIS_NA, TRUE_BASIS_NZ_SENTINEL, TRUE_UPPER, TRUE_LOWER, FALSE_BASIS, FALSE_BASIS_NA, FALSE_BASIS_NZ_SENTINEL, FALSE_UPPER, FALSE_LOWER, INPUT_OPEN, INPUT_HIGH, INPUT_LOW, INPUT_CLOSE, INPUT_VOLUME, HIGH_NA, LOW_NA, CLOSE_NA, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
