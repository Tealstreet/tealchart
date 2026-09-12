> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Dispatch Buckets

Source report: `external-pine-corpus-v4.report.json`. This deepens the six top v4 causes into dispatchable work queues. Rows are pinned by repo, path, and commit SHA. Snippets are reduced originals for reproduction, not copied source bodies.

## Top Six Counts

| Priority | Cause | Count | Stage |
| ---: | --- | ---: | --- |
| 1 | unresolved-import | 26 | semantic |
| 2 | unexpected-token | 31 | parse |
| 3 | type-mismatch | 16 | semantic |
| 4 | duplicate-symbol | 8 | semantic |
| 5 | global-output-declared-but-not-evaluated | 8 | output |
| 6 | unknown-identifier | 8 | semantic |

## 1. unresolved-import

Count: 26

Minimal reproducer:

```pine
//@version=6
indicator("import registry miss")
import TradingView/ta/12 as tvta
plot(tvta.rma2(close, 14))
```

The 26 unresolved-import diagnostics split into 7 official rows and 19
user-authored rows. Only the official rows are an implementation queue;
user-authored imports are unsupported-by-design under TealScript's current
library policy.

Official TradingView import queue, deduped by specifier and alias:

| Count | Specifier | Alias | Rows |
| ---: | --- | --- | --- |
| 3 | `TradingView/ta/12` | `unknown` | sources/0202__regalouisei-collect-tradingview__strategic-trend-filter.pine @ 5847fd3b4754<br>sources/0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine @ 5847fd3b4754<br>sources/0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine @ 5847fd3b4754 |
| 3 | `TradingView/ta/8` | `unknown` | sources/0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine @ eadfefeac6a7<br>sources/0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine @ eadfefeac6a7<br>sources/0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine @ 479ea44f7bb3 |
| 1 | `TradingView/ta/1` | `ta_lib` | sources/0358__folknor-pine-tools__imports.pine @ 8c7cbbbde84d |

User-authored unresolved imports, excluded as unsupported-by-design (19 rows
across 16 specifier/alias buckets):

| Count | Specifier | Alias | Official | Rows |
| ---: | --- | --- | --- | --- |
| 4 | `user/udt/1` | `lib` | no | sources/0217__helenananaa-pine-compat-runtime__unsupported_imported_udt_array_from_method_return_qualifier.pine @ 0e4f409acbab<br>sources/0583__helenananaa-pine-compat-runtime__unsupported_imported_udt_varip.pine @ 0e4f409acbab<br>sources/0584__helenananaa-pine-compat-runtime__import_udt_typed_udf_params.pine @ 0e4f409acbab<br>sources/0585__helenananaa-pine-compat-runtime__unsupported_imported_udt_array_push_local_target_method_mixed_identity.pine @ 0e4f409acbab |
| 3 | `TradingView/ta/12` | `unknown` | yes | sources/0202__regalouisei-collect-tradingview__strategic-trend-filter.pine @ 5847fd3b4754<br>sources/0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine @ 5847fd3b4754<br>sources/0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine @ 5847fd3b4754 |
| 3 | `TradingView/ta/8` | `unknown` | yes | sources/0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine @ eadfefeac6a7<br>sources/0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine @ eadfefeac6a7<br>sources/0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine @ 479ea44f7bb3 |
| 1 | `BlueprintResearch/lib_ephemeris/1` | `eph` | no | sources/0037__BlueprintResearch-Gann-and-Financial-Astrology-Indicators__gann-square-of-nine-planetary-degrees.pine @ 1564a99a4f41 |
| 1 | `cybermediaboy/CyberCausalityLib/10` | `CL` | no | sources/0123__cybermediaboy-indicators__m3f_te-research_v0.4.4.pine @ f592ecde5cd5 |
| 1 | `DarkWaveAlgo/DarkWaveColorThemes/1` | `ColorThemes` | no | sources/0639__btcjon-pine__ttb_entry_main2.pine @ 43413c465752 |
| 1 | `drebel/DRELib/35` | `drelib` | no | sources/0296__drebel7-TradingView__DRE-Non-Broken-lows-and-highs.pine @ 5929ff5e02f7 |
| 1 | `jason5480/series_collection/4` | `col` | no | sources/0449__folknor-pine-tools__A-k4.pine @ b5f8984922cf |
| 1 | `jdehorty/KernelFunctions/2` | `kernels` | no | sources/0623__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ESTIMATIONS_10M.PINE @ b6b6f454c641 |
| 1 | `jonathanmoletta17/MapUtilsLib/1` | `map` | no | sources/0424__jonathan-nascimento51-tradeCripto2025__map_utils_lib_test.pine @ 62ef61c811e7 |
| 1 | `PineCoders/VisibleChart/4` | `VisibleChart` | no | sources/0629__deepentropy-oakscriptJS__Dynamic-Supply-and-Demand-Zones-AlgoAlpha-.pine @ d7bbd272e9ba |
| 1 | `robbatt/lib_profile/44` | `PF` | no | sources/0388__folknor-pine-tools__q01-vardecl-anchor.pine @ 68907b82c9ec |
| 1 | `SimpleCryptoLife/HighTimeframeSampling/4` | `SCL_HTF` | no | sources/0173__Focal-QuantAI-QuantAI-Blog__AbVe_KnGK7Iuuhwb77Ul_code.pine @ 7c878f1e0c7a |
| 1 | `Steversteves/SPTS_StatsPakLib/4` | `spts` | no | sources/0635__regalouisei-collect-tradingview__anova-macd.pine @ 5847fd3b4754 |
| 1 | `TradingView/ta/1` | `ta_lib` | yes | sources/0358__folknor-pine-tools__imports.pine @ 8c7cbbbde84d |
| 1 | `Trendoscope/Drawing/2` | `dr` | no | sources/0079__regalouisei-collect-tradingview__recursive-reversal-chart-patterns-trendoscope.pine @ 5847fd3b4754 |
| 1 | `uminomae/pjdhiro_ma_v6/2` | `ma` | no | sources/0143__uminomae-pjdhiro__pjdhiro_sma3_bb_indicator_v6.pine @ 0383f24eff57 |
| 1 | `user/udt/1` | `left` | no | sources/0447__helenananaa-pine-compat-runtime__import_user_method_matrix_call_result_reads.pine @ ab3ccbea61b5 |
| 1 | `yesgoods/quant/1` | `quant` | no | sources/0478__hirawatt-pineScripts__iHotelIndex.pine @ 2df0c2f9ef72 |

The audited v4 baseline source report is 512 supported, 53 TealScript gaps, 55
invalid Pine, 19 unsupported-by-design, and 11 corpus-hygiene rows. The latest
fixed-corpus engine delta is recorded in `external-pine-corpus-v4.engine-delta-v1.md`
and `.json`; its normalized result is 516 supported, 42 TealScript gaps, 61
invalid Pine, 20 unsupported-by-design, and 11 corpus-hygiene rows.
Unresolved-import is a 26-row diagnostic cause in the baseline, not a
26-row official library work queue.

All unresolved-import rows, including the excluded user-authored rows:

- sources/0037__BlueprintResearch-Gann-and-Financial-Astrology-Indicators__gann-square-of-nine-planetary-degrees.pine (6 indicator, unsupported-by-design) - https://github.com/BlueprintResearch/Gann-and-Financial-Astrology-Indicators :: scripts/gann square of nine: planetary degrees.pine @ 1564a99a4f41
  - Diagnostic: 70:1: unresolved-import: Import 'BlueprintResearch/lib_ephemeris/1' as alias 'eph' was not supplied by the host library registry; provide Pine library source for BlueprintResearch/lib_ephemeris version 1, or remove/change the import
- sources/0079__regalouisei-collect-tradingview__recursive-reversal-chart-patterns-trendoscope.pine (6 indicator, unsupported-by-design) - https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/recursive-reversal-chart-patterns-trendoscope.pine @ 5847fd3b4754
  - Diagnostic: 23:1: unresolved-import: Import 'Trendoscope/Drawing/2' as alias 'dr' was not supplied by the host library registry; provide Pine library source for Trendoscope/Drawing version 2, or remove/change the import
- sources/0123__cybermediaboy-indicators__m3f_te-research_v0.4.4.pine (6 indicator, unsupported-by-design) - https://github.com/cybermediaboy/indicators :: m3f_te-research_v0.4.4.pine @ f592ecde5cd5
  - Diagnostic: 16:1: unresolved-import: Import 'cybermediaboy/CyberCausalityLib/10' as alias 'CL' was not supplied by the host library registry; provide Pine library source for cybermediaboy/CyberCausalityLib version 10, or remove/change the import
- sources/0143__uminomae-pjdhiro__pjdhiro_sma3_bb_indicator_v6.pine (6 indicator, unsupported-by-design) - https://github.com/uminomae/pjdhiro :: myPj/tradingview/pine/indicators/pjdhiro_sma3_bb_indicator_v6.pine @ 0383f24eff57
  - Diagnostic: 18:1: unresolved-import: Import 'uminomae/pjdhiro_ma_v6/2' as alias 'ma' was not supplied by the host library registry; provide Pine library source for uminomae/pjdhiro_ma_v6 version 2, or remove/change the import
- sources/0173__Focal-QuantAI-QuantAI-Blog__AbVe_KnGK7Iuuhwb77Ul_code.pine (6 indicator, unsupported-by-design) - https://github.com/Focal-QuantAI/QuantAI-Blog :: strategies/heikin_ashi_oscillator_trend_engine/AbVe_KnGK7Iuuhwb77Ul_code.pine @ 7c878f1e0c7a
  - Diagnostic: 60:1: unresolved-import: Import 'SimpleCryptoLife/HighTimeframeSampling/4' as alias 'SCL_HTF' was not supplied by the host library registry; provide Pine library source for SimpleCryptoLife/HighTimeframeSampling version 4, or remove/change the import
- sources/0202__regalouisei-collect-tradingview__strategic-trend-filter.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/trend_analysis/strategic-trend-filter.pine @ 5847fd3b4754
  - Diagnostic: 8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0217__helenananaa-pine-compat-runtime__unsupported_imported_udt_array_from_method_return_qualifier.pine (6 indicator, unsupported-by-design) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_imported_udt_array_from_method_return_qualifier.pine @ 0e4f409acbab
  - Diagnostic: 2:1: unresolved-import: Import 'user/udt/1' as alias 'lib' was not supplied by the host library registry; provide Pine library source for user/udt version 1, or remove/change the import
- sources/0294__alighten-dev-Alighten__AlightenCVDRegressionBiasV0002.pine (6 indicator, tealscript-gap) - https://github.com/alighten-dev/Alighten :: TradingView/Indicators/AlightenCVDRegressionBiasV0002.pine @ eadfefeac6a7
  - Diagnostic: 4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0296__drebel7-TradingView__DRE-Non-Broken-lows-and-highs.pine (6 indicator, unsupported-by-design) - https://github.com/drebel7/TradingView :: src/indicators/DRE Non-Broken lows and highs.pine @ 5929ff5e02f7
  - Diagnostic: 7:1: unresolved-import: Import 'drebel/DRELib/35' as alias 'drelib' was not supplied by the host library registry; provide Pine library source for drebel/DRELib version 35, or remove/change the import
- sources/0300__alighten-dev-Alighten__AlightenOrderflowPressureV0001.pine (6 indicator, tealscript-gap) - https://github.com/alighten-dev/Alighten :: TradingView/Indicators/AlightenOrderflowPressureV0001.pine @ eadfefeac6a7
  - Diagnostic: 4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0324__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/trend_analysis/true-baseline-median-supertrend.pine @ 5847fd3b4754
  - Diagnostic: 8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0358__folknor-pine-tools__imports.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/syntax/imports.pine @ 8c7cbbbde84d
  - Diagnostic: 10:1: unresolved-import: Official TradingView library 'TradingView/ta' version 1 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0388__folknor-pine-tools__q01-vardecl-anchor.pine (6 indicator, unsupported-by-design) - https://github.com/folknor/pine-tools :: investigations/INV143-transitive-library-imports/probes/q01-vardecl-anchor.pine @ 68907b82c9ec
  - Diagnostic: 3:1: unresolved-import: Import 'robbatt/lib_profile/44' as alias 'PF' was not supplied by the host library registry; provide Pine library source for robbatt/lib_profile version 44, or remove/change the import
- sources/0394__turnupdigital-riskmanager__CVD_Strategy_Export.pine (6 indicator, tealscript-gap) - https://github.com/turnupdigital/riskmanager :: Trend/CVD_Strategy_Export.pine @ 479ea44f7bb3
  - Diagnostic: 4:1: unresolved-import: Official TradingView library 'TradingView/ta' version 8 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0401__regalouisei-collect-tradingview__true-baseline-median-supertrend.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/volatility/true-baseline-median-supertrend.pine @ 5847fd3b4754
  - Diagnostic: 8:1: unresolved-import: Official TradingView library 'TradingView/ta' version 12 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import
- sources/0424__jonathan-nascimento51-tradeCripto2025__map_utils_lib_test.pine (6 indicator, unsupported-by-design) - https://github.com/jonathan-nascimento51/tradeCripto2025 :: tests/map_utils_lib_test.pine @ 62ef61c811e7
  - Diagnostic: 3:1: unresolved-import: Import 'jonathanmoletta17/MapUtilsLib/1' as alias 'map' was not supplied by the host library registry; provide Pine library source for jonathanmoletta17/MapUtilsLib version 1, or remove/change the import
- sources/0447__helenananaa-pine-compat-runtime__import_user_method_matrix_call_result_reads.pine (6 indicator, unsupported-by-design) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/runtime/import_user_method_matrix_call_result_reads.pine @ ab3ccbea61b5
  - Diagnostic: 2:1: unresolved-import: Import 'user/udt/1' as alias 'left' was not supplied by the host library registry; provide Pine library source for user/udt version 1, or remove/change the import
- sources/0449__folknor-pine-tools__A-k4.pine (6 indicator, unsupported-by-design) - https://github.com/folknor/pine-tools :: investigations/INV126-item5-library-dataflow-probes/A-k4.pine @ b5f8984922cf
  - Diagnostic: 3:1: unresolved-import: Import 'jason5480/series_collection/4' as alias 'col' was not supplied by the host library registry; provide Pine library source for jason5480/series_collection version 4, or remove/change the import
- sources/0478__hirawatt-pineScripts__iHotelIndex.pine (5 indicator, unsupported-by-design) - https://github.com/hirawatt/pineScripts :: indicator/iHotelIndex.pine @ 2df0c2f9ef72
  - Diagnostic: 6:1: unresolved-import: Import 'yesgoods/quant/1' as alias 'quant' was not supplied by the host library registry; provide Pine library source for yesgoods/quant version 1, or remove/change the import
- sources/0583__helenananaa-pine-compat-runtime__unsupported_imported_udt_varip.pine (5 indicator, unsupported-by-design) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_imported_udt_varip.pine @ 0e4f409acbab
  - Diagnostic: 2:1: unresolved-import: Import 'user/udt/1' as alias 'lib' was not supplied by the host library registry; provide Pine library source for user/udt version 1, or remove/change the import
- sources/0584__helenananaa-pine-compat-runtime__import_udt_typed_udf_params.pine (5 indicator, unsupported-by-design) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/runtime/import_udt_typed_udf_params.pine @ 0e4f409acbab
  - Diagnostic: 2:1: unresolved-import: Import 'user/udt/1' as alias 'lib' was not supplied by the host library registry; provide Pine library source for user/udt version 1, or remove/change the import
- sources/0585__helenananaa-pine-compat-runtime__unsupported_imported_udt_array_push_local_target_method_mixed_identity.pine (5 indicator, unsupported-by-design) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_imported_udt_array_push_local_target_method_mixed_identity.pine @ 0e4f409acbab
  - Diagnostic: 2:1: unresolved-import: Import 'user/udt/1' as alias 'lib' was not supplied by the host library registry; provide Pine library source for user/udt version 1, or remove/change the import
- sources/0623__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ESTIMATIONS_10M.PINE (5 strategy, unsupported-by-design) - https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: Strategy/ESTIMATIONS_10M.PINE @ b6b6f454c641
  - Diagnostic: 225:1: unresolved-import: Import 'jdehorty/KernelFunctions/2' as alias 'kernels' was not supplied by the host library registry; provide Pine library source for jdehorty/KernelFunctions version 2, or remove/change the import
- sources/0629__deepentropy-oakscriptJS__Dynamic-Supply-and-Demand-Zones-AlgoAlpha-.pine (5 indicator, unsupported-by-design) - https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_community/Dynamic Supply and Demand Zones [AlgoAlpha].pine @ d7bbd272e9ba
  - Diagnostic: 6:1: unresolved-import: Import 'PineCoders/VisibleChart/4' as alias 'VisibleChart' was not supplied by the host library registry; provide Pine library source for PineCoders/VisibleChart version 4, or remove/change the import
- sources/0635__regalouisei-collect-tradingview__anova-macd.pine (5 indicator, unsupported-by-design) - https://github.com/regalouisei/collect-tradingview :: pinescript/oscillators/anova-macd.pine @ 5847fd3b4754
  - Diagnostic: 5:1: unresolved-import: Import 'Steversteves/SPTS_StatsPakLib/4' as alias 'spts' was not supplied by the host library registry; provide Pine library source for Steversteves/SPTS_StatsPakLib version 4, or remove/change the import
- sources/0639__btcjon-pine__ttb_entry_main2.pine (5 indicator, unsupported-by-design) - https://github.com/btcjon/pine :: archive/ttb_entry_main2.pine @ 43413c465752
  - Diagnostic: 10:1: unresolved-import: Import 'DarkWaveAlgo/DarkWaveColorThemes/1' as alias 'ColorThemes' was not supplied by the host library registry; provide Pine library source for DarkWaveAlgo/DarkWaveColorThemes version 1, or remove/change the import

## 2. unexpected-token

Count: 31

Minimal reproducer:

```pine
//@version=6
indicator("semicolon chain")
var array<int> xs = array.new<int>()
if barstate.islast
    a = 1; b = 2
plot(a)
```

Representative rows:

- sources/0075__somat3k-Braga-Bielany-czycus__fib_gann.pine (6 indicator, tealscript-gap) - https://github.com/somat3k/Braga-Bielany-czycus :: pinnacle_strats/04_fib_gann/fib_gann.pine @ a4306b8d9720
  - Diagnostic: 417:42: Expected "        ", "    \t", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t    ", "\t\t", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but ";" found.
- sources/0157__deepentropy-oakscriptJS__Performance.pine (6 indicator, tealscript-gap) - https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_standard/Performance.pine @ d7bbd272e9ba
  - Diagnostic: 7:120: Expected "\"" or "\\" but "\n" found.
- sources/0187__mushroom-men-Trading-clean-litter__apo.pine (6 indicator, tealscript-gap) - https://github.com/mushroom-men-Trading/clean-litter :: Indicators/indicators/premade indicators/oscillators/apo.pine @ 95f5f7d4bcb4
  - Diagnostic: 22:12: Expected ".", "/*", "[", "[]", or [ \t] but "n" found.
- sources/0208__regalouisei-collect-tradingview__multitimeframe-fair-value-gap-fvg-zeiierman.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/multitimeframe-fair-value-gap-fvg-zeiierman.pine @ 5847fd3b4754
  - Diagnostic: 9:122: Expected "\"" or "\\" but "\n" found.
- sources/0224__deepentropy-oakscriptJS__Multi-Time-Period-Charts.pine (6 indicator, tealscript-gap) - https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_standard/Multi-Time Period Charts.pine @ d7bbd272e9ba
  - Diagnostic: 5:120: Expected "\"" or "\\" but "\n" found.
- sources/0329__levanelereal-pruebatrading__Estructura_Mayor.pine (6 indicator, tealscript-gap) - https://github.com/levanelereal/pruebatrading :: Estructura_Mayor.pine @ cccce361d393
  - Diagnostic: 1404:54: Expected ".", "/*", "=", "[", "[]", or [ \t] but "+" found.
- sources/0334__regalouisei-collect-tradingview__time-sales-tape-by-muqwishi.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/time-sales-tape-by-muqwishi.pine @ 5847fd3b4754
  - Diagnostic: 207:37: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.
- sources/0343__jonathan-nascimento51-tradeCripto2025__combined_indicators.pine (6 indicator, tealscript-gap) - https://github.com/jonathan-nascimento51/tradeCripto2025 :: combined_indicators.pine @ a5fa58dae8af
  - Diagnostic: 106:2: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "false", "na", "not", "true", [ \t], [+\-], [0-9], or [\n\r] but "<" found.

## 3. type-mismatch

Count: 16

Minimal reproducer:

```pine
//@version=6
indicator("array element type")
var int[] xs = array.new<int>()
array.push(xs, 1.5)
plot(array.size(xs))
```

Representative rows:

- sources/0072__folknor-pine-tools__coll_array_push_float.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: investigations/INV087-collection-mutator-element-type/probes/coll_array_push_float.pine @ 47790c0105dd
  - Diagnostic: 7:15: type-mismatch: Cannot use float value as int array element
- sources/0087__folknor-pine-tools__collection-element-type.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/collection-element-type.pine @ 47790c0105dd
  - Diagnostic: 11:16: type-mismatch: Cannot use float value as int array element
- sources/0150__folknor-pine-tools__INV123-paramless-control.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV123-paramless-control.pine @ 2e34e94d81b3
  - Diagnostic: 7:9: type-mismatch: nz source cannot be a boolean
- sources/0172__regalouisei-collect-tradingview__relative-crypto-dominance-polar-chart-luxalgo.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/relative-crypto-dominance-polar-chart-luxalgo.pine @ 5847fd3b4754
  - Diagnostic: 146:23: type-mismatch: Cannot use string value as udt array element
- sources/0326__DeolinNaidoo-indic__larper_main.pine (6 indicator, invalid-pine) - https://github.com/DeolinNaidoo/indic :: larper_main.pine @ 613deb667d35
  - Diagnostic: 673:1: type-mismatch: Cannot assign float value to int variable 'qDurMonth'
- sources/0333__regalouisei-collect-tradingview__composite-fear-greed-index.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/oscillators/composite-fear-greed-index.pine @ 5847fd3b4754
  - Diagnostic: 119:29: type-mismatch: fill title must be a string, got int
- sources/0364__helenananaa-pine-compat-runtime__unsupported_map_put_key_type.pine (6 indicator, tealscript-gap) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_map_put_key_type.pine @ 62192b7f37bd
  - Diagnostic: 5:17: type-mismatch: Cannot use int value as string map key
- sources/0408__regalouisei-collect-tradingview__stock-screener.pine (6 indicator, tealscript-gap) - https://github.com/regalouisei/collect-tradingview :: pinescript/oscillators/stock-screener.pine @ 5847fd3b4754
  - Diagnostic: 516:323: type-mismatch: vwap source must be a number, got bool

## 4. duplicate-symbol

Count: 8

Minimal reproducer:

```pine
//@version=6
indicator("function and value share name")
calc(float x) => x
calc = calc(close)
plot(calc)
```

Representative rows:

- sources/0006__LINE12138-TradingView__combined_cci_indicator.pine (6 indicator, invalid-pine) - https://github.com/LINE12138/TradingView :: combined_cci_indicator.pine @ 92c5be2667b7
  - Diagnostic: 7:1: duplicate-symbol: Duplicate declaration: ma
- sources/0105__mushroom-men-Trading-clean-litter__jvolty.pine (6 indicator, invalid-pine) - https://github.com/mushroom-men-Trading/clean-litter :: Indicators/indicators/premade indicators/volatility/jvolty.pine @ 95f5f7d4bcb4
  - Diagnostic: 48:1: duplicate-symbol: Duplicate declaration: jvolty
- sources/0129__helenananaa-pine-compat-runtime__unsupported_map_udf_method_return_templates.pine (6 indicator, invalid-pine) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_map_udf_method_return_templates.pine @ 35cdebbc3ce3
  - Diagnostic: 7:8: duplicate-symbol: Duplicate declaration: badReturn
- sources/0176__folknor-pine-tools__INV124-redeclared-uniongate-fp.pine (6 indicator, invalid-pine) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV124-redeclared-uniongate-fp.pine @ 6acad711e221
  - Diagnostic: 8:6: duplicate-symbol: Duplicate declaration: x
- sources/0214__folknor-pine-tools__INV035-already-defined.pine (6 indicator, invalid-pine) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV035-already-defined.pine @ aa826ef3b13b
  - Diagnostic: 13:1: duplicate-symbol: Duplicate declaration: x
- sources/0291__helenananaa-pine-compat-runtime__supported_user_type_array_udf_method_returns.pine (6 indicator, invalid-pine) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/supported_user_type_array_udf_method_returns.pine @ 9c60e67188be
  - Diagnostic: 99:8: duplicate-symbol: Duplicate declaration: first
- sources/0474__CjHare-pinescript-v5-snippets__adx.pine (5 indicator, invalid-pine) - https://github.com/CjHare/pinescript-v5-snippets :: src/indicator/adx.pine @ 9459f54f3841
  - Diagnostic: 33:2: duplicate-symbol: Duplicate declaration: adx
- sources/0587__deepentropy-oakscriptJS__Custom-Pattern-Detection.pine (5 indicator, invalid-pine) - https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_community/Custom Pattern Detection.pine @ d7bbd272e9ba
  - Diagnostic: 105:1: duplicate-symbol: Duplicate declaration: t

## 5. global-output-declared-but-not-evaluated

Count: 8

Minimal reproducer:

```pine
//@version=6
indicator("empty local-output loop")
var float[] xs = array.new<float>()
for value in xs
    plot(value)
```

Representative rows:

- sources/0085__easyspace-ai-pine-rs__debug_loop_i_values.pine (6 indicator, tealscript-gap) - https://github.com/easyspace-ai/pine-rs :: tests/scripts/series/debug_loop_i_values.pine @ 82a1323a9c05
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0128__helenananaa-pine-compat-runtime__user_type_non_scalar_typed_na_history.pine (6 indicator, tealscript-gap) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/runtime/user_type_non_scalar_typed_na_history.pine @ 0e4f409acbab
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0137__helenananaa-pine-compat-runtime__supported_for_in_empty_array_slice_result_negative_body_history.pine (6 indicator, tealscript-gap) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/supported_for_in_empty_array_slice_result_negative_body_history.pine @ 0e4f409acbab
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0279__easyspace-ai-pine-rs__array_core.pine (6 indicator, tealscript-gap) - https://github.com/easyspace-ai/pine-rs :: tests/scripts/stdlib/array/array_core.pine @ 940ca37b8bc4
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0351__bsemaay-tech-mtc-command-center__producer_supertrend_v1.pine (6 indicator, tealscript-gap) - https://github.com/bsemaay-tech/mtc-command-center :: MTC_COMMAND_CENTER/01_MTC_PROJECT/parity_oracles/feature_adapters/pinets/producer_supertrend_v1.pine @ d65b5a1dc947
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0429__easyspace-ai-pine-rs__debug_loop_without_close.pine (6 indicator, tealscript-gap) - https://github.com/easyspace-ai/pine-rs :: tests/scripts/series/debug_loop_without_close.pine @ 82a1323a9c05
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0432__helenananaa-pine-compat-runtime__unsupported_matrix_add_row.pine (6 indicator, tealscript-gap) - https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_matrix_add_row.pine @ 16f6492487a8
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.
- sources/0593__nathanssantos-marketmind__vwap-ema-cross.pine (5 indicator, tealscript-gap) - https://github.com/nathanssantos/marketmind :: apps/backend/strategies/builtin/vwap-ema-cross.pine @ 61a72e9c98fd
  - Diagnostic: output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.

## 6. unknown-identifier

Count: 8

Minimal reproducer:

```pine
//@version=6
indicator("self history initializer")
isNewDay = ta.change(dayofweek) != 0 or not isNewDay[1]
plot(isNewDay ? 1 : 0)
```

Representative rows:

- sources/0088__folknor-pine-tools__INV062-unresolved-call-args.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV062-unresolved-call-args.pine @ a35bac7ab740
  - Diagnostic: 12:13: unknown-identifier: Unknown identifier: missingArg
- sources/0149__folknor-pine-tools__INV037-if-branch-scope.pine (6 indicator, tealscript-gap) - https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV037-if-branch-scope.pine @ a35bac7ab740
  - Diagnostic: 17:8: unknown-identifier: Unknown identifier: branchOnly
- sources/0336__nishpa800-indicators__VOB_v11_MULTIPLES_HWcoincidence_2026-06-04.pine (6 indicator, tealscript-gap) - https://github.com/nishpa800/indicators :: vob/versions/VOB_v11_MULTIPLES_HWcoincidence_2026-06-04.pine @ 0e08c6e02c26
  - Diagnostic: 1056:8: unknown-identifier: Unknown identifier: enabled
- sources/0341__kwinkzap-bot-Mine__Combined-Strike-Selector-Intrinsic-Levels.pine (6 indicator, tealscript-gap) - https://github.com/kwinkzap-bot/Mine :: Mine/Pine script/Combined Strike Selector & Intrinsic Levels.pine @ 46940112eaaa
  - Diagnostic: 135:60: unknown-identifier: Unknown identifier: ce_l
- sources/0483__Flopchamp-Custom-TradingView-Pine-Script-v5---Multi-Timeframe-Signal-Indicator---Strategy-Tester__MTF_Signal_Indicator.pine (5 indicator, tealscript-gap) - https://github.com/Flopchamp/Custom-TradingView-Pine-Script-v5---Multi-Timeframe-Signal-Indicator---Strategy-Tester :: MTF_Signal_Indicator.pine @ f34c3bb7c39f
  - Diagnostic: 71:77: unknown-identifier: Unknown identifier: isNewDay
- sources/0485__tarifamin-tempo-indicator__ICT_Master_Indicator.pine (5 indicator, tealscript-gap) - https://github.com/tarifamin/tempo-indicator :: ICT_Master_Indicator.pine @ 5b58c907866a
  - Diagnostic: 196:22: unknown-identifier: Unknown identifier: string
- sources/0490__DMJ3691836-SNAP-HTF_LTF-Indicator__SNAP_HTF_LTF_Indicator.pine (5 indicator, tealscript-gap) - https://github.com/DMJ3691836/SNAP-HTF_LTF-Indicator- :: SNAP_HTF_LTF_Indicator.pine @ 83dd82413a2e
  - Diagnostic: 50:32: unknown-identifier: Unknown identifier: weekly_wick_high
- sources/0526__zhuzp98-QuantTestFrame__Z_template_strategy.pine (5 strategy, tealscript-gap) - https://github.com/zhuzp98/QuantTestFrame :: PineScript/Z_template_strategy.pine @ 1ce362d84524
  - Diagnostic: 76:4: unknown-identifier: Unknown identifier: enterLong
