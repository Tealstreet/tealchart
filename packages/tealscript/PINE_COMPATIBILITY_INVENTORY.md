# Pine Compatibility Inventory

This file is the canonical row-level Pine compatibility matrix. Keep it aligned
with tests and implementation as parity work lands. `PINE_COMPATIBILITY.md` is
the narrative user-facing status page; `PINE_PARITY_EPICS.md` is the long-term
roadmap.

## Status Values

| Status | Meaning |
| --- | --- |
| `Supported` | Syntax and runtime behavior are implemented and covered by tests. |
| `Partial` | Common usage works, but important Pine behavior, diagnostics, or UI integration is incomplete. |
| `Planned` | The feature is in scope but not implemented yet. |
| `Unsupported` | The feature should produce a clear diagnostic or documented rewrite path. |

## Topic Inventory Row

Use this shape when adding or refreshing compatibility rows:

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Parser, runtime, built-ins, visuals, data, alerts, or strategies | Pine feature or namespace | Status value | Test file, fixture, or diagnostic covering current behavior | Missing Pine behavior or reason unsupported |

Keep evidence specific enough that a reviewer can find the behavior without
reading the whole runtime.

## Current Matrix

### Syntax

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Parser | `//@version=6` annotation | Supported | `tests/parser/parser.test.ts`; `tests/compat/pine-basics.test.ts` | No version-specific runtime branches yet. |
| Parser | `//@version=5` annotation | Partial | `tests/parser/parser.test.ts` | Accepted as numeric version only. |
| Parser/runtime | `indicator(...)` | Partial | `tests/compat/pine-basics.test.ts`; `src/runtime/engine.test.ts` | Many declaration options are parsed but not fully applied. |
| Parser/runtime | `strategy(...)` | Partial | `src/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 14 | Declaration settings, broker-emulator state, orders/fills, trade accessors, and semantic call-shape diagnostics are covered. Full TradingView intrabar path parity, bar magnifier, and lower-timeframe fill simulation remain deferred until TealScript has an explicit intrabar data model. |
| Parser/runtime | `library(...)` / `import` | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts`; `tests/compat/pine-unsupported.test.ts`; Public API guardrails in `tests/public-api/public-entry.test.ts`; `src/semantic/checker.test.ts` | `library(...)`, exported local helpers, typed/qualified exported parameters, import syntax, host-provided registry dispatch for `alias.exportedFunction(...)`, exported imported UDT constructors via `alias.Type.new(...)`, exported imported methods on imported UDT instances, local enum member diagnostics, export-shape diagnostics, and exported function scope diagnostics are covered. Published TradingView lookup, broader enum namespace binding, exported constants, version selection, and request-expression qualifier diagnostics remain planned. |
| Parser/runtime | Variable declarations | Supported | `tests/parser/parser.test.ts`; `src/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts` | Annotated local primitive, reference, collection, UDT, enum, and mixed conditional/if/switch initializer mismatches are diagnosed. Broader qualifier-sensitive type checking is planned. |
| Parser/runtime | `var` / `varip` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Intrabar `varip` parity and nested-scope edge cases remain. |
| Parser/runtime | Reassignment `:=` | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts`; `src/semantic/checker.test.ts` | Identifier, array index, and UDT field assignment are supported. Plain identifier, array index, and UDT field value type mismatches are diagnosed when semantic types are known; plain identifier and UDT field qualifier downgrades are also diagnosed. Broader object/drawing member assignment diagnostics remain planned. |
| Parser/runtime | Compound assignment | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts`; `src/semantic/checker.test.ts` | Identifier, array index, and UDT field compound assignment are supported. Plain identifier, local UDT field, and array element compound assignments diagnose known unsupported operand and result type mismatches. Broader collection/member compound parity remains planned. |
| Parser/runtime | Tuple destructuring | Supported | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts` | Literal tuple destructuring, direct declaration `if`, `switch`, and loop initializer tuples, direct and compatible if/else plus partial-if user-function tuple returns, direct user-function loop and defaulted or partial switch tuple returns, compatible user-method tuple returns, and known tuple-returning TA calls infer positional element types for downstream diagnostics. Direct tuple initializers, including known local user-call tuple returns and mixed-shape user-call control returns, and direct control initializer tuple arms, including arm-local user-call tuple returns, diagnose obvious non-tuple and arity mismatches. Broader mixed-shape branch, loop, and switch tuple-return inference remains planned. |
| Parser/runtime | Wrapped and continued expressions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Multiline declarations, calls, arrays, tuple patterns, index access, parenthesized expressions, and line continuations after operators are supported. Leading comparison, logical, multiplicative, `+`, non-numeric `-`, and ternary operators are supported; leading negative-literal continuations remain planned because they conflict with negative literals in indented Pine bodies. |
| Parser/runtime | `if` / `else if` / `else` | Supported | `tests/parser/parser.test.ts`; `src/parser/parser.test.ts`; `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts` | Compatible user-function if/else, variable initializer, and partial if return arms infer scalar types for downstream diagnostics. Nested indentation hardening continues under core semantics. |
| Parser/runtime | Ternary `?:` | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-visuals.test.ts`; `src/semantic/checker.test.ts` | Compatible ternary arms infer scalar types for downstream diagnostics. Broader `na` truthiness fixtures are planned. |
| Parser/runtime | `for` loops | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts` | Direct numeric and collection for-loop expressions plus user-function for-loop returns infer scalar types for downstream diagnostics. Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | `while`, `break`, `continue` | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts` | Direct while-loop expressions and user-function while-loop returns infer scalar types for downstream diagnostics. Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | User-defined functions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts` | Single-line and multiline UDFs, named arguments, default parameters, invalid call-shape diagnostics, branch and loop returns, direct semantic return inference, call-site qualifier propagation for annotated parameters, and recursive-call diagnostics are covered. Deeper nested block parsing and broader user-callable diagnostics need hardening. |
| Parser/runtime | Methods, e.g. `arr.push(x)` and `method scale(float this)` | Partial | `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts`; `src/runtime/arrays.test.ts`; `src/semantic/checker.test.ts` | Built-in collection method sugar and user-defined method declarations dispatch. Local and imported UDT receiver overloads are covered. Local semantic method overload declarations are accepted, method return inference selects overloads by receiver specificity plus annotated argument signatures, full and partial branch/switch plus loop control-flow method returns infer scalar and tuple types, and local plus import-qualified enum receivers are covered. Broader user-callable diagnostics remain planned. |
| Parser/runtime | `switch` | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-control-time.test.ts`; `src/semantic/checker.test.ts` | Compatible defaulted and partial switch expression arms infer scalar types for downstream diagnostics. Exhaustive mixed-shape diagnostics remain planned. |
| Parser/runtime | User-defined types | Partial | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; `tests/compat/pine-objects.test.ts` | Type declarations, fields, constructors, constructor argument diagnostics, unknown field diagnostics, conservative primitive field type diagnostics, field access/assignment, reference assignment, shallow copy helpers, rollback, and user-defined method dispatch are covered. Full reference/qualified field type enforcement and library diagnostics remain planned. |

### Runtime Semantics

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Runtime | Bar-by-bar execution | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-basics.test.ts` | Realtime rollback semantics remain partial. |
| Runtime | History references `x[n]` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Broader type diagnostics and max-bars inference are planned. |
| Runtime | `na` value and `na(value)` | Partial | `tests/compat/pine-language.test.ts` | Arithmetic propagation, `na()` checks, explicit `bool(na)`, and `na` comparison false semantics are covered; direct `na` comparison diagnostics and full v6 bool type enforcement remain. |
| Runtime | Built-in price series | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-basics.test.ts` | Host metadata injection is separate. |
| Runtime | Calendar variables | Partial | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts` | Current-bar variables, callable helpers, fixed-offset/IANA timezone arguments, named timezone arguments, exchange-timezone injection, and host-provided session closures are covered for common Pine idioms. Broader exchange calendar catalogs remain host responsibility. |
| Runtime | `bar_index` / `last_bar_index` | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-control-time.test.ts` | None known for current execution model. |
| Runtime | `barstate.*` | Partial | `tests/compat/pine-control-time.test.ts` | Browser-worker realtime tick parity remains. |
| Runtime | `syminfo.*` | Partial | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts` | Common static symbol metadata and exchange timezone injection are covered. Broader live host symbol metadata injection remains. |
| Runtime | `timeframe.*` | Supported | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts` | Current parity covers metadata fields, declaration-time timeframe overrides, ticks/seconds/minutes/D/W/M parsing, `timeframe.in_seconds()`, `timeframe.from_seconds()`, `timeframe.change()`, and comparison idioms. Broader live host timeframe injection is outside the runtime contract. |
| Runtime | Function-local series state | Partial | `tests/compat/pine-language.test.ts` | Nested block and call-site series parity need hardening. |
| Runtime | `max_bars_back` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Runtime buffer enforcement/inference is not implemented. |
| Runtime | Limits, sandboxing, and profiling | Partial | `src/runtime/engine.test.ts`; `src/runtime/drawings/builtins.test.ts`; `tests/parser/parser.test.ts`; `tests/compat/pine-request-security.test.ts`; `tests/worker/protocol.test.ts`; Roadmap Epic 15 | Implemented guardrails cover loop iteration caps, 64 non-`hline()` plot outputs, 40 unique `request.*` contexts per pass, 10,000 live table cells, parser source/depth limits, deterministic `math.random()`, runtime profile counters, and worker profile propagation. Broader hard wall-clock and memory quotas remain planned as host/runtime sandbox hardening. |

### Built-Ins

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Built-ins | `math.*` | Partial | `tests/compat/pine-builtins.test.ts`; `src/runtime/engine.test.ts` | Random behavior, overloads, and exact int/float parity remain. |
| Built-ins | `ta.*` | Partial | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-builtins.test.ts`; `src/runtime/engine.test.ts` | Full reference-manual inventory and edge-case parity remain. |
| Built-ins | `input.*` | Partial | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-builtins.test.ts` | Advanced UI/display behavior and validation remain. |
| Built-ins | Time functions | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-control-time.test.ts` | IANA timezones are covered for common timestamp/calendar/session helpers; higher-timeframe aggregation and exchange calendars remain. |
| Built-ins | `color.*` | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-visuals.test.ts` | Exact named constants and theme-sensitive behavior remain. |
| Built-ins | `str.*` | Partial | `tests/compat/pine-builtins.test.ts` | Formatting and Unicode edge cases remain. |
| Built-ins | `array.*` | Partial | `PINE_ARRAY_REFERENCE_INVENTORY.md`; `src/runtime/arrays.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-builtins.test.ts`; `src/semantic/checker.test.ts` | Runtime covers common constructors including `array.new<T>`, mutation, search, ordering, UDT `sort_field` sorting by field name or index, slicing, and statistical helpers. Semantic coverage preserves element types from constructors, homogeneous literals/`array.from`, array-returning helpers, element reads, scalar helper results, and typed collection loop symbols; it validates generic constructor template arity and qualifier misuse, reports conservative mutation/concat mismatches for known arrays, and enforces const int/string `array.sort()` `sort_field` arguments. Full official-reference reconciliation and edge cases remain. |
| Built-ins | `runtime.*` | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts` | Only `runtime.error()` is implemented. |
| Built-ins | Global helpers | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts` | `na`, `nz`, `fixnan`, and primitive casts are covered for common numeric/source idioms; semantic analysis preserves known `nz()` and `fixnan()` return types for downstream diagnostics. Broader type-system diagnostics and exact color overload parity are planned. |
| Built-ins | `map.*` | Partial | `src/runtime/maps.test.ts`; `tests/compat/pine-maps.test.ts`; `tests/compat/pine-language.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 12 | Runtime covers constructors, size, put/get/contains/remove/clear/copy/keys/values/put_all, `map.put()` previous-value returns, named map reference arguments, map variable history references, value-key validation, insertion-order arrays, capacity checks, method syntax, generic constructor/declaration syntax, key-value loops, and map fields stored on UDTs. Semantic coverage reports invalid map constructor templates plus conservative key/value mismatches for known `map<K, V>` variables and unannotated `map.new<K, V>()` constructors, infers `map.get()` value types, and reports UDT map-field reference mismatches. Bare collection container names and parsed nested collection templates in template positions are rejected; Pine does not allow direct collection elements inside collections. Remaining gaps are complete reference-type enforcement. |
| Built-ins | `matrix.*` | Partial | `src/runtime/matrices.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 12 | Runtime covers typed constructors, shape/access helpers, row/column mutation, copy/reshape, transpose/reverse, concat, matrix row iteration, full and ranged fills, sort/submatrix operations including named range arguments, UDT `sort_field` row sorting by field name or index, inspection predicates, basic aggregates, `matrix.sum()`/`matrix.diff()` for same-shape matrix and scalar operands, `matrix.mult()` for matrix/array/scalar operands, `matrix.pow()` for non-negative integer powers, `matrix.trace()`/`matrix.det()`/`matrix.inv()` for square matrices, `matrix.pinv()` for rectangular or rank-deficient matrices, `matrix.rank()` for rectangular or square matrices, `matrix.eigenvalues()` for real eigenvalues of square numeric matrices, `matrix.eigenvectors()` for real eigenvector columns, and `matrix.kron()` for Kronecker products. Semantic coverage infers `matrix.new<T>()` constructor element types, reports invalid generic constructor templates, returns known `matrix.get()` element types, infers matrix row arrays for collection loops, reports conservative `matrix.set()`/`matrix.fill()` element mismatches, and enforces const int/string `matrix.sort()` `sort_field` arguments. Remaining gaps include exact repeated-eigenvalue basis parity. |
| Data | `request.*` | Partial | `tests/compat/pine-request-security.test.ts`; `tests/runtime/requestDatafeed.test.ts`; `FOOTPRINT_REQUEST_DESIGN.md`; Roadmap Epic 8 | `request.security()`, `request.security_lower_tf()`, `request.currency_rate()`, point-series families (`dividends`, `earnings`, `splits`, `financial`, `economic`), `request.seed()`, dynamic request guards, limits, and deterministic datafeed routing are covered. Data availability remains host/provider-gated, point-series lookahead is conservative, and `request.footprint()` remains planned until host footprint/intrabar-volume data exists. |
| Data | `ticker.*` | Partial | `tests/compat/pine-ticker.test.ts`; `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 9 | Common ticker constructors and non-standard chart request IDs are covered for indicator workflows; synthetic strategy/backtest behavior remains planned for Epic 14. |

### Visual Outputs

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Visuals | `plot` | Partial | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures common v6 style/display/format/precision/force-overlay/line-style/show-last/histbase/trackprice/join metadata, and renderer coverage applies line styles, common offsets, display-none hiding, show-last windows, histbase baselines, trackprice lines, joined point markers, and a common visual command-trace regression. Full z-order, price-scale labels, and renderer pixel parity remain. |
| Visuals | `hline` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures common settings and renderer coverage applies color, linewidth, line style, display hiding, and pane coordinates. None known for current output shape. |
| Visuals | `fill` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures common fill metadata and renderer coverage applies plot/hline handles, gaps, display hiding, color series, and show-last behavior. None known for current output shape. |
| Visuals | `bgcolor` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures display and force-overlay metadata, and renderer coverage applies display hiding. None known for current output shape. |
| Visuals | `plotshape`, `plotchar`, `plotarrow` | Partial | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures common style/location/display/format/precision/force-overlay metadata and normalized arrow colors. Renderer coverage applies marker text, offsets, display/show-last routing, plotarrow min/max height scaling, and Pine flag/label marker bodies. Full marker pixel parity remains. |
| Visuals | `barcolor` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Renderer coverage applies display hiding and show-last windows to candle color overrides. None known for current output shape. |
| Visuals | `plotbar`, `plotcandle` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime captures format, precision, and force-overlay metadata. Edge-case parity will continue under visual epic. |
| Drawings | `label.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts`; `packages/tealchart/src/rendering/TealScriptDrawingRenderer.test.ts` | Runtime covers constructor, mutation, copy/delete, getters, GC limits, and realtime rollback. Renderer covers script-pane routing plus text-only, directional label, and common symbol styles. Remaining gaps are TradingView-exact pixel geometry and edge-case style parity. |
| Drawings | `line.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Runtime covers `chart.point` overloads, GC limits, and realtime rollback. Renderer covers dashed/dotted and arrowhead line styles. Remaining gaps are full TradingView pixel geometry and edge-case parity. |
| Drawings | `linefill.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Full line coordinate/object parity remains. |
| Drawings | `box.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts`; `packages/tealchart/src/rendering/TealScriptDrawingRenderer.test.ts` | Runtime covers constructor, mutation, copy/delete, getters, text layout metadata, GC limits, and common `chart.point` overloads. Renderer covers filled boxes, borders, alignment, `text_wrap=auto`, and default/monospace font-family metadata. Remaining gaps are TradingView-exact text pixels and edge-case styling. |
| Drawings | `polyline.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/rendering/TealScriptDrawingRenderer.test.ts` | Runtime covers constructor, copy/delete, limits, all-id arrays, and transient same-bar realtime rollback. Renderer covers fixed path geometry, optional fill, and line styling. Remaining gaps are full Pine lifecycle parity and TradingView-exact curved geometry. |
| Drawings | `table.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/rendering/TealScriptDrawingRenderer.test.ts` | Runtime covers fixed-position handles, delete/clear, cells, table-level position/background/frame/border setters, cell text/color/background/size setters, width/height setters, alignment setters, font-family metadata, text formatting metadata, persistent table realtime rollback, and a 10,000-cell sandbox cap. Renderer covers fixed table placement, measured cell sizes, backgrounds, borders, frames, text alignment, default/monospace font-family metadata, and bold/italic text formatting. Remaining gaps are full Pine table setter surface and TradingView-exact sizing. |

### Alerts, Strategies, And Data

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Alerts | `alertcondition` / `alert` | Supported | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 13 | TealScript emits runtime/worker alert outputs with placeholders, frequencies, strategy fill messages, realtime markers, and semantic call-shape diagnostics. Host-product UI presentation is outside this package. |
| Runtime | Pine Logs `log.*` | Supported | `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 13 | TealScript emits runtime/worker log outputs with levels and formatted messages. Host-product UI presentation is outside this package. |
| Strategies | `strategy.*` | Supported | `src/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; Roadmap Epic 14 | TealScript implements a deterministic OHLC broker emulator with settings, orders, fills, open/closed trades, position/equity state, commissions, runup/drawdown, trade accessors, order-fill alerts, and semantic call-shape diagnostics. Full TradingView intrabar path parity, bar magnifier, and lower-timeframe fill simulation remain deferred until TealScript has an explicit intrabar data model. |
| Data | Multi-timeframe requests | Supported | `tests/compat/pine-request-security.test.ts`; Roadmap Epic 8 | Deterministic higher-timeframe `request.security()` gap/lookahead behavior is covered; live host data availability is outside TealScript runtime scope. |
| Data | Other-symbol requests | Supported | `tests/compat/pine-request-security.test.ts`; `tests/runtime/requestDatafeed.test.ts`; Roadmap Epic 8 | Other-symbol metadata/currency routing is covered through host-provided request contexts. |

## Parity PR Checklist

Every feature-parity PR should include the relevant items below. If an item is
not relevant, call that out in the PR description.

- Copy-paste parse/execute checkpoint when the change targets a public Pine
  idiom.
- Failure classification update when a corpus or checkpoint failure changes
  status.
- Parser fixture for new syntax or grammar shape.
- Runtime fixture over deterministic local bars for new execution behavior.
- Reduced Pine idiom checkpoint for public or documented Pine patterns.
- Negative diagnostic fixture for unsupported or invalid forms.
- Compatibility matrix update.
- Roadmap update when the phase completes or a gap changes status.

## Checkpoint Fixture Rules

Checkpoint fixtures should be deterministic and small:

- Use local bar arrays from the existing fixture helpers.
- Assert concrete plot, drawing, alert, or error outputs.
- Preserve semantic shape from official docs or common public Pine idioms.
- Avoid depending on TradingView, network access, current market data, or random
  online scripts at test time.
