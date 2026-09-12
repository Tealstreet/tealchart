> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v53

The independent value-vector suite contains `131` cases: `114` `ta.*` cases
covering `71/74` distinct committed names (`95.9%`), six hostile math cases,
five string built-in cases, two persistent-array cases, and four hostile
dispersion cases covering flat and middle-`na` windows for `ta.variance` and
`ta.dev`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 131 | 126 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 131 | 126 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

The new hostile dispersion vectors pass on both paths. Flat windows produce
zero dispersion, and middle-`na` windows require a complete non-`na` rolling
window. No prior mismatch changed.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-dispersion-v1-20260905.json
```

Measured result: `126/131` compiled matches and `126/131` public-path matches.
