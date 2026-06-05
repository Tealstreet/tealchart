# Pine Copy-Paste Compatibility Roadmap

This roadmap tracks the work required to make public TradingView Pine scripts
copy-paste compatible with the TealScript runtime. The first success bar is
that common published Pine Script v5/v6 code parses, semantically validates,
and executes without manual rewrites. TradingView-identical rendering remains
the final goal, but early work should accept approximate rendering when scripts
run and emit usable plots, drawings, alerts, logs, strategy metadata, or
execution results.

Structural cleanup that supports this parity work is tracked in
[`PINE_HYGIENE_EPICS.md`](./PINE_HYGIENE_EPICS.md). Treat that roadmap as the
engineering guardrail for large parser, runtime, worker, renderer, test, and
documentation changes.

Execute every epic, PR, and phase using the branch, review, merge, and
checkpoint rules in
[`PINE_PARITY_EXECUTION_PROTOCOL.md`](./PINE_PARITY_EXECUTION_PROTOCOL.md).

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

## North Star

The product goal is copy-paste compatibility for scripts published on
TradingView: a user should be able to paste PineScript into TealScript and have
it parse and run. Work should be chosen by compatibility impact, not by
subsystem neatness.

Use this priority order when choosing or scoping epics:

1. Copy-paste syntax compatibility for public PineScript.
2. Runtime execution for common public-script idioms.
3. Built-in namespace breadth and overload shapes that unblock many scripts.
4. Deterministic semantic fixtures reduced from official docs and public idioms.
5. Rendering fidelity and TradingView-exact edge cases once they affect common
   scripts or block user-visible correctness.

Avoid rabbit holes by requiring evidence before deep work on rare semantics:
the feature should appear in official docs, common public scripts, or be a
dependency for a broader compatibility epic.

## Roadmap Principles

- **Epics are outcome-sized.** A large epic may require several PRs. Each PR
  should be phase-sized, coherent, reviewable, and independently verified.
- **Harness steers feature order.** Real-script intake, failure classification,
  and reduced fixtures should continuously influence what feature work comes
  next.
- **Parse/run beats exact pixels.** Renderer fidelity matters, but it should
  not block language, runtime, data, strategy, or output-payload work that lets
  more scripts run.
- **Split exactness from enablement.** Built-in breadth, call-shape support,
  and usable output payloads usually come before TradingView-exact edge
  behavior.
- **Keep large public scripts out of CI.** Use source-linked metadata and
  reduced deterministic fixtures unless licensing explicitly allows raw source
  storage.

## Current Baseline

The current runtime already covers a useful common-script subset:

- Parser support for version annotations, `indicator()` / `strategy()` /
  `library()` declarations, imports, exported helpers, variable declarations,
  typed declarations, `var` / `varip`, tuple destructuring, reassignment,
  conditionals, loops, `switch`, UDFs, methods, UDTs, enums, member calls,
  index/history access, array literals, comments, and common literals.
- Runtime support for bar-by-bar execution, common OHLCV and derived series,
  `bar_index`, `last_bar_index`, common `barstate.*`, `syminfo.*`,
  `timeframe.*`, alerts/logs, request datafeeds, drawing/table outputs, and a
  deterministic OHLC strategy broker emulator.
- Broad but partial built-in coverage across `ta.*`, `math.*`, `str.*`,
  `input.*`, `array.*`, `map.*`, `matrix.*`, `color.*`, time/calendar helpers,
  visual outputs, drawing objects, tables, requests, tickers, alerts/logs, and
  strategies.
- Compatibility fixtures for real Pine idioms including MTF filters,
  divergence, session filters, dynamic sessions, timeframe comparisons, bar
  coloring, plot-style payloads, alerts, request-limit reuse, strategy
  entry/exit flows, default broker-emulator path and gap-fill behavior, and
  common drawing/table patterns.

Known structural gaps:

- The harness has a real-script intake ledger, offline pass-rate summaries, and
  a stable parse/semantic/runtime/data/output/render failure taxonomy. The
  remaining gap is scaling the ledger with more public-script metadata and
  producing a generated dashboard artifact in CI.
- Layout parsing still needs a general indentation/continuation model that can
  scale to arbitrary nested pasted Pine code.
- Pine's qualified type system (`const < input < simple < series`) is partially
  modeled but not yet a complete compiler/runtime contract.
- Some runtime semantics remain approximate, especially source-series
  inference, realtime `varip`, exchange calendar catalogs, full historical
  `max_bars_back` behavior, strategy intrabar/recalculation semantics, and
  live host metadata/data availability.
- Renderer output is useful for many scripts, but TradingView-exact geometry,
  z-order, pixel sizing, and Strategy Tester UI parity are later work.

## Epic Order

The recommended order prioritizes copy-paste execution of public Pine scripts
and reduces later rework:

1. Compatibility steering system.
2. Pine layout parser.
3. Declarations and type syntax.
4. Call binding and diagnostics.
5. Core runtime semantics.
6. UDFs, methods, and control-flow returns.
7. Built-in breadth.
8. Runtime context and time.
9. Requests and ticker contexts.
10. Collections and user objects.
11. Visual runtime outputs.
12. Basic renderer usability.
13. Strategy execution.
14. Renderer fidelity.
15. Deep and rare parity.

## Epic 1: Compatibility Steering System

Goal: make copy-paste compatibility measurable and let real-script failures
drive feature order.

Phases:

1. Define a machine-readable outcome model for parse, semantic, runtime,
   datafeed, output, and render stages.
2. Add stable failure classes such as `parse_gap`, `semantic_gap`,
   `unsupported_planned`, `runtime_gap`, `data_gap`, `render_gap`,
   `oracle_gap`, and `licensing_blocked`.
3. Create a real-script intake ledger for source URL/search context, license
   status, retrieval date, Pine version, script category, feature tags, and
   raw-source storage policy.
4. Build an offline corpus runner that emits JSON/Markdown summaries without
   network or TradingView dependencies at CI time.
5. Define fixture reduction and promotion rules: when raw failures become
   deterministic tests, where they live, and what output oracle is required.
6. Add a checkpoint coverage index by public-script idiom: MTF filters,
   divergence, session filters, strategy brackets, drawing/table dashboards,
   libraries, alerts, screeners, and synthetic tickers.
7. Generate a trendable pass-rate report: total scripts, parse pass, semantic
   pass, runtime pass, usable-output pass, top failure classes, and regressions.

Done means roadmap order is driven by measurable real-script blockers rather
than local implementation preference.

## Epic 2: Pine Layout Parser

Goal: make pasted Pine layout parse reliably before deeper feature work.

Phases:

1. Replace fixed-depth indentation handling with a general block model for
   arbitrary nesting.
2. Harden mixed tab/space policy, dedent handling, blank lines, comments, and
   compiler annotations in nested blocks.
3. Complete line continuation after and before operators.
4. Support wrapped declarations, calls, tuple patterns, generics, index/member
   chains, arrays, maps, matrices, and nested expressions consistently.
5. Ensure multiline UDF, method, type, enum, and library bodies share the same
   block parser.
6. Add parser checkpoints from reduced public Pine snippets.

Done means parse failures are feature-specific, not layout-shape failures.

## Epic 3: Declarations And Type Syntax

Goal: accept the declaration and type shapes common public scripts use.

Phases:

1. Complete `indicator()`, `strategy()`, and `library()` declaration argument
   syntax and metadata capture.
2. Complete `import`, `export`, aliases, version syntax, and local deterministic
   registry hooks.
3. Complete variable declarations, typed declarations, tuple declarations,
   `var`, `varip`, and generic collection annotations.
4. Complete UDT/type declarations, field defaults, field annotations, enum
   declarations, enum titles, and dotted imported type annotations.
5. Add parser and semantic diagnostics for declaration shapes that remain out
   of phase scope.

Done means common declaration/module syntax parses and produces stable AST and
semantic metadata.

## Epic 4: Call Binding And Diagnostics

Goal: let pasted scripts fail clearly for missing features instead of failing
through ambiguous call handling.

Phases:

1. Normalize positional, named, and mixed argument binding for built-ins, UDFs,
   methods, constructors, and imported helpers.
2. Add stable diagnostics for unknown args, duplicate bindings, arity, invalid
   argument order, invalid templates, unsupported return contexts, and
   unsupported feature gates.
3. Prioritize curated overloads by public-script frequency before exact
   full-reference overload coverage.
4. Surface parse/semantic/runtime diagnostic codes through worker/editor
   result paths.
5. Connect diagnostics to the compatibility steering failure taxonomy.

Done means call-shape issues are actionable and measurable across the real
script corpus.

## Epic 5: Core Runtime Semantics

Goal: make parsed scripts execute predictably over historical bars.

Phases:

1. Normalize Pine truthiness, equality, comparison, primitive casts, and `na`
   propagation across arithmetic, logical operators, ternaries, and built-ins.
2. Complete history references for built-in series, derived series, expression
   history, UDF call results, collection references, and unavailable/future
   values.
3. Complete assignment and mutability semantics for identifiers, UDT fields,
   array/map/matrix indexes, compound assignments, and invalid targets.
4. Complete historical series commitment and function-local series behavior.
5. Maintain explicit `max_bars_back` enforcement and add inferred runtime buffer
   sizing when corpus evidence requires it.
6. Add stable runtime error payloads and `runtime.error()` coverage.
7. Add focused fixtures for common public-script idioms that previously parsed
   but failed or drifted at runtime.

Done means common historical indicator scripts run without semantic drift for
supported features.

## Epic 6: UDFs, Methods, And Control-Flow Returns

Goal: support Pine's function and method execution model for public script
logic.

Phases:

1. Complete UDF parameter defaults, named args, tuple returns, branch returns,
   loop returns, recursion policy, and local scopes.
2. Complete `if`, `switch`, `for`, `while`, `break`, and `continue` as
   expression-returning constructs where Pine allows them.
3. Complete user-defined method declarations, receiver dispatch, receiver
   qualifiers, overload selection, and method-vs-field diagnostics.
4. Support imported methods on imported UDT instances through the deterministic
   registry.
5. Add call-site series fixtures for UDFs and methods used in loops, branches,
   and request expressions.

Done means public scripts that package logic in UDFs and methods execute
without rewrites.

## Epic 7: Built-In Breadth

Goal: maximize the number of public scripts that can execute by covering common
built-in names, argument shapes, and return shapes.

Phases:

1. Maintain an official-reference inventory of built-in namespaces and local
   coverage.
2. Prioritize API breadth and common overloads for `ta.*`, `math.*`, `str.*`,
   `color.*`, globals, `runtime.*`, and `input.*`.
3. Keep exact numerical edge parity, uncommon overloads, and rare warmup
   behavior as later phases unless corpus failures show high impact.
4. Merge run-critical `input.*` and declaration metadata support here; defer UI
   reload/threading fidelity to product integration work.
5. Add public-idiom checkpoints for missing built-ins before implementing deep
   edge behavior.

Done means missing built-in names and common overload shapes are no longer the
dominant corpus failure class.

## Epic 8: Runtime Context And Time

Goal: provide the chart, symbol, time, session, and timeframe context common
scripts expect.

Phases:

1. Complete `syminfo.*`, `timeframe.*`, chart timeframe metadata, and host
   metadata injection contracts.
2. Complete calendar variables/functions, `timestamp()`, `time`, `time_close`,
   `timenow`, `last_bar_time`, and `str.format_time()` for common IANA and UTC
   offset usage.
3. Complete time-based sessions, overnight sessions, multi-segment sessions,
   day masks, named sessions where host data exists, and regular/extended
   session routing.
4. Add exchange calendar and closure catalog hooks without making CI depend on
   live exchange calendars.
5. Add public-script fixtures for session filters, market-hours logic, and
   timeframe comparisons.

Done means context/time/session gaps are not dominant runtime blockers for
common public scripts.

## Epic 9: Requests And Ticker Contexts

Goal: support the data-request patterns that unblock multi-timeframe and
multi-symbol public scripts.

Phases:

1. Keep `request.security()` and `request.security_lower_tf()` as the early
   priority: gaps, lookahead, dynamic requests, nested request guards,
   calc-bars count, and repaint-safe HTF patterns.
2. Merge run-critical `ticker.*` basics with request work: `ticker.new`,
   sessions, adjustments, Heikin-Ashi, Renko/Line Break/Kagi/Point & Figure IDs,
   and symbol modifier propagation.
3. Complete deterministic datafeed routing, host metadata/currency routing, and
   invalid symbol/timeframe handling.
4. Support point-series request families such as dividends, earnings, splits,
   financial, economic, currency rates, and seed where host data exists.
5. Defer `request.footprint()` until host footprint/intrabar-volume data is
   available.
6. Maintain corpus-driven checkpoints for MTF trend filters, lower-timeframe
   arrays, synthetic ticker IDs, and request-limit reuse.

Done means MTF and multi-symbol scripts can run against deterministic or
host-provided data.

## Epic 10: Collections And User Objects

Goal: support the collection and object patterns used by public scripts without
making rare matrix math dominate early work.

Phases:

1. Keep `array.*` core, method sugar, sorting, slicing, joining, statistical
   helpers, and array history as the first collection priority.
2. Complete `map.*` constructors, mutation, lookup, iteration, key/value
   arrays, history/reference behavior, and common diagnostics.
3. Complete UDT constructors, defaults, field access, reference assignment,
   copy semantics, rollback, nested collection fields, and `varip` field rules.
4. Complete matrix API breadth used by public scripts; defer rare numerical
   exactness such as repeated-eigenvalue basis parity unless corpus demand
   justifies it.
5. Keep library/module version lookup as later work unless corpus failures show
   it blocks many scripts.

Done means public scripts using arrays, maps, UDT state, and common matrices can
execute.

## Epic 11: Visual Runtime Outputs

Goal: emit Pine-shaped output payloads for scripts that run, independent of
exact TradingView rendering.

Phases:

1. Complete runtime metadata and stable payloads for `plot`, `hline`, `fill`,
   `bgcolor`, `barcolor`, `plotbar`, `plotcandle`, `plotshape`, `plotchar`,
   and `plotarrow`.
2. Complete drawing object runtime payloads and lifecycle semantics for
   labels, lines, linefills, boxes, polylines, `chart.point`, and tables.
3. Enforce object limits, plot limits, table-cell limits, handle validation,
   deletion/copy behavior, and realtime rollback.
4. Keep table API work separate inside this epic because the setter surface is
   broad and easy to let sprawl.
5. Add output-oracle fixtures for public idioms that care about metadata more
   than pixels.

Done means pasted scripts can produce usable, inspectable output payloads even
when renderer fidelity is not final.

## Epic 12: Basic Renderer Usability

Goal: make emitted outputs visible and routed correctly in Tealchart.

Phases:

1. Route plot, drawing, table, alert/log, and strategy outputs atomically from
   worker/runtime to host chart state.
2. Honor pane routing, overlay behavior, `force_overlay`, `display.none`,
   object ordering, and basic z-order.
3. Render visual primitives and drawing/table objects with usable basic style
   metadata.
4. Add renderer command-trace or snapshot tests for visibility and routing, not
   pixel-perfect parity.
5. Keep exact marker geometry, label/table sizing, price-scale labels, and
   screenshot/pixel infrastructure for the renderer fidelity epic.

Done means scripts that run are visibly useful in Tealchart.

## Epic 13: Strategy Execution

Goal: make public strategy scripts execute with a Pine-shaped broker model
before exact Strategy Tester UI parity.

Phases:

1. Maintain strategy declaration settings, namespace variables, order APIs,
   trade accessors, order-fill alerts, and semantic diagnostics.
2. Refactor fills to consume ordered execution ticks while preserving existing
   deterministic OHLC behavior.
3. Add gap-crossing and path-order fixtures for Pine's default broker path.
4. Add lower-timeframe path fills behind explicit host-provided intrabar data.
5. Maintain bounded `calc_on_order_fills` recalculation coverage.
6. Maintain `calc_on_every_tick` realtime strategy checkpoint coverage.
7. Expand reduced TradingView checkpoint fixtures for bar magnifier and
   recalculation examples.
8. Defer Strategy Tester UI, exact report parity, synthetic backtest exactness,
   and performance polish until execution semantics are sound.

Done means common public strategies can run and expose a useful strategy ledger.

## Epic 14: Renderer Fidelity

Goal: tighten visual parity once scripts already parse, run, and emit usable
outputs.

Phases:

1. Add renderer fidelity infrastructure: screenshot or command-trace fixtures,
   stable viewport setup, and manual visual comparison notes for milestone
   scripts.
2. Improve plot and marker geometry, price-scale labels, z-order, line styles,
   histogram/area edge cases, and offset/show-last behavior.
3. Improve label, line, box, polyline, and table pixel geometry, sizing,
   wrapping, alignment, fonts, and theme behavior.
4. Add renderer regression fixtures only when the behavior affects common
   scripts or milestone visuals.

Done means Tealchart rendering approaches TradingView for high-value public
script visuals.

## Epic 15: Deep And Rare Parity

Goal: finish specialized features after broad copy-paste parse/run coverage is
measurable.

Phases:

1. Implement `request.footprint()` once host footprint/intrabar-volume data is
   available.
2. Complete rare matrix numerical edge cases and exact reference-manual corner
   behavior.
3. Complete library publishing/version lookup and remote TradingView-style
   library resolution if product requirements demand it.
4. Complete synthetic ticker strategy/backtest exactness.
5. Complete hard wall-clock/memory quotas, profiling polish, and rare
   limitation edge cases.
6. Complete Strategy Tester UI/report fidelity.

Done means remaining gaps are rare, documented, and no longer block common
public-script copy-paste use.

## Near-Term Candidate PR Sequence

Keep this list focused on the next useful PRs from the current baseline. Update
it whenever the compatibility steering data says another blocker has higher
impact.

1. Roadmap remap: replace stale subsystem-first planning docs with this
   copy-paste compatibility roadmap.
2. Strategy broker path checkpoint: keep official default broker-emulator OHLC
   path, opening-gap fill assumptions, stop-limit activation/fill behavior, and
   selective immediate close/fill-alert/entry-direction behavior covered in the
   source-linked corpus.
3. Harness incomplete outcomes: keep canonical `not_run` stages failing corpus
   pass-rate summaries unless they are explicitly marked `skipped`.
4. Pine layout parser audit fixtures: keep reduced coverage for top-level
   nested dedents, fifth-level UDF branches, wrapped indented expressions,
   wrapped function/method signatures, and shared library/type/method blocks
   before deeper parser architecture changes.
5. Call-binding diagnostics sweep: keep signed built-in namespace typo
   diagnostics, drawing constructor argument signatures, typed `input.*`
   default diagnostics, and `input.int()` / `input.float()` range-vs-options
   overload diagnostics covered while using corpus failures to prioritize
   remaining named/positional overload gaps.
6. Visual output payload audit: keep marker dynamic text-color payloads,
   hidden-marker style masking, the source-linked marker payload checkpoint,
   and other runtime visual metadata stable before investing in renderer
   fidelity.
