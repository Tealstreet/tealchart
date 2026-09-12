> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v27

The independent value-vector suite now contains `91` cases covering `54/74`
distinct committed Pine v6 `ta.*` names (`73.0%`). This revision adds a
hostile 256-bar HMA vector. Its oracle composes full-window WMAs according to
the documented HMA definition: WMA of `2 * WMA(source, length / 2) -
WMA(source, length)`, then WMA over the square-root length.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 91 | 88 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 91 | 88 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The HMA vector passes on both paths over the full long series. No new
mismatch was exposed; the three existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-hma-v1-20260905.json
```

Measured result: `88/91` compiled matches and `88/91` public-path matches.
