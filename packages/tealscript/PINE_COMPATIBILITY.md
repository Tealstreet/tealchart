# TealScript Pine Compatibility Matrix

TealScript's north star is copy-paste compatibility with public TradingView
Pine scripts: pasted PineScript should parse and run in the TealScript runtime
without manual rewrites. This matrix tracks current support, partial behavior,
and known gaps on the path to that goal. TradingView-identical rendering is the
final target, but early compatibility status can be useful when script
execution is correct and visual output is approximate.

For the broader full-parity plan, see
[`PINE_PARITY_EPICS.md`](./PINE_PARITY_EPICS.md).

For the canonical compatibility matrix, inventory row format, and parity PR
checklist, see
[`PINE_COMPATIBILITY_INVENTORY.md`](./PINE_COMPATIBILITY_INVENTORY.md).

Status values:

- `Supported` means syntax parses and runtime behavior is covered by tests.
- `Partial` means common usage works, but important Pine behavior is missing.
- `Planned` means the feature is intentionally in scope.
- `Unsupported` means scripts should receive a clear diagnostic or rewrite path.

## Target Order

1. Measure public-script failures with a corpus runner and failure taxonomy.
2. Public Pine scripts parse without rewrites.
3. Parsed scripts execute over deterministic bars without runtime failures.
4. Common public-script idioms produce usable plots, drawings, alerts, logs, or
   strategy metadata.
5. The most-used built-in namespaces and overload shapes unblock broad script
   coverage.
6. Basic renderer routing makes emitted outputs visible and usable.
7. Rendering and TradingView-exact edge cases tighten after execution
   compatibility is broad.

For each major compatibility epic, add deterministic golden fixtures for the
new behavior and, at checkpoint boundaries, add reduced smoke fixtures inspired
by real Pine examples from official docs or public indicator idioms.
The corpus harness treats omitted canonical stages as `not_run` failures in
pass-rate summaries, while explicitly marked `skipped` stages are pass-neutral
for cases that intentionally stop before datafeed or render comparison.
The current real-idiom checkpoint suite covers official built-ins, barstate plus
arrays, bar coloring, alerts, strategy entry/exit flows, request-limit reuse,
explicit `max_bars_back` metadata, official lower-timeframe request arrays,
official synthetic ticker requests, official dynamic sessions, official
timeframe comparisons, official plot-style payloads, and public MTF,
divergence, volatility-band overlays, session-filter, session-state,
dashboard-table, multi-symbol screener, currency conversion, earnings event
markers, corporate-action overlays, financial dashboards, economic macro
overlays, seed dataset overlays, array signal queues, map signal dashboards,
matrix scoreboards, drawing-zone, linefill-channel, custom-candle, and
library-helper idioms.
Public-source coverage also includes alert signal metadata, direct alert
emission, Heikin-Ashi synthetic ticker trend requests, public zigzag polylines,
public strategy performance tables, plus UDT state objects updated through
user-defined methods.
Strategy coverage includes source-linked entry/exit flows, broker path behavior,
bar magnifier, stop-limit orders, selective immediate closes, fill-alert
suppression, entry-direction, max-position, intraday filled-order, and
consecutive loss-day risk rules, intraday loss and drawdown caps, recalculation
checkpoints, and a reduced public fixed-bracket strategy idiom, public
trailing-stop strategy idiom, and public stats-table output.

## Current Matrix

The canonical row-level compatibility matrix lives in
[`PINE_COMPATIBILITY_INVENTORY.md`](./PINE_COMPATIBILITY_INVENTORY.md). Keep row
status, evidence, and remaining gaps there so implementation status has one
source of truth. The sections below provide narrative notes for implemented
coverage and known limitations.

## Scope And Series Audit

Resolved in the scope/series hardening PR:

- Regular variables are reset on each bar. Previously, redeclaration replaced
  the variable entry and lost accumulated series history for derived values
  such as `dist = close - ta.sma(close, 3)` followed by `dist[1]`.
- `var` and `varip` persistence now works at root and function-local scopes.
  Local and imported user-defined function and method state is isolated by
  written call site so separate calls to the same helper do not share
  function-local `var` variables. Function-local `if` and loop block scopes
  persist across bars for nested-block `var` values and regular series history.

Covered behavior and remaining gaps:

- Flat multiline user-defined functions return the last expression statement.
- Pine-style wrapped delimiter syntax is supported for multiline
  `indicator()`/`strategy()` declarations, function calls, array literals, tuple
  destructuring, index access, and parenthesized expressions. Parser audit
  fixtures also cover public-script-shaped wrapped `request.security()`
  arguments with multiline ternary expressions inside nested UDF blocks, inline
  comments on wrapped continuation lines, plus trailing commas in wrapped
  user-defined function and method signatures.
- Function and declaration calls support Pine named arguments, including the
  reserved parameter key `type=` used by common strategy risk APIs.
  Semantic diagnostics reject non-boolean declaration flags on common
  `indicator()`, `strategy()`, and `library()` headers plus non-numeric
  `indicator()` / `strategy()` count and precision settings before runtime coercion.
- Top-level nested control blocks share the deeper block parser used by
  function bodies, including nested `if` / `else` dedents with reassignment
  statements.
- Tuple destructuring preserves known positional types from literal tuple
  expressions, direct declaration `if`, `switch`, and loop initializers, direct
  and compatible if/else plus partial-if user-function tuple returns, direct
  user-function loop and defaulted or partial switch tuple returns, compatible
  user-method tuple returns, and supported tuple-returning TA calls including
  `ta.kc()`, so downstream assignment diagnostics can use destructured names. Direct tuple
  initializers, including known local user-call tuple returns and mixed-shape
  user-call control returns, and direct control initializer tuple arms,
  including arm-local user-call tuple returns, diagnose obvious non-tuple and
  arity mismatches.
- Operator line continuations are supported after arithmetic, comparison,
  logical, unary, and ternary operators. Leading comparison, logical,
  multiplicative, numeric and non-numeric `-`, `+`, and ternary operators are
  also supported.
- User-defined function bodies can return expression results from `if` /
  `else if` / `else` branches, including partial `if` expressions with no
  `else` when the present branch has an inferable value. Nested UDF `if`
  branches are covered through ninth-level public-script layouts.
- Variable declarations can use `if` / `else if` / `else` initializers, including
  typed declarations and partial `if` initializers that evaluate to `na` when no
  branch yields a value.
- Declaration and reassignment initializers may start on an indented
  continuation line after `=`, `:=`, and compound assignment operators,
  including typed declarations, tuple declarations, UDF-local declarations, and
  UDT field defaults.
- User-defined function bodies can return the last expression result from
  numeric `for`, collection `for ... in`, and `while` loop bodies.
- Direct user-defined function calls infer semantic return types and preserve
  call-site qualifiers for annotated parameters.
- Numeric `for`, collection `for ... in`, and `while` loops can be used as
  expressions. The expression value is the last body expression reached,
  including across `break` and `continue` control flow.
- User-defined function parameters support Pine-style default arguments. Default
  expressions are evaluated at the call site when the caller omits the
  corresponding positional or named argument.
- User-defined function and local method calls report clear diagnostics for
  unknown named arguments, duplicate positional/named bindings, positional
  arguments after named arguments, excess positional arguments, missing required
  arguments, and duplicate named arguments.
- Known built-in calls report clear diagnostics for unknown named arguments,
  duplicate positional/named bindings, duplicate named arguments, missing
  required arguments, and invalid positional arguments after named arguments on
  strict signatures. Visual output diagnostics cover `plot()`, `hline()`,
  `fill()` alias bindings, OHLC `plotbar()` / `plotcandle()` arguments, and
  marker missing, unknown, and duplicate argument bindings, plus non-string
  visual title/text arguments, while semantic analysis preserves `plot()` and
  `hline()` handle return types for downstream
  assignment diagnostics. Drawing
  constructors distinguish coordinate and `chart.point` overload bindings for
  `line.new()`
  and `box.new()`. Worker protocol and wrapper coverage preserve structured
  semantic diagnostic codes, messages, severities, locations, and freshness
  metadata for editor-facing error callbacks.
- `ta.vwap()` accepts Pine-style default-source calls plus `source`/`anchor`
  positional, named, and named-prefix mixed argument forms. Runtime VWAP
  accumulators are isolated per call site and reset when `anchor` is true.
  Semantic analysis preserves scalar VWAP calls as `series float` while the
  `stdev_mult` overload returns `[vwap, upper, lower]` band tuples with
  weighted cumulative standard-deviation bands.
- Recursive user-defined function calls are rejected with an explicit diagnostic
  instead of overflowing the runtime stack.
- Arbitrary nested indented blocks still use a simplified indentation grammar
  and need continued hardening beyond the covered public-script layouts.
- The parser wrapper rejects scripts larger than 1,000,000 UTF-16 code units
  and parsed ASTs deeper than 1,000 nodes. These are TealScript sandbox limits
  intended to keep generated or hostile scripts from exhausting parser
  resources.
- Runtime execution results include profile counters for elapsed time, bars,
  statements, expressions, built-in calls, unique request contexts, inferred
  history depth, and runtime errors. Worker result bundles carry the same
  profile so host charts can inspect expensive scripts without running them on
  the main thread. Worker request freshness metadata keeps stale realtime
  `updateBar()` tick results from replacing newer ticks.

## Common History Reference Coverage

The history reference pass covers literal offsets such as `close[1]`, dynamic
offsets such as `close[length]`, fractional offsets truncated toward zero,
derived regular-series history, and unavailable or future offsets returning
`na`/`null` plot values instead of throwing. Runtime profile metadata reports
literal, simple numeric-alias, `input.int()`/`input.float()` default-derived,
selected pure `math.*` helper-derived offsets including min/max, rounding,
averaging, power, and square-root helpers, selected numeric normalization
helpers, and input-gated simple conditional history offsets, including static numeric
comparisons, even when they sit behind unexecuted branches. Covered rolling
window helper calls such as `math.sum()`, `ta.range()`, trend helpers
`ta.rising()`/`ta.falling()`, statistical helpers such as `ta.dev()`,
`ta.correlation()`, median/mode, percentile, and percent-rank helpers,
momentum helpers such as `ta.cmo()`, `ta.mom()`, and `ta.roc()`, and common
band, average, and regression helpers such as `ta.bb()`, `ta.bbw()`,
`ta.vwma()`, `ta.wma()`, `ta.alma()`, `ta.cci()`, and `ta.linreg()`, plus
fixed/default lookback helpers such as `ta.cross()`, `ta.crossover()`,
`ta.crossunder()`, `ta.change(source)`, and `ta.swma()`, plus common `ta.*`
source-window, retained-source, recursive, and selected default-argument helpers
such as `ta.macd(close)`, `ta.cmo(source)`, `ta.mom(source)`, `ta.roc(source)`,
and `ta.cci(source)`, plus oscillator helpers such as `ta.stoch()`, `ta.mfi()`,
and `ta.wpr()`, plus common TA helpers such as `ta.atr()`, `ta.hma()`,
`ta.kc()`, `ta.kcw()`, `ta.tsi()`, `ta.dmi()`,
`ta.supertrend()`, `ta.sar()`, `ta.obv()`, and `ta.tr()` also contribute static
lookback requirements when their length or direct source requirements are
static, including default-source highest/lowest lookback forms and pivot
left/right windows. Runtime-observed direct OHLC helper lookbacks such as
`ta.wpr()`, `ta.tr()`, and TA variables that read prior close/volume bars are
also profiled. Truly dynamic series offsets and dynamic helper
lengths are still inferred from observed runtime access.

## Roadmaps

Use this file for current compatibility status only. Use
[`PINE_PARITY_EPICS.md`](./PINE_PARITY_EPICS.md) for feature-parity sequencing
and [`PINE_HYGIENE_EPICS.md`](./PINE_HYGIENE_EPICS.md) for structural cleanup
that supports the parity work.

## Common `ta.*` Coverage

The common TA helper pass covers event helpers (`ta.barssince`,
`ta.valuewhen`), cumulative/window helpers (`ta.cum`, `ta.dev`,
`ta.variance`, `ta.correlation`, `ta.cog`, `ta.kc`, `ta.kcw`, `ta.bb`, `ta.bbw`, `ta.linreg`, `ta.vwma`, `ta.swma`,
`ta.alma`, `ta.highestbars`, `ta.lowestbars`), oscillator helpers (`ta.stoch`, `ta.mfi`,
`ta.wpr`, `ta.cci`, `ta.cmo`, `ta.tsi`), and compatibility
aliases/helpers (`ta.change` numeric and boolean forms, `ta.cross`, `ta.range`,
`ta.rising`, and `ta.falling`). The
statistical helper pass covers `ta.median`, `ta.mode`,
`ta.percentile_nearest_rank`, `ta.percentile_linear_interpolation`, and
`ta.percentrank`. Covered DMI, SAR, pivot, and linear regression helpers accept
common Pine named arguments, and pivot helpers support default-source
two-argument calls. Event and cross helpers accept named `condition`/`source`
arguments and cross helper `source1`/`source2` arguments. Numeric `ta.change()`,
`ta.rsi()`, `ta.atr()`, `ta.hma()`, pivot helpers, and cross helpers preserve
per-call previous values for derived source expressions. These are covered in
the golden compatibility harness. Common rolling helpers preserve direct
OHLCV, quote, and derived OHLC source identity for calls such as
`ta.sma(open, 2)`, `math.sum(open, 2)`, and `ta.correlation(open, close, 2)`,
so equal current-bar source values no longer collapse to the wrong history
series. Simple source aliases such as `src = open`, alias-to-alias
declarations, and `:=` reassignment to a known source preserve the same
identity for rolling helper windows while keeping normal alias history
references such as `src[1]` numeric. `input.source()` defaults and source-name
overrides preserve selected source identity for the same helpers, including
delayed calls that first execute after warmup bars. UDF, imported library
function, and method parameters also carry known source identity, so public
helper wrappers around rolling helpers can use historical source bars on
delayed calls, and simple UDF or method returns of those source parameters keep
that identity for downstream delayed helper windows. Same-source ternary returns
such as `condition ? src : src` preserve the same identity through local and
imported helpers, as do `switch` returns whose expression or multiline block
arms all return the same known source and multiline block `if` helper wrappers
whose branches return the same source. Same-source `if` initializers also retain
source identity for downstream delayed helper windows. Pure arithmetic
expressions over known OHLCV, quote, derived OHLC, and source-parameter series
also carry source identity through helper returns for downstream delayed rolling
windows, including equivalent arithmetic ternary, `switch`, and multiline block
`if` branch wrappers plus block-local `if` initializers.
`ta.rma()`, `ta.rsi()`, and
`ta.atr()` use
Pine's SMA-seeded RMA warmup before recursive smoothing; `ta.atr()` is covered
as the RMA of `ta.tr(true)`.
Recursive `ta.atr()` smoothing state, `ta.rsi()`
smoothing state, `ta.dmi()` tuple smoothing state, `ta.supertrend()` tuple
state, and `ta.sar()` trend state are isolated per call site so repeated
same-parameter calls do not share accumulators. Semantic
analysis preserves known scalar TA helper return types for downstream
assignment diagnostics, including scalar `ta.vwap()` overloads and
source-preserving `ta.change()` and `ta.valuewhen()` results, and rejects
common non-numeric TA helper arguments plus non-boolean TA condition and option
arguments before runtime.

## Common `str.*` Coverage

The common string helper pass covers `str.tostring`, `str.tonumber`,
`str.format_time`, `str.format`,
`str.length`, `str.contains`, `str.startswith`, `str.endswith`, `str.pos`,
`str.substring`, `str.match`, `str.split`, `str.upper`, `str.lower`,
`str.trim`, `str.replace`, `str.replace_all`, and `str.repeat`. These helpers
support generated indicators that assemble labels, table text, and debug
strings. `str.format()` supports Pine-style numeric placeholder modifiers for
decimal masks, integer, currency, and percent output, while
`str.format_time()` supports year `y`/`yy`/`yyyy`, month-name `MMM`/`MMMM`,
weekday-name `E`/`EEEE`, day-of-year `D`/`DD`/`DDD`, fractional-second
`S`/`SS`/`SSS`, week-of-year `w`/`ww`, week-of-month `W`, 12-hour `h`/`hh`,
AM/PM `a`, and timezone-name `z`/`zzzz` tokens. Semantic analysis preserves
known string helper return types for downstream assignment diagnostics,
including `str.split()` array element types, and rejects non-string string
parameters plus non-numeric time, position, count, and occurrence parameters.

## Common `input.*` Coverage

The common input helper pass covers generic `input()` inference, common typed
helpers (`input.price`, `input.time`, `input.timeframe`, `input.symbol`, `input.session`,
`input.text_area`, `input.enum`), and common metadata (`options`, `tooltip`, `group`,
`inline`, `confirm`, `display`, `active`) so generated scripts retain Pine-like control
definitions. Semantic analysis preserves known `input.*` return types for
downstream assignment diagnostics, including `input.source()` defval source
types and `input.enum()` defval enum types. It also reports Pine-style diagnostics for typed default-value
mismatches, literal default `minval` / `maxval` / `options` constraint
violations, invalid literal `display` option values, and `input.int()` /
`input.float()` calls that mix `options` with range-only
`minval`/`maxval`/`step` arguments.

## Common `array.*` Coverage

See `PINE_ARRAY_REFERENCE_INVENTORY.md` for the detailed local implementation
inventory and remaining array audit items.

Semantic analysis preserves array element types from `array.new<T>()` and
common typed constructors such as `array.new_float()` and `array.new_label()`,
which keeps downstream diagnostics aligned with Pine's constructor templates.
Known mutable arrays report conservative element-type mismatches for common
mutation helpers such as `push`, `unshift`, `set`, `insert`, and `fill`.
`array.sort()` supports UDT arrays sorted by const int/string `sort_field`
arguments, with matching semantic diagnostics for non-const sort fields.
Array-returning helpers preserve useful element types for follow-on checks,
including `copy`, `slice`, `concat`, `abs`, `standardize`, and `sort_indices`.
Known `concat` calls report conservative source-array element mismatches while
allowing Pine-style numeric widening such as `array<int>` into `array<float>`.
Collection loop values inherit known array/map element types, array tuple loop
indices and numeric loop counters are tracked as integers, and map tuple loop
keys retain their key type for diagnostics inside loop bodies.
Array index reads and element-returning helpers such as `get`, `first`, `last`,
`pop`, `shift`, and `remove` preserve known element types.
Scalar-returning array helpers infer primitive return types for common boolean,
integer, float, and string helpers such as `includes`, `size`, `avg`, and `join`.
Homogeneous array literals and `array.from(...)` infer primitive, reference, and
UDT element types, including `int` to `float` widening for numeric mixes; mixed
arrays fall back to unknown element types.
Source-linked public checkpoint coverage also exercises persistent bounded
signal arrays, queue shifting, copied sorted views, aggregate helpers, and
last-bar table output.

The array pass covers the generic constructor (`array.new<T>`), typed
constructors (`array.new_float`, `array.new_int`, `array.new_bool`,
`array.new_string`, `array.new_color`, and drawing-object array constructors),
`array.size`, `array.get`, `array.set`, `array.push`,
`array.pop`, `array.shift`, `array.unshift`, `array.clear`, `array.from`,
`array.copy`, `array.first`, `array.last`, `array.includes`, `array.every`,
`array.some`, `array.indexof`, `array.lastindexof`, binary-search helpers,
`array.insert`, `array.remove`, `array.fill`, `array.abs`, `array.min`,
`array.max`, `array.sum`, `array.avg`, `array.range`, `array.median`,
`array.mode`, `array.variance`, `array.stdev`, `array.covariance`,
percentile helpers, `array.standardize`, `array.sort`, `array.sort_indices`,
`array.reverse`, `array.join`, `array.concat`, and `array.slice` window
semantics. Common Pine method syntax now lowers to the same runtime built-ins
for calls such as `values.push(close)`, `values.size()`, `values.get(index)`,
`values.avg()`, `values.standardize()`, and `values.sort_indices()`. The
checkpoint fixtures follow rolling-window indicator idioms and constant-array
helper idioms where arrays are copied, searched, summarized, ordered, sliced,
joined, concatenated, mutated, and compared for covariance.
Core array constructors, accessors, mutators, window helpers, and ordering
helpers accept Pine-style named arguments such as `size`, `initial_value`, `id`,
`index`, `value`, `index_from`, `index_to`, `order`, and `sort_field`.
Statistical and percentile helpers also accept `id1`, `id2`, `biased`, and
`percentage` where those parameters apply.
Direct array index assignment such as `values[0] := close` is supported.
Semantic diagnostics reject obvious non-array index assignment targets,
non-numeric array assignment indexes, and mismatched values for arrays with
known element types.

## Common `matrix.*` Coverage

The matrix pass covers typed constructors (`matrix.new<type>`, `matrix.new_float`,
`matrix.new_int`, `matrix.new_bool`, `matrix.new_string`, `matrix.new_color`),
semantic inference/diagnostics for generic constructor templates plus known
`matrix.get`, `matrix.set`, and `matrix.fill` element types, shape and access helpers (`matrix.rows`, `matrix.columns`, `matrix.elements_count`,
`matrix.get`, `matrix.set`, `matrix.copy`, `matrix.row`, `matrix.col`,
`matrix.column`, `matrix.is_square`, `matrix.is_valid`), mutation and shape
helpers (`matrix.fill` for full-matrix and ranged fills, `matrix.reshape`, `matrix.add_row`, `matrix.add_col`,
`matrix.add_column`, `matrix.remove_row`, `matrix.remove_col`,
`matrix.remove_column`, `matrix.swap_rows`, `matrix.swap_columns`,
`matrix.reverse`, `matrix.transpose`), inspection helpers (`matrix.is_zero`,
`matrix.is_identity`, `matrix.is_diagonal`, `matrix.is_antidiagonal`,
`matrix.is_symmetric`, `matrix.is_antisymmetric`, `matrix.is_triangular`,
`matrix.is_stochastic`, `matrix.is_binary`), and numeric aggregate helpers
(`matrix.avg`, `matrix.min`, `matrix.max`, `matrix.median`, `matrix.mode`).
Collection operations include row sorting with `matrix.sort()` (including UDT
row sorting by const int/string `sort_field` field name or index) and copied
range extraction with `matrix.submatrix()`, including named
`from_row`/`to_row`/`from_column`/`to_column` arguments. Common matrix
constructors and core helpers accept Pine-style named arguments such as `rows`,
`columns`, `initial_value`, `id`, `row`, `column`, `value`, `array_id`, `row1`,
`row2`, `column1`, `column2`, and `id2`. Matrix concatenation coverage
includes `matrix.concat()` and method-form row appends into the left-hand
matrix. Matrix row iteration coverage includes `for row in values` and
`for [index, row] in values`, where each row is exposed as an array copy.
Matrix arithmetic coverage includes `matrix.sum()` and `matrix.diff()` with
same-shape matrix operands and scalar operands, `matrix.mult()` for
matrix-by-matrix, matrix-by-array, and matrix-by-scalar multiplication,
`matrix.pow()` for non-negative integer powers, and `matrix.trace()` for square
matrices. Linear algebra coverage includes `matrix.det()` and `matrix.inv()` for
square matrices, `matrix.pinv()` for rectangular or rank-deficient matrices,
`matrix.rank()` for square or rectangular matrices, `matrix.eigenvalues()` for
real eigenvalues of square numeric matrices, `matrix.eigenvectors()` for real
eigenvector columns, and `matrix.kron()` for Kronecker products. Matrix
arithmetic, sorting, and linear algebra helpers accept Pine-style named
arguments such as `id1`, `id2`, `power`, `column`, `order`, and `sort_field`.
Common Pine
method syntax lowers to the
same runtime built-ins for calls such as
`values.set(row, column, close)`, `values.add_row(array.from(...))`,
`values.transpose()`, `values.sort(1, order.descending)`,
`values.submatrix(0, 2, 0, 2)`, `values.fill(9, 0, 1, 1, 3)`,
`values.concat(other)`, `values.sum(other)`, `values.mult(other)`,
`values.pow(2)`, `values.trace()`, `values.det()`, `values.inv()`,
`values.pinv()`, `values.rank()`, `values.eigenvalues()`,
`values.eigenvectors()`, `values.kron(other)`, `values.is_identity()`, and
`values.avg()`.
Source-linked public checkpoint coverage now also exercises a common matrix
scoreboard idiom that builds weighted factor matrices, reads row arrays,
transposes score matrices, aggregates scores, and renders the last-bar result
through a table.

## Common `map.*` Coverage

The map pass covers `map.new`, `map.size`, `map.put`, `map.get`,
`map.contains`, `map.remove`, `map.clear`, `map.copy`, `map.keys`,
`map.values`, and `map.put_all`, including method-call forms such as
`data.put(key, value)` and `data.get(key)`. Missing `get` and `remove` calls
return `na`, `map.put()` returns the prior value for an existing key or `na`
for a new key, replacing an existing key preserves insertion order, and
`map.keys()` / `map.values()` return copied Pine arrays ordered by map insertion.
Map built-ins accept named reference arguments (`id`, `key`, `value`, `id2`)
for namespace and method forms, with the implicit method receiver taking
precedence over any named `id`. Map variables participate in history references
for documented idioms such as `previous = data[1]`.
Source-linked public checkpoint coverage also exercises persistent named signal
state maps, previous-value updates from `put()`, copied snapshots, key-value
iteration, missing-key checks, and table output.

The parser accepts Pine-style `map<key, value>` declarations and generic
constructor calls such as `map.new<string, float>()`. Semantic diagnostics
enforce obvious primitive key/value mismatches for known `map<K, V>` variables
on `map.put`, `map.get`, `map.contains`, and `map.remove`, including receiver
method-call forms and unannotated `map.new<K, V>()` constructor inference.
Reference and UDT map values are also checked conservatively, so
`map<string, label>` and `map<string, MyType>` reject mismatched values. Runtime
coverage includes Pine value keys, including color constants. Map loops support
the documented key-value tuple form, `for [key, value] in data`.
Bare collection container names in template positions, such as
`map<string, array>`, are rejected because bare collection types are incomplete
type identifiers. Nested collection template syntax such as
`array<array<float>>` and `map<string, array<float>>` now parses and receives
explicit semantic diagnostics because Pine does not allow collections to
directly contain other collection types.

## Common User-Defined Type Coverage

The user-defined type MVP covers top-level `type` declarations, exported type
declarations for parser compatibility, typed and untyped fields, field default
expressions, Pine-compatible missing `bool` field defaults, `varip` field
syntax, `<Type>.new()` constructors, positional and named constructor arguments,
field reads, field reassignment, compound field assignment, reference assignment
semantics, and realtime rollback for field mutations. UDT copy coverage supports
Pine's shallow `Type.copy(object)` and `object.copy()` forms, so copied UDT
fields that contain reference values still point at the same nested instances
until scripts explicitly deep-copy them.
UDT field defaults are restricted to Pine-compatible literal values or
compatible built-in variables; function calls and computed expressions are
reported before runtime.
UDTs can hold collection fields such as `array<float>`, `map<string, float>`,
and `matrix<int>`; compatibility coverage mutates those fields through Pine
method syntax, and semantic coverage reports conservative collection-reference
mismatches in local constructors and field assignments.

Compatibility fixtures include a reduced pivot-object array idiom derived from
TradingView's objects documentation, where scripts define a `pivotPoint` UDT,
push `pivotPoint.new(...)` instances into an array, retrieve objects with array
methods, and read fields from the resulting object references.
The source-linked checkpoint corpus also includes a reduced public
market-structure state idiom with wrapped UDT field defaults, first-bar
constructor initialization, persistent object mutation, and method-dispatch
state. Source-linked public UDT array checkpoint coverage now locks bounded
arrays of pivot-record UDT instances, copied snapshot reads, method-derived
scores, and last-bar dashboard table output.

User-defined `method` declarations now parse and dispatch for primitive and
UDT receiver values, including method calls that mutate and return UDT
references. The runtime uses the receiver as the method's first argument, in
line with Pine's documented method-call equivalence, and selects local UDT
method overloads by receiver type. Semantic diagnostics report calls where a
known receiver type does not match any local method receiver annotation.
Runtime evaluation of UDT method state is covered by a reduced public
market-structure object idiom.
Semantic coverage accepts local method overload declarations, and method return
inference selects local overloads by receiver specificity and annotated argument
signatures. Full and partial branch/switch plus loop control-flow method returns
infer scalar and tuple types for downstream diagnostics. Local enum member
expressions and import-qualified enum member expressions infer their enum
receiver type for semantic user-method selection,
and semantic diagnostics report unknown local enum members. Runtime evaluation
now gives local enum members stable identities for Pine-style equality checks.

Known limits: UDT field types are recorded dynamically but not yet fully
enforced by the semantic checker outside the local constructor/assignment paths.
Semantic diagnostics cover unknown local UDT field reads/assignments,
constructor unknown field names, duplicate bindings, excess positional
arguments, invalid argument order between named and positional arguments, and
conservative primitive/reference field type mismatches in local UDT field
defaults, constructors, and field assignments. Annotated local variables also
reject mismatched primitive, reference, collection, UDT, enum, and known mixed
conditional, `if`, and switch initializer arm values. Plain identifier `:=` reassignments and
local UDT field `:=` assignments reject mismatched values and qualifier
downgrades when the target and source have known semantic types.
Runtime UDT constructors also reject positional arguments after named arguments
for local and imported exported UDTs.
Plain identifier compound assignments
reject known unsupported operand combinations and result values that cannot be
assigned back to the target, and local UDT field compound assignments apply the
same checks to known field types. Array element compound assignments apply the
same checks to known element types. Library diagnostics also report exported UDT
fields and exported function or method parameters that expose non-exported local
UDTs, including through collection templates, and exported callables that return
non-exported local UDTs. Full qualifier-sensitive reference diagnostics remain
planned in the qualified type-system epic.

## Common Library Syntax Coverage

The library syntax MVP parses `library(...)` declarations, including positional
`overlay` and `dynamic_requests` metadata, `export` on UDFs, typed and
qualified exported parameters such as `simple string prefix`, exported enums,
and `import publisher/Library/version as alias` declarations.
Local library-style scripts can execute exported helper functions in the same
file, which supports deterministic compatibility fixtures based on TradingView's
documented all-time-high/all-time-low library idiom.

Semantic diagnostics require `export` declarations to live in library scripts,
require library scripts to export at least one parsed exportable declaration,
require exported function/method parameters to declare types, and report
exported function/method bodies that call `input.*()` or reference non-`const`
library globals. Exported function/method scope diagnostics also report
`request.*()` expression arguments that directly depend on exported parameters.

The runtime can also bind imported libraries from a deterministic host-provided
registry keyed by Pine import path. This supports `alias.exportedFunction(...)`
calls, exported user-defined type constructors such as `alias.Type.new(...)`,
exported enum members such as `alias.State.long` with dotted annotations such
as `alias.State signal`, and exported literal/builtin constants such as
`alias.length` or `alias.color` in offline tests and chart integrations that
pre-resolve library source.
Imported exported UDT constructors reject positional arguments after named
arguments at runtime.
Exported imported functions and methods report runtime call-shape diagnostics
for unknown named arguments, missing required arguments, excess positional
arguments, and invalid argument order, with method calls labeled as library
methods in semantic and runtime messages. Exported imported methods dispatch on
imported UDT instances. Non-exported library functions, methods, and types remain
private to their source module, but exported library functions can call private
helpers, construct library-local UDTs, and use library-local methods.
Semantic export diagnostics cover Pine's requirement that any UDT exposed
through exported fields, callable parameters, or inferred callable return values
is also exported by the library.
The checkpoint corpus tracks reduced public library-helper import idioms that
bind exported helpers through this deterministic registry, validate their series
output, and cover source-preserving helper wrappers used before delayed rolling
calls, including multiline block `if` wrappers.

Published TradingView lookup is not implemented yet. `import` declarations
without a matching registry entry emit an explicit missing-registry diagnostic.
Versioned remote/local source resolution is host integration work for callers
that want to resolve libraries outside the deterministic registry.

## Common `color.*` Coverage

The common color helper pass covers `color.rgb`, `color.new`, `color.r`,
`color.g`, `color.b`, `color.t`, and `color.from_gradient`. The checkpoint
fixture follows TradingView's documented calculated-color idioms by deriving a
variant color from RGB channels and plotting an RSI gradient. Semantic analysis
preserves known color constructor and channel return types for downstream
assignment diagnostics and rejects non-color color arguments plus non-numeric
channel, transparency, and gradient threshold arguments before runtime.

## Common `math.*` Coverage

The common math helper pass covers constants (`math.pi`, `math.e`, `math.phi`),
variadic `math.avg`, precision-aware `math.round`, `math.round_to_mintick`,
`math.trunc`, `math.sum`, `math.random`, and degree/radian conversion helpers.
The checkpoint fixture follows common Pine math idioms by averaging OHLC values,
rounding to fixed precision, converting a right angle between radians and
degrees, summing the latest non-`na` source values, and checking random bounds.
Semantic analysis preserves known math constant and helper return types for
downstream assignment diagnostics, including int/float overload distinctions for
rounding helpers and series-only math helpers, and rejects non-numeric math
helper arguments before runtime.

## Common Global Helper Coverage

The global helper pass covers `na`, `nz`, `fixnan`, and explicit primitive
casts used by generated scripts to normalize optional source values before
plotting or comparing them. `nz()` supports default-zero and explicit
replacement forms, `fixnan()` carries forward the previous non-`na` value per
call site, and both helpers reject bool arguments per Pine v6 behavior.
Semantic analysis preserves known `nz()` and `fixnan()` return types for
downstream assignment diagnostics and rejects bool `nz()` / `fixnan()`
arguments before runtime.

## Pine Logs Coverage

The Pine Logs pass covers `log.info`, `log.warning`, and `log.error` with
message-only and format-string forms. The runtime captures log level, bar
index, bar time, and message in `ExecutionResult.logs` and forwards them
through worker result bundles. The semantic checker recognizes the `log`
namespace, validates the variadic `message` signature, and reports non-string
message arguments before runtime.
`log.error()` records an error-level log entry in `ExecutionResult.logs`
without halting execution; use `runtime.error()` for Pine-compatible runtime
halts.
`runtime.error()` halts execution with a stable `runtime.error` code in
`ExecutionResult.errors`, worker runtime error messages, and Tealchart manager
error callbacks while preserving the legacy message, line, and column fields.
Semantic analysis reports non-string `runtime.error()` messages before runtime.

## Core `na` And Logical Semantics Coverage

The core semantics pass covers arithmetic `na` propagation, `na()` checks,
explicit `bool(na)` conversion, Pine-compatible `false` results for comparison
operators when either operand is `na`, and short-circuiting
`and` / `or` guard expressions. Semantic diagnostics reject direct `na`
comparisons such as `value == na`; use `na(value)` instead. Known numeric
expressions in boolean contexts are also rejected, matching Pine v6's explicit
boolean condition requirement; compare them explicitly or wrap them in `bool(...)`.

## Common Visual Coloring Coverage

The visual coloring pass covers `barcolor()` for conditional candle coloring.
The runtime emits per-bar color outputs and the main-pane renderer applies them
as candle body/wick overrides, honoring `display.none` and `show_last` while
leaving `na` bars on the chart's default up/down colors.

## Common Plot Metadata Coverage

The visual metadata pass captures common Pine v6 display/style fields on
`plot()`, `bgcolor()`, `plotbar()`, `plotcandle()`, `plotshape()`,
`plotchar()`, and `plotarrow()`, including display, format, precision,
force-overlay, and plot line-style metadata where those parameters exist. The
compatibility fixture covers named and positional argument forms plus the
common `format.*` constants and `plot.linestyle_*` constants used by Pine v6 line plots.
Semantic diagnostics reject invalid literal `display` option values while
leaving dynamic display expressions available for Pine-style masks. Tealchart renderer
coverage applies plot line-style metadata in main and indicator panes and
renders common plot offsets for line, marker, histogram, and area plot styles.
Semantic diagnostics also reject non-string visual title/text arguments and
non-color visual color arguments on common plot, hline, fill, color, OHLC,
marker, and arrow outputs, plus non-boolean visual `editable`, `trackprice`,
`join`, `fillgaps`, and `force_overlay` values, and non-numeric visual
offset/count/size/OHLC values before runtime.
Renderer coverage also honors `display.none` while retaining hidden plot values
for dependent fills, and applies `histbase` baselines to histogram/columns and
area plot rendering when supplied. Area-style plots now render filled regions
in main, computed indicator, and legacy indicator panes. Plot renderer coverage
also draws `trackprice` lines at the latest finite rendered plot value, joins
circle/cross plot markers when `join=true`, and paints
`plot.style_stepline_diamond` markers on stepped plots. Default line and
`plot.style_stepline` plots bridge `na` values, while `plot.style_linebr`,
`plot.style_steplinebr`, and `plot.style_areabr` preserve gaps.
`plot.style_area` still bridges missing bars, but `plot.style_areabr` breaks
both stroke and fill segments at `na` values.
Trackprice rendering also adds a right-axis value label for the latest rendered
plot value.
When `indicator(..., explicit_plot_zorder=true)` is set, renderer coverage
preserves visual call order across plot, hline, and fill outputs.
Renderer coverage also routes visual outputs with `force_overlay=true` back to
the main pane when emitted by non-overlay scripts.
Marker text rendering supports newline-separated labels on plotshape,
plotchar, and plotarrow outputs, and marker payloads preserve dynamic
`textcolor` series for per-bar rendering. Hidden `plotshape()` and `plotchar()`
bars now emit null body and text-color payloads so consumers do not render
stale marker styling where Pine would show no marker. The source-linked
checkpoint corpus tracks marker payloads, common `plot.style_*` payloads,
filled plot channels, and background masks through official visual checkpoints
plus reduced public buy/sell marker signal and volatility-band checkpoints.
Renderer coverage applies marker `display.none` hiding and `show_last` windows
through the public Tealscript plot rendering path.

Hline renderer coverage applies Pine `hline()` color, linewidth, linestyle,
display hiding, and pane-coordinate behavior for the current output shape.

Fill renderer coverage applies `show_last` windows to filled regions while
preserving existing gap handling, per-bar fill colors, display hiding, and
plot/hline handle fills. Semantic analysis now preserves `plot()` and `hline()`
handle return types so mixed handle assignments report Pine-shaped diagnostics
before runtime.

Plotarrow renderer coverage scales arrows between Pine `minheight` and
`maxheight` using the visible series magnitude and suppresses zero-value arrows.
Plotshape renderer coverage now draws Pine flag and label marker bodies in
addition to the existing basic geometric marker shapes, and plotshape, plotchar,
and plotarrow outputs route through indicator pane coordinates when rendered
outside overlay scripts.
The same renderer bar-window handling now applies to common `plot()`,
`bgcolor()`, `barcolor()`, `plotbar()`, `plotcandle()`, `plotshape()`,
`plotchar()`, and `plotarrow()` outputs. Background renderer coverage applies
`display.none` hiding and routes `bgcolor()` through main and indicator pane
coordinates.
The checkpoint corpus tracks a reduced public Heikin-Ashi custom-candle overlay
that renders recursive OHLC values through `plotcandle()` with dynamic body,
wick, and border colors.
Renderer-level command-trace coverage locks a common visual primitive mix in
jsdom, where native screenshot/pixel buffers are not available without adding a
heavier canvas dependency.

## Common Drawing Object Coverage

The drawing object pass covers shared runtime storage, handle IDs, per-type
limits, oldest-first garbage collection, realtime rollback for persistent
objects, `chart.point` constructors, and core `label`, `line`, `linefill`,
`box`, `polyline`, and `table` lifecycles. Label renderer coverage now handles
Pine text-only, directional label, and symbol label styles. Line renderer
coverage now draws Pine `line.style_arrow_left`, `line.style_arrow_right`, and
`line.style_arrow_both` arrowheads. Semantic analysis preserves
`chart.point` helper return types and rejects non-numeric point coordinate
arguments before runtime.

## Common OHLC Plot Coverage

The OHLC plot pass covers `plotbar()` and `plotcandle()` for custom bar and
candle overlays. The runtime emits open, high, low, close, and per-bar color
arrays with `na` gaps preserved as nulls; the Tealchart renderer draws those
custom bars/candles in overlay and indicator panes. The checkpoint fixture is
modeled on TradingView's documented custom bar plotting idiom using directional
body colors, transparent wick colors, and skipped bars.

## Common `switch` Coverage

The switch pass covers expression-form `switch` structures used for mode
selection and conditional selection. Keyed switches compare a discriminant
against case values and condition-only switches return the first truthy branch,
with optional default branches. Multiline branch bodies execute local statements
and return the last expression in the selected branch. Compatible defaulted and
partial switch arms infer scalar expression types for downstream diagnostics,
while mixed-shape switches stay conservative. The checkpoint fixture
follows TradingView's documented conditional-structure idioms by selecting a
moving average from an `input.string(... options=...)` mode and deriving a
directional signal.

## Common Loop Control Coverage

The loop control pass covers ascending and descending numeric loops, `break`,
`continue`, collection loops over Pine arrays, and the documented tuple form
`for [index, value] in values`.

## Common `barstate.*` Coverage

The barstate pass exposes common Pine bar-state booleans through `barstate.*`
member access. Historical execution marks loaded bars as confirmed history,
sets `islastconfirmedhistory` on the last historical bar, and switches
`isrealtime` / `isconfirmed` during realtime current-bar updates.

## Common Chart Info Coverage

The chart-info pass exposes common static `syminfo.*`, `timeframe.*`, and
host-provided `chart.*` members used by generated indicators and
multi-timeframe script templates, including `syminfo.tickerid`, `syminfo.root`,
`syminfo.pointvalue`, `syminfo.mincontract`, `syminfo.volumetype`,
`syminfo.prefix`, `syminfo.session`,
`syminfo.country`, `syminfo.sector`, `syminfo.industry`, `syminfo.isin`,
`syminfo.current_contract`, `syminfo.employees`, `syminfo.shareholders`,
`syminfo.shares_outstanding_float`, `syminfo.shares_outstanding_total`,
`syminfo.expiration_date`, `syminfo.recommendations_date`, and
`syminfo.target_price_*`,
`timeframe.period`, `timeframe.main_period`, `timeframe.multiplier`,
`timeframe.in_seconds()`/`timeframe.to_seconds()`,
`timeframe.from_seconds()`, `timeframe.change()`,
timeframe category flags, `chart.bg_color`, `chart.fg_color`, and chart-type
flags such as `chart.is_heikinashi` and `chart.is_renko`. The checkpoint corpus
tracks the official timeframe-comparison idiom that converts chart and selected
input timeframes to seconds before validating them.
`indicator(timeframe=...)` updates the exposed timeframe metadata for
seconds/minutes/D/W/M and tick declaration values, including
`timeframe.isticks`. Semantic analysis preserves known `syminfo.*` metadata,
timeframe metadata, chart metadata, and time helper return types for downstream
assignment diagnostics.

## Common Calendar Coverage

The calendar pass covers Pine's current-bar calendar variables
(`year`, `month`, `weekofyear`, `dayofmonth`, `dayofweek`, `hour`, `minute`,
and `second`), matching callable helpers such as `hour(time)`, common
`dayofweek.*` constants, `timestamp()` forms used in date/time filters, and
fixed-offset or IANA timezone arguments such as `"GMT+2"` and
`"America/New_York"`. The checkpoint fixture follows TradingView's documented
calendar-filter idioms by gating plots against a start timestamp, weekday,
minute threshold, and named exchange timezone. Semantic analysis rejects
non-numeric calendar `time` arguments and non-string calendar `timezone`
arguments before runtime.

## Common Session Time Coverage

The session-time pass covers `time_close`, `last_bar_time`, `timenow`,
`time_tradingday`, and `time()` / `time_close()` calls with optional session
strings such as `"0930-1600"` or `"0930-1600:23456"`. Matching bars return
their open or close UNIX timestamp; non-matching bars return `na`. Historical
`timenow` uses a stable execution timestamp, and realtime updates refresh it
per re-execution. `session.ismarket`, `session.ispremarket`, and
`session.ispostmarket` are supported when the host runtime provides exchange
session classification windows. Higher-timeframe `time()` / `time_close()`
aggregation is covered for intraday, daily, and weekly buckets, including
timezone-aware DST boundaries. Host-provided `closedDates` and closure entries
can suppress session-filtered `time()` calls and session-state helpers for
exchange calendar holidays or partial-session closures. The checkpoint corpus
tracks public session-filter gating, public exchange session-state helper
gating, and the official dynamic-session string idiom. Semantic analysis
rejects non-string `time()` / `time_close()` timeframe, session, and timezone
arguments plus invalid `timeframe.*` string/numeric helper arguments before
runtime.

## Common Tick Quote Coverage

The tick-quote pass covers Pine v6 `bid` and `ask` variables as `series float`
values sourced from optional host bar fields on the `1T` timeframe. Missing
host quote fields, and all non-`1T` chart or request contexts, return `na`.
Direct reads, history references such as `bid[1]`, selected TA source-window
helpers such as `ta.sma(ask, 2)`, realtime tick replacement, semantic known
global analysis, and `request.security(..., "1T", bid/ask)` are covered by
runtime tests.

## Request Data And Ticker Coverage

The request data pass covers `request.security()` over deterministic
host-provided contexts, including same-symbol and other-symbol requests,
higher-timeframe merging, common `gaps` / `lookahead` behavior,
`ignore_invalid_symbol`, `calc_bars_count`, tuple expressions, dynamic request
guards, `request.security_lower_tf()`, and `request.currency_rate()`.
Host-provided point-series contexts cover `request.dividends()`,
`request.earnings()`, `request.splits()`, `request.financial()`, and
`request.economic()`, including `lookahead_on` for timestamped corporate-action
events. `request.seed()` evaluates expressions against
deterministic seed contexts keyed by source and symbol; it does not fetch
GitHub data at runtime. Semantic analysis preserves supported `request.*`
return types for downstream diagnostics, including expression-preserving
security/seed calls, lower-timeframe arrays, and float point-data helpers.
Runtime execution enforces a Pine-style limit of 40 unique `request.*`
contexts per script pass so dynamic request scripts cannot create unbounded
host datafeed work. Obvious invalid literal declaration and request
`calc_bars_count` values, request `gaps` / `lookahead` modes, and
point-series request field selectors are reported by semantic diagnostics
before runtime. Request `ignore_invalid_*` option flags also report non-boolean
argument types before runtime, and request symbol, timeframe, currency, source,
country, financial id, period, and economic field identifiers report non-string
argument types before runtime.
Visual output registration enforces Pine's 64 plot-output
limit while exempting `hline()` outputs. Table creation enforces a conservative
TealScript sandbox cap of 10,000 declared table cells across live tables.
The checkpoint corpus tracks public MTF trend-filter, currency-conversion,
earnings-event, corporate-action, financial-dashboard, economic-macro, and
seed-dataset request idioms, an official lower-timeframe array idiom, plus a
public multi-symbol screener idiom.

Known limits: request data availability is host/provider-gated, and
`request.footprint()` remains unsupported until the host can provide the
footprint/intrabar volume model described in
[`FOOTPRINT_REQUEST_DESIGN.md`](./FOOTPRINT_REQUEST_DESIGN.md). Semantic
analysis reports the planned `request.footprint()` gap with the same explicit
unsupported-feature diagnostic used by runtime execution.

The ticker pass covers `ticker.new()`, `ticker.modify()`, `ticker.standard()`,
`ticker.inherit()`, `ticker.heikinashi()`, `ticker.renko()`,
`ticker.linebreak()`, `ticker.kagi()`, and `ticker.pointfigure()` for
indicator request workflows. Session, adjustment, back-adjustment,
settlement-as-close, and chart modifiers propagate as opaque request-datafeed
keys. Semantic analysis preserves supported `ticker.*` helper return types for
downstream assignment diagnostics, reports invalid literal session,
adjustment, back-adjustment, and settlement-as-close modifier values before
runtime, and planned unsupported ticker constructors such as
`ticker.rangebar()` are reported explicitly instead of as generic unknown
functions. The in-memory test datafeed derives
Heikin-Ashi OHLC when matching base bars exist, with tests covering the
`ticker.heikinashi()` modifier. The checkpoint corpus tracks an official ticker
request fixture for extended-session and Heikin-Ashi synthetic IDs. Renko, Line
Break, Kagi, and Point & Figure contexts must be supplied by the host.
Synthetic strategy/backtest execution remains deferred until the strategy
intrabar execution contract is implemented. The current broker emulator is
chart-OHLC based; lower-timeframe Bar Magnifier behavior and synthetic execution
feeds are tracked in [`STRATEGY_INTRABAR_DESIGN.md`](./STRATEGY_INTRABAR_DESIGN.md).

## `max_bars_back` Declaration Coverage

`indicator(..., max_bars_back=N)` is parsed and recorded on execution results
as `indicatorMaxBarsBack`. The `max_bars_back(var, num)` function is accepted as
a Pine-compatible buffer/profile hint. Values must be finite, non-negative
integers, and obvious invalid literal declaration or function hint values are
reported by semantic diagnostics before runtime. Explicit history references
that exceed the declared indicator bound produce runtime errors, while in-range
references remain available over loaded history.
Scripts without an explicit declaration report inferred history depth in the
runtime profile from static literal/simple numeric offset inference,
selected pure `math.*` helper offsets including averaging, power, and
square-root helpers, selected numeric normalization helper offsets,
input-controlled simple conditional offsets, observed dynamic access, and
selected static or observed rolling-window helper lookbacks such as
`math.sum()`, `ta.range()`, `ta.rising()`/`ta.falling()`, common statistical
helpers, momentum helpers, band/average/regression helpers, and `ta.*`
fixed/default, source-window, retained-source, recursive, and default-argument
helpers, oscillator helpers, direct OHLC helper lookbacks, default-source
highest/lowest and pivot left/right windows, and TA variables that read prior
close/volume bars. Static unexecuted `ta.tr()` calls now contribute their direct
true-range prior-close requirement to the same profile. Full Pine-style
preallocation for arbitrary series offsets remains a compatibility target. The
checkpoint corpus tracks an official `max_bars_back`
bounded-history fixture.

## Common Drawing Object Coverage

The label drawing pass covers a first runtime payload slice for common
last-bar label idioms. `label.new()` accepts positional or named `x`, `y`, and
`text` arguments, chart-point constructor overloads, plus common `xloc`, `yloc`, `style`, `color`, `textcolor`,
`size`, `textalign`, `text_font_family`, `force_overlay`, and
`text_formatting` options. The runtime returns a label handle string and records a typed
drawing output. The label mutation pass covers persistent `var` label handles,
`label.set_x()`, `label.set_y()`, `label.set_xy()`, `label.set_xloc()`,
`label.set_yloc()`, `label.set_text()`, `label.set_style()`,
`label.set_color()`, `label.set_textcolor()`, `label.set_size()`,
`label.set_textalign()`, `label.set_text_font_family()`, `label.set_text_formatting()`,
`label.set_tooltip()`, matching scalar getters (`get_x`, `get_y`, `get_xloc`,
`get_yloc`, `get_text`, `get_style`, `get_color`, `get_textcolor`,
`get_size`, `get_tooltip`), `label.copy()`, and `label.delete()`. Label
mutators and getters accept Pine-style named `id` and value arguments. Semantic
analysis preserves known label getter return types and `label.all` handle-array
element types for downstream diagnostics, and rejects invalid literal `xloc`
and `yloc` option values plus invalid literal label `style`, `textalign`,
`size`, `text_font_family`, and `text_formatting` values, plus non-string
label text and tooltip values, non-color label color values, and non-numeric
label constructor/setter coordinate values, plus non-boolean label
`force_overlay` values. Rendering routes
labels to the script pane: overlay scripts use the main pane, non-overlay
scripts use their indicator pane. Renderer coverage handles text-only
`label.style_none`, directional label bodies, and common symbol bodies including
circle, square, diamond, cross, xcross, triangle, flag, arrow styles, label text
alignment, default/monospace font-family metadata, and bold/italic text formatting. GC
limits and realtime rollback parity are covered by the shared drawing store;
remaining gaps are TradingView-exact pixel geometry and edge-case style parity.

The line drawing pass covers common trendline/channel idioms. `line.new()`
accepts positional or named `x1`, `y1`, `x2`, and `y2` arguments plus common
`xloc`, `extend`, `color`, `style`, `width`, and `force_overlay` options. The
runtime returns a line handle string and records a typed drawing output. The
mutation pass covers persistent `var` line handles, `line.set_x1()`,
`line.set_x2()`, `line.set_y1()`, `line.set_y2()`, `line.set_xy1()`,
`line.set_xy2()`, `line.set_first_point()`, `line.set_second_point()`,
`line.set_xloc()`, `line.set_extend()`, `line.set_color()`,
`line.set_style()`, `line.set_width()`, scalar coordinate getters,
`line.get_price()`, `line.copy()`, and `line.delete()`. Line mutators
and getters accept Pine-style named `id`, value, and point arguments. Semantic
analysis validates `line.new()` call-shape names, preserves known line getter
return types, and preserves `line.all` handle-array element types for
downstream diagnostics, while rejecting invalid literal `xloc` and `extend`
option values plus invalid literal line `style` values and non-color line color
values, non-numeric line coordinate and width values, and non-boolean line
`force_overlay` values. Rendering routes line segments to the script pane with color/style/width, horizontal extension support, and Pine
`line.style_arrow_left`, `line.style_arrow_right`, and `line.style_arrow_both`
arrowheads.
`force_overlay` lines render in the main pane even when created by non-overlay
scripts. `linefill.new()` records fills between two line handles;
`linefill.set_color()` supports Pine-style named `id` and `color` arguments,
while `linefill.get_line1()`, `linefill.get_line2()`, and `linefill.delete()`
support named `id` arguments. Semantic analysis preserves linefill getter line
handle returns and `linefill.all` handle-array element types for downstream
diagnostics and rejects non-color linefill color values. The renderer fills between resolved line segments in the routed
script pane. `linefill.new()` rejects missing or non-line handles without
creating a drawing. `chart.point` overloads, GC limits, and full realtime
rollback parity remain planned.
The checkpoint corpus tracks a reduced public supply/demand-zone drawing idiom
that updates a persistent `box` and right-extended midline from recent swing
ranges, plus a reduced public channel idiom that updates persistent upper/lower
`line` handles and fills the band with `linefill.new()`.

The box drawing pass covers common supply/demand zone idioms. `box.new()`
accepts positional or named `left`, `top`, `right`, and `bottom` arguments plus
common border, fill, text, `extend`, and `xloc` options, including
`chart.point` top-left/bottom-right overloads. The runtime supports persistent
`var` box handles, geometry setters (`set_left`, `set_right`, `set_top`,
`set_bottom`, `set_lefttop`, `set_rightbottom`, `set_xloc`,
`set_top_left_point`, `set_bottom_right_point`), style/text setters including
`set_text_formatting`, coordinate/color/text getters, `box.copy()`, and
`box.delete()`. Box mutators and getters accept Pine-style named `id`, value,
and point arguments. Semantic analysis validates `box.new()` call-shape names,
preserves known box getter return types, preserves `box.all` handle-array
element types for downstream diagnostics, and rejects invalid literal `xloc`
and `extend` option values plus invalid literal border-style values and
non-string box text values plus non-color box border, background, and text
color values, non-numeric box coordinate and border-width values, and
non-boolean box `force_overlay` values. Rendering routes filled rectangles to the script pane with borders, text alignment, `text_wrap=auto` wrapping,
default/monospace font-family metadata, and bold/italic text formatting. Semantic
analysis also rejects invalid literal `text_halign`, `text_valign`,
`text_wrap`, `text_size`, `text_font_family`, and `text_formatting` values. Full
TradingView text pixel parity and remaining edge-case
styling remain planned.

The `polyline.*` drawing pass supports `polyline.new()` with named point/style
arguments, `polyline.copy()`, `polyline.delete()`, and `polyline.all`.
`polyline.copy()` and `polyline.delete()` accept Pine-style named `id`
arguments. Semantic analysis preserves `polyline.new()` and `polyline.copy()`
handle return types and `polyline.all` handle-array element types for downstream
diagnostics, and rejects invalid literal `xloc` and `line_style` option values.
Semantic analysis also rejects non-color polyline line and fill color values,
non-numeric polyline line-width values, and non-boolean polyline
`curved`/`closed`/`force_overlay` values.
Renderer coverage applies fixed path geometry, optional fill, line styling, and
approximate curved paths when `curved=true`. The checkpoint corpus tracks a reduced public zigzag-polyline idiom that renders recent swing
`chart.point` vertices as a last-bar path.

## Table Drawing Coverage

The `table.*` drawing pass covers fixed-position table handles, declared row and
column sizing, background/frame/border metadata, `table.delete()`,
`table.clear()`, `table.merge_cells()`, `table.all`, `table.cell()`, table-level
position/background/frame/border setters, and common cell setters for text,
color, background, size, width, height, text alignment, font family, and
bold/italic text formatting, and tooltips. Table lifecycle helpers and setters accept
Pine-style named `table_id`, coordinate, and value arguments where those
parameters exist. Semantic analysis preserves `table.new()` handle return types
and `table.all` handle-array element types for downstream diagnostics, and
rejects invalid literal table position values plus cell text alignment,
text-size, font-family, and text-formatting values, plus non-string cell text
and tooltip values, non-color table/cell color values, and non-numeric table
dimension, coordinate, width, height, frame, and border values. Rendering lays out fixed tables in the script pane with measured automatic cell sizes,
percentage-based explicit cell sizes, merged cell spans, cell backgrounds,
borders, frame borders, text alignment, default/monospace font-family metadata,
and bold/italic font styling. Runtime coverage also
guards persistent table handles and transient polylines across realtime
rollback. Source-linked public dashboard-table setter checkpoint coverage locks
last-bar table position/frame/border updates, merged header spans, cell
dimension setters, alignment, colors, and tooltip payloads. Remaining gaps are
TradingView-exact sizing and pixel parity.

## Strategy Diagnostic Coverage

The strategy pass accepts `strategy(...)` declarations and maps common settings,
including risk-free-rate metadata, limit-fill verification ticks, close-entry selection rules, and standard-OHLC fill metadata, into the exported ledger primitives for settings, orders, fills, trades,
positions, and per-bar equity snapshots. Read-only `strategy.*` state variables such as
`strategy.equity`, `strategy.account_currency`, `strategy.position_size`,
`strategy.position_entry_name`, and trade counters are available for scripts.
Source-linked public checkpoints cover strategy stats tables plus closed-trade
list and open-position dashboard tables built from trade accessors.
The semantic checker validates common strategy order, close/cancel,
declaration argument, declaration literal value, and trade-accessor call shapes
before runtime, reports literal declaration setting diagnostics plus order
id/direction/OCA/quantity diagnostics, non-boolean, non-numeric, and non-string
strategy declaration settings,
non-boolean order alert/immediate flags, non-string order id/comment/alert
arguments, non-string order/risk enum-like arguments, non-numeric order/risk sizing
arguments, non-numeric trade accessor indexes, and excess positional order arguments,
and preserves known strategy state/accessor return types for downstream
assignment diagnostics. `strategy.entry()`,
`strategy.order()`, `strategy.close()`,
`strategy.close_all()`, `strategy.exit()`, `strategy.cancel()`, and
`strategy.cancel_all()` record or cancel ledger orders. Fixed-size market orders
fill at the next bar open by default, or at the signal bar close when
`process_orders_on_close=true`, then update position size and average price.
Basic open/closed trade counters are maintained as fixed-size market fills
change exposure. Open trades are marked to market from current OHLC, updating
`strategy.openprofit`, `strategy.equity`, and trade-level maximum run-up and
drawdown snapshots, while the ledger records one equity-curve point per bar for
downstream strategy analytics. Price-based `strategy.exit()` limit/stop brackets are
recorded as pending exit orders. Profit/loss tick-distance exits are translated
from the matching weighted entry price into limit/stop brackets, with absolute
limit/stop prices taking precedence. Pending limit/stop orders fill on later
bars when OHLC crosses their trigger price, cap fills to the remaining matching
open trade quantity, and bracket siblings cancel through OCA.
`strategy.oca.reduce` groups reduce pending sibling order quantities after a
fill and cancel siblings whose remaining quantity reaches zero. Generated
`strategy.exit()` bracket orders can be cancelled through the original exit id.
`strategy.entry()` and `strategy.order()` stop-limit orders activate after their
stop price is crossed, then fill as limit orders on later execution ticks when
the ordered broker path reaches the limit price. Fixed, cash, and
percent-of-equity sizing resolve to concrete order quantities at submission time,
and `strategy.entry()` enforces same-direction pyramiding limits and expands
opposite-direction entry transactions to reverse positions. The
`strategy.risk.allow_entry_in(strategy.direction.*)` rule restricts
`strategy.entry()` to the allowed direction, converting disallowed opposite
entries into close-only market orders while leaving raw `strategy.order()` calls
unrestricted. `strategy.risk.max_position_size()` caps `strategy.entry()`
exposure while leaving raw `strategy.order()` calls unrestricted.
`strategy.risk.max_intraday_filled_orders()` caps same-UTC-day non-exit
strategy order fills by blocking new non-exit submissions and cancelling excess
pending non-exit fills after the configured count is reached, then closing any
open position with a market risk-exit order.
`strategy.risk.max_cons_loss_days()` caps non-exit orders after the configured
number of consecutive UTC losing days, based on closed-trade net PnL, and
cancels pending non-exit fills after the cap is reached. If an open position
remains when the guard trips, TealScript closes it with a market risk-exit
order.
`strategy.risk.max_intraday_loss()` caps non-exit orders after the same-UTC-day
equity-curve loss from peak equity reaches the configured cash or
percent-of-equity value. `strategy.risk.max_drawdown()` caps non-exit orders
after the overall equity-curve drawdown from peak equity reaches the configured
cash or percent-of-equity value. Both equity risk guards cancel pending orders
and close open positions with a market risk-exit order after the cap is reached.
TradingView-exact session halt semantics remain a fidelity target. The
`strategy(..., slippage=...)` setting applies fixed tick slippage to market,
stop, and trailing-stop fills in trade direction while preserving limit-fill
prices. `strategy.close(..., immediately=true)` and
`strategy.close_all(..., immediately=true)` fill on the current bar close even
when `process_orders_on_close=false`. This is a deterministic broker emulator:
chart-OHLC and host-provided
lower-timeframe execution paths are consumed by pending order fills and exported
as strategy metadata. The chart-OHLC fallback follows the official default
broker-emulator path assumption, choosing open-high-low-close or
open-low-high-close from the open's distance to the bar extremes, and fills
price-based orders crossed in the previous-close/current-open gap at the current
bar open. Bounded `calc_on_order_fills` reruns current-bar strategy logic after
fills, including a lower-timeframe bar-magnifier checkpoint that prevents
recalc-created price exits from filling against ticks before the triggering
fill. `calc_on_every_tick=true` recalculates strategies on unconfirmed
realtime ticks while default strategies wait for confirmed realtime closes.
TradingView-exact same-bar intrabar/bar-magnifier behavior remains a fidelity
target. The `use_bar_magnifier` strategy setting is stored in the ledger.
Trailing stops submitted through
`strategy.exit(..., trail_price/trail_points, trail_offset)` activate on later
bars and ratchet against OHLC highs/lows using tick-distance `trail_points` and
`trail_offset` values. The checkpoint corpus tracks both the official trailing
exit example and a reduced public trailing-stop strategy idiom with explicit
order activation, ratchet, fill, and closed-trade assertions. Fill
commissions are applied to fills and debited from strategy net profit/equity for
`percent`, `cash_per_order`, and
`cash_per_contract` commission settings. Basic `strategy.opentrades.*`
accessors are available for open trade entry id, entry price, entry bar/time,
entry comment, signed size, gross open profit, profit percent, commission,
maximum run-up, and maximum drawdown with percent variants. The
`strategy.opentrades.capital_held` variable reports reserved entry notional
across open trades. Basic
`strategy.closedtrades.*` accessors are available for closed trade entry/exit
ids, comments, prices, bars/times, signed size, gross profit, profit percent,
commission, maximum run-up, and maximum drawdown with percent variants.
Closed-trade outcome counters `strategy.wintrades`, `strategy.losstrades`, and
`strategy.eventrades` are available. Filled strategy orders with
`alert_message` emit `strategy_order_fills` alert events unless their
`disable_alert` argument is true. The checkpoint corpus also tracks reduced
public strategy fixed-bracket and performance-table idioms that plot
`strategy.closedtrades`,
`strategy.wintrades`, and `strategy.netprofit` while rendering the same counters
through a last-bar `table`.

## Common Alerts Coverage

The alerts pass covers `alertcondition(condition, title, message)` and
conditional `alert(message, freq)` calls. The runtime emits alert outputs
alongside plots, preserving per-bar alertcondition values and direct alert
messages, and direct alert events with `alert.freq_once_per_bar`,
`alert.freq_once_per_bar_close`, and `alert.freq_all` constants.
Alertcondition messages keep the static template and expose rendered per-bar
messages for OHLCV, chart, and plot placeholders. Frequency handling follows
Pine's alert contract: `freq_all` emits every call, non-`all` alerts emit only
the first eligible execution per call site per bar, and
`freq_once_per_bar_close` emits only on confirmed bar executions. Direct alert
events include an `isRealtime` marker so consumers can distinguish historical
calculation events from live update events. Semantic checks also reject invalid
literal or namespace-constant `alert()` frequency values and non-string alert
message/title/frequency arguments before runtime, and report non-boolean
`alertcondition()` conditions before runtime.
The checkpoint fixture follows TradingView's
documented trigger-condition idiom by deriving a boolean condition, registering
it with `alertcondition()`, and firing a direct `alert()` from an `if` block.
The semantic checker validates common `alert()` and `alertcondition()` call
shapes before runtime.

## Common Loop Coverage

The loop-control pass covers `break` and `continue` inside numeric loops,
descending numeric loops with negative `by` steps, and basic collection loops
over Pine arrays with `for value in array`. The checkpoint fixture follows
common Pine loop idioms by summing selected values, skipping items with
`continue`, stopping with `break`, and walking a numeric loop downward.
