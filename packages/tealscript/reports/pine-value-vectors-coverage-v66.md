> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v66

Vector results now include expected and actual plot values at every mismatching
bar, in addition to the mismatch-bar index list.

## Result

The suite remains `163/171` on both compiled and public paths. The first
`ta.kc` hostile mismatch is:

| Case | Bar | Expected | Actual |
| --- | ---: | --- | --- |
| hostile `ta.kc` middle-`na` | 5 | `[-0.125, 5.03125, -5.28125]` | `[na, na, na]` |

The other remaining cases are `ta.alma`, `ta.nvi`, `ta.pvi`, hostile ATR/DMI,
and the two hostile UDF state cases. Their full per-bar details are in the
JSON report produced by the reproduction command.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-details-v66.json
```

Measured result: `163/171` compiled matches and `163/171` public-path matches.
