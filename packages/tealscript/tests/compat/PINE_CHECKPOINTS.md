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
| `Official Barcolor Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/ | Inside/outside candle classification drives `barcolor()` output. | Explicit four-bar color sequence over local OHLC bars. |
| `Official Marker Payload Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/ | Conditional `plotshape()` and numeric `plotchar()` markers preserve per-bar body and text colors while masking hidden bars. | Values, body colors, and text colors over `compatibilityBars`. |
| `Official Alert Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/alerts/ | Rising-close condition registers an `alertcondition()` and emits direct `alert()` calls from an `if` block. | Trigger plot, alertcondition values, and direct alert events over `compatibilityBars`. |
| `Official Strategy Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | Default market entry filled at the next bar open, followed by a bracket `strategy.exit()` limit/stop order. | Position, closed-trade count, net profit, and closed trade ledger fields over four local bars with divergent signal-close/next-open prices. |
| `Official Bar Magnifier Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `use_bar_magnifier=true` consumes a host lower-timeframe execution path for same-chart-bar bracket ordering. | Lower-timeframe context metadata, closed-trade count, net profit, and limit-leg fill time over local bars. |
| `Official Recalculate After Fill Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/strategies/ | `calc_on_order_fills=true` reruns the current historical bar after a pending fill and can submit a same-bar close order. | Final position, closed-trade count, recalc counter, closed trade ledger fields, and preserved order-fill alert event. |
| `Official Request Limit Checkpoint` | https://www.tradingview.com/pine-script-docs/writing/limitations/ | Repeated identical `request.security()` calls inside a loop reuse one unique request context. | No runtime error, one request context in the runtime profile, and a deterministic zero request-sum plot. |

## Public Idiom Checkpoints

| Fixture | Source Context | Reduced Contract | Expected Outputs |
| --- | --- | --- | --- |
| `Public MTF Trend Checkpoint` | https://www.tradingview.com/scripts/search/mtf%20trend%20filter/ | Local price filtered by a higher-timeframe moving average requested with `request.security()`. | HTF average merge series and local trend gate over local/request bars. |
| `Public Divergence Checkpoint` | https://www.tradingview.com/scripts/search/rsi%20divergence/ | Sequential price pivots compared with lower oscillator pivots to flag bearish divergence. | Pivot series and one bearish divergence signal over local bars. |
| `Public Session Filter Checkpoint` | https://www.tradingview.com/scripts/search/session%20filter/ | Session membership gates a raw signal. | Session mask and filtered signal over `compatibilityBars`. |

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
| Visual candle tinting | `Official Barcolor Checkpoint` | `pine-real-checkpoints.test.ts` |
| Marker output payloads | `Official Marker Payload Checkpoint`; marker color/text payload fixtures in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Multi-timeframe data requests | `Public MTF Trend Checkpoint`; repaint-safe HTF fixture in `pine-request-security.test.ts` | `pine-real-checkpoints.test.ts`; `pine-request-security.test.ts` |
| Pivot/divergence idioms | `Public Divergence Checkpoint` | `pine-real-checkpoints.test.ts` |
| Session-gated signals | `Public Session Filter Checkpoint` | `pine-real-checkpoints.test.ts` |
| Alerts and alert conditions | `Official Alert Checkpoint`; alert crossover fixture in `pine-visuals.test.ts` | `pine-real-checkpoints.test.ts`; `pine-visuals.test.ts` |
| Strategy broker flows | `Official Strategy Checkpoint`; `Official Bar Magnifier Checkpoint`; `Official Recalculate After Fill Checkpoint` | `pine-real-checkpoints.test.ts` |
| Limits and request-context reuse | `Official Request Limit Checkpoint` | `pine-real-checkpoints.test.ts` |
| User-defined objects | Reduced official object idioms | `pine-objects.test.ts` |
| Drawings and tables | Manual comparison milestones plus reduced drawing fixtures | `PINE_CHECKPOINTS.md`; `pine-drawings.test.ts` |

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
| Session filters | `Public Session Filter Checkpoint` | Session boundary inclusion, exchange timezone assumptions, and masked signals. |
| Drawing objects | `pine-drawings.test.ts` label/line/box/table fixtures | Object creation bar, update behavior, z-order, and text/color fidelity. |
| Strategies | `engine.test.ts` and strategy compat fixtures | Entry/exit bar alignment, fills, position sizing, and ledger values. |

Manual notes should stay short and link to the issue or PR where the comparison
was performed. If a comparison exposes behavior that can be checked
deterministically, add a reduced fixture instead of expanding this section.
