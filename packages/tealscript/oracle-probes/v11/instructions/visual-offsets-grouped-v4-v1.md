# visual-offsets-grouped-v4-v1 capture instructions v1

Source SHA256: `4a29122ac5fe4cd964e1c1e66afbe179d364bf11bb0a3cd338658bf61ce16a5f`. Ledger rows: 16, 200, 222, 267, 514, 737, 1371. Native phase, values and pixels: UNSPECIFIED.

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

- v7-outcomes/plot-series-offset-v4-v1.pine SHA256 `520f0f9bc2c6b774c93a73739c4203d625e4990f79b36041582fd022760d2c9e`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-series-offset-v4-v1.md
- v7-outcomes/plot-zero-offset-v4-control-v1.pine SHA256 `2b9995dce8d396315067cad685cc0fccd50ed7100201077548c9155e41798155`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-zero-offset-v4-control-v1.md
- v7-outcomes/plot-01-series-offset-v3.pine SHA256 `d46334e18abac484583a7f2948031665504e66aec4d09977859f02845e955178`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-01-series-offset-v3.md
- v7-outcomes/plot-02-series-offset-v4.pine SHA256 `b185797f2f3d4fa725752c8ebfd76e8429c619de35f1095c77e1fe422aa94788`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plot-02-series-offset-v4.md
- v7-outcomes/plotshape-series-offset-v4-v1.pine SHA256 `d0a7e79ae3eae00046548eef7333d11b42ef344edc6e1541a8e1868e570460b7`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotshape-series-offset-v4-v1.md
- v7-outcomes/plotshape-zero-offset-v4-control-v1.pine SHA256 `a92371d81e83e4b74213fd06ddc788f4c4f0863fea3c7076048ab9894fb2786c`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotshape-zero-offset-v4-control-v1.md
- v7-outcomes/barcolor-series-offset-v4-v1.pine SHA256 `dc4998d5385385ee59ba407839108a70253a89071fa14147fadd27544b9d7068`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/barcolor-series-offset-v4-v1.md
- v7-outcomes/barcolor-zero-offset-v4-control-v1.pine SHA256 `28958f0f35f4382c2177314e1515e696b8cab4f53f0a9ac808dd34759e855426`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/barcolor-zero-offset-v4-control-v1.md
- v7-outcomes/plotchar-series-offset-v4-v1.pine SHA256 `7e866415f36a532ec9ea3681ed7deeb20bcc61835ce8717efde8c5da643fe63b`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotchar-series-offset-v4-v1.md
- v7-outcomes/plotchar-zero-offset-v4-control-v1.pine SHA256 `774c974c9110bcffb269450f16c97d7bce373b0257318499f4419e821bed59e8`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/plotchar-zero-offset-v4-control-v1.md
