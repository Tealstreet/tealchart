> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v3

The vector harness now covers `25/74` committed Pine v6 `ta.*` names
(`33.8%`) plus two runtime persistence cases. The 25 cases include the
risk-ranked warm-up/state set and run over 12 deterministic OHLCV bars with
`1e-9` absolute tolerance.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v6.json
```

Measured result: `25/25` compiled matches and `25/25` public-path matches.
This includes `var` and `varip` accumulators across all bars, in addition to
`ta.barssince`, `ta.valuewhen`, `ta.crossover`, both pivot functions, both
extrema-offset functions, `ta.range`, and `ta.mom`.

The fraction is formula/call-form coverage, not complete overload coverage.
Context-dependent and insufficiently specified behavior remains in the
ground-truth-required list in [coverage v1](./pine-value-vectors-coverage-v1.md).
