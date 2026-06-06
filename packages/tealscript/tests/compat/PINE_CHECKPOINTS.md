# Pine Checkpoint Sources

This file tracks real Pine idiom checkpoints that back the compatibility suite.
The tests must remain offline and deterministic: each checkpoint uses local bars,
small reduced scripts, and hand-checked expected outputs.

Do not paste large public scripts into this repository. Preserve the behavior
shape, cite the source or source-search context, and reduce the script to the
smallest fixture that proves the semantic contract.

## Public Script Guardrails

Public Pine scripts are useful for discovering idioms, but they are not test
fixtures by default.

- Prefer semantic reductions that are written for this repository.
- Do not commit a public script body unless its license explicitly allows
  redistribution in this repo.
- If a licensed public script is ever committed, include the license, author,
  source URL, retrieval date, and the reason a reduced fixture is insufficient.
- Keep source-search links when the exact script body is not needed.
- Treat screenshots and manual TradingView observations as notes, not CI
  oracles.
- If a reduced fixture grows large, split it by behavior instead of preserving
  the original script shape.

## Official Documentation Checkpoints

| Fixture | Source | Reduced Contract | Expected Outputs |
| --- | --- | --- | --- |
| `Official Built-ins Checkpoint` | https://www.tradingview.com/pine-script-docs/language/built-ins/ | Namespace access through `ta.sma()` and comparison against a derived average. | Hand-checked SMA and boolean trend series over `compatibilityBars`. |
| `Official Array Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/bar-states/ and https://www.tradingview.com/pine-script-docs/language/arrays/ | `barstate.isfirst` guarded array initialization plus per-bar dynamic growth. | First close remains stable; array size increments deterministically. |
| `Official Max Bars Back Checkpoint` | https://www.tradingview.com/pine-script-docs/error-messages/ | `indicator(..., max_bars_back=2)` bounds explicit history references while allowing in-range lookback. | Recorded declaration metadata and `close[2]` shifted series over `compatibilityBars`. |
| `Official Barcolor Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/ | Inside/outside candle classification drives `barcolor()` output. | Explicit four-bar color sequence over local OHLC bars. |
| `Official Marker Payload Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ | Conditional `plotshape()` and numeric `plotchar()` markers preserve per-bar body and text colors while masking hidden bars. | Values, body colors, and text colors over `compatibilityBars`. |
| `Official Plot Style Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/plots/ | Common `plot.style_*` constants preserve plot payload style, join, z-order, and histbase metadata. | Style metadata and area-break values over `compatibilityBars`. |
| `Official Alert Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/alerts/ | Rising-close condition registers an `alertcondition()` and emits direct `alert()` calls from an `if` block. | Trigger plot, alertcondition values, and direct alert events over `compatibilityBars`. |
| `Official Strategy Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | Default market entry filled at the next bar open, followed by a bracket `strategy.exit()` limit/stop order. | Position, closed-trade count, net profit, and closed trade ledger fields over four local bars with divergent signal-close/next-open prices. |
| `Official Profit Loss Exit Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.exit()` profit and loss arguments are interpreted as tick distances from the entry price. | Closed-trade count, net profit, and closed trade ledger fields over local bars with explicit `syminfo.mintick`. |
| `Official Trailing Exit Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.exit()` trailing stop activation and offset arguments are interpreted as tick distances from entry/highs/lows. | Closed-trade count, net profit, and closed trade ledger fields over local bars with explicit `syminfo.mintick`. |
| `Official Broker Emulator Path Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/#broker-emulator | Default broker-emulator OHLC path assumptions choose high-first or low-first bracket fills, and opening-gap stop crossings fill at the current bar open. | Closed-trade count, net profit, exit order ids, and exit prices across high-first, low-first, and opening-gap local bars. |
| `Official Bar Magnifier Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `use_bar_magnifier=true` consumes a host lower-timeframe execution path for same-chart-bar bracket ordering. | Lower-timeframe context metadata, closed-trade count, net profit, and limit-leg fill time over local bars. |
| `Official Stop Limit Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-types | `strategy.entry()` stop-limit orders activate when the stop is crossed and fill later when the ordered path reaches the limit. | Position series, fill price/time, and activated stop-limit order metadata over local bars. |
| `Official Immediate Close Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all | `strategy.close(..., immediately=true)` closes on the current bar even when process-on-close is disabled. | Position, closed-trade count, net profit, and same-bar closed trade metadata over local bars. |
| `Official Disable Alert Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | Strategy order fills suppress alert events when their `disable_alert` argument is true. | Closed-trade count, emitted fill-alert messages, fill metadata, and suppressed entry-alert evidence over local bars. |
| `Official Recalculate After Fill Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `calc_on_order_fills=true` reruns the current historical bar after a pending fill and can submit a same-bar close order. | Final position, closed-trade count, recalc counter, closed trade ledger fields, and preserved order-fill alert event. |
| `Official Bar Magnifier Recalculate Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `calc_on_order_fills=true` and `use_bar_magnifier=true` keep recalc-created price exits from filling against lower-timeframe ticks that occurred before the triggering fill. | Lower-timeframe fill time, pending exit state, position size, and closed-trade count over local bars. |
| `Official Calc On Every Tick Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | Default strategies skip unconfirmed realtime ticks, while `calc_on_every_tick=true` strategies recalculate on each realtime tick. | Default close plot stays historical on unconfirmed ticks; every-tick close plot appends and updates the realtime bar. |
| `Official Allow Entry In Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.risk.allow_entry_in(strategy.direction.long)` converts opposite `strategy.entry()` calls into close-only orders while leaving `strategy.order()` unrestricted. | Position, closed-trade count, open-trade count, submitted order quantities, and closed trade ledger fields over three local bars. |
| `Official Intraday Filled Orders Risk Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.risk.max_intraday_filled_orders(count=1)` blocks additional same-day non-exit order submissions after the first fill. | Position, open-trade count, fill ids, submitted order ledger, and captured risk-rule metadata over three local bars. |
| `Official Consecutive Loss Days Risk Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.risk.max_cons_loss_days(count=2)` blocks additional non-exit submissions after two consecutive UTC losing days. | Position, closed-trade count, fill ids, closed-trade PnL, submitted order ledger, and captured risk-rule metadata over five local bars. |
| `Official Intraday Loss Risk Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `strategy.risk.max_intraday_loss(value=5, type=strategy.cash)` blocks additional non-exit submissions after same-day equity loss exceeds the cash limit. | Position, equity plot, fill ids, submitted order ledger, equity-curve drawdown, and captured risk-rule metadata over three local bars. |
| `Official Request Limit Checkpoint` | https://www.tradingview.com/pine-script-docs/writing/limitations/ | Repeated identical `request.security()` calls inside a loop reuse one unique request context. | No runtime error, one request context in the runtime profile, and a deterministic zero request-sum plot. |
| `Official Lower TF Array Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/ | `request.security_lower_tf()` returns lower-timeframe expression values as ordered intrabar arrays. | Intrabar count, first value, and last value over local chart/request bars. |
| `Official Ticker Request Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/ | Synthetic ticker IDs request extended-session and Heikin-Ashi data through `request.security()`. | Extended close, derived Heikin-Ashi close, and standardized ticker id length over local request bars. |
| `Official Dynamic Session Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/sessions/ | Dynamic session strings combine `input.session()` values with day masks and feed `time()`. | Dynamic session mask and session string length over `compatibilityBars`. |
| `Official Timeframe Comparison Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/timeframes/ | `input.timeframe()` and `timeframe.in_seconds()` compare chart and selected timeframe durations. | Chart minutes, input minutes, and valid-timeframe guard over `compatibilityBars`. |

## Public Idiom Checkpoints

| Fixture | Source Context | Reduced Contract | Expected Outputs |
| --- | --- | --- | --- |
| `Public MTF Trend Checkpoint` | https://www.tradingview.com/scripts/search/mtf%20trend%20filter/ | Local price filtered by a higher-timeframe moving average requested with `request.security()`. | HTF average merge series and local trend gate over local/request bars. |
| `Public Divergence Checkpoint` | https://www.tradingview.com/scripts/search/rsi%20divergence/ | Sequential price pivots compared with lower oscillator pivots to flag bearish divergence. | Pivot series and one bearish divergence signal over local bars. |
| `Public Marker Signal Checkpoint` | https://www.tradingview.com/scripts/search/buy%20sell%20signal%20markers/ | Moving-average trend states drive `plotshape()`, `plotchar()`, and `plotarrow()` marker payloads. | Buy/sell marker values, body colors, text colors, and arrow sign/color payloads over `compatibilityBars`. |
| `Public Volatility Band Checkpoint` | https://www.tradingview.com/scripts/search/bollinger%20band%20squeeze/ | Bollinger-style basis/bands drive filled channels, squeeze background states, and breakout markers. | Band series, bandwidth values, fill payload, background mask, and marker payload over `compatibilityBars`. |
| `Public Session Filter Checkpoint` | https://www.tradingview.com/scripts/search/session%20filter/ | Session membership gates a raw signal. | Session mask and filtered signal over `compatibilityBars`. |
| `Public Session State Checkpoint` | https://www.tradingview.com/scripts/search/session%20ismarket/ | Exchange session-state helpers gate premarket, regular, and postmarket logic from host session metadata. | Premarket, market, postmarket, and extended-active state over local bars. |
| `Public Object Method Checkpoint` | https://www.tradingview.com/scripts/search/market%20structure%20object/ | Persistent UDT state is updated through a user-defined method when confirmed pivot highs appear. | Pivot count, last high, and rising-pivot state over `compatibilityBars`. |
| `Public Drawing Zone Checkpoint` | https://www.tradingview.com/scripts/search/supply%20demand%20zones/ | Persistent supply/demand zone drawings update a box and midline from recent swing ranges. | Final zone bounds, midpoint plot, box payload, and right-extended midline payload over `compatibilityBars`. |
| `Public Linefill Channel Checkpoint` | https://www.tradingview.com/scripts/search/channel%20linefill/ | Persistent upper/lower channel line handles are updated on the last bar and filled by `linefill.new()`. | Channel width plot plus upper/lower line payloads and translucent linefill payload over `compatibilityBars`. |
| `Public Zigzag Polyline Checkpoint` | https://www.tradingview.com/scripts/search/zigzag%20polyline/ | Last-bar swing chart points are collected into an array and rendered as a `polyline` path. | Point-count plot and polyline payload with four `chart.point` vertices over `compatibilityBars`. |
| `Public Custom Candle Checkpoint` | https://www.tradingview.com/scripts/search/heikin%20ashi%20candles/ | Recursive Heikin-Ashi OHLC values are rendered through a custom `plotcandle()` overlay. | HA OHLC series, body/wick/border colors, force-overlay metadata, and body-delta plot over `compatibilityBars`. |
| `Public Currency Conversion Checkpoint` | https://www.tradingview.com/scripts/search/currency%20conversion/ | Multi-asset values are normalized through `request.currency_rate()` before plotting. | Merged FX rate series and converted value plot over local bars with deterministic currency-rate points. |
| `Public Earnings Event Checkpoint` | https://www.tradingview.com/scripts/search/earnings%20surprise/ | Earnings overlays compare `request.earnings()` actual EPS with estimates and mark surprise event bars. | Sparse actual/estimate EPS event series, beat plot, and `plotshape()` marker payload over deterministic request-series points. |
| `Public Corporate Actions Checkpoint` | https://www.tradingview.com/scripts/search/dividends%20splits/ | Corporate-action overlays combine `request.dividends()` and `request.splits()` event series into chart markers. | Sparse dividend and split-ratio event plots, action-score plot, and marker payloads over deterministic request-series points. |
| `Public Financial Dashboard Checkpoint` | https://www.tradingview.com/scripts/search/fundamental%20dashboard/ | Fundamental dashboards derive ratios from `request.financial()` metrics and summarize latest values in a table. | Revenue series, margin plot, and last-bar table payload over deterministic financial request points. |
| `Public Economic Macro Checkpoint` | https://www.tradingview.com/scripts/search/macro%20economic/ | Macro overlays request host economic point series and gate regimes from the latest value. | GDP series and expansion regime plot over deterministic economic request points. |
| `Public Seed Dataset Checkpoint` | https://www.tradingview.com/scripts/search/pine%20seeds/ | Public scripts merge curated external datasets through `request.seed()`. | Seed close and derived trend plots over deterministic seed request bars. |
| `Public Strategy Trailing Stop Checkpoint` | https://www.tradingview.com/scripts/search/strategy%20trailing%20stop/ | A trend-style long entry submits a tick-distance trailing `strategy.exit()` using `trail_points` and `trail_offset`. | Position, closed-trade count, net-profit plot, trailing order activation/ratchet fields, and closed trade ledger fields over local strategy bars with explicit `syminfo.mintick`. |
| `Public Strategy Stats Checkpoint` | https://www.tradingview.com/scripts/search/strategy%20performance%20table/ | Strategy performance counters feed a last-bar summary table. | Closed-trade count, win count, net-profit plot, closed trade ledger fields, and stats table over local strategy bars. |

## Checkpoint Coverage Index

This index maps source-linked checkpoints to the major parity areas they guard.
Lower-level compatibility tests still carry most edge-case coverage; checkpoint
fixtures are the real-idiom smoke layer that should grow whenever a parity epic
adds a new user-visible concept.

`pine-corpus.test.ts` mirrors the source-linked checkpoints below as
`PineScriptLedgerEntry` metadata and runs them through the offline corpus
reporter. Keep that corpus in sync with this table when adding or retiring
checkpoint fixtures so pass-rate reporting continues to reflect real Pine
idioms rather than isolated unit coverage.

| Parity Area | Checkpoint Fixture | Primary Evidence |
| --- | --- | --- |
| Built-ins and series comparisons | `Official Built-ins Checkpoint` | `pine-real-checkpoints.test.ts` |
| Barstate, persistent arrays, and first-bar initialization | `Official Array Checkpoint` | `pine-real-checkpoints.test.ts` |
| Runtime history bounds | `Official Max Bars Back Checkpoint`; max-bars-back error fixtures in `engine.test.ts` | `pine-real-checkpoints.test.ts`; `engine.test.ts` |
| Visual candle tinting | `Official Barcolor Checkpoint` | `pine-real-checkpoints.test.ts` |
| Marker output payloads | `Official Marker Payload Checkpoint`; `Public Marker Signal Checkpoint`; `Public Volatility Band Checkpoint`; `Public Earnings Event Checkpoint`; `Public Corporate Actions Checkpoint`; marker color/text payload fixtures in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Plot style payloads | `Official Plot Style Checkpoint`; visual constants fixture in `pine-visuals.test.ts`; renderer plot-style fixtures in `TealchartRenderer.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts`; `TealchartRenderer.test.ts` |
| Filled plot channels and backgrounds | `Public Volatility Band Checkpoint`; `Public Linefill Channel Checkpoint`; fill and background fixtures in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Custom candle overlays | `Public Custom Candle Checkpoint`; `plotcandle()` fixtures in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Request data and multi-timeframe requests | `Public MTF Trend Checkpoint`; `Public Currency Conversion Checkpoint`; `Public Earnings Event Checkpoint`; `Public Corporate Actions Checkpoint`; `Public Financial Dashboard Checkpoint`; `Public Economic Macro Checkpoint`; `Public Seed Dataset Checkpoint`; `Official Lower TF Array Checkpoint`; repaint-safe HTF fixture in `pine-request-security.test.ts` | `pine-real-checkpoints.test.ts`; `pine-request-security.test.ts` |
| Ticker request IDs | `Official Ticker Request Checkpoint`; ticker modifier fixtures in `pine-ticker.test.ts` | `pine-real-checkpoints.test.ts`; `pine-ticker.test.ts` |
| Pivot/divergence idioms | `Public Divergence Checkpoint` | `pine-real-checkpoints.test.ts` |
| Session-gated signals | `Public Session Filter Checkpoint`; `Public Session State Checkpoint`; `Official Dynamic Session Checkpoint` | `pine-real-checkpoints.test.ts` |
| Timeframe comparisons | `Official Timeframe Comparison Checkpoint`; timeframe utility fixtures in `pine-control-time.test.ts` | `pine-real-checkpoints.test.ts`; `pine-control-time.test.ts` |
| Alerts and alert conditions | `Official Alert Checkpoint`; alert crossover fixture in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Strategy broker flows | `Official Strategy Checkpoint`; `Official Profit Loss Exit Checkpoint`; `Official Trailing Exit Checkpoint`; `Official Broker Emulator Path Checkpoint`; `Official Bar Magnifier Checkpoint`; `Official Stop Limit Checkpoint`; `Official Immediate Close Checkpoint`; `Official Disable Alert Checkpoint`; `Official Allow Entry In Checkpoint`; `Official Intraday Filled Orders Risk Checkpoint`; `Official Consecutive Loss Days Risk Checkpoint`; `Official Intraday Loss Risk Checkpoint`; `Official Recalculate After Fill Checkpoint`; `Official Bar Magnifier Recalculate Checkpoint`; `Official Calc On Every Tick Checkpoint`; `Public Strategy Trailing Stop Checkpoint`; `Public Strategy Stats Checkpoint` | `pine-real-checkpoints.test.ts` |
| Limits and request-context reuse | `Official Request Limit Checkpoint` | `pine-real-checkpoints.test.ts` |
| User-defined objects | `Public Object Method Checkpoint`; `Public UDT State Layout Checkpoint`; reduced official object idioms | `pine-real-checkpoints.test.ts`; `pine-objects.test.ts` |
| Drawings and tables | `Public Drawing Zone Checkpoint`; `Public Financial Dashboard Checkpoint`; `Public Linefill Channel Checkpoint`; `Public Zigzag Polyline Checkpoint`; manual comparison milestones plus reduced drawing fixtures | `pine-real-checkpoints.test.ts`; `PINE_CHECKPOINTS.md`; `pine-drawings.test.ts` |

## Adding A Checkpoint

1. Link the source page or source-search context.
2. Reduce the script to the minimum semantic shape; do not copy large examples.
3. Use `compatibilityBars` or a local `Bar[]` declared in the test.
4. Assert concrete plots, drawings, alerts, inputs, strategy fields, or
   diagnostics.
5. Keep the expected output hand-checked and stable. Do not call TradingView,
   fetch live data, or depend on network access in CI.

## Manual Visual Comparison Notes

Some Pine parity work cannot be fully validated through numeric fixtures because
the user-facing contract is visual placement, layering, object lifetime, or
chart interaction. Keep those checks manual and repeatable:

1. Pick a milestone script that is already represented by a reduced fixture.
2. Run it on the fixed local bars or on an explicitly named manual chart.
3. Compare TradingView and Tealchart screenshots for the visual contract below.
4. Record any mismatch as a new reduced fixture or as a planned unsupported
   diagnostic. Do not use live TradingView output as a CI oracle.

| Milestone Area | Existing Reduced Fixture | Manual Comparison Focus |
| --- | --- | --- |
| Candle tinting | `Official Barcolor Checkpoint` | Bar color priority, `na` gaps, and overlay behavior. |
| Higher-timeframe overlays | `Public MTF Trend Checkpoint` | Confirmed HTF merge timing, stair-step shape, and repaint-safe offsets. |
| Divergence markers | `Public Divergence Checkpoint` | Pivot delay, marker bar alignment, and repeated-signal suppression. |
| Session filters | `Public Session Filter Checkpoint`; `Official Dynamic Session Checkpoint` | Session boundary inclusion, dynamic session strings, exchange timezone assumptions, and masked signals. |
| Drawing objects | `pine-drawings.test.ts` label/line/box/table fixtures | Object creation bar, update behavior, z-order, and text/color fidelity. |
| UDT state layout | `Public UDT State Layout Checkpoint` | Wrapped field defaults, first-bar initialization, persistent object mutation, and method-dispatch state. |
| Strategies | `engine.test.ts` and strategy compat fixtures | Entry/exit bar alignment, fills, position sizing, and ledger values. |

Manual notes should stay short and link to the issue or PR where the comparison
was performed. If a comparison exposes behavior that can be checked
deterministically, add a reduced fixture instead of expanding this section.
