> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v33

The independent value-vector suite contains `97` cases covering `60/74`
distinct committed Pine v6 `ta.*` names (`81.1%`). This revision adds NVI and
PVI vectors over a hostile volume-wave series with zero-price transitions.
Their oracles follow the v6 reference examples: each index starts at `1.0`,
updates only on its respective volume direction, and preserves the prior
value when current or previous close is zero.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 97 | 92 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 97 | 92 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

NVI and PVI fail identically on both paths after a zero-close transition: the
oracle preserves the prior index, while the engine paths return zero. These
are confirmed engine state defects, not provider or oracle failures. Reference:
[TradingView Pine v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/),
the `ta.nvi` and `ta.pvi` examples and their zero-value preservation branches.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-pvi-v1-20260905.json
```

Measured result: `92/97` compiled matches and `92/97` public-path matches.
