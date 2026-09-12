> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v58

This run adds a plateau fixture with repeated equal highs and lows. It covers
length-one extrema, range zero, highest/lowest-bar tie-breaking, and pivot
confirmation on equal neighboring values.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 157 | 150 | the seven v57 mismatches |
| Public `executeScript` path | 157 | 150 | the seven v57 mismatches |

All seven new plateau cases pass on both paths. The oracle correction in this
phase is that `ta.lowestbars` selects the most recent equal minimum, using the
same `lastIndexOf` tie rule as `ta.highestbars`; the previous `indexOf` oracle
was wrong.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-plateau-v2-20260905.json
```

Measured result: `150/157` compiled matches and `150/157` public-path matches.
The command exits nonzero because the seven v57 mismatches remain.
