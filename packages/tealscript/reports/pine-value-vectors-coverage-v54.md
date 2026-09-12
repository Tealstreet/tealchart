> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v54

The independent value-vector suite contains `142` cases: `125` `ta.*` cases
covering `71/74` distinct committed names (`95.9%`), six hostile math cases,
five string cases, two persistent-array cases, and hostile rolling/state cases
with multiple interior `na` holes and long recursive histories.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 142 | 137 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 142 | 137 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

All 11 new hostile cases match on both paths:

- Multi-hole windows: `ta.sma`, `ta.ema`, `ta.rma`, `ta.stdev`, `ta.highest`,
  and `ta.range`.
- Multi-hole state/path cases: `ta.barssince`, `ta.crossover`, and
  `ta.pivothigh`.
- Long histories with interior holes: `ta.ema` and `ta.rma` at length `20`.

The five failures are unchanged from v53. No new oracle or engine mismatch was
introduced by the hostile inputs.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-multi-hole-v1-20260905.json
```

Measured result: `137/142` compiled matches and `137/142` public-path matches.
The command exits nonzero because the five known mismatches remain.
