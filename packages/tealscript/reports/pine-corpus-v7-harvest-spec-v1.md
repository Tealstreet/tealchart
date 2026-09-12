> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Corpus v7 Harvest Spec v1

Date: 2026-09-11

This report classifies the 75 official Pine v6 members that
`pine-corpus-member-map-v1.md` found in neither pinned corpus sources nor value
vectors. These 75 are the honest v7 harvest spec: a larger GitHub scrape is
unlikely to move them much unless it targets the missing surfaces deliberately.

Basis:

- Official denominator: 861 names from `pine-value-vector-member-map-v1.json`.
- Untouched set: `pine-corpus-member-map-v1.json` `exercisedByNothingMembers`.
- Pinned corpora: v5 `pine-corpus-v5-20260910` and v6
  `pine-corpus-v6-20260911`, 2,000 source files total.

## Result

| Category | Rows | Meaning |
| --- | ---: | --- |
| Trace/host-dependent | 30 | Source references can be harvested, but behavioral/value parity needs provider, chart, symbol, or footprint traces. Added to `PINE_TRACE_REQUIRED_v2.md`. |
| Targeted strategy/backtest harvest | 13 | GitHub personal-project scripts underrepresent report metrics, OCA/risk, liquidation, and trade-comment APIs. |
| Rare API/drawing/math harvest | 29 | Valid locally-verifiable surfaces, but rare in public GitHub Pine unless harvest queries target the namespace/member directly. |
| Chart/screener/symbol-context harvest | 3 | Need scripts written for Pine Screener, left-scale plotting, or exact symbol metadata use. |

No member is reclassified as already exercised. The boundary remains 75/861.

## V7 Harvest Targets

| Member | Why untouched | V7 harvest target |
| --- | --- | --- |
| `array.abs` | Genuinely rare in real Pine; scripts usually loop/map manually or use scalar `math.abs`. | Target array utility/test libraries and examples for `array.abs(`. |
| `array.every` | Rare collection predicate helper; GitHub Pine skews toward loops and imperative checks. | Target utility libraries, validation frameworks, and direct `array.every(` queries. |
| `array.percentile_nearest_rank` | Rare statistical array helper; existing GitHub math repos favor custom quantile code. | Target statistics/quantile/portfolio scripts and direct member query. |
| `box.set_text_font_family` | Newer/formatting-oriented drawing setter, rare in strategy and indicator logic. | Target UI-heavy dashboards, heatmaps, and TradingView-published table/box annotation scripts. |
| `box.set_text_formatting` | Same newer drawing formatting surface; GitHub copies rarely use rich text formatting. | Target scripts demonstrating bold/italic text formatting on boxes. |
| `box.set_text_wrap` | Chart-layout API, not trading logic; rare in GitHub personal indicators. | Target dashboard/panel/annotation scripts using box text wrapping. |
| `box.set_xloc` | Drawing coordinate migration is rare; most scripts choose xloc at construction. | Target drawing-editing examples and support/resistance tools that switch time/index coordinates. |
| `chart.point.copy` | Rare chart-point convenience; most scripts allocate new points directly. | Target polyline/ZigZag/drawing-library sources using chart-point object mutation. |
| `display.pine_screener` | Chart context not represented by GitHub indicator/strategy corpora. | Harvest Pine Screener-specific scripts or official screener examples, not ordinary chart overlays. |
| `dividends.future_amount` | Trace/host-dependent future corporate-action provider data. | Source references may come from earnings/dividend calendar scripts, but parity requires provider trace. |
| `dividends.future_ex_date` | Trace/host-dependent future corporate-action provider data. | Target corporate-action calendar scripts for source coverage; require provider trace for behavior. |
| `dividends.future_pay_date` | Trace/host-dependent future corporate-action provider data. | Target dividend calendar scripts; require provider trace for exact values/timing. |
| `earnings.future_period_end_time` | Trace/host-dependent future earnings provider data. | Target earnings-calendar scripts; require provider trace for exact period-end timing. |
| `footprint.buy_volume` | Trace/host-dependent footprint row data absent from GitHub chart-only corpora. | Target TradingView footprint/volume-delta scripts and collect footprint-provider trace. |
| `footprint.delta` | Trace/host-dependent footprint row data. | Target footprint/delta scripts; require provider row trace. |
| `footprint.get_row_by_price` | Trace/host-dependent row lookup over provider footprint rows. | Target footprint profile scripts; require row data trace with price levels. |
| `footprint.poc` | Trace/host-dependent footprint point-of-control data. | Target footprint/volume-profile scripts; require provider trace. |
| `footprint.rows` | Trace/host-dependent footprint row collection. | Target scripts iterating footprint rows; require provider trace. |
| `footprint.sell_volume` | Trace/host-dependent footprint row data. | Target footprint/delta scripts; require provider row trace. |
| `footprint.total_volume` | Trace/host-dependent footprint row data. | Target footprint profile scripts; require provider row trace. |
| `footprint.vah` | Trace/host-dependent value-area-high footprint data. | Target footprint value-area scripts; require provider trace. |
| `footprint.val` | Trace/host-dependent value-area-low footprint data. | Target footprint value-area scripts; require provider trace. |
| `label.set_text_font_family` | Newer/formatting-oriented drawing setter, rare in GitHub indicator logic. | Target UI/annotation scripts and direct member query. |
| `label.set_text_formatting` | Rich label text formatting is rare outside UI demo scripts. | Target label formatting demos and dashboard annotations. |
| `label.style_cross` | Rare style constant; most scripts use arrows, label_up/down, circles, or text labels. | Target marker-style demo scripts or direct `label.style_cross` query. |
| `line.set_first_point` | Newer point-object line mutation; most scripts use `line.set_xy1`. | Target chart-point drawing examples and ZigZag/polyline libraries. |
| `line.set_second_point` | Same point-object mutation surface as `line.set_first_point`. | Target chart-point drawing examples and line mutation demos. |
| `math.rphi` | Genuinely rare constant; most public scripts hardcode Fibonacci/golden-ratio values. | Target mathematical/Fibonacci library scripts and direct `math.rphi` query. |
| `matrix.eigenvalues` | Rare linear-algebra API; GitHub Pine mostly uses matrix storage, not decomposition. | Target PCA/regression/portfolio optimization scripts and direct member query. |
| `matrix.eigenvectors` | Rare linear-algebra API, paired with eigenvalue use. | Target PCA/covariance/portfolio scripts and direct member query. |
| `matrix.is_identity` | Rare matrix predicate helper, mostly useful in matrix test/demo code. | Target matrix tutorial/test suites. |
| `matrix.is_square` | Rare predicate; most scripts know dimensions from construction. | Target matrix utility libraries. |
| `matrix.is_symmetric` | Rare predicate; useful in covariance/eigen examples. | Target covariance/PCA/linear algebra scripts. |
| `matrix.median` | Rare aggregate over matrix contents. | Target matrix statistics examples and direct member query. |
| `matrix.pinv` | Rare pseudoinverse API; likely used in regression/least-squares/PCA scripts. | Target advanced regression, Kalman, and portfolio optimization scripts. |
| `matrix.remove_col` | Rare structural mutation; existing corpus has row/removal variants but not columns. | Target matrix manipulation demos and direct `matrix.remove_col` query. |
| `matrix.sum` | Rare aggregate; public scripts more often use arrays for reductions. | Target matrix statistics examples. |
| `matrix.swap_columns` | Rare structural mutation, mostly test/demo code. | Target matrix manipulation tutorials. |
| `plot.linestyle_solid` | Newer/less common plot style constant; scripts usually omit solid because it is default. | Target plotting-style demos and direct member query. |
| `request.footprint` | Trace/host-dependent provider request surface. | Harvesting can find footprint scripts, but behavior requires footprint-provider trace. |
| `request.quandl` | Trace/host-dependent external data provider surface, and increasingly rare in newer Pine. | Target older Quandl/economic-data scripts; require provider trace for values. |
| `scale.left` | Chart-display context underrepresented by GitHub; most scripts use default/right/none. | Target overlay/layout scripts that deliberately place scales on the left. |
| `strategy.closedtrades.entry_comment` | GitHub strategies rarely inspect detailed trade ledgers/comments. | Target broker-emulator/reporting validation scripts, strategy analytics dashboards, and PineForge-like probes. |
| `strategy.closedtrades.first_index` | Report-ledger boundary API, rarely used in personal strategies. | Target trade-ledger analytics and closed-trade iteration examples. |
| `strategy.closedtrades.max_drawdown_percent` | Strategy Tester metric corner; source references need trades with drawdown state. | Target strategy performance dashboards and dedicated broker-emulator probes. |
| `strategy.closedtrades.max_runup_percent` | Same closed-trade metric corner as drawdown percent. | Target strategy performance dashboards and broker-emulator probes. |
| `strategy.direction.all` | Risk-direction enum less common than long-only/short-only examples. | Target `strategy.risk.allow_entry_in()` examples covering all directions. |
| `strategy.direction.short` | Short-only risk-direction enum underrepresented by GitHub long-biased strategies. | Target short-only/risk-gate examples. |
| `strategy.margin_liquidation_price` | Margin/liquidation API needs margin-enabled strategy context. | Target leveraged strategy and margin-call examples; may also need Strategy Tester trace for exact liquidation behavior. |
| `strategy.oca.none` | OCA enum corner; most scripts use cancel/reduce or omit OCA. | Target order-grouping/OCA tutorial scripts and direct member query. |
| `strategy.opentrades.commission` | Open-trade ledger metric, rare outside reporting dashboards. | Target strategy analytics scripts iterating `strategy.opentrades.*`. |
| `strategy.opentrades.entry_comment` | Open-trade comment ledger API, rare outside reporting dashboards. | Target trade-ledger dashboards and broker-emulator probes. |
| `strategy.opentrades.max_drawdown_percent` | Open-trade metric corner requiring active trade path. | Target strategy performance dashboards and synthetic open-trade probes. |
| `strategy.opentrades.max_runup_percent` | Same open-trade metric corner as drawdown percent. | Target strategy performance dashboards and synthetic open-trade probes. |
| `strategy.risk.max_cons_loss_days` | Risk rule uncommon in personal GitHub strategies. | Target risk-management examples and Strategy Tester risk-rule probes. |
| `syminfo.minmove` | Specific symbol-metadata field; most scripts use `syminfo.mintick` instead. | Target symbol-metadata/demo scripts and futures/price-format examples. |
| `syminfo.recommendations_buy` | Trace/host-dependent analyst recommendation metadata. | Harvesting can find recommendation dashboards, but exact values require host symbol-metadata trace. |
| `syminfo.recommendations_buy_strong` | Trace/host-dependent analyst recommendation metadata. | Target recommendation dashboards; require host metadata trace. |
| `syminfo.recommendations_date` | Trace/host-dependent analyst recommendation timestamp. | Target recommendation dashboards; require host metadata trace. |
| `syminfo.recommendations_hold` | Trace/host-dependent analyst recommendation metadata. | Target recommendation dashboards; require host metadata trace. |
| `syminfo.recommendations_sell` | Trace/host-dependent analyst recommendation metadata. | Target recommendation dashboards; require host metadata trace. |
| `syminfo.recommendations_sell_strong` | Trace/host-dependent analyst recommendation metadata. | Target recommendation dashboards; require host metadata trace. |
| `syminfo.recommendations_total` | Trace/host-dependent analyst recommendation metadata. | Target recommendation dashboards; require host metadata trace. |
| `text.format_none` | Newer rich-text formatting enum, rarely needed except formatting demos. | Target text-formatting demos, label/box/table rich-text scripts. |
| `text.wrap_auto` | Layout enum mostly used in UI-heavy drawing scripts. | Target dashboard/box/table annotation scripts. |
| `text.wrap_none` | Layout enum mostly used in UI-heavy drawing scripts. | Target dashboard/box/table annotation scripts. |
| `volume_row.buy_volume` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `volume_row.delta` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `volume_row.down_price` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `volume_row.has_buy_imbalance` | Trace/host-dependent footprint row object data. | Target footprint imbalance scripts; require provider row trace. |
| `volume_row.has_sell_imbalance` | Trace/host-dependent footprint row object data. | Target footprint imbalance scripts; require provider row trace. |
| `volume_row.sell_volume` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `volume_row.total_volume` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `volume_row.up_price` | Trace/host-dependent footprint row object data. | Target footprint row scripts; require provider row trace. |
| `weekofyear` | Real but rare calendar variable; day/month/year dominate public scripts. | Target seasonal/calendar scripts, weekly dashboards, and direct member query. |

## Members Moved To Trace Register

The following 30 can be referenced by a source corpus, but harvesting source
references cannot settle their behavior because the value comes from provider,
host symbol metadata, or footprint row state:

- Corporate/fundamental futures: `dividends.future_amount`,
  `dividends.future_ex_date`, `dividends.future_pay_date`,
  `earnings.future_period_end_time`.
- Footprint request and rows: `request.footprint`, `footprint.buy_volume`,
  `footprint.delta`, `footprint.get_row_by_price`, `footprint.poc`,
  `footprint.rows`, `footprint.sell_volume`, `footprint.total_volume`,
  `footprint.vah`, `footprint.val`, `volume_row.buy_volume`,
  `volume_row.delta`, `volume_row.down_price`,
  `volume_row.has_buy_imbalance`, `volume_row.has_sell_imbalance`,
  `volume_row.sell_volume`, `volume_row.total_volume`, `volume_row.up_price`.
- External/provider metadata: `request.quandl`,
  `syminfo.recommendations_buy`, `syminfo.recommendations_buy_strong`,
  `syminfo.recommendations_date`, `syminfo.recommendations_hold`,
  `syminfo.recommendations_sell`, `syminfo.recommendations_sell_strong`,
  `syminfo.recommendations_total`.

## Practical Harvest Guidance

Do not spend v7 budget on another broad GitHub scrape first. Target by surface:

- TradingView public scripts and official examples for footprint,
  recommendation, screener, and rich drawing/text formatting APIs.
- PineForge-like broker-emulator probes for the 13 strategy report/risk/OCA
  members.
- Direct GitHub/code-search queries for rare exact member names, especially
  `matrix.*`, `array.*`, `box.set_text_*`, `line.set_*_point`, and
  `chart.point.copy`.
- Calendar/seasonality and symbol-metadata scripts for `weekofyear`,
  `syminfo.minmove`, `scale.left`, and `display.pine_screener`.

Where this report says trace/host-dependent, source harvesting is still useful
for parser/semantic shape coverage, but it is not a substitute for the trace
register.
