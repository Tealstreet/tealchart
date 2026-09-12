> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Output Asymmetry Reslice v1

Date: 2026-09-11
Generated at commit: `f7dd0ac6652f832669a6076348c50edda92813d6`
Source measurement commit: `7c08371da19c918e42e591c4f461f3183e2a0d58`
Source report: `reports/external-pine-corpus-output-reference-free-v2.json`
Machine-readable companion: `reports/external-pine-corpus-output-asymmetry-reslice-v1.json`

## Headline

The output-property line is closed on this corpus set: the reference-free payload audit did not produce a discriminating defect queue, the v2 member-property audit fired zero validated findings and zero unvalidated leads across 658 applied rules, and this sibling-asymmetry reslice is common enough to be non-discriminating.

The asymmetry is common, not rare. At least 942/1230 all-NaN fields sit in scripts with a producing sibling plot, across 183/259 all-NaN scripts.

At least 598/912 constant-finite fields sit in scripts with a varying sibling plot, across 137/239 constant-field scripts.

These are lower bounds from the saved reference-free report. The report persisted fired fields and visible plot counts, not every non-firing sibling payload, so plotbar/plotcandle field-level siblings can only increase these numbers.

## Denominator

| Corpus | Produced-output rows |
| --- | --- |
| v5 | 855 |
| v6 | 777 |
| v7 | 304 |

## Reslice Counts

| Slice | Fields | Scripts |
| --- | --- | --- |
| all-NaN fields | 1230 | 259 |
| all-NaN fields with producing sibling lower bound | 942 | 183 |
| constant-finite fields | 912 | 239 |
| constant-finite fields with varying sibling lower bound | 598 | 137 |

## Representative All-NaN Asymmetry Rows

| Corpus | Row | Visible plots | All-NaN | Constant | Finding plot indexes | Examples |
| --- | --- | --- | --- | --- | --- | --- |
| v5 | sources/0042__mihakralj-pinescript__phasor.pine | 3 | 2 | 0 | 2 | all-na 1:Derived Period.values; all-na 2:Trend State.values |
| v5 | sources/0448__everget-tradingview-pinescript-indicators__mfi_money_flow_index.pine | 15 | 1 | 0 | 1 | all-na 2:Histogram.values |
| v5 | sources/0451__everget-tradingview-pinescript-indicators__tsi_true_strength_index.pine | 15 | 1 | 0 | 1 | all-na 2:Histogram.values |
| v5 | sources/0463__everget-tradingview-pinescript-indicators__dividends_per_share_dps_yearly.pine | 27 | 21 | 0 | 21 | all-na 0:Current.values; all-na 2:1Y ago.values; all-na 3:2Y ago.values; all-na 4:3Y ago.values; all-na 6:4Y ago.values; all-na 7:5Y ago.values |
| v5 | sources/0464__everget-tradingview-pinescript-indicators__earnings_per_share_eps_yearly.pine | 27 | 21 | 0 | 21 | all-na 0:Current.values; all-na 2:1Y ago.values; all-na 3:2Y ago.values; all-na 4:3Y ago.values; all-na 6:4Y ago.values; all-na 7:5Y ago.values |
| v5 | sources/0468__everget-tradingview-pinescript-indicators__ticker_performance_by_us_president.pine | 49 | 21 | 0 | 21 | all-na 7:Barack Obama.values; all-na 9:George W. Bush.values; all-na 11:Bill Clinton.values; all-na 13:George H. W. Bush.values; all-na 15:Ronald Reagan.values; all-na 17:Jimmy Carter.values |
| v5 | sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine | 35 | 11 | 1 | 12 | all-na 1:30Y, %.values; all-na 4:10Y, %.values; all-na 7:7Y, %.values; all-na 10:5Y, %.values; all-na 13:3Y, %.values; all-na 16:2Y, %.values |
| v5 | sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine | 17 | 1 | 7 | 8 | all-na 0:YTD, %.values; constant-finite 1:.values; constant-finite 4:.values; constant-finite 6:.values; constant-finite 8:.values; constant-finite 10:.values |
| v5 | sources/0478__everget-tradingview-pinescript-indicators__price_volume_trend.pine | 5 | 2 | 0 | 2 | all-na 0:PVT.values; all-na 1:Signal.values |
| v5 | sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine | 31 | 9 | 6 | 15 | all-na 3:Long Score Line.values; all-na 4:Short Score Line.values; constant-finite 6:Long inclination threshold.values; constant-finite 7:Short inclination threshold.values; constant-finite 8:Long setup threshold.values; constant-finite 9:Short setup threshold.values |
| v5 | sources/0499__casoon-pine-scripts__commodity_heat_reversal.pine | 13 | 2 | 0 | 2 | all-na 4:Long SL.values; all-na 6:Long TP.values |
| v5 | sources/0500__casoon-pine-scripts__signal_quality_engine.pine | 15 | 3 | 0 | 3 | all-na 12:Active SL.values; all-na 13:Active TP1.values; all-na 14:Active TP2.values |
| v5 | sources/0504__casoon-pine-scripts__candle_story_engine.pine | 40 | 1 | 0 | 1 | all-na 0:Trend EMA.values |
| v5 | sources/0510__casoon-pine-scripts__market_motion_dna_v1.pine | 22 | 1 | 0 | 1 | all-na 3:Support MA.values |
| v5 | sources/0516__casoon-pine-scripts__modern_wyckoff_state_machine_visual.pine | 5 | 1 | 0 | 1 | all-na 4:Wyckoff Phase Track.values |
| v5 | sources/0529__casoon-pine-scripts__zigzag_core.pine | 7 | 3 | 0 | 3 | all-na 4:LTF Buffer Size.values; all-na 5:Level 2 Last Pivot.values; all-na 6:Secondary Last Pivot.values |
| v5 | sources/0533__casoon-pine-scripts__midas_curves.pine | 17 | 6 | 0 | 6 | all-na 0:MIDAS value.values; all-na 1:Upper 1.values; all-na 2:Lower 1.values; all-na 3:Upper 2.values; all-na 4:Lower 2.values; all-na 8:TBF exhaustion.values |
| v5 | sources/0537__casoon-pine-scripts__elder_ray_pressure_engine.pine | 13 | 5 | 0 | 5 | all-na 1:Bull Pressure.values; all-na 2:Bear Pressure.values; all-na 3:Net Pressure.values; all-na 4:Pressure Impulse.values; all-na 5:Pressure Acceleration.values |
| v5 | sources/0540__casoon-pine-scripts__market_exhaustion.pine | 16 | 1 | 1 | 2 | all-na 3:CCI (mapped 0-100).values; constant-finite 6:50.values |
| v5 | sources/0546__casoon-pine-scripts__oscillator_divergence_zones.pine | 10 | 2 | 3 | 5 | constant-finite 0:OB.values; constant-finite 1:OS.values; constant-finite 2:Mid.values; all-na 3:DZ Upper.values; all-na 4:DZ Lower.values |
| v5 | sources/0549__casoon-pine-scripts__reversal_engine_score_v1.pine | 10 | 4 | 0 | 4 | all-na 3:Long SL.values; all-na 4:Long TP.values; all-na 5:Short SL.values; all-na 6:Short TP.values |
| v5 | sources/0554__casoon-pine-scripts__wavetrend.pine | 10 | 2 | 0 | 2 | all-na 5:Adaptive Upper Threshold.values; all-na 6:Adaptive Lower Threshold.values |
| v5 | sources/0562__casoon-pine-scripts__klinger_volume_force_map_v1_0_0.pine | 29 | 3 | 4 | 7 | constant-finite 3:Zero.values; constant-finite 4:Bull regime threshold.values; constant-finite 5:Bear regime threshold.values; constant-finite 7:Flow Regime.values; all-na 20:Research · Original 1997.values; all-na 21:Research · TV Documentation.values |
| v5 | sources/0563__casoon-pine-scripts__mfi_advanced.pine | 18 | 1 | 0 | 1 | all-na 8:Trend Context.values |
| v5 | sources/0567__casoon-pine-scripts__relative_strength_line.pine | 6 | 1 | 1 | 2 | all-na 1:RS MA.values; constant-finite 2:Zero.values |
| v5 | sources/0568__casoon-pine-scripts__adaptive_arithmetic_candles.pine | 17 | 1 | 0 | 1 | all-na 1:Real Close.values |
| v5 | sources/0569__casoon-pine-scripts__chandelier_flip_radar.pine | 21 | 3 | 0 | 3 | all-na 0:HTF Stop Up.values; all-na 1:HTF Stop Down.values; all-na 6:Performance AMA.values |
| v5 | sources/0571__casoon-pine-scripts__ma_regime_bands.pine | 11 | 4 | 0 | 4 | all-na 0:MA 1.values; all-na 1:MA 2.values; all-na 2:MA 3.values; all-na 3:Average MA.values |
| v5 | sources/0573__casoon-pine-scripts__modern_trend_regime.pine | 21 | 6 | 0 | 6 | all-na 0:Fast Trend.values; all-na 5:Range oben.values; all-na 6:Range unten.values; all-na 8:Range-Mitte.values; all-na 9:Range oberes Quartil.values; all-na 10:Range unteres Quartil.values |
| v5 | sources/0577__casoon-pine-scripts__vein_feature_exporter.pine | 59 | 16 | 0 | 16 | all-na 6:MFI 14.values; all-na 7:Rel Volume (scaled).values; all-na 8:BB Width (scaled).values; all-na 9:Candle/ATR (scaled).values; all-na 10:BB Dist Norm (scaled).values; all-na 11:Price-EMA20 ATR (scaled).values |
| v5 | sources/0579__casoon-pine-scripts__vein_reversal_labeler.pine | 6 | 3 | 0 | 3 | all-na 3:ATR.values; all-na 4:Strong Bull Target.values; all-na 5:Strong Bear Target.values |
| v5 | sources/0582__casoon-pine-scripts__vein_spread_context.pine | 5 | 3 | 2 | 5 | all-na 0:Spread Value [dw].values; all-na 1:Spread EMA Fast [dw].values; all-na 2:Spread EMA Slow [dw].values; constant-finite 3:Spread Modifier [dw].values; constant-finite 4:Spread Div [dw].values |
| v5 | sources/0583__casoon-pine-scripts__vein_structure_zones.pine | 28 | 7 | 3 | 10 | all-na 0:Micro Swing High.values; all-na 1:Micro Swing Low.values; all-na 2:Major Swing High.values; all-na 3:Major Swing Low.values; constant-finite 9:CLX Confirmed.values; all-na 16:POC Level.values |
| v5 | sources/0589__casoon-pine-scripts__market_state_engine.pine | 40 | 3 | 0 | 3 | all-na 1:Box VWAP.values; all-na 6:Fast Structure.values; all-na 7:Slow Structure.values |
| v5 | sources/0592__casoon-pine-scripts__regime_classifier.pine | 12 | 1 | 0 | 1 | all-na 1:HTF Trendiness.values |
| v5 | sources/0593__casoon-pine-scripts__regime_detector.pine | 21 | 9 | 0 | 9 | all-na 7:MA Zone Long SL.values; all-na 8:MA Zone Long Entry.values; all-na 9:MA Zone Short SL.values; all-na 10:MA Zone Short Entry.values; all-na 11:FVT.values; all-na 12:SSA Bias Top.values |
| v5 | sources/0594__casoon-pine-scripts__regime_transition_engine.pine | 19 | 6 | 0 | 6 | all-na 8:Compression Score.values; all-na 9:Expansion Score.values; all-na 10:Trend Up Score.values; all-na 11:Trend Down Score.values; all-na 12:Exhaustion Score.values; all-na 13:Reversion Score.values |
| v5 | sources/0595__casoon-pine-scripts__trend_persistence_score.pine | 18 | 4 | 0 | 4 | all-na 3:R² Score.values; all-na 4:Efficiency Ratio.values; all-na 5:ADX Score (effective).values; all-na 6:FDI Trend Score.values |
| v5 | sources/0599__casoon-pine-scripts__williams_vix_fix_advanced.pine | 11 | 2 | 0 | 2 | all-na 4:Bull Percentile.values; all-na 6:Bear Percentile.values |
| v5 | sources/0605__casoon-pine-scripts__chandelier_flip_radar_strategy.pine | 21 | 3 | 0 | 3 | all-na 0:HTF Stop Up.values; all-na 1:HTF Stop Down.values; all-na 6:Performance AMA.values |

## Representative Constant Asymmetry Rows

| Corpus | Row | Visible plots | All-NaN | Constant | Finding plot indexes | Examples |
| --- | --- | --- | --- | --- | --- | --- |
| v5 | sources/0216__mihakralj-pinescript__gator.pine | 3 | 0 | 1 | 1 | constant-finite 2:Zero.values |
| v5 | sources/0232__mihakralj-pinescript__squeeze.pine | 4 | 0 | 1 | 1 | constant-finite 2:Squeeze Off.values |
| v5 | sources/0365__mihakralj-pinescript__cvi.pine | 2 | 0 | 1 | 1 | constant-finite 1:Zero.values |
| v5 | sources/0391__mihakralj-pinescript__kvo.pine | 4 | 0 | 3 | 3 | constant-finite 0:KVO.values; constant-finite 1:Signal.values; constant-finite 3:Histogram.values |
| v5 | sources/0449__everget-tradingview-pinescript-indicators__stc_schaff_trend_cycle.pine | 9 | 0 | 2 | 2 | constant-finite 1:Upper.values; constant-finite 3:Lower.values |
| v5 | sources/0461__everget-tradingview-pinescript-indicators__bullish_bearish_candle_series_distribution.pine | 64 | 0 | 40 | 40 | constant-finite 3:4.values; constant-finite 6:7.values; constant-finite 9:10.values; constant-finite 11:11.values; constant-finite 15:15.values; constant-finite 16:16.values |
| v5 | sources/0462__everget-tradingview-pinescript-indicators__close_to_close_percent_change_distribution.pine | 63 | 0 | 8 | 8 | constant-finite 20:4-4.25%.values; constant-finite 22:4.25-4.5%.values; constant-finite 23:4.5-4.75%.values; constant-finite 28:5.5-5.75%.values; constant-finite 29:5.75-6%.values; constant-finite 51:-4-4.25%.values |
| v5 | sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine | 11 | 0 | 3 | 3 | constant-finite 2:.values; constant-finite 5:Profit.values; constant-finite 8:Loss.values |
| v5 | sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine | 35 | 11 | 1 | 12 | all-na 1:30Y, %.values; all-na 4:10Y, %.values; all-na 7:7Y, %.values; all-na 10:5Y, %.values; all-na 13:3Y, %.values; all-na 16:2Y, %.values |
| v5 | sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine | 17 | 1 | 7 | 8 | all-na 0:YTD, %.values; constant-finite 1:.values; constant-finite 4:.values; constant-finite 6:.values; constant-finite 8:.values; constant-finite 10:.values |
| v5 | sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine | 31 | 9 | 6 | 15 | all-na 3:Long Score Line.values; all-na 4:Short Score Line.values; constant-finite 6:Long inclination threshold.values; constant-finite 7:Short inclination threshold.values; constant-finite 8:Long setup threshold.values; constant-finite 9:Short setup threshold.values |
| v5 | sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine | 15 | 0 | 5 | 5 | constant-finite 0:Pane Anchor.values; constant-finite 1:High.values; constant-finite 2:Mid.values; constant-finite 3:Low.values; constant-finite 14:ChopShare %.values |
| v5 | sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine | 11 | 0 | 3 | 3 | constant-finite 0:OB.values; constant-finite 1:Mid.values; constant-finite 2:OS.values |
| v5 | sources/0540__casoon-pine-scripts__market_exhaustion.pine | 16 | 1 | 1 | 2 | all-na 3:CCI (mapped 0-100).values; constant-finite 6:50.values |
| v5 | sources/0542__casoon-pine-scripts__market_stress_oscillator.pine | 13 | 0 | 2 | 2 | constant-finite 4:+BiasBand.values; constant-finite 5:-BiasBand.values |
| v5 | sources/0546__casoon-pine-scripts__oscillator_divergence_zones.pine | 10 | 2 | 3 | 5 | constant-finite 0:OB.values; constant-finite 1:OS.values; constant-finite 2:Mid.values; all-na 3:DZ Upper.values; all-na 4:DZ Lower.values |
| v5 | sources/0548__casoon-pine-scripts__pivot_momentum_structure.pine | 6 | 0 | 3 | 3 | constant-finite 2:Upper Extreme Zone.values; constant-finite 3:Lower Extreme Zone.values; constant-finite 4:Midline.values |
| v5 | sources/0556__casoon-pine-scripts__wavetrend_v3.pine | 9 | 0 | 3 | 3 | constant-finite 0:OB.values; constant-finite 1:Mid.values; constant-finite 2:OS.values |
| v5 | sources/0562__casoon-pine-scripts__klinger_volume_force_map_v1_0_0.pine | 29 | 3 | 4 | 7 | constant-finite 3:Zero.values; constant-finite 4:Bull regime threshold.values; constant-finite 5:Bear regime threshold.values; constant-finite 7:Flow Regime.values; all-na 20:Research · Original 1997.values; all-na 21:Research · TV Documentation.values |
| v5 | sources/0567__casoon-pine-scripts__relative_strength_line.pine | 6 | 1 | 1 | 2 | all-na 1:RS MA.values; constant-finite 2:Zero.values |
| v5 | sources/0572__casoon-pine-scripts__market_average_relationship_engine.pine | 45 | 0 | 1 | 1 | constant-finite 8:Zero.values |
| v5 | sources/0576__casoon-pine-scripts__vein_execution.pine | 9 | 0 | 2 | 2 | constant-finite 2:Setup Score [dw].values; constant-finite 8:Bias [dw].values |
| v5 | sources/0580__casoon-pine-scripts__vein_reversal_score.pine | 44 | 0 | 1 | 1 | constant-finite 2:Zero.values |
| v5 | sources/0583__casoon-pine-scripts__vein_structure_zones.pine | 28 | 7 | 3 | 10 | all-na 0:Micro Swing High.values; all-na 1:Micro Swing Low.values; all-na 2:Major Swing High.values; all-na 3:Major Swing Low.values; constant-finite 9:CLX Confirmed.values; all-na 16:POC Level.values |
| v5 | sources/0585__casoon-pine-scripts__adaptive_cycle_detector.pine | 9 | 0 | 3 | 3 | constant-finite 3:Cycle Period.values; constant-finite 4:Min Period.values; constant-finite 5:Max Period.values |
| v5 | sources/0587__casoon-pine-scripts__bayesian_trend_factor.pine | 18 | 0 | 3 | 3 | constant-finite 14:Continuation Score.values; constant-finite 15:Bull Pullback State.values; constant-finite 16:Bear Pullback State.values |
| v5 | sources/0606__casoon-pine-scripts__market_average_relationship_engine_strategy.pine | 45 | 0 | 1 | 1 | constant-finite 8:Zero.values |
| v5 | sources/0607__casoon-pine-scripts__oscillator_divergence_zones_strategy.pine | 18 | 2 | 3 | 5 | constant-finite 0:OB.values; constant-finite 1:OS.values; constant-finite 2:Mid.values; all-na 3:DZ Upper.values; all-na 4:DZ Lower.values |
| v5 | sources/0693__oguzhandilber-PineScripts__RSI-VWAP.pine | 13 | 0 | 4 | 4 | constant-finite 4:Plot 4.values; constant-finite 5:Plot 5.values; constant-finite 9:Plot 7.values; constant-finite 10:Plot 8.values |
| v5 | sources/0724__deepentropy-lightweight-charts-indicators__Relative-Strength-of-a-stock.pine | 4 | 1 | 1 | 2 | constant-finite 0:Zero Line / RS Trend.values; all-na 2:MA.values |
| v5 | sources/0728__gorx1-TradingView__Quantile-BasedAdaptiveDetection.pine | 9 | 5 | 1 | 6 | all-na 0:lower limit.values; all-na 1:lower extension.values; all-na 5:upper extension.values; all-na 6:upper limit.values; all-na 7:space.values; constant-finite 8:proportion of data inside value.values |
| v5 | sources/0749__TradersPost-pinescript-agents__session-filter.pine | 12 | 2 | 2 | 4 | all-na 5:Asia High.values; all-na 6:Asia Low.values; constant-finite 10:NY Low.values; constant-finite 11:Filter Active.values |
| v5 | sources/0781__g-moe-Trading-Indicators__volume-rewrite.pine | 3 | 0 | 1 | 1 | constant-finite 1:Plot 2.values |
| v5 | sources/0807__Opus-Aether-AI-pine-transpiler__popular_033_rsi_macd_fusion.pine | 3 | 0 | 1 | 1 | constant-finite 2:Zero.values |
| v5 | sources/0810__helenananaa-pine-compat-runtime__linefill_all.pine | 5 | 0 | 2 | 2 | constant-finite 2:Plot 3.values; constant-finite 3:Plot 4.values |
| v5 | sources/0830__jawauntb-trading-scripts__pe-peg-over-time.pine | 4 | 0 | 2 | 2 | constant-finite 1:PEG Target Stock.values; constant-finite 3:PEG QQQ.values |
| v5 | sources/0833__n8rzz-trading-view-indicators__up-down-volume-ratio.pine | 4 | 0 | 2 | 2 | constant-finite 2:1.0.values; constant-finite 3:2.0.values |
| v5 | sources/0859__deepentropy-lightweight-charts-indicators__VolumeHeatmap-_-Experimental-Version-of-Marketorders-Matrix.pine | 32 | 0 | 31 | 31 | constant-finite 0:Plot 1.values; constant-finite 1:Plot 2.values; constant-finite 2:Plot 3.values; constant-finite 3:Plot 4.values; constant-finite 4:Plot 5.values; constant-finite 5:Plot 6.values |
| v5 | sources/0861__Leci37-tuisku_Web_selling__QUJOQl8xSG91cl8xU1FVdHVpc2t1MTY5YzhiNDY.pine | 2 | 0 | 1 | 1 | constant-finite 1:Plot 2.values |
| v5 | sources/0862__Leci37-tuisku_Web_selling__TlZTVF8zME1pbl8xU1FVdHVpc2t1ZjIyMTBiMmY.pine | 2 | 0 | 1 | 1 | constant-finite 1:Plot 2.values |

## Method

- No corpus scripts were re-executed for this report.
- A producing sibling lower bound is counted when a script has more visible plots than plot indexes that fired all-NaN.
- A varying sibling lower bound is counted when a script has more visible plots than plot indexes with any all-NaN or constant-finite fire.
- This deliberately avoids classifying these asymmetries as engine defects. The result is that asymmetry is a common corpus shape, so it is not by itself discriminating enough to route rows.

