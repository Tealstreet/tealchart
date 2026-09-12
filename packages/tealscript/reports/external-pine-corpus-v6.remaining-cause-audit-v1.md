> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Remaining Cause Audit v1

Date: 2026-09-11
Auditor: codex-jlxeb6

This audit continues from `external-pine-corpus-v6.top-cause-audit-v1.md`.
It uses the authoritative current figures from `pine-value-vectors-index-v1.md`
and the ranked row list from `external-pine-corpus-v6.remaining-gap-dispatch-v1.md`.

Measurement commit: `94cae779898ba55e04e67df644e6025f7e281251`
Pinned source tree inspected from the sibling parity worktree cache:
`/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`

Scope note: no engine, chart, harness, fixture-profile, or classifier files were
changed. This is corpus-cause auditing only.

## Executive Result

Audited rows after the existing top-three cause audit: 69.

| Classification | Rows | Notes |
| --- | ---: | --- |
| Real TealScript gap | 5 | Two official-library imports, `table.cell` method named-argument binding, loop-expression declaration scope, exported const color expression. |
| Trace/host-required or request-context required | 18 | `calc_on_order_fills`, `fill_orders_on_standard_ohlc`, `risk_free_rate`, and invalid `security_lower_tf` chart/timeframe requests. |
| Corpus artifact / chart-context artifact / non-dispatchable runtime | 20 | Hidden output, missing bundle globals, resource-limit or author-guard runtime paths, profile-dependent array errors. |
| Invalid Pine by declared version | 26 | Bad signatures, removed/unknown args, undeclared names, invalid templates, local-scope requests, malformed syntax, or type/qualifier misuse. |

Dispatchable constructs:

1. Missing official library import surface:
   `TradingView/TechnicalRating/1` and `TradingView/RelativeValue/3`.
2. `table.cell` method-call named arguments:
   receiver method form rejects `text_color` even though `table.cell()` accepts it.
3. Function-local variable declaration initialized from a `for` expression:
   `result = for ...` is valid Pine and should bind `result`.
4. Library `export const color` initialized from const color expressions:
   `color.new(color.red, 92)` should be a const color expression.

Do not dispatch the aggregate buckets as fixes. Dispatch only these constructs.

## Cause Summary

| Cause | Rows | Real gap | Not ours | Classification |
| --- | ---: | ---: | ---: | --- |
| `semantic:unsupported-feature:strategy calc_on_order_fills trace-required` | 7 | 0 | 7 | Trace-required host semantics. |
| `output:global-output-declared-but-not-evaluated` | 6 | 0 | 6 | Hidden output or invalid indicator/strategy shape. |
| `semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required` | 6 | 0 | 6 | Host chart-fill semantics. |
| `execute:runtime.error` | 4 | 1 | 3 | One `table.cell` method-arg gap; three author guards/profile artifacts. |
| `execute:array-bounds-runtime-error` | 3 | 0 | 3 | Invalid source or chart-context artifact. |
| `execute:security-lower-tf-timeframe-refusal` | 3 | 0 | 3 | Invalid request timeframe for the measured chart context. |
| `semantic:argument-count` | 3 | 0 | 3 | Correct Pine signature refusals. |
| `semantic:invalid-type-template` | 3 | 0 | 3 | Missing nested collection templates. |
| `execute:array-size-limit` | 2 | 0 | 2 | Pine runtime limit/resource artifact. |
| `semantic:unknown-identifier:_co_gbl_up` | 2 | 0 | 2 | Missing bundled globals. |
| `semantic:unknown-identifier:hPrice` | 2 | 0 | 2 | Source typo/missing variable. |
| `semantic:unresolved-import` | 2 | 2 | 0 | Missing official TradingView library surface. |
| `semantic:unsupported-feature:strategy risk_free_rate trace-required` | 2 | 0 | 2 | Host Strategy Tester report metric semantics. |
| Singletons below rank 16 | 26 | 2 | 24 | Two real gaps: `0310`, `1000`; rest not ours. |

## Real TealScript Gaps

### Official TradingView Library Imports

Rows:

- `0483__regalouisei-collect-tradingview__technical-ratings.pine`, v5:
  `import TradingView/TechnicalRating/1 as rating`
- `0985__deepentropy-lightweight-charts-indicators__ta-v10.pine`, v6:
  `import TradingView/RelativeValue/3 as rv`

TealScript currently reports unresolved imports for official TradingView
libraries. These are valid Pine import constructs and a missing TealScript
library-surface gap, not invalid Pine.

Minimal repro:

```pine
//@version=6
indicator("official import repro")
import TradingView/RelativeValue/3 as rv
plot(na)
```

### `table.cell` Method Named Arguments

Row: `0129__The_Forex_Steward-volumetric-regression-heatmap__Volumetric Regression Heatmap.pine`, v6.

The source defines a helper:

```pine
cell(table t_able, int column, int row, string data, color textCol = color.white) =>
    t_able.cell(column, row, data, text_color = textCol)
```

TealScript reports:

```text
Unknown argument 'text_color' for method cell
```

TradingView documents `table.cell()` with `text_color` and other text
attributes; method syntax should bind the receiver as `table_id`, leaving the
same named parameters available.

Minimal repro:

```pine
//@version=6
indicator("table method text_color repro")
var table t = table.new(position.top_right, 1, 1)
if barstate.islast
    t.cell(0, 0, "x", text_color=color.white)
```

### `for` Expression Declaration Scope

Row: `0310__quant5-lab-runner__test_for_simple.pine`, v5.

Source:

```pine
//@version=5
indicator("For Expression Test", overlay=true)

testFunc() =>
    result = for i = 1 to 10
        i
    result

plot(testFunc())
```

TealScript reports `Unknown identifier: result`. Pine v5 loop syntax supports a
variable declaration initialized by the loop expression, and the loop returns a
value. This is a semantic binding/scoping gap.

### Exported Const Color Expressions

Row: `1000__jonathan-nascimento51-tradeCripto2025__style_lib.pine`, v6.

Source:

```pine
//@version=6
library("StyleLib", true)
export const color SR_COLOR_RES = color.new(color.red, 92)
```

TealScript reports:

```text
Exported constants must be literal values or compatible built-in variables
```

`color.new()` with const inputs returns a const color, so this should be a
valid exported constant initializer.

Minimal repro:

```pine
//@version=6
library("ConstColorLib", true)
export const color SHADED_RED = color.new(color.red, 92)
```

## Host-Required / Trace-Required

### `calc_on_order_fills` (7)

Rows: `0712`, `0718`, `0746`, `0783`, `0894`, `0897`, `0966`.

All are declared v6 strategies and set `calc_on_order_fills=true` in the
`strategy()` declaration. This changes strategy execution timing by recalculating
after order fills and needs TradingView fill-triggered re-entry trace parity.
Classification: trace/host-required, not an engine gap.

### `fill_orders_on_standard_ohlc` (6)

Rows: `0706`, `0710`, `0745`, `0772`, `0773`, `0821`.

All are declared v6 strategies and set `fill_orders_on_standard_ohlc=true` in
`strategy()`. TradingView documents this as standard-bar fill behavior on
non-standard chart types. Classification: host-required, not an engine gap.

### `risk_free_rate` (2)

Rows: `0758`, `0901`.

Both are declared v6 strategies using `risk_free_rate=0`. The argument is valid
Pine, but it affects TradingView Strategy Tester report metrics such as Sharpe
and Sortino rather than ordinary script output. Classification: trace-required,
not a normal engine defect.

### `request.security_lower_tf` (3)

Rows: `0266`, `0615`, `0849`.

The measured profiles invoke lower-timeframe requests with invalid/equal/higher
timeframe context, producing Pine runtime refusals. Classification:
request-context/fixture, not a TealScript gap.

## Not-Ours Cause Notes

- Global-output rows `0276`, `0329`, `0331`, `0394`, and `0609` only declare
  hidden plots using `display=display.none`; `0251` is an `indicator()` script
  that calls `strategy.entry()`. Classification: corpus/classifier artifact.
- Array bounds rows `0358` and `0415` fail only under the daily profile and
  pass under context-stress; `0680` passes a `label[]` into a `line[]` UDF and
  indexes an empty array. Classification: chart-context artifact / invalid Pine.
- Array size rows `0670` and `0097` hit Pine's 100,000-element array runtime
  limit. Classification: valid Pine runtime/resource limit, not engine gap.
- Runtime rows `0636`, `0645`, and `0408` are script-authored `runtime.error()`
  guards under the fixture data/timeframe. Classification: chart-context
  artifact.
- Argument-count rows `0085`, `0208`, and `0648` are invalid Pine calls:
  `ta.vwma(close, volume, 20)`, `ta.ao(close, 5, 34)`, and one-argument
  `ta.pivothigh()`/`ta.pivotlow()`.
- Invalid-template rows `0436`, `0512`, and `0585` use `array.new<map>()` or
  `array.new<matrix>()` without nested type arguments.
- Unknown identifier rows `_co_gbl_up` (`0336`, `0621`) are missing bundle
  globals; `hPrice` (`0299`, `0569`) is an undeclared source variable.

## Singleton Classifications

| Row | Declared | Diagnostic | Classification | Rationale |
| --- | --- | --- | --- | --- |
| `0202` | v5 | negative array size | Corpus/runtime artifact | Fixture data produces negative size; Pine rejects negative array sizes. |
| `0168` | v6 | matrix pow negative | Invalid/runtime refusal | Matrix power requires non-negative integer exponent. |
| `0363` | v5 | dynamic request local scope | Invalid Pine | v5 request calls in local scopes require `dynamic_requests=true`; declaration lacks it. |
| `0185` | v5 | undeclared `gapRed` assignment | Invalid Pine | Assignment target is not declared. |
| `0194` | v5 | series to simple `len` | Invalid Pine | Source creates `len` from `bar_index + 1`, then passes it where simple is required. |
| `0596` | v5 | `alertcondition()` scope | Invalid Pine | `alertcondition()` must be global. |
| `0117` | v6 | `hline(alpha=...)` | Invalid Pine | `hline()` has no `alpha` parameter. |
| `0281` | v5 | `indicator(margin_top=...)` | Invalid Pine | `indicator()` has no `margin_top` parameter in v5. |
| `0631` | v5 | `label.new(bgcolor=...)` | Invalid Pine | Label background is `color`, not `bgcolor`. |
| `0816` | v6 | `strategy(contract_size=...)` | Invalid Pine | Official strategy arguments include order-size controls, not `contract_size`. |
| `0931` | v6 | `strategy.entry(when=...)` | Invalid Pine | `when` is not a v6 `strategy.entry()` parameter. |
| `0434` | v5 | unknown function `polyline` | Invalid/synthetic artifact | `polyline.new` and the `polyline` type are valid, but this row uses unproven bare `polyline(id)`/`polyline(na)` casts. Do not dispatch without TradingView run evidence. |
| `0903` | v6 | unknown function `runtime.log` | Invalid Pine | Pine logging uses `log.*`, not `runtime.log`. |
| `0422` | v5 | undeclared `cleanTicker` | Invalid Pine | Source references missing variable. |
| `0908` | v6 | undeclared `day` | Invalid Pine | Pine exposes date built-ins such as `dayofmonth`; `day` is not a global. |
| `0977` | v6 | undeclared `dayofyear` | Invalid Pine | No Pine `dayofyear` global in v6. |
| `0332` | v5 | undeclared `emaFast` | Corpus artifact | Self-referential assignment from missing parameter/global. |
| `0343` | v5 | undeclared `error_log_level` | Corpus artifact | Source has malformed version comment and missing config global. |
| `0728` | v6 | undeclared `macd_line` | Invalid Pine | Tuple assignment is missing brackets. |
| `0193` | v5 | undeclared `pi` | Invalid Pine | v5 math constants/functions are under `math.*`. |
| `0742` | v6 | undeclared `positionValue` | Corpus artifact | Strategy plots missing variables. |
| `0310` | v5 | undeclared `result` | Real gap | Loop-expression declaration should bind. |
| `0628` | v5 | unknown `return` | Invalid Pine | Pine UDFs return the last expression; no `return` statement. |
| `0181` | v5 | undeclared `src` | Corpus artifact | Malformed version directive/source missing input. |
| `0560` | v5 | unknown `then` | Invalid Pine | Pine `if` syntax does not use `then`. |
| `1000` | v6 | library-export const expression | Real gap | Const color function expression should be exportable. |

## Rule References Used

- TradingView strategies docs
  (`https://www.tradingview.com/pine-script-docs/concepts/strategies/`):
  `strategy()` creates the `strategy.*` namespace;
  `fill_orders_on_standard_ohlc` changes fills on non-standard charts; strategy
  report metrics include risk-free-rate-dependent values.
- TradingView plots docs
  (`https://www.tradingview.com/pine-script-docs/visuals/plots/`):
  `display.none` computes but does not display plots.
- TradingView arrays docs
  (`https://www.tradingview.com/pine-script-docs/language/arrays/`):
  arrays cannot exceed 100,000 elements and negative
  sizes are runtime errors.
- TradingView other-timeframes docs
  (`https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/`):
  `request.security_lower_tf()` requires a
  lower/equal timeframe context and refuses invalid requests unless ignored.
- TradingView tables docs
  (`https://www.tradingview.com/pine-script-docs/visuals/tables/`):
  `table.cell()` accepts `text_color`.
- TradingView loop docs
  (`https://www.tradingview.com/pine-script-docs/v5/language/loops/`):
  loops return values and support declaration assignment.
- TradingView lines/boxes docs
  (`https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/`):
  `line`, `box`, and `polyline` are object types;
  this supports `polyline.new`, but not the unproven bare `polyline(...)` cast.
