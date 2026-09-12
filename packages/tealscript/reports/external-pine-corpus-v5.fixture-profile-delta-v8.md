# External Pine Corpus V5 Fixture Profile Delta v8

## Basis

- Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
- Daily report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/reports/external-pine-corpus-v5.fixture-profile-delta-v8-runs/external-pine-corpus-v5-daily-standard.json`.
- Context-stress report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/reports/external-pine-corpus-v5.fixture-profile-delta-v8-runs/external-pine-corpus-v5-context-stress.json`.
- Daily bars: 1600, 1,600 volatile weekday daily bars, sha256 73a22074c6f110dd.
- Context-stress bars: 5200, 5,200 bars: mixed intraday/session and 24/7 body, daily-compatible volatile final window, sha256 94ad2fd2de9d718f.
- Method: same corpus runner, same source files, same engine tree, different synthetic fixture profile.
- Limit: this compares support/output payloads under two synthetic chart contexts. It is not TradingView ground truth.

## Headline

- Daily profile: 863/1000 raw output (86.3%); 863/923 achievable output (93.5%); validity {"corpus-hygiene":8,"invalid-pine":59,"supported":867,"tealscript-gap":56,"unsupported-by-design":10}.
- Context-stress profile: 865/1000 raw output (86.5%); 865/923 achievable output (93.72%); validity {"corpus-hygiene":8,"invalid-pine":59,"supported":869,"tealscript-gap":54,"unsupported-by-design":10}.
- Rows with changed payload or classification: 142/1000.
- Rows improving to supported output: 2.
- Rows regressing from supported output: 0.

## Changed Rows By Validity

| Transition | Rows |
| --- | ---: |
| supported -> supported | 140 |
| tealscript-gap -> supported | 2 |

## Changed Rows By Stage

| Transition | Rows |
| --- | ---: |
| pass -> pass | 140 |
| execute -> pass | 1 |
| output -> pass | 1 |

## Changed Rows By Dependency Class

| Dependency class | Changed rows |
| --- | ---: |
| drawing_objects_limits | 133 |
| timeframe_identity | 91 |
| tick_precision_contract | 81 |
| barstate_realtime_or_lastbar | 74 |
| volume_dependent | 72 |
| symbol_metadata | 30 |
| explicit_long_history | 22 |
| request_timeframes | 22 |
| intraday_clock_calendar | 15 |
| higher_timeframe_literals | 14 |
| session_windows | 6 |
| no-scanned-dependency | 4 |
| twentyfour_seven_or_weekend | 4 |
| currency_metadata | 1 |

## Changed Row Sample

| Row | Daily | Context-stress | Dependency classes |
| --- | --- | --- | --- |
| `sources/0488__casoon-pine-scripts__fib_retracement_quality.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0491__casoon-pine-scripts__pattern_recognition.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent |
| `sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, explicit_long_history |
| `sources/0493__casoon-pine-scripts__rj_wave.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, intraday_clock_calendar |
| `sources/0494__casoon-pine-scripts__smart_money_dashboard.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, intraday_clock_calendar |
| `sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, explicit_long_history, intraday_clock_calendar |
| `sources/0500__casoon-pine-scripts__signal_quality_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity |
| `sources/0504__casoon-pine-scripts__candle_story_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract, explicit_long_history |
| `sources/0507__casoon-pine-scripts__elliott_wave_radar.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, explicit_long_history |
| `sources/0510__casoon-pine-scripts__market_motion_dna_v1.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract, explicit_long_history |
| `sources/0516__casoon-pine-scripts__modern_wyckoff_state_machine_visual.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract |
| `sources/0518__casoon-pine-scripts__reversal_type_classifier_v1.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0519__casoon-pine-scripts__smc_structure_expectation.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata |
| `sources/0521__casoon-pine-scripts__structure_break_risk.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract |
| `sources/0523__casoon-pine-scripts__swing_conviction_radar.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, explicit_long_history |
| `sources/0526__casoon-pine-scripts__tweezer_kangaroo_zones.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals, session_windows, twentyfour_seven_or_weekend |
| `sources/0528__casoon-pine-scripts__wyckoff_schematics.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals |
| `sources/0531__casoon-pine-scripts__zigzag_patterns_framework.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0534__casoon-pine-scripts__oscillator_cycle_statistics.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, explicit_long_history |
| `sources/0538__casoon-pine-scripts__exhaustion_scanner.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent |
| `sources/0540__casoon-pine-scripts__market_exhaustion.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata |
| `sources/0541__casoon-pine-scripts__market_pressure_scale.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract |
| `sources/0542__casoon-pine-scripts__market_stress_oscillator.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata |
| `sources/0546__casoon-pine-scripts__oscillator_divergence_zones.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata |
| `sources/0547__casoon-pine-scripts__oscillator_topology.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract |
| `sources/0548__casoon-pine-scripts__pivot_momentum_structure.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, explicit_long_history |
| `sources/0555__casoon-pine-scripts__wavetrend_v2.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, explicit_long_history |
| `sources/0556__casoon-pine-scripts__wavetrend_v3.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, explicit_long_history, intraday_clock_calendar |
| `sources/0562__casoon-pine-scripts__klinger_volume_force_map_v1_0_0.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract |
| `sources/0571__casoon-pine-scripts__ma_regime_bands.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0572__casoon-pine-scripts__market_average_relationship_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract |
| `sources/0573__casoon-pine-scripts__modern_trend_regime.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract |
| `sources/0574__casoon-pine-scripts__smooth_trend_radar.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, intraday_clock_calendar |
| `sources/0578__casoon-pine-scripts__vein_pullback.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent |
| `sources/0579__casoon-pine-scripts__vein_reversal_labeler.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0583__casoon-pine-scripts__vein_structure_zones.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent |
| `sources/0584__casoon-pine-scripts__vein_trend.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent |
| `sources/0587__casoon-pine-scripts__bayesian_trend_factor.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract |
| `sources/0589__casoon-pine-scripts__market_state_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, higher_timeframe_literals, intraday_clock_calendar |
| `sources/0590__casoon-pine-scripts__markov_state_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, intraday_clock_calendar |

## Synthesizable Blind Spots Covered

- Intraday/session timing: context-stress bars include premarket, regular open, midday, regular close, and postmarket timestamps instead of one daily timestamp per trading day.
- 24/7 and weekend behavior: context-stress bars include weekend bars instead of skipping Saturday and Sunday.
- Volume regimes: context-stress bars include session-dependent volume, sustained lower weekend/pre/post volume, and deterministic spikes.
- Long history: context-stress bars cover 5,200 bars across multi-year history, enough to exercise multi-year state and weekly/monthly aggregation paths that a short tame window cannot reach.
- Request timeframe mapping: the same bars feed the synthetic request datafeed, so request-backed branches see the richer context profile instead of the daily-only stream.

## Blind Spots Still Trace-Only Or Host-Dependent

- Realtime semantics: a historical fixture cannot prove `barstate.isrealtime`, unconfirmed-bar replacement, live rollback, or alert/order timing under ticks. Those remain realtime-trace or realtime-harness surfaces.
- Symbol metadata truth: `syminfo.type`, exchange timezone, point value, currency, base currency, and tick size can be synthesized as profiles, but correctness for real symbols still requires host metadata or traces.
- Corporate actions, fundamentals, economic data, Quandl, and seed requests: OHLCV bars cannot prove event-backed request values. These need explicit host-provided event feeds or TradingView traces.
- Exact exchange sessions and extended-hours calendars: synthetic sessions can exercise branches, but exchange holidays, half-days, DST boundaries, and per-symbol sessions require host calendar data.

## Conclusion

The daily fixture and context-stress fixture disagree on the rows listed above. Those rows depend on chart context, not just language/runtime support. The remaining trace-only list is narrower: realtime tick behavior, real symbol metadata, event-backed request feeds, and exact exchange calendars.
