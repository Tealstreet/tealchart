# Live once rollback capture instructions v1

Row 168. Native expectations are UNSPECIFIED; a historical CSV alone cannot settle this request. Use a liquid, open-market symbol on 1-minute bars. Record exact source SHA, symbol/exchange, timeframe and timezone, all settings, attachment time and capture times. Attach early enough to observe at least two updates of the same open bar and its closing update, then at least one update of the next bar. Do not recompile, change inputs, refresh, switch symbol/timeframe, or detach while collecting this sequence.

Capture Pine Logs verbatim with timestamps and all ONCE, CLOSE_ONCE and TICK records. At each of two open-bar updates, the closing update and the next-bar update, take a Data Window screenshot showing all nine named columns and the matching bar index. Record the exact chart OHLCV/time frame of each update. Then export CSV and retain its SHA. If export reloads historical execution, distinguish it from the live sequence; do not use the recalculated CSV as the live evidence. A video covering the continuous sequence can supplement the screenshots/logs.

The ordinary var and varip counters distinguish rollback of effects from rollback of the once activation latch. Tick_Control identifies multiple actual executions. The confirmed-only once block distinguishes closing deactivation from unconditional rearming on the next bar. Historical bars deliberately do not activate these blocks. Outcomes to distinguish: repeated intrabar activation versus first-tick-only activation; closing deactivation versus per-bar rearm; var rollback versus varip persistence. No guessed tick count is used as an expected native value.

If the market provides fewer than two open updates, or the closing/next-bar update is absent, retain INSUFFICIENT-LIVE-EVIDENCE and do not mark row 168 closed. Any native compile/refusal/runtime diagnostic must be saved exactly. Local synthetic lifecycle evidence remains separate. No native result or local preflight is credited by this staged request.

## Round v56 capture contract v1

Use `language-once-live-rollback-v56-v1.pine` unchanged; verify its SHA256SUMS entry. Context: BINANCE:BTCUSDT, standard candles, 1 minute, Etc/UTC; at least 32 closed bars before the live sequence. Record source SHA, exact symbol/exchange, chart and exchange timezone, settings, capture time and endpoints. The calc_bars_count=32 bound limits the historical pass; native bar_index is not assumed to start at zero. SOURCE_TIME/SOURCE_INDEX bind each row; SAMPLE_INDEX is an execution-pass counter, not a Pine index promise.

Columns (12): Once_RollbackVar, Once_RetainedVarip, CloseOnce_RetainedVarip, Tick_Control, FirstLiveBar_Control, Bar_Index_Control, Confirmed_Control, Realtime_Control, Close_Control, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME.

Save the full raw CSV with indicator plots and OHLCV, source, settings screenshot and closed-bar Data Window (or the required continuous live sequence). Preserve empty cells separately from numeric zero and do not repair a refused source. Earliest compile/runtime phase, exact diagnostic text/location and screenshot are outcomes, not hidden-value answers. For true/false channels 1/0 is an observer encoding only; preserve OTHER results. Historical CSV alone is insufficient for this live facet; missing open/close/next-bar updates leave it HELD.

Return source-bound evidence at `v56/captures/v56/RESPONSE-v56.md`; native phase/values remain UNSPECIFIED until returned evidence is adjudicated. Local parse/compile is instrument preflight only.
