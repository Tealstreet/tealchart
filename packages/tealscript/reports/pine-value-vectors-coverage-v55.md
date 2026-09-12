> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v55

This run extends v54 with six repeated-interior-gap cases covering Wilder
state, pivots, crossings, and tuple DMI output. The fixed synthetic input has
`na` at bars `2`, `7`, and `10`; all cases use both compiled and public
`executeScript` paths.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 148 | 140 | three existing indicators, three new hostile cases, two existing UDF state cases |
| Public `executeScript` path | 148 | 140 | three existing indicators, three new hostile cases, two existing UDF state cases |

New hostile cases passing on both paths:

- `ta.pivotlow`, `ta.valuewhen`, and `ta.crossunder` with multiple interior
  holes.

New mismatches requiring formula adjudication before dispatch:

- `hostile.rsi.multi-middle-na`: oracle returns all `na`; both engine paths
  recover values after enough non-`na` observations.
- `hostile.atr.multi-middle-na`: both engine paths disagree with the current
  true-range/RMA oracle after the first hole.
- `hostile.dmi.multi-middle-na`: all three tuple outputs disagree with the
  current directional-movement/RMA oracle.

The three new cases are not classified as engine defects by this report. Their
compiled/public agreement proves path parity, not reference correctness.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stateful-holes-v1-20260905.json
```

Measured result: `140/148` compiled matches and `140/148` public-path matches.
The command exits nonzero because the five v53 mismatches and three new
adjudication candidates remain.
