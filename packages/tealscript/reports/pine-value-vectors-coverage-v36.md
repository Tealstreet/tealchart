> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v36

The independent value-vector suite contains `100` cases covering `63/74`
distinct committed Pine v6 `ta.*` names (`85.1%`). This revision adds a
256-bar WVAD vector using the v6 reference example `(close - open) /
(high - low) * volume`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 100 | 95 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 100 | 95 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

WVAD passes on both paths over the full long series. The five prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-wvad-v1-20260905.json
```

Measured result: `95/100` compiled matches and `95/100` public-path matches.
