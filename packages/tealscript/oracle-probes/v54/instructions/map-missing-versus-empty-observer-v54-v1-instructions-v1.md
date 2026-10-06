# V54 map-missing-versus-empty-observer capture instructions v1

Row: 304. Pine version 6. This source targets this row only.

Question: Does na distinguish a typed missing map from an allocated empty map?

Competing hypotheses, not expected outcomes: missing-only na true; empty and missing both na true; compile/runtime refusal.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 6 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. Only the explicitly bounded object allocation below is used; no broad collection, ta.* algorithm, arbitrary length, precision or version closure.

Allocate exactly one empty map per calculation (32 maps total, zero entries), plus one typed missing declaration. Only na descriptor/value observations and empty size0; no mutation, identity, storage or collection NA policy claim.

Attempts:
- {"id": "default", "inputs": {}}

Columns: MISSING_MAP_NA, EMPTY_MAP_NA, EMPTY_MAP_SIZE, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
