> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v20

The independent value-vector suite now contains `83` cases covering `46/74`
distinct committed Pine v6 `ta.*` names (`62.2%`). This revision adds a
256-bar `ta.kc` tuple vector using independent EMA and true-range smoothing
for the basis and channel bounds.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 83 | 80 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 83 | 80 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The Keltner basis, upper, and lower series match on the long synthetic series.
The remaining failures are unchanged and already dispatched.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-kc-v1-20260905.json
```

Measured result: `80/83` compiled matches and `80/83` public-path matches.
