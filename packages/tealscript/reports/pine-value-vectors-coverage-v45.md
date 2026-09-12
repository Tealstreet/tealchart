> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v45

The independent value-vector suite contains `112` cases covering `70/74`
distinct committed Pine v6 `ta.*` names (`94.6%`). This revision adds a
256-bar Parabolic SAR vector with acceleration-factor and reversal state.

The first oracle initialized the first bar as an uptrend from its low. The v6
behavior initializes from the first bar's high as the downtrend side; correcting
that two-sided initialization made the vector match both engine paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 112 | 106 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |
| Public `executeScript` path | 112 | 106 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |

SAR passes on both paths over the full long series. The six prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-sar-v2-20260905.json
```

Measured result: `106/112` compiled matches and `106/112` public-path matches.
