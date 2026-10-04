# TradingView v22 requested timestamp handoff v1

One unchanged v6 indicator tests zone-less numeric timestamp() inside request.security on a non-UTC requested symbol. Canonical manifest: bundle-manifest-v2.json. Run on BINANCE:BTCUSDT 2m requesting NASDAQ:MSFT; read instructions/request-timestamp-exchange-zone-v22-v1.md before capture. Ten plotted columns compare fixed and series-component implicit timestamps with explicit requested-zone controls, plus UTC/date-string/chart-zone controls and requested-zone attestation.

Source SHA256: 437eb7152ea43abb724a0a721d1fa2e63cc0fa7ce118883f2659a25ba194a482. The exact source already passed local parse, semantic and code-generation checks with no diagnostics; the external receipt is oracle-probes/v22-outcomes/REQUESTED-TIMESTAMP-LOCAL-PREFLIGHT-v1.json. This is compile readiness, not TradingView authority. Native outcomes remain UNSPECIFIED/UNOBSERVED; the associated semantic atom has documented-authority credit only.

Verify `sha256sum -c SHA256SUMS`. SHIP-FILES-v1.txt lists the seven shipping assets; local engine exports, logs and author runners stay outside the bundle. Leave all assets uncommitted for Overseer to commit and push. Returned captures go under v22/captures/v22/ with RESPONSE-v22.md, raw CSV/settings/screenshots and source/output hashes. Preserve every diagnostic, missing row and context uncertainty.
