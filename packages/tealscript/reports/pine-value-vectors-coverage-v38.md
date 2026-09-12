> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v38

The independent value-vector suite contains `102` cases covering `65/74`
distinct committed Pine v6 `ta.*` names (`87.8%`). This revision adds a
long-series percent-rank vector with repeated values. The oracle uses the v6
definition's complete rolling window, including the current value, and counts
values less than or equal to the reference value, preserving tie behavior.

The first oracle incorrectly excluded the current value and used strict
comparison; the corrected oracle matches both engine paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 102 | 97 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 102 | 97 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

Percent rank passes on both paths over the full long series. The five prior
confirmed mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-percentrank-v2-20260905.json
```

Measured result: `97/102` compiled matches and `97/102` public-path matches.
