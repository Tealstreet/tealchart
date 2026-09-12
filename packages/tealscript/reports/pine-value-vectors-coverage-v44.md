> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v44

The independent value-vector suite contains `111` cases covering `69/74`
distinct committed Pine v6 `ta.*` names (`93.2%`). This revision adds a
256-bar KST tuple vector. Its oracle composes four documented ROC/SMA terms
with weights one through four and a signal SMA.

The first oracle incorrectly divided signed ROC by the absolute prior value;
the corrected prior-value denominator matches both engine paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 111 | 105 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |
| Public `executeScript` path | 111 | 105 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |

KST passes on both paths over the full long series. The six prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-kst-v2-20260905.json
```

Measured result: `105/111` compiled matches and `105/111` public-path matches.
