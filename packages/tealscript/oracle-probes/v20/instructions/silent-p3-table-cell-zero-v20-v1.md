# silent-p3-table-cell-zero-v20-v1.pine capture v1

Source SHA256 `a437bb71f4d16bb2046e39f4f09e77c646c0e8beefe043452ae0388380b62cce`. Audit family P3. Native outcome UNSPECIFIED/UNOBSERVED.

Does table.new(columns=0,rows=1) itself refuse? Does subsequent cell(0,0) survive? Compare separate one-column control.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

A zero-column constructor followed by a cell bounds error differs from constructor refusal or fallback1. Capture both probes independently.

Columns: CHART_INDEX, CHART_TIME_MS, REQUESTED_COLUMNS, CALL_COMPLETED

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
