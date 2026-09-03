# Pine/TealScript Parity Audit

Scope: indicator parser, evaluator, request-data, and rendering parity. PineTS
was used as behavioral context only; no PineTS source was copied or ported.

## Supported

- Parser/semantic support covers v4/v5/v6 declarations, UDFs, methods, UDTs,
  enums, tuples, loops, `if`, `switch`, ternaries, generic collections, and
  tuple shape diagnostics across direct expressions and control-flow arms.
- Evaluator and compiled execution both cover bar-by-bar series semantics,
  history references, tuple destructuring, root and function-local state,
  arrays, maps, matrices, strategy state, request routing, alerts/logs, and
  normalized visual/drawing outputs.
- The external-style compatibility classifier runs reduced raw Pine sources
  through parse, semantic, runtime, datafeed, compiled fallback, output, and
  render-normalization stages with deterministic bars and in-memory request
  data. The request/ticker/session/runtime corpus currently classifies 85
  reduced fixtures: 77 pass, no planned unsupported entries, seven intentional
  self-test/negative diagnostics, and one actionable datafeed parity gap.
- Composite public-style indicator coverage now runs twenty-one original dense
  indicators, including five 150-300 line composites and six awkward valid
  style composites, through parse, semantic
  checks, legacy runtime execution, compiled execution, request datafeed routing,
  and normalized plot/drawing/alert output parity. These fixtures combine
  imports, block-bodied UDFs, request wrappers, session/timeframe/chart gates,
  arrays/maps/UDTs, var state, tables/labels/lines/boxes, plots/fills/hlines/
  bgcolor/plotshape/plotarrow/plotbar/plotcandle, alertconditions, multiline
  calls, nested ternaries, long boolean chains, method chaining, tuple branch
  reassignment, and awkward indentation/comment placement.
- Compiled Pine Logs formatting now matches the legacy runtime for numeric
  placeholders such as `{0:#.0}` in `log.info()`, `log.warning()`, and
  `log.error()` output.
- Compiled logical `and`/`or` now short-circuit with Pine truthiness, matching
  the legacy runtime for public guard idioms that place `runtime.error()` on an
  unreachable operand.
- `runtime.error(message=...)` is covered in compiled execution;
  named-message guards in copied indicators no longer classify as runtime gaps.
- Compiled request wrapper parity covers common UDF helpers where
  `request.security()`, legacy `security()`, `request.security_lower_tf()`, or
  `request.seed()` use a source parameter directly, or captured computed `ta.*`
  expressions, as the request expression; compiled request subprograms also
  preserve referenced root-scope regular values such as input-derived lengths,
  forward `input.source()` aliases into requested contexts, reconstruct
  request-expression UDF locals built from captured parameters and series
  sources, and isolate request expression subprograms from parent indicator
  state/plot execution.
- Compiled imported-library parity covers host-provided exported constants,
  expression-body and block-bodied pure functions, methods, UDT constructors and
  field access, enum member values and `.title()`, and imported helpers inside compiled
  security expression subprograms.
- Compiled imported-library persistent state now covers exported helpers with
  `var`/`varip` locals, persistent imported UDT locals, and separate state per
  importing call site/script.
- Compiled UDF/history parity covers call-site-local history for indexed
  function parameters, regular function locals such as `basis[1]`, indexed UDT
  fields such as `state.score[1]`, indexed TA call results such as
  `ta.sma(source, length)[1]`, and stateful `ta.*` calls inside direct, nested,
  and request-wrapper UDF call sites.
- Compiled enum parity covers local and imported enum member values plus
  `.title()` display labels, including Pine's field-name fallback when no title
  string is assigned.
- Compiled imported-library method parity covers exported receiver overloads by
  imported UDT type, including stateful `var` locals isolated per compiled call
  site.
- Compiled tail-TA mixed argument parity now has direct coverage for the public
  helper idiom combining `supertrend`, `dmi`, `sar`, pivots, `linreg`, and
  `macd` with named-leading and positional-following arguments.
- Compiled MACD parity accepts all-positional, all-named, and mixed
  `ta.macd(source=..., fastlen, slowlen, siglen)` argument forms, matching the
  legacy runtime for public tail-TA helper idioms.
- The compiled-only parity sweep is strict: every listed script must
  compile and execute through the compiled path before plot values are compared,
  so unsupported regressions cannot silently pass.
- Compiled fallback rate is now tracked as committed data for the 84-fixture
  external corpus, three true-length composites, six awkward composites, and
  three performance composites: 87 eligible scripts, 87 compiled, zero fallback
  reasons.
- Compiled ATR parity accepts Pine's length-only `ta.atr(5)` and named
  `ta.atr(length=5)` forms, matching expected output for the common
  indicator primitive instead of treating the positional length as a source.
- Compiled formatted-string drawing parity covers `str.format()` OHLC/close text
  and `str.tostring(..., "#.####")` table-cell text flowing through normalized
  `label` and `table` drawing payloads, not only plot-based string predicates.
- Compiled recursive UDF parity has a direct compiled-behavior harness for
  self-recursive expression-body and block-body helper calls, covering reduced
  factorial and Fibonacci Pine idioms.
- Compiled recursive `var` series parity covers history-referenced persistent
  variables that seed a current bar from the previous bar before `:=`, including
  custom Heikin-Ashi open/close state used by `plotcandle()` overlays.
- Compiled tuple parity covers direct control-flow tuple initializers,
  tuple control-flow reassignments, and user-defined helper tuple returns
  through nested `if`, `switch`, and loop bodies.
- Compiled chart-point drawing parity covers named `chart.point.from_index()`,
  named `chart.point.from_time()`, `chart.point.copy()`, and `label.new(point,
  ...)` overloads against legacy runtime drawing output.
- Compiled OHLC visual parity covers `plotbar()` and `plotcandle()` normalized
  open/high/low/close arrays, body/wick/border colors, editable/show-last/
  display/format/precision/force-overlay metadata, color masking on bars where
  any OHLC component is `na`, and conditional execution alignment to source bar
  indexes.
- Compiled drawing lifecycle parity covers `label.all`, `line.all`, `box.all`,
  `table.all`, named delete calls, and final drawing payloads against the
  legacy runtime. `polyline.all`/delete and linefill all/delete remain covered by
  existing compiled fixtures.
- Compiled table drawing parity covers Pine named constructor/setter arguments,
  table frame/border/background mutators, cell text/color/size/width/height/
  alignment/font/formatting/tooltip mutators, merged cells, `table.clear()`,
  and `table.all` counts against expected output.

## Partially Supported

- Request parity is strong for deterministic merge/routing behavior, but exact
  symbol availability, modified ticker data, exchange calendars, and lower-TF
  intrabar availability remain host/provider-dependent.
- Heikin-Ashi requests built from ticker modifier chains can derive synthetic
  bars from the nearest available host context, including host data that omits
  adjustment/backadjustment/settlement modifiers.
- Non-Heikin-Ashi synthetic ticker requests now distinguish provider-gated
  synthetic bar generation from missing fixture data when base bars exist.
- Renderer coverage targets normalized feature behavior, not pixel-perfect
  TradingView text metrics, marker geometry, line curvature, candle pixels, or
  table sizing.
- Semantic diagnostics cover many invalid forms; imported-library function
  members used as bare values now report the exact alias and member.

## Missing

- Footprint object accessor helpers remain outside current runtime coverage.
- Computed request expressions inside user-defined wrapper functions that depend
  on persistent library state remain partial.
- Exact TradingView intrabar strategy fill path, bar magnifier, and some
  session risk halt semantics need an explicit intrabar/session model.
- Broader arbitrary nested layout hardening and imported-library edge
  diagnostics remain open compatibility hardening areas.

## Known Divergence

- Data availability and exchange-calendar precision are host/provider-gated.
- Pine v5 global `security()` requires a request datafeed at runtime, matching
  the `request.security()` host dependency.
- Compiled request hard errors halt after the primary request error, while the
  legacy runtime can currently also record a secondary unknown-identifier error
  after the failed assignment.
- Compiled `max_bars_back()` invalid hints halt after the first runtime error,
  while the legacy runtime currently records the validation error on each bar.

## Tests Added

- `src/runtime/codegen/execute.test.ts`: compiled mixed tail-TA helper forms now
  match expected output for `supertrend`, `dmi`, `sar`, pivots, `linreg`, and
  `macd`.
- `tests/compat/pine-external-corpus-classifier.test.ts`: external-style
  request/ticker/session/runtime corpus classifies 70 reduced raw Pine sources
  across parse, semantic, runtime, datafeed, compiled fallback, output, render,
  and unsupported-planned outcomes.
- `src/runtime/codegen/compile.test.ts` and `src/runtime/codegen/execute.test.ts`:
  compiled imported-library support covers host-provided `alias.CONST`,
  `alias.exportedFunction(...)`, block-bodied helpers, methods, imported UDT
  construction/field access, enum members and `.title()`, and imported helpers inside request
  expression subprograms against expected output.
- `src/runtime/codegen/compile.test.ts`: compiled request analysis accepts
  direct source-parameter and captured computed-expression request wrappers.
- `src/runtime/codegen/execute.test.ts`: compiled request execution matches the
  legacy runtime for source-parameter UDF wrappers around `request.security()`,
  `request.security_lower_tf()`, and `request.seed()`.
- `src/runtime/codegen/execute.test.ts` and
  `tests/compat/pine-composite-indicators.test.ts`: compiled execution matches
  the legacy runtime for source aliases inside imported request wrappers, imported
  function locals inside tuple request expressions, UDF parameter history, UDT
  field history, UDF local-variable history, indexed TA call-result history,
  request-expression UDF locals built from arrays, nested UDF call-chain TA
  state, and twenty-one dense composite public-style indicators.
- `src/runtime/codegen/execute.test.ts`: compiled log formatting now matches
  legacy runtime logs for numeric placeholder formats.
- `src/runtime/codegen/execute.test.ts`: compiled logical `and`/`or`
  short-circuiting now matches expected output when unreachable operands
  contain `runtime.error()`.
