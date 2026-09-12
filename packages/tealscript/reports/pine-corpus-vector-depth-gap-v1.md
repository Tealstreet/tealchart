# Pine Corpus Vector Depth Gap V1

Priority note: this remains the measurement of high-use thin member coverage,
but it is superseded as an actionable build order by
`pine-corpus-priority-queue-v1.md`, which merges member depth with optional
argument-slot usage and construct depth.

Generated at 2026-09-11T12:09:54.812Z. Measured at commit `abc1114cbe`.

## Headline

Across 2506 corpus scripts, 96 members are both high-use (>=100 corpus scripts) and thinly vector-tested (one vector case, or <=1 vector argument shape for callable/declaration members).

49 of those high-use thin members are callable/declaration surfaces with parsed corpus call-site depth.

High-use thinly tested members exist. The vector suite is broad, but its one-case/member headline hides shallow depth for common corpus surfaces.

This is the same lesson as the optional-slot report: headline member coverage is real, but it is not depth. The ranking below is the actionable artifact.

## Basis

- Vector member map: `pine-value-vector-member-map-v29.json` (813 covered members).
- Assertion quality: `pine-value-vector-assertion-quality-v8.json`.
- Corpus scripts scanned: 2506; parsed: 2469; parse failures skipped for call-shape depth: 37.
- Method: Source-reference frequency is counted for all official members after stripping comments and double-quoted strings. Call-site and argument-shape depth are counted from parsed call/declaration AST nodes for documented callable/declaration members. Vector depth is unique value-vector cases per member plus distinct parsed vector call/declaration shapes.
- Caveat: This is a structural depth ranking. It does not prove value correctness or semantic binding of every corpus call.
- Caveat: Receiver-method calls are counted only when the documented namespace member is syntactically visible.
- Caveat: Vector case count follows officialMembersForValueVectorCase, so scaffold members such as indicator/plot can have many ran-only cases without exact value assertions.

## High-Use Thin Members

| Member | Quality | Corpus scripts | Corpus uses | Corpus shapes | Vector cases | Vector shapes | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| color.new | value | 1181 | 15641 | 5 | 1 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine |
| array.get | value | 618 | 8652 | 1 | 14 | 1 | v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0005__mihakralj-pinescript__atrbands.pine<br>v5:sources/0006__mihakralj-pinescript__bbands.pine |
| array.push | value | 354 | 5075 | 1 | 6 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0009__mihakralj-pinescript__fcb.pine<br>v5:sources/0013__mihakralj-pinescript__mmchannel.pine |
| math.max | value | 916 | 4509 | 7 | 4 | 1 | v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0005__mihakralj-pinescript__atrbands.pine<br>v5:sources/0006__mihakralj-pinescript__bbands.pine |
| array.size | value | 411 | 4604 | 1 | 22 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0009__mihakralj-pinescript__fcb.pine<br>v5:sources/0013__mihakralj-pinescript__mmchannel.pine |
| input | value | 386 | 3989 | 55 | 5 | 1 | v5:sources/0045__mihakralj-pinescript__ssfdsp.pine<br>v5:sources/0161__mihakralj-pinescript__exp.pine<br>v5:sources/0163__mihakralj-pinescript__exptrans.pine |
| math.abs | value | 731 | 3624 | 1 | 7 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine<br>v5:sources/0005__mihakralj-pinescript__atrbands.pine |
| math.min | value | 775 | 2955 | 5 | 4 | 1 | v5:sources/0003__mihakralj-pinescript__apchannel.pine<br>v5:sources/0008__mihakralj-pinescript__decaychannel.pine<br>v5:sources/0010__mihakralj-pinescript__jbands.pine |
| plotshape | value | 570 | 2458 | 103 | 1 | 1 | v5:sources/0055__mihakralj-pinescript__ghla.pine<br>v5:sources/0061__mihakralj-pinescript__super.pine<br>v5:sources/0062__mihakralj-pinescript__ttm.pine |
| array.new | value | 270 | 2389 | 4 | 1 | 1 | v5:sources/0353__mihakralj-pinescript__zldema.pine<br>v5:sources/0354__mihakralj-pinescript__zlema.pine<br>v5:sources/0355__mihakralj-pinescript__zltema.pine |
| ta.ema | value | 640 | 2533 | 2 | 9 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0067__mihakralj-pinescript__huber.pine<br>v5:sources/0070__mihakralj-pinescript__mae.pine |
| math.round | value | 355 | 2163 | 2 | 1 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0033__mihakralj-pinescript__dsp.pine<br>v5:sources/0034__mihakralj-pinescript__eacp.pine |
| ta.sma | value | 733 | 2297 | 2 | 12 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0055__mihakralj-pinescript__ghla.pine<br>v5:sources/0068__mihakralj-pinescript__logcosh.pine |
| array.set | value | 369 | 2115 | 1 | 2 | 1 | v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0005__mihakralj-pinescript__atrbands.pine<br>v5:sources/0006__mihakralj-pinescript__bbands.pine |
| strategy.exit | value | 357 | 1141 | 94 | 1 | 1 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine |
| ta.highest | value | 488 | 1095 | 2 | 11 | 1 | v5:sources/0026__mihakralj-pinescript__midpoint.pine<br>v5:sources/0027__mihakralj-pinescript__midprice.pine<br>v5:sources/0214__mihakralj-pinescript__fisher.pine |
| array.shift | value | 189 | 905 | 1 | 1 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0009__mihakralj-pinescript__fcb.pine<br>v5:sources/0013__mihakralj-pinescript__mmchannel.pine |
| ta.atr | value | 594 | 991 | 1 | 8 | 1 | v5:sources/0134__mihakralj-pinescript__mlp.pine<br>v5:sources/0471__everget-tradingview-pinescript-indicators__chandelier_exit.pine<br>v5:sources/0474__everget-tradingview-pinescript-indicators__supertrend.pine |
| ta.crossover | property | 442 | 928 | 1 | 4 | 1 | v5:sources/0050__mihakralj-pinescript__aroon.pine<br>v5:sources/0051__mihakralj-pinescript__aroonosc.pine<br>v5:sources/0421__everget-tradingview-pinescript-indicators__corrected_moving_average.pine |
| ta.lowest | value | 451 | 972 | 2 | 9 | 1 | v5:sources/0026__mihakralj-pinescript__midpoint.pine<br>v5:sources/0027__mihakralj-pinescript__midprice.pine<br>v5:sources/0214__mihakralj-pinescript__fisher.pine |
| ta.crossunder | property | 415 | 855 | 1 | 4 | 1 | v5:sources/0050__mihakralj-pinescript__aroon.pine<br>v5:sources/0051__mihakralj-pinescript__aroonosc.pine<br>v5:sources/0421__everget-tradingview-pinescript-indicators__corrected_moving_average.pine |
| bgcolor | value | 749 | 512 | 16 | 2 | 1 | v5:sources/0051__mihakralj-pinescript__aroonosc.pine<br>v5:sources/0059__mihakralj-pinescript__qstick.pine<br>v5:sources/0200__mihakralj-pinescript__bbs.pine |
| fill | value | 387 | 788 | 42 | 6 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine |
| color.green | value | 851 | 2688 | 0 | 1 | 0 | v5:sources/0015__mihakralj-pinescript__regchannel.pine<br>v5:sources/0016__mihakralj-pinescript__sdchannel.pine<br>v5:sources/0022__mihakralj-pinescript__vwapsd.pine |
| color.white | value | 802 | 5756 | 0 | 1 | 0 | v5:sources/0041__mihakralj-pinescript__lunar.pine<br>v5:sources/0055__mihakralj-pinescript__ghla.pine<br>v5:sources/0061__mihakralj-pinescript__super.pine |
| math.pow | value | 212 | 583 | 1 | 1 | 1 | v5:sources/0010__mihakralj-pinescript__jbands.pine<br>v5:sources/0022__mihakralj-pinescript__vwapsd.pine<br>v5:sources/0031__mihakralj-pinescript__ccyc.pine |
| color.yellow | value | 793 | 1279 | 0 | 1 | 0 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine |
| str.format | value | 130 | 627 | 29 | 1 | 1 | v5:sources/0490__casoon-pine-scripts__mtf_trend_alignment.pine<br>v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine<br>v5:sources/0495__casoon-pine-scripts__wave_navigator.pine |
| array.new_int | value | 161 | 658 | 3 | 2 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0009__mihakralj-pinescript__fcb.pine<br>v5:sources/0013__mihakralj-pinescript__mmchannel.pine |
| math.sqrt | value | 241 | 490 | 1 | 1 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0004__mihakralj-pinescript__apz.pine<br>v5:sources/0006__mihakralj-pinescript__bbands.pine |
| matrix.new | value | 118 | 712 | 5 | 11 | 1 | v5:sources/0134__mihakralj-pinescript__mlp.pine<br>v5:sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine<br>v5:sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine |
| ta.barssince | value | 115 | 694 | 1 | 5 | 1 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine |
| math.avg | value | 143 | 562 | 6 | 1 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine<br>v5:sources/0530__casoon-pine-scripts__zigzag_fibo_pullback_map.pine |
| color.gray | value | 699 | 3353 | 0 | 1 | 0 | v5:sources/0022__mihakralj-pinescript__vwapsd.pine<br>v5:sources/0030__mihakralj-pinescript__ccor.pine<br>v5:sources/0031__mihakralj-pinescript__ccyc.pine |
| timeframe.in_seconds | value | 147 | 512 | 2 | 1 | 1 | v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine<br>v5:sources/0487__casoon-pine-scripts__directional_probability_engine_v3.pine |
| array.clear | value | 116 | 515 | 1 | 1 | 1 | v5:sources/0014__mihakralj-pinescript__pchannel.pine<br>v5:sources/0107__mihakralj-pinescript__gauss.pine<br>v5:sources/0115__mihakralj-pinescript__loess.pine |
| color | value | 1850 | 519 | 1 | 21 | 0 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine |
| ta.rma | value | 156 | 564 | 1 | 11 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0375__mihakralj-pinescript__pv.pine<br>v5:sources/0495__casoon-pine-scripts__wave_navigator.pine |
| math.log | value | 127 | 442 | 1 | 1 | 1 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine<br>v5:sources/0010__mihakralj-pinescript__jbands.pine<br>v5:sources/0053__mihakralj-pinescript__dmx.pine |
| math.floor | value | 197 | 346 | 1 | 1 | 1 | v5:sources/0107__mihakralj-pinescript__gauss.pine<br>v5:sources/0133__mihakralj-pinescript__afirma.pine<br>v5:sources/0209__mihakralj-pinescript__dpo.pine |
| ta.rsi | property | 332 | 458 | 1 | 12 | 1 | v5:sources/0134__mihakralj-pinescript__mlp.pine<br>v5:sources/0482__casoon-pine-scripts__adaptive_fair_value_cloud.pine<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine |
| math.sum | value | 156 | 326 | 1 | 1 | 1 | v5:sources/0334__mihakralj-pinescript__kama.pine<br>v5:sources/0373__mihakralj-pinescript__massi.pine<br>v5:sources/0379__mihakralj-pinescript__ui.pine |
| color.orange | value | 474 | 1118 | 0 | 1 | 0 | v5:sources/0025__mihakralj-pinescript__medprice.pine<br>v5:sources/0034__mihakralj-pinescript__eacp.pine<br>v5:sources/0094__mihakralj-pinescript__alaguerre.pine |
| ta.wma | value | 163 | 440 | 2 | 6 | 1 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0439__everget-tradingview-pinescript-indicators__sharp_modified_moving_average.pine<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine |
| alertcondition | value | 465 | 2463 | 0 | 1 | 0 | v5:sources/0050__mihakralj-pinescript__aroon.pine<br>v5:sources/0051__mihakralj-pinescript__aroonosc.pine<br>v5:sources/0415__everget-tradingview-pinescript-indicators__adaptive_laguerre_filter.pine |
| runtime.error | uncovered | 433 | 640 | 0 | 0 | 0 | v5:sources/0001__mihakralj-pinescript__aberr.pine<br>v5:sources/0002__mihakralj-pinescript__accbands.pine<br>v5:sources/0003__mihakralj-pinescript__apchannel.pine |
| ta.pivotlow | property | 243 | 384 | 3 | 5 | 1 | v5:sources/0482__casoon-pine-scripts__adaptive_fair_value_cloud.pine<br>v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine |
| label.style_label_down | value | 417 | 950 | 0 | 1 | 0 | v5:sources/0134__mihakralj-pinescript__mlp.pine<br>v5:sources/0457__everget-tradingview-pinescript-indicators__point_and_figure_pnf_chart_identifier.pine<br>v5:sources/0465__everget-tradingview-pinescript-indicators__gaps_percent_size_distribution.pine |
| ta.pivothigh | property | 241 | 354 | 3 | 5 | 1 | v5:sources/0482__casoon-pine-scripts__adaptive_fair_value_cloud.pine<br>v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine |
| math.exp | value | 136 | 264 | 1 | 1 | 1 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine<br>v5:sources/0019__mihakralj-pinescript__ubands.pine<br>v5:sources/0020__mihakralj-pinescript__uchannel.pine |
| array.new_line | value | 100 | 276 | 3 | 1 | 1 | v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine<br>v5:sources/0495__casoon-pine-scripts__wave_navigator.pine<br>v5:sources/0503__casoon-pine-scripts__broadening_wedge_scanner_pro.pine |
| barcolor | value | 166 | 205 | 9 | 1 | 1 | v5:sources/0411__everget-tradingview-pinescript-indicators__moving_average_channel.pine<br>v5:sources/0412__everget-tradingview-pinescript-indicators__vortex_bands.pine<br>v5:sources/0424__everget-tradingview-pinescript-indicators__fibonacci_weighted_moving_average.pine |
| color.black | value | 351 | 1309 | 0 | 1 | 0 | v5:sources/0447__everget-tradingview-pinescript-indicators__derivative_oscillator.pine<br>v5:sources/0456__everget-tradingview-pinescript-indicators__litecoin_halving_utc_countdown.pine<br>v5:sources/0460__everget-tradingview-pinescript-indicators__utc_clock.pine |
| array.pop | value | 104 | 247 | 1 | 1 | 1 | v5:sources/0007__mihakralj-pinescript__dchannel.pine<br>v5:sources/0009__mihakralj-pinescript__fcb.pine<br>v5:sources/0013__mihakralj-pinescript__mmchannel.pine |
| color.from_gradient | value | 103 | 248 | 3 | 1 | 1 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine<br>v5:sources/0511__casoon-pine-scripts__market_scenario_projector.pine |
| shape.triangledown | value | 333 | 418 | 0 | 1 | 0 | v5:sources/0062__mihakralj-pinescript__ttm.pine<br>v5:sources/0063__mihakralj-pinescript__ttmtrend.pine<br>v5:sources/0242__mihakralj-pinescript__fractals.pine |
| syminfo.mintick | value | 326 | 1394 | 0 | 1 | 0 | v5:sources/0459__everget-tradingview-pinescript-indicators__symbol_info_helper.pine<br>v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine |
| max_bars_back | value | 298 | 336 | 0 | 1 | 0 | v5:sources/0102__mihakralj-pinescript__cfitz.pine<br>v5:sources/0466__everget-tradingview-pinescript-indicators__linear_regression_all_data.pine<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine |
| color.lime | value | 294 | 872 | 0 | 1 | 0 | v5:sources/0219__mihakralj-pinescript__kdj.pine<br>v5:sources/0232__mihakralj-pinescript__squeeze.pine<br>v5:sources/0411__everget-tradingview-pinescript-indicators__moving_average_channel.pine |
| barstate.isconfirmed | value | 293 | 971 | 0 | 1 | 0 | v5:sources/0415__everget-tradingview-pinescript-indicators__adaptive_laguerre_filter.pine<br>v5:sources/0471__everget-tradingview-pinescript-indicators__chandelier_exit.pine<br>v5:sources/0482__casoon-pine-scripts__adaptive_fair_value_cloud.pine |

## Ranked Depth Gaps

| Member | Quality | Corpus scripts | Corpus uses | Corpus shapes | Vector cases | Vector shapes | Gap score | Vector samples |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| color.new | value | 1181 | 15641 | 5 | 1 | 1 | 16822 | runtime.color-math-array-values |
| array.get | value | 618 | 8652 | 1 | 14 | 1 | 8696.14 | array.advanced-search-fill-values<br>array.mutation-accessors<br>array.persistent-get<br>array.search-sort-values |
| array.push | value | 354 | 5075 | 1 | 6 | 1 | 5134 | array.mutation-accessors<br>array.persistent-get<br>array.persistent-size<br>language.collection-history-containers |
| math.max | value | 916 | 4509 | 7 | 4 | 1 | 4738 | invariant.vwap.running-range<br>math.acos<br>math.asin<br>math.max |
| array.size | value | 411 | 4604 | 1 | 22 | 1 | 4622.68 | array.advanced-search-fill-values<br>array.bool-and-constructor-values<br>array.mutation-accessors<br>array.persistent-size |
| input | value | 386 | 3989 | 55 | 5 | 1 | 4066.2 | runtime.input-default-values<br>runtime.input-expanded-default-values<br>runtime.input-high-use-metadata-values<br>runtime.input-options-overload-values |
| math.abs | value | 731 | 3624 | 1 | 7 | 1 | 3728.43 | invariant.cum.nonnegative-monotonic<br>invariant.macd.histogram-coherence<br>math.abs<br>math.log |
| math.min | value | 775 | 2955 | 5 | 4 | 1 | 3148.75 | invariant.vwap.running-range<br>math.acos<br>math.asin<br>math.min |
| plotshape | value | 570 | 2458 | 103 | 1 | 1 | 3028 | visual.marker-candle-metadata-values |
| array.new | value | 270 | 2389 | 4 | 1 | 1 | 2659 | language.udt-collection-copy-identity |
| ta.ema | value | 640 | 2533 | 2 | 9 | 1 | 2604.11 | hostile.ema.long<br>hostile.ema.long-middle-na<br>hostile.ema.middle-na<br>hostile.ema.multi-middle-na |
| math.round | value | 355 | 2163 | 2 | 1 | 1 | 2518 | math.round |
| ta.sma | value | 733 | 2297 | 2 | 12 | 1 | 2358.08 | hostile.sma.length1<br>hostile.sma.middle-na<br>hostile.sma.multi-middle-na<br>hostile.sma.overlong |
| array.set | value | 369 | 2115 | 1 | 2 | 1 | 2299.5 | array.bool-and-constructor-values<br>array.mutation-accessors |
| strategy.exit | value | 357 | 1141 | 94 | 1 | 1 | 1498 | strategy.exit-limit-ledger-values |
| ta.highest | value | 488 | 1095 | 2 | 11 | 1 | 1139.36 | hostile.highest.length1-plateau<br>hostile.highest.middle-na<br>hostile.highest.multi-middle-na<br>invariant.alma.convex-window |
| array.shift | value | 189 | 905 | 1 | 1 | 1 | 1094 | array.mutation-accessors |
| ta.atr | value | 594 | 991 | 1 | 8 | 1 | 1065.25 | hostile.atr.middle-na<br>hostile.atr.multi-middle-na<br>hostile.atr.overlong<br>ta.atr |
| ta.crossover | property | 442 | 928 | 1 | 4 | 1 | 1038.5 | hostile.crossover.middle-na<br>hostile.crossover.multi-middle-na<br>invariant.cross.family-coherence<br>ta.crossover |
| ta.lowest | value | 451 | 972 | 2 | 9 | 1 | 1022.11 | hostile.lowest.length1-plateau<br>hostile.lowest.middle-na<br>invariant.alma.convex-window<br>invariant.swma.convex-window |
| ta.crossunder | property | 415 | 855 | 1 | 4 | 1 | 958.75 | hostile.crossunder.middle-na<br>hostile.crossunder.multi-middle-na<br>invariant.cross.family-coherence<br>ta.crossunder |
| bgcolor | value | 749 | 512 | 16 | 2 | 1 | 886.5 | drawing.table-payload-values<br>visual.bgcolor-barcolor-metadata-values |
| fill | value | 387 | 788 | 42 | 6 | 1 | 852.5 | array.advanced-search-fill-values<br>drawing.linefill-color-copy-values<br>drawing.linefill-getters<br>matrix.fill-sort-values |
| color.green | value | 851 | 2688 | 0 | 1 | 0 | 851 | runtime.color-constants-values |
| color.white | value | 802 | 5756 | 0 | 1 | 0 | 802 | runtime.color-constants-values |
| math.pow | value | 212 | 583 | 1 | 1 | 1 | 795 | math.pow |
| color.yellow | value | 793 | 1279 | 0 | 1 | 0 | 793 | runtime.color-constants-values |
| str.format | value | 130 | 627 | 29 | 1 | 1 | 757 | str.format |
| array.new_int | value | 161 | 658 | 3 | 2 | 1 | 738.5 | array.mutation-accessors<br>property.single.array.new_int |
| math.sqrt | value | 241 | 490 | 1 | 1 | 1 | 731 | math.sqrt |
| matrix.new | value | 118 | 712 | 5 | 11 | 1 | 722.73 | language.collection-history-containers<br>language.collection-mutation-ordering-loops<br>matrix.algebra-values<br>matrix.basic-aggregates |
| ta.barssince | value | 115 | 694 | 1 | 5 | 1 | 717 | hostile.barssince.direct-middle-na<br>hostile.barssince.middle-na<br>hostile.barssince.multi-middle-na<br>ta.barssince |
| math.avg | value | 143 | 562 | 6 | 1 | 1 | 705 | math.avg |
| color.gray | value | 699 | 3353 | 0 | 1 | 0 | 699 | runtime.color-constants-values |
| timeframe.in_seconds | value | 147 | 512 | 2 | 1 | 1 | 659 | runtime.timeframe-values |
| array.clear | value | 116 | 515 | 1 | 1 | 1 | 631 | array.mutation-accessors |
| color | value | 1850 | 519 | 1 | 21 | 0 | 607.1 | array.bool-and-constructor-values<br>drawing.box-point-style-values<br>drawing.box-style-text-values<br>drawing.delete-all-values |
| ta.valuewhen | value | 79 | 576 | 2 | 5 | 1 | 591.8 | hostile.valuewhen.direct-middle-na<br>hostile.valuewhen.middle-na<br>hostile.valuewhen.multi-middle-na<br>ta.valuewhen |
| ta.rma | value | 156 | 564 | 1 | 11 | 1 | 578.18 | hostile.rma.long<br>hostile.rma.long-middle-na<br>hostile.rma.middle-na<br>hostile.rma.multi-middle-na |
| math.log | value | 127 | 442 | 1 | 1 | 1 | 569 | math.log |
| array.remove | value | 82 | 474 | 1 | 1 | 1 | 556 | array.mutation-accessors |
| matrix.get | value | 39 | 542 | 1 | 8 | 1 | 546.88 | language.collection-history-containers<br>language.collection-mutation-ordering-loops<br>matrix.algebra-values<br>matrix.basic-aggregates |
| math.floor | value | 197 | 346 | 1 | 1 | 1 | 543 | math.floor |
| str.contains | value | 71 | 520 | 2 | 4 | 1 | 537.75 | runtime.ticker-helper-values<br>runtime.ticker-transform-values<br>str.contains<br>ticker.kagi-two-argument-values |
| matrix.mult | value | 18 | 513 | 1 | 1 | 1 | 531 | matrix.algebra-values |
| ta.rsi | property | 332 | 458 | 1 | 12 | 1 | 485.67 | hostile.rsi.flat<br>hostile.rsi.multi-middle-na<br>hostile.rsi.signed<br>invariant.rsi.all-na-bounds |
| math.sum | value | 156 | 326 | 1 | 1 | 1 | 482 | math.sum |
| color.orange | value | 474 | 1118 | 0 | 1 | 0 | 474 | runtime.color-constants-values |
| ta.wma | value | 163 | 440 | 2 | 6 | 1 | 467.17 | hostile.wma.middle-na<br>ta.invalid-length.wma.fractional<br>ta.invalid-length.wma.negative<br>ta.invalid-length.wma.nonfinite |
| alertcondition | value | 465 | 2463 | 0 | 1 | 0 | 465 | output.alertcondition-values |
| runtime.error | uncovered | 433 | 640 | 0 | 0 | 0 | 433 |  |
| ta.pivotlow | property | 243 | 384 | 3 | 5 | 1 | 432.6 | hostile.pivotlow.middle-na<br>hostile.pivotlow.multi-middle-na<br>hostile.pivotlow.plateau<br>invariant.pivotlow.confirmation-offset |
| matrix.set | value | 39 | 415 | 1 | 9 | 1 | 419.33 | language.collection-history-containers<br>language.collection-mutation-ordering-loops<br>matrix.algebra-values<br>matrix.basic-aggregates |
| label.style_label_down | value | 417 | 950 | 0 | 1 | 0 | 417 | drawing.label-style-constant-values |
| ta.pivothigh | property | 241 | 354 | 3 | 5 | 1 | 402.2 | hostile.pivothigh.middle-na<br>hostile.pivothigh.multi-middle-na<br>hostile.pivothigh.plateau<br>invariant.pivothigh.confirmation-offset |
| math.exp | value | 136 | 264 | 1 | 1 | 1 | 400 | math.exp |
| array.new_box | value | 96 | 282 | 3 | 1 | 1 | 378 | array.bool-and-constructor-values |
| array.new_line | value | 100 | 276 | 3 | 1 | 1 | 376 | array.bool-and-constructor-values |
| barcolor | value | 166 | 205 | 9 | 1 | 1 | 371 | visual.bgcolor-barcolor-metadata-values |
| color.black | value | 351 | 1309 | 0 | 1 | 0 | 351 | runtime.color-constants-values |
| array.pop | value | 104 | 247 | 1 | 1 | 1 | 351 | array.mutation-accessors |
| color.from_gradient | value | 103 | 248 | 3 | 1 | 1 | 351 | runtime.color-math-array-values |
| math.round_to_mintick | value | 73 | 276 | 1 | 1 | 1 | 349 | runtime.color-math-array-values |
| matrix.copy | value | 16 | 329 | 2 | 1 | 1 | 345 | matrix.shape-mutation-values |
| shape.triangledown | value | 333 | 418 | 0 | 1 | 0 | 333 | visual.shape-position-constant-values |
| syminfo.mintick | value | 326 | 1394 | 0 | 1 | 0 | 326 | runtime.syminfo-values |
| matrix.row | value | 17 | 306 | 1 | 1 | 1 | 323 | matrix.shape-mutation-values |
| max_bars_back | value | 298 | 336 | 0 | 1 | 0 | 298 | runtime.global-context-values |
| str.split | value | 48 | 250 | 1 | 1 | 1 | 298 | str.split |
| strategy.cancel | value | 93 | 203 | 2 | 1 | 1 | 296 | strategy.cancel-pending-order-values |
| array.unshift | value | 75 | 221 | 2 | 1 | 1 | 296 | array.mutation-accessors |
| color.lime | value | 294 | 872 | 0 | 1 | 0 | 294 | runtime.color-constants-values |
| barstate.isconfirmed | value | 293 | 971 | 0 | 1 | 0 | 293 | runtime.barstate-historical-flags |
| array.copy | value | 38 | 268 | 1 | 2 | 1 | 287 | array.mutation-accessors<br>array.receiver-result-chain-values |
| label.delete | value | 274 | 1078 | 0 | 1 | 0 | 274 | drawing.delete-all-values |
| plotchar | value | 61 | 200 | 28 | 1 | 1 | 261 | visual.marker-candle-metadata-values |
| math.cos | value | 98 | 160 | 1 | 1 | 1 | 258 | math.cos |
| array.new_label | value | 83 | 175 | 3 | 1 | 1 | 258 | array.bool-and-constructor-values |
| timeframe.change | value | 67 | 189 | 1 | 1 | 1 | 256 | runtime.timeframe-conversion-change-values |
| map.values | value | 7 | 252 | 1 | 2 | 1 | 255.5 | map.mutation-accessors<br>property.single.map.values |

## Namespace Summary

| Namespace | High-use thin | Callable high-use thin | Exposed thin |
| --- | --- | --- | --- |
| (global) | 15 | 6 | 31 |
| adjustment | 0 | 0 | 2 |
| array | 10 | 10 | 48 |
| backadjustment | 0 | 0 | 2 |
| barstate | 2 | 0 | 6 |
| box | 1 | 0 | 24 |
| chart | 0 | 0 | 16 |
| color | 12 | 2 | 21 |
| currency | 0 | 0 | 19 |
| dayofweek | 0 | 0 | 7 |
| display | 0 | 0 | 4 |
| dividends | 0 | 0 | 3 |
| earnings | 0 | 0 | 5 |
| footprint | 0 | 0 | 9 |
| format | 0 | 0 | 2 |
| hline | 2 | 0 | 3 |
| input | 0 | 0 | 3 |
| label | 4 | 0 | 35 |
| line | 2 | 0 | 19 |
| linefill | 0 | 0 | 4 |
| location | 1 | 0 | 3 |
| log | 1 | 0 | 3 |
| map | 0 | 0 | 11 |
| math | 12 | 11 | 29 |
| matrix | 1 | 1 | 48 |
| plot | 4 | 0 | 14 |
| polyline | 0 | 0 | 3 |
| position | 2 | 0 | 6 |
| request | 0 | 0 | 3 |
| runtime | 1 | 0 | 1 |
| scale | 0 | 0 | 1 |
| session | 0 | 0 | 8 |
| settlement_as_close | 0 | 0 | 2 |
| shape | 4 | 0 | 11 |
| str | 1 | 1 | 17 |
| strategy | 2 | 2 | 61 |
| syminfo | 2 | 0 | 39 |
| ta | 15 | 15 | 53 |
| table | 0 | 0 | 20 |
| text | 1 | 0 | 3 |
| ticker | 0 | 0 | 5 |
| timeframe | 1 | 1 | 11 |
| volume_row | 0 | 0 | 8 |
