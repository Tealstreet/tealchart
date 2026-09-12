> Superseded by external-pine-corpus-v6.fixture-profile-delta-v3.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V6 Fixture Profile Delta v1

## Basis

- Measurement commit: `94cae779898ba55e04e67df644e6025f7e281251` (archived from HEAD before the shared worktree advanced).
- Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.
- Daily report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/fixture-profiles/94cae77989-v1/external-pine-corpus-v6-daily-standard.json`.
- Context-stress report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/fixture-profiles/94cae77989-v1/external-pine-corpus-v6-context-stress.json`.
- Committed daily report: `packages/tealscript/reports/external-pine-corpus-v6-daily-standard.report.json`.
- Committed context-stress report: `packages/tealscript/reports/external-pine-corpus-v6-context-stress.report.json`.
- Committed manifest: `packages/tealscript/reports/external-pine-corpus-v6.manifest.json`.
- Daily bars: 1600, 1,600 volatile weekday daily bars, sha256 73a22074c6f110dd.
- Context-stress bars: 5200, 5,200 bars: mixed intraday/session and 24/7 body, daily-compatible volatile final window, sha256 94ad2fd2de9d718f.
- Method: same corpus runner, same source files, same engine tree, different synthetic fixture profile.
- Limit: this compares support/output payloads under two synthetic chart contexts. It is not TradingView ground truth.

## Headline

- Daily profile: 716/1000 raw output (71.6%); 716/938 achievable output (76.33%); validity {"invalid-pine":26,"supported":771,"tealscript-gap":167,"unsupported-by-design":36}.
- Context-stress profile: 719/1000 raw output (71.9%); 719/938 achievable output (76.65%); validity {"invalid-pine":26,"supported":773,"tealscript-gap":165,"unsupported-by-design":36}.
- Rows with changed payload or classification: 89/1000.
- Rows improving to supported output: 4.
- Rows regressing from supported output: 1.

## Changed Rows By Validity

| Transition | Rows |
| --- | ---: |
| supported -> supported | 84 |
| tealscript-gap -> supported | 3 |
| supported -> tealscript-gap | 1 |
| tealscript-gap -> tealscript-gap | 1 |

## Changed Rows By Stage

| Transition | Rows |
| --- | ---: |
| pass -> pass | 83 |
| execute -> pass | 2 |
| output -> pass | 2 |
| output -> output | 1 |
| pass -> execute | 1 |

## Changed Rows By Dependency Class

| Dependency class | Changed rows |
| --- | ---: |
| drawing_objects_limits | 66 |
| barstate_realtime_or_lastbar | 47 |
| symbol_metadata | 44 |
| volume_dependent | 38 |
| timeframe_identity | 36 |
| request_timeframes | 28 |
| intraday_clock_calendar | 20 |
| higher_timeframe_literals | 17 |
| no-scanned-dependency | 17 |
| explicit_long_history | 14 |
| tick_precision_contract | 10 |
| session_windows | 7 |
| corporate_actions | 1 |
| twentyfour_seven_or_weekend | 1 |

## Changed Row Sample

| Row | Daily | Context-stress | Dependency classes |
| --- | --- | --- | --- |
| `sources/0097__sancarhuseyin-standard-variation__codesample.pine` | supported \| pass \| produced-output-compiled | tealscript-gap \| execute \| failed \| Array is too large. Maximum size is 100000 | drawing_objects_limits, timeframe_identity, request_timeframes, symbol_metadata, higher_timeframe_literals |
| `sources/0111__Hubrtcode-EasyRSI__EasyRSI.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0114__piecioshka-tradingview-pine-scripts__macd.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent |
| `sources/0126__apo-bozdag-pinescript__rsi_divergence.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, explicit_long_history |
| `sources/0139__btankutt-smc-pine-suite__mtf-divergence.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata |
| `sources/0143__nexobanks-prep-HFT-Bot__breaker_blocks_v6.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits |
| `sources/0153__nishpa800-indicators__VOB_Asym_T3x6_MutEx_Claude_v8_2026-05-02.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar |
| `sources/0154__regalouisei-collect-tradingview__mtf-rsi-macd-divergence.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata, tick_precision_contract, higher_timeframe_literals |
| `sources/0156__radiarkazemi-qt-price-elite__Orca-Structure-v3.1.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, timeframe_identity, request_timeframes, symbol_metadata, explicit_long_history |
| `sources/0159__nishpa800-indicators__VOB_BB_TICKFRIENDLY_v1.1.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata |
| `sources/0162__ferranbt-pinecone__accumulators.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | volume_dependent |
| `sources/0190__hasnocool-tradingview-pine-scripts__5MSM-VISHNU.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, intraday_clock_calendar, session_windows, corporate_actions |
| `sources/0236__aeiioaeiio-XAUUSD_TradingView_Pine__XAUUSD_Strategy_V4_7_1_AutoEntry_SmartTPSL_Fixed.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract |
| `sources/0238__akash-yellgetti-api.web__algo-trade-indian-commodity.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, volume_dependent, symbol_metadata, intraday_clock_calendar |
| `sources/0253__ferranbt-pinecone__str_new.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0283__soloskino1-pinescript_bot__main.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | intraday_clock_calendar |
| `sources/0286__AbdulazizSulaymon-penny-indicator__v5.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, symbol_metadata |
| `sources/0307__nishpa800-indicators__VOB_ASYM_COMBO_v10.2.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar |
| `sources/0317__helenananaa-pine-compat-runtime__table_cell_set_text_color_coordinate_bounds.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0323__deepentropy-lightweight-charts-indicators__Liquidity-Pools-LuxAlgo-.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, volume_dependent |
| `sources/0333__TamTH-Dev-trading-view-scripts__Volumatic.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent |
| `sources/0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine` | tealscript-gap \| output \| no-output-compiled \| output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on e | supported \| pass \| produced-output-compiled | drawing_objects_limits, timeframe_identity, symbol_metadata, tick_precision_contract, intraday_clock_calendar |
| `sources/0358__alboogycOdR-dev-projects__original.pine` | tealscript-gap \| execute \| failed \| Array index 2 is out of bounds. Array size is 2 | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata |
| `sources/0359__F87104__h4_low_stagnation_short_visual.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata, explicit_long_history |
| `sources/0362__patelmanav294-eng-Profit-Hunter__trend-anchor-signals.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata |
| `sources/0371__ferranbt-pinecone__max.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0372__ferranbt-pinecone__matrix_predicates.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0374__ferranbt-pinecone__function_state_per_call_site.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0388__deepentropy-lightweight-charts-indicators__Support-and-Resistance-High-Volume-Boxes-ChartPrime-.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, volume_dependent |
| `sources/0391__deepentropy-oakscriptJS__Liquidity-Pools-LuxAlgo-.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, volume_dependent |
| `sources/0405__Pbaaroma-pbatrades-forex-bot__smc_15min_v4.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, symbol_metadata, intraday_clock_calendar |
| `sources/0407__Mensi01-SMC__SMCindicator.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata, explicit_long_history, higher_timeframe_literals |
| `sources/0413__regalouisei-collect-tradingview__alpha-supertrend-signal-identityka.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, timeframe_identity |
| `sources/0415__skywalker0803r-Sentinel-System__SmartMoneyConcepts.pine` | tealscript-gap \| execute \| failed \| Array index 2 is out of bounds. Array size is 2 | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata |
| `sources/0421__alboogycOdR-dev-projects__apx3.2.gem.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, request_timeframes, symbol_metadata, higher_timeframe_literals, intraday_clock_calendar, session_windows |
| `sources/0424__robinpunn-trade__trend-strenth.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals |
| `sources/0427__regalouisei-collect-tradingview__eduvest-qqe-grade-system-sabc-signal-classification.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, symbol_metadata, intraday_clock_calendar |
| `sources/0431__regalouisei-collect-tradingview__tasc-202407-gaps-and-extreme-closes.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | barstate_realtime_or_lastbar |
| `sources/0433__ferranbt-pinecone__enum_with_values.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0441__helenananaa-pine-compat-runtime__ticker.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | symbol_metadata, session_windows, twentyfour_seven_or_weekend |

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
