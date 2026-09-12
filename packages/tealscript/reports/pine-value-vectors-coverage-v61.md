> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v61

This run extends middle-`na` coverage to `ta.cmo`, `ta.obv`, `ta.wad`, and
`ta.vwap`. The first run exposed two oracle defects: persistent OBV state must
retain the last valid close across a missing source, and VWAP must preserve its
accumulators while returning `na` for the hole bar. Both oracles were corrected
before recording this result.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 166 | 158 | the eight v57 mismatches plus hostile `ta.kc` |
| Public `executeScript` path | 166 | 158 | the same eight cases |

All four new cases pass on both paths after the oracle corrections. No new
engine defect was established by this cluster. The hostile `ta.kc` mismatch
remains the only newly exposed engine candidate from v60.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stateful-holes-v61-adjudicated.json
```

Measured result: `158/166` compiled matches and `158/166` public-path matches.
The command exits nonzero because the eight listed mismatches remain.
