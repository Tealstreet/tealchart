# TradingView v16 capture response v2

8/13 sources captured; 14 retained attempts. Selected native outcomes: {'COMPILE-ERROR': 1, 'COMPILES': 1, 'RUNS': 6}.

Frozen source master 1510231d44; canonical bundle-manifest-v5.json. Frozen submitted source identities were verified; any native editor line-ending normalization is retained per attempt. Otherwise exact source buffers were verified unchanged in actual TradingView through Chrome MCP. No source repairs, output additions, version conversions, engine execution or baseline changes.

Batch startUTC: 2026-10-04T20:17:48.050191+00:00; reportUTC: 2026-10-04T21:09:02.302739+00:00. Capture continues.

Default BINANCE:BTCUSDT,2-minute standard candles,Etc/UTC,Bar Replay off. Actual source inputs/default flags, provider/session/history, reset/export/live cutoff, native build assets, source SHA and diagnostic locations are retained per attempt. Native chart indices do not establish Pine indices. Blank raw cells, source NA and rendered glyphs are distinct observations. Numeric comparisons exclude the observed live-bar timestamp; boundary-crossing attempts remain retained and are retried.

External-request companions and unexposed merge/warmup/origin limitations are recorded separately. A successful TV export is a native observation, not an engine parity claim. Diagnostics may mask later source conditions. Compiler/runtime receipts retain every available native marker/log, exact code/text/location and first failing Pine bar if exposed; unexposed error-bar time is UNKNOWN.

[Context context-v2.md](context-v2.md).

[Context htf-context-v2.json](htf-context-v2.json).

[Context visual-question-reuse-v1.json](visual-question-reuse-v1.json).

[Context curve-comparison-v1.json](curve-comparison-v1.json).

| Source / selected attempt | Outcome | Raw evidence |
|---|---|---|
| inherited-v7-223-v15-v1.pine / 1 | COMPILE-ERROR | [raw](evidence/inherited-v7-223-v15-v1-attempt1-error.txt) None line 6: Invalid argument 'expr0' in 'operator +' call |
| inherited-v7-379-v15-v1.pine / 1 | COMPILES | [raw](evidence/inherited-v7-379-v15-v1-attempt1-compile.txt) None line None: Exact frozen whole source compiled; no numeric parity inference. |
| htf-context-6m-v16-v1.pine / 3 | RUNS | [raw](htf-context-6m-v16-v1-attempt3.csv) {"chart_time":"1788739200000","chart_end":"1788739320000","chart_index":"0","chart_open":"80341.83","chart_high":"80356","chart_low":"80230.29","chart_close":"80293.23","chart_volume":"37.66955","chart_tick":"0.01","chart_minmove":"1","chart_pricescale":"100","chart_regular":"1","chart_premarket":"0","chart_postmarket":"0","request_open":"80341.83","request_high":"80426","request_low":"80230.29","request_close_goff_lon":"80426","request_volume":"106.57861","request_time":"1788739200000","request_end":"1788739560000","request_index":"0","request_previous_close":"","request_hole_goff_lon":"80426","request_tick":"0.01","request_minmove":"1","request_pricescale":"100","request_close_gon_lon":"80426","request_hole_gon_lon":"80426","request_close_goff_loff":"","request_hole_goff_loff":"","chart_realtime":"0","chart_confirmed":"1"} |
| htf-context-10m-v16-v1.pine / 3 | RUNS | [raw](htf-context-10m-v16-v1-attempt3.csv) {"chart_time":"1788739200000","chart_end":"1788739320000","chart_index":"0","chart_open":"80341.83","chart_high":"80356","chart_low":"80230.29","chart_close":"80293.23","chart_volume":"37.66955","chart_tick":"0.01","chart_minmove":"1","chart_pricescale":"100","chart_regular":"1","chart_premarket":"0","chart_postmarket":"0","request_open":"80341.83","request_high":"80443.99","request_low":"80230.29","request_close_goff_lon":"80384","request_volume":"140.75408","request_time":"1788739200000","request_end":"1788739800000","request_index":"0","request_previous_close":"","request_hole_goff_lon":"80384","request_tick":"0.01","request_minmove":"1","request_pricescale":"100","request_close_gon_lon":"80384","request_hole_gon_lon":"80384","request_close_goff_loff":"","request_hole_goff_loff":"","chart_realtime":"0","chart_confirmed":"1"} |
| htf-context-30m-v16-v1.pine / 3 | RUNS | [raw](htf-context-30m-v16-v1-attempt3.csv) {"chart_time":"1788739200000","chart_end":"1788739320000","chart_index":"0","chart_open":"80341.83","chart_high":"80356","chart_low":"80230.29","chart_close":"80293.23","chart_volume":"37.66955","chart_tick":"0.01","chart_minmove":"1","chart_pricescale":"100","chart_regular":"1","chart_premarket":"0","chart_postmarket":"0","request_open":"80341.83","request_high":"80443.99","request_low":"80061.9","request_close_goff_lon":"80199.89","request_volume":"284.45061","request_time":"1788739200000","request_end":"1788741000000","request_index":"11952","request_previous_close":"80341.83","request_hole_goff_lon":"80199.89","request_tick":"0.01","request_minmove":"1","request_pricescale":"100","request_close_gon_lon":"80199.89","request_hole_gon_lon":"80199.89","request_close_goff_loff":"80341.83","request_hole_goff_loff":"80341.83","chart_realtime":"0","chart_confirmed":"1"} |
| visual21-856-polyline-kernel-trace-v6-v1.pine / 1 | RUNS | [raw](visual21-856-polyline-kernel-trace-v6-v1-attempt1.csv) {"N":"0","ANCHOR":"0"} |
| inherited-box-split-alias-v6-v1.pine / 1 | RUNS | [raw](inherited-box-split-alias-v6-v1-attempt1.csv) {"ANCHOR":"2","SPLIT":"4.666666666666666","LEFT":"2","RIGHT":"4","WIDTH":"4","BAR_INDEX":"0"} |
| inherited-preset-reassignment-length-v6-v1.pine / 1 | RUNS | [raw](inherited-preset-reassignment-length-v6-v1-attempt1.csv) {"ATR":"","RSI":"","EMA":"","ATR_LENGTH":"10","OSC_LENGTH":"9","SMOOTH_LENGTH":"2","BAR_INDEX":"0"} |

Pending: visual21-199-bgcolor-v3-offset-discriminator-v1.pine, visual21-513-barcolor-v3-offset-discriminator-v1.pine, visual21-736-plotchar-v3-offset-discriminator-v1.pine, visual21-1370-plotarrow-v3-offset-discriminator-v1.pine, visual21-705-chart-foreground-threshold-v6-v1.pine.

[All attempts](outcomes-v16.json), [source-pinned plan](capture-plan-v1.json), [evidence SHA256](capture-integrity-v2.json). Earlier responses remain retained.
