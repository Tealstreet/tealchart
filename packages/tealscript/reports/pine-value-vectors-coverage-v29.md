> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v29

The independent value-vector suite contains `93` cases covering `56/74`
distinct committed Pine v6 `ta.*` names (`75.7%`). This revision adds a
hostile 256-bar SMMA vector. Its oracle uses the documented smoothed moving
average recurrence, equivalent to RMA with the same length.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 93 | 90 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 93 | 90 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

SMMA passes on both paths over the full long series. The three existing
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-smma-v1-20260905.json
```

Measured result: `90/93` compiled matches and `90/93` public-path matches.
