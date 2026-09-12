> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v42

The independent value-vector suite contains `109` cases covering `67/74`
distinct committed Pine v6 `ta.*` names (`90.5%`). This revision adds a
standalone `ta.adx(14, 14)` vector using the ADX component of the independently
implemented Wilder DMI oracle.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 109 | 104 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 109 | 104 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

The standalone ADX vector passes on both paths. The five prior confirmed
mismatches remain unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-adx-v1-20260905.json
```

Measured result: `104/109` compiled matches and `104/109` public-path matches.
