# TA Extremebars Default Source Regression v1

Date: 2026-09-12

## Verdict

`ta.highestbars(length)` and `ta.lowestbars(length)` must use the default
`high` and `low` source series respectively. The branch had regressed both
compiled helpers to pass `Number.NaN` when `source` was omitted, so
source-omitted offset calls returned all `na` while the explicit-source forms
worked.

This was a user-facing regression introduced from external-consensus evidence:
both JavaScript-based voters returned `na` for row `v6 0673`, but the live
TradingView reference documents the one-argument overloads. Documentation wins
over two JS-engine agreement.

## Reference

The live TradingView v6 reference bundle entry for `ta.highestbars` says:

```text
One arg version: length is the number of bars back. Algorithm uses high as a
source series.
```

The corresponding `ta.lowestbars` entry says:

```text
One arg version: length is the number of bars back. Algorithm uses low as a
source series.
```

The same bundle lists the return type for both as `series int` and the
one-argument overload by marking `source` optional and `length` required.

## Fix

The compiled emitter now restores the documented default source:

| Helper | Omitted-source lowering |
| --- | --- |
| `ta.highestbars(length)` | `ctx.bar.high` |
| `ta.lowestbars(length)` | `ctx.bar.low` |

The regression tests restore the relational assertion that caught this class:

```text
ta.highestbars(length) == ta.highestbars(high, length)
ta.lowestbars(length) == ta.lowestbars(low, length)
```

Hard-coded all-null literals were removed because they can bless a dropped
default source. The cross-form assertion is the useful guard.

## Row `v6 0673`

The row that drove the regression used:

```pine
plot(ta.highest(close, 3))
plot(ta.lowest(open, 2))
plot(ta.highestbars(4))
plot(ta.lowestbars(length=5))
```

The script is valid Pine. Its source-omitted extremebars calls should run over
`high` and `low`. The external-voter agreement on `na` was another
JavaScript-engine contamination, in the same family as the string-percentage
coercion and the reverted v4/v5 const-int division inference: a vote can expose
a question, but it cannot override the manual.

## Verification

Red before fix:

```text
yarn vitest run packages/tealscript/src/runtime/codegen/execute.test.ts -t 'uses high and low for source-omitted highestbars'
```

failed with source-omitted `ta.highestbars(4)` returning all `null` while the
explicit `ta.highestbars(high, 4)` form returned numeric offsets.

Green after fix:

```text
yarn vitest run packages/tealscript/src/runtime/codegen/execute.test.ts -t 'uses high and low for source-omitted highestbars'
```

## Sources

- TradingView Pine Script v6 Reference Manual:
  https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highestbars
- TradingView Pine Script v6 Reference Manual:
  https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowestbars
