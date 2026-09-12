> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v30

The independent value-vector suite contains `94` cases covering `57/74`
distinct committed Pine v6 `ta.*` names (`77.0%`). This revision adds a
hostile 256-bar TSI vector. The oracle uses double-smoothed momentum divided
by double-smoothed absolute momentum, matching the v6 documentation's `-1`
to `+1` result range; the common `* 100` display scaling is intentionally not
part of `ta.tsi()` itself.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 94 | 91 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 94 | 91 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

TSI passes on both paths over the full long series. The three existing
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-tsi-v2-20260905.json
```

Measured result: `91/94` compiled matches and `91/94` public-path matches.
