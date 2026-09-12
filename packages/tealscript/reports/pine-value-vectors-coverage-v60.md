> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v60

This run extends middle-`na` hostile coverage to tuple-valued `ta.bb`,
`ta.macd`, `ta.kc`, and `ta.supertrend` calculations.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 162 | 154 | `ta.alma`, `ta.nvi`, `ta.pvi`, hostile `ta.atr`, hostile `ta.dmi`, hostile UDF `ta.barssince`, hostile UDF `ta.valuewhen`, and hostile `ta.kc` |
| Public `executeScript` path | 162 | 154 | the same eight cases |

The new `ta.bb`, `ta.macd`, and `ta.supertrend` cases pass on both paths.
The new `ta.kc` case is a newly exposed mismatch: the oracle continues the
EMA-based channel across a middle `na`, while both execution paths emit `na`
for all three channel outputs on that bar. This is recorded as an engine
candidate, not corrected in the oracle, because the Pine reference documents
EMA-based source `na` values as ignored.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stateful-holes-v60.json
```

Measured result: `154/162` compiled matches and `154/162` public-path matches.
The command exits nonzero because the eight listed mismatches remain.
