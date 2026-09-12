> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v40

The independent value-vector suite contains `107` cases covering `66/74`
distinct committed Pine v6 `ta.*` names (`89.2%`). This revision adds flat
RSI, overlong RMA/ATR, and middle-`na` ATR edge vectors. The ATR oracle now
separates RMA state retention from the current output: a missing true range
returns `na` on that bar while the smoothed state remains available later.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 107 | 102 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 107 | 102 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

All four edge vectors pass on both paths. The five prior confirmed mismatches
remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-hostile-edge-v2-20260905.json
```

Measured result: `102/107` compiled matches and `102/107` public-path matches.
