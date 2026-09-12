> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

SUPERSEDED: the archived-reference comparison that produced this dispatch was invalidated by the current-current rerun in `external-pine-corpus-v5-output-differential-v1.md`. True current-current divergences are 0.

Archived-reference divergences: strategy 94, plots 31, drawings/tables 21, alerts 5, profile 3, logs 0.

# External Pine Corpus v5 Output Differential New Divergence Dispatch v1

## Scope

- Corpus: fixed v5 corpus at `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`
- Full-output report: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/value-differential/report-260c8cf9c0-full-output.json`
- Prior plot-only report: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/value-differential/report-51fad7bbde.json`
- New rows: 154 rows that mismatch in the full-output report and were not mismatched in the prior plot-only report.
- Interpretation: these are differential findings between the archived interpreter execution path and the current compiled execution path. A differential proves at least one path is wrong; ownership is listed only where the first difference makes the mechanism clear.

## Immediate Handoff: Strategy Ledger

Strategy ledger divergences are the highest-severity new findings. There are 94 new strategy rows:

- 15 rows differ in pending-order counts, equity metrics, or closed-trade numeric state. These can change visible backtest results and should be handed over first.
- 79 rows first differ in intrabar context `symbol` metadata: interpreter records `BTCUSDT`, compiled records `""`. This is still a strategy-output divergence, but the first observed difference is metadata rather than order/fill count.

### Strategy Ledger Groups

| Rank | Cause | Rows | Representative pinned row | Minimal repro target | Ownership |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Intrabar context symbol metadata differs | 79 | `sources/0608__casoon-pine-scripts__reversal_engine_score_strategy.pine` | A strategy that places an entry/exit and records broker intrabar contexts; compare `intrabarContexts[*].symbol`. | Compiled omits the chart symbol in the serialized context; trade-state impact not established from the first diff. |
| 2 | Pending order and equity state differ | 8 | `sources/0660__SammyEnigma-pine-scripts__BBW-RSI-60-Study.pine` | Pending stop/order calls with OCA grouping: `strategy.entry(..., stop=..., oca_name=..., oca_type=strategy.oca.reduce)` plus `strategy.order(...)`. | Unknown; first differences include `_pendingOrderCount` and equity peak/trough state. |
| 3 | Equity summary numeric state differs | 4 | `sources/0887__Leci37-tuisku_Web_selling__RE9DTl8xSG91cl8xVDAwdHVpc2t1ZjQ5ODI1ZTk.pine` | Strategy with `margin_long`/`margin_short` and repeated `strategy.exit(..., loss=..., profit=..., stop=...)` updates. | Unknown; first differences are equity-curve summary fields. |
| 4 | Closed-trade metric numeric/metadata differs | 3 | `sources/0659__SammyEnigma-pine-scripts__BBW-RSI-60-Strategy.pine` | `process_orders_on_close=true` strategy with stop entries and multiple short `strategy.order` calls. | Unknown; first differences are closed-trade `entryPrice`/drawdown-adjacent serialized values. |

Rows:

- Intrabar context symbol metadata: 0608, 0609, 0618, 0619, 0626, 0627, 0636, 0637, 0638, 0639, 0643, 0644, 0645, 0646, 0647, 0649, 0657, 0658, 0661, 0662, 0663, 0664, 0666, 0667, 0668, 0669, 0670, 0671, 0672, 0674, 0675, 0682, 0683, 0685, 0686, 0688, 0689, 0691, 0755, 0756, 0776, 0777, 0790, 0794, 0797, 0799, 0801, 0855, 0860, 0862, 0863, 0864, 0868, 0873, 0874, 0876, 0877, 0878, 0883, 0886, 0892, 0893, 0896, 0914, 0915, 0920, 0922, 0959, 0961, 0962, 0963, 0964, 0965, 0968, 0969, 0970, 0972, 0973, 0975
- Pending order and equity state: 0660, 0676, 0684, 0800, 0806, 0861, 0879, 0967
- Equity summary numeric state: 0887, 0913, 0971, 0974
- Closed-trade metric numeric/metadata: 0659, 0958, 0977

## Alerts

| Rank | Cause | Rows | Representative pinned row | Minimal repro target | Ownership |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Alert rendered-message series timing differs | 4 | `sources/0532__casoon-pine-scripts__anchored_vwap.pine` | `alertcondition(ta.cross(...), message="... {{ticker}} {{interval}}")`; compare `renderedMessages` by bar. | Unknown; one path emits the same alert message on different bars. |
| 2 | Alertcondition identity/order differs | 1 | `sources/0746__TradersPost-pinescript-agents__market-structure-bos-choch.pine` | Multiple `alertcondition` calls with related BOS/CHoCH conditions; compare alert array order and ids. | Unknown; first diff switches `Bullish CHoCH` versus `Bearish BOS`. |

Rows:

- Alert rendered-message timing: 0532, 0761, 0770, 0921
- Alertcondition identity/order: 0746

## Drawings And Tables

| Rank | Cause | Rows | Representative pinned row | Minimal repro target | Ownership |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Drawing/table existence differs | 10 | `sources/0452__everget-tradingview-pinescript-indicators__chart_type_identifier.pine` | Last-bar gated `label.new`, `line.new`, `box.new`, or `table.new` where one path emits an object and the other emits none. | Unknown; first differences are whole-object presence/absence. |
| 2 | Drawing property, persistence, or coordinate differs | 5 | `sources/0576__casoon-pine-scripts__vein_execution.pine` | Persistent drawing handles updated across bars with `line.new`/`box.new` and later mutation. | Unknown; first differences are serialized drawing fields after id canonicalization. |
| 3 | Table/text content differs | 4 | `sources/0524__casoon-pine-scripts__trading_range_state_machine.pine` | `table.cell(...)` dashboard rows with computed text or formatted numeric cells. | Unknown; first differences are table cell content or formatting. |
| 4 | Drawing type/order differs | 2 | `sources/0465__everget-tradingview-pinescript-indicators__gaps_percent_size_distribution.pine` | Mixed labels and lines emitted from the same update pass; compare canonical drawing array order/type. | Unknown; first diff changes object type/order. |

Rows:

- Drawing/table existence: 0452, 0454, 0455, 0458, 0493, 0543, 0712, 0743, 0760, 0992
- Drawing property/persistence/coordinate: 0576, 0826, 0908, 0954, 0983
- Table/text content: 0475, 0524, 0577, 0858
- Drawing type/order: 0465, 0754

## Plots

| Rank | Cause | Rows | Representative pinned row | Minimal repro target | Ownership |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Leading value versus `na` at bar 0 | 16 | `sources/0231__mihakralj-pinescript__smi.pine` | Indicator whose first plotted value depends on seeded TA/history state; compare bar 0. | Unknown; same family as prior warmup/seed divergences. |
| 2 | Plot count differs | 8 | `sources/0089__mihakralj-pinescript__theilu.pine` | Sparse/global plot declarations where one path registers more plot outputs than the other. | Unknown; structure-level, not just value-level. |
| 3 | Warmup numeric seed differs | 3 | `sources/0391__mihakralj-pinescript__kvo.pine` | Early-bar oscillator/volume formula where compiled emits `0` and interpreter emits a computed value. | Unknown. |
| 4 | Single bar-0 numeric scale/formula differs | 1 | `sources/0390__mihakralj-pinescript__iii.pine` | Intraday intensity-style formula at bar 0; compare raw numeric scale. | Unknown. |
| 5 | Warmup `na` versus numeric differs | 1 | `sources/0563__casoon-pine-scripts__mfi_advanced.pine` | Multi-plot MFI dashboard where one warmup series emits `na` and the other emits `0`. | Unknown. |
| 6 | Later value versus `na` differs | 1 | `sources/0762__MinorLeopard-Indicator__Indicator-FalseRemovals-.pine` | Conditional plot that becomes missing on one path after warmup. | Unknown. |
| 7 | Plot values length differs | 1 | `sources/0945__haydarkadioglu-tradingview-indicators__trend_strength.pine` | Plot series truncated to 128 values on one path versus 160 on the other. | Unknown; length-level, not numeric tolerance. |

Rows:

- Leading value versus `na` at bar 0: 0231, 0498, 0512, 0536, 0546, 0552, 0555, 0556, 0557, 0586, 0593, 0607, 0692, 0723, 0738, 0819
- Plot count differs: 0089, 0091, 0092, 0467, 0497, 0554, 0588, 0985
- Warmup numeric seed differs: 0391, 0395, 0404
- Single bar-0 numeric scale/formula differs: 0390
- Warmup `na` versus numeric differs: 0563
- Later value versus `na` differs: 0762
- Plot values length differs: 0945

## Profile Signals

| Rank | Cause | Rows | Representative pinned row | Minimal repro target | Ownership |
| ---: | --- | ---: | --- | --- | --- |
| 1 | Runtime error/profile count differs | 3 | `sources/0673__SammyEnigma-pine-scripts__pivot-popints.pine` | Script that records runtime errors in one path but not the other; compare `profile.errors`. | Unknown; diagnostic-only unless the swallowed/runtime errors also affect visible output. |

Rows: 0673, 0820, 0984

## Logs

No new log divergences were found.
