# silent-s2-table-frame-width-151-v20-v2.pine capture v2

Source SHA256 `dd2f17766f69ba315d3fe891c13f7ebe2dd80375494393f9a8aa176e74134514`. Audit family S2. Native outcome UNSPECIFIED/UNOBSERVED.

Does table.new accept frame_width=151? Export completion and capture first diagnostic or full table screenshot, including red internal border and blue outer frame. Compare top-left WIDTH1 and bottom-left WIDTH100 reference tables with target top-right, using identical viewport/device scaling.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

REQUESTED_WIDTH is the unmodified argument, not an effective-width getter. CREATED/CALL_COMPLETED exposes survival only; capture the full rendering to distinguish accepted width from normalization. A refusal phase/text is an equally valid native outcome.

Columns: CHART_INDEX, CHART_TIME_MS, REQUESTED_WIDTH, CALL_COMPLETED

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
