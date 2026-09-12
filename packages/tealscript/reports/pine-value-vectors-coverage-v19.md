> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v19

The independent value-vector suite now contains `82` cases covering `45/74`
distinct committed Pine v6 `ta.*` names (`60.8%`). This revision adds a
long-series `ta.macd` tuple vector with independent fast EMA, slow EMA, signal
EMA, and histogram calculations.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 82 | 79 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 82 | 79 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The MACD line, signal, and histogram all match on the 256-bar series. The
remaining failures are unchanged and are already dispatched: the ALMA omitted
`floor` default and parameterized-UDF stateful `ta.*` evaluation.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-macd-v1-20260905.json
```

Measured result: `79/82` compiled matches and `79/82` public-path matches.
