> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v32

The independent value-vector suite contains `96` cases covering `59/74`
distinct committed Pine v6 `ta.*` names (`79.7%`). This revision adds an
NVI vector with alternating volume and zero-price transitions. The oracle
follows the v6 reference example: NVI starts at `1.0`, updates only when
volume decreases, and preserves the previous value when current or previous
close is zero.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 96 | 92 | `ta.alma`, `ta.nvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 96 | 92 | `ta.alma`, `ta.nvi`, two parameterized-UDF state cases |

The NVI mismatch is identical on both paths. After the zero-close transition,
the oracle preserves `-0.5` and later updates to `0.1666666667`; both engine
paths instead return `0` from that point. This is a confirmed engine state
defect, not a provider or harness failure. Reference: [TradingView Pine v6
Reference Manual](https://www.tradingview.com/pine-script-reference/v6/),
`ta.nvi` example and its explicit zero-value preservation branch.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-nvi-v1-20260905.json
```

Measured result: `92/96` compiled matches and `92/96` public-path matches.
