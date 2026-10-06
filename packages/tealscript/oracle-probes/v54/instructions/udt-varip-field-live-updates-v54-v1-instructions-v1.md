# V54 udt-varip-field-live-updates capture instructions v1

Row: 308. Pine version 6. This source targets this row only.

Question: Does a marked UDT varip field retain changes across two or more updates of the same live bar while the ordinary field rolls back?

Competing hypotheses, not expected outcomes: marked field retains and ordinary field rolls back; both retain; both roll back.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, 32 loaded calculation cells plus at most three observed updates and the closing update of one live bar and 9 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. Only the explicitly bounded object allocation below is used; no broad collection, ta.* algorithm, arbitrary length, precision or version closure.

Allocate one persistent UDT with exactly two scalar fields. Observe two or three same-SOURCE_INDEX realtime updates plus the closing update, then reload for a separate historical attempt. Native live phase/time and UPDATE_COUNT must be recorded with per-update DataWindow screenshots or logless screen capture; historical CSV alone gives NO live credit. Missing samebar updates is INCONCLUSIVE. This is marked-field isolation only, not general varip/reference persistence.

Attempts:
- {"id": "default", "inputs": {}}

Columns: MARKED_FIELD, ORDINARY_FIELD, UPDATE_COUNT, IS_REALTIME, IS_NEW, IS_CONFIRMED, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
