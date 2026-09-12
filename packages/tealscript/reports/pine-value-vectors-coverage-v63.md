> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v63

This run adds zero-range hostile vectors for `ta.stoch` and `ta.wpr`, using
bars where `high == low == close`. Both functions must return `na` instead of
dividing by a zero range.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 169 | 161 | the eight v57 mismatches plus hostile `ta.kc` |
| Public `executeScript` path | 169 | 161 | the same eight cases |

Both new zero-range cases pass on both paths. No existing failure changed.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-zero-range-v63.json
```

Measured result: `161/169` compiled matches and `161/169` public-path matches.
The command exits nonzero because the eight listed mismatches remain.
