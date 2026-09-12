> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v46

The independent value-vector suite contains `112` cases covering `70/74`
distinct committed Pine v6 `ta.*` names (`94.6%`). This revision corrects the
Supertrend oracle to the documented lower/upper band carry predicates and
direction selection, and retains its hostile 256-bar tuple vector.

The earlier Supertrend failure was an oracle defect: both band carry branches
were reversed. After correction, the engine matches the documented recurrence
on both execution paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 112 | 107 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 112 | 107 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

Supertrend now passes on both paths over the full long series. The five
remaining failures are unchanged and independently adjudicated.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-supertrend-v3-20260905.json
```

Measured result: `107/112` compiled matches and `107/112` public-path matches.
