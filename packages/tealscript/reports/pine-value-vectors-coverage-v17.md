> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v17

This revision adds an explicit `floor=true` ALMA control beside the omitted
optional argument case. The control uses the same independent ALMA formula and
hostile suite.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 81 | 78 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 81 | 78 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

`ta.alma(..., true)` matches the floored oracle on both paths, proving the
ALMA calculation is correct and isolating the defect to the omitted `floor`
default. The official reference's optional argument defaults `floor` to false.
The two UDF state cases remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-alma-control-v1-20260905.json
```

Measured result: `78/81` compiled matches and `78/81` public-path matches.
