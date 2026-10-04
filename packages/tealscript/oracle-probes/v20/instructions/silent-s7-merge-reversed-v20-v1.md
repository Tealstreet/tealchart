# silent-s7-merge-reversed-v20-v1.pine capture v1

Source SHA256 `775194789cde5d51f6ea093394a3f0f5b9f05440803c72b69d681d062fec234d`. Audit family S7. Native outcome UNSPECIFIED/UNOBSERVED.

Native table.merge_cells corners(1, 1, 0, 0): does it refuse or complete? If complete, capture which original cell text/color survives and merged geometry in full screenshot.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

MERGE_COMPLETED measures survival, not range coordinates. Pine exposes no merged-range getter; screenshot of A/B/C/D identity is mandatory for normalization/source-cell attribution.

Columns: CHART_INDEX, CHART_TIME_MS, MERGE_COMPLETED

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
