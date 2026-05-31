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
| Parser/runtime | `library(...)` / `import` | Unsupported | Public API guardrails in `tests/public-api/public-entry.test.ts` | Module system is planned for the libraries epic. |
| Parser/runtime | Variable declarations | Supported | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts` | Qualified type checking is planned. |
| Parser/runtime | `var` / `varip` | Partial | `tests/compat/pine-language.test.ts`; `src/runtime/engine.test.ts` | Intrabar `varip` parity and nested-scope edge cases remain. |
| Parser/runtime | Reassignment `:=` | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-unsupported.test.ts` | Identifier and array index assignment are supported; member assignment has an explicit planned diagnostic until UDT/reference fields land. |
| Parser/runtime | Compound assignment | Partial | `tests/parser/parser.test.ts`; `tests/runtime/runtime.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-unsupported.test.ts` | Identifier and array index compound assignment are supported; member compound assignment has an explicit planned diagnostic until UDT/reference fields land. |
| Parser/runtime | Tuple destructuring | Supported | `tests/compat/pine-basics.test.ts` | Broader type diagnostics are planned. |
| Parser/runtime | Wrapped and continued expressions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Multiline declarations, calls, arrays, tuple patterns, index access, parenthesized expressions, and line continuations after operators are supported. Leading comparison, logical, multiplicative, `+`, and ternary operators are supported; leading `-` remains planned because it conflicts with negative literals in indented Pine bodies. |
| Parser/runtime | `if` / `else if` / `else` | Supported | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Nested indentation hardening continues under core semantics. |
| Parser/runtime | Ternary `?:` | Supported | `tests/runtime/runtime.test.ts`; `tests/compat/pine-visuals.test.ts` | Broader `na` truthiness fixtures are planned. |
| Parser/runtime | `for` loops | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts` | Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | `while`, `break`, `continue` | Supported | `tests/parser/parser.test.ts`; `src/runtime/engine.test.ts`; `tests/compat/pine-control-time.test.ts`; `tests/compat/pine-language.test.ts` | Runtime limits are enforced; broader performance/sandbox tuning remains in the limits epic. |
| Parser/runtime | User-defined functions | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-language.test.ts` | Single-line and multiline UDFs, named arguments, default parameters, invalid call-shape diagnostics, branch and loop returns, and recursive-call diagnostics are covered. Deeper nested block parsing and call-site series parity need hardening. |
| Parser/runtime | Methods, e.g. `arr.push(x)` | Partial | `tests/compat/pine-arrays.test.ts`; `src/runtime/arrays.test.ts` | Non-array methods require UDT/method parity work. |
| Parser/runtime | `switch` | Partial | `tests/parser/parser.test.ts`; `tests/compat/pine-control-time.test.ts` | Exhaustive type diagnostics are planned. |
| Parser/runtime | User-defined types | Unsupported | Roadmap Epic 12 | UDT parsing/runtime are planned. |

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
| Built-ins | Time functions | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-control-time.test.ts` | Higher-timeframe aggregation and named timezone databases remain. |
| Built-ins | `color.*` | Partial | `tests/compat/pine-builtins.test.ts`; `tests/compat/pine-visuals.test.ts` | Exact named constants and theme-sensitive behavior remain. |
| Built-ins | `str.*` | Partial | `tests/compat/pine-builtins.test.ts` | Formatting and Unicode edge cases remain. |
| Built-ins | `array.*` | Partial | `src/runtime/arrays.test.ts`; `tests/compat/pine-arrays.test.ts`; `tests/compat/pine-builtins.test.ts` | Full array reference inventory and edge cases remain. |
| Built-ins | `runtime.*` | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts` | Only `runtime.error()` is implemented. |
| Built-ins | Global helpers | Partial | `src/runtime/engine.test.ts`; `tests/compat/pine-language.test.ts` | `na`, `nz`, `fixnan`, and primitive casts are covered for common numeric/source idioms; broader type-system diagnostics and exact color overload parity are planned. |
| Built-ins | `map.*` | Planned | `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 12 | Namespace emits unsupported diagnostics; runtime/storage/type support is not implemented. |
| Built-ins | `matrix.*` | Planned | `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 12 | Namespace emits unsupported diagnostics; runtime/storage/type support is not implemented. |
| Data | `request.*` | Planned | `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 8 | Namespace emits unsupported diagnostics; requires deterministic datafeed contract. |
| Data | `ticker.*` | Planned | `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 9 | Namespace emits unsupported diagnostics; ticker constructors and synthetic data are not implemented. |

### Visual Outputs

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Visuals | `plot` | Partial | `tests/compat/pine-basics.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Full style/z-order/display parity remains. |
| Visuals | `hline` | Partial | `tests/compat/pine-visuals.test.ts` | Full settings and display parity remain. |
| Visuals | `fill` | Partial | `tests/compat/pine-visuals.test.ts` | Advanced parameters and color series behavior remain. |
| Visuals | `bgcolor` | Supported | `tests/compat/pine-visuals.test.ts` | None known for current output shape. |
| Visuals | `plotshape`, `plotchar`, `plotarrow` | Partial | `tests/compat/pine-visuals.test.ts` | Styling/location/display parity remains. |
| Visuals | `barcolor` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | None known for current output shape. |
| Visuals | `plotbar`, `plotcandle` | Supported | `tests/compat/pine-visuals.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Edge-case parity will continue under visual epic. |
| Drawings | `label.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | GC limits, full style parity, and realtime rollback remain. |
| Drawings | `line.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | `chart.point`, GC limits, full style geometry, realtime rollback remain. |
| Drawings | `linefill.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Full line coordinate/object parity remains. |
| Drawings | `box.*` | Partial | `src/runtime/drawings/builtins.test.ts`; `packages/tealchart/src/TealchartRenderer.test.ts` | Text layout, `chart.point`, GC limits, and complete styling remain. |
| Drawings | `polyline.*` | Planned | `tests/compat/pine-unsupported.test.ts`; Roadmap Epic 11 | Namespace emits unsupported diagnostics; lifecycle and renderer are planned. |
| Drawings | `table.*` | Planned | `src/runtime/drawings/builtins.test.ts` | Namespace emits unsupported diagnostics; lifecycle and renderer are planned. |

### Alerts, Strategies, And Data

| Area | Feature | Status | Evidence | Remaining gaps |
| --- | --- | --- | --- | --- |
| Alerts | `alertcondition` / `alert` | Partial | `tests/compat/pine-control-time.test.ts`; `src/runtime/engine.test.ts` | UI integration and full throttling parity remain. |
| Strategies | `strategy.*` | Partial | `src/parser/parser.test.ts`; `src/runtime/engine.test.ts` | Broker emulator, ledger, fills, positions, and tester state are planned. |
| Data | Multi-timeframe requests | Planned | Roadmap Epic 8 | Requires deterministic gap/lookahead semantics. |
| Data | Other-symbol requests | Planned | Roadmap Epic 8 | Requires chart datafeed contract and caching strategy. |

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
