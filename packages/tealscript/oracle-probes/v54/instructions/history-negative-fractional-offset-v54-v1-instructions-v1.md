# V54 history-negative-fractional-offset capture instructions v1

Row: 204. Pine version 6. This source targets this row only.

Question: Does an input-qualified negative fractional history offset refuse, floor to a negative index, or truncate toward zero?

Competing hypotheses, not expected outcomes: compile refusal; runtime negative-depth refusal; towardzero depth conversion; floor conversion.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 9 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Run all four input values in separate attempts, preserving earliest phase and distinct close controls. A failing negative attempt must not replace the positive attempt. This one v6 input-qualified source does not settle v5 or a separate const-literal qualifier rule; do not infer a value from refusal. The two negative values discriminate nearzero versus magnitude>1 when admitted.

Attempts:
- {"id": "negative-half", "inputs": {"History offset": -0.5}}
- {"id": "negative-one-half", "inputs": {"History offset": -1.5}}
- {"id": "positive-half-control", "inputs": {"History offset": 0.5}}
- {"id": "positive-one-half-control", "inputs": {"History offset": 1.5}}

Columns: INPUT_OFFSET, HISTORY_RESULT, HISTORY_RESULT_NA, HISTORY_RESULT_NZ_SENTINEL, CURRENT_CLOSE_CONTROL, PREVIOUS_CLOSE_CONTROL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
