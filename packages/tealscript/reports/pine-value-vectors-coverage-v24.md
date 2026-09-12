> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v24

The independent value-vector suite now contains `87` cases covering `50/74`
distinct committed Pine v6 `ta.*` names (`67.6%`). This revision adds a
hostile `ta.cmo` vector using the documented gain/loss momentum ratio.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 87 | 84 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 87 | 84 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The CMO vector matches on both paths. No new mismatch was exposed; the three
existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-cmo-v1-20260905.json
```

Measured result: `84/87` compiled matches and `84/87` public-path matches.
