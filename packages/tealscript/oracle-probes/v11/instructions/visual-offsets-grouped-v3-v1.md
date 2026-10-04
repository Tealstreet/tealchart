# visual-offsets-grouped-v3-v1 capture instructions v1

Source SHA256: `29e9db124e5f6e3ed2d5bd0c6db059ceff6dd38bf29f38fba2940a7d115659b5`. Ledger rows: 15, 199, 222, 266, 513, 736, 1370. Native phase, values and pixels: UNSPECIFIED.

Run only this unchanged indicator/study on BINANCE:BTCUSDT, standard candles, 2-minute interval, UTC. Record TV build, source SHA, source version, chart size, device-pixel ratio, browser version, pane size, price-scale mode, loaded bar count, first/last timestamp and exact export cutoff. Load at least the stated history. Keep CSV missing cells blank and retain original screenshots. On any refusal save exact phase/text/highlighted line and original diagnostic PNG; do not change source, version or arguments to make it run. Repeat the same source once and record a distinct attempt identity. Save evidence with source stem plus attempt under v11/captures/v11; intake owner controls the shared bundle.

Required minimum history: 128bars.

Question: Determine compile admission and historical rendered placement for changing series offsets in the declared Pine version; distinguish per-source-bar placement from terminal-offset placement.

Exact observation/discriminators:

SOURCE_INDEX_SCALED *1000 identifies the unshifted source index; SOURCE_SHIFT cycles -2,-2,1,1,1,3,3 with index mod7. Events occur at indices divisible by8. In a per-bar-offset model the first eight event targets lie at indices -2,6,17,25,33,43,51,54 for source indices0,8,16,24,32,40,48,56. In a terminal-offset model every historical event moves by the SOURCE_SHIFT at the recorded last-executed bar. Record actual target bar indices for each active member independently. Do not pick either model before TV observation.

Capture procedure:

Export all numeric columns from bar_index0, preserving6decimal precision for the scaled index. Capture at least64 consecutive closed bars and the most recent48-bar viewport. The last-executed index and shift must be recorded for every screenshot; distinguish historical cutoff from a live update. Identify blue shifted targets versus red zero-offset controls by Style titles. Plot, circle, X and arrow rows are separate members. Background shading affects the indicator pane; barcolor affects main-chart candles, so capture both panes. If plots overlap, use Style visibility toggles without editing source; save visibility settings and restore them for CSV export. Plot/shape/char lines use separate y-lanes100/200/300; determine x-placement from crosshair/bar timestamps, not glyph width. Also capture an older viewport without changing source/data extent to distinguish viewport-dependent placement. CSV values alone are not rendered-position evidence.

If the grouped source refuses, attribute that attempt only to the highlighted call. Do not treat all sibling rows as refused. Reuse the listed existing isolated v7 probes for plot/shape/char/barcolor; use the supplied isolated arrow/background source for those members. A grouped success can observe all listed rows in one capture.

Closure limits:

Capture can settle this exact version/member/source pattern and dataset extent. It cannot settle glyph metrics, other versions, arbitrary offsets or exact arrow magnitude normalization.

Prior exact probes for deduplication/followup:

- v7-outcomes/plot-series-offset-v3-v1.pine SHA256 `cc24a27e48273fdcc11279b02e91e5af6ed4c9efabf8fbdd8084f2ef4712c2fa`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-series-offset-v3-v1.md
- v7-outcomes/plot-zero-offset-v3-control-v1.pine SHA256 `a9481b730bba331a67f3f9c6e226e2d753e324edcf0a37c5ea804d59fa03c95b`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-zero-offset-v3-control-v1.md
- v7-outcomes/plot-01-series-offset-v3.pine SHA256 `d46334e18abac484583a7f2948031665504e66aec4d09977859f02845e955178`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-01-series-offset-v3.md
- v7-outcomes/plot-02-series-offset-v4.pine SHA256 `b185797f2f3d4fa725752c8ebfd76e8429c619de35f1095c77e1fe422aa94788`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-02-series-offset-v4.md
- v7-outcomes/plotshape-series-offset-v3-v1.pine SHA256 `f6180e62434216f53b36718d62f26ba2fe58bbc29e71bf96a317492bbf002fba`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotshape-series-offset-v3-v1.md
- v7-outcomes/plotshape-zero-offset-v3-control-v1.pine SHA256 `da24064ca03c75555342d5ce8e7217bc12e1c75da45aaeb6a41e4028ba30bcde`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotshape-zero-offset-v3-control-v1.md
- v7-outcomes/barcolor-series-offset-v3-v1.pine SHA256 `a225028c7da441ad54e696c6f569492f8d512000c8e7451e40b75c3f2d0e7102`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/barcolor-series-offset-v3-v1.md
- v7-outcomes/barcolor-zero-offset-v3-control-v1.pine SHA256 `02f51ae6f5007c4eaf28b513bfb22faf8639b9188f152e712500f7963f97e612`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/barcolor-zero-offset-v3-control-v1.md
- v7-outcomes/plotchar-series-offset-v3-v1.pine SHA256 `84736e570fdde78458f0dcef64e279637412c2d4fb36ae4846b70719a170b3d4`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotchar-series-offset-v3-v1.md
- v7-outcomes/plotchar-zero-offset-v3-control-v1.pine SHA256 `a17814c3bbb34f6f6bff472e80a5f2dda577e60c33efe045ed0ea9cffab88522`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotchar-zero-offset-v3-control-v1.md
