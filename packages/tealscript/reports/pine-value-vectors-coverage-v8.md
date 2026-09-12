> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v8

The formula harness now covers `34/74` committed Pine v6 `ta.*` names
(`45.9%`) across 38 cases. Added calls are all-time `ta.max`/`ta.min`,
`ta.cci`, and `ta.wpr`, with their documented full-window or cumulative
semantics represented directly in the oracle.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v11.json
```

Measured result: `38/38` compiled matches and `38/38` public-path matches,
including every emitted plot and all existing persistence/UDF cases. The
remaining 40 TA names and context-dependent namespaces are not counted as
formula parity; trace-required categories remain listed separately.
