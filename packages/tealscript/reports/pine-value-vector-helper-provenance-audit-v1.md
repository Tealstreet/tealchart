# Pine Value Vector Helper Provenance Audit v1

Generated: 2026-09-12T07:20:00.000Z
Measured source commit: `7ef67ea66867ce599133eed8b33a774ad06b50f8` with this audit script/report dirty in the worktree.

## Purpose

`pine-value-vector-discrimination-audit-v1` proved that the all-null and all-zero suspicion shapes are not comparator-vacuous. This report asks the separate helper-provenance question: when a vector computes expected values through a local helper, is that helper backed by a cited published formula, or is it simply a second implementation of the behavior under test?

The extrema-bars counterexample did not share runtime code. It still carried the wrong sign because the local helper encoded the same wrong understanding that the runtime had. This audit therefore treats local helpers as second implementations until their formula provenance is explicit.

## Headline

- Helper rows reviewed: 129.
- Actual shared runtime-code rows: 0.
- Published-formula cited helper rows: 36.
- Generic doc-cited second implementations: 92.
- Trace-qualified helper rows: 1.
- Known counterexample-family helper rows: 1.

The key correction is that `0` shared-code rows does not clear the helper set. All 129 helper rows remain second implementations; 36 cite a concrete published formula/composition/equivalent implementation, 92 only carry a broad family/manual citation, and 1 is trace-qualified.

## Ranked Helpers

| Rank | Helper | Rows | Highest risk | Provenance split | Runtime-change evidence | Examples |
| ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `aroon` | 1 | `known-counterexample-family` | `published-formula-cited` 1 | Extrema-bars/Aroon sign family corrected at 31a4d4eb61 after this helper family exposed a wrong oracle and compensating wrapper bug. | `tradingview-ta.aroon.v7` |
| 2 | `rma` | 9 | `generic-second-implementation` | `generic-doc-cited` 8, `published-formula-cited` 1 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. | `hostile.rma.overlong`, `hostile.rma.long`, `hostile.rma.long-middle-na`, `hostile.rma.middle-na`, `hostile.rma.multi-middle-na`, `hostile.rma.synthetic.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.rma` |
| 3 | `sma` | 8 | `generic-second-implementation` | `generic-doc-cited` 6, `published-formula-cited` 2 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. | `depth.ta-named-workhorse-values`, `hostile.sma.middle-na`, `hostile.sma.multi-middle-na`, `language.block-boundary-unary-return-values`, `priority.ta-workhorse-history-values`, `ta.sma`, `ta.sma.nested-expression-source-order-values`, `udf.ta.call-sites` |
| 4 | `ema` | 7 | `generic-second-implementation` | `generic-doc-cited` 5, `published-formula-cited` 2 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. | `depth.ta-named-workhorse-values`, `hostile.ema.long`, `hostile.ema.long-middle-na`, `hostile.ema.middle-na`, `hostile.ema.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.ema` |
| 5 | `atr` | 6 | `generic-second-implementation` | `generic-doc-cited` 4, `published-formula-cited` 2 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. | `hostile.atr.overlong`, `depth.ta-named-workhorse-values`, `hostile.atr.middle-na`, `hostile.atr.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.atr` |
| 6 | `highest` | 6 | `generic-second-implementation` | `generic-doc-cited` 4, `published-formula-cited` 2 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. | `depth.ta-named-workhorse-values`, `hostile.highest.middle-na`, `hostile.highest.multi-middle-na`, `language.qualifier-helper-chain`, `priority.ta-workhorse-history-values`, `ta.highest` |
| 7 | `rsi` | 5 | `generic-second-implementation` | `generic-doc-cited` 4, `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.rsi.flat`, `hostile.rsi.multi-middle-na`, `hostile.rsi.signed`, `priority.ta-workhorse-history-values`, `ta.rsi` |
| 8 | `wvad` | 5 | `generic-second-implementation` | `published-formula-cited` 4, `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.wvad.all-na`, `ta.wvad`, `hostile.wvad.leading-na`, `hostile.wvad.middle-na`, `hostile.wvad.zero-range` |
| 9 | `lowest` | 4 | `generic-second-implementation` | `generic-doc-cited` 2, `published-formula-cited` 2 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. | `depth.ta-named-workhorse-values`, `hostile.lowest.middle-na`, `priority.ta-workhorse-history-values`, `ta.lowest` |
| 10 | `stdev` | 4 | `generic-second-implementation` | `generic-doc-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.stdev.flat`, `hostile.stdev.middle-na`, `hostile.stdev.multi-middle-na`, `ta.stdev` |
| 11 | `dmi` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.dmi.multi-middle-na`, `ta.adx`, `ta.dmi` |
| 12 | `keltner` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.kc.middle-na`, `ta.kc`, `ta.kc.high-low-range` |
| 13 | `linreg` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.linreg.flat`, `hostile.linreg.middle-na`, `ta.linreg` |
| 14 | `median` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.median.flat`, `hostile.median.middle-na`, `ta.median` |
| 15 | `supertrend` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.supertrend.middle-na`, `hostile.supertrend.zero-range`, `ta.supertrend` |
| 16 | `variance` | 3 | `generic-second-implementation` | `generic-doc-cited` 3 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.variance.flat`, `hostile.variance.middle-na`, `ta.variance` |
| 17 | `wma` | 3 | `generic-second-implementation` | `generic-doc-cited` 2, `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.wma.middle-na`, `priority.ta-workhorse-history-values`, `ta.wma` |
| 18 | `alma` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.alma`, `ta.alma.explicit-floor` |
| 19 | `bollingerBands` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.bb.middle-na`, `ta.bb` |
| 20 | `bollingerWidth` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.bbw.flat`, `ta.bbw` |
| 21 | `cci` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.cci.flat`, `ta.cci` |
| 22 | `cmo` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.cmo.middle-na`, `ta.cmo` |
| 23 | `cog` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.cog.flat`, `ta.cog` |
| 24 | `keltnerWidth` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.kcw`, `ta.kcw.high-low-range` |
| 25 | `macd` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.macd.middle-na`, `ta.macd` |
| 26 | `mfi` | 2 | `generic-second-implementation` | `generic-doc-cited` 1, `trace-qualified-formula` 1 | TA MFI runtime/value behavior changed at cec092f9e3 and earlier MFI parity work; hostile middle-na behavior remains trace-qualified. | `hostile.mfi.middle-na`, `ta.mfi` |
| 27 | `stochastic` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.stoch.zero-range`, `ta.stoch` |
| 28 | `swma` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.swma.middle-na`, `ta.swma` |
| 29 | `williamsR` | 2 | `generic-second-implementation` | `generic-doc-cited` 2 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.wpr.zero-range`, `ta.wpr` |
| 30 | `accdist` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.accdist` |
| 31 | `anchoredVwapBands` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `priority.ta-vwap-stdev-mult-values` |
| 32 | `dema` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.dema` |
| 33 | `hma` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.hma` |
| 34 | `kst` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.kst` |
| 35 | `mfiFromSource` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.mfi.clean-typical-price-values` |
| 36 | `obvWithSourceVolume` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.obv.source-volume` |
| 37 | `smaValues` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.sma.nested-expression-source-order-values` |
| 38 | `stdevUnbiased` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.stdev.unbiased` |
| 39 | `tema` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.tema` |
| 40 | `tsi` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.tsi` |
| 41 | `varianceUnbiased` | 1 | `generic-second-implementation` | `generic-doc-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `ta.variance.unbiased` |
| 42 | `iii` | 5 | `formula-cited-second-implementation` | `published-formula-cited` 5 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.iii.all-na`, `ta.iii`, `hostile.iii.leading-na`, `hostile.iii.middle-na`, `hostile.iii.zero-range` |
| 43 | `nvi` | 4 | `formula-cited-second-implementation` | `published-formula-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.nvi.all-na`, `hostile.nvi.leading-na`, `hostile.nvi.middle-na`, `ta.nvi` |
| 44 | `obv` | 4 | `formula-cited-second-implementation` | `published-formula-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.obv.all-na`, `hostile.obv.leading-na`, `hostile.obv.middle-na`, `ta.obv` |
| 45 | `pvi` | 4 | `formula-cited-second-implementation` | `published-formula-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.pvi.all-na`, `hostile.pvi.leading-na`, `hostile.pvi.middle-na`, `ta.pvi` |
| 46 | `pvt` | 4 | `formula-cited-second-implementation` | `published-formula-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.pvt.all-na`, `hostile.pvt.leading-na`, `hostile.pvt.middle-na`, `ta.pvt` |
| 47 | `wad` | 4 | `formula-cited-second-implementation` | `published-formula-cited` 4 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `hostile.wad.all-na`, `hostile.wad.leading-na`, `hostile.wad.middle-na`, `ta.wad` |
| 48 | `chandelier` | 1 | `formula-cited-second-implementation` | `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `tradingview-ta.chandelier.v12` |
| 49 | `donchian` | 1 | `formula-cited-second-implementation` | `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `tradingview-ta.donchian.v7` |
| 50 | `percentagePriceOscillator` | 1 | `formula-cited-second-implementation` | `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `tradingview-ta.ppo.v12` |
| 51 | `tripleExponentialAverageOscillator` | 1 | `formula-cited-second-implementation` | `published-formula-cited` 1 | No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle. | `tradingview-ta.trix.v12` |

## Seven Residual Rows Closed

| Case | Closure | Evidence |
| --- | --- | --- |
| `ta.highestbars` | `closed-corrected-documented` | Prior oracle encoded positive bars-ago. Corrected to negative-or-zero offsets from PineCoders and the official TradingView/ta Aroon formula; this is the known counterexample family, not an open residual. |
| `ta.lowestbars` | `closed-corrected-documented` | Prior oracle encoded positive bars-ago. Corrected to negative-or-zero offsets from PineCoders and the official TradingView/ta Aroon formula; this is the known counterexample family, not an open residual. |
| `visual.plot-hline-fill-metadata-values` | `closed-corrected-stale-observed-output` | The old expected hline series was the stale empty-output bug. It now expects full bar-count hline and fill values, so it fails an empty-output engine. |
| `visual.constant-identity-values` | `closed-corrected-stale-observed-output` | The old visual expectation encoded stale hline/visual payload behavior. It now asserts emitted visual metadata and full bar-count hline values instead of accepting empty output. |
| `strategy.partial-exit-average-price-values` | `closed-formula-arithmetic` | The long float is (1*100 + 2*110) / 3 = 106.66666666666667, then closing the one-contract A lot leaves two B contracts at average 110. |
| `strategy.trade-percent-values` | `closed-formula-arithmetic` | The long floats decompose to documented trade-percent arithmetic: win = 10%, loss = -4/105*100 = -3.8095238095238093%, averages are (10 + loss)/2 = 3.0952380952380953 and (10 + loss + 0)/3 = 2.0634920634920637. |
| `strategy.trade-runup-drawdown-values` | `closed-formula-arithmetic` | The long floats decompose over STRATEGY_ACCESSOR_BARS: loss drawdown percent = 6/105*100 = 5.714285714285714 and open short runup percent = 12/(106*3)*100 = 3.7735849056603774. |

## Red-First Cost

- New-vector comparator discrimination proof: Cheap: about half a day to one day to enforce generic expected-output mutations for every new value vector, because the matcher already exposes output shape and mismatch details.
- New-vector helper provenance metadata: Cheap-to-moderate: about one additional required metadata field per new helper-derived vector naming published formula/reference composition/manual result, plus a guard that refuses broad family citations for new helper expectations.
- Backfilling existing helper rows: Not cheap: the 129 existing helper rows need formula-by-formula provenance review. The high-priority subset is the 18 generic-doc-cited rows plus the known extrema-bars family; full backfill is several days.
- Recommendation: Enforce red-first comparator proof and explicit helper-formula provenance for new vectors before the suite grows further; do not block on re-deriving all existing helper rows.
