> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v35

The independent value-vector suite contains `99` cases covering `62/74`
distinct committed Pine v6 `ta.*` names (`83.8%`). This revision adds a
256-bar Accumulation/Distribution Index vector using the standard documented
cumulative money-flow-volume formula.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 99 | 94 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 99 | 94 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

Accumulation/Distribution passes on both paths over the full long series. The
five prior mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-accdist-v1-20260905.json
```

Measured result: `94/99` compiled matches and `94/99` public-path matches.
