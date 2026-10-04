# visual-curves-point-copy-v6-v1 capture instructions v1

Source SHA256: `b11d4849cb197f806e1c5ed790482ae7d8de296f0e84f567981d883dacf8f7ca`. Ledger rows: 856, 1926. Native phase, values and pixels: UNSPECIFIED.

Run only this unchanged indicator/study on BINANCE:BTCUSDT, standard candles, 2-minute interval, UTC. Record TV build, source SHA, source version, chart size, device-pixel ratio, browser version, pane size, price-scale mode, loaded bar count, first/last timestamp and exact export cutoff. Load at least the stated history. Keep CSV missing cells blank and retain original screenshots. On any refusal save exact phase/text/highlighted line and original diagnostic PNG; do not change source, version or arguments to make it run. Repeat the same source once and record a distinct attempt identity. Save evidence with source stem plus attempt under v11/captures/v11; intake owner controls the shared bundle.

Required minimum history: 64bars.

Question: Observe asymmetric curved geometry and whether mutating a chart.point after creation moves an existing polyline; compare straight controls and uniform x-spacing.

Exact observation/discriminators:

For drawing-end indexN, original red/blue knots are(N-12,1),(N-10,4),(N-5,-2),(N,2). The later mutation changes only the second point price to12; the new green curve uses that point. Record whether the preexisting red curved and blue straight drawings still use4 at that knot or change to12. Orange/purple knots have uniform x-spacing(N-12,21),(N-8,24),(N-4,18),(N,22), giving a translated price-pattern control against the nonuniform x-spacing. CSV DRAWING_END_INDEX pinsN and POLYLINE_COUNT should be recorded independently; no native geometry result is asserted before capture.

Capture procedure:

Load64+bars and capture the full preceding16-bar drawing region on a linear price scale. Record price grid and exact plot-area x/y bounds, DPR, chart/pane size and zoom. Export BAR_INDEX,DRAWING_END_INDEX,POLYLINE_COUNT. Save an original pixel-resolution PNG and another at doubled horizontal zoom without changing source/data extent; hide individual curves using an isolated followup only if native Style cannot separate them, preserving this combined attempt. Measure native red/orange path coordinates at each knot and intermediate x=one-quarter/half/three-quarter of each interval; record overshoot extrema, tangent direction and any x-backtracking. The green changed-knot curve distinguishes copied point information from live aliasing. Keep blue/purple straight segments as coordinate calibration. Original native PNGs and coordinates are evidence; locally drawn approximations are not.

Closure limits:

A source-SHA-matched capture can settle this point-mutation observation and bounded knot/overshoot geometry. Finite pixel samples cannot prove a universal spline basis or exact curved interpolation kernel; rank856 remains partial/native-held for general algorithm identity. No screenshot-pixel equality claim is made now.

Prior exact probes for deduplication/followup:

- v7-outcomes/polyline-curved-asymmetric-v6-v1.pine SHA256 `2af88fd834b53086130f25e03ffe6eb3b8410b8e306477b368c379ccd4d188a9`; /home/sam/cs/docs/tealscript-parity-archive/oracle-probes/v7-outcomes/instructions/polyline-curved-asymmetric-v6-v1.md
