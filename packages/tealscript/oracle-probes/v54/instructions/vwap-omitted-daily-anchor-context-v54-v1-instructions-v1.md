# V54 vwap-omitted-daily-anchor-context capture instructions v1

Row: 239. Pine version 6. This source targets this row only.

Question: Does omitted VWAP anchor match explicit timeframe.change(1D) across a recorded session/day boundary?

Competing hypotheses, not expected outcomes: omitted default follows daily period; omitted default follows a distinct session reset; context-specific initialization differs.

Use standard candles and Etc/UTC chart display timezone, default finite-control BINANCE:BTCUSDT at 2 minutes. Verify sha256sum -c SHA256SUMS; load the unchanged source, remove other probes, and use the listed attempts separately. No source repair on native refusal.

Native phase/values are UNSPECIFIED. Retain RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE separately, with the first diagnostic, exact line/column/site, reached sample and screenshot. Preserve raw CSV empty/NA/zero cells, Data Window, settings, exact source/hash, inputs, symbol/tickerid/modifiers, timeframe/session, account/build, feed/index origin and closed/live cutoff. CSV missing cells are evidence, not numeric zero.

Bound: calc_bars_count=32, no more than 32 reached calculation cells and 13 plot channels. SAMPLE_INDEX is the local calculation counter, not a reset native bar_index; align SOURCE_INDEX/SOURCE_TIME and closed/live phase. Capture the loaded startup prefix; do not substitute a mature tail after unrecorded calculation history. No collection/UDT allocation, broad ta.* algorithm, arbitrary length, precision, version or realtime closure.

Require actual exported EXPLICIT_DAY_ANCHOR=1 within the32-cell loaded window, with finite defined source/volume on both sides; select and record symbol/session/timezone/chart period to reach it (e.g.a larger standard timeframe), rather than assume BTC2m suffices. Capture identical context for both written calls. No boundary means INCONCLUSIVE; no universal session/calendar rule.

Attempts:
- {"id": "default", "inputs": {}}

Columns: INPUT_SOURCE, INPUT_VOLUME, EXPLICIT_DAY_ANCHOR, TRADING_DAY, OMITTED_ANCHOR_VWAP, OMITTED_ANCHOR_VWAP_NA, OMITTED_ANCHOR_VWAP_NZ_SENTINEL, EXPLICIT_DAILY_VWAP, EXPLICIT_DAILY_VWAP_NA, EXPLICIT_DAILY_VWAP_NZ_SENTINEL, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME. Preserve native headers verbatim.

Return source-bound artifacts at v54/captures/v54/RESPONSE-v54.md.
