> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v57

This run isolates the two hostile composite mismatches from v56. It adds direct
`ta.tr(true)` and standalone `ta.rma` controls using the same multi-hole bars.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 150 | 143 | `ta.alma`, `ta.nvi`, `ta.pvi`, hostile ATR/DMI, two UDF state cases |
| Public `executeScript` path | 150 | 143 | `ta.alma`, `ta.nvi`, `ta.pvi`, hostile ATR/DMI, two UDF state cases |

Both controls pass on both paths:

- `hostile.tr.multi-middle-na` matches the documented `ta.tr(true)` fallback
  to `high - low` when the previous close is unavailable.
- `hostile.rma.synthetic.multi-middle-na` matches the standalone RMA oracle
  while skipping unavailable source samples.

Therefore `hostile.atr.multi-middle-na` is narrowed to the ATR composite
implementation, not the true-range oracle or generic RMA state. The DMI tuple
case remains an independent composite mismatch. Compiled and public outputs
still agree for both failures.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-stateful-holes-v4-20260905.json
```

Measured result: `143/150` compiled matches and `143/150` public-path matches.
The command exits nonzero because the seven listed known mismatches remain.

Reference: [Pine v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)
and [Pine built-ins](https://www.tradingview.com/pine-script-docs/language/built-ins/).
