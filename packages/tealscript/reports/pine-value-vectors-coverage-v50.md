> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v50

The independent value-vector suite contains `120` cases: `114` `ta.*` cases
covering `71/74` distinct committed names (`95.9%`), plus six hostile
`math.*` vectors. The math cases exercise absolute value, extrema, sign,
square root, and fractional power over signed inputs.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 120 | 115 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 120 | 115 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

All six math vectors pass on both paths. The five ta/runtime mismatches are
unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-math-v1-20260905.json
```

Measured result: `115/120` compiled matches and `115/120` public-path matches;
math-only result `6/6` on both paths.
