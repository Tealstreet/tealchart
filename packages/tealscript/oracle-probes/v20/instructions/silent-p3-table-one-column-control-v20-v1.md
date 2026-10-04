# silent-p3-table-one-column-control-v20-v1.pine capture v1

Source SHA256 `0634ac18ee0e973284f0df28a0d60d72d64a244e931a69c97f08a47433a599f1`. Audit family P3. Native outcome UNSPECIFIED/UNOBSERVED.

Does table.new(columns=1,rows=1) itself refuse? Does subsequent cell(0,0) survive? Compare separate one-column control.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

A zero-column constructor followed by a cell bounds error differs from constructor refusal or fallback1. Capture both probes independently.

Columns: CHART_INDEX, CHART_TIME_MS, REQUESTED_COLUMNS, CALL_COMPLETED

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
