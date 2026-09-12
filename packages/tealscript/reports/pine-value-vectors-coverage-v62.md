> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v62

This run adds hostile middle-`na` coverage for `ta.mfi`. The initial probe
exposed an oracle mistake: MFI returns `na` when the current source is `na`,
but preserves valid flow history and resumes on the next valid bar. The oracle
was corrected before recording the result.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 167 | 159 | the eight v57 mismatches plus hostile `ta.kc` |
| Public `executeScript` path | 167 | 159 | the same eight cases |

The new hostile MFI case passes on both paths after the oracle correction. No
new engine defect was established by this cluster.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-mfi-v62-adjudicated3.json
```

Measured result: `159/167` compiled matches and `159/167` public-path matches.
The command exits nonzero because the eight listed mismatches remain.
