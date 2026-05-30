# TealScript Pine Compatibility Matrix

TealScript is Pine-inspired, not a drop-in Pine runtime. This matrix tracks the
subset needed for AI-generated chart indicators to behave like common Pine
Script v5/v6 indicators.

Status values:

- `Supported` means syntax parses and runtime behavior is covered by tests.
- `Partial` means common usage works, but important Pine behavior is missing.
- `Planned` means the feature is intentionally in scope.
- `Unsupported` means scripts should receive a clear diagnostic or rewrite path.

## Target Order

1. Common indicator snippets compile and render: moving averages, oscillators,
   volatility bands, pivots, and divergence helpers.
2. User-defined functions and function-local series state behave predictably.
3. Mutable data structures cover common Pine array patterns.
4. The most-used `ta.*`, `math.*`, `str.*`, `input.*`, and visual built-ins are
   available with Pine-compatible names and argument shapes.
5. Multi-timeframe data, drawings, alerts, and strategies follow after the core
   indicator subset is stable.

For each major compatibility epic, add deterministic golden fixtures for the
new behavior and, at checkpoint boundaries, add reduced smoke fixtures inspired
by real Pine examples from official docs or public indicator idioms.

## Syntax

| Pine feature | Status | Notes |
| --- | --- | --- |
| `//@version=6` annotation | Supported | Parser defaults to version 6. |
| `//@version=5` annotation | Partial | Accepted as a numeric version; no version-specific behavior yet. |
| `indicator(...)` | Partial | Title, `overlay`, and `precision` are used. Other declaration options are parsed but mostly ignored. |
| `strategy(...)` | Planned | Should parse with an explicit unsupported/runtime diagnostic before strategy execution exists. |
| `library(...)` / `import` | Unsupported | Out of scope until reusable script modules are designed. |
| Variable declarations | Supported | Untyped and typed declarations parse. |
| `var` / `varip` | Partial | Basic persistence exists; function and nested-scope edge cases need hardening. |
| Reassignment `:=` | Supported | Identifier assignment works. Member/index assignment is not implemented. |
| Compound assignment | Partial | Identifier compound assignment works. |
| Tuple destructuring | Supported | Used by multi-return built-ins such as `ta.macd`. |
| `if` / `else if` / `else` | Supported | Statement form is implemented. |
| Ternary `?:` | Supported | Runtime truthiness needs broader Pine compatibility tests. |
| `for` loops | Partial | Numeric `for = ... to ... by ...` is supported. Collection loops are not. |
| `while`, `break`, `continue` | Supported | Loop safety limit exists. |
| User-defined functions | Planned | Required for common Pine snippets. |
| Methods, e.g. `arr.push(x)` | Planned | Should lower to namespaced built-ins where possible. |
| `switch` | Planned | Common enough to parse after user functions. |
| User-defined types | Unsupported | Lower priority than indicators and arrays. |

## Runtime Semantics

| Pine feature | Status | Notes |
| --- | --- | --- |
| Bar-by-bar execution | Supported | Scripts execute across loaded bars. |
| History references `x[n]` | Partial | Series and arrays support indexing; dynamic and invalid index behavior needs more tests. |
| `na` value | Partial | Represented with `NaN`; propagation and bool behavior need Pine v6 coverage. |
| Built-in price series | Supported | `open`, `high`, `low`, `close`, `volume`, `time`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`. |
| `bar_index` / `last_bar_index` | Supported | Available as runtime identifiers. |
| `barstate.*` | Partial | Core booleans exist; realtime semantics need additional coverage. |
| `syminfo.*` | Partial | Static defaults are present. |
| `timeframe.*` | Partial | Static defaults are present. |
| Function-local series state | Planned | Needed before UDF-heavy Pine snippets are reliable. |
| `max_bars_back` | Planned | Declaration is parsed but not enforced/inferred. |

## Scope And Series Audit

Resolved in the scope/series hardening PR:

- Regular variables are reset on each bar. Previously, redeclaration replaced
  the variable entry and lost accumulated series history for derived values
  such as `dist = close - ta.sma(close, 3)` followed by `dist[1]`.
- `var` and `varip` persistence now works at root and function-local scopes.

Remaining gaps:

- Flat multiline user-defined functions return the last expression statement.
  Branch-return behavior for `if`/`else` function bodies is not implemented yet.
- Nested indented blocks inside user-defined functions expose limitations in the
  simplified indentation grammar and need a dedicated parser pass.

## Built-ins

| Namespace | Status | Notes |
| --- | --- | --- |
| `math.*` | Partial | Common numeric functions exist. Constants and Pine-specific helpers are incomplete. |
| `ta.*` | Partial | Includes SMA, EMA, RSI, MACD, ATR, BB, VWAP, Supertrend, DMI, SAR, pivots, `barssince`, `valuewhen`, `vwma`, `highestbars`, `lowestbars`, `cross`, `range`, and more. |
| `input.*` | Partial | Generic `input()`, int, float, bool, string, color, source, time, symbol, timeframe, session, and text area exist. Advanced UI/display behavior is incomplete. |
| `color.*` | Partial | Core named colors and `color.new()` exist. RGB/from-gradient helpers are missing. |
| `str.*` | Partial | Common conversion, format, search, substring, case, trim, and replace helpers exist. |
| `array.*` | Planned | High priority for common Pine idioms. |
| `map.*` / `matrix.*` | Planned | Lower priority than arrays. |
| `request.*` | Planned | Requires Tealchart datafeed design. Start with `request.security()`. |

## Visual Outputs

| Pine feature | Status | Notes |
| --- | --- | --- |
| `plot` | Partial | Common line styles work; full style/parameter parity is incomplete. |
| `hline` | Partial | Static horizontal lines work. Handle semantics need fill coverage. |
| `fill` | Partial | Uses plot IDs, not full Pine handle semantics. |
| `bgcolor` | Supported | Produces background outputs. |
| `plotshape`, `plotchar`, `plotarrow` | Partial | Core outputs exist; styling parity is incomplete. |
| `barcolor` | Planned | Needs chart renderer integration. |
| `plotbar`, `plotcandle` | Planned | Needed for some indicator overlays. |
| `line.*`, `label.*`, `box.*`, `table.*` | Planned | Requires object lifecycle and renderer support. |

## Alerts, Strategies, And Data

| Pine feature | Status | Notes |
| --- | --- | --- |
| `alertcondition` / `alert` | Planned | Should collect runtime events before UI integration. |
| `strategy.*` | Unsupported | Parse diagnostics first, backtest ledger later. |
| Multi-timeframe requests | Planned | Needs deterministic gap/lookahead semantics. |
| Other-symbol requests | Planned | Needs chart datafeed contract and caching strategy. |

## PR Roadmap

1. Compatibility matrix and golden test harness.
2. User-defined functions.
3. Function scope and series semantics hardening.
4. `array.*` MVP.
5. Common missing `ta.*` functions.

## Common `ta.*` Coverage

The common TA helper pass covers event helpers (`ta.barssince`,
`ta.valuewhen`), volume/window helpers (`ta.vwma`, `ta.highestbars`,
`ta.lowestbars`), and compatibility aliases/helpers (`ta.cross`, `ta.range`).
These are covered in the golden compatibility harness.

## Common `str.*` Coverage

The common string helper pass covers `str.tostring`, `str.format`,
`str.length`, `str.contains`, `str.startswith`, `str.endswith`, `str.pos`,
`str.substring`, `str.upper`, `str.lower`, `str.trim`, `str.replace`, and
`str.replace_all`. These helpers support generated indicators that assemble
labels, table text, and debug strings.

## Common `input.*` Coverage

The common input helper pass covers generic `input()` inference, common typed
helpers (`input.time`, `input.timeframe`, `input.symbol`, `input.session`,
`input.text_area`), and common metadata (`options`, `tooltip`, `group`,
`inline`, `confirm`, `display`) so generated scripts retain Pine-like control
definitions.
