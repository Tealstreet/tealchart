> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors: Hostile V2

This run adds a middle-`na` `ta.sma` case to the hostile corpus. The oracle
keeps the latest three non-`na` source values, matching the TradingView v6 FAQ:
`ta.sma()` ignores bars whose source is `na`, and its example states that
`ta.sma(condition ? volume : na, 5)` averages the latest five qualifying
values. See the [official Functions FAQ](https://www.tradingview.com/pine-script-docs/faq/functions/#how-can-i-calculate-an-average-only-when-a-certain-condition-is-true).

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 55 | 54 | `hostile.sma.middle-na` |
| Public `executeScript` path | 55 | 54 | `hostile.sma.middle-na` |

The other 54 cases remain green, including the prior signed/zero, flat,
overlong, long-recursive-smoother, and `ta.max` middle-`na` cases.

## Confirmed Mismatch

`hostile.sma.middle-na` uses closes `[0, -2, 0, 2, -1, na, 0, -3, 1, 0, -2, 2]`
with length `3`. The independent oracle expects a value whenever three
non-`na` source values have accumulated. TealScript instead emits `na` from
the hole until three consecutive non-`na` bars have elapsed. Both execution
paths agree with each other, so this is an engine semantic defect rather than
an interpreter/compiled divergence. The mismatch is dispatched as an
interior-`na` rolling-window defect; no runtime source was changed in this
cluster.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript typecheck
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-hostile-v2.json
```
