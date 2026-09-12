> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v37

The independent value-vector suite contains `101` cases covering `64/74`
distinct committed Pine v6 `ta.*` names (`86.5%`). This revision adds a
256-bar COG vector. The oracle uses the reference history indexing: each
window weights `source[i]` with its one-based history offset and negates the
weighted sum divided by the source sum.

The first oracle used chronological, zero-based weights and was corrected
after comparison; the corrected oracle matches the engine on both paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 101 | 96 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 101 | 96 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

COG passes on both paths over the full long series. The five prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-cog-v3-20260905.json
```

Measured result: `96/101` compiled matches and `96/101` public-path matches.
