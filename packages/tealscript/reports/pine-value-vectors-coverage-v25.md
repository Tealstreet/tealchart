> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v25

The independent value-vector suite now contains `88` cases covering `51/74`
distinct committed Pine v6 `ta.*` names (`68.9%`). This revision adds a
256-bar `ta.wad` vector from the documented true-high/true-low momentum and
cumulative-gain definition.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 88 | 85 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 88 | 85 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The WAD vector matches on both paths, including long cumulative history. No
new mismatch was exposed; the three existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-wad-v1-20260905.json
```

Measured result: `85/88` compiled matches and `85/88` public-path matches.
