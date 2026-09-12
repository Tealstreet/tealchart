> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v28

The independent value-vector suite contains `92` cases covering `55/74`
distinct committed Pine v6 `ta.*` names (`74.3%`). This revision adds a
256-bar MFI vector and makes numeric comparison tolerance scale-aware so
large finite values are not rejected for insignificant floating-point noise.
The MFI oracle requires a complete window beginning after the undefined first
source delta, then applies the documented positive/negative money-flow ratio.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 92 | 89 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 92 | 89 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

MFI passes on both paths over the full long series. The scale-aware tolerance
changed no prior pass/fail outcome except the two equivalent MFI float-noise
comparisons. The three existing semantic/runtime mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-mfi-v3-20260905.json
```

Measured result: `89/92` compiled matches and `89/92` public-path matches.
