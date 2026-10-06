# V54 vwap-source-actual-volume-hole-state capture instructions v1

Row: 240. Pine version 6. This source targets this row only.

Question: How does anchored VWAP retain or reset after an explicit source hole and actual missing volume?

Competing hypotheses, not expected outcomes: mask output and preserve accumulator; skip source/volume missing sample; reset/poison accumulator.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 16 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Anchor at local0/16; explicit sourceNA at10 follows finite state. Actual volumeNA must be observed separately with finite source, and recover without an intervening anchor to settle retention. A feed without that eligible volume event leaves the volume facet HELD; the source hole is not a volume substitute. V6function only; direct variable hold in v53 remains distinct.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_SOURCE, FINITE_SOURCE_CONTROL, INPUT_VOLUME, SOURCE_NA, ACTUAL_VOLUME_MISSING, EXPLICIT_ANCHOR, FINITE_RECOVERY, VWAP_SOURCE_HOLE, VWAP_SOURCE_HOLE_NA, VWAP_SOURCE_HOLE_NZ_SENTINEL, VWAP_SOURCE_CONTROL, VWAP_SOURCE_CONTROL_NA, VWAP_SOURCE_CONTROL_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
