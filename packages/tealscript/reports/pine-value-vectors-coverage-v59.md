> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v59

This run adds a hostile `ta.swma` case with a middle `na`. The oracle now
requires a complete four-value window before applying SWMA weights; partial
windows and windows containing `na` normalize to `na`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 158 | 151 | the seven v57 mismatches |
| Public `executeScript` path | 158 | 151 | the seven v57 mismatches |

The new hostile SWMA case passes on both paths. No existing failure changed.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-swma-v59.json
```

Measured result: `151/158` compiled matches and `151/158` public-path matches.
The command exits nonzero because the seven previously recorded mismatches
remain.
