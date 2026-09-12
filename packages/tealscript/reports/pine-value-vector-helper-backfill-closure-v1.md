# Pine Value Vector Helper Backfill Closure v1

Generated: 2026-09-12T07:13:39.025Z
Measured source commit: `cbecb6b000` with this report script/report dirty in the worktree.

## Status

Measured-and-deprioritized. This is not done and not abandoned. The remaining rows are preserved as a ranked known queue, but the highest-risk slice has been checked and did not produce another wrong oracle.

## Inputs

- Priority queue: `pine-value-vector-helper-backfill-priority-v1.json @ 962a27e8b4`.
- Checkpoints: `pine-value-vector-helper-backfill-extrema-rma-v1`, `pine-value-vector-helper-backfill-rma-v1`, and `pine-value-vector-helper-backfill-sma-ema-atr-rsi-v1`.

## Yield

- Broad-citation helper rows originally queued: 92.
- Highest-risk rows backfilled: 33.
- Disagreements found: 0.
- Remaining ranked rows: 59.

The checked rows were the highest-risk rows by the queue method: runtime-changed families and top corpus-use rows (`ta.highest`, `ta.lowest`, `ta.rma`, `ta.sma`, `ta.ema`, `ta.atr`, and `ta.rsi`). The suite is sound in those families. The remaining `59` rows still carry broad citations and are not verified by this backfill.

EMA is kept distinct from RMA in the checked set: EMA seeds from the first non-`na` source value, while RMA seeds from the SMA of the first full window. The EMA backfill specifically checked that seed shape instead of pattern-matching it onto RMA.

## Methodological Conclusion

The backfill did not find the wrong oracle. The extrema-bars wrong oracle was found because an external engine disagreed and forced the source read. Since then, `33` systematic re-derivations have found `0` disagreements. Productive wrong-oracle detection methods from this thread, ranked by observed yield:

1. Differential against an independent implementation, even an imperfect one. PineTS was unusable as blanket canon and still found the extrema-bars wrong oracle.
2. Red-first enforcement. It caught four newly merged vectors without proof metadata within hours of landing.
3. Systematic re-derivation. It is the most expensive method and found `0` disagreements across the highest-risk `33` rows.

| Proofless vector caught by red-first gate | Lane | Source commit |
| --- | --- | --- |
| `semantic.array-percentile-string-percentage-rejection` | semantic argument-type | `14ac4a40cf` |
| `semantic.builtin-argument-qualifier-rejection` | semantic qualifier | `2d9aa7168e` |
| `language.negative-modulo-floor-quotient` | runtime operator | `8a1fb60dac` |
| `language.v5-comparison-na-result-is-na` | runtime versioned-operator | `58cff557c0` |

## Remaining Queue

| Original rank | Case | Helper | Member | Runtime-changed | Corpus scripts | Call sites |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | `ta.mfi` | `mfi` | `ta.mfi` | yes | 28 | 25 |
| 31 | `ta.dema` | `dema` | `ta.ema` | no | 640 | 2533 |
| 32 | `ta.tema` | `tema` | `ta.ema` | no | 640 | 2533 |
| 37 | `hostile.stdev.flat` | `stdev` | `ta.stdev` | no | 235 | 422 |
| 38 | `hostile.stdev.middle-na` | `stdev` | `ta.stdev` | no | 235 | 422 |
| 39 | `hostile.stdev.multi-middle-na` | `stdev` | `ta.stdev` | no | 235 | 422 |
| 40 | `ta.stdev` | `stdev` | `ta.stdev` | no | 235 | 422 |
| 41 | `ta.stdev.unbiased` | `stdevUnbiased` | `ta.stdev` | no | 235 | 422 |
| 42 | `hostile.wma.middle-na` | `wma` | `ta.wma` | no | 163 | 440 |
| 43 | `ta.wma` | `wma` | `ta.wma` | no | 163 | 440 |
| 44 | `hostile.stoch.zero-range` | `stochastic` | `ta.stoch` | no | 101 | 136 |
| 45 | `ta.stoch` | `stochastic` | `ta.stoch` | no | 101 | 136 |
| 46 | `priority.ta-vwap-stdev-mult-values` | `anchoredVwapBands` | `ta.vwap` | no | 97 | 110 |
| 47 | `hostile.macd.middle-na` | `macd` | `ta.macd` | no | 91 | 105 |
| 48 | `ta.macd` | `macd` | `ta.macd` | no | 91 | 105 |
| 49 | `hostile.dmi.multi-middle-na` | `dmi` | `ta.dmi` | no | 89 | 87 |
| 50 | `ta.adx` | `dmi` | `ta.dmi` | no | 89 | 87 |
| 51 | `ta.dmi` | `dmi` | `ta.dmi` | no | 89 | 87 |
| 52 | `ta.hma` | `hma` | `ta.hma` | no | 81 | 154 |
| 53 | `hostile.supertrend.middle-na` | `supertrend` | `ta.supertrend` | no | 56 | 63 |
| 54 | `hostile.supertrend.zero-range` | `supertrend` | `ta.supertrend` | no | 56 | 63 |
| 55 | `ta.supertrend` | `supertrend` | `ta.supertrend` | no | 56 | 63 |
| 56 | `hostile.linreg.flat` | `linreg` | `ta.linreg` | no | 50 | 102 |
| 57 | `hostile.linreg.middle-na` | `linreg` | `ta.linreg` | no | 50 | 102 |
| 58 | `ta.linreg` | `linreg` | `ta.linreg` | no | 50 | 102 |
| 59 | `ta.kst` | `kst` | `ta.roc` | no | 34 | 96 |
| 60 | `hostile.cci.flat` | `cci` | `ta.cci` | no | 31 | 33 |
| 61 | `ta.cci` | `cci` | `ta.cci` | no | 31 | 33 |
| 62 | `hostile.bb.middle-na` | `bollingerBands` | `ta.bb` | no | 31 | 33 |
| 63 | `ta.bb` | `bollingerBands` | `ta.bb` | no | 31 | 33 |
| 64 | `ta.mfi.clean-typical-price-values` | `mfiFromSource` | `ta.mfi` | no | 28 | 25 |
| 65 | `ta.alma` | `alma` | `ta.alma` | no | 20 | 35 |
| 66 | `ta.alma.explicit-floor` | `alma` | `ta.alma` | no | 20 | 35 |
| 67 | `hostile.swma.middle-na` | `swma` | `ta.swma` | no | 18 | 17 |
| 68 | `ta.swma` | `swma` | `ta.swma` | no | 18 | 17 |
| 69 | `hostile.variance.flat` | `variance` | `ta.variance` | no | 17 | 17 |
| 70 | `hostile.variance.middle-na` | `variance` | `ta.variance` | no | 17 | 17 |
| 71 | `ta.variance` | `variance` | `ta.variance` | no | 17 | 17 |
| 72 | `ta.variance.unbiased` | `varianceUnbiased` | `ta.variance` | no | 17 | 17 |
| 73 | `ta.obv.source-volume` | `obvWithSourceVolume` | `ta.obv` | no | 15 | 0 |
| 74 | `hostile.wpr.zero-range` | `williamsR` | `ta.wpr` | no | 10 | 6 |
| 75 | `ta.wpr` | `williamsR` | `ta.wpr` | no | 10 | 6 |
| 76 | `hostile.median.flat` | `median` | `ta.median` | no | 9 | 6 |
| 77 | `hostile.median.middle-na` | `median` | `ta.median` | no | 9 | 6 |
| 78 | `ta.median` | `median` | `ta.median` | no | 9 | 6 |
| 79 | `hostile.cmo.middle-na` | `cmo` | `ta.cmo` | no | 9 | 5 |
| 80 | `ta.cmo` | `cmo` | `ta.cmo` | no | 9 | 5 |
| 81 | `hostile.bbw.flat` | `bollingerWidth` | `ta.bbw` | no | 9 | 4 |
| 82 | `ta.bbw` | `bollingerWidth` | `ta.bbw` | no | 9 | 4 |
| 83 | `hostile.kc.middle-na` | `keltner` | `ta.kc` | no | 6 | 9 |
| 84 | `ta.kc` | `keltner` | `ta.kc` | no | 6 | 9 |
| 85 | `ta.kc.high-low-range` | `keltner` | `ta.kc` | no | 6 | 9 |
| 86 | `hostile.cog.flat` | `cog` | `ta.cog` | no | 6 | 5 |
| 87 | `ta.cog` | `cog` | `ta.cog` | no | 6 | 5 |
| 88 | `ta.tsi` | `tsi` | `ta.tsi` | no | 6 | 3 |
| 89 | `ta.accdist` | `accdist` | `ta.accdist` | no | 6 | 0 |
| 90 | `ta.kcw` | `keltnerWidth` | `ta.kcw` | no | 5 | 1 |
| 91 | `ta.kcw.high-low-range` | `keltnerWidth` | `ta.kcw` | no | 5 | 1 |
| 92 | `hostile.wvad.zero-range` | `wvad` | `ta.wvad` | no | 4 | 0 |
