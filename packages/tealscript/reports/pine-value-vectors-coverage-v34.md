> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v34

The independent value-vector suite contains `98` cases covering `61/74`
distinct committed Pine v6 `ta.*` names (`82.4%`). This revision adds a
256-bar PVT vector using the v6 reference's cumulative
`(ta.change(close) / close[1]) * volume` definition on nonzero closes.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 98 | 93 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 98 | 93 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

PVT passes on both paths over the full long series. The five existing
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-pvt-v1-20260905.json
```

Measured result: `93/98` compiled matches and `93/98` public-path matches.
