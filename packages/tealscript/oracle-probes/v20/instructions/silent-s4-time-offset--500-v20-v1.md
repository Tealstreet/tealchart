# silent-s4-time-offset--500-v20-v1.pine capture v1

Source SHA256 `ec20585aa9cc2bea1a6ae749d8ffeb348b31bf4182a750281e07baef9aafe05f`. Audit family S4. Native outcome UNSPECIFIED/UNOBSERVED.

On a continuous BTCUSDT1-minute chart with at least6000 execution bars, does time("1",bars_back=-500) return a timestamp, NA, or refusal? Preserve every raw chart timestamp and execution index;5000/-500 are independent boundary controls.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least6000 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

Positive5001 cannot be settled from a short warmup-only capture. Require plotted CHART_INDEX>=5002; no general-series history rule is assumed for this function.

Columns: CHART_INDEX, CHART_TIME_MS, REQUESTED_BARS_BACK, TIME_RESULT_MS, RESULT_NA, RESULT_MINUS_CHART_MS

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
