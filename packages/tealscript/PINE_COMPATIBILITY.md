# TealScript Pine Compatibility Matrix

TealScript is Pine-inspired, not a drop-in Pine runtime. This matrix tracks the
subset needed for AI-generated chart indicators to behave like common Pine
Script v5/v6 indicators.

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

## Roadmaps

Use this file for current compatibility status only. Use
[`PINE_PARITY_EPICS.md`](./PINE_PARITY_EPICS.md) for feature-parity sequencing
and [`PINE_HYGIENE_EPICS.md`](./PINE_HYGIENE_EPICS.md) for structural cleanup
that supports the parity work.

## Common `ta.*` Coverage

The common TA helper pass covers event helpers (`ta.barssince`,
`ta.valuewhen`), cumulative/window helpers (`ta.cum`, `ta.dev`,
`ta.variance`, `ta.vwma`, `ta.swma`, `ta.alma`, `ta.highestbars`,
`ta.lowestbars`), and compatibility aliases/helpers (`ta.cross`, `ta.range`,
`ta.rising`, and `ta.falling`). The statistical helper pass covers `ta.median`, `ta.mode`,
`ta.percentile_nearest_rank`, `ta.percentile_linear_interpolation`, and
`ta.percentrank`. These are covered in the golden compatibility harness.

## Common `str.*` Coverage

The common string helper pass covers `str.tostring`, `str.tonumber`,
`str.format_time`, `str.format`,
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
variadic `math.avg`, precision-aware `math.round`, `math.round_to_mintick`,
`math.trunc`, and
degree/radian conversion helpers. The checkpoint fixture follows common Pine
math idioms by averaging OHLC values, rounding to fixed precision, and
converting a right angle between radians and degrees.

## Common Global Helper Coverage

The global helper pass covers `na`, `nz`, `fixnan`, and explicit primitive
casts used by generated scripts to normalize optional source values before
plotting or comparing them.

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
`timeframe.main_period`, `timeframe.multiplier`, `timeframe.in_seconds()`, and
timeframe category flags.

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

## Common Drawing Object Coverage

The label drawing pass covers a first runtime payload slice for common
last-bar label idioms. `label.new()` accepts positional or named `x`, `y`, and
`text` arguments plus common `xloc`, `yloc`, `style`, `color`, `textcolor`, and
`size` options. The runtime returns a label handle string and records a typed
drawing output. The label mutation pass covers persistent `var` label handles,
`label.set_x()`, `label.set_y()`, `label.set_xy()`, `label.set_xloc()`,
`label.set_yloc()`, `label.set_text()`, `label.set_style()`,
`label.set_color()`, `label.set_textcolor()`, `label.set_size()`,
`label.set_tooltip()`, matching scalar getters (`get_x`, `get_y`, `get_xloc`,
`get_yloc`, `get_text`, `get_style`, `get_color`, `get_textcolor`,
`get_size`, `get_tooltip`), `label.copy()`, and `label.delete()`. Rendering
routes labels to the script pane: overlay scripts use the main pane, non-overlay
scripts use their indicator pane. GC limits, full style parity, and realtime
rollback parity remain planned.

The line drawing pass covers common trendline/channel idioms. `line.new()`
accepts positional or named `x1`, `y1`, `x2`, and `y2` arguments plus common
`xloc`, `extend`, `color`, `style`, `width`, and `force_overlay` options. The
runtime returns a line handle string and records a typed drawing output. The
mutation pass covers persistent `var` line handles, `line.set_x1()`,
`line.set_x2()`, `line.set_y1()`, `line.set_y2()`, `line.set_xy1()`,
`line.set_xy2()`, `line.set_xloc()`, `line.set_extend()`,
`line.set_color()`, `line.set_style()`, `line.set_width()`, scalar coordinate
getters, `line.get_price()`, `line.copy()`, and `line.delete()`. Rendering
routes line segments to the script pane with basic color/style/width and
horizontal extension support. `force_overlay` lines render in the main pane
even when created by non-overlay scripts. `linefill.new()` records fills between
two line handles;
`linefill.set_color()`, `linefill.get_line1()`, `linefill.get_line2()`, and
`linefill.delete()` are supported, and the renderer fills between resolved line
segments in the routed script pane. `linefill.new()` rejects missing or non-line
handles without creating a drawing. `chart.point` overloads, GC limits, full
arrow style geometry, and full realtime rollback parity remain planned.

The box drawing pass covers common supply/demand zone idioms. `box.new()`
accepts positional or named `left`, `top`, `right`, and `bottom` arguments plus
common border, fill, text, `extend`, and `xloc` options. The runtime supports
persistent `var` box handles, geometry setters (`set_left`, `set_right`,
`set_top`, `set_bottom`, `set_lefttop`, `set_rightbottom`), style/text setters,
coordinate/color/text getters, `box.copy()`, and `box.delete()`. Rendering
routes filled rectangles to the script pane with borders and a simple text
label. Full text layout, `chart.point` overloads, GC limits, and complete Pine
styling remain planned.

## Drawing Diagnostic Coverage

The `table.*` drawing namespace is accepted as parsed member calls and fails
with explicit unsupported runtime diagnostics. Table handles, lifecycle
operations, and rendering are still planned.

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
