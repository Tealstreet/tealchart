> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v65

The vector result now records exact mismatching bar indices for compiled and
public-path outputs. This makes a failure dispatchable without comparing large
serialized series by hand.

## Result

The unchanged suite remains `163/171` on both compiled and public paths. The
reported mismatch bars are:

| Case | Mismatching bars |
| --- | --- |
| `ta.alma` | 4-11 |
| hostile `ta.kc` | 5 |
| `ta.nvi` | 6-11 |
| `ta.pvi` | 2-11 |
| hostile `ta.atr.multi-middle-na` | 3-6, 8-9, 11 |
| hostile `ta.dmi.multi-middle-na` | 3-11 |
| hostile UDF `ta.barssince` | 0-11 |
| hostile UDF `ta.valuewhen` | 0-11 |

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-diagnostics-v65.json
```

Measured result: `163/171` compiled matches and `163/171` public-path matches.
