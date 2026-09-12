> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Dispatch Routing Audit V1

Basis: old dispatch `external-pine-corpus-v5.remaining-gap-dispatch-v5.md`, remeasured after merging `origin/parity/no-output-diagnostics` into this branch.

- Current measurement commit: `19ac5628e5d334c7979038619fe57a0fb4b95d0e`.
- Pinned corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
- Focused run: exact 65 rows from the dispatch list, via `scripts/run-pinned-external-pine-corpus.ts --commit 19ac5628e5d334c7979038619fe57a0fb4b95d0e`.
- Output JSON: `/tmp/external-pine-corpus-v5-dispatch-65-after-second-parity-merge.json`.

The old list is stale but still useful as an audit queue: 11 rows now produce
output, 3 are already runner-classified invalid Pine, and the remaining 51
runner-labelled gaps reduce to 7 defensible implementation handoffs after
declared-version/source audit.

## Current Head Split

| Classification | Rows | Dispatch action |
| --- | ---: | --- |
| Real TealScript gap | 7 | Route below. |
| Trace, host, or request-context evidence | 5 | Register/evidence, not parser/semantic/runtime implementation yet. |
| Output/data-gated corpus artifact | 10 | Do not route. |
| Invalid Pine, incomplete corpus source, or script-authored runtime error | 32 | Do not route. |
| Already fixed at current HEAD | 11 | Drop from dispatch. |

## Real Gaps To Route

### Parser: line-wrapped single-quote/double-quote string literals

Rows:

- `sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine` — v6, line 7.
- `sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine` — v6, line 5.
- `sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine` — v5, line 19.
- `sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine` — v5, line 11.

Current diagnostic: parser stops at the physical newline inside a single-line
quoted string. Pine supports line wrapping of statements, and current v6 string
docs explicitly preserve deprecated line-wrapped single-line strings. The v5
rows use the same published-script idiom with continuation indentation.

Owner: parser. This is grammar/wrapper handling of newline continuation inside
quoted string tokens, before semantic or runtime can see the program.

Minimal repro:

```pine
//@version=5
indicator("wrapped string")
txt = "first line
     second line"
plot(close)
```

### Runtime/codegen: array cleanup loop shifts a size-bound collection

Rows:

- `sources/0497__casoon-pine-scripts__wavetrend_strategy.pine` — v6, lines 483-486.
- `sources/0554__casoon-pine-scripts__wavetrend.pine` — v6, lines 1356-1365.

Current diagnostic: compiled execution throws `Array index 0 is out of bounds.
Array size is 0` while clearing drawing arrays guarded by `array.size(...) > 0`
and looped with `for i = 1 to array.size(...)`.

Owner: runtime/codegen. Parse, semantic, and compile pass; the failure is emitted
execution over-mutating a Pine collection while a loop is bounded from a mutable
array size expression.

Minimal repro:

```pine
//@version=6
indicator("array cleanup shift", overlay=true)
var array<line> lines = array.new_line()
if bar_index == 0
    array.push(lines, line.new(bar_index, close, bar_index, close))
if barstate.islast and array.size(lines) > 0
    for i = 1 to array.size(lines)
        line.delete(array.shift(lines))
plot(close)
```

### Runtime/request gate: v5 request in a global conditional expression

Row:

- `sources/0858__regalouisei-collect-tradingview__tabela-rsi-5-emas-dd.pine` — v5, line 25.

Current diagnostic: `runtime.error: request.* calls in local scopes require
dynamic_requests=true: request.security`.

The row is declared v5 and the source calls `request.security(...)` in a global
ternary expression with simple literal timeframes. This is not a semantic
unknown and not a parser issue; the compiled request gate is treating the
conditional-expression branch like a disallowed local dynamic-request scope.

Owner: runtime/request execution. The program parses, checks, and compiles; the
runtime request policy rejects the call.

Minimal repro:

```pine
//@version=5
indicator("v5 conditional request")
canRender(string tf) => timeframe.period == tf
r = canRender("1") ? request.security(syminfo.tickerid, "5", close) : 0
plot(r)
```

## Trace/Host/Request-Context Rows

- `sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine`
- `sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine`
- `sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine`

All three are valid v6 strategies using `calc_on_order_fills=true`. This is the
same fill-triggered re-entry evidence surface as the v6 register rows; do not
route to parser or semantic implementation.

- `sources/0529__casoon-pine-scripts__zigzag_core.pine`
- `sources/0984__deepentropy-lightweight-charts-indicators__Supply-and-Demand-Daily-LuxAlgo-.pine`

Both depend on lower-timeframe request context. `0529` reaches empty returned
intrabar arrays under the synthetic host fixture; `0984` refuses an equal/higher
`request.security_lower_tf()` timeframe. These need host/request traces to
distinguish engine behavior from chart-context/provider behavior.

## Not Ours

### Output/data-gated corpus artifacts

Rows `0502`, `0639`, `0643`, `0644`, `0645`, `0646`, `0647`, `0649`, and
`0987` are compiled but data-gated on the fixed synthetic profiles. Row `0603`
is a library/table-or-coloring-only source with no counted standalone output.
Do not route these as subsystem defects.

### Invalid Pine or incomplete corpus sources

- `0165` — v6 assigns `x / 2` to `int x`; v6 division is float and requires an explicit integer cast.
- `0157`, `0166`, `0185`, `0535` — declared `simple` UDF parameters receive series values. TealScript is enforcing the qualifier rule; no TradingView-running evidence was found for the pinned sources.
- `0489`, `0495`, `0520`, `0581`, `0772`, `0773` — undeclared identifiers in the pinned standalone sources.
- `0604` — v6 exported library function uses exported parameters inside a `request.security()` expression; current TradingView library rules forbid that dependency.
- `0640`, `0641`, `0642`, `0648`, `0654`, `0655`, `0656` — camelCase `strategy()` arguments such as `initialCapital`, `defaultQtyValue`, `commissionType`, and `commissionValue`; Pine uses snake_case declaration arguments.
- `0650`, `0651`, `0652`, `0653` — v6 declares `bool gapPoints` and assigns a float/`na` ternary result.
- `0806` — indicator fixture calls `strategy.entry(...)`; this is a corpus fixture artifact, not a valid indicator output gap.
- `0828`, `0910` — duplicate `lab` declaration; current runner already classifies both invalid Pine.
- `0902` — explicit empty-array `pop()` probe; Pine arrays also reject popping an empty array.
- `0927` — invalid/minimal import fixture (`import notlib as n`) whose own comments expect an import failure.
- `0979` — invalid table position probe (`"position.bad"`).
- `0272` — v6 matrix pivot loop indexes past the 3x3 flattened matrix when the descending `for row = col + 1 to d` branch executes at `col == d`; this is script-authored runtime behavior under the declared v6 loop rule.
- `0760` — v5 LuxAlgo source loops to `math.min(showBull - 1, bullish_ob.size())` and reads `bullish_ob.get(size)`, an inclusive-loop off-by-one when the array has one element.
- `0992` — script-authored `runtime.error("Not enough data...")` guard.

## Already Fixed At Current HEAD

These old dispatch rows now produce output at `19ac5628e5d334c7979038619fe57a0fb4b95d0e` and should be removed from routing:

- `sources/0134__mihakralj-pinescript__mlp.pine`
- `sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine`
- `sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine`
- `sources/0583__casoon-pine-scripts__vein_structure_zones.pine`
- `sources/0680__gktrk0530-pine-script-indicators.__mtf_trend_dashboard.pine`
- `sources/0802__YooooungLee-clever-meme__.pine`
- `sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine`
- `sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine`
- `sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine`
- `sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine`
- `sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine`
