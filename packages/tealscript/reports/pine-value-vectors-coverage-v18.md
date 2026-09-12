> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v18

This report corrects the coverage numerator used by the prior v13-v17
summaries. The vector script contains `81` cases covering `44/74` distinct
committed Pine v6 `ta.*` names (`59.5%`), not `35/74`; the earlier extractor
failed to count several `ta.*` cases whose IDs also carried a hostile suffix.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 81 | 78 | omitted-floor `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 81 | 78 | omitted-floor `ta.alma`, two parameterized-UDF state cases |

The exact missing reference names are:

`ta.accdist`, `ta.adx`, `ta.bar_index`, `ta.cmo`, `ta.cog`, `ta.dema`,
`ta.dmi`, `ta.hma`, `ta.iii`, `ta.kc`, `ta.kcw`, `ta.kst`, `ta.macd`,
`ta.mfi`, `ta.mode`, `ta.nvi`, `ta.obv`, `ta.percentrank`,
`ta.pivot_point_levels`, `ta.pvi`, `ta.pvt`, `ta.rci`, `ta.sar`, `ta.smma`,
`ta.stoch`, `ta.supertrend`, `ta.tema`, `ta.tsi`, `ta.wad`, `ta.wvad`.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-alma-control-v1-20260905.json
```

The denominator is parsed from `src/compat/pineV6BuiltinReference.ts`; the
covered set is derived from all `ta.*` and `hostile.*` vector IDs in
`scripts/run-pine-value-vectors.ts`, normalized to their base reference name.
