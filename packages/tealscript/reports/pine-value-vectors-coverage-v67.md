> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v67

This run adds `ta.pivot_point_levels("Traditional", "Daily")` array-shape
coverage. The documented Traditional pivot output has 11 levels; the vector
asserts `array.size(levels) == 11` through both execution paths. It does not
claim numeric daily pivot parity, which requires a separately validated
multi-session oracle.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 172 | 164 | the eight previously recorded mismatches |
| Public `executeScript` path | 172 | 164 | the same eight cases |

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-pivot-shape-v67.json
```

Measured result: `164/172` compiled matches and `164/172` public-path matches.
