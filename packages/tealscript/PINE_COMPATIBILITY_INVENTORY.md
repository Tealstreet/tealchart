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
| Parser/runtime | `strategy(...)` | Partial | `src/parser/parser.test.ts`; `src/runtime/engine.test.ts` | Strategy execution and broker emulator are planned. |
| Parser/runtime | `library(...)` / `import` | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts`; `tests/compat/pine-unsupported.test.ts`; Public API guardrails in `tests/public-api/public-entry.test.ts`; `src/semantic/checker.test.ts` | `library(...)`, exported local helpers, typed/qualified exported parameters, import syntax, host-provided registry dispatch for `alias.exportedFunction(...)`, exported imported UDT constructors via `alias.Type.new(...)`, exported imported methods on imported UDT instances, and initial export-shape diagnostics are covered. Published TradingView lookup, enum namespace binding, exported constants, version selection, and deeper export diagnostics remain planned. |
| Parser/runtime | Variable declarations | Supported | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts` | Qualified type checking is planned. |
| Parser/runtime | `var` / `varip` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Intrabar `varip` parity and nested-scope edge cases remain. |
| Parser/runtime | Reassignment `:=` | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts` | Identifier, array index, and UDT field assignment are supported. Broader object/drawing member assignment diagnostics remain planned. |
| Parser/runtime | Compound assignment | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts` | Identifier, array index, and UDT field compound assignment are supported. Broader type diagnostics remain planned. |
| Parser/runtime | Tuple destructuring | Supported | `tests/compat/pine-basics.test.ts` | Broader type diagnostics are planned. |
| Parser/runtime | Wrapped and continued expressions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Multiline declarations, calls, arrays, tuple patterns, index access, parenthesized expressions, and line continuations after operators are supported. Leading comparison, logical, multiplicative, `+`, and ternary operators are supported; leading `-` remains planned because it conflicts with negative literals in indented Pine bodies. |
| Parser/runtime | `if` / `else if` / `else` | Supported | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Nested indentation hardening continues under core semantics. |
| Parser/runtime | Ternary `?:` | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-visuals.test.ts` | Broader `na` truthiness fixtures are planned. |
| Parser/runtime | `for` loops | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts` | Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | `while`, `break`, `continue` | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts` | Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | User-defined functions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Single-line and multiline UDFs, named arguments, default parameters, invalid call-shape diagnostics, branch and loop returns, and recursive-call diagnostics are covered. Deeper nested block parsing and call-site series parity need hardening. |
| Parser/runtime | Methods, e.g. `arr.push(x)` and `method scale(float this)` | Partial | `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-objects.test.ts`; `src/runtime/arrays.test.ts` | Built-in collection method sugar and user-defined method declarations dispatch. Local and imported UDT receiver overloads are covered. Enum methods and stronger semantic diagnostics remain planned. |
| Parser/runtime | `switch` | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-control-time.test.ts` | Exhaustive type diagnostics are planned. |
| Parser/runtime | User-defined types | Partial | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `src/semantic/checker.test.ts`; `tests/compat/pine-objects.test.ts` | Type declarations, fields, constructors, constructor argument diagnostics, unknown field diagnostics, conservative primitive field type diagnostics, field access/assignment, reference assignment, shallow copy helpers, rollback, and user-defined method dispatch are covered. Full reference/qualified field type enforcement and library diagnostics remain planned. |

### Runtime Semantics

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Runtime | Bar-by-bar execution | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-basics.test.ts` | Realtime rollback semantics remain partial. |
| Runtime | History references `x[n]` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Broader type diagnostics and max-bars inference are planned. |
| Runtime | `na` value and `na(value)` | Partial | `tests/compat/pine-language.test.ts` | Arithmetic propagation, `na()` checks, explicit `bool(na)`, and `na` comparison false semantics are covered; direct `na` comparison diagnostics and full v6 bool type enforcement remain. |
| Runtime | Built-in price series | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-basics.test.ts` | Host metadata injection is separate. |
| Runtime | Calendar variables | Partial | `tests/compat/pine-control-time.test.ts` | IANA timezones are covered for common timestamp/calendar/session helpers; exchange calendars remain. |
| Runtime | `bar_index` / `last_bar_index` | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-control-time.test.ts` | None known for current execution model. |
| Runtime | `barstate.*` | Partial | `tests/compat/pine-control-time.test.ts` | Browser-worker realtime tick parity remains. |
| Runtime | `syminfo.*` | Partial | `tests/compat/pine-control-time.test.ts` | Live symbol metadata injection remains. |
| Runtime | `timeframe.*` | Partial | `tests/compat/pine-control-time.test.ts` | Live chart timeframe injection and comparison helpers remain. |
| Runtime | Function-local series state | Partial | `tests/compat/pine-language.test.ts` | Nested block and call-site series parity need hardening. |
| Runtime | `max_bars_back` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Runtime buffer enforcement/inference is not implemented. |

### Built-Ins

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Built-ins | `math.*` | Partial | `tests/compat/pine-builtins.test.ts`; `src/runtime/engine.test.ts` | Random behavior, overloads, and exact int/float parity remain. |
| Built-ins | `ta.*` | Partial | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-builtins.test.ts`; `src/runtime/engine.test.ts` | Full reference-manual inventory and edge-case parity remain. |
| Built-ins | `input.*` | Partial | `tests/compat/pine-basics.test.ts`; `tests/compat/pine-builtins.test.ts` | Advanced UI/display behavior and validation remain. |
| Built-ins | Time functions | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-control-time.test.ts` | IANA timezones are covered for common timestamp/calendar/session helpers; higher-timeframe aggregation and exchange calendars remain. |
| Built-ins | `color.*` | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-visuals.test.ts` | Exact named constants and theme-sensitive behavior remain. |
| Built-ins | `str.*` | Partial | `tests/compat/pine-builtins.test.ts` | Formatting and Unicode edge cases remain. |
| Built-ins | `array.*` | Partial | `src/runtime/arrays.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-builtins.test.ts` | Full array reference inventory and edge cases remain. |
| Built-ins | `runtime.*` | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts` | Only `runtime.error()` is implemented. |
| Built-ins | Global helpers | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts` | `na`, `nz`, `fixnan`, and primitive casts are covered for common numeric/source idioms; broader type-system diagnostics and exact color overload parity are planned. |
| Built-ins | `map.*` | Partial | `src/runtime/maps.test.ts`; `tests/compat/pine-maps.test.ts`; Roadmap Epic 12 | Runtime covers constructors, size, put/get/contains/remove/clear/copy/keys/values/put_all, value-key validation, insertion-order arrays, capacity checks, method syntax, generic constructor/declaration syntax, and key-value loops. Remaining gaps are stronger compile-time key/value template enforcement and exact diagnostics for invalid map type templates. |
| Built-ins | `matrix.*` | Partial | `src/runtime/matrices.test.ts`; `src/runtime/engine.test.ts`; Roadmap Epic 12 | Runtime covers typed constructors, shape/access helpers, row/column mutation, copy/reshape, transpose/reverse, sort/submatrix operations, inspection predicates, basic aggregates, `matrix.sum()`/`matrix.diff()` for same-shape matrix and scalar operands, `matrix.mult()` for matrix/array/scalar operands, `matrix.pow()` for non-negative integer powers, `matrix.trace()`/`matrix.det()`/`matrix.inv()` for square matrices, `matrix.rank()` for rectangular or square matrices, and `matrix.kron()` for Kronecker products. Remaining gaps include full linear algebra parity (`pinv`, eigen helpers) and `sort_field` object sorting. |
| Data | `request.*` | Partial | `tests/compat/pine-request-security.test.ts`; `tests/runtime/requestDatafeed.test.ts`; Roadmap Epic 8 | `request.security()`, `request.security_lower_tf()`, `request.currency_rate()`, point-series families (`dividends`, `earnings`, `splits`, `financial`, `economic`), `request.seed()`, dynamic request guards, limits, and deterministic datafeed routing are covered. Data availability remains host/provider-gated, point-series lookahead is conservative, and `request.footprint()` remains planned. |
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
| Alerts | `alertcondition` / `alert` | Partial | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts` | UI integration and full throttling parity remain. |
| Strategies | `strategy.*` | Partial | `src/parser/parser.test.ts`; `src/runtime/engine.test.ts` | Broker emulator, ledger, fills, positions, and tester state are planned. |
| Data | Multi-timeframe requests | Supported | `tests/compat/pine-request-security.test.ts`; Roadmap Epic 8 | Deterministic higher-timeframe `request.security()` gap/lookahead behavior is covered; live host data availability is outside TealScript runtime scope. |
| Data | Other-symbol requests | Supported | `tests/compat/pine-request-security.test.ts`; `tests/runtime/requestDatafeed.test.ts`; Roadmap Epic 8 | Other-symbol metadata/currency routing is covered through host-provided request contexts. |

## Parity PR Checklist

Every feature-parity PR should include the relevant items below. If an item is
not relevant, call that out in the PR description.

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
