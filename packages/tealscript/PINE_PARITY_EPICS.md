# Pine Script Parity Epic Roadmap

This roadmap tracks the work required to move TealScript from a Pine-inspired
indicator subset toward full Pine Script v6 feature parity. It is intentionally
broader than the current compatibility matrix: every epic is expected to be a
multi-phase effort implemented through small, tested PRs.

Structural cleanup that supports this parity work is tracked in
[`PINE_HYGIENE_EPICS.md`](./PINE_HYGIENE_EPICS.md). Treat that roadmap as the
engineering guardrail for large parser, runtime, worker, renderer, test, and
documentation changes.

Execute every epic and phase using the branch, review, merge, and checkpoint
rules in [`PINE_PARITY_EXECUTION_PROTOCOL.md`](./PINE_PARITY_EXECUTION_PROTOCOL.md).

Primary source references:

- [TradingView Pine Script User Manual](https://www.tradingview.com/pine-script-docs/)
- [TradingView Pine Script v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/)
- [Built-ins](https://www.tradingview.com/pine-script-docs/language/built-ins/)
- [Execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)
- [Type system](https://www.tradingview.com/pine-script-docs/language/type-system/)
- [Inputs](https://www.tradingview.com/pine-script-docs/concepts/inputs/)
- [Other timeframes and data](https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/)
- [Visuals](https://www.tradingview.com/pine-script-docs/visuals/overview/)
- [Alerts](https://www.tradingview.com/pine-script-docs/concepts/alerts/)
- [Strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)
- [Time](https://www.tradingview.com/pine-script-docs/concepts/time/)
- [Sessions](https://www.tradingview.com/pine-script-docs/concepts/sessions/)
- [Timeframes](https://www.tradingview.com/pine-script-docs/concepts/timeframes/)
- [Non-standard charts data](https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/)
- [Libraries](https://www.tradingview.com/pine-script-docs/concepts/libraries/)
- [Limitations](https://www.tradingview.com/pine-script-docs/writing/limitations/)

## Current Baseline

The current runtime already covers a useful common-indicator subset:

- Parser support for version annotations, `indicator()` / `strategy()`
  declarations, variable declarations, typed declarations, `var` / `varip`,
  tuple destructuring, reassignment, conditionals, loops, `switch`, UDFs,
  member calls, index/history access, array literals, comments, and common
  literals.
- Runtime support for bar-by-bar execution, common OHLCV and derived series,
  `bar_index`, `last_bar_index`, common `barstate.*`, `syminfo.*`, and
  `timeframe.*` fields.
- Partial built-in coverage across `ta.*`, `math.*`, `str.*`, `input.*`,
  `array.*`, `color.*`, time/calendar helpers, visual outputs, drawing objects,
  and alerts.
- Compatibility golden tests for UDFs, scope/series behavior, arrays, common TA,
  strings, inputs, colors, math, switch, loops, barstate, chart info, calendar,
  session time, alerts, bar coloring, OHLC plotting, fill handles, and common
  drawing object handles.

Known structural gaps:

- Pine's qualified type system (`const < input < simple < series`) is not
  modeled as a first-class compiler/runtime contract.
- `request.*`, `map.*`, `matrix.*`, `polyline.*`, `table.*`, libraries, and
  strategy execution are not implemented.
- Some parser/runtime docs are stale relative to recent compatibility work.
- Some semantics are approximate, especially source-series inference, `na`
  propagation, realtime `varip`, named timezones, sessions, and higher-timeframe
  behavior.

## Epic Order

The recommended order prioritizes the features that unlock the most public Pine
scripts and reduce later rework:

1. Compatibility harness and source-of-truth cleanup.
2. Core language and semantic hardening.
3. Qualified type system and diagnostics.
4. Runtime execution model parity.
5. Standard library parity pass.
6. Inputs and declaration metadata parity.
7. Time, sessions, and timeframe completion.
8. `request.*` and multi-context data engine.
9. Ticker and non-standard chart data.
10. Visual primitives and plot parity.
11. Drawing object model.
12. Collections, UDTs, methods, and libraries.
13. Alerts and logs.
14. Strategy broker emulator.
15. Limits, performance, and sandboxing.
16. Real Pine checkpoint suite.

## Epic 1: Compatibility Harness And Source Of Truth

Goal: make parity work measurable and keep docs/tests aligned.

Phases:

1. Replace stale roadmap snippets in `PINE_COMPATIBILITY.md` with links to this
   epic roadmap and a generated or audited current-status matrix.
2. Add a checklist format for every parity PR: parser fixture, runtime fixture,
   reduced Pine idiom fixture, docs update, and negative diagnostics where
   relevant.
3. Split compatibility tests into topic files once `pine-golden.test.ts`
   becomes too large.
4. Add reduced fixtures derived from official docs and common public idioms,
   with deterministic bars and checked output values.
5. Add explicit "unsupported by design" diagnostics for features that remain out
   of phase scope.

Done means a new contributor can identify implemented, partial, planned, and
unsupported features without reading the runtime.

## Epic 2: Core Language And Semantic Hardening

Goal: parse and evaluate Pine's core language forms reliably before adding more
built-ins.

Phases:

1. Full indentation and line-continuation hardening for nested blocks, wrapped
   expressions, multi-line calls, and complex UDF bodies.
2. Complete assignment semantics for identifier, member, and index targets,
   including compound assignment.
3. Harden UDF behavior: nested scopes, recursive rejection or support, default
   parameters if required, tuple returns, branch/loop return values, and call
   site series behavior.
4. Complete control-flow semantics for `if`, `switch`, `for`, `while`,
   `break`, `continue`, and loop return expressions.
5. Normalize Pine truthiness, equality, comparison, casting, and `na`
   propagation across arithmetic, logical operators, and ternaries.
6. Add `runtime.error()` and consistent runtime error payloads.

Done means common Pine snippets fail only for missing features, not language
shape.

## Epic 3: Qualified Type System And Diagnostics

Goal: model Pine's type qualifiers and overload rules instead of accepting
everything dynamically.

Phases:

1. Build a semantic checker pass over the AST with symbol tables, declarations,
   UDF signatures, and source locations.
2. Implement value/reference types: `int`, `float`, `bool`, `color`, `string`,
   `void`, arrays, matrices, maps, drawing object IDs, `chart.point`, and UDTs.
3. Implement qualifiers: `const`, `input`, `simple`, and `series`, including
   qualifier promotion rules.
4. Add overload validation for built-ins and helpful diagnostics for bad
   argument names, bad argument order, unsupported mixed positional/named forms,
   and bad return usage.
5. Add type templates such as `array<float>`, `matrix<int>`, and
   `map<string, float>`.
6. Surface diagnostics through the worker/editor path.

Done means TealScript can reject invalid Pine-like code before runtime and can
use type information to disambiguate built-ins.

## Epic 4: Runtime Execution Model Parity

Goal: match Pine's bar execution model closely enough that historical and
realtime indicators behave predictably.

Phases:

1. Audit historical bar execution, series commitment, rollback, and expression
   history storage.
2. Implement realtime tick execution and rollback semantics for open bars.
3. Complete `var` and `varip`, including intrabar persistence differences.
4. Implement `max_bars_back` inference/enforcement and clearer unavailable
   history behavior.
5. Harden `barstate.*` across historical, realtime, and replay-style updates.
6. Add repaint-focused fixtures for confirmed/unconfirmed data behavior.

Done means indicator values do not drift between historical calculation and live
updates for supported constructs.

## Epic 5: Standard Library Parity Pass

Goal: close the common built-in namespace gaps systematically.

Phases:

1. Build a generated/manual inventory of v6 built-ins from the Reference Manual
   into tracked coverage tables.
2. Finish `ta.*`: correlation, oscillator variants, smoothing variants,
   edge-case parity, tuple returns, and exact `na` handling.
3. Finish `math.*`: random behavior, mintick rounding, overloads, and exact
   integer/float behavior.
4. Finish `str.*`: `str.tonumber`, `str.format_time`, formatting edge cases,
   Unicode/string escape behavior, and placeholder compatibility.
5. Finish `color.*`: exact constants, transparency, channel extraction,
   gradients, and theme-sensitive behavior where possible.
6. Add remaining global helpers such as `nz`, `fixnan`, and typed casts with
   Pine-compatible semantics.

Done means missing built-ins are tracked as explicit unsupported items, not
surprises.

## Epic 6: Inputs And Declaration Metadata

Goal: make script settings and declaration parameters behave like Pine settings.

Phases:

1. Complete `indicator()` metadata: `shorttitle`, `overlay`, `format`,
   `precision`, `scale`, `timeframe`, `timeframe_gaps`, object limits,
   `explicit_plot_zorder`, `dynamic_requests`, and `behind_chart`.
2. Complete typed `input.*` definitions: min/max/step, options, confirm,
   tooltip, group, inline, display, active, and default validation.
3. Implement `input.price()` and interactive time/price point inputs if needed
   for chart UX parity.
4. Support source inputs that can reference another plot or host-provided source
   catalog.
5. Implement reload/re-execution semantics when input values change.
6. Thread declaration/input metadata to Tealchart UI consistently.

Done means a pasted indicator exposes a faithful settings surface.

## Epic 7: Time, Sessions, And Timeframes

Goal: make time-dependent Pine scripts reliable.

Phases:

1. Add named IANA timezone support and exchange timezone injection.
2. Complete calendar functions and variables across timezone arguments.
3. Complete `timestamp()`, `time`, `time_close`, `timenow`, and
   `last_bar_time` variants.
4. Complete session strings: day masks, overnight sessions, multi-segment
   sessions, regular/extended session behavior, and session-state helpers.
5. Add timeframe parsing and validation for ticks, seconds, minutes, days,
   weeks, and months.
6. Implement `timeframe.in_seconds()` and timeframe comparison helpers.
7. Add higher-timeframe `time()` / `time_close()` aggregation semantics.

Done means session filters and MTF time gates behave like Pine across common
markets.

## Epic 8: `request.*` And Multi-Context Data Engine

Goal: support scripts that request other symbols, higher/lower timeframes, and
external data contexts.

Phases:

1. Design the runtime datafeed contract for deterministic offline tests and
   Tealchart live integration.
2. Implement `request.security()` for same-symbol higher timeframe with
   `gaps`, `lookahead`, `ignore_invalid_symbol`, and `calc_bars_count`.
3. Add other-symbol requests and metadata/currency routing.
4. Implement `request.security_lower_tf()` returning arrays of intrabar values.
5. Support dynamic requests and nested request restrictions/parity.
6. Add optional request families: `currency_rate`, `dividends`, `splits`,
   `earnings`, `financial`, `economic`, `seed`, and `footprint`, gated by
   available data.
7. Add repaint-safe HTF fixtures based on official patterns.

Done means MTF trend filters, other-symbol overlays, and lower-timeframe tools
can run deterministically.

## Epic 9: Ticker And Non-Standard Chart Data

Goal: support Pine's ticker constructors and synthetic chart data workflows.

Phases:

1. Implement `ticker.new()` and regular/extended session ticker construction.
2. Implement `ticker.heikinashi()` and request-backed synthetic OHLC.
3. Add `ticker.renko()`, `ticker.linebreak()`, `ticker.kagi()`, and
   `ticker.pointfigure()` where the chart data engine can supply deterministic
   bars.
4. Add symbol modifier propagation through `request.security()`.
5. Document unsupported synthetic backtest caveats until strategy parity exists.

Done means common non-standard chart scripts can request and plot synthetic
series.

Epic 9 implementation note: ticker constructors and request propagation are
implemented for indicator calculations. Synthetic strategy/backtest behavior is
documented as unsupported in `TICKER_DATA_DESIGN.md` and remains owned by Epic
14's broker-emulator work.

## Epic 10: Visual Primitives And Plot Parity

Goal: make Pine's non-object visual outputs render faithfully.

Phases:

1. Finish `plot()` parameters: style, linewidth, color, offset, trackprice,
   histbase, join, editable, display, format, precision, force overlay, and
   z-order.
2. Finish `hline()` handles and visual settings.
3. Finish `fill()` for plot/hline handles, fill gaps, title/editable/display,
   and color series behavior.
4. Finish `plotshape`, `plotchar`, and `plotarrow` text, location, size,
   offset, display, and color behavior.
5. Finish `bgcolor`, `barcolor`, `plotbar`, and `plotcandle` edge cases.
6. Add renderer-level screenshot or pixel tests where practical.

Done means visual-only indicators retain their main chart appearance.

## Epic 11: Drawing Object Model

Goal: implement Pine's stateful visual objects.

Phases:

1. Define runtime object storage, handle IDs, per-script object ownership,
   garbage collection, and max object counts.
2. Implement `chart.point` and coordinate systems: `xloc.bar_index`,
   `xloc.bar_time`, `yloc.price`, above/below bar, future coordinates, and pane
   targeting.
3. Complete `label.*`: GC limits, full style parity, realtime rollback parity,
   and remaining renderer details after the current constructor, mutation,
   copy/delete, and basic renderer support.
4. Complete `line.*` and `linefill.*`: `chart.point` overloads, full line style
   geometry, GC limits, realtime rollback parity, and remaining renderer details
   after the current constructor, mutation, copy/delete, handle validation, and
   basic renderer support.
5. Complete `box.*` and implement `polyline.*`: finish box text/layout,
   `chart.point` overloads, GC limits, realtime rollback parity, and add
   polyline lifecycle plus renderer support.
6. Implement `table.*`: fixed positioning, cells, setters, text formatting,
   sizing, background/frame/border, and renderer integration.
7. Add lifecycle tests for mutation, deletion, copying, GC limits, and realtime
   rollback.

Done means label/table/line-heavy public scripts display usable overlays.

## Epic 12: Collections, UDTs, Methods, And Libraries

Goal: support complex Pine libraries and object-oriented Pine patterns.

Phases:

1. Finish array parity: sorting, slicing, joining, reversing, binary search,
   percentiles, standardization, covariance helpers, and edge cases.
2. Implement `matrix.*` with typed storage, arithmetic/stat helpers, row/column
   access, copy/reshape behavior, and tests.
3. Implement `map.*` with key/value typing, insertion, lookup, removal, keys,
   values, copy, and iteration.
4. Implement user-defined types (`type`), fields, constructors, methods, and
   reference semantics.
5. Implement method declarations and method dispatch beyond array method sugar.
6. Implement `library()`, `export`, `import`, versioned module resolution, and
   library diagnostics.

Done means library-heavy Pine v5/v6 scripts can be reduced and run without
large rewrites.

## Epic 13: Alerts And Logs

Goal: make alert and diagnostic behavior useful in both runtime and UI.

Phases:

1. Complete `alert()` frequency behavior: all calls, once per bar, and once per
   bar close.
2. Complete `alertcondition()` static title/message behavior and placeholder
   handling.
3. Add strategy order-fill alert message support after strategy runtime starts.
4. Implement `log.*` levels and UI/worker plumbing for Pine Logs-style output.
5. Add realtime alert tests so historical calculation does not emit false live
   alerts.

Done means scripts can produce trustworthy runtime events, not just plots.

## Epic 14: Strategy Broker Emulator

Goal: implement Pine strategy execution and enough Strategy Tester state for
backtesting workflows.

Status: implemented for the deterministic OHLC broker emulator. The runtime now
exports strategy settings, orders, fills, open/closed trades, position state,
equity snapshots, commissions, runup/drawdown, strategy namespace variables,
trade accessors, order-fill alerts, and deterministic fixtures. Market, limit,
stop, stop-limit, bracket, trailing-stop, partial-exit, OCA-cancel,
pyramiding, and reversal flows are covered. Full TradingView intrabar path
parity, bar magnifier, and lower-timeframe fill simulation remain deferred
future work because they require an explicit intrabar data model rather than the
current OHLC-only execution model.

Phases:

1. Design strategy ledger types: orders, fills, positions, trades, equity,
   commissions, slippage, margin, and runup/drawdown.
2. Implement `strategy()` declaration settings and strategy namespace state
   variables.
3. Implement orders: `entry`, `order`, `exit`, `close`, `close_all`, `cancel`,
   and `cancel_all`.
4. Implement order types: market, limit, stop, stop-limit, brackets, trailing
   stops, partial exits, OCA, pyramiding, and reversals.
5. Implement recalculation knobs: `calc_on_every_tick`,
   `calc_on_order_fills`, `process_orders_on_close`, and bar magnifier/lower
   timeframe fill simulation if data is available.
6. Implement `strategy.opentrades.*` and `strategy.closedtrades.*` accessors.
7. Add strategy visuals, alerts, and deterministic backtest fixtures.

Done means strategy scripts can be backtested with documented OHLC
broker-emulator semantics.

## Epic 15: Limits, Performance, And Sandboxing

Goal: enforce Pine-like limits and keep user scripts safe and predictable.

Phases:

1. Implement loop, execution-time, memory, object-count, plot-count,
   request-count, and table-cell limits. Request-count coverage currently
   enforces 40 unique `request.*` contexts per script pass, and plot-count
   coverage enforces 64 non-`hline()` plot outputs per script. Table-cell
   coverage enforces a 10,000-cell TealScript sandbox cap across live tables.
2. Add script-size and parser-depth protections.
   Source-size coverage rejects scripts above 1,000,000 UTF-16 code units, and
   parser-depth coverage rejects ASTs deeper than 1,000 nodes.
3. Optimize hot built-ins and series storage for long histories.
4. Add cancellation/yielding in worker execution for expensive scripts.
5. Harden runtime isolation: no host access, deterministic randomness where
   needed, safe errors, and no unbounded allocation.
6. Add profiling hooks useful during compatibility work.

Done means hostile or accidentally expensive scripts cannot degrade the chart.

## Epic 16: Real Pine Checkpoint Suite

Goal: validate parity against real Pine idioms without depending on TradingView
at CI time.

Phases:

1. Curate source-linked reduced fixtures from official docs for each major
   concept.
2. Curate source-linked reduced fixtures from public common idioms: MTF trend
   filters, divergence scripts, liquidity zones, session filters, labels,
   tables, and simple strategies.
3. For each fixture, use deterministic local bars and hand-checked expected
   outputs, not live TradingView execution in CI.
4. Add manual comparison notes for milestone scripts where visual parity matters.
5. Keep large public scripts out of the repo unless licensing is explicit;
   preserve only reduced semantic fixtures.

Done means every parity epic has regression tests that reflect real Pine usage.

## Near-Term Candidate PR Sequence

These PRs are the most useful next steps after the current visual-object work is
unblocked:

1. Source-of-truth cleanup: fix stale `PINE_COMPATIBILITY.md` claims and link
   this roadmap.
2. Core semantics: `na`, truthiness, cast, and equality parity fixtures.
3. Member/index assignment: make parsed assignment targets work or emit precise
   diagnostics.
4. `request.security()` design doc plus deterministic datafeed fixture harness.
5. `request.security()` same-symbol higher-timeframe MVP.
6. Label object output and renderer MVP.
7. Table object MVP.
8. Named timezone/session completion.
9. `matrix.*` MVP.
10. `map.*` MVP.
