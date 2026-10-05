# TradingView v27 capture handoff v1

12 independent indicators. Run each unchanged and separately. Native phases and values are UNSPECIFIED; local compile preflight is instrument evidence only. The single v25-schema manifest is `bundle-manifest-v1.json`.

| Source | Owner | Columns | Ledger ranks |
| --- | --- | --- | --- |
| cross-change-long-gap-v5-v27-v1.pine | codex-i5qr9c | 24 | 392, 400, 459, 655 |
| cross-change-long-gap-v6-v27-v1.pine | codex-i5qr9c | 24 | 391, 399, 459, 655 |
| string-missing-const-rank240-v27-v1.pine | codex-1xjtos | 6 | 240 |
| string-missing-input-rank241-v27-v1.pine | codex-1xjtos | 6 | 241 |
| string-missing-simple-rank242-v27-v1.pine | codex-1xjtos | 6 | 242 |
| string-missing-series-rank243-v27-v1.pine | codex-1xjtos | 7 | 243 |
| string-cast-qualifier-controls-ranks240-243-v27-v1.pine | codex-1xjtos | 7 | 240, 241, 242, 243 |
| V27-DynamicRemainderEquality-v1.pine | codex-p4250m | 18 | 1630, 1631, 1644 |
| V27-OmittedElseStrings-v1.pine | codex-p4250m | 21 | 238, 244 |
| V27-SparseLocalHistory-v1.pine | codex-p4250m | 25 | 1792 |
| macd-hma-dev-gap-fixture-ranks640-1168-v26-v2.pine | codex-g6qooy | 24 | 640, 641, 720, 1168 |
| cmo-nearest-cog-gap-fixture-ranks1212-1481-v26-v2.pine | codex-g6qooy | 20 | 1212, 1214, 1318, 1481 |

Follow each source's instructions for chart/feed/session, historical cutoff, market state and paired observations. Preserve original source and CSV bytes, source and capture hashes, diagnostic code/text/line/bar, screenshots, account/build and context. Do not repair a source to obtain a preferred outcome. MODEL columns are competing constructions, not native expectations. Zero provider-update or missing-feed-hole coverage leaves those facets inconclusive. Realtime questions require actual live observations.

Verify `sha256sum -c SHA256SUMS`. `SHIP-FILES-v1.txt` contains only this handoff, one manifest, sources, instructions and checksums. Reports and compile outputs stay outside the repository. Return every attempt under `captures/v27/` with a versioned RESPONSE document. No native parity or clause closure is credited by shipment.
