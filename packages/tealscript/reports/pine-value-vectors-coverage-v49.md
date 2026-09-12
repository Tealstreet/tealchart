> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v49

The vector runner now normalizes oracle outputs before comparison. Previously
an oracle-generated `NaN` remained `NaN` while engine outputs normalized the
same unavailable value to `null`, producing a false mismatch on zero-range
WVAD. This is a measurement fix; execution values and tolerance are unchanged.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 114 | 109 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 114 | 109 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

Zero-range WVAD now passes on both paths. The five confirmed mismatches remain
unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-zero-range-v3-20260905.json
```

Measured result: `109/114` compiled matches and `109/114` public-path matches.
