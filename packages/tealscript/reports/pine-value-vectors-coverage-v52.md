> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v52

The independent value-vector suite contains `127` cases: `114` `ta.*` cases
covering `71/74` distinct committed names (`95.9%`), six hostile math cases,
five string built-in cases, and two persistent-array cases.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 127 | 122 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 127 | 122 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

The persistent-array vectors pass on both paths. They cover an array growing
across bars and retrieval of its first persisted element; the latter oracle
uses the first bar's close because `var` initializes the array once. The five
previous ta/runtime mismatches are unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-array-v2-20260905.json
```

Measured result: `122/127` compiled matches and `122/127` public-path matches.
