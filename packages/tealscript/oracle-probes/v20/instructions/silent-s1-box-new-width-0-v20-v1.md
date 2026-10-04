# silent-s1-box-new-width-0-v20-v1.pine capture v1

Source SHA256 `5d150aa329b1d93fc4803670748c0feea0a984ccf5baec4b46cf2f93df356e48`. Audit family S1. Native outcome UNSPECIFIED/UNOBSERVED.

Does box.new accept width 0, refuse (capture exact phase/text/location/bar), or render it differently? Red target at y4/box3..5; blue width1; green width100. Numeric CALL_COMPLETED=1 and OBJECT_COUNT=3 indicate all calls survived.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

REQUESTED_WIDTH is the unmodified argument, not an effective-width getter. CREATED/CALL_COMPLETED exposes survival only; capture the full rendering to distinguish accepted width from normalization. A refusal phase/text is an equally valid native outcome.

Columns: CHART_INDEX, CHART_TIME_MS, REQUESTED_WIDTH, CALL_COMPLETED, OBJECT_COUNT, PANE_TOP, PANE_BOTTOM

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
