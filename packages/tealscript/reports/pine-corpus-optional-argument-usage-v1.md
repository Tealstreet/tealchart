# Pine Corpus Optional Argument Usage V1

Priority note: this remains the measurement of explicit corpus usage for
vector-untested optional argument slots, but it is superseded as an actionable
build order by `pine-corpus-priority-queue-v1.md`, which merges argument-slot
usage with member depth and construct depth.

Generated at 2026-09-11T11:55:39.931Z. Measured at commit `1b35f646e3`.

## Headline

Of the 222 optional argument slots not covered by value vectors, the 2,506-script corpus explicitly passes 197 (88.74%).

75 slots are used by at least 25 scripts. Highest-use slot: input.int:group in 656 scripts.

The corpus finds real optional-argument holes left by vectors; prioritize the ranked high-use slots before treating the vector stop as complete.

High-use slots by namespace: input 32, (global) 16, strategy 9, box 6, label 6, array 3, line 1, ta 1, timeframe 1. The original judgement that the skipped remainder was dominated by low-value `input` and `strategy` slots is only half right: those namespaces dominate, but many of their slots are heavily and explicitly used by real scripts.

## Basis

- Vector untested slot source: `pine-value-vector-depth-v12.json` (222 slots).
- Corpus scripts scanned: 2506; parsed: 2469; parse failures skipped: 37.
- Method: Parse each pinned source, count an optional slot only when that parameter is explicitly supplied by name or by a positional argument at that parameter index. Defaults are not counted.
- Caveat: This is a syntax-level slot census using the same flattened reference signatures as pine-value-vector-depth-v12. It does not run semantic overload resolution.
- Caveat: Receiver-method calls whose receiver type is not visible syntactically may be undercounted when the callee name is not the documented namespace member.
- Caveat: Declaration slots are counted from parsed declaration fields, which are present only when explicitly supplied by source.

## High-Use Slots

| Slot | Scripts | Hits | Corpora | Forms |
| --- | --- | --- | --- | --- |
| input.int:group | 656 | 5905 | v5, v6, v7, v7-size-recovery | named 5905 |
| input.bool:group | 612 | 8651 | v5, v6, v7, v7-size-recovery | named 8651 |
| label.new:style | 601 | 2859 | v5, v6, v7, v7-size-recovery | named 2785, positional 74 |
| label.new:textcolor | 589 | 2722 | v5, v6, v7, v7-size-recovery | named 2649, positional 73 |
| strategy:overlay | 526 | 534 | v5, v6, v7, v7-size-recovery | declaration 534 |
| input.string:group | 514 | 3329 | v5, v6, v7, v7-size-recovery | named 3329 |
| input.float:group | 512 | 4063 | v5, v6, v7, v7-size-recovery | named 4063 |
| input.int:tooltip | 468 | 1543 | v5, v6, v7, v7-size-recovery | named 1543 |
| input:title | 350 | 3901 | v5, v6, v7, v7-size-recovery | named 2163, positional 1738 |
| input.bool:tooltip | 345 | 2585 | v5, v6, v7, v7-size-recovery | named 2578, positional 7 |
| input.color:group | 344 | 3097 | v5, v6, v7, v7-size-recovery | named 3097 |
| strategy.exit:stop | 316 | 971 | v5, v6, v7, v7-size-recovery | named 971 |
| input.float:tooltip | 299 | 1025 | v5, v6, v7, v7-size-recovery | named 1025 |
| input.string:tooltip | 238 | 893 | v5, v6, v7, v7-size-recovery | named 886, positional 7 |
| input.bool:inline | 227 | 3373 | v5, v6, v7, v7-size-recovery | named 3373 |
| box.new:bgcolor | 224 | 801 | v5, v6, v7, v7-size-recovery | named 790, positional 11 |
| input.color:inline | 206 | 2107 | v5, v6, v7, v7-size-recovery | named 2107 |
| input.int:inline | 206 | 1566 | v5, v6, v7, v7-size-recovery | named 1566 |
| strategy:slippage | 200 | 205 | v5, v6, v7, v7-size-recovery | declaration 205 |
| label.new:xloc | 197 | 738 | v5, v6, v7, v7-size-recovery | named 656, positional 82 |
| line.new:xloc | 187 | 1015 | v5, v6, v7, v7-size-recovery | named 798, positional 217 |
| input.string:inline | 184 | 1540 | v5, v6, v7, v7-size-recovery | named 1540 |
| input.timeframe:group | 149 | 348 | v5, v6, v7, v7-size-recovery | named 348 |
| input.source:group | 145 | 240 | v5, v6, v7, v7-size-recovery | named 240 |
| strategy:shorttitle | 143 | 143 | v5, v6, v7, v7-size-recovery | declaration 143 |
| label.new:tooltip | 137 | 569 | v5, v6, v7, v7-size-recovery | named 533, positional 36 |
| strategy.close_all:comment | 132 | 179 | v5, v6, v7, v7-size-recovery | named 161, positional 18 |
| input.float:inline | 117 | 987 | v5, v6, v7, v7-size-recovery | named 987 |
| input:group | 116 | 1842 | v5, v6, v7, v7-size-recovery | named 1840, positional 2 |
| strategy:margin_long | 116 | 116 | v5, v6, v7, v7-size-recovery | declaration 116 |
| strategy.entry:stop | 113 | 168 | v5, v6, v7, v7-size-recovery | named 168 |
| strategy:margin_short | 113 | 113 | v5, v6, v7, v7-size-recovery | declaration 113 |
| array.new:size | 112 | 656 | v5, v6, v7, v7-size-recovery | positional 652, named 4 |
| timeframe.in_seconds:timeframe | 106 | 346 | v5, v6, v7, v7-size-recovery | positional 346 |
| box.new:xloc | 104 | 268 | v5, v6, v7, v7-size-recovery | named 257, positional 11 |
| strategy.exit:comment | 95 | 301 | v5, v6, v7 | named 301 |
| input.session:group | 91 | 267 | v5, v6, v7, v7-size-recovery | named 267 |
| strategy:calc_on_every_tick | 90 | 90 | v5, v6, v7, v7-size-recovery | declaration 90 |
| label.new:textalign | 86 | 194 | v5, v6, v7, v7-size-recovery | named 144, positional 50 |
| input:inline | 83 | 1480 | v5, v6, v7, v7-size-recovery | named 1478, positional 2 |
| strategy:max_bars_back | 82 | 82 | v5, v6, v7, v7-size-recovery | declaration 82 |
| strategy.exit:profit | 79 | 229 | v5, v6, v7 | named 229 |
| strategy.exit:loss | 79 | 107 | v5, v6, v7 | named 107 |
| input.time:group | 75 | 144 | v5, v6, v7, v7-size-recovery | named 144 |
| box.new:text | 74 | 257 | v5, v6, v7, v7-size-recovery | named 248, positional 9 |
| box.new:text_color | 73 | 257 | v5, v6, v7, v7-size-recovery | named 248, positional 9 |
| input.color:tooltip | 65 | 260 | v5, v6, v7, v7-size-recovery | named 236, positional 24 |
| input.time:confirm | 62 | 131 | v5, v6, v7 | named 131 |
| array.new:initial_value | 61 | 261 | v5, v6, v7, v7-size-recovery | positional 257, named 4 |
| strategy:max_labels_count | 55 | 57 | v5, v6, v7, v7-size-recovery | declaration 57 |
| input.int:display | 54 | 341 | v5, v6, v7, v7-size-recovery | named 341 |
| box.new:text_halign | 51 | 166 | v5, v6, v7, v7-size-recovery | named 166 |
| input.source:tooltip | 51 | 69 | v5, v6, v7, v7-size-recovery | named 69 |
| input.timeframe:tooltip | 48 | 65 | v5, v6, v7, v7-size-recovery | named 65 |
| input.timeframe:inline | 47 | 179 | v5, v6, v7, v7-size-recovery | named 179 |
| input.symbol:group | 46 | 252 | v5, v6, v7, v7-size-recovery | named 252 |
| strategy:max_lines_count | 46 | 48 | v5, v6, v7, v7-size-recovery | declaration 48 |
| input.string:display | 45 | 203 | v5, v6, v7, v7-size-recovery | named 203 |
| plotchar:size | 45 | 135 | v5, v6, v7, v7-size-recovery | named 135 |
| box.new:text_valign | 42 | 145 | v5, v6, v7, v7-size-recovery | named 145 |
| input:tooltip | 38 | 171 | v5, v6, v7, v7-size-recovery | named 169, positional 2 |
| strategy:precision | 37 | 37 | v5, v6, v7 | declaration 37 |
| label.new:force_overlay | 34 | 143 | v5, v6, v7, v7-size-recovery | named 143 |
| input.source:inline | 34 | 59 | v5, v6, v7, v7-size-recovery | named 59 |
| strategy.entry:alert_message | 33 | 126 | v5, v6, v7, v7-size-recovery | named 126 |
| strategy.exit:qty_percent | 32 | 140 | v5, v6, v7 | named 140 |
| input.bool:display | 31 | 332 | v5, v6, v7, v7-size-recovery | named 332 |
| input.float:display | 29 | 178 | v5, v6, v7, v7-size-recovery | named 178 |
| strategy:max_boxes_count | 28 | 28 | v5, v6, v7, v7-size-recovery | declaration 28 |
| input.int:active | 27 | 170 | v5, v6, v7, v7-size-recovery | named 170 |
| array.new_box:initial_value | 27 | 89 | v5, v6, v7, v7-size-recovery | positional 89 |
| input.string:active | 27 | 88 | v5, v6, v7, v7-size-recovery | named 88 |
| strategy.entry:oca_name | 27 | 47 | v5, v6, v7 | named 47 |
| input.session:inline | 26 | 125 | v5, v6, v7, v7-size-recovery | named 125 |
| ta.vwap:anchor | 26 | 42 | v5, v6, v7, v7-size-recovery | positional 42 |

## Ranked Slots

| Slot | Scripts | Hits | Corpora | Forms | Samples |
| --- | --- | --- | --- | --- | --- |
| input.int:group | 656 | 5905 | v5, v6, v7, v7-size-recovery | named 5905 | v5:sources/0042__mihakralj-pinescript__phasor.pine:100<br>v5:sources/0471__everget-tradingview-pinescript-indicators__chandelier_exit.pine:7<br>v5:sources/0473__everget-tradingview-pinescript-indicators__parabolic_sar.pine:12 |
| input.bool:group | 612 | 8651 | v5, v6, v7, v7-size-recovery | named 8651 | v5:sources/0042__mihakralj-pinescript__phasor.pine:103<br>v5:sources/0200__mihakralj-pinescript__bbs.pine:132<br>v5:sources/0471__everget-tradingview-pinescript-indicators__chandelier_exit.pine:16 |
| label.new:style | 601 | 2859 | v5, v6, v7, v7-size-recovery | named 2785, positional 74 | v5:sources/0134__mihakralj-pinescript__mlp.pine:459<br>v5:sources/0452__everget-tradingview-pinescript-indicators__chart_type_identifier.pine:106<br>v5:sources/0454__everget-tradingview-pinescript-indicators__heikin_ashi_chart_identifier.pine:28 |
| label.new:textcolor | 589 | 2722 | v5, v6, v7, v7-size-recovery | named 2649, positional 73 | v5:sources/0452__everget-tradingview-pinescript-indicators__chart_type_identifier.pine:105<br>v5:sources/0454__everget-tradingview-pinescript-indicators__heikin_ashi_chart_identifier.pine:27<br>v5:sources/0455__everget-tradingview-pinescript-indicators__kagi_chart_identifier.pine:34 |
| strategy:overlay | 526 | 534 | v5, v6, v7, v7-size-recovery | declaration 534 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine:22<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:24<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:21 |
| input.string:group | 514 | 3329 | v5, v6, v7, v7-size-recovery | named 3329 | v5:sources/0476__everget-tradingview-pinescript-indicators__unit_testing_framework.pine:248<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:76<br>v5:sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine:70 |
| input.float:group | 512 | 4063 | v5, v6, v7, v7-size-recovery | named 4063 | v5:sources/0471__everget-tradingview-pinescript-indicators__chandelier_exit.pine:8<br>v5:sources/0472__everget-tradingview-pinescript-indicators__nrtr_nick_rypock_trailing_reverse.pine:7<br>v5:sources/0473__everget-tradingview-pinescript-indicators__parabolic_sar.pine:9 |
| input.int:tooltip | 468 | 1543 | v5, v6, v7, v7-size-recovery | named 1543 | v5:sources/0012__mihakralj-pinescript__maenv.pine:61<br>v5:sources/0019__mihakralj-pinescript__ubands.pine:43<br>v5:sources/0020__mihakralj-pinescript__uchannel.pine:57 |
| input:title | 350 | 3901 | v5, v6, v7, v7-size-recovery | named 2163, positional 1738 | v5:sources/0161__mihakralj-pinescript__exp.pine:18<br>v5:sources/0163__mihakralj-pinescript__exptrans.pine:18<br>v5:sources/0174__mihakralj-pinescript__linear.pine:37 |
| input.bool:tooltip | 345 | 2585 | v5, v6, v7, v7-size-recovery | named 2578, positional 7 | v5:sources/0092__mihakralj-pinescript__wrmse.pine:40<br>v5:sources/0133__mihakralj-pinescript__afirma.pine:114<br>v5:sources/0231__mihakralj-pinescript__smi.pine:82 |
| input.color:group | 344 | 3097 | v5, v6, v7, v7-size-recovery | named 3097 | v5:sources/0476__everget-tradingview-pinescript-indicators__unit_testing_framework.pine:266<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:78<br>v5:sources/0491__casoon-pine-scripts__pattern_recognition.pine:254 |
| strategy.exit:stop | 316 | 971 | v5, v6, v7, v7-size-recovery | named 971 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine:405<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:1286<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:2203 |
| input.float:tooltip | 299 | 1025 | v5, v6, v7, v7-size-recovery | named 1025 | v5:sources/0019__mihakralj-pinescript__ubands.pine:44<br>v5:sources/0020__mihakralj-pinescript__uchannel.pine:58<br>v5:sources/0022__mihakralj-pinescript__vwapsd.pine:45 |
| input.string:tooltip | 238 | 893 | v5, v6, v7, v7-size-recovery | named 886, positional 7 | v5:sources/0059__mihakralj-pinescript__qstick.pine:49<br>v5:sources/0405__mihakralj-pinescript__vroc.pine:29<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:33 |
| input.bool:inline | 227 | 3373 | v5, v6, v7, v7-size-recovery | named 3373 | v5:sources/0042__mihakralj-pinescript__phasor.pine:103<br>v5:sources/0493__casoon-pine-scripts__rj_wave.pine:95<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:226 |
| box.new:bgcolor | 224 | 801 | v5, v6, v7, v7-size-recovery | named 790, positional 11 | v5:sources/0494__casoon-pine-scripts__smart_money_dashboard.pine:458<br>v5:sources/0495__casoon-pine-scripts__wave_navigator.pine:1901<br>v5:sources/0504__casoon-pine-scripts__candle_story_engine.pine:440 |
| input.color:inline | 206 | 2107 | v5, v6, v7, v7-size-recovery | named 2107 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:78<br>v5:sources/0530__casoon-pine-scripts__zigzag_fibo_pullback_map.pine:29<br>v5:sources/0543__casoon-pine-scripts__momentum_profile.pine:50 |
| input.int:inline | 206 | 1566 | v5, v6, v7, v7-size-recovery | named 1566 | v5:sources/0506__casoon-pine-scripts__edge_atlas.pine:763<br>v5:sources/0530__casoon-pine-scripts__zigzag_fibo_pullback_map.pine:31<br>v5:sources/0565__casoon-pine-scripts__volume_strata.pine:51 |
| strategy:slippage | 200 | 205 | v5, v6, v7, v7-size-recovery | declaration 205 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine:22<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:24<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:21 |
| label.new:xloc | 197 | 738 | v5, v6, v7, v7-size-recovery | named 656, positional 82 | v5:sources/0465__everget-tradingview-pinescript-indicators__gaps_percent_size_distribution.pine:92<br>v5:sources/0466__everget-tradingview-pinescript-indicators__linear_regression_all_data.pine:76<br>v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine:594 |
| line.new:xloc | 187 | 1015 | v5, v6, v7, v7-size-recovery | named 798, positional 217 | v5:sources/0465__everget-tradingview-pinescript-indicators__gaps_percent_size_distribution.pine:78<br>v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine:522<br>v5:sources/0495__casoon-pine-scripts__wave_navigator.pine:2540 |
| input.string:inline | 184 | 1540 | v5, v6, v7, v7-size-recovery | named 1540 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:69<br>v5:sources/0506__casoon-pine-scripts__edge_atlas.pine:757<br>v5:sources/0554__casoon-pine-scripts__wavetrend.pine:66 |
| input.timeframe:group | 149 | 348 | v5, v6, v7, v7-size-recovery | named 348 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:61<br>v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine:242<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine:191 |
| input.source:group | 145 | 240 | v5, v6, v7, v7-size-recovery | named 240 | v5:sources/0042__mihakralj-pinescript__phasor.pine:101<br>v5:sources/0474__everget-tradingview-pinescript-indicators__supertrend.pine:9<br>v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:27 |
| strategy:shorttitle | 143 | 143 | v5, v6, v7, v7-size-recovery | declaration 143 | v5:sources/0659__SammyEnigma-pine-scripts__BBW-RSI-60-Strategy.pine:12<br>v5:sources/0661__SammyEnigma-pine-scripts__bb-rsi-15m-3.pine:6<br>v5:sources/0662__SammyEnigma-pine-scripts__bb-rsi-1m-3.pine:6 |
| label.new:tooltip | 137 | 569 | v5, v6, v7, v7-size-recovery | named 533, positional 36 | v5:sources/0465__everget-tradingview-pinescript-indicators__gaps_percent_size_distribution.pine:93<br>v5:sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine:275<br>v5:sources/0489__casoon-pine-scripts__flow_bias.pine:462 |
| strategy.close_all:comment | 132 | 179 | v5, v6, v7, v7-size-recovery | named 161, positional 18 | v5:sources/0604__casoon-pine-scripts__RTAStrategy.pine:2311<br>v5:sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine:250<br>v5:sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine:187 |
| input.float:inline | 117 | 987 | v5, v6, v7, v7-size-recovery | named 987 | v5:sources/0506__casoon-pine-scripts__edge_atlas.pine:773<br>v5:sources/0572__casoon-pine-scripts__market_average_relationship_engine.pine:348<br>v5:sources/0606__casoon-pine-scripts__market_average_relationship_engine_strategy.pine:347 |
| input:group | 116 | 1842 | v5, v6, v7, v7-size-recovery | named 1840, positional 2 | v5:sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine:705<br>v5:sources/0728__gorx1-TradingView__Quantile-BasedAdaptiveDetection.pine:287<br>v5:sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine:43 |
| strategy:margin_long | 116 | 116 | v5, v6, v7, v7-size-recovery | declaration 116 | v5:sources/0790__hasnocool-tradingview-pine-scripts__Rainbow-Oscillator-Strategy-.pine:2<br>v5:sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine:8<br>v5:sources/0799__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine:8 |
| strategy.entry:stop | 113 | 168 | v5, v6, v7, v7-size-recovery | named 168 | v5:sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine:221<br>v5:sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine:164<br>v5:sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine:164 |
| strategy:margin_short | 113 | 113 | v5, v6, v7, v7-size-recovery | declaration 113 | v5:sources/0790__hasnocool-tradingview-pine-scripts__Rainbow-Oscillator-Strategy-.pine:2<br>v5:sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine:8<br>v5:sources/0799__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine:8 |
| array.new:size | 112 | 656 | v5, v6, v7, v7-size-recovery | positional 652, named 4 | v5:sources/0353__mihakralj-pinescript__zldema.pine:24<br>v5:sources/0354__mihakralj-pinescript__zlema.pine:22<br>v5:sources/0355__mihakralj-pinescript__zltema.pine:29 |
| timeframe.in_seconds:timeframe | 106 | 346 | v5, v6, v7, v7-size-recovery | positional 346 | v5:sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine:501<br>v5:sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine:371<br>v5:sources/0487__casoon-pine-scripts__directional_probability_engine_v3.pine:567 |
| box.new:xloc | 104 | 268 | v5, v6, v7, v7-size-recovery | named 257, positional 11 | v5:sources/0506__casoon-pine-scripts__edge_atlas.pine:1814<br>v5:sources/0510__casoon-pine-scripts__market_motion_dna_v1.pine:947<br>v5:sources/0511__casoon-pine-scripts__market_scenario_projector.pine:1037 |
| strategy.exit:comment | 95 | 301 | v5, v6, v7 | named 301 | v5:sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine:617<br>v5:sources/0693__oguzhandilber-PineScripts__RSI-VWAP.pine:97<br>v5:sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine:624 |
| input.session:group | 91 | 267 | v5, v6, v7, v7-size-recovery | named 267 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine:86<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:1221<br>v5:sources/0506__casoon-pine-scripts__edge_atlas.pine:451 |
| strategy:calc_on_every_tick | 90 | 90 | v5, v6, v7, v7-size-recovery | declaration 90 | v5:sources/0658__knectardev-pine_scripts__redone-es-fade_v1.0.1.pine:14<br>v5:sources/0659__SammyEnigma-pine-scripts__BBW-RSI-60-Strategy.pine:12<br>v5:sources/0661__SammyEnigma-pine-scripts__bb-rsi-15m-3.pine:6 |
| label.new:textalign | 86 | 194 | v5, v6, v7, v7-size-recovery | named 144, positional 50 | v5:sources/0459__everget-tradingview-pinescript-indicators__symbol_info_helper.pine:24<br>v5:sources/0466__everget-tradingview-pinescript-indicators__linear_regression_all_data.pine:78<br>v5:sources/0475__everget-tradingview-pinescript-indicators__session_input_parser.pine:72 |
| input:inline | 83 | 1480 | v5, v6, v7, v7-size-recovery | named 1478, positional 2 | v5:sources/0728__gorx1-TradingView__Quantile-BasedAdaptiveDetection.pine:267<br>v5:sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine:43<br>v5:sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine:22 |
| strategy:max_bars_back | 82 | 82 | v5, v6, v7, v7-size-recovery | declaration 82 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:24<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:21<br>v5:sources/0605__casoon-pine-scripts__chandelier_flip_radar_strategy.pine:28 |
| strategy.exit:profit | 79 | 229 | v5, v6, v7 | named 229 | v5:sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine:624<br>v5:sources/0799__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine:333<br>v5:sources/0800__Leci37-tuisku_Web_selling__VFdMT181TWluXzFBRFh0dWlza3VmNmQ4YmJhYw.pine:325 |
| strategy.exit:loss | 79 | 107 | v5, v6, v7 | named 107 | v5:sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine:618<br>v5:sources/0799__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine:327<br>v5:sources/0800__Leci37-tuisku_Web_selling__VFdMT181TWluXzFBRFh0dWlza3VmNmQ4YmJhYw.pine:319 |
| input.time:group | 75 | 144 | v5, v6, v7, v7-size-recovery | named 144 | v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine:89<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:1224<br>v5:sources/0518__casoon-pine-scripts__reversal_type_classifier_v1.pine:67 |
| box.new:text | 74 | 257 | v5, v6, v7, v7-size-recovery | named 248, positional 9 | v5:sources/0494__casoon-pine-scripts__smart_money_dashboard.pine:459<br>v5:sources/0519__casoon-pine-scripts__smc_structure_expectation.pine:1765<br>v5:sources/0779__Opus-Aether-AI-pine-transpiler__asia_range_box_lite.pine:15 |
| box.new:text_color | 73 | 257 | v5, v6, v7, v7-size-recovery | named 248, positional 9 | v5:sources/0494__casoon-pine-scripts__smart_money_dashboard.pine:460<br>v5:sources/0519__casoon-pine-scripts__smc_structure_expectation.pine:1765<br>v5:sources/0779__Opus-Aether-AI-pine-transpiler__asia_range_box_lite.pine:15 |
| input.color:tooltip | 65 | 260 | v5, v6, v7, v7-size-recovery | named 236, positional 24 | v5:sources/0536__casoon-pine-scripts__cci_advanced.pine:71<br>v5:sources/0545__casoon-pine-scripts__mtf_wavetrend_opportunity_hunter.pine:167<br>v5:sources/0574__casoon-pine-scripts__smooth_trend_radar.pine:94 |
| input.time:confirm | 62 | 131 | v5, v6, v7 | named 131 | v5:sources/0829__regalouisei-collect-tradingview__modern-portfolio-management-indicator.pine:46<br>v6:sources/0094__BlueprintResearch-Gann-and-Financial-Astrology-Indicators__price-and-longitude-angles.pine:59<br>v6:sources/0245__regalouisei-collect-tradingview__interactive-atr-stop-loss-tanhef.pine:14 |
| array.new:initial_value | 61 | 261 | v5, v6, v7, v7-size-recovery | positional 257, named 4 | v5:sources/0353__mihakralj-pinescript__zldema.pine:24<br>v5:sources/0354__mihakralj-pinescript__zlema.pine:22<br>v5:sources/0355__mihakralj-pinescript__zltema.pine:29 |
| strategy:max_labels_count | 55 | 57 | v5, v6, v7, v7-size-recovery | declaration 57 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:24<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:21<br>v5:sources/0606__casoon-pine-scripts__market_average_relationship_engine_strategy.pine:38 |
| input.int:display | 54 | 341 | v5, v6, v7, v7-size-recovery | named 341 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:221<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:238<br>v5:sources/0554__casoon-pine-scripts__wavetrend.pine:256 |
| box.new:text_halign | 51 | 166 | v5, v6, v7, v7-size-recovery | named 166 | v5:sources/0519__casoon-pine-scripts__smc_structure_expectation.pine:1765<br>v5:sources/0784__deepentropy-lightweight-charts-indicators__Dynamic-Supply-and-Demand-Zones-AlgoAlpha-.pine:94<br>v5:sources/0840__iamc1oud-Tradingview-Scripts__Smart-Money-Concept-with-Liquidity-Swings.pine:962 |
| input.source:tooltip | 51 | 69 | v5, v6, v7, v7-size-recovery | named 69 | v5:sources/0059__mihakralj-pinescript__qstick.pine:51<br>v5:sources/0206__mihakralj-pinescript__deco.pine:62<br>v5:sources/0218__mihakralj-pinescript__inertia.pine:38 |
| input.timeframe:tooltip | 48 | 65 | v5, v6, v7, v7-size-recovery | named 65 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine:62<br>v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:205<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:103 |
| input.timeframe:inline | 47 | 179 | v5, v6, v7, v7-size-recovery | named 179 | v5:sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine:8<br>v5:sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine:65<br>v5:sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine:2413 |
| input.symbol:group | 46 | 252 | v5, v6, v7, v7-size-recovery | named 252 | v5:sources/0528__casoon-pine-scripts__wyckoff_schematics.pine:81<br>v5:sources/0545__casoon-pine-scripts__mtf_wavetrend_opportunity_hunter.pine:99<br>v5:sources/0554__casoon-pine-scripts__wavetrend.pine:207 |
| strategy:max_lines_count | 46 | 48 | v5, v6, v7, v7-size-recovery | declaration 48 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:24<br>v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine:21<br>v5:sources/0606__casoon-pine-scripts__market_average_relationship_engine_strategy.pine:38 |
| input.string:display | 45 | 203 | v5, v6, v7, v7-size-recovery | named 203 | v5:sources/0497__casoon-pine-scripts__wavetrend_strategy.pine:69<br>v5:sources/0554__casoon-pine-scripts__wavetrend.pine:250<br>v5:sources/0565__casoon-pine-scripts__volume_strata.pine:59 |
| plotchar:size | 45 | 135 | v5, v6, v7, v7-size-recovery | named 135 | v5:sources/0041__mihakralj-pinescript__lunar.pine:56<br>v5:sources/0044__mihakralj-pinescript__solar.pine:44<br>v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine:725 |
| box.new:text_valign | 42 | 145 | v5, v6, v7, v7-size-recovery | named 145 | v5:sources/0519__casoon-pine-scripts__smc_structure_expectation.pine:1765<br>v5:sources/0784__deepentropy-lightweight-charts-indicators__Dynamic-Supply-and-Demand-Zones-AlgoAlpha-.pine:94<br>v5:sources/0840__iamc1oud-Tradingview-Scripts__Smart-Money-Concept-with-Liquidity-Swings.pine:962 |

## Namespace Summary

| Namespace | Exercised slots | Unexercised slots | High-use slots |
| --- | --- | --- | --- |
| (global) | 49 | 11 | 16 |
| array | 9 | 0 | 3 |
| box | 9 | 0 | 6 |
| input | 71 | 7 | 32 |
| label | 7 | 0 | 6 |
| line | 2 | 0 | 1 |
| matrix | 0 | 1 | 0 |
| request | 6 | 1 | 0 |
| strategy | 34 | 3 | 9 |
| ta | 3 | 2 | 1 |
| table | 3 | 0 | 0 |
| ticker | 3 | 0 | 0 |
| timeframe | 1 | 0 | 1 |

## Unexercised Slots

- `color:transp`
- `input.enum:confirm`
- `input.price:display`
- `input.session:confirm`
- `input.symbol:active`
- `input.symbol:confirm`
- `input.text_area:inline`
- `input.timeframe:confirm`
- `matrix.sort:sort_field`
- `plotarrow:display`
- `plotarrow:editable`
- `plotarrow:force_overlay`
- `plotarrow:format`
- `plotarrow:offset`
- `plotarrow:precision`
- `plotchar:format`
- `plotchar:precision`
- `plotshape:format`
- `plotshape:precision`
- `request.security_lower_tf:currency`
- `strategy.close_all:disable_alert`
- `strategy.close:disable_alert`
- `strategy.entry:disable_alert`
- `ta.max:source2`
- `ta.min:source2`
