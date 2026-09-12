> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v14

The hostile value-vector suite now contains `71` cases and covers `35/74`
distinct committed Pine v6 `ta.*` names (`47.3%`). This revision adds
middle-`na` vectors for `ta.barssince`, `ta.valuewhen`, `ta.crossover`,
`ta.crossunder`, `ta.cross`, `ta.pivothigh`, and `ta.pivotlow`, extending
path-dependent state coverage without changing the independent formula
oracle policy.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | ---: |
| Compiled | 71 | 71 | 0 |
| Public `executeScript` path | 71 | 71 | 0 |

The two paths agree on every expected vector, including all hostile cases.
This is formula parity against independent documented oracles, not TradingView
trace parity; request, session, ticker, drawing, and other path-dependent
behavior remains outside this numerator.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-hostile-v3-20260905.json
```

Measured result: `71/71` compiled matches and `71/71` public-path matches.
