# Pine Value Vector Helper Backfill Priority v1

Generated: 2026-09-12T06:29:11.356Z
Measured source commit: `962a27e8b4` with this report script/report dirty in the worktree.

## Purpose

`pine-value-vector-helper-provenance-audit-v1` left `92` helper-derived value vectors with only broad family/manual citations. This report ranks that backlog; it does not backfill it. The ranking uses the two signals that predicted the extrema-bars failure: whether this helper/member family changed at runtime on this branch, and how many real corpus scripts use the member.

Existing vectors are not failed by this report. New vectors are guarded separately by the red-first discrimination metadata gate added to `run-pine-value-vectors.ts`.

## Inputs

- Helper provenance audit: `pine-value-vector-helper-provenance-audit-v1.json @ 7ef67ea66867ce599133eed8b33a774ad06b50f8`.
- Corpus depth gap report: `pine-corpus-vector-depth-gap-v1.json @ abc1114cbe`.

## Method

Each broad-citation helper row is mapped to its primary official member, scored with runtime-touched families first, then by corpus script count, call-site count, and reference count. The score is `runtimeChanged ? 1,000,000,000 : 0` plus `scripts * 10,000 + callSites + references / 100`.

A broad family-level doc link is not treated as a formula citation. A local helper is a second implementation until the vector cites a concrete published formula, reference composition, or manual-specified result.

## Headline

- Broad-citation helper rows ranked: 92.
- Runtime-changed family rows: 30 (32.61%).
- Distinct helpers: 39.
- Distinct primary members: 34.

## Ranked Rows

| Rank | Case | Helper | Member | Runtime-changed | Corpus scripts | Call sites | Vector cases | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `hostile.sma.middle-na` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 2 | `hostile.sma.multi-middle-na` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 3 | `language.block-boundary-unary-return-values` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 4 | `ta.sma` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 5 | `ta.sma.nested-expression-source-order-values` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 6 | `udf.ta.call-sites` | `sma` | `ta.sma` | yes | 733 | 2297 | 12 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 7 | `hostile.ema.long` | `ema` | `ta.ema` | yes | 640 | 2533 | 9 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 8 | `hostile.ema.long-middle-na` | `ema` | `ta.ema` | yes | 640 | 2533 | 9 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 9 | `hostile.ema.middle-na` | `ema` | `ta.ema` | yes | 640 | 2533 | 9 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 10 | `hostile.ema.multi-middle-na` | `ema` | `ta.ema` | yes | 640 | 2533 | 9 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 11 | `ta.ema` | `ema` | `ta.ema` | yes | 640 | 2533 | 9 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 12 | `hostile.atr.middle-na` | `atr` | `ta.atr` | yes | 594 | 991 | 8 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 13 | `hostile.atr.multi-middle-na` | `atr` | `ta.atr` | yes | 594 | 991 | 8 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 14 | `hostile.atr.overlong` | `atr` | `ta.atr` | yes | 594 | 991 | 8 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 15 | `ta.atr` | `atr` | `ta.atr` | yes | 594 | 991 | 8 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 16 | `hostile.highest.middle-na` | `highest` | `ta.highest` | yes | 488 | 1095 | 11 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 17 | `hostile.highest.multi-middle-na` | `highest` | `ta.highest` | yes | 488 | 1095 | 11 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 18 | `language.qualifier-helper-chain` | `highest` | `ta.highest` | yes | 488 | 1095 | 11 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 19 | `ta.highest` | `highest` | `ta.highest` | yes | 488 | 1095 | 11 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 20 | `hostile.lowest.middle-na` | `lowest` | `ta.lowest` | yes | 451 | 972 | 9 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 21 | `ta.lowest` | `lowest` | `ta.lowest` | yes | 451 | 972 | 9 | TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1. |
| 22 | `hostile.rma.long` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 23 | `hostile.rma.long-middle-na` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 24 | `hostile.rma.middle-na` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 25 | `hostile.rma.multi-middle-na` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 26 | `hostile.rma.overlong` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 27 | `hostile.rma.synthetic.multi-middle-na` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 28 | `ta.rma` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 29 | `ta.smma` | `rma` | `ta.rma` | yes | 156 | 564 | 11 | TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355. |
| 30 | `ta.mfi` | `mfi` | `ta.mfi` | yes | 28 | 25 | 11 | TA MFI runtime/value behavior changed at cec092f9e3 and earlier MFI parity work; hostile middle-na behavior remains trace-qualified. |
| 31 | `ta.dema` | `dema` | `ta.ema` | no | 640 | 2533 | 9 | No helper-specific runtime-change evidence recorded. |
| 32 | `ta.tema` | `tema` | `ta.ema` | no | 640 | 2533 | 9 | No helper-specific runtime-change evidence recorded. |
| 33 | `hostile.rsi.flat` | `rsi` | `ta.rsi` | no | 332 | 458 | 12 | No helper-specific runtime-change evidence recorded. |
| 34 | `hostile.rsi.multi-middle-na` | `rsi` | `ta.rsi` | no | 332 | 458 | 12 | No helper-specific runtime-change evidence recorded. |
| 35 | `hostile.rsi.signed` | `rsi` | `ta.rsi` | no | 332 | 458 | 12 | No helper-specific runtime-change evidence recorded. |
| 36 | `ta.rsi` | `rsi` | `ta.rsi` | no | 332 | 458 | 12 | No helper-specific runtime-change evidence recorded. |
| 37 | `hostile.stdev.flat` | `stdev` | `ta.stdev` | no | 235 | 422 | 9 | No helper-specific runtime-change evidence recorded. |
| 38 | `hostile.stdev.middle-na` | `stdev` | `ta.stdev` | no | 235 | 422 | 9 | No helper-specific runtime-change evidence recorded. |
| 39 | `hostile.stdev.multi-middle-na` | `stdev` | `ta.stdev` | no | 235 | 422 | 9 | No helper-specific runtime-change evidence recorded. |
| 40 | `ta.stdev` | `stdev` | `ta.stdev` | no | 235 | 422 | 9 | No helper-specific runtime-change evidence recorded. |
| 41 | `ta.stdev.unbiased` | `stdevUnbiased` | `ta.stdev` | no | 235 | 422 | 9 | No helper-specific runtime-change evidence recorded. |
| 42 | `hostile.wma.middle-na` | `wma` | `ta.wma` | no | 163 | 440 | 6 | No helper-specific runtime-change evidence recorded. |
| 43 | `ta.wma` | `wma` | `ta.wma` | no | 163 | 440 | 6 | No helper-specific runtime-change evidence recorded. |
| 44 | `hostile.stoch.zero-range` | `stochastic` | `ta.stoch` | no | 101 | 136 | 10 | No helper-specific runtime-change evidence recorded. |
| 45 | `ta.stoch` | `stochastic` | `ta.stoch` | no | 101 | 136 | 10 | No helper-specific runtime-change evidence recorded. |
| 46 | `priority.ta-vwap-stdev-mult-values` | `anchoredVwapBands` | `ta.vwap` | no | 97 | 110 | 3 | No helper-specific runtime-change evidence recorded. |
| 47 | `hostile.macd.middle-na` | `macd` | `ta.macd` | no | 91 | 105 | 3 | No helper-specific runtime-change evidence recorded. |
| 48 | `ta.macd` | `macd` | `ta.macd` | no | 91 | 105 | 3 | No helper-specific runtime-change evidence recorded. |
| 49 | `hostile.dmi.multi-middle-na` | `dmi` | `ta.dmi` | no | 89 | 87 | 14 | No helper-specific runtime-change evidence recorded. |
| 50 | `ta.adx` | `dmi` | `ta.dmi` | no | 89 | 87 | 14 | No helper-specific runtime-change evidence recorded. |
| 51 | `ta.dmi` | `dmi` | `ta.dmi` | no | 89 | 87 | 14 | No helper-specific runtime-change evidence recorded. |
| 52 | `ta.hma` | `hma` | `ta.hma` | no | 81 | 154 | 5 | No helper-specific runtime-change evidence recorded. |
| 53 | `hostile.supertrend.middle-na` | `supertrend` | `ta.supertrend` | no | 56 | 63 | 8 | No helper-specific runtime-change evidence recorded. |
| 54 | `hostile.supertrend.zero-range` | `supertrend` | `ta.supertrend` | no | 56 | 63 | 8 | No helper-specific runtime-change evidence recorded. |
| 55 | `ta.supertrend` | `supertrend` | `ta.supertrend` | no | 56 | 63 | 8 | No helper-specific runtime-change evidence recorded. |
| 56 | `hostile.linreg.flat` | `linreg` | `ta.linreg` | no | 50 | 102 | 7 | No helper-specific runtime-change evidence recorded. |
| 57 | `hostile.linreg.middle-na` | `linreg` | `ta.linreg` | no | 50 | 102 | 7 | No helper-specific runtime-change evidence recorded. |
| 58 | `ta.linreg` | `linreg` | `ta.linreg` | no | 50 | 102 | 7 | No helper-specific runtime-change evidence recorded. |
| 59 | `ta.kst` | `kst` | `ta.roc` | no | 34 | 96 | 6 | No helper-specific runtime-change evidence recorded. |
| 60 | `hostile.cci.flat` | `cci` | `ta.cci` | no | 31 | 33 | 6 | No helper-specific runtime-change evidence recorded. |
| 61 | `ta.cci` | `cci` | `ta.cci` | no | 31 | 33 | 6 | No helper-specific runtime-change evidence recorded. |
| 62 | `hostile.bb.middle-na` | `bollingerBands` | `ta.bb` | no | 31 | 33 | 7 | No helper-specific runtime-change evidence recorded. |
| 63 | `ta.bb` | `bollingerBands` | `ta.bb` | no | 31 | 33 | 7 | No helper-specific runtime-change evidence recorded. |
| 64 | `ta.mfi.clean-typical-price-values` | `mfiFromSource` | `ta.mfi` | no | 28 | 25 | 11 | No helper-specific runtime-change evidence recorded. |
| 65 | `ta.alma` | `alma` | `ta.alma` | no | 20 | 35 | 7 | No helper-specific runtime-change evidence recorded. |
| 66 | `ta.alma.explicit-floor` | `alma` | `ta.alma` | no | 20 | 35 | 7 | No helper-specific runtime-change evidence recorded. |
| 67 | `hostile.swma.middle-na` | `swma` | `ta.swma` | no | 18 | 17 | 3 | No helper-specific runtime-change evidence recorded. |
| 68 | `ta.swma` | `swma` | `ta.swma` | no | 18 | 17 | 3 | No helper-specific runtime-change evidence recorded. |
| 69 | `hostile.variance.flat` | `variance` | `ta.variance` | no | 17 | 17 | 8 | No helper-specific runtime-change evidence recorded. |
| 70 | `hostile.variance.middle-na` | `variance` | `ta.variance` | no | 17 | 17 | 8 | No helper-specific runtime-change evidence recorded. |
| 71 | `ta.variance` | `variance` | `ta.variance` | no | 17 | 17 | 8 | No helper-specific runtime-change evidence recorded. |
| 72 | `ta.variance.unbiased` | `varianceUnbiased` | `ta.variance` | no | 17 | 17 | 8 | No helper-specific runtime-change evidence recorded. |
| 73 | `ta.obv.source-volume` | `obvWithSourceVolume` | `ta.obv` | no | 15 | 0 | 5 | No helper-specific runtime-change evidence recorded. |
| 74 | `hostile.wpr.zero-range` | `williamsR` | `ta.wpr` | no | 10 | 6 | 10 | No helper-specific runtime-change evidence recorded. |
| 75 | `ta.wpr` | `williamsR` | `ta.wpr` | no | 10 | 6 | 10 | No helper-specific runtime-change evidence recorded. |
| 76 | `hostile.median.flat` | `median` | `ta.median` | no | 9 | 6 | 7 | No helper-specific runtime-change evidence recorded. |
| 77 | `hostile.median.middle-na` | `median` | `ta.median` | no | 9 | 6 | 7 | No helper-specific runtime-change evidence recorded. |
| 78 | `ta.median` | `median` | `ta.median` | no | 9 | 6 | 7 | No helper-specific runtime-change evidence recorded. |
| 79 | `hostile.cmo.middle-na` | `cmo` | `ta.cmo` | no | 9 | 5 | 10 | No helper-specific runtime-change evidence recorded. |
| 80 | `ta.cmo` | `cmo` | `ta.cmo` | no | 9 | 5 | 10 | No helper-specific runtime-change evidence recorded. |
| 81 | `hostile.bbw.flat` | `bollingerWidth` | `ta.bbw` | no | 9 | 4 | 7 | No helper-specific runtime-change evidence recorded. |
| 82 | `ta.bbw` | `bollingerWidth` | `ta.bbw` | no | 9 | 4 | 7 | No helper-specific runtime-change evidence recorded. |
| 83 | `hostile.kc.middle-na` | `keltner` | `ta.kc` | no | 6 | 9 | 8 | No helper-specific runtime-change evidence recorded. |
| 84 | `ta.kc` | `keltner` | `ta.kc` | no | 6 | 9 | 8 | No helper-specific runtime-change evidence recorded. |
| 85 | `ta.kc.high-low-range` | `keltner` | `ta.kc` | no | 6 | 9 | 8 | No helper-specific runtime-change evidence recorded. |
| 86 | `hostile.cog.flat` | `cog` | `ta.cog` | no | 6 | 5 | 6 | No helper-specific runtime-change evidence recorded. |
| 87 | `ta.cog` | `cog` | `ta.cog` | no | 6 | 5 | 6 | No helper-specific runtime-change evidence recorded. |
| 88 | `ta.tsi` | `tsi` | `ta.tsi` | no | 6 | 3 | 13 | No helper-specific runtime-change evidence recorded. |
| 89 | `ta.accdist` | `accdist` | `ta.accdist` | no | 6 | 0 | 1 | No helper-specific runtime-change evidence recorded. |
| 90 | `ta.kcw` | `keltnerWidth` | `ta.kcw` | no | 5 | 1 | 7 | No helper-specific runtime-change evidence recorded. |
| 91 | `ta.kcw.high-low-range` | `keltnerWidth` | `ta.kcw` | no | 5 | 1 | 7 | No helper-specific runtime-change evidence recorded. |
| 92 | `hostile.wvad.zero-range` | `wvad` | `ta.wvad` | no | 4 | 0 | 5 | No helper-specific runtime-change evidence recorded. |

## Helper Summary

| Helper | Rows | Runtime-changed rows | Max corpus scripts | Primary members | Top cases |
| --- | --- | --- | --- | --- | --- |
| `sma` | 6 | 6 | 733 | `ta.sma` | `hostile.sma.middle-na`, `hostile.sma.multi-middle-na`, `language.block-boundary-unary-return-values`, `ta.sma`, `ta.sma.nested-expression-source-order-values` |
| `ema` | 5 | 5 | 640 | `ta.ema` | `hostile.ema.long`, `hostile.ema.long-middle-na`, `hostile.ema.middle-na`, `hostile.ema.multi-middle-na`, `ta.ema` |
| `atr` | 4 | 4 | 594 | `ta.atr` | `hostile.atr.middle-na`, `hostile.atr.multi-middle-na`, `hostile.atr.overlong`, `ta.atr` |
| `highest` | 4 | 4 | 488 | `ta.highest` | `hostile.highest.middle-na`, `hostile.highest.multi-middle-na`, `language.qualifier-helper-chain`, `ta.highest` |
| `lowest` | 2 | 2 | 451 | `ta.lowest` | `hostile.lowest.middle-na`, `ta.lowest` |
| `rma` | 8 | 8 | 156 | `ta.rma` | `hostile.rma.long`, `hostile.rma.long-middle-na`, `hostile.rma.middle-na`, `hostile.rma.multi-middle-na`, `hostile.rma.overlong` |
| `mfi` | 1 | 1 | 28 | `ta.mfi` | `ta.mfi` |
| `dema` | 1 | 0 | 640 | `ta.ema` | `ta.dema` |
| `tema` | 1 | 0 | 640 | `ta.ema` | `ta.tema` |
| `rsi` | 4 | 0 | 332 | `ta.rsi` | `hostile.rsi.flat`, `hostile.rsi.multi-middle-na`, `hostile.rsi.signed`, `ta.rsi` |
| `stdev` | 4 | 0 | 235 | `ta.stdev` | `hostile.stdev.flat`, `hostile.stdev.middle-na`, `hostile.stdev.multi-middle-na`, `ta.stdev` |
| `stdevUnbiased` | 1 | 0 | 235 | `ta.stdev` | `ta.stdev.unbiased` |
| `wma` | 2 | 0 | 163 | `ta.wma` | `hostile.wma.middle-na`, `ta.wma` |
| `stochastic` | 2 | 0 | 101 | `ta.stoch` | `hostile.stoch.zero-range`, `ta.stoch` |
| `anchoredVwapBands` | 1 | 0 | 97 | `ta.vwap` | `priority.ta-vwap-stdev-mult-values` |
| `macd` | 2 | 0 | 91 | `ta.macd` | `hostile.macd.middle-na`, `ta.macd` |
| `dmi` | 3 | 0 | 89 | `ta.dmi` | `hostile.dmi.multi-middle-na`, `ta.adx`, `ta.dmi` |
| `hma` | 1 | 0 | 81 | `ta.hma` | `ta.hma` |
| `supertrend` | 3 | 0 | 56 | `ta.supertrend` | `hostile.supertrend.middle-na`, `hostile.supertrend.zero-range`, `ta.supertrend` |
| `linreg` | 3 | 0 | 50 | `ta.linreg` | `hostile.linreg.flat`, `hostile.linreg.middle-na`, `ta.linreg` |
| `kst` | 1 | 0 | 34 | `ta.roc` | `ta.kst` |
| `bollingerBands` | 2 | 0 | 31 | `ta.bb` | `hostile.bb.middle-na`, `ta.bb` |
| `cci` | 2 | 0 | 31 | `ta.cci` | `hostile.cci.flat`, `ta.cci` |
| `mfiFromSource` | 1 | 0 | 28 | `ta.mfi` | `ta.mfi.clean-typical-price-values` |
| `alma` | 2 | 0 | 20 | `ta.alma` | `ta.alma`, `ta.alma.explicit-floor` |
| `swma` | 2 | 0 | 18 | `ta.swma` | `hostile.swma.middle-na`, `ta.swma` |
| `variance` | 3 | 0 | 17 | `ta.variance` | `hostile.variance.flat`, `hostile.variance.middle-na`, `ta.variance` |
| `varianceUnbiased` | 1 | 0 | 17 | `ta.variance` | `ta.variance.unbiased` |
| `obvWithSourceVolume` | 1 | 0 | 15 | `ta.obv` | `ta.obv.source-volume` |
| `williamsR` | 2 | 0 | 10 | `ta.wpr` | `hostile.wpr.zero-range`, `ta.wpr` |
| `median` | 3 | 0 | 9 | `ta.median` | `hostile.median.flat`, `hostile.median.middle-na`, `ta.median` |
| `bollingerWidth` | 2 | 0 | 9 | `ta.bbw` | `hostile.bbw.flat`, `ta.bbw` |
| `cmo` | 2 | 0 | 9 | `ta.cmo` | `hostile.cmo.middle-na`, `ta.cmo` |
| `keltner` | 3 | 0 | 6 | `ta.kc` | `hostile.kc.middle-na`, `ta.kc`, `ta.kc.high-low-range` |
| `cog` | 2 | 0 | 6 | `ta.cog` | `hostile.cog.flat`, `ta.cog` |
| `accdist` | 1 | 0 | 6 | `ta.accdist` | `ta.accdist` |
| `tsi` | 1 | 0 | 6 | `ta.tsi` | `ta.tsi` |
| `keltnerWidth` | 2 | 0 | 5 | `ta.kcw` | `ta.kcw`, `ta.kcw.high-low-range` |
| `wvad` | 1 | 0 | 4 | `ta.wvad` | `hostile.wvad.zero-range` |

## Closed Residuals

`pine-value-vector-helper-provenance-audit-v1` closed the seven residual known-counterexample/long-float rows before this ranking. Extrema-bars and visual hline were genuinely wrong or stale observed-output oracles and are now corrected. The three long-float strategy rows decompose to documented arithmetic over committed bars, so a long float literal is not automatically evidence that a value was copied from engine output.
