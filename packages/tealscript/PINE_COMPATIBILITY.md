# TealScript Pine Compatibility Matrix

TealScript is Pine-inspired, not a drop-in Pine runtime. This matrix tracks the
subset needed for AI-generated chart indicators to behave like common Pine
Script v5/v6 indicators.

For the broader full-parity plan, see
[`PINE_PARITY_EPICS.md`](./PINE_PARITY_EPICS.md).

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
| `strategy(...)` | Partial | Parses and reports an explicit unsupported runtime diagnostic before strategy execution exists. |
| `library(...)` / `import` | Unsupported | Out of scope until reusable script modules are designed. |
| Variable declarations | Supported | Untyped and typed declarations parse. |
| `var` / `varip` | Partial | Basic persistence exists; function and nested-scope edge cases need hardening. |
| Reassignment `:=` | Partial | Identifier and array index assignment work. Member assignment is not implemented. |
| Compound assignment | Partial | Identifier and array index compound assignment work. |
| Tuple destructuring | Supported | Used by multi-return built-ins such as `ta.macd`. |
| `if` / `else if` / `else` | Supported | Statement form is implemented. |
| Ternary `?:` | Supported | Runtime truthiness needs broader Pine compatibility tests. |
| `for` loops | Partial | Numeric `for = ... to ... by ...` supports ascending and descending steps. Collection `for value in array` and tuple `for [index, value] in array` loops are supported. |
| `while`, `break`, `continue` | Supported | Loop safety limit exists. |
| User-defined functions | Partial | Single-line functions, flat multiline functions, local scope, nested calls, and `if` / `else if` / `else` branch expression returns are covered. |
| Methods, e.g. `arr.push(x)` | Partial | Common array methods lower to the matching `array.*` built-ins. Other object namespaces are not implemented yet. |
| `switch` | Partial | Expression-form keyed and condition-only switches work, including multiline statement-block arms that return their last expression. |
| User-defined types | Unsupported | Lower priority than indicators and arrays. |

## Runtime Semantics

| Pine feature | Status | Notes |
| --- | --- | --- |
| Bar-by-bar execution | Supported | Scripts execute across loaded bars. |
| History references `x[n]` | Partial | Series and arrays support indexing; dynamic series offsets and unavailable/future history returning `na` are covered. Broader type diagnostics are still incomplete. |
| `na` value | Partial | Bare `na` and callable `na(value)` are supported with `NaN` as the internal representation; broader propagation and bool behavior need Pine v6 coverage. |
| Built-in price series | Supported | `open`, `high`, `low`, `close`, `volume`, `time`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`. |
| Calendar variables | Partial | `year`, `month`, `weekofyear`, `dayofmonth`, `dayofweek`, `hour`, `minute`, and `second` are derived from the current bar open time. UTC/GMT offset timezones are supported; named exchange timezones still need IANA mapping. |
| `bar_index` / `last_bar_index` | Supported | Available as runtime identifiers. |
| `barstate.*` | Partial | Common booleans are exposed, including `isfirst`, `islast`, `ishistory`, `isrealtime`, `isnew`, `isconfirmed`, and `islastconfirmedhistory`. Realtime tick parity still needs browser-worker coverage. |
| `syminfo.*` | Partial | Static defaults are exposed through common chart-info fields such as `ticker`, `tickerid`, `root`, `mintick`, and `minmove`. Live symbol metadata injection is still planned. |
| `timeframe.*` | Partial | Static defaults are exposed through common timeframe fields such as `period`, `main_period`, `multiplier`, `isintraday`, and `isdwm`. Live chart timeframe injection is still planned. |
| Function-local series state | Partial | Root and function-local `var` values persist, branch expression returns work, and recursive UDF calls are rejected with explicit diagnostics. Nested block parsing and broader call-site series parity still need hardening. |
| `max_bars_back` | Partial | Declaration metadata is parsed, validated, and exposed on execution results; runtime buffer enforcement/inference is not implemented yet. |

## Scope And Series Audit

Resolved in the scope/series hardening PR:

- Regular variables are reset on each bar. Previously, redeclaration replaced
  the variable entry and lost accumulated series history for derived values
  such as `dist = close - ta.sma(close, 3)` followed by `dist[1]`.
- `var` and `varip` persistence now works at root and function-local scopes.

Covered behavior and remaining gaps:

- Flat multiline user-defined functions return the last expression statement.
- User-defined function bodies can return expression results from `if` /
  `else if` / `else` branches.
- Recursive user-defined function calls are rejected with an explicit diagnostic
  instead of overflowing the runtime stack.
- Nested indented blocks inside user-defined functions expose limitations in the
  simplified indentation grammar and need continued hardening.

## Common History Reference Coverage

The history reference pass covers literal offsets such as `close[1]`, dynamic
offsets such as `close[length]`, fractional offsets truncated toward zero,
derived regular-series history, and unavailable or future offsets returning
`na`/`null` plot values instead of throwing.

## Built-ins

| Namespace | Status | Notes |
| --- | --- | --- |
| `math.*` | Partial | Common numeric functions, constants, `math.avg`, precision rounding, truncation, and angle conversion helpers exist. Pine-specific helpers are still incomplete. |
| `ta.*` | Partial | Includes SMA, EMA, RSI, MACD, ATR, BB, VWAP, Supertrend, DMI, SAR, pivots, `barssince`, `valuewhen`, `vwma`, `highestbars`, `lowestbars`, `cross`, `range`, and more. |
| `input.*` | Partial | Generic `input()`, int, float, bool, string, color, source, time, symbol, timeframe, session, and text area exist. Advanced UI/display behavior is incomplete. |
| Time functions | Partial | Calendar functions, `timestamp()`, `time()`, and `time_close()` cover common numeric, UTC/GMT-offset, and same-timeframe session-filter forms. Higher-timeframe aggregation and named timezone databases are still planned. |
| `color.*` | Partial | Core named colors, `color.new()`, `color.rgb()`, channel extraction, and `color.from_gradient()` exist. Named color constants still need exact Pine v6 parity. |
| `str.*` | Partial | Common conversion, format, search, substring, case, trim, and replace helpers exist. |
| `array.*` | Partial | Array construction, read/write, search, copy, insertion/removal, numeric summaries, stack/queue helpers, clear, and common method-call syntax are covered. |
| `map.*` / `matrix.*` | Planned | Lower priority than arrays. |
| `request.*` | Planned | Requires Tealchart datafeed design. Start with `request.security()`. |

## Visual Outputs

| Pine feature | Status | Notes |
| --- | --- | --- |
| `plot` | Partial | Common line, break-line, step, histogram, marker, column, and area style constants work; full parameter rendering parity is incomplete. |
| `hline` | Partial | Static horizontal lines work and return handles usable by `fill`. |
| `fill` | Partial | Accepts `plot()` and `hline()` handles, plus legacy title references; advanced fill parameters are incomplete. |
| `bgcolor` | Supported | Produces background outputs. |
| `plotshape`, `plotchar`, `plotarrow` | Partial | Core outputs exist; styling parity is incomplete. |
| `barcolor` | Supported | Produces per-bar candle color outputs consumed by the main-pane renderer. |
| `plotbar`, `plotcandle` | Supported | Produce OHLC outputs with per-bar body, wick, and border colors; renderer draws custom bars/candles. |
| `line.*`, `label.*`, `box.*`, `table.*` | Planned | Namespace calls report explicit unsupported runtime diagnostics. Object lifecycle and renderer support are still planned. |

## Alerts, Strategies, And Data

| Pine feature | Status | Notes |
| --- | --- | --- |
| `alertcondition` / `alert` | Partial | Runtime collects `alertcondition()` boolean series and direct `alert()` events with frequency constants. UI integration and full Pine alert throttling are not implemented yet. |
| `strategy.*` | Partial | Namespace calls report explicit unsupported runtime diagnostics; backtest ledger is not implemented. |
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
`ta.valuewhen`), cumulative/window helpers (`ta.cum`, `ta.dev`,
`ta.variance`, `ta.vwma`, `ta.swma`, `ta.alma`, `ta.highestbars`,
`ta.lowestbars`), and compatibility aliases/helpers (`ta.cross`, `ta.range`,
`ta.rising`, and `ta.falling`). The statistical helper pass covers `ta.median`, `ta.mode`,
`ta.percentile_nearest_rank`, `ta.percentile_linear_interpolation`, and
`ta.percentrank`. These are covered in the golden compatibility harness.

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

## Common `array.*` Coverage

The array pass covers typed constructors (`array.new_float`, `array.new_int`,
`array.new_bool`, `array.new_string`), `array.size`, `array.get`, `array.set`,
`array.push`, `array.pop`, `array.shift`, `array.unshift`, `array.clear`,
`array.from`, `array.copy`, `array.first`, `array.last`, `array.includes`,
`array.indexof`, `array.lastindexof`, `array.insert`, `array.remove`,
`array.min`, `array.max`, `array.sum`, `array.avg`, `array.sort`,
`array.reverse`, `array.join`, `array.concat`, and `array.slice` window
semantics. Common Pine method
syntax now lowers to the same runtime built-ins for calls such as
`values.push(close)`, `values.size()`, `values.get(index)`, and
`values.avg()`. The checkpoint fixtures follow rolling-window indicator idioms
and constant-array helper idioms where arrays are copied, searched, summarized,
ordered, sliced, joined, concatenated, and mutated.

## Common `color.*` Coverage

The common color helper pass covers `color.rgb`, `color.new`, `color.r`,
`color.g`, `color.b`, `color.t`, and `color.from_gradient`. The checkpoint
fixture follows TradingView's documented calculated-color idioms by deriving a
variant color from RGB channels and plotting an RSI gradient.

## Common `math.*` Coverage

The common math helper pass covers constants (`math.pi`, `math.e`, `math.phi`),
variadic `math.avg`, precision-aware `math.round`, `math.trunc`, and
degree/radian conversion helpers. The checkpoint fixture follows common Pine
math idioms by averaging OHLC values, rounding to fixed precision, and
converting a right angle between radians and degrees.

## Common Visual Coloring Coverage

The visual coloring pass covers `barcolor()` for conditional candle coloring.
The runtime emits per-bar color outputs and the main-pane renderer applies them
as candle body/wick overrides, leaving `na` bars on the chart's default up/down
colors.

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
and return the last expression in the selected branch. The checkpoint fixture
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

The chart-info pass exposes common static `syminfo.*` and `timeframe.*`
members used by generated indicators and multi-timeframe script templates,
including `syminfo.tickerid`, `syminfo.root`, `timeframe.period`,
`timeframe.main_period`, `timeframe.multiplier`, and timeframe category flags.

## Common Calendar Coverage

The calendar pass covers Pine's current-bar calendar variables
(`year`, `month`, `weekofyear`, `dayofmonth`, `dayofweek`, `hour`, `minute`,
and `second`), matching callable helpers such as `hour(time)`, common
`dayofweek.*` constants, and `timestamp()` forms used in date/time filters.
The checkpoint fixture follows TradingView's documented calendar-filter idioms
by gating plots against a start timestamp, weekday, and minute threshold.

## Common Session Time Coverage

The session-time pass covers `time_close`, `last_bar_time`, and same-timeframe
`time()` / `time_close()` calls with optional session strings such as
`"0930-1600"` or `"0930-1600:23456"`. Matching bars return their open or close
UNIX timestamp; non-matching bars return `na`. Multi-timeframe aggregation,
exchange calendars, named timezone databases, and full overnight-session day
semantics remain planned.

## `max_bars_back` Declaration Coverage

`indicator(..., max_bars_back=N)` is parsed and recorded on execution results
as `indicatorMaxBarsBack`. Values must be finite, non-negative integers. The
runtime still keeps full loaded history and does not infer or enforce Pine's
history buffer sizing rules yet.

## Drawing Diagnostic Coverage

Drawing namespaces (`line.*`, `label.*`, `box.*`, and `table.*`) are accepted
as parsed member calls and fail with explicit unsupported runtime diagnostics.
Object handles, lifecycle operations, and rendering are still planned.

## Strategy Diagnostic Coverage

The strategy diagnostics pass accepts `strategy(...)` declarations and
`strategy.*` namespace calls so generated or pasted strategy scripts get a clear
unsupported runtime diagnostic instead of a parser error or unknown identifier.
Backtest order ledgers, positions, fills, and broker-emulator semantics remain
out of scope until strategy execution is designed.

## Common Alerts Coverage

The alerts pass covers `alertcondition(condition, title, message)` and
conditional `alert(message, freq)` calls. The runtime emits alert outputs
alongside plots, preserving per-bar alertcondition values and direct alert
events with `alert.freq_once_per_bar`, `alert.freq_once_per_bar_close`, and
`alert.freq_all` constants. The checkpoint fixture follows TradingView's
documented trigger-condition idiom by deriving a boolean condition, registering
it with `alertcondition()`, and firing a direct `alert()` from an `if` block.

## Common Loop Coverage

The loop-control pass covers `break` and `continue` inside numeric loops,
descending numeric loops with negative `by` steps, and basic collection loops
over Pine arrays with `for value in array`. The checkpoint fixture follows
common Pine loop idioms by summing selected values, skipping items with
`continue`, stopping with `break`, and walking a numeric loop downward.
