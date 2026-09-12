> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Rolling `na` Policy Audit v1

Scope: the 74 `ta.*` names in `src/compat/pineV6BuiltinReference.ts`.

Sources:

- TradingView Pine v6 Type System docs: some built-ins automatically ignore
  `na`; the Reference Manual "Remarks" entry for each function is the source
  of truth.
- TradingView Pine v6 Reference Manual: functions whose remarks say source
  `na` values are ignored calculate on the `length` quantity of non-`na`
  values.
- TradingView Functions FAQ: `ta.sma()` is explicitly shown averaging only
  qualifying non-`na` bars.

## Split

| Bucket | Count | Names |
| --- | ---: | --- |
| Documented `na` policy differed; fixed or inherited fixed primitive | 25 | `ta.cci`, `ta.cog`, `ta.correlation`, `ta.covariance`, `ta.dev`, `ta.ema`, `ta.falling`, `ta.highest`, `ta.highestbars`, `ta.linreg`, `ta.lowest`, `ta.lowestbars`, `ta.median`, `ta.mode`, `ta.percentile_linear_interpolation`, `ta.percentile_nearest_rank`, `ta.percentrank`, `ta.range`, `ta.rising`, `ta.rma`, `ta.smma`, `ta.stdev`, `ta.variance`, `ta.vwma`, `ta.wma` |
| Documented policy already matched or was already corrected before this audit | 9 | `ta.barssince`, `ta.change`, `ta.max`, `ta.min`, `ta.mom`, `ta.roc`, `ta.sma`, `ta.tr`, `ta.valuewhen` |
| Trace-required / public docs insufficient for full missing-value behavior | 40 | `ta.accdist`, `ta.adx`, `ta.alma`, `ta.bar_index`, `ta.bb`, `ta.bbw`, `ta.cmo`, `ta.cross`, `ta.crossover`, `ta.crossunder`, `ta.cum`, `ta.dema`, `ta.dmi`, `ta.hma`, `ta.iii`, `ta.kc`, `ta.kcw`, `ta.kst`, `ta.macd`, `ta.mfi`, `ta.nvi`, `ta.obv`, `ta.pivot_point_levels`, `ta.pivothigh`, `ta.pivotlow`, `ta.pvi`, `ta.pvt`, `ta.rci`, `ta.rsi`, `ta.sar`, `ta.stoch`, `ta.supertrend`, `ta.swma`, `ta.tema`, `ta.tsi`, `ta.vwap`, `ta.wad`, `ta.wpr`, `ta.wvad` |

## Runtime Rule Applied

For functions in the first bucket, source `na` bars do not advance the
`length`-sample window. The current output is calculated from the latest
`length` qualifying samples; offset helpers still return the distance in chart
bars to the selected qualifying sample.

For `ta.vwma`, the implementation follows the documented equivalence to
`ta.sma(source * volume, length) / ta.sma(volume, length)`, so the numerator and
denominator each use the same `ta.sma` non-`na` policy.

## Verification

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-task27.json
```

Result: `64/64` compiled matches and `64/64` public-path matches.

```bash
yarn vitest run packages/tealscript/src/runtime/codegen/ta-classes.test.ts
```

Result: `72` passed.

```bash
yarn vitest run packages/tealscript/tests/ packages/tealscript/src/
```

Result: `56` files passed, `2075` tests passed, `10` skipped, `0` failed.

```bash
yarn workspace @tealstreet/tealscript typecheck
```

Result: passed.
