> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v6

The vector harness now covers `28/74` committed Pine v6 `ta.*` names
(`37.8%`) across 32 cases. New independent cases cover `ta.crossunder`,
`ta.cross`, `ta.roc`, `ta.tr(true)`, and session-anchored cumulative
`ta.vwap(close)`, alongside the existing warm-up, event, pivot, persistence,
and UDF call-site checks.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v9.json
```

Measured result: `32/32` compiled matches and `32/32` public-path matches.
Every emitted plot is compared with `1e-9` absolute tolerance. The denominator
is formula/call-form coverage; context-dependent behavior remains separately
listed as requiring authoritative traces.
