> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v7

The formula harness now covers `30/74` committed Pine v6 `ta.*` names
(`40.5%`) across 34 cases. The newest cases are `ta.rising(close, 1)` and
`ta.falling(close, 1)`, with explicit first-bar behavior and previous-bar
comparisons.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v10.json
```

Measured result: `34/34` compiled matches and `34/34` public-path matches.
The harness compares every emitted plot, including multi-output UDF and
persistent-state cases. This remains deterministic formula coverage; provider,
realtime, drawing, strategy, import-registry, and other path-dependent areas
remain in the separately tracked trace-required list.
