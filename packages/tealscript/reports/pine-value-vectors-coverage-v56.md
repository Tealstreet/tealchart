> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v56

This is the v55 hostile state run with the RSI oracle corrected to follow Pine's
documented `na` handling: `ta.rsi` ignores unavailable source samples and
continues its non-`na` history. The fixed input has `na` at bars `2`, `7`, and
`10`.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 148 | 141 | `ta.alma`, `ta.nvi`, `ta.pvi`, hostile ATR/DMI, two UDF state cases |
| Public `executeScript` path | 148 | 141 | `ta.alma`, `ta.nvi`, `ta.pvi`, hostile ATR/DMI, two UDF state cases |

The RSI mismatch in v55 was an oracle defect, not an engine defect. The
corrected oracle matches both paths. `ta.atr` and tuple `ta.dmi` remain engine
investigation candidates: their compiled and public outputs agree with each
other but disagree with the documented true-range/RMA-derived oracle.

The reference manual describes `ta.tr` as the maximum of high-low and the two
previous-close distances, while the ATR reference example identifies ATR as a
requested `ta.atr()` calculation. See the [Pine v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)
and [Other timeframes and data](https://www.tradingview.com/pine-script-docs/faq/other-data-and-timeframes/).

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stateful-holes-v3-20260905.json
```

Measured result: `141/148` compiled matches and `141/148` public-path matches.
The command exits nonzero because the seven listed known mismatches remain.
