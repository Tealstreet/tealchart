# Pine Trace-Required Register v2

This revision splits the named rolling `na` blind spot from
`pine-rolling-na-policy-audit-v1.md` into behaviors derivable from an explicit
Pine composition and behaviors that still need a reference trace. It
supersedes the `ta.*` row in `PINE_TRACE_REQUIRED_v1.md` for this question.

Primary authority is the [Pine v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/).
The manual's per-entry examples and remarks are evidence; an algebraic
similarity inferred by TealScript is not.

## Result

| Bucket | Count | Meaning |
| --- | ---: | --- |
| Derivable by documented composition, now covered by vectors | 7 | The reference gives an equivalent expression in terms of established primitives, and the value-vector coverage snapshot at the time (generation v112; the series is generated output and is no longer committed — regenerate with `pine:value-vectors`) now covers leading `na`, interior holes/recovery, all-`na`, and denominator-zero edges where applicable. |
| Genuinely primitive or composition incomplete | 32 | No reference-defined composition settles the relevant seed, hole, or recovery behavior. Keep trace-required. |

The source audit labels this bucket as 40, but its enumerated names contain 39
entries. This register counts names rather than the stale headline: 7 + 32 =
39. The discrepancy is recorded so a future audit does not silently invent or
lose one function.

The split is about missing-value behavior, not whether TealScript has an
implementation or whether ordinary clean-input vectors pass.

## Dynamic Invalid-Input Addendum

`pine-input-domain-map-v1` records two input-domain behaviors as
trace-undetermined rather than expected-red runtime gaps:

| Surface | Documented valid domain | Why trace is still required |
| --- | --- | --- |
| `color.rgb()` dynamic RGB components | RGB channels are documented in the 0-255 range. | The audited TradingView color docs state the valid range, but do not state whether dynamic invalid runtime inputs reject, clamp, or follow another behavior. TealScript currently clamps and surfaces a runtime approximation; that is an implementation choice until a trace settles the invalid-input consequence. |
| Legacy `bgcolor(transp=...)` dynamic transparency | Transparency is documented in the 0-100 range. | The audited docs state the valid range, but do not state the runtime consequence for dynamic invalid values. TealScript's compatibility behavior remains undetermined rather than a known rejection target. |
| `table.new()` dynamic invalid columns/rows | The table docs require a position plus a number of columns and rows; valid examples use positive integer dimensions. | The docs do not state the runtime consequence for dynamic `na`, non-finite, zero, negative, or fractional dimensions. TealScript currently falls back to one column/row and reports `table.new.*-fallback` in `RuntimeProfile.runtimeApproximations`; the exact TradingView invalid-input behavior needs a trace. |

A documented valid-input range is not enough to assert a specific invalid-input
behavior. Future expected-red vectors for these surfaces need TradingView
evidence for the invalid case, not just the range.

## Drawing/Map Runtime Behavior Addendum

The 2026-09-11 approximation-surface audit brought `src/runtime/maps.ts` and
`src/runtime/builtins/drawings.ts` into derived scope. The sites below are
Pine-facing behaviors whose exact consequence is not settled by the v6 docs
alone. Do not replace them with expected-red vectors or fixes without a
TradingView trace or a published script that proves the behavior.

| Surface | Current TealScript behavior | Why trace is still required | Evidence that settles it |
| --- | --- | --- | --- |
| `map.put()` return value | Returns the previous value for an existing key and `na` for a new key. | The map docs specify insertion/replacement and the reference signature returns a value type, but the audited prose does not specify whether the return is the old value, the inserted value, or another sentinel. | Trace assigning `map.put()` on new and existing keys to plots/labels for each supported key/value type. |
| Dynamic invalid/non-finite map keys | Rejects non-finite numeric keys and non-value-type keys with a Pine-facing runtime error. | The docs restrict keys to value types and exclude reference IDs, but the exact runtime behavior and message for dynamic `na`/non-finite keys is not specified. | Trace using dynamic `na`, `Infinity` where representable, and reference/collection values as keys. |
| Table frame/border width invalid input | `na`, missing, or non-finite widths become `0`; finite values are truncated and clamped to `0..100`. | The table docs define frame/border width parameters but do not state invalid-input consequences or a runtime range. | Trace for `table.new()` and setters with dynamic `na`, negative, fractional, and large widths. |
| `table.merge_cells()` reversed endpoints | Normalizes start/end columns and rows with `min/max`; identical existing merges are idempotent and distinct overlaps error. | The docs mention selective clearing and cell population, but do not settle whether reversed merge endpoints normalize or reject. | Trace for reversed, identical repeated, and overlapping merge ranges. |
| Drawing optional booleans with dynamic `na` | `force_overlay`, `curved`, and `closed` use JavaScript truthiness if such values reach runtime. | Semantic checks reject wrong static types, but the exact dynamic `na` behavior for these bool parameters is not established here and Pine version rules are bool-sensitive. | Declared-version traces for dynamic `na` bool arguments on label/line/box/polyline/table constructors. |
| Invalid drawing handles and copy/setter calls | Invalid or deleted handles generally no-op for setters/deleters and return `na` for getters/copy helpers. | The drawing docs document object IDs and mutation APIs, but the audited pages do not define every invalid/deleted-handle consequence. | Trace over deleted and `na` handles for label/line/box/linefill/polyline/table getters, setters, copy, and delete. |
| `polyline.new()` invalid or sparse point arrays | Filters non-`chart.point` entries and returns `na` when no valid points remain. | The docs require an array of `chart.point` objects and describe coordinate selection, but do not settle runtime behavior for arrays containing `na` or invalid elements. | Trace with arrays containing valid points, `na` points, mixed invalid entries, and empty arrays. |
| `chart.point.now()` invalid or omitted price | Uses current close when the price argument is invalid or omitted. | The reference examples pass a price argument; the audited docs do not specify fallback behavior for omitted/dynamic invalid price. | Trace `chart.point.now()` with omitted, `na`, and non-finite dynamic price, then consume via line/box/label coordinates. |
| `chart.point.new/from_index/from_time` invalid fields | Stores invalid/non-finite fields as `null`; `index` is truncated to an integer. | Integer bar-index coordinates are documented, but exact runtime behavior for dynamic invalid/fractional fields is not specified. | Trace point constructors with dynamic `na`, fractional index, and non-finite time/index/price consumed by drawings and copy. |

## Derivable

These entries have an explicit reference example or definition. The stated
derivation is intentionally narrow: it does not claim any unstated warm-up or
provider behavior.

| Name | Reference-defined composition | Derived consequence |
| --- | --- | --- |
| `ta.iii` | The Reference Manual example defines it as `((2 * close - high - low) / (high - low)) * volume`. | It has no hidden rolling window or accumulator. Missing inputs propagate through the documented arithmetic expression; its zero-denominator result follows ordinary Pine arithmetic semantics. |
| `ta.nvi` | The Reference Manual includes an equivalent implementation with an initial `1.0`, prior-value selection, a volume-decrease branch, and otherwise the prior value. | The state seed, hold-on-no-change branch, and source-hole behavior follow the shown implementation. No separate undocumented rolling-window rule is needed. |
| `ta.obv` | The Reference Manual example defines it as `ta.cum(math.sign(ta.change(close)) * volume)`. | Its state and missing-value policy are the composition of established `ta.cum`, `ta.change`, `math.sign`, multiplication, and the documented Pine expression rules. |
| `ta.pvi` | The Reference Manual includes an equivalent implementation with an initial `1.0`, prior-value selection, a volume-increase branch, and otherwise the prior value. | The state seed, hold-on-no-change branch, and source-hole behavior follow the shown implementation. |
| `ta.pvt` | The Reference Manual example defines it as `ta.cum((ta.change(close) / close[1]) * volume)`. | Its accumulator behavior is inherited from `ta.cum`; input holes and the first prior-close dependency are not a new `pvt` policy. |
| `ta.wad` | The Reference Manual example defines true high/low with `math.max`/`math.min`, momentum with `ta.change(close)`, then accumulates gain with `ta.cum`. | The missing-value behavior is the composition of those documented primitives and arithmetic branches. |
| `ta.wvad` | The Reference Manual example defines it as `(close - open) / (high - low) * volume`. | It has no hidden state or rolling window; missing inputs and zero-denominator behavior follow the documented expression semantics. |

These seven expectations have been converted into justified value-vector cases
in `packages/tealscript/scripts/run-pine-value-vectors.ts` and are covered by
the value-vector coverage snapshot at the time (generation v112; the series is generated output and is no longer committed — regenerate with `pine:value-vectors`). They must not be used to infer
behavior for similarly named functions whose entries do not provide the same
definition.

## Genuinely Primitive Or Incomplete

The following 32 remain trace-required. Each is listed with the reason a
formula, name, or implementation resemblance is insufficient.

| Name | Why composition does not settle the policy | Evidence required |
| --- | --- | --- |
| `ta.accdist` | The entry names the indicator but does not define its exact state or hole handling as a composition. | Per-bar vector with leading and interior holes. |
| `ta.adx` | The entry does not specify whether its smoothing, seed, and holes are inherited from `ta.dmi` or another exact chain. | Vector including first valid bar and holes, plus intermediate state if available. |
| `ta.alma` | The Gaussian formula does not settle warm-up, floor handling, or holes. | Long vector with holes and explicit first-valid index. |
| `ta.bar_index` | This is a series metadata variable, not a composed rolling calculation. | Historical and realtime barset trace. |
| `ta.bb` | The band description does not fully define the `na` policy of basis, deviation, and tuple output as a reference composition. | Tuple vector with holes and recovery. |
| `ta.bbw` | Width and basis are not specified as an exact composition with complete missing-value rules. | Vector covering zero basis and holes. |
| `ta.cmo` | The entry does not define its smoothing and initialization chain sufficiently to derive holes. | Vector with leading/interior holes and long recovery. |
| `ta.cross` | Boolean crossing over prior bars has no complete reference rule for `na` operands. | Truth-table trace with holes in both operands. |
| `ta.crossover` | The comparison definition does not settle missing-value propagation over the prior-bar test. | Truth-table trace with current/prior holes. |
| `ta.crossunder` | The comparison definition does not settle missing-value propagation over the prior-bar test. | Truth-table trace with current/prior holes. |
| `ta.cum` | The accumulator's handling of an interior missing source is itself the primitive under question. | Accumulator vector with holes before and after seed. |
| `ta.dema` | The EMA identity does not settle the chained EMA warm-up or intermediate-hole state. | Vector exposing both EMA stages. |
| `ta.dmi` | The directional smoothing and ADX tuple initialization are not specified as one exact reusable composition. | Tuple vector with multi-hole inputs and first-valid bars. |
| `ta.hma` | The Hull construction does not settle the warm-up and nested weighted-window hole policy. | Long vector with holes across each nested window. |
| `ta.kc` | The Keltner channel entry does not specify the exact EMA/range composition and missing-value propagation. | Tuple vector with source and range holes. |
| `ta.kcw` | Channel width inherits unresolved `ta.kc` and basis edge behavior. | Vector with zero basis and holes. |
| `ta.kst` | The multi-stage ROC/smoothing chain is not defined with enough seed detail. | Vector exposing each component's warm-up. |
| `ta.macd` | The public primer shows a conceptual equivalent, but the Reference Manual entry does not specify all tuple-stage warm-up and hole rules. | Tuple vector with holes and divergent stage warm-ups. |
| `ta.mfi` | The money-flow sign, window, and zero-denominator behavior are not a complete reference composition. | Vector with zero flow and holes. |
| `ta.pivot_point_levels` | Pivot aggregation and developing/anchor behavior are not reducible to a documented primitive chain. | Session/day boundary trace. |
| `ta.pivothigh` | Confirmation offset and missing-source behavior are not fully compositional. | Vector across candidate holes and confirmation bars. |
| `ta.pivotlow` | Confirmation offset and missing-source behavior are not fully compositional. | Vector across candidate holes and confirmation bars. |
| `ta.rci` | Ranking ties, missing values, and warm-up are not defined by a reusable primitive composition. | Vector with ties and holes. |
| `ta.rsi` | The formula names average gains/losses but does not specify the full seed and hole policy as an exact reference composition. | Vector with zero losses and holes. |
| `ta.sar` | Its state machine and reversal initialization are primitive. | Long vector with reversals and holes. |
| `ta.stoch` | Highest/lowest range and zero-range behavior are not specified as a complete composition. | Vector with flat ranges and holes. |
| `ta.supertrend` | Direction state, ATR seed, and reversal rules are a state machine rather than a fully defined composition. | Long vector with reversals and holes. |
| `ta.swma` | Fixed weights are known, but partial-window and hole behavior are not established by composition alone. | Full and partial windows with holes. |
| `ta.tema` | Like DEMA, chained EMA identity does not settle all intermediate warm-up and hole behavior. | Vector exposing all three EMA stages. |
| `ta.tsi` | Double smoothing and momentum normalization do not specify exact chained seed behavior. | Long vector with holes and zero denominator. |
| `ta.vwap` | The default source is documented as `hlc3`, but anchor resets, bands, and missing-volume behavior are not fully compositional. | Anchor/session vector with missing volume. |
| `ta.wpr` | The range formula does not settle zero-range and missing-window behavior. | Flat-range and hole vector. |
The derivation table is deliberately limited to missing-value and denominator
edges derivable from the documented compositions. It does not settle any
unstated provider, session, realtime, or broker-emulator behavior.

## Invariant Coverage

the value-vector coverage snapshot at the time (generation v113; regenerate with `pine:value-vectors`) carries 45 invariant vectors over a subset
of the 32 still trace-required entries: oscillator bounds, `ta.dmi` component
bounds, band/channel tuple coherence, `ta.bbw` zero-basis behavior, and pivot
confirmation timing, plus cross-family coherence, accumulator monotonicity,
weighted-average bounds, MACD tuple arithmetic, Supertrend direction domain, and
VWAP running-range bounds. These vectors do not settle exact seed, hole, or
recovery values and therefore remove zero entries from this register. The two
former `ta.mfi` bound failures are fixed at current HEAD; coverage v113 has no
MFI expected-red invariant cases.

## Handoff Rule

The seven derivations above are no longer in the trace-required queue. Future
entries leave this register only when a vector tests the stated derived rule
and the current runtime output matches the independent oracle. Do not turn a
formula that merely looks similar into a derivation.

## Corpus v6 Trace/Host Addendum

The 2026-09-11 corpus v6 remaining-cause audit found 18 trace, host, or
request-context rows that are not represented by the `ta.*` missing-value
register above. They are added here so the trace ask is not understated while
Sam decides what evidence to acquire.

| Surface | Corpus rows | Why trace/host evidence is still required | Evidence that settles it |
| --- | --- | --- | --- |
| `strategy(calc_on_order_fills=true)` | `0712`, `0718`, `0746`, `0783`, `0894`, `0897`, `0966` | Fill-triggered re-entry adds executions whose ordering, rollback, state mutation, and drawing side effects are not derivable from ordinary historical bar execution. | Strategy trace marking each execution reason (`bar`, `order_fill`, `tick`) with order events, position/equity state, and emitted chart/log outputs. |
| `strategy(fill_orders_on_standard_ohlc=true)` | `0706`, `0710`, `0745`, `0772`, `0773`, `0821` | Fill prices depend on TradingView's standard-OHLC substitution for non-standard charts, which requires host-supplied standard bars alongside the visible chart bars. | Non-standard-chart strategy trace containing visible bars, corresponding standard OHLC bars, order events, and fills. |
| `strategy(risk_free_rate=...)` report metrics | `0758`, `0901` | The argument affects Strategy Tester report metrics such as Sharpe/Sortino rather than ordinary script output; exact report parity needs host report traces. | Strategy Tester report trace with risk-free rate, closed trades, returns, and risk-adjusted metric outputs. |
| `request.security_lower_tf()` invalid/equal/higher timeframe refusal context | `0266`, `0615`, `0849` | The refusal is context-dependent on chart timeframe, requested timeframe, dynamic request mode, and provider availability. | Request trace including chart timeframe, requested timeframe string, `ignore_invalid_timeframe`, returned arrays or runtime refusal, and provider intrabars. |

## Corpus v5 Dispatch Addendum

The 2026-09-11 v5 dispatch routing audit found five trace, host, or
request-context rows in the 65-row stale dispatch list that are not represented
by the deterministic `ta.*` register. They are recorded here so the evidence
ask does not disappear when the implementation-owned rows are routed elsewhere.

| Surface | Corpus rows | Why trace/host evidence is still required | Evidence that settles it |
| --- | --- | --- | --- |
| `strategy(calc_on_order_fills=true)` | `0496`, `0610`, `0611` | Same fill-triggered re-entry surface as the v6 corpus addendum: execution ordering, state mutation, drawing side effects, and fills are not derivable from ordinary historical bars. | Strategy trace marking each execution reason (`bar`, `order_fill`, `tick`) with order events, position/equity state, and emitted chart/log outputs. |
| `request.security_lower_tf()` returned-array/refusal context | `0529`, `0984` | The result depends on chart timeframe, requested lower timeframe, `ignore_invalid_timeframe`, host/provider intrabars, and whether the request should return empty arrays or a runtime refusal. | Request trace including chart timeframe, requested timeframe string, `ignore_invalid_timeframe`, returned arrays or runtime refusal, and provider intrabars. |

## Corpus v7 Harvest-Spec Host Addendum

The 2026-09-11 corpus member map found 75 official members exercised by neither
the pinned v5/v6 source corpora nor the value-vector suite. Thirty of those can
be harvested for parser/semantic source-shape coverage, but their behavioral
parity cannot be settled by source harvesting because the values come from
provider, host symbol metadata, or footprint row data.

| Surface | Members | Why trace/host evidence is still required | Evidence that settles it |
| --- | --- | --- | --- |
| Future corporate actions and earnings | `dividends.future_amount`, `dividends.future_ex_date`, `dividends.future_pay_date`, `earnings.future_period_end_time` | These are forward-looking provider fields whose availability, timestamp alignment, currency/market scope, and missing-value behavior are host data, not source semantics. | Provider trace for symbols with future dividends/earnings, including chart bars, event timestamps, field values, currencies where applicable, and missing-value behavior before/after the event. |
| Footprint request and aggregate fields | `request.footprint`, `footprint.buy_volume`, `footprint.delta`, `footprint.get_row_by_price`, `footprint.poc`, `footprint.rows`, `footprint.sell_volume`, `footprint.total_volume`, `footprint.vah`, `footprint.val` | Footprint values depend on provider intrabar/order-flow rows, price-row bucketing, value-area calculation, and chart/session context. A harvested source can call the APIs but cannot establish expected row values. | Footprint-provider trace with chart symbol/timeframe/session, row prices, buy/sell/total volume, delta, value area, POC, and `get_row_by_price` lookups. |
| Footprint row object fields | `volume_row.buy_volume`, `volume_row.delta`, `volume_row.down_price`, `volume_row.has_buy_imbalance`, `volume_row.has_sell_imbalance`, `volume_row.sell_volume`, `volume_row.total_volume`, `volume_row.up_price` | These are per-row provider fields derived from the same footprint row feed and imbalance policy. | Same footprint-provider trace, preserving individual row objects and imbalance flags. |
| External/provider datasets and analyst recommendations | `request.quandl`, `syminfo.recommendations_buy`, `syminfo.recommendations_buy_strong`, `syminfo.recommendations_date`, `syminfo.recommendations_hold`, `syminfo.recommendations_sell`, `syminfo.recommendations_sell_strong`, `syminfo.recommendations_total` | Quandl values and analyst recommendation counts/dates are host/provider metadata. A script corpus can prove the names exist but not the provider value contract. | Provider trace for known symbols/datasets with request arguments, chart bars, returned values, recommendation counts/date fields, and missing/unavailable-symbol behavior. |
| Provider-backed symbol metadata with incomplete no-data contract | `syminfo.pricescale`, `syminfo.target_price_average`, `syminfo.target_price_date`, `syminfo.target_price_estimates`, `syminfo.target_price_high`, `syminfo.target_price_low`, `syminfo.target_price_median` | The v6 chart-information reference defines the meaning of these dataset/provider fields, but does not specify what a script receives when the host supplies no such metadata. Do not infer a numeric default from TealScript's synthetic context. | Provider trace for symbols with and without price-scale/analyst-target metadata, including chart symbol, requested symbol where applicable, host-supplied syminfo payload, and the value observed for each field. |
| Host chart/session metadata with incomplete no-data contract | `chart.is_kagi`, `chart.is_linebreak`, `chart.is_pnf`, `chart.is_range`, `chart.is_renko`, `session.islastbar_regular`, `session.ispostmarket` | The v6 chart-information reference defines these booleans from the active chart type or session classification, but does not specify the values when a host omits chart type or session metadata. TealScript currently supplies a synthetic standard chart and inferred session model; that must not be cited as reference evidence. | Host trace with omitted chart/session metadata and with explicit standard/non-standard chart and regular/extended sessions, recording the observed values on complete and truncated intraday datasets. |
