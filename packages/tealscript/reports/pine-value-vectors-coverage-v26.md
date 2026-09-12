> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v26

The independent value-vector suite now contains `90` cases covering `53/74`
distinct committed Pine v6 `ta.*` names (`71.6%`). This revision adds hostile
256-bar `ta.dema` and `ta.tema` vectors. Their oracles independently compose
the documented EMA recurrence, applying the DEMA and TEMA linear combinations
after each successive EMA state.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 90 | 87 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 90 | 87 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

Both chained-smoother vectors pass on both paths over the full long series. No
new mismatch was exposed; the three existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-dema-tema-v1-20260905.json
```

Measured result: `87/90` compiled matches and `87/90` public-path matches.
