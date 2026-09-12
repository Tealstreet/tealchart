> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v15

The hostile independent value-vector suite contains `78` cases and covers
`35/74` distinct committed Pine v6 `ta.*` names (`47.3%`). This revision adds
middle-`na` cases for fixed-lag momentum/rate-of-change and true range, and
adjudicates the oracle behavior for missing values.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 78 | 76 | `udf.barssince.call-sites-hostile`, `udf.valuewhen.call-sites-hostile` |
| Public `executeScript` path | 78 | 76 | `udf.barssince.call-sites-hostile`, `udf.valuewhen.call-sites-hostile` |

The three initial red cases in this expansion were oracle defects, not engine
defects. `ta.mom` and `ta.roc` now explicitly return `na` when either lagged
sample is missing, and `ta.tr(true)` falls back to the current high-low range
when the prior close is missing. After those corrections, direct true-range
and fixed-lag cases pass on both paths. The remaining two failures are the
previously dispatched parameterized-UDF stateful-builtin gap.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-hostile-v6-20260905.json
```

Measured result: `76/78` compiled matches and `76/78` public-path matches.
