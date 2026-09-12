> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v47

The independent value-vector suite contains `113` cases covering `71/74`
distinct committed Pine v6 `ta.*` names (`95.9%`). This revision adds a
256-bar RCI vector using rank correlation over each complete rolling window.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 113 | 108 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 113 | 108 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

RCI passes on both paths over the full long series. The five prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-rci-v1-20260905.json
```

Measured result: `108/113` compiled matches and `108/113` public-path matches.
