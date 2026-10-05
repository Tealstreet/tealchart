# TradingView v28 capture handoff v1

12 independent indicators. Run each unchanged and separately. Native phases and values are UNSPECIFIED; local compile preflight is instrument evidence only. The single v25-schema manifest is `bundle-manifest-v1.json`.

| Source | Owner | Columns | Ledger ranks |
| --- | --- | --- | --- |
| ta-state-pairing-worklist-v27-v1.pine | codex-cnf04e | 14 | 442, 444, 925, 926, 1477, 1547, 1548 |
| ta-pivot-stoch-worklist-v27-v1.pine | codex-cnf04e | 7 | 452, 456, 588 |
| legacy-plot-series-offset-v3-v27-v3.pine | codex-tkxtd0 | 7 | 15, 222 |
| legacy-bgcolor-series-offset-v3-v27-v3.pine | codex-tkxtd0 | 7 | 199, 222 |
| legacy-plotshape-series-offset-v3-v27-v3.pine | codex-tkxtd0 | 7 | 266, 222 |
| legacy-plot-series-offset-v4-v27-v3.pine | codex-tkxtd0 | 7 | 16, 222 |
| legacy-bgcolor-series-offset-v4-v27-v3.pine | codex-tkxtd0 | 7 | 200, 222 |
| legacy-plotshape-series-offset-v4-v27-v3.pine | codex-tkxtd0 | 7 | 267, 222 |
| array-sort-na-tie-identity-bbi-v1.pine | codex-bbi6nl | 36 | 782, 783 |
| array-percentile_nearest_rank-negative-after20-bbi-v1.pine | codex-bbi6nl | 5 | 786 |
| array-percentile_linear_interpolation-negative-after20-bbi-v1.pine | codex-bbi6nl | 5 | 1249 |
| array-covariance-left-long-after20-bbi-v1.pine | codex-bbi6nl | 5 | 1227 |

Follow each source's instructions for chart/feed/session, historical cutoff, market state and paired observations. Preserve original source and CSV bytes, source and capture hashes, diagnostic code/text/line/bar, screenshots, account/build and context. Do not repair a source to obtain a preferred outcome. MODEL columns are competing constructions, not native expectations. Zero provider-update or missing-feed-hole coverage leaves those facets inconclusive. Realtime questions require actual live observations.

Verify `sha256sum -c SHA256SUMS`. `SHIP-FILES-v1.txt` contains only this handoff, one manifest, sources, instructions and checksums. Reports and compile outputs stay outside the repository. Return every attempt under `captures/v28/` with a versioned RESPONSE document. No native parity or clause closure is credited by shipment.
