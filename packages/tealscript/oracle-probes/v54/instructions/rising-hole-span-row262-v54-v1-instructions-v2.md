# V54 rising-hole-span-row262 capture instructions v2

Row: 262. Pine version 6. This source targets this row only.

Question: What does rising(source,3) return on4,NA,3,NA,2,5,1?

Competing hypotheses, not expected outcomes: compare current against physical lookback; compare current against prior finite samples; require consecutive adjacent directional changes.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 12 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Repeated16-phase fixture starts4,NA,3,NA,2,5,1 then appends finite9,8,7,6,5,4,5,6,7 to expose both directions. The matched finite control fills the two holes with3.5/2.5. Retain all32 cells and physical history0..3. Missing policy models may differ on hole/recovery cells; dense ramps prevent a constant-output instrument. Only this member/length; no blanket ignore-NA or other-method credit.

Attempts:
- {"id": "default", "inputs": {}}

Columns: PHASE, INPUT_SOURCE, SOURCE_NA, PHYSICAL_PREVIOUS_1, PHYSICAL_PREVIOUS_2, PHYSICAL_PREVIOUS_3, BUILTIN_RESULT, CLEAN_SOURCE_CONTROL, CLEAN_RESULT_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
