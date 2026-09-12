# External Pine Corpus V7 Fixture Profile Delta v1

## Basis

- Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911`.
- Daily report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-daily-standard.json`.
- Context-stress report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-context-stress.json`.
- Daily bars: 1600, 1,600 volatile weekday daily bars, sha256 73a22074c6f110dd.
- Context-stress bars: 5200, 5,200 bars: mixed intraday/session and 24/7 body, daily-compatible volatile final window, sha256 94ad2fd2de9d718f.
- Method: same corpus runner, same source files, same engine tree, different synthetic fixture profile.
- Limit: this compares support/output payloads under two synthetic chart contexts. It is not TradingView ground truth.

## Headline

- Daily profile: 293/456 raw output (64.25%); 293/401 achievable output (73.07%); validity {"corpus-hygiene":3,"invalid-pine":21,"supported":299,"tealscript-gap":102,"unsupported-by-design":31}.
- Context-stress profile: 292/456 raw output (64.04%); 292/401 achievable output (72.82%); validity {"corpus-hygiene":3,"invalid-pine":21,"supported":298,"tealscript-gap":103,"unsupported-by-design":31}.
- Rows with changed payload or classification: 51/456.
- Rows improving to supported output: 0.
- Rows regressing from supported output: 1.

## Changed Rows By Validity

| Transition | Rows |
| --- | ---: |
| supported -> supported | 46 |
| tealscript-gap -> tealscript-gap | 4 |
| supported -> tealscript-gap | 1 |

## Changed Rows By Stage

| Transition | Rows |
| --- | ---: |
| pass -> pass | 45 |
| execute -> execute | 3 |
| output -> output | 2 |
| pass -> execute | 1 |

## Changed Rows By Dependency Class

| Dependency class | Changed rows |
| --- | ---: |
| drawing_objects_limits | 33 |
| barstate_realtime_or_lastbar | 29 |
| symbol_metadata | 28 |
| volume_dependent | 23 |
| intraday_clock_calendar | 21 |
| timeframe_identity | 21 |
| request_timeframes | 19 |
| higher_timeframe_literals | 15 |
| session_windows | 14 |
| explicit_long_history | 13 |
| no-scanned-dependency | 13 |
| tick_precision_contract | 11 |
| currency_metadata | 3 |
| corporate_actions | 1 |
| fundamental_macro_requests | 1 |
| twentyfour_seven_or_weekend | 1 |

## Changed Row Sample

| Row | Daily | Context-stress | Dependency classes |
| --- | --- | --- | --- |
| `sources/0008__helenananaa-pine-compat-runtime__supported_builtin_array_call_result_reads.pine` | tealscript-gap \| output \| no-output-compiled \| output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produce | tealscript-gap \| output \| no-output-compiled \| output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produce | none scanned |
| `sources/0011__ferranbt-pinecone__array_more.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0040__dolgoonnn-rl-trading-agent__letf-close-flow.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, intraday_clock_calendar |
| `sources/0053__regalouisei-collect-tradingview__stochastic-mas-k-logit-bands.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar |
| `sources/0060__ferranbt-pinecone__array_search.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0081__ferranbt-pinecone__drawing_point_setters.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits |
| `sources/0090__ferranbt-pinecone__chart.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0097__regalouisei-collect-tradingview__digital-macd-divergences-mtf-lupen.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, timeframe_identity, request_timeframes, symbol_metadata, explicit_long_history |
| `sources/0099__ferranbt-pinecone__session_fundamentals.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | session_windows, twentyfour_seven_or_weekend |
| `sources/0106__ferranbt-pinecone__no_feed.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0122__bhattkirtan-stockscreener__strategy-enhanced.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals, intraday_clock_calendar |
| `sources/0125__deepentropy-lightweight-charts-indicators__1-2-3-Pattern-Expo-.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, symbol_metadata, explicit_long_history |
| `sources/0127__ferranbt-pinecone__constants.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0128__deepentropy-oakscriptJS__1-2-3-Pattern-Expo-.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, symbol_metadata, explicit_long_history |
| `sources/0129__deepentropy-lightweight-charts-indicators__Auto-Fib-Retracement.pine` | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | drawing_objects_limits, barstate_realtime_or_lastbar, symbol_metadata |
| `sources/0132__0xpoot-poot-ml-trading__auto_fib_retracement.pine` | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | drawing_objects_limits, barstate_realtime_or_lastbar, symbol_metadata |
| `sources/0133__deepentropy-oakscriptJS__Auto-Fib-Retracement.pine` | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | tealscript-gap \| execute \| failed \| 33:5: runtime.error: Not enough data to calculate Auto Fib Retracement on the current symbol. Change the chart's timeframe to a lower one or | drawing_objects_limits, barstate_realtime_or_lastbar, symbol_metadata |
| `sources/0134__wanderlusttt-pine_scripts__cpr_with_auto_fib.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals |
| `sources/0158__ferranbt-pinecone__matrix_eigen.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0172__ferranbt-pinecone__matrix_ops.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0198__ferranbt-pinecone__matrix_mutate.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0209__majixai-majixai.github.io__jinx.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar, session_windows, currency_metadata |
| `sources/0210__majixai-majixai.github.io__differentiated_conic_projection_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar, session_windows, currency_metadata |
| `sources/0224__ferranbt-pinecone__plot_constants.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0235__chris-c-thomas-chrd-tradingview-pine-scripts__spy-0dte-scalper-5min.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar, session_windows |
| `sources/0238__chris-c-thomas-chrd-tradingview-pine-scripts__spy-0dte-scalper-15min.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar, session_windows |
| `sources/0240__ainell-owi-Dskyz-DAFE-open-source-collection__Riemannian_Dreamer_Manifold_Engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract, explicit_long_history |
| `sources/0247__ainell-owi-LePine__Riemannian_Dreamer_Manifold_Engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, volume_dependent, tick_precision_contract, explicit_long_history |
| `sources/0252__regalouisei-collect-tradingview__short-volume-stamper.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, explicit_long_history, higher_timeframe_literals, intraday_clock_calendar, fundamental_macro_requests |
| `sources/0259__ferranbt-pinecone__const_namespaces.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0269__Sachingkrishna-smc-v16-indicator__smtDivergenceStrategy.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, tick_precision_contract, explicit_long_history, session_windows |
| `sources/0279__helenananaa-pine-compat-runtime__unsupported_strategy_state_mutation.pine` | supported \| output \| no-output-compiled \| output-silence:source-declares-no-chart-output: The source has no plot, drawing, alert, or strategy order calls; empty output is expected. | supported \| output \| no-output-compiled \| output-silence:source-declares-no-chart-output: The source has no plot, drawing, alert, or strategy order calls; empty output is expected. | none scanned |
| `sources/0345__ferranbt-pinecone__risk_max_cons_loss_days.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | barstate_realtime_or_lastbar |
| `sources/0352__ferranbt-pinecone__syminfo.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | symbol_metadata, tick_precision_contract, currency_metadata |
| `sources/0353__TraderOracle-TradingView__zone_bounce_engine.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata, tick_precision_contract, explicit_long_history, intraday_clock_calendar, session_windows |
| `sources/0359__regalouisei-collect-tradingview__eduvest-qqe-signal-v30-multi-timeframe-scoring-system.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata |
| `sources/0367__himeshramjee-chaiwala-invest__two-thirty-100pip-scalp.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, symbol_metadata, tick_precision_contract |
| `sources/0370__ferranbt-pinecone__text.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | none scanned |
| `sources/0387__GoDevun-Devuns-Trades__aio-v2.pine` | supported \| pass \| produced-output-compiled | tealscript-gap \| execute \| failed \| external corpus classifier timeout after 45s on isolated row | drawing_objects_limits, barstate_realtime_or_lastbar, timeframe_identity, volume_dependent, request_timeframes, symbol_metadata, higher_timeframe_literals, intraday_clock_calendar, session_windows, corporate_actions |
| `sources/0395__Focal-QuantAI-QuantAI-Blog__Ex7tbB3kgKnm__E0dwHx_code.pine` | supported \| pass \| produced-output-compiled | supported \| pass \| produced-output-compiled | drawing_objects_limits, barstate_realtime_or_lastbar, tick_precision_contract, intraday_clock_calendar |

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
