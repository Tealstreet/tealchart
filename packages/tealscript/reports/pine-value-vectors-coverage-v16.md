> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v16

This run adds independent formula vectors for `ta.linreg` and `ta.alma` to
the hostile suite. The `linreg` oracle was corrected to evaluate the fitted
line at `length - 1 - offset` relative to the window's x-mean. The ALMA
oracle follows the reference's optional `floor` argument, whose default is
false.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 80 | 77 | `ta.alma`, two parameterized-UDF state cases |
| Public `executeScript` path | 80 | 77 | `ta.alma`, two parameterized-UDF state cases |

`ta.linreg` now matches on both paths after the oracle correction. `ta.alma`
differs identically on both paths: TealScript emits the result for a floored
center (`floor=true`), while the omitted Pine argument requires the non-floored
center (`floor=false`). This is a confirmed engine default/implementation gap,
not an interpreter/compiled divergence. The official reference is the
[Pine v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/).

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-numeric-v2-20260905.json
```

Measured result: `77/80` compiled matches and `77/80` public-path matches.
