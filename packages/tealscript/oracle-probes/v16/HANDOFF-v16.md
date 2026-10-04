# TradingView v16 capture handoff v1

FROZEN: 13 indicator/study sources. Canonical manifest: bundle-manifest-v4.json.

1. Run `sha256sum -c SHA256SUMS`. Preserve exact source bytes, versions and indentation.
2. Follow each source's instructions. Remove the previous indicator before each attempt; paste separately. Do not repair refusals.
3. Record COMPILE-ERROR, RUNTIME-ERROR or RUNS with exact code/text/line/column/bar and screenshots. Unrelated first errors do not settle the intended boundary.
4. Export all numeric fields at full precision with blank cells and duplicate headers preserved. Record Pine origin, inputs, chart/requested symbol/session/timeframe/timezone, history, live cutoff and capture time.
5. HTF6/10/30 probes require contemporaneous paired native-TF raw feeds and separate developing, closed and reloaded attempts. Later history cannot reconstruct an original developing tick. Never substitute expected request closes.
6. Visual probes require renderer geometry and paired input controls. Curve856 requires native pre-raster path/control evidence; vertices, CSV and screenshot alone leave kernel identity held. Record unavailable evidence explicitly.
7. Return raw evidence under `v16/captures/v16/` and write `v16/captures/v16/RESPONSE-v16.md` with source hash, attempt, phase and evidence paths.

Native outcomes remain UNOBSERVED/UNSPECIFIED. Hypothesized outputs in contributor decisions are discriminators, not native predictions. Local preflights are instrument evidence only. Quota and fractional-price probes remain in shipped v15; do not duplicate them here. Late arrivals go to v17.
