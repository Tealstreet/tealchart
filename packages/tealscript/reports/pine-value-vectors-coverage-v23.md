> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v23

The independent value-vector suite now contains `86` cases covering `49/74`
distinct committed Pine v6 `ta.*` names (`66.2%`). This revision adds a
256-bar `ta.obv` vector using the documented cumulative signed-volume formula.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 86 | 83 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 86 | 83 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The OBV vector matches on both paths, including its zero initial value and
long cumulative history. The remaining failures are unchanged and already
dispatched.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-obv-v2-20260905.json
```

Measured result: `83/86` compiled matches and `83/86` public-path matches.
