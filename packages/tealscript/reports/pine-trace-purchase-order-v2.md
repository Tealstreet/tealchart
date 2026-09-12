# Pine Trace Purchase Order V2

Supersedes `pine-trace-purchase-order-v1.{md,json}`.

Measurement SHA: `bbcbf3d220`; `varip` exposure SHA: `ba8bcfc024`; current value-vector SHA: `0b1f0bfc48`. Sources: `pine-value-vector-corpus-exposure-v1.json`, `pine-varip-trace-exposure-v1.json`, `pine-barstate-lastconfirmedhistory-oracles-v1.md`. TradingView export reference: https://www.tradingview.com/support/solutions/43000537255-how-to-export-chart-data/

## Decision Summary

The two public corpora contain 2000 scripts. The actionable exposure is concentrated: 66 scripts have confirmed mid-series holes into unsettled TA policies, and 488 scripts touch trace/host-required members. Non-purchase surfaces dominate the raw trace count: `runtime.error` appears in 395 scripts and `library` in 26, but neither is settled by a synchronized TradingView recording.

The measured ranking still disagrees with the estimated rank in `PINE_TRACE_REQUIRED_v1`: rank 10 is the hottest practical exposure, while rank 1 is structurally common but not proven hot by this scan. Since V1, the historical `barstate.islastconfirmedhistory` boundary has been externally closed, so purchase 2 now buys only live tick/new-bar flags. It still narrowly outranks `timenow` by measured exposure: 36 scripts vs. 35.

| Buy order | Trace package | V1 estimated rank | Scripts directly covered | Members settled |
| ---: | --- | ---: | ---: | --- |
| 1 | Undocumented TA interior-hole policy | rank 10 | 66 | `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, `ta.vwap` |
| 2 | Realtime barstate | rank 4 | 36 | `barstate.isnew`, `barstate.isrealtime` |
| 3 | Wall-clock realtime | unranked | 35 | `timenow` |
| 4 | Realtime varip replacement | unranked | 19 | `varip` |
| 5 | Strategy risk and broker exactness | rank 2 | 13 | `strategy.risk.max_intraday_loss`, `strategy.risk.max_drawdown`, `strategy.risk.max_intraday_filled_orders` |
| 6 | Provider event and seed data | rank 6 | 4 | `earnings.estimate`, `earnings.future_time`, `earnings.future_eps`, `earnings.future_revenue`, `request.seed` |
| 7 | Exchange session calendar | rank 7 | 2 | `session.isfirstbar`, `session.islastbar` |
| 8 | Random sequence | unranked | 2 | `math.random` |
| 9 | Live bid/ask quote fields | unranked | 1 | `ask`, `bid` |

The measured priority disagrees with `PINE_TRACE_REQUIRED_v1`: rank 10, undocumented TA `na` policy, is the hottest practical purchase because 63 of the 66 confirmed interior-hole scripts are in the `ta.cross` family. Rank 1, unclosed-HTF `request.security`, is structurally common (`request.security` has 366 corpus hits and `request.security_lower_tf` has 34), but this member-level exposure scan does not prove which of those calls require an unclosed realtime HTF trace.

The cheapest acquisition that meaningfully moves parity is unchanged: a static historical TradingView export for the seven unsettled TA functions fed by deliberate interior holes. It buys coverage for 66 of 2,000 measured user-written scripts without realtime observation, broker-emulator tracing, alert scheduling, or request-provider synchronization. Purchases two, three, and four are still browser-manual, but they are not recording-rig work: they use copied Pine Logs text because TradingView chart-data CSV cannot represent repeated live executions of one bar. Purchase 2 is now smaller than V1 because it no longer buys historical `islastconfirmedhistory`; purchase 3 remains unchanged at 35 scripts; purchase 4 remains unchanged at 19/2,000 scripts and high consequence because wrong rollback escape produces silent live-value drift.

Paste script: `tradingview-ta-hole-trace-v1.pine`. Import command after export: `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-ta-hole-trace.ts --input <TradingView CSV> --output packages/tealscript/reports/tradingview-ta-hole-trace-expectations-v1.json --symbol <symbol> --timeframe <timeframe> --timezone <timezone>`.
Realtime scripts: `tradingview-realtime-barstate-trace-v1.pine`, `tradingview-timenow-trace-v1.pine`, and `tradingview-varip-replacement-trace-v1.pine`. Import copied Pine Logs with `scripts/import-tradingview-realtime-trace.ts`.

## Acquisition Cost

| Buy order | Trace package | Cost | Terminal steps |
| ---: | --- | --- | --- |
| 1 | Undocumented TA interior-hole policy | One static historical indicator script, one chart, one exported table/CSV containing the holed inputs and target outputs. No realtime feed, rollback, broker emulator, or alert scheduling. | <br>Open TradingView Pine Editor on a liquid symbol with ordinary historical bars.<br>Paste one indicator that defines deterministic holed series, paired holed series for `ta.cross*`, and plots those inputs plus `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, and `ta.vwap` outputs.<br>Add it to the chart, use Download chart data to export the CSV for those plotted columns, and save the Pine source, symbol, timeframe, input values, OHLCV, and exported rows together. |
| 2 | Realtime barstate | One live Pine Logs recording over repeated same-bar updates and a bar transition. Historical chart-data CSV cannot show same-timestamp replacement ticks or live new/realtime transitions, so this is a copied-log trace rather than a download-only export. | <br>Open TradingView on a 1-minute chart for a liquid live symbol during market hours.<br>Paste `tradingview-realtime-barstate-trace-v1.pine`, add it to the chart, and open Pine Logs.<br>Wait until the logs contain at least two `TS_TRACE_V1` lines with the same `time` value, then keep recording through the next bar transition.<br>Copy the Pine Logs lines containing `TS_TRACE_V1` into a text file; the lines carry declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, `timenow`, and all barstate flags.<br>Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind barstate --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-realtime-barstate-trace-expectations-v1.json`. |
| 3 | Wall-clock realtime | One copied Pine Logs recording across reload or live update. It is cheaper than the full synchronized request/security capture, but it still needs wall-clock observation because historical chart-data CSV cannot prove execution-time behavior. | <br>Open TradingView on a live chart, paste `tradingview-timenow-trace-v1.pine`, add it to the chart, and open Pine Logs.<br>Copy `TS_TRACE_V1` lines after initial load, then either reload the chart or wait for a realtime update and copy the new lines.<br>Save the copied Pine Logs text; each trace line carries declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, `barstate.isrealtime`, and `timenow`.<br>Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind timenow --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-timenow-trace-expectations-v1.json`. |
| 4 | Realtime varip replacement | One copied Pine Logs recording over repeated same-bar updates. Exposure is lower than the top three purchases, but a wrong result is silent realtime value drift rather than a loud failure. | <br>Open TradingView on a 1-minute chart for a liquid live symbol during market hours.<br>Paste `tradingview-varip-replacement-trace-v1.pine`, add it to the chart, and open Pine Logs.<br>Wait until the logs contain at least two `TS_TRACE_V1` lines with the same `time` value, then keep recording through the next bar transition.<br>Copy the Pine Logs lines containing `TS_TRACE_V1` into a text file; the lines carry declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, barstate flags, and paired `var`/`varip` scalar and array state.<br>Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind varip --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-varip-replacement-trace-expectations-v1.json`. |
| 5 | Strategy risk and broker exactness | A strategy trace with order/fill/risk state; materially more expensive than purchase one and should not be bundled into it. | <br>Paste a strategy that triggers each risk rule on deterministic bars.<br>Export order list, fills, equity, open/closed trade fields, and plotted diagnostic values across enough bars/session boundaries to observe intraday resets. |
| 6 | Provider event and seed data | Provider-specific fixture capture, not a generic realtime recording; needs symbols and dates with known earnings/seed observations. | <br>Choose symbols/dates with known provider observations, plot request outputs and alignment diagnostics, then export returned series with raw chart bars and provider context. |
| 7 | Exchange session calendar | Calendar fixture capture across regular sessions, holidays, DST, or early closes; historical data is enough if the chosen window includes the irregularity. | <br>Choose an exchange symbol/date range spanning the target session boundary, plot `session.isfirstbar`, `session.islastbar`, `time`, and `time_close`, then export values with exchange timezone and chart session settings. |
| 8 | Random sequence | Static historical capture may be enough for seeded calls; unseeded behavior needs repeated reload observation. | <br>Paste a script plotting seeded and unseeded `math.random` calls, then export the first run and at least one reload. |
| 9 | Live bid/ask quote fields | Live quote capture only; historical bars do not contain bid/ask. | <br>Open a live symbol where bid/ask are populated, plot `ask`, `bid`, `close`, and `timenow`, and save values through at least one quote update. |

## What Changed Since V1

| Trace package | Current value | Settled since V1 |
| --- | --- | --- |
| Undocumented TA interior-hole policy | 66 scripts; `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, `ta.vwap` | Unchanged. Clean-data arithmetic and invariants for neighboring TA functions do not settle the seven interior-hole policies in this purchase. |
| Realtime barstate | 36 scripts; `barstate.isnew`, `barstate.isrealtime` | Narrowed. Coverage v169 externally closed the historical `barstate.islastconfirmedhistory` boundary for closed-market, realtime-last-only, and multi-bar realtime-segment host shapes. |
| Wall-clock realtime | 35 scripts; `timenow` | Unchanged. No later vector or trace settled wall-clock execution-time behavior. |
| Realtime varip replacement | 19 scripts; `varip` | Unchanged. Historical `var`/`varip` behavior is covered, but replacement-sensitive same-bar rollback escape still needs live observations. |
| Strategy risk and broker exactness | 13 scripts; `strategy.risk.max_intraday_loss`, `strategy.risk.max_drawdown`, `strategy.risk.max_intraday_filled_orders` | Partly narrowed outside the top four. Deterministic commission, sizing, FIFO/ANY attribution, pyramiding, process-on-close, OCA, and risk-rule suppression vectors closed the documented historical money surface; broker-emulator sequencing, margin/liquidation, and exact intraday risk reset behavior remain trace-shaped. |
| Provider event and seed data | 4 scripts; `earnings.estimate`, `earnings.future_time`, `earnings.future_eps`, `earnings.future_revenue`, `request.seed` | Unchanged. Provider-owned values still require provider-backed observations. |
| Exchange session calendar | 2 scripts; `session.isfirstbar`, `session.islastbar` | Unchanged for exact exchange calendars. Synthetic session fixtures cover generated profiles, not TradingView exchange-calendar irregularities. |
| Random sequence | 2 scripts; `math.random` | Unchanged. No deterministic reference sequence has been acquired. |
| Live bid/ask quote fields | 1 script; `ask`, `bid` | Unchanged. Live quote fields remain host-feed observations. |

## Confirmed Interior-Hole Members

| Rank | Member | Scripts |
| ---: | --- | ---: |
| 1 | `ta.crossover` | 49 |
| 2 | `ta.crossunder` | 48 |
| 3 | `ta.cross` | 17 |
| 4 | `ta.bb` | 1 |
| 5 | `ta.rsi` | 1 |
| 6 | `ta.stoch` | 1 |
| 7 | `ta.vwap` | 1 |

## Trace/Host-Required Members

| Rank | Member | Scripts |
| ---: | --- | ---: |
| 1 | `runtime.error` | 395 |
| 2 | `timenow` | 35 |
| 3 | `barstate.islastconfirmedhistory` | 29 |
| 4 | `library` | 26 |
| 5 | `barstate.isnew` | 12 |
| 6 | `strategy.risk.max_intraday_loss` | 11 |
| 7 | `strategy.risk.max_drawdown` | 8 |
| 8 | `earnings.estimate` | 2 |
| 9 | `earnings.future_time` | 2 |
| 10 | `math.random` | 2 |
| 11 | `request.seed` | 2 |
| 12 | `strategy.risk.max_intraday_filled_orders` | 2 |
| 13 | `ask` | 1 |
| 14 | `bid` | 1 |
| 15 | `earnings.future_eps` | 1 |
| 16 | `earnings.future_revenue` | 1 |
| 17 | `session.isfirstbar` | 1 |
| 18 | `session.islastbar` | 1 |

## V1 Surface Crosswalk

| Surface | V1 rank | Measured scripts | Members | Reading |
| --- | ---: | ---: | --- | --- |
| Undocumented TA interior-hole policy | 10 | 66 | `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, `ta.vwap` | Measured as confirmed mid-series hole routes into unsettled TA calls. |
| Realtime barstate | 4 | 36 | `barstate.isnew`, `barstate.isrealtime` | Live same-timestamp update and new-bar state. Historical `barstate.islastconfirmedhistory` boundary is now externally closed and no longer part of this purchase. |
| Wall-clock realtime | unranked | 35 | `timenow` | Execution-time value, not derivable from deterministic bars. |
| Realtime varip replacement | unranked | 19 | `varip` | Realtime rollback-escape language semantics for intrabar state. |
| Strategy risk and broker exactness | 2 | 13 | `strategy.risk.max_intraday_loss`, `strategy.risk.max_drawdown`, `strategy.risk.max_intraday_filled_orders` | Risk halts and forced exits need broker/session traces. |
| Provider event and seed data | 6 | 4 | `earnings.estimate`, `earnings.future_time`, `earnings.future_eps`, `earnings.future_revenue`, `request.seed` | Provider-owned values and revision/alignment behavior. |
| Exchange session calendar | 7 | 2 | `session.isfirstbar`, `session.islastbar` | Calendar/session irregularities rather than language semantics. |
| Random sequence | unranked | 2 | `math.random` | TradingView pseudo-random sequence needs observed parity. |
| Live bid/ask quote fields | unranked | 1 | `ask`, `bid` | Host live quote stream values. |

## Not Settled By This Purchase Order

- Ordinary `request.security` live-bar behavior remains separately important: 366 corpus hits use `request.security`, and 34 use `request.security_lower_tf`, but the current scan only ranks the 50 trace/host-required members and confirmed unsettled-NA holes.
- `runtime.error` should be tracked as an intentional exception surface, not purchased as a trace.
- `library` is unsupported-by-design for third-party TradingView imports; official TradingView libraries are implemented as builtins.
- 189 scripts still have UDF/object-state exposure that the static scanner cannot classify safely.
- `barstate.islastconfirmedhistory` historical-boundary behavior is settled by `pine-barstate-lastconfirmedhistory-oracles-v1.md`; live repeated-tick barstate behavior is still purchased by item 2.
