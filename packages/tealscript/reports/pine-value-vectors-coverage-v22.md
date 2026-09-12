> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v22

The independent value-vector suite now contains `85` cases covering `48/74`
distinct committed Pine v6 `ta.*` names (`64.9%`). This revision adds a
hostile-series `ta.stoch` vector using the documented rolling high/low range
formula, including the zero-range case.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 85 | 82 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 85 | 82 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The stochastic oscillator matches on both paths. No new mismatch was exposed;
the three existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stoch-v1-20260905.json
```

Measured result: `82/85` compiled matches and `82/85` public-path matches.
