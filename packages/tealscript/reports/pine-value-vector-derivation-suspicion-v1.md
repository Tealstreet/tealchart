# Pine Value Vector Derivation Suspicion Audit v1

Generated: 2026-09-12T05:45:45.000Z
Measured source commit: `affebaee44c513cbb67db81e9ba3c187a866b83e` with this audit script/report dirty in the worktree.

## Purpose

This report audits the gap between two different claims:

- The existing oracle-provenance report proves `0` value expectations call the TealScript execution path.
- It does not prove every expected value was actually derived from the cited documentation or formula.

Two corrected counterexamples prove that distinction matters: the extrema-bars/Aroon vectors carried a wrong positive-offset oracle hidden by a compensating Aroon wrapper bug, and two visual hline vectors expected old zero-length hline outputs until the hline payload fix made them fail.

This audit does not re-derive every vector. It hunts shapes that can encode observed engine behavior while still carrying a citation: empty output arrays, all-null/all-zero expected series, complex local-helper expectations, long copied-looking float literals, and the two known counterexample families.

## Classifier Verdict

`reports/pine-value-vector-oracle-provenance-v7.md` classifies a value expectation as engine-derived only when its expectation source calls TealScript execution functions such as `executeScript`, `executeCompiled`, `tryCompile`, `runCase`, or prior vector output. That rule would not have caught either hline stale-`[]` expectations or the wrong-sign extrema-bars/Aroon expectation: both were local constants/helpers with live citations. The citation/source-provenance gate likewise verifies that a source is named, not that the expected values were derived correctly from it.

## Headline

- Cases scanned: 989.
- Cases flagged for derivation audit by shape: 433/989 (43.78%).
- Cases not flagged by this shape audit: 556/989 (56.22%).

A flagged case is not a wrong oracle. It is a case this automated audit cannot confirm as independently derived without reading or re-deriving the expectation. The finding is the size and clustering of that unverified fraction.

## By Reason

| Reason | Cases |
| --- | ---: |
| `all-null-series` | 272 |
| `complex-local-helper` | 129 |
| `all-zero-series` | 38 |
| `known-wrong-oracle-counterexample` | 5 |
| `long-float-literal` | 3 |

## By Source Family

| Rank | Family | Cases | Examples |
| ---: | --- | ---: | --- |
| 1 | `ta` | 296 | `ta.iii`, `ta.wvad`, `ta.accdist`, `ta.adx`, `ta.alma`, `ta.alma.explicit-floor`, `ta.atr`, `ta.bb` |
| 2 | `hostile` | 71 | `hostile.atr.overlong`, `hostile.bbw.flat`, `hostile.cci.flat`, `hostile.cog.flat`, `hostile.iii.all-na`, `hostile.obv.all-na`, `hostile.pvt.all-na`, `hostile.rma.overlong` |
| 3 | `language` | 11 | `language.and-short-circuit-skips-error`, `language.block-boundary-unary-return-values`, `language.bool-history-missing-is-false`, `language.enum-display-string-values`, `language.global-history-offset-boundaries`, `language.if-bool-no-branch-is-false`, `language.if-number-no-branch-is-na`, `language.qualifier-helper-chain` |
| 4 | `priority` | 8 | `priority.array-udt-sort-field-values`, `priority.input-confirm-display-edge-values`, `priority.plotarrow-metadata-depth-values`, `priority.plotchar-metadata-depth-values`, `priority.strategy-exit-trailing-metadata-values`, `priority.ta-vwap-stdev-mult-values`, `priority.ta-workhorse-history-values`, `priority.visual-output-metadata-values` |
| 5 | `property` | 6 | `property.single.map.clear`, `property.single.map.new`, `property.single.strategy.closedtrades.profit_percent`, `property.single.strategy.no-trade-percent-metrics`, `property.single.strategy.open-entry-values`, `property.single.strategy.runup-drawdown-zero` |
| 6 | `strategy` | 6 | `strategy.aggregate-performance-values`, `strategy.cancel-all-pending-values`, `strategy.opentrades-timing-percent-values`, `strategy.partial-exit-average-price-values`, `strategy.trade-percent-values`, `strategy.trade-runup-drawdown-values` |
| 7 | `runtime` | 5 | `runtime.barstate-historical-flags`, `runtime.barstate-lastconfirmedhistory-closed-market`, `runtime.chart-context-values`, `runtime.syminfo-provider-metadata-values`, `runtime.timeframe-conversion-change-values` |
| 8 | `tradingview-ta` | 5 | `tradingview-ta.aroon.v7`, `tradingview-ta.chandelier.v12`, `tradingview-ta.donchian.v7`, `tradingview-ta.ppo.v12`, `tradingview-ta.trix.v12` |
| 9 | `array` | 4 | `array.advanced-search-fill-values`, `array.bool-and-constructor-values`, `array.persistent-get`, `array.search-sort-values` |
| 10 | `optional` | 4 | `optional.strategy-entry-stop-metadata-arguments`, `optional.strategy-exit-unreached-price-arguments`, `optional.strategy-order-stop-metadata-arguments`, `optional.visual-high-use-plotchar-size` |
| 11 | `version` | 4 | `version.v3-bool-to-number-rejected`, `version.v4-untyped-na-declaration-rejected`, `version.v5-generic-input-type-rejected`, `version.v5-global-sma-rejected` |
| 12 | `visual` | 4 | `visual.bgcolor-barcolor-metadata-values`, `visual.constant-identity-values`, `visual.marker-candle-metadata-values`, `visual.plot-hline-fill-metadata-values` |
| 13 | `depth` | 3 | `depth.array-receiver-destructive-values`, `depth.math-composed-workhorse-values`, `depth.ta-named-workhorse-values` |
| 14 | `udf` | 3 | `udf.barssince.call-sites-hostile`, `udf.ta.call-sites`, `udf.valuewhen.call-sites-hostile` |
| 15 | `domain` | 1 | `domain.array-slice-descending-range-rejection` |
| 16 | `matrix` | 1 | `matrix.range-fill-sort-column-values` |
| 17 | `request` | 1 | `request.ignore-invalid-options` |

## Known Counterexamples

| Case | Reason |
| --- | --- |
| `tradingview-ta.aroon.v7` | known family where citation/source-presence audit did not prove the expected values were correctly derived; expectation calls local helper(s): aroon |
| `ta.highestbars` | known family where citation/source-presence audit did not prove the expected values were correctly derived |
| `ta.lowestbars` | known family where citation/source-presence audit did not prove the expected values were correctly derived |
| `visual.constant-identity-values` | known family where citation/source-presence audit did not prove the expected values were correctly derived |
| `visual.plot-hline-fill-metadata-values` | known family where citation/source-presence audit did not prove the expected values were correctly derived |

## Top Flagged Rows

| Case | Family | Reasons | Detail |
| --- | --- | --- | --- |
| `hostile.atr.overlong` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): atr |
| `hostile.bbw.flat` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): bollingerWidth |
| `hostile.cci.flat` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): cci |
| `hostile.cog.flat` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): cog |
| `hostile.iii.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): iii |
| `hostile.obv.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): obv |
| `hostile.pvt.all-na` | `hostile` | `all-zero-series`, `complex-local-helper` | expected output series 0 are all zero; expectation calls local helper(s): pvt |
| `hostile.rma.overlong` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): rma |
| `hostile.wad.all-na` | `hostile` | `all-zero-series`, `complex-local-helper` | expected output series 0 are all zero; expectation calls local helper(s): wad |
| `hostile.wvad.all-na` | `hostile` | `all-null-series`, `complex-local-helper` | expected output series 0 are all null; expectation calls local helper(s): wvad |
| `request.ignore-invalid-options` | `request` | `all-null-series`, `all-zero-series` | expected output series 0, 3, 4, 5, 6, 7, 8 are all null; expected output series 1, 2 are all zero |
| `ta.iii` | `ta` | `all-zero-series`, `complex-local-helper` | expected output series 0 are all zero; expectation calls local helper(s): iii |
| `ta.wvad` | `ta` | `all-zero-series`, `complex-local-helper` | expected output series 0 are all zero; expectation calls local helper(s): wvad |
| `tradingview-ta.aroon.v7` | `tradingview-ta` | `known-wrong-oracle-counterexample`, `complex-local-helper` | known family where citation/source-presence audit did not prove the expected values were correctly derived; expectation calls local helper(s): aroon |
| `array.advanced-search-fill-values` | `array` | `all-zero-series` | expected output series 3, 6 are all zero |
| `array.bool-and-constructor-values` | `array` | `all-zero-series` | expected output series 1 are all zero |
| `array.persistent-get` | `array` | `all-zero-series` | expected output series 0 are all zero |
| `array.search-sort-values` | `array` | `all-zero-series` | expected output series 1 are all zero |
| `depth.array-receiver-destructive-values` | `depth` | `all-zero-series` | expected output series 1, 3 are all zero |
| `depth.math-composed-workhorse-values` | `depth` | `all-zero-series` | expected output series 0 are all zero |
| `depth.ta-named-workhorse-values` | `depth` | `complex-local-helper` | expectation calls local helper(s): atr, ema, highest, lowest, sma |
| `domain.array-slice-descending-range-rejection` | `domain` | `all-null-series` | expected output series 0 are all null |
| `hostile.atr.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): atr |
| `hostile.atr.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): atr |
| `hostile.bb.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): bollingerBands |
| `hostile.cmo.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): cmo |
| `hostile.correlation.flat` | `hostile` | `all-null-series` | expected output series 0 are all null |
| `hostile.dmi.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): dmi |
| `hostile.ema.long` | `hostile` | `complex-local-helper` | expectation calls local helper(s): ema |
| `hostile.ema.long-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): ema |
| `hostile.ema.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): ema |
| `hostile.ema.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): ema |
| `hostile.highest.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): highest |
| `hostile.highest.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): highest |
| `hostile.iii.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): iii |
| `hostile.iii.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): iii |
| `hostile.iii.zero-range` | `hostile` | `complex-local-helper` | expectation calls local helper(s): iii |
| `hostile.kc.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): keltner |
| `hostile.linreg.flat` | `hostile` | `complex-local-helper` | expectation calls local helper(s): linreg |
| `hostile.linreg.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): linreg |
| `hostile.lowest.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): lowest |
| `hostile.macd.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): macd |
| `hostile.median.flat` | `hostile` | `complex-local-helper` | expectation calls local helper(s): median |
| `hostile.median.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): median |
| `hostile.mfi.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): mfi |
| `hostile.nvi.all-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): nvi |
| `hostile.nvi.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): nvi |
| `hostile.nvi.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): nvi |
| `hostile.obv.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): obv |
| `hostile.obv.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): obv |
| `hostile.pvi.all-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): pvi |
| `hostile.pvi.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): pvi |
| `hostile.pvi.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): pvi |
| `hostile.pvt.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): pvt |
| `hostile.pvt.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): pvt |
| `hostile.range.length1-plateau` | `hostile` | `all-zero-series` | expected output series 0 are all zero |
| `hostile.rma.long` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rma |
| `hostile.rma.long-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rma |
| `hostile.rma.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rma |
| `hostile.rma.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rma |
| `hostile.rma.synthetic.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rma |
| `hostile.rsi.flat` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rsi |
| `hostile.rsi.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rsi |
| `hostile.rsi.signed` | `hostile` | `complex-local-helper` | expectation calls local helper(s): rsi |
| `hostile.sma.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): sma |
| `hostile.sma.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): sma |
| `hostile.sma.overlong` | `hostile` | `all-null-series` | expected output series 0 are all null |
| `hostile.stdev.flat` | `hostile` | `complex-local-helper` | expectation calls local helper(s): stdev |
| `hostile.stdev.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): stdev |
| `hostile.stdev.multi-middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): stdev |
| `hostile.stoch.zero-range` | `hostile` | `complex-local-helper` | expectation calls local helper(s): stochastic |
| `hostile.supertrend.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): supertrend |
| `hostile.supertrend.zero-range` | `hostile` | `complex-local-helper` | expectation calls local helper(s): supertrend |
| `hostile.swma.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): swma |
| `hostile.variance.flat` | `hostile` | `complex-local-helper` | expectation calls local helper(s): variance |
| `hostile.variance.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): variance |
| `hostile.wad.leading-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): wad |
| `hostile.wad.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): wad |
| `hostile.wma.middle-na` | `hostile` | `complex-local-helper` | expectation calls local helper(s): wma |
| `hostile.wpr.zero-range` | `hostile` | `complex-local-helper` | expectation calls local helper(s): williamsR |

## Interpretation

The existing provenance claims are true under their narrow definitions, but the state doc should not read them as a stronger guarantee that every expected value is independently sound. The suite has no frozen TealScript execution snapshots, and every case has a citation/local-extension marker; nevertheless this audit flags a large derivation-review queue. The priority is not to re-derive all flagged rows immediately. The priority is to stop using citation presence as proof of derivation and to route the largest flagged families first when confidence matters.
