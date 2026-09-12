> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v21

The independent value-vector suite now contains `84` cases covering `47/74`
distinct committed Pine v6 `ta.*` names (`63.5%`). This revision adds the
derived `ta.kcw` Keltner-width vector over the same 256-bar series as `ta.kc`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 84 | 81 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 84 | 81 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

`ta.kcw` matches on both paths. No new mismatch was introduced; the three
existing failures remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-kcw-v1-20260905.json
```

Measured result: `81/84` compiled matches and `81/84` public-path matches.
