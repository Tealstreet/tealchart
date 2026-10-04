# TradingView v12 capture handoff v6

FROZEN: 30 indicator-only sources. Canonical manifest: bundle-manifest-v6.json.

1. Run `sha256sum -c SHA256SUMS` before capture. Preserve source bytes and Pine versions.
2. Follow each script's `instructions/*.md`; use its chart context, minimum history and default inputs.
3. Remove the previous probe before adding the next. Paste each source separately; never combine scripts.
4. Record exact compile or runtime diagnostic text, line and screenshot when refused. If it runs, collect the requested CSV, logs or screenshots. Preserve duplicate CSV headers and blanks.
5. Record symbol, timeframe, history start, capture time, inputs and live cutoff with each attempt. Keep raw exports unchanged.
6. Return evidence under `v12/captures/v12/`; write `v12/captures/v12/RESPONSE-v12.md` listing each source, attempt, outcome and evidence path.

Native outcomes remain UNOBSERVED. Disputed rename spellings and versions are separate questions; do not infer one outcome from another. Matrix outputs bound numerical behavior and do not establish internal algorithm identity. Declaration acceptance does not establish realtime varip persistence. A grouped refusal does not settle unrelated controls.

SHIP-FILES-v1.txt is the exact commit file list. Contributors, intake receipts and superseded manifests are excluded. Late candidates belong in v13.
