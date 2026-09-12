> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v39

The independent value-vector suite contains `103` cases covering `66/74`
distinct committed Pine v6 `ta.*` names (`89.2%`). This revision adds a
zero-range, all-identical `ta.mode` vector over complete rolling windows.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 103 | 98 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 103 | 98 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

Mode passes on both paths. The five prior confirmed mismatches remain
unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-mode-v1-20260905.json
```

Measured result: `98/103` compiled matches and `98/103` public-path matches.
