# V54 mfi-actual-volume-holes capture instructions v1

Row: 236. Pine version 6. This source targets this row only.

Question: What does MFI(3) publish through actual missing volume, distinguished from an explicit source hole?

Competing hypotheses, not expected outcomes: missing-volume output mask with retained flow; skip missing-volume sample; reset flow state after missing-volume bar.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 14 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Actual native volumeNA, ideally after finite mature state with finite recovery, is mandatory. Missing source at local8 is an explicitly labelled control and cannot stand in for missing volume; volume0 is notNA. A finite or allNAvolume feed without required mature/recovery neighborhoods leaves those facets INCONCLUSIVE. V6only.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_SOURCE, SOURCE_HOLE_CONTROL, INPUT_VOLUME, ACTUAL_VOLUME_MISSING, RECOVERY_AFTER_VOLUME_MISSING, MFI_3, MFI_3_NA, MFI_3_NZ_SENTINEL, MFI_SOURCE_HOLE_CONTROL_3, MFI_SOURCE_HOLE_CONTROL_3_NA, MFI_SOURCE_HOLE_CONTROL_3_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
