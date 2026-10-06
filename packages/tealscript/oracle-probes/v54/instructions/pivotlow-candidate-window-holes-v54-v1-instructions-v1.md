# V54 pivotlow-candidate-window-holes capture instructions v1

Row: 246. Pine version 6. This source targets this row only.

Question: Does a candidate, left-neighbor or right-neighbor hole disqualify or alter a finite pivot window?

Competing hypotheses, not expected outcomes: disqualify any hole in physical candidate window; skip hole comparisons; expand to finite neighbors; tie side asymmetry.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 16 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Eachcase is a separate attempt. Localphase2 is the intended extreme; case1 removes candidate,2 leftneighbor,3 rightneighbor,4 tiesleft with candidate. Matched nohole1/1 and2/1 written calls preserve finite detection. Repeated8-phase fixture captures maturecycles and startup; no v5 or arbitrary scanning algorithm claim.

Attempts:
- {"id": "nohole-control", "inputs": {"Hole case": 0}}
- {"id": "candidate-hole", "inputs": {"Hole case": 1}}
- {"id": "left-hole", "inputs": {"Hole case": 2}}
- {"id": "right-hole", "inputs": {"Hole case": 3}}
- {"id": "left-tie-control", "inputs": {"Hole case": 4}}

Columns: PHASE, CASE, INPUT_SOURCE, CLEAN_SOURCE, SOURCE_HOLE, PIVOT_1_1, PIVOT_1_1_NA, PIVOT_1_1_NZ_SENTINEL, PIVOT_2_1, PIVOT_2_1_NA, PIVOT_2_1_NZ_SENTINEL, CLEAN_PIVOT_1_1, CLEAN_PIVOT_2_1, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
