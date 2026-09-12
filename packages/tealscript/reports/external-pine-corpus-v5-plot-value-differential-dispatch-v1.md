> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Plot Value Differential Dispatch v1

## Input

- Source report: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/value-differential/report-51fad7bbde.json`
- Harness: `packages/tealscript/scripts/measure-corpus-plot-value-differential.ts`
- Corpus: fixed v5 corpus, 1,000 pinned scripts
- Comparable rows: 779
- Divergent rows: 130
- Compared paths: archived interpreter at `18854ba662de46ef42461f060546432f9aa78861` vs current compiled at `51fad7bbde7e2317c16370ed734461906d871cfd`

The current tree is compiled-only. This dispatch uses the archived interpreter
only as a differential reference; it does not mean the product still has two
live paths.

## Root-Cause Ranking

| Rank | Cause | Rows | Severity | Ownership |
| ---: | --- | ---: | --- | --- |
| 1 | TA warmup / leading-`na` policy differs | 59 | wrong plot values | Mixed: known compiled-correct for `ta.highest`/`ta.lowest`; trace required for the rest |
| 2 | UDF local persistent/history state differs | 35 | wrong plot values | Trace required |
| 3 | Request-context value state differs | 16 | wrong plot values | Trace required |
| 4 | Structural plot count differs | 10 | missing or extra plot series | Trace required per row |
| 5 | Unclassified arithmetic/state differs | 6 | wrong plot values | Trace required |
| 6 | Dynamic / non-identifier history differs | 2 | wrong plot values | Trace required |
| 7 | Plot value series is truncated | 1 | missing plot values | Compiled likely wrong by `plot(offset=...)` semantics |
| 8 | Collection-backed state differs | 1 | wrong plot values | Trace required |

Severity note: value differences are wrong numbers. Structural `plots.length` and
`values.length` differences are more severe because one path is not emitting a
series or is emitting only part of it.

## 1. TA Warmup / Leading-`na` Policy Differs — 59

Representative pinned row:
`sources/0026__mihakralj-pinescript__midpoint.pine`

First difference:
`plot[0].values[0]`: interpreter `100`, compiled `na`.

Minimal repro:

```pine
//@version=6
indicator("ta extrema warmup")
plot((ta.highest(close, 14) + ta.lowest(close, 14)) * 0.5)
```

Construct: builtins with lookback windows or seeded TA state emit different
values before their window/state is fully formed. The largest visible case is
`ta.highest`/`ta.lowest`; TradingView documents these as fixed-length window
functions, and this branch already adjudicated their first `length - 1` bars as
`na`, so the archived interpreter is wrong for those rows. Other members in this
bucket include Aroon/Stoch/SuperTrend/ATR/SMA/EMA/RMA/HMA/VWMA/linreg/stdev/
variance/correlation/percentile variants and need the same per-builtin Pine
rule or trace before ownership is assigned.

Rows:
`0026`, `0027`, `0050`, `0051`, `0214`, `0215`, `0233`, `0349`, `0358`,
`0471`, `0474`, `0510`, `0516`, `0521`, `0537`, `0547`, `0559`, `0572`,
`0573`, `0575`, `0580`, `0590`, `0599`, `0606`, `0687`, `0690`, `0698`,
`0705`, `0707`, `0713`, `0718`, `0747`, `0758`, `0764`, `0778`, `0795`,
`0809`, `0851`, `0852`, `0856`, `0867`, `0869`, `0870`, `0871`, `0881`,
`0882`, `0885`, `0888`, `0889`, `0890`, `0891`, `0898`, `0900`, `0918`,
`0937`, `0956`, `0960`, `0966`, `0976`.

## 2. UDF Local Persistent / History State Differs — 35

Representative pinned row:
`sources/0337__mihakralj-pinescript__mama.pine`

First difference:
`plot[0].values[1]`: interpreter `na`, compiled `100.24190666485362`.

Minimal repro:

```pine
//@version=6
indicator("udf local history")
f(src) =>
    var float acc = na
    acc := na(acc[1]) ? src : 0.5 * src + 0.5 * acc[1]
    acc
plot(f(close))
```

Construct: `var` locals and history references inside UDF bodies. Pine's
variable-declaration rules make `var` initialize once and persist across bars,
and history references inside a function are per-call-site series. The
differential proves one implementation is assigning, reading, or seeding those
per-call-site series differently. It does not by itself decide ownership for
each row because both eager seeding and over-`na` propagation have been wrong in
adjacent cases on this branch.

Rows:
`0040`, `0047`, `0219`, `0230`, `0337`, `0386`, `0387`, `0388`, `0392`,
`0398`, `0400`, `0402`, `0405`, `0406`, `0409`, `0412`, `0482`, `0492`,
`0518`, `0538`, `0541`, `0570`, `0571`, `0587`, `0591`, `0594`, `0595`,
`0694`, `0695`, `0872`, `0875`, `0884`, `0917`, `0951`, `0957`.

## 3. Request-Context Value State Differs — 16

Representative pinned row:
`sources/0517__casoon-pine-scripts__mtf_structure_bias.pine`

First difference:
`plot[3].values[20]`: interpreter `-80`, compiled `-100`.

Minimal repro:

```pine
//@version=6
indicator("request state")
f() =>
    var float acc = na
    acc := na(acc[1]) ? close : acc[1] + close - close[1]
    acc
plot(request.security(syminfo.tickerid, timeframe.period, f()))
```

Construct: request expressions with local/persistent state, source remapping, or
series history inside the requested context. Request argument normalization,
datafeed lookup, cache keys, merging and source remapping are shared in the
current engine, but this archived-interpreter differential shows the retired
interpreter and current compiled path do not agree on requested-context values.
Ownership requires per-row trace because the request path has previously had
both compiled and interpreter defects.

Rows:
`0485`, `0491`, `0494`, `0517`, `0526`, `0540`, `0542`, `0567`, `0569`,
`0589`, `0592`, `0597`, `0605`, `0612`, `0677`, `0750`.

## 4. Structural Plot Count Differs — 10

Representative pinned row:
`sources/0902__helenananaa-pine-compat-runtime__array_methods.pine`

First difference:
`plots.length`: interpreter `15`, compiled `3`.

Minimal repro:

```pine
//@version=6
indicator("structural plots")
var array<float> values = array.from(close)
plot(array.size(values))
plot(array.get(values, 0))
```

Construct: one path records a different set of global visual outputs. This is
not a value-seeding disagreement; it changes which series exist. The examples
split further into array/UDT visual rows, financial/request rows, and data-window
diagnostic rows, so each row needs a focused reduction before fixing.

Rows:
`0139`, `0463`, `0464`, `0478`, `0529`, `0791`, `0829`, `0902`, `0928`,
`0953`.

## 5. Unclassified Arithmetic / State Differs — 6

Representative pinned row:
`sources/0449__everget-tradingview-pinescript-indicators__stc_schaff_trend_cycle.pine`

First difference:
`plot[0].values[18]`: interpreter `99.77553822309659`, compiled `49.90234375`.

Minimal repro:

```pine
//@version=6
indicator("recursive arithmetic state")
x = close - close[1]
var float state = 0.0
state := 0.5 * nz(x) + 0.5 * state
plot(state)
```

Construct: recursive arithmetic chains where the first visible difference is
not explained by request execution, collection mutation, or an obvious TA
lookback member. These are trace-required before assigning ownership.

Rows:
`0419`, `0449`, `0450`, `0472`, `0477`, `0693`.

## 6. Dynamic / Non-Identifier History Differs — 2

Representative pinned row:
`sources/0811__helenananaa-pine-compat-runtime__bb_edge_cases.pine`

First difference:
`plot[0].values[0]`: interpreter `1`, compiled `0`.

Minimal repro:

```pine
//@version=6
indicator("non-identifier history")
plot((close - open)[1])
```

Construct: history applied to expressions or computed values rather than plain
identifiers. Pine supports history references on series expressions; current
compiled has had several fixes in this area, so ownership is trace-required for
these remaining rows rather than inherited from the retired interpreter.

Rows:
`0561`, `0811`.

## 7. Plot Value Series Is Truncated — 1

Representative pinned row:
`sources/0134__mihakralj-pinescript__mlp.pine`

First difference:
`plot[0].values.length`: interpreter `160`, compiled `6`.

Minimal repro:

```pine
//@version=6
indicator("negative plot offset")
plot(close, offset = -5)
```

Construct: plot `offset` shifts rendering location; it should not truncate the
stored value series to the visible tail. Compiled is likely wrong here because
it emits only 6 values for a 160-bar run.

Rows:
`0134`.

## 8. Collection-Backed State Differs — 1

Representative pinned row:
`sources/0757__palitojendthen-pinescript__adaptive_rsi.pine`

First difference:
`plot[2].values[22]`: interpreter `0.009238024730229614`, compiled
`0.0018917042774924317`.

Minimal repro:

```pine
//@version=6
indicator("collection state")
var array<float> xs = array.new_float()
array.push(xs, close)
plot(array.avg(xs))
```

Construct: persistent collection mutation feeding later numeric output. The
differential proves state drift, but ownership needs a reduction because both
array history semantics and collection receiver dispatch have changed recently.

Rows:
`0757`.

## References

- TradingView Pine Script variable declarations:
  https://www.tradingview.com/pine-script-docs/language/variable-declarations/
- TradingView Pine Script time series and history:
  https://www.tradingview.com/pine-script-docs/language/time-series/
- TradingView Pine Script plots:
  https://www.tradingview.com/pine-script-docs/visuals/plots/
- TradingView official `ta` library:
  https://www.tradingview.com/script/BICzyhq0-ta/
