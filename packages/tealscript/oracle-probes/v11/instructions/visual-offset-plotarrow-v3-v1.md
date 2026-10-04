# visual-offset-plotarrow-v3-v1 capture instructions v1

Source SHA256: `286f8259fdca58e86d5a24a659e012e46eef867c7ddd99e49667937d69354280`. Ledger rows: 1370. Native phase, values and pixels: UNSPECIFIED.

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

No matching prior manifest row found.
