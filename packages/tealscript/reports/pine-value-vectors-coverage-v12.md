> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v12

The formula harness now covers `40/74` committed Pine v6 `ta.*` names
(`54.1%`) across 44 cases. Added full-window `ta.median`, population
`ta.covariance`, and normalized `ta.correlation` vectors over distinct close
and volume series.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v15.json
```

Measured result: `44/44` compiled matches and `44/44` public-path matches.
All emitted plots, including tuple outputs, are compared with `1e-9` absolute
tolerance. DEMA remains excluded until its chained warm-up rule is
authoritatively established.
