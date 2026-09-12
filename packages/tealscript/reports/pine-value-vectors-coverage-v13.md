> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v13

The current independent value-vector suite contains `64` cases and covers
`35/74` distinct committed Pine v6 `ta.*` names (`47.3%`). It includes hostile
cases for middle-`na` holes, length one, overlong windows, flat values, signed
values, and long recursive smoothers. DEMA remains excluded from the
independent numerator because its chained-call warm-up rule is not specified
by the available public v6 material.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | ---: |
| Compiled | 64 | 64 | 0 |
| Public `executeScript` path | 64 | 64 | 0 |

The two paths agree on every expected vector. This is formula parity against
independent documented oracles, not TradingView trace parity; request,
session, ticker, drawing, and other path-dependent behavior remains outside
this numerator.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-current-20260905.json
```

Measured result: `64/64` compiled matches and `64/64` public-path matches.
