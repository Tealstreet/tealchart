> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v51

The independent value-vector suite contains `125` cases: `114` `ta.*` cases
covering `71/74` distinct committed names (`95.9%`), six hostile math cases,
and five string built-in cases. The string cases cover length, position,
numeric conversion, containment, and prefix checks on both execution paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 125 | 120 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 125 | 120 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

All five string vectors and the six math vectors pass on both paths. The five
previous ta/runtime mismatches are unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-str-v1-20260905.json
```

Measured result: `120/125` compiled matches and `120/125` public-path matches.
