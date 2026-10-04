# TradingView v13 capture handoff v1

FROZEN: 40 indicator/study sources. Canonical manifest: bundle-manifest-v13.json.

1. Run `sha256sum -c SHA256SUMS` before capture. Preserve source bytes and Pine versions.
2. Follow every source's `instructions/*.md` for context, history, inputs and exact observations. Read the supplemental spread instructions for the spread probe.
3. Remove the previous probe before each attempt. Paste each source separately; never combine scripts or repair a refusal.
4. Record COMPILE-ERROR, RUNTIME-ERROR or RUNS separately. Preserve exact diagnostic text, code, line/column or bar and screenshot. If it runs, collect all requested CSV columns, Logs and screenshots. Preserve blanks and duplicate headers.
5. Record symbol, timeframe, session, timezone, history start, capture time, inputs and live cutoff. UI probes require chart settings/zoom and screenshots; numeric CSV alone does not settle visual normalization.
6. Return raw evidence under `v13/captures/v13/`; write `v13/captures/v13/RESPONSE-v13.md` with source/hash, attempt, phase and evidence paths.

Expected observations are alternatives to distinguish; all native outcomes remain UNOBSERVED. A grouped refusal does not settle later operations. Outputs do not certify internal eigen iteration budgets or algorithm identity. Missing/recovery claims require actual qualified input holes; absent holes remain unexercised.

Target/public-clock and provider entries listed as reuseReferences are earlier queued work, not new pastes. Follow their supplemental context observations without duplicating sources. SHIP-FILES-v1.txt is the exact commit list; only explicitly listed supplemental contributor instructions are included; intake receipts and superseded manifests are excluded. Late arrivals belong in v14.
