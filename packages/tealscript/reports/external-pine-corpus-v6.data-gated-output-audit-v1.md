> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V6 Data-Gated Output Audit V1

Parent audit: `external-pine-corpus-v6.top-cause-audit-v1.md`.
Measurement commit: `94cae779898ba55e04e67df644e6025f7e281251`.
Follow-up probe branch head: `9acce2b712cfd91c7ed0b12a6ed8a6745fe533b2`.
Corpus: `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.

The raw v6 dispatch list had 35 `output:conditional-or-data-gated-output-not-triggered`
rows. They are not one implementation bucket. The generic 8,000-bar stress
profile recovered none because several rows need specific chart context or
because the classifier was asking the wrong output question.

TradingView references used for this classification:

- Bar states: `barstate.islast` is true on the chart's last bar and
  `barstate.isconfirmed` is true on historical bars.
  `https://www.tradingview.com/pine-script-docs/concepts/bar-states/`
- Strategies: `strategy.entry()`, `strategy.order()`, `strategy.exit()`,
  `strategy.close()`, and `strategy.close_all()` are order placement commands.
  `https://www.tradingview.com/pine-script-docs/concepts/strategies/`
- Sessions: `session.ismarket` / `session.ispremarket` depend on the symbol's
  session model; crypto has no premarket.
  `https://www.tradingview.com/pine-script-docs/concepts/sessions/`
- Libraries: a Pine library is reusable code, not an applied chart script.
  `https://www.tradingview.com/pine-script-docs/concepts/libraries/`

## Result

| Category | Rows | Disposition |
| --- | ---: | --- |
| Strategy ledger active, visual-output classifier blind | 13 | Harness/report fix. These rows are not silent; they place and fill strategy orders. |
| Fixture-fixable chart context / market condition | 12 | Add targeted fourth-profile cases, not engine work yet. |
| Host-required input, symbol, session, or provider context | 4 | Trace/register or host-fixture work; not a generic bar-profile fix. |
| Corpus hygiene: library source, not chart script | 2 | Remove from chart-output denominator or classify as library-source rows. |
| Genuine engine candidates | 2 | Dispatch only after reduced repros; generic and targeted fixtures still produced no output where source conditions should be reachable. |
| Correct historical silence / realtime-only visual | 1 | Not a corpus failure. |
| Stress-profile timeout | 1 | Performance/scale finding, not output ownership. |

## Strategy Ledger Rows Misclassified As Output Silence

These scripts have no plots/drawings/alerts/logs, but direct compiled execution
on a 15m ETHUSDT-style profile produced strategy ledger activity. The output
bucket should count strategy ledger as an output dimension for strategy rows.

| Row | Orders | Fills | Closed trades | Waiting for |
| --- | ---: | ---: | ---: | --- |
| `0807__pineforge-4pass-pineforge-corpus__strategy.pine` | 68 | 68 | 34 | Not waiting; active ledger. |
| `0819__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine` | 10 | 10 | 5 | Not waiting; active ledger. |
| `0855__pineforge-4pass-pineforge-codegen-oss__validation__pyramid-close-id-grouping-01.pine` | 268 | 268 | 201 | Not waiting; active ledger. |
| `0880__pineforge-4pass-pineforge-corpus__strategy.pine` | 10 | 10 | 5 | Not waiting; active ledger. |
| `0919__pineforge-4pass-pineforge-codegen-oss__validation__order-dual-stop-near-only-01.pine` | 102 | 102 | 68 | Not waiting; active ledger. |
| `0922__pineforge-4pass-pineforge-codegen-oss__validation__order-cross-exit-close-same-pass-01.pine` | 242 | 136 | 68 | Not waiting; active ledger. |
| `0923__pineforge-4pass-pineforge-codegen-oss__validation__order-cross-entry-close-same-pass-01.pine` | 134 | 134 | 67 | Not waiting; active ledger. |
| `0924__pineforge-4pass-pineforge-codegen-oss__validation__cap-risk-gates-allow-max-intraday-01.pine` | 102 | 102 | 68 | Not waiting; active ledger. |
| `0926__pineforge-4pass-pineforge-codegen-oss__validation__order-stop-entry-reversal-grouping-01.pine` | 170 | 170 | 136 | Not waiting; active ledger. |
| `0928__pineforge-4pass-pineforge-codegen-oss__validation__analyzer-parity-percent-of-equity-sizing-01.pine` | 10 | 10 | 5 | Not waiting; active ledger. |
| `0946__pineforge-4pass-pineforge-corpus__strategy.pine` | 99 | 99 | 66 | Not waiting; active ledger. |
| `0951__pineforge-4pass-pineforge-corpus__strategy.pine` | 134 | 134 | 67 | Not waiting; active ledger. |
| `0965__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine` | 134 | 134 | 67 | Not waiting; active ledger. |

## Fixture-Fixable Rows

These rows are waiting for chart context or price action a generic stress
profile does not guarantee. Two are proven recoverable with a refined 15m
volatile/full-session profile:

- `0767__agentiayoung-agent-trader-framework__range_breakout.pine`: recovered
  on the 15m probe with 92 drawings. It needs a full intraday range-breakout
  window rather than the default daily-style profile.
- `0623__AubakirovArman-SaltanatbotV2__5-ict-killzones-pivots.pine`: recovered
  on a 2024 15m volatile session probe with 1,134 drawings. It waits for
  explicit killzone/open sessions such as `2000-0000`, `0200-0500`,
  `0800-1100`, and one-minute open markers.

The remaining ten are fixture-fixable by source inspection:

| Row | Waiting for |
| --- | --- |
| `0219__utamons-pine__levels.pine` | Repeated high/low vertices within `luft=0.01` and at least three touches. |
| `0577__deepentropy-lightweight-charts-indicators__Breakouts-with-Tests-Retests-LuxAlgo-.pine` | Confirmed pivot, breakout, and retest state machine. |
| `0578__deepentropy-oakscriptJS__Breakouts-with-Tests-Retests-LuxAlgo-.pine` | Same LuxAlgo pivot/breakout/retest state machine. |
| `0699__studiomicro-strategies__bullish_engulfing.pine` | Strict bullish engulfing candle plus RSI exit. |
| `0717__dipayansamanta172-lgtm-tradingbot__main.pine` | Swing low/high, golden-zone retrace, fair-value gap, and no breaker block. |
| `0731__alireza-hme-algo-trading__HW1-strategy.pine` | A 2024-01-01 to 2024-03-31 input time window plus MA/volume/MACD/RSI conditions. |
| `0809__pineforge-4pass-pineforge-corpus__strategy.pine` | A 15m bar at 02:45 where open is closer to high than low. |
| `0858__deepentropy-lightweight-charts-indicators__Momentum-Strategy.pine` | Two-bar momentum continuation that leaves a stop entry fillable. |
| `0927__pineforge-4pass-pineforge-codegen-oss__validation__order-dual-stop-open-high-first-path-01.pine` | Same `nearHigh` clock/path condition as `0809`. |
| `0935__deepentropy-oakscriptJS__Momentum-Strategy.pine` | Same two-bar momentum stop-entry condition as `0858`. |

## Host-Required Rows

These cannot be settled by a fourth generic OHLCV profile alone.

| Row | Waiting for | Category |
| --- | --- | --- |
| `0547__BeSmMo-pinescript2__Multi-Supertrend.pine` | A screener over 40 input symbols plus `syminfo.tickerid == _ticker` for on-chart labels. | Symbol/provider context. |
| `0568__lucanenu-cpu-ai-trading-bot-2__signal_visualizer.pine` | Manual/webhook signal inputs; defaults are `sig_type="NONE"` and zero prices. | Host/input signal. |
| `0719__SynergOps-AlgoTrading__backtesting-stream.pine` | An external `input.source` stream whose values are `1`, `2`, `-1`, or `-2`; ordinary prices around 100 will never trigger it. | Host/source signal. |
| `0917__pineforge-4pass-pineforge-codegen-oss__QQQ__session-ispremarket-nasdaq-01.pine` | NASDAQ/QQQ regular and premarket session classification. Crypto-style synthetic context correctly has no premarket by TradingView's session rules. | Session calendar / symbol metadata. |

## Corpus Hygiene

These rows declare `library(...)`. Treating them as applied chart scripts makes
the output denominator count reusable source files as no-output indicators.

- `0981__deepentropy-lightweight-charts-indicators__getSeries-v2.pine`
- `0984__deepentropy-lightweight-charts-indicators__ZigZag-v8.pine`

## Engine Candidates

These are the only rows from this bucket worth handing to implementation after
a minimal repro is produced. They still produced no output under both generic
and targeted volatile intraday probes even though the source declares reachable
visual paths.

| Row | Suspect construct |
| --- | --- |
| `0231__BrandonFreire-Prj_ML_VisualizacionDeDatosMedianteMotorDeCharting__06_Mxwll_Suite_3.pine` | Last-bar higher-timeframe drawing path: arrays seeded from `request.security(..., "1D", ...)`, then `barstate.islast` line/label drawing. |
| `0473__quant5-lab-runner__support_resistance_pivot_levels.pine` | Same-timeframe `request.security()` tuple containing `ta.pivothigh()` / `ta.pivotlow()` with `barmerge.gaps_on`, feeding line creation. |

## Correct Historical Silence

`0367__regalouisei-collect-tradingview__3d-engine-overlay.pine` creates 3D
projection lines inside `if barstate.islast`, then deletes the local line array
inside `if barstate.isconfirmed`. TradingView documents historical bars as
confirmed and `barstate.islast` as true on the last chart bar, so historical
execution reaches both branches. This is a realtime/live-display script shape,
not a historical output failure.

## Timeout

`0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine`
timed out under the 8,000-bar stress profile. It is a performance/scale item
for macro/session drawing code, not evidence that the output condition is wrong.

## Dispatch

Hand to zx4rrg now:

- `0231` and `0473`, after reducing the request/timeframe visual path.
- The output classifier change: strategy ledger activity should count as output
  for strategy rows, otherwise active strategies are mislabeled as no-output.

Do not dispatch as engine bugs:

- The 12 fixture-fixable rows; they need a fourth targeted fixture profile.
- The 4 host-required rows; they need host input, symbol/provider, or session
  metadata.
- The 2 library-source rows; they are corpus-denominator hygiene.
- `0367`; it is correct historical silence for a realtime-only visual pattern.
- `0339`; it is a timeout/scale probe.
