# V54 stoch-independent-bound-holes capture instructions v1

Row: 237. Pine version 6. This source targets this row only.

Question: Do independent high-source and low-source holes behave like a source hole when Stoch has a finite asymmetric numerator?

Competing hypotheses, not expected outcomes: independent finite bound filtering; physical-window NA propagation; retained publication on bound hole.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 16 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Stoch has explicit source/high/low arguments, so synthetic argument holes are legal target stimuli; this does not replace any implicitOHLC builtin. Cases0/1/2/3 are separate native attempts with local8 nohole/highhole/lowhole/closehole. Numerator and remaining bounds stay finite and asymmetric. No flat range or arbitrary-length claim.

Attempts:
- {"id": "finite-control", "inputs": {"Hole kind": 0}}
- {"id": "high-hole", "inputs": {"Hole kind": 1}}
- {"id": "low-hole", "inputs": {"Hole kind": 2}}
- {"id": "source-hole-control", "inputs": {"Hole kind": 3}}

Columns: CASE, INPUT_HIGH_SOURCE, INPUT_LOW_SOURCE, INPUT_CLOSE_SOURCE, HIGH_SOURCE_NA, LOW_SOURCE_NA, CLOSE_SOURCE_NA, STOCH_3, STOCH_3_NA, STOCH_3_NZ_SENTINEL, FINITE_STOCH_3_CONTROL, FINITE_STOCH_3_CONTROL_NA, FINITE_STOCH_3_CONTROL_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
