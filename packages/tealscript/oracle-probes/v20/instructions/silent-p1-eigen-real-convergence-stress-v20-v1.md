# silent-p1-eigen-real-convergence-stress-v20-v1.pine capture v1

Source SHA256 `9c3a70364b2e1bf2af850ebfbcfaf20dd38fb3dd492026af59cd8fe1a8d7ad23`. Audit family P1. Native outcome UNSPECIFIED/UNOBSERVED.

Capture symmetric tridiagonal real-spectrum stress at inputs(n,scale)=(16,1),(32,1),(32,1e-12),(32,1e12). Record refusal, missing count, all eigenvalues from Pine Logs and displayed aggregates.

Run unchanged source independently on BTCUSDT, continuous1-minute standard candles, timezoneUTC. Remove previous indicators. Use at least32 execution bars; record plotted CHART_INDEX first/last and strict confirmed cutoff. Capture compile/runtime phase, exact first diagnostic(code,text,line,column,bar) and full error screenshot. If it runs, export all numeric columns at full precision, preserve blanks and capture Data Window plus full pane/table rendering. Record source/settings/input screenshots, chart symbol/exchange/session/timezone/mintick and capture time. No hand-edited source or replacement numeric values.

No actual real-spectrum nonconvergence counterexample exists in the audit; this is finite-spectrum stress coverage, not a claim that any sample reaches native/internal iteration limits. Successful runs cannot certify arbitrary convergence.

Columns: CHART_INDEX, CHART_TIME_MS, MATRIX_DIMENSION, MATRIX_SCALE, EIGEN_COUNT, EIGEN_NA_COUNT, EIGEN_SUM, FIRST_EIGEN, LAST_EIGEN

Return raw CSV/logs/screenshots and attempt metadata under v20/captures/v20/; link every file from RESPONSE-v20.md with SHA256 and source identity. Native may refuse even when local preflight compiles; no local result is TV evidence.
