# silent-s6-tiny-eigenvalues-v20-v1.pine capture v1

Source SHA256 `49fbaefd1f52e677dc14c3a697b9f89fc94c0b2efc6dbc872c3a15a9d510013a`. Audit family S6. Native outcome UNSPECIFIED/UNOBSERVED.

What values/ordering/NA does native return for diag(1e-12,2e-12)? Raw and1e12-scaled outputs distinguish tiny values from zero; precision16 preserves readable results.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.



Columns: CHART_INDEX, CHART_TIME_MS, EIGEN_0, EIGEN_0_SCALED_1E12, EIGEN_0_NA, EIGEN_1, EIGEN_1_SCALED_1E12, EIGEN_1_NA

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
