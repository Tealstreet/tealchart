> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v31

The independent value-vector suite contains `95` cases covering `58/74`
distinct committed Pine v6 `ta.*` names (`78.4%`). This revision adds a
256-bar Intraday Intensity Index vector. Its oracle is the v6 reference
example formula `((2 * close - high - low) / (high - low)) * volume`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 95 | 92 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 95 | 92 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The III vector passes on both paths over the full long series. The three
existing mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-iii-v1-20260905.json
```

Measured result: `92/95` compiled matches and `92/95` public-path matches.
