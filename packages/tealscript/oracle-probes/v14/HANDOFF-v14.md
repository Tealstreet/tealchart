# TradingView v14 capture handoff v1

FROZEN: 13 indicator-only sources. Canonical manifest: bundle-manifest-v5.json.

1. Run `sha256sum -c SHA256SUMS` before capture. Preserve source bytes and Pine versions.
2. Follow each source’s `instructions/*.md` for chart context, inputs, history and exact observations. The quotient probe needs index 0 through 95; collection probes need at least 32 historical bars from index 0.
3. Remove the previous probe before each attempt. Paste separately; never combine scripts or repair a refusal.
4. Record COMPILE-ERROR, RUNTIME-ERROR or RUNS separately, with exact diagnostic text, code, line/column or bar and screenshot. For RUNS, export all mapped columns; preserve blanks and duplicate headers.
5. Record symbol, timeframe, timezone, session, inputs, history start, capture time and live cutoff. Preserve source/settings/context screenshots and full CSV precision.
6. Return raw evidence under `v14/captures/v14/`; write `v14/captures/v14/RESPONSE-v14.md` with source/hash, attempt, phase and evidence paths.

All native outcomes remain UNOBSERVED. Expected observations distinguish alternatives; local preflight establishes instrument readiness only. Nearby decimal outputs do not prove binary identity or universal tolerances. Terminal-error scripts cannot expose post-error collection atomicity. The three v13 reuseReferences are already queued work: do not paste them again.

SHIP-FILES-v1.txt is the exact commit list. Contributor receipts and superseded manifests are excluded. Late arrivals belong in v15.
