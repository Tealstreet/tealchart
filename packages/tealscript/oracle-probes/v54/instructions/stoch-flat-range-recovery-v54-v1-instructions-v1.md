# V54 stoch-flat-range-recovery capture instructions v1

Row: 223. Pine version 6. This source targets this row only.

Question: Does Stoch(1) return NA or retain a prior finite value on a zero range between finite25/75 cells?

Competing hypotheses, not expected outcomes: mask each flat denominator; retain last output through flat range; zero/default or runtime error.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 11 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Synthetic explicit source/high/low are legal builtin arguments (not replaced implicitOHLC). Exactcycle initialflat, finite25, flatagain, finite75. Do not infer v5, arbitrary length, or general division behavior.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_LOW_SOURCE, INPUT_HIGH_SOURCE, INPUT_CLOSE_SOURCE, INPUT_RANGE, STOCH_1, STOCH_1_NA, STOCH_1_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
