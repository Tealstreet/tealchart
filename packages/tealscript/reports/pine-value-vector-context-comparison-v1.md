> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Context Comparison v1

## Basis

- Source cases: `scripts/run-pine-value-vectors.ts`.
- Baseline context: each vector uses its committed bars and options.
- Alternate context: same OHLC sequence and bar count, intraday 15-minute continuous 24/7 timestamps, different symbol/tick metadata, and varied volume regimes.
- Method: run the same case definitions through `runCase()` twice and compare compiled plot outputs with the existing value-vector numeric tolerance.

## Split

| Bucket | Rows |
| --- | ---: |
| unchanged-and-should-not-have | 36 |
| changed-and-should-have | 25 |

## Context Classes

| Context class | Rows |
| --- | ---: |
| bar_count_long_history | 32 |
| volume_regime | 22 |
| intraday_time_session | 6 |
| request_context | 5 |
| realtime_only | 3 |
| tick_precision_symbol | 2 |
| twentyfour_seven_weekend | 2 |

## Rows

| Case | Classes | Expected | Actual | First difference |
| --- | --- | --- | --- | --- |
| `ta.dema` | bar_count_long_history | should not change | unchanged |  |
| `ta.tema` | bar_count_long_history | should not change | unchanged |  |
| `ta.hma` | bar_count_long_history | should not change | unchanged |  |
| `ta.tsi` | bar_count_long_history | should not change | unchanged |  |
| `ta.smma` | bar_count_long_history | should not change | unchanged |  |
| `ta.vwma` | volume_regime | should change | changed | plot 0, bar 2: 11.424242424242424 -> 10.740365111561866 |
| `ta.macd` | bar_count_long_history | should not change | unchanged |  |
| `ta.kc` | bar_count_long_history | should not change | unchanged |  |
| `ta.kcw` | bar_count_long_history | should not change | unchanged |  |
| `ta.obv` | volume_regime, bar_count_long_history | should change | changed | plot 0, bar 1: 110 -> 192.5 |
| `hostile.obv.middle-na` | volume_regime | should change | changed | plot 0, bar 1: -110 -> -192.5 |
| `ta.mfi` | volume_regime, bar_count_long_history | should change | changed | plot 0, bar 20: 152.72835982534886 -> 116.16759662702412 |
| `hostile.mfi.middle-na` | volume_regime, bar_count_long_history | should change | changed | plot 0, bar 3: 649.9999999999998 -> 292.5 |
| `ta.wad` | volume_regime, bar_count_long_history | should not change | unchanged |  |
| `hostile.wad.middle-na` | volume_regime | should not change | unchanged |  |
| `ta.iii` | volume_regime, bar_count_long_history | should not change | unchanged |  |
| `ta.nvi` | volume_regime | should not change | unchanged |  |
| `ta.pvi` | volume_regime | should not change | unchanged |  |
| `ta.pvt` | volume_regime, bar_count_long_history | should change | changed | plot 0, bar 1: -77.68877652260414 -> -135.95535891455725 |
| `ta.accdist` | volume_regime, bar_count_long_history | should not change | unchanged |  |
| `ta.wvad` | volume_regime, bar_count_long_history | should not change | unchanged |  |
| `ta.cog` | bar_count_long_history | should not change | unchanged |  |
| `ta.percentrank` | bar_count_long_history | should not change | unchanged |  |
| `ta.rci` | bar_count_long_history | should not change | unchanged |  |
| `tradingview-ta.trima.v7` | bar_count_long_history | should not change | unchanged |  |
| `tradingview-ta.cagr.v1` | intraday_time_session | should change | changed | plot 0, bar 5: 27544.28351198693 -> null |
| `tradingview-ta.ppo.v12` | bar_count_long_history | should not change | unchanged |  |
| `tradingview-ta.trix.v12` | bar_count_long_history | should not change | unchanged |  |
| `ta.dmi` | bar_count_long_history | should not change | unchanged |  |
| `ta.adx` | bar_count_long_history | should not change | unchanged |  |
| `ta.supertrend` | bar_count_long_history | should not change | unchanged |  |
| `ta.kst` | bar_count_long_history | should not change | unchanged |  |
| `ta.sar` | bar_count_long_history | should not change | unchanged |  |
| `ta.covariance` | volume_regime | should change | changed | plot 0, bar 2: 10 -> -243.61111111111111 |
| `ta.correlation` | volume_regime | should change | changed | plot 0, bar 2: 0.9819805060619657 -> -0.7080403987812646 |
| `ta.vwap` | volume_regime | should change | changed | plot 0, bar 1: 10.523809523809524 -> 10.193954659949622 |
| `hostile.vwap.middle-na` | volume_regime | should change | changed | plot 0, bar 1: -1.0476190476190477 -> -0.3879093198992443 |
| `hostile.vwma.middle-na` | volume_regime | should change | changed | plot 0, bar 2: -0.6666666666666666 -> -0.31237322515212984 |
| `hostile.wvad.zero-range` | volume_regime | should not change | unchanged |  |
| `hostile.ema.long` | bar_count_long_history | should not change | unchanged |  |
| `hostile.rma.long` | bar_count_long_history | should not change | unchanged |  |
| `hostile.ema.long-middle-na` | bar_count_long_history | should not change | unchanged |  |
| `hostile.rma.long-middle-na` | bar_count_long_history | should not change | unchanged |  |
| `hostile.cog.flat` | bar_count_long_history | should not change | unchanged |  |
| `hostile.correlation.flat` | volume_regime | should not change | unchanged |  |
| `hostile.correlation.middle-na` | volume_regime | should change | changed | plot 0, bar 2: 0 -> 0.5596400103773128 |
| `hostile.covariance.middle-na` | volume_regime | should change | changed | plot 0, bar 2: 0 -> 145.5555555555556 |
| `runtime.barstate-historical-flags` | realtime_only | should not change | unchanged |  |
| `runtime.syminfo-values` | tick_precision_symbol | should change | changed | plot 0, bar 0: 0.1 -> 0.01 |
| `runtime.timeframe-values` | intraday_time_session | should change | changed | plot 0, bar 0: 1 -> 0 |
| `runtime.ticker-transform-values` | intraday_time_session, twentyfour_seven_weekend, tick_precision_symbol | should change | changed | plot 0, bar 0: 1 -> 0 |
| `runtime.calendar-fields` | intraday_time_session | should change | changed | plot 3, bar 0: 9 -> 0 |
| `runtime.timestamp-and-time-values` | intraday_time_session | should change | changed | plot 0, bar 0: 1704101415000 -> 1704067200000 |
| `runtime.session-state-values` | intraday_time_session, twentyfour_seven_weekend | should change | changed | plot 0, bar 0: 0 -> 1 |
| `varip.persistence` | realtime_only | should not change | unchanged |  |
| `language.udf-varip-call-sites` | realtime_only | should not change | unchanged |  |
| `request.security-barmerge-modes` | request_context | should change | changed | plot 0, bar 0: null -> 14 |
| `request.security-lower-tf-lookahead` | request_context | should change | changed | plot 0, bar 0: 11 -> null |
| `request.currency-rate-points` | request_context | should change | changed | plot 0, bar 0: 150 -> 151 |
| `request.corporate-actions-points` | request_context | should change | changed | plot 0, bar 0: null -> 0.25 |
| `request.financial-economic-points` | request_context | should change | changed | plot 0, bar 0: 1000 -> 1100 |

## Finding

- Changed and should have: 25.
- Unchanged and should have: 0.
- Changed when should not have: 0.
- Unchanged and should not have: 36.
- Not comparable: 0.
