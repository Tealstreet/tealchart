> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v41

The independent value-vector suite contains `108` cases covering `67/74`
distinct committed Pine v6 `ta.*` names (`90.5%`). This revision adds a
256-bar DMI tuple vector. Its oracle follows the documented Wilder DMI
construction: directional movement and true range are RMA-smoothed, DI values
form the DX ratio, and ADX applies a second RMA.

The first oracle used an incorrect first-bar true-range seed and EMA for ADX;
both were corrected before recording the result.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 108 | 103 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 108 | 103 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

DMI passes on both paths over the full long series. The five prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-dmi-v3-20260905.json
```

Measured result: `103/108` compiled matches and `103/108` public-path matches.
