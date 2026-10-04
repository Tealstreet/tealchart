# TradingView capture reply v29

202/215 v7 sources captured; {'RUNS': 148, 'RUNTIME-ERROR': 20, 'COMPILE-ERROR': 33, 'COMPILE-ACCEPTED': 1}.

[Response v29](captures/v7/RESPONSE-v29.md), [all attempts](captures/v7/outcomes-v7.json), [evidence SHA256](captures/v7/capture-integrity-v29.json).

Table-dimension supplement v1: all six independent frozen sources run. Replay captures preserve their invalid coded phase and adjacent zero controls, native table/cell geometry, pane dimensions, viewport/DPR, host UTC and screenshots. Negative width/height (-1) produced zero width/height respectively; zero controls measured 167 by 47 in native renderer coordinates. Missing width/height retained 167 by 47. Overflow sources use math.exp(1000.0), not a finite percentage just above 100: their host-aligned source row is absent, CSV DIMENSION blank, native cell dimension null, and observed rectangle 167 by 47. This is an observation of these stimuli, not an internal normalization/arithmetic certificate. The height-overflow attempt1 crossed a live boundary; attempt2 is selected. [Context summary](captures/v7/table-dimension-context-summary-v1.json).

Capture-instrument note: the missing-width replay readiness check initially waited for a plot row at the current host timestamp. TradingView omits that all-blank row. The actual native status remained running; the null table property and subsequent zero control were captured without changing the Pine source. This instrument timeout is not a compiler/runtime refusal.
