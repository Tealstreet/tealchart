# V54 macd-tuple-stage-startup capture instructions v1

Row: 232. Pine version 6. This source targets this row only.

Question: What exact MACD(2,3,2) line/signal/histogram masks and values occur from firstloaded ramp and impulse samples?

Competing hypotheses, not expected outcomes: EMA firstsample initialization; length-delayed initialization; signal-stage readiness differs from line.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 23 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Allthree native tuple columns must be retained separately from sample0 on ramp100+sample and impulse7 at8. No synthetic formula replaces native MACD. V6only, no general seed/holes/otherlength claim.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_RAMP, INPUT_IMPULSE, RAMP_LINE, RAMP_LINE_NA, RAMP_LINE_NZ_SENTINEL, RAMP_SIGNAL, RAMP_SIGNAL_NA, RAMP_SIGNAL_NZ_SENTINEL, RAMP_HIST, RAMP_HIST_NA, RAMP_HIST_NZ_SENTINEL, IMPULSE_LINE, IMPULSE_LINE_NA, IMPULSE_LINE_NZ_SENTINEL, IMPULSE_SIGNAL, IMPULSE_SIGNAL_NA, IMPULSE_SIGNAL_NZ_SENTINEL, IMPULSE_HIST, IMPULSE_HIST_NA, IMPULSE_HIST_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
