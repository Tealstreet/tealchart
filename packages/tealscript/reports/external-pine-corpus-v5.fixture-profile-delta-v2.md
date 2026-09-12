> Superseded by external-pine-corpus-v5.fixture-profile-delta-v8.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Fixture Profile Delta v2

Source report: `external-pine-corpus-v5.fixture-profile-delta-v1.md`.

## Headline

- Daily profile: `838/1000` raw output, `838/925` achievable output.
- Context-stress profile: `835/1000` raw output, `835/925` achievable output.
- Rows with changed payload or classification: `144/1000`.
- Rows improving to supported output: `0`.
- Rows regressing from direct supported output: `3`.

The support headline barely moved, but `144` rows changed observable payload or
classification. Support is therefore not a proxy for value or visual stability
across chart contexts.

## Regressed Rows

| Row | Daily output | Context-stress output | Finding |
| --- | ---: | ---: | --- |
| `sources/0511__casoon-pine-scripts__market_scenario_projector.pine` | 13 drawings | 0 direct outputs | Fixture-profile miss, not an engine regression. The script draws inside `barstate.islast` only when its last-bar scenario weights and thresholds clear; the fixed extended daily probe still produces 13 drawings. The context-stress final bar did not satisfy that scenario gate. |
| `sources/0759__iamhuraira-trading-view-script__FVG_with_IFVG_Indicator.pine` | 1 drawing | 0 direct outputs | Fixture-profile miss. The script draws FVG/IFVG boxes only when recent bars form `low > high[2]` or `high < low[2]` gaps and later inversion conditions inside a seven-day lookback. The context-stress profile has volatility and gaps, but not a qualifying recent final-window FVG/IFVG sequence for this script. |
| `sources/0769__TraderOracle-TradingView__StarFragment.pine` | 500 drawings | 0 direct outputs | Fixture-profile miss. The script draws only inside `time(timeframe.period, "0845-0846")`; the daily profile intentionally rotates through `08:45`, while context-stress uses `04:00`, `09:30`, `12:00`, `15:55`, `16:30`, and weekend `00:00`/`12:00`, so it never hits the one-minute window. The existing extended probe still produces 500 drawings. |

## Dependency Classes Among Changed Rows

| Dependency class | Changed rows |
| --- | ---: |
| drawing_objects_limits | 135 |
| timeframe_identity | 92 |
| tick_precision_contract | 81 |
| barstate_realtime_or_lastbar | 75 |
| volume_dependent | 74 |
| symbol_metadata | 28 |
| explicit_long_history | 24 |
| request_timeframes | 21 |
| intraday_clock_calendar | 16 |
| higher_timeframe_literals | 15 |
| session_windows | 9 |
| no-scanned-dependency | 4 |
| twentyfour_seven_or_weekend | 4 |
| currency_metadata | 1 |

## Covered By The Second Profile

- Intraday/session timing branches are now exercised by premarket, regular open,
  midday, regular close, and postmarket timestamps.
- Weekend and 24/7 assumptions are exercised by weekend bars.
- Volume-regime branches are exercised by session-dependent volume and spikes.
- Long-history branches are exercised by 5,200 bars spanning multi-year state.
- Request timeframe mapping is exercised through the same richer synthetic bars
  in the request datafeed.

## Still Trace-Only Or Host-Dependent

- Realtime tick replacement and intrabar alert/order timing.
- Real symbol metadata, including exchange timezone, type, point value,
  currency, base currency, and tick size.
- Event-backed requests: corporate actions, fundamentals, economic data,
  Quandl, and seed requests.
- Exact exchange calendars: holidays, half-days, DST boundaries, and
  per-symbol session schedules.

## Conclusion

The three direct-output regressions are fixture-profile misses, not runtime
regressions. The context-stress profile is still useful because it exposed
`144` chart-context-sensitive rows, but it should not be read as strictly
dominating the daily profile. The two profiles together show which scripts
depend on chart context; neither is a complete replacement for trace-backed
realtime, symbol metadata, event-feed, or exchange-calendar evidence.
