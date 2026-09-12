> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v11

The formula harness now covers `37/74` committed Pine v6 `ta.*` names
(`50.0%`) across 41 cases. Added `ta.bb` checks all three tuple plots and
`ta.bbw` checks the derived width, both using the already adjudicated full
SMA/stdev window.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v14.json
```

Measured result: `41/41` compiled matches and `41/41` public-path matches.
The independent numerator excludes DEMA because its chained warm-up rule is
not specified by the available public v6 material; see coverage v10.
