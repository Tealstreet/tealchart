# Pine Value Vector Discrimination Audit v1

Generated: 2026-09-12T06:40:00.000Z
Measured source commit: `de05f5ebea90572990f7ec7cd228f9bfbf636d1b` with this audit script/report dirty in the worktree.

## Purpose

`pine-value-vector-derivation-suspicion-v1` flagged 433 cases by shape. This follow-up narrows that suspicion list without re-deriving all 433 expected values. It asks the cheap discriminating questions: do all-null/all-zero expectations assert series length, do local helpers overlap the runtime model, and what would a red-first requirement cost?

## Headline

- Flagged rows reviewed: 433.
- Vacuous rows by comparator shape: 0.
- Self-judging/model-overlap rows: 129.
- Actual shared runtime-code rows: 0.
- Confirmed sound by this narrow discrimination audit: 297.

A confirmed-sound row here is only confirmed against the failure shapes in this report. It is not a claim that the expected value was independently re-derived from the cited source.

## All-Null Series

- Rows with all-null expected series: 272.
- Rows whose all-null series assert the full bar-count length: 271.
- Rows whose all-null series are length-discriminating against empty output: 272.
- Length-discriminating but not full-bar-length rows: 1.
- Vacuous all-null rows: 0.
- Vacuous split: documented/cited 0, unconfirmed observed-shape 0.

Because the matcher requires actual and expected series lengths to be identical, a full-length all-null vector is not the hline stale-`[]` failure shape. An engine that emits nothing does not match 240 nulls, 12 nulls, or any other non-empty expected series.

## All-Zero Series

- Rows with all-zero expected series: 38.
- Rows whose all-zero series assert the full bar-count length: 38.
- Rows whose all-zero series are length-discriminating against empty output: 38.
- Vacuous all-zero rows: 0.
- Vacuous split: documented/cited 0, unconfirmed observed-shape 0.

Zero remains a useful suspicion marker because it can encode an unset accumulator, but the current all-zero cases are not comparator-vacuous: they carry non-empty expected series, and every row in this set asserts full bar-count length.

## Dominant Clusters

| Cluster | Flagged | Vacuous | Self-judging/model overlap | Confirmed by narrowing |
| --- | ---: | ---: | ---: | ---: |
| `ta` | 296 | 0 | 50 | 244 |
| `hostile` | 71 | 0 | 68 | 3 |

## Local Helper Ranking

Actual shared runtime code means the expectation source calls the TealScript execution path or imports runtime outputs. Parallel helper model means the case expectation calls a local helper whose formula family is also implemented by runtime or official-library code. The second is the dangerous extrema-bars/Aroon shape even when no function is literally shared.

| Rank | Helper | Cases | Runtime-parallel model | Actual shared runtime code | Examples |
| ---: | --- | ---: | --- | --- | --- |
| 1 | `rma` | 9 | yes | no | `hostile.rma.overlong`, `hostile.rma.long`, `hostile.rma.long-middle-na`, `hostile.rma.middle-na`, `hostile.rma.multi-middle-na`, `hostile.rma.synthetic.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.rma` |
| 2 | `sma` | 8 | yes | no | `depth.ta-named-workhorse-values`, `hostile.sma.middle-na`, `hostile.sma.multi-middle-na`, `language.block-boundary-unary-return-values`, `priority.ta-workhorse-history-values`, `ta.sma`, `ta.sma.nested-expression-source-order-values`, `udf.ta.call-sites` |
| 3 | `ema` | 7 | yes | no | `depth.ta-named-workhorse-values`, `hostile.ema.long`, `hostile.ema.long-middle-na`, `hostile.ema.middle-na`, `hostile.ema.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.ema` |
| 4 | `atr` | 6 | yes | no | `hostile.atr.overlong`, `depth.ta-named-workhorse-values`, `hostile.atr.middle-na`, `hostile.atr.multi-middle-na`, `priority.ta-workhorse-history-values`, `ta.atr` |
| 5 | `highest` | 6 | yes | no | `depth.ta-named-workhorse-values`, `hostile.highest.middle-na`, `hostile.highest.multi-middle-na`, `language.qualifier-helper-chain`, `priority.ta-workhorse-history-values`, `ta.highest` |
| 6 | `iii` | 5 | yes | no | `hostile.iii.all-na`, `ta.iii`, `hostile.iii.leading-na`, `hostile.iii.middle-na`, `hostile.iii.zero-range` |
| 7 | `rsi` | 5 | yes | no | `hostile.rsi.flat`, `hostile.rsi.multi-middle-na`, `hostile.rsi.signed`, `priority.ta-workhorse-history-values`, `ta.rsi` |
| 8 | `wvad` | 5 | yes | no | `hostile.wvad.all-na`, `ta.wvad`, `hostile.wvad.leading-na`, `hostile.wvad.middle-na`, `hostile.wvad.zero-range` |
| 9 | `lowest` | 4 | yes | no | `depth.ta-named-workhorse-values`, `hostile.lowest.middle-na`, `priority.ta-workhorse-history-values`, `ta.lowest` |
| 10 | `nvi` | 4 | yes | no | `hostile.nvi.all-na`, `hostile.nvi.leading-na`, `hostile.nvi.middle-na`, `ta.nvi` |
| 11 | `obv` | 4 | yes | no | `hostile.obv.all-na`, `hostile.obv.leading-na`, `hostile.obv.middle-na`, `ta.obv` |
| 12 | `pvi` | 4 | yes | no | `hostile.pvi.all-na`, `hostile.pvi.leading-na`, `hostile.pvi.middle-na`, `ta.pvi` |
| 13 | `pvt` | 4 | yes | no | `hostile.pvt.all-na`, `hostile.pvt.leading-na`, `hostile.pvt.middle-na`, `ta.pvt` |
| 14 | `stdev` | 4 | yes | no | `hostile.stdev.flat`, `hostile.stdev.middle-na`, `hostile.stdev.multi-middle-na`, `ta.stdev` |
| 15 | `wad` | 4 | yes | no | `hostile.wad.all-na`, `hostile.wad.leading-na`, `hostile.wad.middle-na`, `ta.wad` |
| 16 | `dmi` | 3 | yes | no | `hostile.dmi.multi-middle-na`, `ta.adx`, `ta.dmi` |
| 17 | `keltner` | 3 | yes | no | `hostile.kc.middle-na`, `ta.kc`, `ta.kc.high-low-range` |
| 18 | `linreg` | 3 | yes | no | `hostile.linreg.flat`, `hostile.linreg.middle-na`, `ta.linreg` |
| 19 | `median` | 3 | yes | no | `hostile.median.flat`, `hostile.median.middle-na`, `ta.median` |
| 20 | `supertrend` | 3 | yes | no | `hostile.supertrend.middle-na`, `hostile.supertrend.zero-range`, `ta.supertrend` |
| 21 | `variance` | 3 | yes | no | `hostile.variance.flat`, `hostile.variance.middle-na`, `ta.variance` |
| 22 | `wma` | 3 | yes | no | `hostile.wma.middle-na`, `priority.ta-workhorse-history-values`, `ta.wma` |
| 23 | `alma` | 2 | yes | no | `ta.alma`, `ta.alma.explicit-floor` |
| 24 | `bollingerBands` | 2 | yes | no | `hostile.bb.middle-na`, `ta.bb` |
| 25 | `bollingerWidth` | 2 | yes | no | `hostile.bbw.flat`, `ta.bbw` |
| 26 | `cci` | 2 | yes | no | `hostile.cci.flat`, `ta.cci` |
| 27 | `cmo` | 2 | yes | no | `hostile.cmo.middle-na`, `ta.cmo` |
| 28 | `cog` | 2 | yes | no | `hostile.cog.flat`, `ta.cog` |
| 29 | `keltnerWidth` | 2 | yes | no | `ta.kcw`, `ta.kcw.high-low-range` |
| 30 | `macd` | 2 | yes | no | `hostile.macd.middle-na`, `ta.macd` |

## Narrowed Rows

| Case | Family | Original reasons | Narrow verdict | Helpers |
| --- | --- | --- | --- | --- |
| `hostile.atr.overlong` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `atr` |
| `hostile.bbw.flat` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `bollingerWidth` |
| `hostile.cci.flat` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `cci` |
| `hostile.cog.flat` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `cog` |
| `hostile.iii.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `iii` |
| `hostile.obv.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `obv` |
| `hostile.pvt.all-na` | `hostile` | `all-zero-series`, `complex-local-helper` | self-judging/model-overlap risk | `pvt` |
| `hostile.rma.overlong` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.wad.all-na` | `hostile` | `all-zero-series`, `complex-local-helper` | self-judging/model-overlap risk | `wad` |
| `hostile.wvad.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | self-judging/model-overlap risk | `wvad` |
| `request.ignore-invalid-options` | `request` | `all-null-series`, `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `ta.iii` | `ta` | `all-zero-series`, `complex-local-helper` | self-judging/model-overlap risk | `iii` |
| `ta.wvad` | `ta` | `all-zero-series`, `complex-local-helper` | self-judging/model-overlap risk | `wvad` |
| `tradingview-ta.aroon.v7` | `tradingview-ta` | `known-wrong-oracle-counterexample`, `complex-local-helper` | self-judging/model-overlap risk | `aroon` |
| `array.advanced-search-fill-values` | `array` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `array.bool-and-constructor-values` | `array` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `array.persistent-get` | `array` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `array.search-sort-values` | `array` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `depth.array-receiver-destructive-values` | `depth` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `depth.math-composed-workhorse-values` | `depth` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `depth.ta-named-workhorse-values` | `depth` | `complex-local-helper` | self-judging/model-overlap risk | `atr`, `ema`, `highest`, `lowest`, `sma` |
| `domain.array-slice-descending-range-rejection` | `domain` | `all-null-series` | confirmed sound by length/comparator narrowing | - |
| `hostile.atr.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `atr` |
| `hostile.atr.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `atr` |
| `hostile.bb.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `bollingerBands` |
| `hostile.cmo.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `cmo` |
| `hostile.correlation.flat` | `hostile` | `all-null-series` | confirmed sound by length/comparator narrowing | - |
| `hostile.dmi.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `dmi` |
| `hostile.ema.long` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `ema` |
| `hostile.ema.long-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `ema` |
| `hostile.ema.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `ema` |
| `hostile.ema.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `ema` |
| `hostile.highest.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `highest` |
| `hostile.highest.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `highest` |
| `hostile.iii.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `iii` |
| `hostile.iii.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `iii` |
| `hostile.iii.zero-range` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `iii` |
| `hostile.kc.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `keltner` |
| `hostile.linreg.flat` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `linreg` |
| `hostile.linreg.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `linreg` |
| `hostile.lowest.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `lowest` |
| `hostile.macd.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `macd` |
| `hostile.median.flat` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `median` |
| `hostile.median.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `median` |
| `hostile.mfi.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `mfi` |
| `hostile.nvi.all-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `nvi` |
| `hostile.nvi.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `nvi` |
| `hostile.nvi.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `nvi` |
| `hostile.obv.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `obv` |
| `hostile.obv.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `obv` |
| `hostile.pvi.all-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `pvi` |
| `hostile.pvi.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `pvi` |
| `hostile.pvi.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `pvi` |
| `hostile.pvt.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `pvt` |
| `hostile.pvt.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `pvt` |
| `hostile.range.length1-plateau` | `hostile` | `all-zero-series` | confirmed sound by length/comparator narrowing | - |
| `hostile.rma.long` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.rma.long-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.rma.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.rma.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.rma.synthetic.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rma` |
| `hostile.rsi.flat` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rsi` |
| `hostile.rsi.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rsi` |
| `hostile.rsi.signed` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `rsi` |
| `hostile.sma.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `sma` |
| `hostile.sma.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `sma` |
| `hostile.sma.overlong` | `hostile` | `all-null-series` | confirmed sound by length/comparator narrowing | - |
| `hostile.stdev.flat` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `stdev` |
| `hostile.stdev.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `stdev` |
| `hostile.stdev.multi-middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `stdev` |
| `hostile.stoch.zero-range` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `stochastic` |
| `hostile.supertrend.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `supertrend` |
| `hostile.supertrend.zero-range` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `supertrend` |
| `hostile.swma.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `swma` |
| `hostile.variance.flat` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `variance` |
| `hostile.variance.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `variance` |
| `hostile.wad.leading-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `wad` |
| `hostile.wad.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `wad` |
| `hostile.wma.middle-na` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `wma` |
| `hostile.wpr.zero-range` | `hostile` | `complex-local-helper` | self-judging/model-overlap risk | `williamsR` |

## Structural Fix Cost

- Cheap comparator red-first: add a generic discriminator pass that mutates expected outputs, drops one output series, truncates a series, flips the first finite/null/zero value, and requires the case to fail. Cost: about half a day to one day because the matcher already exposes expected outputs and mismatch details. This would permanently guard the hline stale-`[]` class.
- Metadata guard: require cases with all-null/all-zero/empty expected series to declare why the shape is intentional and whether full bar-count length is asserted. Cost: about one day to wire and annotate the small exceptional set.
- Semantic red-first for helper-derived formulas: require an independent mutation or second derivation for local-helper cases, especially TA and hostile-TA. Cost: several days for the top helpers and substantially more for all 129 helper rows, because each formula needs a meaningful wrong-model mutation rather than a mechanical comparator mutation.
- Recommended first step: land the generic comparator mutation guard and metadata guard before re-deriving helpers. It is cheap, catches the known stale-empty-output family, and turns future vectors red if they only prove shape compatibility rather than value behavior.
