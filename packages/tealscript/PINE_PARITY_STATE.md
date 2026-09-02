# TealScript Pine Parity State

This is the handoff briefing for the `tealscript-parity` branch. It is not a
changelog. Read this before continuing parser, semantic, runtime, compiled, or
rendering parity work.

## Current State

Landability as of the latest checkpoint: yes. The branch was fetched, merged
from `origin/master`, and verified with
`git merge-base --is-ancestor origin/master HEAD`. The full workflow-shaped CI
sequence passed on the merged head: API version guard, internal package build,
module-frame header check, script-authoring CI, Next typegen, repo-wide
`yarn typecheck:ci`, `yarn lint:ci`, `yarn test:ci`, scoped apps/web paste-path
tests, Tealchart native typecheck, grammar differential soak, realtime sweep,
and production `yarn build` with the CI `NODE_OPTIONS`/`GIT_COMMIT_SHA`.

Current external-corpus evidence:

- Corpus v1: 220 scripts from 22 repos. Funnel: parse 219/220, semantic
  190/220, compile 190/220, execute 167/220, visible output 157/220 raw and
  157/199 against the invalid-excluded ceiling. Validity split: 161 supported,
  36 TealScript gaps, 21 invalid Pine, two host-dependency gaps, zero undecided.
- Corpus v2 holdout: 151 scripts from disjoint repos. Funnel: parse 139/151,
  semantic 113/151, compile 113/151, execute 103/151, visible output 89/151 raw
  and 89/142 against the invalid-excluded ceiling. Validity split:
  91 supported, 36 TealScript gaps, 15 host-dependency gaps, eight invalid Pine,
  one corpus-hygiene row, zero undecided.
- Historical closure cutover gate: closure dominates every script where the
  compiled web path currently produces parity-enforced visible output:
  157/157 on v1 and 89/89 on v2, zero exceptions. Closure also has 16 v1 and
  three v2 clean corroborated gains where compiled does not render but
  interpreter and closure agree; uncorroborated closure-only output is zero.
  One v2 closure/interpreter output row is error-backed and is tracked
  separately rather than counted as a clean gain.
- T144/T145 audited a sample of eight corroborated-gain rows against Pine
  semantics rather than only against the interpreter. Six sampled gains mostly
  validated the column; `sources/0178__geraked__tradingview.pine` exposed a
  shared interpreter/closure plot-structure defect because duplicate
  `plotcandle()` titles collapsed into one output, and v2's hidden Bollinger
  fill case showed that structurally present but invisible output must not be
  counted as rendered. The current corpus comparator treats `display.none`
  plots/fills and fills with no visible color/value as invisible, while sparse
  global plot declarations still count. v2
  `sources/0023-Erald12-PinescriptIndicator-order_block.txt` remains a caveat:
  closure and interpreter expose drawings with a genuine bounds error while
  compiled silently produces nothing, so it is error-backed output rather than
  a clean win.
- T146 closed the user-facing-string identity class. The branch has now found
  three concrete instances: input IDs, visual plot IDs, and `alertcondition`
  IDs. Runtime identity must come from declarations/call sites, not labels or
  titles. Plot identity is persisted through Tealchart
  `IndicatorInstance.styleOverrides[].plotId`, so T145 preserves the legacy
  title-derived ID for the first occurrence and uses call-site IDs only for
  collisions that previously had no distinct output. Drawings and tables were
  checked and already use generated handles/call IDs; their labels, text, and
  cell content are payload only.
- T150/T152/T153 added and calibrated a long-bar correctness oracle because the
  historical gate, realtime replay, and strategy-ledger comparisons still use
  160 bars. The committed `external-pine-long-bars.report.json` is explicitly a
  deterministic dominated-subset measurement, not a replacement for the full
  cutover gate: 16/157 v1 dominated rows and 16/89 v2 dominated rows, retaining
  dominated strategy rows first and then evenly sampling the remaining
  dominated rows. It uses a bounded trend-plus-regime OHLC generator so 20,000
  bars do not inherit the original 160-bar generator's unbounded linear price
  drift. The bar generator was sanity-checked at 1,000/5,000 bars and remains
  bounded (`close` roughly 96.6..154.0 by 5,000, positive lows/volume), so the
  sampled divergences were not caused by runaway synthetic prices.
  First-difference numeric comparison now uses the same calibrated rule as the
  main corpus comparator: finite numbers within `1e-8` are equal, while
  structure, order, `na`/zero, nullish values, side effects, and special values
  stay strict. The previous round-to-8-decimals exact compare turned raw
  backend deltas around 1e-13 into false plot-value exceptions. With the
  comparator alone fixed, only the real long-history rows survived: v1
  `ADW - Colour Trend` as an alert exception at 1,000/5,000/20,000 bars, and v2
  `Turtle Strategy` as a closed-trades exception at 5,000/20,000 bars. T153
  closed both as compiled bugs. `Turtle Strategy` needed explicit generated
  `strategy.*` metric histories advanced at script-calculation start, matching
  Pine's previous-calculation series semantics after long `var` warmups.
  T154 found the same metric-history defect in the interpreter/closure engine
  path as well; the metric inventory and value semantics now live in one source
  of truth in `src/runtime/strategy.ts`, with only the backend-specific series
  storage kept separate.
  `ADW - Colour Trend` needed generated series-variable writes keyed by the
  current bar rather than by capped `ValueSeries.size`, so same-bar
  declaration placeholders stop overwriting later assignments after the
  history ring reaches capacity. Current long-bar result: v1 visual 16/16 and
  strategy ledger 12/12 at 1,000, 5,000, and 20,000 bars; v2 visual 16/16 and
  strategy ledger 4/4 at the same counts; zero exceptions, zero swallowed
  errors, and zero compiled-bar errors. Treat this report as a standing
  long-history invariant for future generated-runtime changes.
- Strategy ledger parity is now measured separately from visual parity. The
  headline cutover gate above proves plots, drawings, alerts, and logs; it is
  not a strategy-parity claim. Corpus v1 contains 26 strategy scripts, 23 of
  which execute far enough for ledger comparison; seven produce active ledger
  state; all 23 executable strategy rows now match across interpreter,
  compiled, and closure. Corpus v2 contains seven strategy scripts, six
  executable, and zero active ledger rows; all six ledger rows match. T140
  fixed the sharpest historical row, `STRG-BBForce.pine`:
  interpreter/closure now preserve
  replacement `strategy.exit` order activation and use the shared chart-OHLC
  broker-emulator ticks, matching compiled at 78 orders, 39 fills, and 38
  closed trades. That is a visible mobile behaviour change: the interpreter
  previously left the price-based exits pending, while Pine's broker emulator
  fills historical price orders from chart OHLC movement by default. T142
  closed the remaining three historical v1 ledger rows. Two were
  strategy-engine metadata gaps: `strategy.entry()` reversal orders now retain
  Pine transaction quantity in `order.qty` while preserving the user-requested
  size in `requestedQty`. The third was not a broker gap: `STRG One Bar
  Pursuit` computed entry conditions from boolean history, and regular boolean
  and string scalars now retain value-preserving history across all three
  backends. No visually passing row currently has a ledger mismatch.
- Strategy-focused corpus v1 is a separate T148/T149 measurement, not part of
  the indicator-focused cutover gate. It lives outside the repo at
  `/tmp/pine-strategy-corpus-v1` and currently records 105 trade-active
  strategy-like public sources from 21 GitHub repos. The historical report
  classifies 91 rows as `strategy` after parse/declaration analysis; the rest
  are 8 indicators, one library, one study, and 4 parse-unknown rows acquired
  by source text. Version mix: v3 4, v4 26, v5 33, v6 38, unknown 4. Raw funnel:
  parse 73/105, semantic 54/105, compile 54/105, execute 44/105, visible output
  24/105; invalid-excluded output is 24/103. Validity split: 33 supported,
  67 TealScript gaps, 3 host-dependency gaps, 2 invalid Pine, zero corpus
  hygiene. Strategy ledger dimension: 91 declared strategies, 54 executable
  strategies, 18 active ledgers, and 54/54 all-three historical ledger matches.
  No visually passing strategy row currently hides a ledger mismatch.
- T149 adjudicated and closed the measured strategy-corpus gaps. The
  `Public_Bollinger_strategy.txt` compiled failure was an emitter bug for
  `x := if ...` where the lhs was a history-read variable: generated code tried
  to assign into a read expression such as `series.get(0)`. Compiled
  `strategy.entry()`/`strategy.order()` OCA omission was structural, not
  cosmetic: OCA fields drive sibling cancellation/reduction in the shared
  broker emulator, so generated backends now pass them through. `TripleRed`
  exposed bare `ticker` as a legacy fallback alias shadowing a script input in
  the interpreter and string emitter; script locals/inputs now win. The
  `dead-cat-bounce` visual exception was closure lowering `color(na)` through
  `color.rgb` instead of the legacy transparency-cast path.
- Strategy-focused closure gate and realtime replay are also separate
  measurements. On the 24 compiled-visible dominated strategy rows, closure has
  zero dominated visual exceptions, 8 corroborated gains, zero uncorroborated
  closure output rows, and one error-backed closure/interpreter output row
  tracked separately from clean gains. Realtime replay over those 24 dominated
  rows uses 37 events per script: visual output matches on 24/24 rows and
  strategy ledger matches on 24/24 rows, including 7 active ledgers. Swallowed
  runtime/request accounting on the strategy corpus is now zero; the previous
  160 compiled-bar events were a real post-fix signal from
  `Public_Bollinger_strategy.txt`, not stale report residue, and are closed by
  the emitter fix above.
- T148/T149 confirm what the existing instruments do and do not prove for
  strategies. They now catch parse/semantic/compile/execute failures, visible
  output parity, historical and realtime strategy-ledger parity, closure
  domination/corroboration, and swallowed runtime/request errors. The current
  reports do not claim TradingView adjudication for every unsupported strategy
  row; they prove all executable compared strategy ledgers and visible outputs
  agree across the three TealScript backends.
- Realtime corpus differential: all dominated scripts match across interpreter,
  compiled, and closure under append, same-time replacement, and confirmation
  replay: 157/157 on v1 and 89/89 on v2, zero mismatched and zero failed rows.
  The realtime runner also compares normalized strategy ledgers as a separate
  dimension. T139 fixed generated-backend finalization of the unconfirmed
  realtime tail for default strategies, and T141 fixed the remaining active
  fill/closed-trade differences: generated reconstruction now processes pending
  broker fills on unconfirmed realtime bars without finalizing equity
  bookkeeping, while the incremental interpreter marks confirmed realtime bar
  OHLC before replaying exit fills. Strategy realtime now matches across all
  dominated strategy rows too: 12/12 on v1 and 4/4 on v2.
- Swallowed-error accounting: v1 reports zero swallowed runtime/request errors;
  v2 reports one known genuine compiled-bar array-bound event. Compiled
  request-expression swallow counts are zero on both corpora.

Current closure performance evidence is split by runtime because the trade is
different on web and mobile. Web currently uses compiled execution, so closure
is a slowdown on the cutover cohort. T132 reduced the request-heavy tail by
dependency-selecting closure request-local replay and excluding only scalar
requested-context-invariant declarations from request dependency replay; it did
not solve the tail. Current v1 median closure/compiled is 2.03x
(q1 1.52, q3 4.72), with ten scripts faster, 147 slower, and 82 at least 2x
slower; the v1 aggregate is still 3.71x because request-heavy scanner rows
dominate total time. v2 median is 1.77x (q1 1.42, q3 2.59), with two scripts
faster, 87 slower, and 35 at least 2x slower; aggregate is 1.68x. Pooled median
is 1.94x (q1 1.47, q3 3.72), with twelve scripts faster, 234 slower, and 117 at
least 2x slower. The remaining tail is no longer broad prior-statement replay;
scanner rows still pay for closure request expressions through the interpreter
request sub-engine. Mobile currently uses the interpreter over the full bar
window, so closure is still a performance improvement in the same measurement:
closure/interpreter is 0.60x on v1 and 0.49x on v2. The committed performance
report remains a Node/shared-Mac measurement, not an on-device Hermes benchmark.

General measurement lesson for the next handoff: every time this branch pointed
a new comparator at real scripts, it found product-relevant truth that the
previous green number did not cover. The external corpus moved attention from
parser work to checker behaviour; compiled-vs-interpreter comparison exposed
silent output divergence; realtime replay exposed re-entry bugs; widening that
replay found thirty more rows the narrow sample missed; strategy-ledger
comparison found a production strategy defect that visual parity counted as
passing. Treat a green gate as a statement about exactly the fields it compares,
not about the fields it ignores.

Current open decisions:

- Product cutover: the backend selector is wired, default-preserving, and
  observable, but web closure rollout trades one evaluation system and mobile
  speedup against a median web slowdown and a scanner-heavy tail. That is Sam's
  product decision.
- Closure request-expression ownership: request-backed scripts are not yet one
  evaluation system end to end. The closure parent backend still reaches
  `request.security()`, `request.security_lower_tf()`, and `request.seed()`
  through the shared engine request builtins, and those builtins evaluate the
  requested expression with a fresh interpreter sub-engine. The narrow seam is
  to keep argument normalization, datafeed lookup, request cache keys,
  barmerge/lower-timeframe merging, source remapping, request limits, and
  swallowed-error accounting in the shared engine, while making only
  "evaluate this expression over the requested bars" pluggable. String codegen
  already has precedent for this shape in `compileSecurityExpression()` plus
  `evaluateSecuritySeries()`. Estimated cost: 6-10 engineering days for
  indicator-grade closure request subprograms; 10-16 days for cutover-grade
  support covering UDF/imported UDFs, source remapping, tuples, local replay, TA
  histories, arrays/UDTs, lower-timeframe/seed parity, swallowed-error
  instrumentation, and corpus/realtime gates. Combined with generated
  incremental realtime, estimate 18-28 days because both share execution-object
  state, callable scopes, capture/source binding, and per-context slot setup;
  treating them separately would double-count against roughly 25-41 days. This
  should reduce the scanner-heavy tail, not eliminate closure overhead overall.
  Unsupported request subprogram constructs must fail loudly rather than
  falling back to the interpreter, or the one-evaluation-system claim remains
  false while appearing true.
- Mobile proof: Tealchart has the call path named and closure selection wired in
  package tests, but the actual on-device Hermes/Metro smoke still needs the
  mobile app and simulator.
- Generated incremental realtime: all production paths currently re-execute the
  full bar window on live updates. A generated incremental path is costed but
  intentionally not started on this branch.
- Host dependency: unresolved public imports remain product gaps until the host
  supplies or accepts the referenced third-party Pine libraries.

Reproduction commands that matter for handoff:

```bash
git fetch origin
git merge origin/master
git merge-base --is-ancestor origin/master HEAD

yarn check:api-versions
yarn turbo run build --filter='@tealstreet/ui-tokens' --filter='@tealstreet/theme' --filter='@tealstreet/ui'
yarn workspace tealstreet-module-frame check:headers
yarn workspace @tealstreet/script-authoring test-ci
yarn workspace tealstreet-next typegen
yarn typecheck:ci
yarn lint:ci
yarn test:ci
(cd apps/web && yarn vitest run src/components/tealchart/tealscriptLibraryRegistry.test.ts src/components/tealchart/TealchartDirect.test.tsx src/components/customChartStudies/chartStudyValidation.test.ts)
yarn workspace @tealstreet/tealchart typecheck:native
TEALSCRIPT_GRAMMAR_DIFF_SOAK=1 yarn vitest run packages/tealscript/tests/compat/pine-grammar-differential.test.ts
TEALSCRIPT_REALTIME_SWEEP=1 yarn vitest run packages/tealscript/tests/compat/pine-external-corpus-classifier.test.ts packages/tealscript/tests/compat/pine-composite-indicators.test.ts packages/tealscript/tests/compat/pine-composite-performance.test.ts packages/tealscript/tests/strategy-parity/strategy-parity.test.ts
NODE_OPTIONS='--max_old_space_size=6144' GIT_COMMIT_SHA=$(git rev-parse HEAD) yarn build

yarn workspace @tealstreet/tealscript pine:closure:cutover --check
yarn workspace @tealstreet/tealscript pine:external-corpus:realtime --check
yarn workspace @tealstreet/tealscript pine:closure:perf --output /tmp/production-closure-performance-check.json
```

The realtime corpus check is intentionally expensive. Do not run
`pine:external-corpus:realtime --check` immediately after regenerating the same
report; generation already did the computation. Use `--check` when code, corpus,
or source reports may have moved underneath the committed artifact.

Corpus report paths are resolved from the repository root even when invoked via
`yarn workspace`; paths under `packages/tealscript/packages` are rejected. If a
nested report tree appears there, remove it and fix the caller rather than
quoting numbers from the duplicate path.

## Appendix: Detailed History and Evidence

### Verified State

Current verified branch state for this parity pass:

<!-- BEGIN GENERATED PINE PARITY HEADLINE METRICS
Generated by `yarn workspace @tealstreet/tealscript pine:parity:metrics`.
Do not edit this block by hand; rerun the generator when committed audit or baseline data changes.
-->

- Pine v6 builtin names: 844/860 official manual names implemented/resolved; 16 known-missing official names; 39 labelled aliases/local extensions excluded from official coverage.
- Pine v6 grammar inventory: 74/74 official manual-index entries covered by 63 committed snippets; 0 known grammar gaps.
- Production worker load baseline: 81/89 compiled; 8/89 visible interpreter fallbacks.
- Production worker live-update baseline: 243/267 compiled same-bar updates; 24/267 visible fallbacks; 267/267 worker updates match fresh execution.
- Mobile TealScript capability baseline: 5/6 measured capability rows supported; remaining gap: on-device closure execution proof.

<!-- END GENERATED PINE PARITY HEADLINE METRICS -->

- TealScript package tests: 2628 tests green across 61 files, with nine
  opt-in tests skipped by default.
- TealScript typecheck: clean.
- Plausible compiled fallback list: zero.
- Pine v6 known-missing builtin name allowlist: 16 official manual names,
  grouped with reasons in `PINE_V6_KNOWN_MISSING_BUILTIN_GROUPS`. Against the
  official v6 reference manual index, the committed builtin inventory now
  enumerates all 860 official names plus 39 labelled compatibility aliases/local
  extensions. The implemented/resolved official-name numerator is now 844/860
  because the 16 allowlisted names do not resolve through checker/runtime
  coverage. T27 re-read all 21 against the official manual index and promoted
  none; T30 then promoted `label.set_point` while closing drawing/object
  behavior coverage. The remaining names are object/drawing-tail helpers,
  provider-tail forecasts and
  recommendations, or strategy-only conversion/sizing helpers. Quote the
  manual-index denominator and the known-missing count, not the old local-list
  `489/489` or `613/613` style number.
- Pine v6 grammar coverage: the committed grammar inventory now covers 63/63
  parser/typechecker snippets, including the 18 manual-index entries that were
  absent from the older 61-snippet local list. Those entries were
  already-supported documentation debt: built-in object/provider type
  annotations typecheck today, and doc annotations parse as comments without
  rich metadata semantics.
- External reduced corpus: 85 scripts, 77 passing runnable fixtures, seven
  intentional negative/self-test diagnostics, one actionable datafeed parity
  gap tracked separately.
- Compiled fallback baseline: 89 eligible scripts, 89 compiled, zero sampled
  fallback reasons across the external corpus, true-length composites, awkward
  composites, and performance composites.
- Production worker fallback baseline:
  `src/compat/productionWorkerFallbackBaseline.ts` now measures the same 89
  eligible scripts through the real worker protocol with seeded request-data
  replies and host-provided libraries. Before runtime request discovery, the
  product path measured 60 compiled and 29 visible interpreter fallbacks, all
  labelled `unpreloadable-request-data:*`. After runtime discovery, the same
  method measured 89 compiled and zero fallbacks, matching the in-package
  compiler baseline while exercising the worker, bridge, resolver, and library
  registry path that users actually hit. After the T44 realtime safety
  classifier sharpening, the committed session-safe baseline measures 81
  compiled and 8 visible interpreter fallbacks labelled
  `compiled-worker-stateless-intrabar-reentry:*`; classified scripts are
  interpreter-owned from load so drawings, object handles, alerts, logs, and
  mutable state stay coherent across the session.
- Production worker live-update baseline:
  the same committed baseline also drives each eligible script through three
  same-bar `updateBar` ticks after its initial full execution, using the same
  worker protocol, seeded resolver, request cache, and host-provided libraries.
  Before the T41 safety classifier this measured 267 tick updates, 267
  compiled, zero fallbacks. Current session-safe result: 267 tick updates, 243
  compiled and 24 visible interpreter fallbacks, all in the same
  `compiled-worker-stateless-intrabar-reentry:*` family.
- Grammar-driven differential generation:
  `tests/compat/pine-grammar-differential.test.ts` now has two lanes. The
  default full-execution lane explores 48 generated programs, while
  `TEALSCRIPT_GRAMMAR_DIFF_SOAK=1` explores 384; both currently report zero
  compiled/interpreter divergences. The realtime lane deliberately deepens the
  generator with nested expression trees, repeated UDF/method call sites,
  UDTs held in arrays/maps, request-wrapped UDFs, and `varip`/history
  combinations, then drives same-bar worker updates against interpreter
  `updateBar(...)`. It currently records a known finding rather than zero:
  36/36 default generated tick updates and 288/288 soak generated tick updates
  are classified as `compiled-worker-stateless-intrabar-reentry`. After T41,
  that classification is a visible interpreter fallback instead of silently
  serving stateless compiled realtime output.
- Realtime re-entry correctness baseline:
  `tests/compat/productionWorkerHarness.ts` now compares each same-bar tick
  update against a fresh full execution over the same updated bar window. It
  measures both the production worker path, using a batched fresh-worker full
  execution as the worker ground truth, and direct interpreter
  `TealscriptEngine.updateBar(...)`, and snapshots plots, drawings, alerts, and
  logs. The default package gate runs a small representative request/import
  subset so realtime regressions stay cheap to catch. The full cross-corpus
  correctness sweep is opt-in because it drives every eligible script through
  both live and fresh execution paths. The harness clones bars at the worker
  boundary so worker update tests cannot mutate the baseline case fixtures.
  Current full-sweep result across the same 89 eligible scripts and three ticks
  per script: worker path 267/267 matching updates, interpreter path 267/267
  matching updates, with no known realtime output mismatches. The committed
  numbers are recorded under `realtimeParity` in
  `src/compat/productionWorkerFallbackBaseline.ts`.
- Strategy realtime re-entry correctness baseline:
  `tests/strategy-parity/strategy-parity.test.ts` drives strategy corpus
  scripts through the same three-tick production worker and interpreter
  `updateBar(...)` comparison, but opts into strategy ledger snapshots in
  addition to plots, drawings, alerts, and logs. The default gate runs a
  representative pyramiding/bidirectional/bracket subset. The opt-in full fast
  corpus sweep is enabled with `TEALSCRIPT_REALTIME_SWEEP=1` and currently
  records 36/36 matching worker updates and 36/36 matching interpreter updates.
- Interpreter realtime imported-library re-entry:
  `TealscriptEngine.updateBar(...)` is still the fallback path for scripts that
  do not stay compiled. It now re-registers imported library bindings on each
  realtime re-entry and unwraps source-aware imported function returns before
  normal binary arithmetic/comparison. The regression is pinned by
  `src/runtime/engine.test.ts`'s imported-library `updateBar` test and by the
  worker request bridge test whose parity oracle again uses interpreter
  `updateBar(...)`.
- Interpreter visual realtime re-entry:
  the final true-length plot mismatches were runtime bugs, not acceptable Pine
  v6 divergences. They were independent from the same-time scope snapshot bug:
  `hline` is a static horizontal output and must not receive synthetic per-bar
  `values` during last-bar replacement, while `plotarrow` is per-bar output and
  must replace `colorup`/`colordown` slots at `bar_index` instead of appending
  stale tick colors. These are pinned by focused `src/runtime/engine.test.ts`
  `updateBar` tests and by the opt-in full realtime sweep.
- Tealchart render-path differential generation:
  `packages/tealchart/src/rendering/tealscriptRenderingDifferential.test.ts`
  generates deterministic Pine visual programs, executes them through both the
  interpreter and compiled TealScript paths, renders each output through the
  production web canvas plot and drawing renderers, and compares the normalized
  draw-command streams. It also drives interpreter same-bar `updateBar(...)`
  output through rendering and compares it to a fresh full execution over the
  same updated bar window, while separately checking that compiled full
  execution renders the same as the interpreter for that window. The default
  gate covers 12 generated programs across both comparisons; the opt-in
  `TEALSCRIPT_GRAMMAR_DIFF_SOAK=1` run covers 96. Current result: zero
  interpreter-vs-compiled render diffs and zero realtime-vs-fresh render diffs.

Commands that reproduce the package gate:

```bash
yarn vitest run packages/tealscript/tests/ packages/tealscript/src/
yarn workspace @tealstreet/tealscript typecheck
git diff --check
```

Package gates and workflow gates answer different questions. The package gates
above prove the TealScript code is locally correct in isolation. They do not
prove a pull request will go green. When the question is landability, run the
actual `.github/workflows/ci.yaml` command sequence in order: API-version guard,
internal package build, module-frame header check, script-authoring CI, Next
typegen, then repo-wide `yarn typecheck:ci`, `yarn lint:ci`, `yarn test:ci`,
and `NODE_OPTIONS='--max_old_space_size=6144' GIT_COMMIT_SHA=$(git rev-parse HEAD) yarn build`.
The root `yarn test:ci` command is specifically the workflow-shaped answer; it
excludes the known-red `@tealstreet/safe-cex` and `tealstreet-next` test suites
while still exercising root Turbo concurrency.

The default TealScript package gate smoke-runs the composite performance cases
over short bar windows for parse, compile, interpreter, compiled,
production-worker, realtime-safety, and output-shape coverage. The full
benchmark and committed performance envelopes are opt-in: this repo is often
tested on a shared multi-agent Mac, and concurrent TealScript and Tealchart
suites can turn full benchmark measurements into false CI failures. Run the
opt-in threshold gate when taking a performance baseline or investigating a
suspected regression:

```bash
TEALSCRIPT_PERF_ASSERT=1 yarn vitest run packages/tealscript/tests/compat/pine-composite-performance.test.ts
```

Use `TEALSCRIPT_PERF_LOG=1` with the same command to print the measured
compile/interpreter/compiled/heap numbers. A red default package gate is a real
parity/test failure; a red `TEALSCRIPT_PERF_ASSERT=1` run means the committed
performance envelope needs investigation or an explicitly remeasured baseline.
T68 profiled interpreter execution through the existing composite performance
benchmarks before optimizing. The old assumption that array/map builtins and
direct TA calculations dominated was only partly true: UDF/imported-call
dispatch and top-level declaration re-evaluation dominated, direct TA costs were
secondary, and array/map builtin calls were small compared with loop machinery
around them. The first optimization caches direct top-level scalar `input.*`
declarations after their bar-0 registration/validation, while still advancing
the variable's series every bar. It deliberately does not cache `input.source`,
legacy generic `input()`, nonliteral-title inputs, or nested/control-flow/UDF
input calls because this runtime accepts some placements Pine would normally
reject and those can be bar-varying today. Full `execute(...)` resets the cache
so changed user inputs rebuild from the new input map; realtime `updateBar(...)`
reuses the cache for same-bar re-entry. Measured on the same shared Mac perf
harness with `TEALSCRIPT_PERF_LOG=1`: dense interpreter cost moved from
1817 to 1585 us/bar, drawing from 683 to 585 us/bar, and request fanout from
887 to 772 us/bar. These timings are machine/load-sensitive; the committed
baseline rows in `pine-composite-performance.test.ts` record the current
post-change envelope.
T69 continued with the profiled UDF/imported-UDF call overhead. The interpreter
now caches AST-derived call metadata, direct user/imported callable resolution,
callsite scope suffixes, callable scope keys, and UDF signature shape; it also
uses a specialized regular-parameter binding path and skips active-callsite
stack tracking for leaf UDFs whose bodies contain no user/imported callable
calls. These caches deliberately store only immutable metadata and resolved
function declarations, not mutable function scopes or frame contents, so
per-callsite `var` state and realtime rollback still flow through the existing
scope model. AST-node keyed caches are `WeakMap`s, so a long-lived engine does
not retain parse trees after a user edit reparses the script. The only nested
cache with a plain `Map` key is alias string -> `WeakMap<FunctionDeclaration,
string>`, which does not strongly hold function nodes. Measured on the same
shared Mac perf harness with `TEALSCRIPT_PERF_LOG=1`, the post-T68 numbers moved
from dense 1585 to 1485 us/bar, drawing 585 to 582 us/bar, and request fanout
772 to 768 us/bar. The dense case was the meaningful win; drawing/request are
small enough to treat as guardrail measurements rather than a new optimization
frontier.
T70 then trimmed TA-window and ordered-argument helper overhead without changing
the TA formulas or history model. Complete/available source windows now validate
and copy in one pass, reusing the existing bounded history array when it is
already exactly the requested window, and ordered argument lookup no longer
allocates a prefix slice/filter for every call. These helper caches do not add
any AST-keyed strong references; existing callsite memoization remains WeakMap
based, so reparsed scripts can be collected. Same-machine measurements moved
from dense 1513 to 1421 us/bar, drawing 604 to 554 us/bar, and request fanout
743 to 727 us/bar. The committed baseline rows record those current interpreter
numbers; timings remain load-sensitive and should be remeasured before treating
small deltas as regressions.

Realtime re-entry correctness has the same fast/default vs full/opt-in split.
The default package gate runs a representative subset through requests,
request wrappers with runtime-discovered arguments, imported helpers, and
imported helpers inside `request.security(...)`. A default failure means a
common realtime path regressed and should block the package gate. The committed
production indicator full sweep is enabled explicitly:

```bash
TEALSCRIPT_REALTIME_SWEEP=1 yarn vitest run \
  packages/tealscript/tests/compat/pine-external-corpus-classifier.test.ts \
  packages/tealscript/tests/compat/pine-composite-indicators.test.ts \
  packages/tealscript/tests/compat/pine-composite-performance.test.ts
```

A red `TEALSCRIPT_REALTIME_SWEEP=1` run means the committed full-corpus
`realtimeParity` data is stale or a realtime re-entry correctness regression was
introduced. Refresh the baseline only after inspecting the grouped mismatch
reasons and confirming the change is intentional.

The same sweep can be run with the no-eval closure backend selected:

```bash
TEALSCRIPT_REALTIME_SWEEP=1 TEALSCRIPT_REALTIME_BACKEND=closure yarn vitest run \
  packages/tealscript/tests/compat/pine-external-corpus-classifier.test.ts \
  packages/tealscript/tests/compat/pine-composite-indicators.test.ts \
  packages/tealscript/tests/compat/pine-composite-performance.test.ts
```

The closure-selected variant asserts `executionMode === "closure"` on every
tick and compares plots, drawings, alerts, and logs against a fresh interpreter
full execution over the same updated window. It currently exercises closure
full-window realtime reconstruction, not a future incremental closure VM: the
AST-bound closure graph is reused, but each tick is evaluated from the updated
bar window instead of mutating an existing closure runtime with `updateBar`.
That covers same-time replacement result parity for the selected backend, but
does not prove incremental closure state rollback because that path does not
exist yet.

The strategy realtime sweep uses the same flag and additionally compares the
normalized strategy ledger:

```bash
TEALSCRIPT_REALTIME_SWEEP=1 yarn vitest run \
  packages/tealscript/tests/strategy-parity/strategy-parity.test.ts \
  -t "strategy realtime re-entry parity"
```

Use `TEALSCRIPT_REALTIME_BACKEND=closure` with the same command to select the
closure backend for the strategy realtime sweep.

The fallback and builtin invariants are checked inside the same Vitest command,
primarily through `src/semantic/checker.test.ts`,
`src/runtime/codegen/fallbackInventory.test.ts`, and
`tests/compat/pine-external-corpus-classifier.test.ts`.

If a change touches `packages/tealchart`, the gate is package-local and
separate:

```bash
cd packages/tealchart && yarn test-unit
TEALSCRIPT_GRAMMAR_DIFF_SOAK=1 yarn vitest run packages/tealchart/src/rendering/tealscriptRenderingDifferential.test.ts
yarn workspace @tealstreet/tealchart typecheck
yarn workspace @tealstreet/tealchart typecheck:native
git diff --check
```

Every package touched gets its own package suite plus typecheck before push.
Tealchart also requires `typecheck:native` because it is consumed as source by
native/mobile builds.

### Shrink-Only Invariants

- `src/compat/pineV6BuiltinReference.ts` records the Pine v6 reference builtin
  name surface. `PINE_V6_KNOWN_MISSING_BUILTINS` is derived from
  `PINE_V6_KNOWN_MISSING_BUILTIN_GROUPS`, so every deferred official name must
  carry an in-file reason. New gaps must fail the checker coverage test unless
  deliberately added to the allowlist with evidence.
- `src/compat/pineV6ReferenceManualIndex.ts` records the names-only official
  v6 reference manual index extracted from
  `https://www.tradingview.com/pine-script-reference/v6/`. The audit in
  `src/compat/pineV6ReferenceManualAudit.ts` cross-checks that independent
  index against TealScript's committed builtin and grammar inventories. T22
  showed that the old `489/489` builtin and `61/61` grammar headlines were true
  only against local lists, not against the full manual index. Current audit
  numbers: zero manual grammar entries
  absent from the 63-snippet grammar list, zero manual builtin names absent from
  the committed builtin-name list, and 39 committed builtin names absent from
  the official manual index. Of the 860 official manual builtin names, all 860
  are present in the committed inventory, 844 resolve through checker/runtime
  coverage, and 16 are known-missing with in-file reasons. The builtin gap is
  split explicitly: none of the official manual names are inventory debt; all
  remaining gaps are real unresolved or deferred surface.
  T23 closed the highest-ranked group by adding the official visual enum constants
  (`display.*`, `format.*`, `location.*`, `shape.*`, `scale.*`, `order.*`) to
  the builtin inventory and checker coverage; it also added
  `display.pine_screener` to interpreter and compiled display normalization.
  The T25 global-essential inventory cluster then recorded already-working
  global series values, declarations, casts, plotting/output calls, literals,
  calendar values, and `hlcc4`; the scalar/language entries `true`, `false`,
  `hlcc4`, and `library` were documentation debt, not missing capability.
  The T25 output/alert/runtime inventory cluster then recorded already-working
  `alert.freq_*`, `log.*`, and `runtime.error` names.
  The T25 request/datafeed-constants inventory cluster then recorded
  already-working currency constants, barmerge modes, ticker adjustment modes,
  settlement-as-close modes, and current dividends/earnings/splits fields;
  future corporate-action fields remain in the deferred provider-tail group.
  The T25 visual-constants inventory cluster then recorded already-working
  barstate, day-of-week, label, line, plot, hline, text, size, position, font,
  xloc, yloc, and extend constants, closing the remaining inventory-debt
  population.
  The known-missing tail is 16 official manual names: seven future
  corporate-action forecast fields, six analyst recommendation provider series,
  and three strategy-only conversion/default quantity helpers. No high-traffic
  public-indicator primitive remains in the tail; `PINE_V6_KNOWN_MISSING_BUILTIN_REVIEW`
  pins each entry's manual category, expected traffic class, and defer reason.
  `label.set_point` and `footprint.get_row_by_price` are implemented through the
  drawing/runtime and footprint provider seams and must not be counted as
  missing.
- T55 makes provider-data absence visible through the product paste path:
  failed worker `requestDataResult` responses still evaluate to Pine `na`, but
  Tealchart emits a nonfatal `request-data-unavailable` diagnostic that names
  the concrete request and distinguishes no resolver (`missing-provider`), no
  seeded data (`not-found`), invalid query, timeout, and provider failure.
- T56 makes realtime safety fallback visible above the engine seam: the worker
  now attaches structured `RuntimeProfile.fallbackDiagnostics` naming the
  stateful intrabar construct and source line/column, and Tealchart emits one
  nonfatal `realtime-compiled-fallback` message per trigger. The wording says
  output remains correct and only live-tick speed changes, so users do not debug
  a valid script as broken.
- T57 pins the user-facing diagnostic taxonomy at the product boundary. Save
  validation failures carry a stable `kind`, semantic diagnostics preserve
  checker `code` and `severity`, true script/runtime failures are emitted with
  `severity: 'error'`, and provider-data absence plus realtime compiled fallback
  advisories are emitted with `severity: 'warning'` and stable codes. Tests
  forbid script-failure wording on the non-error classes so copy changes do not
  turn correct-but-slower or missing-host-data states into apparent script bugs.
- T58 carries that taxonomy into web worker telemetry without leaking user data.
  `sanitizeWorkerSentryData(...)` now classifies structured TealScript payloads
  from stable `type`/`code`/`severity`/validation-kind tags and suppresses
  diagnostic message, stack, arbitrary tags, arbitrary extra, line/column,
  traded symbols, and source constructs for those payloads. The Tealchart
  realtime fallback path is not wired to Sentry today; this is a defensive guard
  for future callers and any structured TealScript error that does enter the
  shared worker sanitizer.
- T59 audited the mobile diagnostic path. `SkiaTealchart` passes
  `onTealscriptError` into `useNativeTealchartCoreRuntime`, which subscribes
  directly to `MobileIndicatorManager`; there is no app/web consumer and no
  Sentry hop there. Native runs TealScript synchronously through the interpreter,
  so correct-but-slower compiled realtime fallback does not occur on mobile
  today. Request-backed scripts without a native provider now emit the same
  nonfatal `request-data-unavailable` warning class as web instead of a fatal
  runtime script failure.
- T60/T61a assessed mobile compiled execution and made the scope of the compiled
  numbers explicit. Mobile is interpreter-only because `MobileIndicatorManager`
  was wired as a synchronous main-thread engine path and never connected to the
  compiled worker/request-discovery/library-registry stack. The current compiled
  backend emits JavaScript and instantiates it with `new Function(...)` in
  `src/runtime/codegen/compile.ts`, including compiled request subprograms.
  T90 corrected the earlier stock-Hermes assumption: the React Native 0.87
  bundled `hermesc` in this repo accepts `new Function` and emits bytecode that
  constructs the global `Function` object. Hermes still has a runtime
  `enableEval` flag documented in source as applying to `eval` and the Function
  constructor, and this repo cannot execute a Hermes runtime smoke because it
  has Tealchart source but not the consuming mobile app runtime. Treat mobile
  compiled execution as unclaimed, not proven impossible: the web compiled
  baselines do not describe mobile users until a native Hermes smoke proves the
  current generated-Function path executes and is fast enough.
- `src/compat/pineV6BuiltinSignatures.ts` records reference parameter names,
  order, required/optional counts, and overloads for the audited namespaces.
  `PINE_V6_KNOWN_MISSING_SIGNATURES` is currently empty. Signature drift is a
  test failure, not a doc note.
- `src/runtime/codegen/fallbackInventory.ts` enumerates analyzer, compiler, and
  classifier fallback exits from the compiler side. `RANKED_PLAUSIBLE_COMPILED_
FALLBACKS` must stay empty unless a genuinely plausible public-indicator
  construct is discovered and ranked with evidence.
- `src/runtime/codegen/execute.test.ts` contains the table-driven warmup/`na`
  sweep for implemented `ta.*` state machines. It guards first-valid-bar
  behavior and compiled-vs-interpreter parity, where plausible early numeric
  output is worse than a hard failure.
- `tests/compat/pine-ta-value-behavior.test.ts` contains table-driven v6 value
  checks for all 67 official `ta.*` names in the manual index, plus six labelled
  TealScript TA extensions (`ta.adx`, `ta.bar_index`, `ta.covariance`,
  `ta.dema`, `ta.smma`, `ta.tema`). It uses fixed OHLCV input bars and literal
  expected plot series for smoothing families, oscillators, channels, trend
  state machines, rolling/statistical helpers, pivots, event helpers, and volume
  variables, and it asserts both interpreter and compiled output. Wrong-before
  count from T29 was one behavior check: `ta.supertrend()` returned the correct
  line but the opposite `direction` polarity from Pine's public idiom
  (`direction < 0` is uptrend, `direction > 0` is downtrend).
- Named hazard from T29: implementation-derived fixtures can certify
  implementation bugs. `ta.supertrend()` had the wrong direction polarity, and
  existing pine-basics, pine-builtins, pine-real-checkpoints, and realworld
  corpus expectations had encoded that polarity as expected behavior. For
  high-consequence semantics, fixtures must be written from v6/reference
  reasoning or independent calculations, not copied from current TealScript
  output.
- T47/T48 audited the expected-value provenance in the literal behavior tables.
  The existing tables did not declare provenance explicitly, so the audit added
  machine-checked provenance declarations. Counts: TA values 1044
  independently-derived / 0 published worked examples / 0 TealScript regression
  pins; math/str/array/matrix/map/color values 211 independently-derived / 0
  published worked examples / 15 TealScript regression pins; strategy values
  274 independently-derived / 0 published worked examples / 0 TealScript
  regression pins; runtime metadata values 362 independently-derived / 0
  published worked examples / 0 TealScript regression pins. The 15 regression
  pins are exact local diagnostic strings for Pine-required runtime errors; the
  fact that those operations error is reference-derived, but the TealScript
  message wording is local behavior. No numeric plot/metadata/strategy expected
  series in those tables was identified as captured from TealScript output.
- Provenance convention going forward: every behavior table that asserts
  literal expected values must declare whether those values were independently
  derived from Pine v6/reference semantics, taken from a published worked
  example, or captured as a TealScript regression pin. A current-output snapshot
  may be useful to pin a regression, but it must not be described as reference
  correctness unless it has been re-derived or checked independently.
- T50 CI protection audit: before this branch added package `test-ci` scripts,
  root CI's blocking `yarn test:ci` did not run the TealScript or Tealchart
  Vitest suites because Turbo only executes workspaces with that script. CI now
  protects TealScript's default suite/parser check and Tealchart's default unit
  suite through those package scripts. `.github/workflows/ci.yaml` also runs
  Tealchart `typecheck:native`, the scoped web TealScript paste-path tests, and
  the TealScript grammar differential soak/realtime sweep explicitly. The
  sweeps remain opt-in locally to keep the routine package gate cheap, but they
  are deterministic and merge-sensitive enough to block PR CI. They do not need
  to be added to `scheduled-tests.yaml`: that workflow is for known-red
  `tealstreet-next` and `safe-cex` monitoring, while these parity sweeps are now
  change-gated by PR/push CI and would be harder to triage when mixed into the
  red scheduled job.
- T51 merge-procedure trap: in the aimux/worktree layout, `master` is checked
  out in the sibling main checkout, so `git fetch origin master:master` refuses
  to update the local `master` ref. If that failure is missed, `git merge
  master` can merge a stale base and produce a misleading no-op merge commit.
  When that worktree ownership constraint is present, use `git fetch origin`
  followed by `git merge origin/master`, then immediately verify with `git
  merge-base --is-ancestor origin/master HEAD`. Exit 0 means the remote master
  tip is incorporated; nonzero means the branch is still stale.
- `tests/compat/pine-builtin-behavior.test.ts` contains table-driven v6
  behavior checks for the non-TA namespaces that name/signature coverage cannot
  validate: `math.*`, `str.*`, `array.*`, `matrix.*`, `map.*`, and `color.*`.
  T28 expanded the table from a representative sample to 185/185 official
  manual-index names across those namespaces, pinned by a coverage assertion
  over the committed manual snapshot. The table currently runs 30 grouped rows
  covering exact values and edge cases including empty arrays, out-of-range
  indices, `na` inputs, negative lengths, Unicode strings, matrix dimension
  mismatches, and array maximum-size limits. Wrong-before count over the full
  table was 10 behavior checks: negative array construction, oversized array
  construction, empty `array.first()`/`array.last()`/`array.pop()`/
  `array.shift()`, and growth past 100,000 through `array.push()`,
  `array.unshift()`, `array.insert()`, and `array.concat()`.
- `tests/compat/pine-drawings.test.ts` pins behavior coverage for the official
  drawing/object manual-index surface that TealScript implements: 140/140 names
  after excluding the three remaining bare cast/helper allowlist entries
  (`box`, `linefill`, `table`). The coverage spans construction, `set_*`
  mutators, deletion, `.all` lifecycle arrays, official label/line style
  constants, chart point constructors/copy, and object getters where v6 defines
  them. Wrong-before count from T30 was one behavior check: `label.set_point`
  was present in the official manual index but still allowlisted and unregistered
  in runtime/checker.
- `tests/compat/pine-strategy-value-behavior.test.ts` pins fixed strategy
  position/profit values and open/closed trade accessor values across the
  interpreter and compiled runtimes. The fixture covers `position_size`,
  `position_avg_price`, `netprofit`, `openprofit`, `grossprofit`, `grossloss`,
  `wintrades`, `losstrades`, `eventrades`, open/closed trade counts, open-trade
  capital held, closed-trade first index, numeric open/closed trade accessors,
  and Pine-visible trade metadata in the final ledger. Wrong-before count from
  T31 was two behavior checks: compiled `losstrades` counted break-even trades
  as losses, and compiled `process_orders_on_close` strategy entries inherited
  their entry bar's high/low range into max runup/drawdown while the interpreter
  marks close-only around same-bar close fills.
- `tests/compat/pine-runtime-metadata-behavior.test.ts` pins fixed behavior for
  metadata/time namespaces that drive multi-timeframe and session-filtered
  public indicators. Coverage is 14/14 official `timeframe.*` names, 9/9
  official `session.*` names, 34/40 official `syminfo.*` names, and 11/11
  official chart metadata names after excluding `chart.point*`, which belongs
  to the drawing/object suite. The six uncovered `syminfo.*` names are the
  still-allowlisted analyst recommendation count provider series; the test also
  labels `syminfo.exchange` as a local/derivable extension outside the official
  denominator. It asserts timeframe parsing/in-seconds/from-seconds, explicit
  timezone `time()`/`time_close()` session boundaries, session segment flags,
  host-supplied syminfo values, absent provider metadata as `na`, derivable
  syminfo fallbacks, and chart metadata fallbacks across interpreter and
  compiled execution. Wrong-before count from T32 was one behavior check:
  compiled `syminfo.main_tickerid` read the host field directly and returned
  `undefined` instead of falling back to `tickerid` then `ticker` like the
  interpreter.
- `tests/compat/pine-barstate-behavior.test.ts` pins literal bar phase
  sequences for all 7/7 official `barstate.*` names over historical load,
  same-bar realtime replacement, and next-bar confirmation across the
  interpreter and production compiled worker path. Wrong-before count from T33
  was one production compiled-worker behavior check: worker `updateBar` reran
  compiled output with only the final bar marked realtime, so when a new
  realtime bar arrived the previous realtime bar lost its confirmed closing
  evaluation (`barstate.islast=true`, `isrealtime=true`, `isconfirmed=true`,
  `ishistory=false`, `isnew=false`). Worker state now carries the active
  realtime final bar and, when a new bar appends, the previous realtime bar's
  confirmed-closing index through request/discovery retries.
- `tests/compat/pine-input-behavior.test.ts` pins value and metadata behavior
  for all 14/14 official input functions across interpreter and compiled
  execution. It covers defaults round-tripping, `confirm` metadata, `options`
  rejecting defaults outside the list, `minval`/`maxval` rejecting rather than
  clamping, `step` as widget-increment metadata rather than a validity grid,
  `input.source()` resolving `hlc3`, `ohlc4`, and another plot, plus
  `input.timeframe`, `input.symbol`, `input.session`, `input.time`,
  `input.price`, `input.text_area`, and `input.enum` shapes. Wrong-before count
  from T34 was five compiled behavior checks: compiled input registration did
  not validate defaults against `options`, `minval`, or `maxval`, so invalid
  pasted-script inputs could run compiled with a silently wrong default while
  the interpreter surfaced a Pine-style input error.
- `tests/compat/pine-request-ticker-option-behavior.test.ts` pins request and
  ticker option behavior across interpreter and compiled execution using a
  seeded `RequestDatafeed` whose recorded queries prove the values came from
  the provider seam rather than `na` comparisons. It covers
  `ignore_invalid_symbol` for `request.security()`, `request.security_lower_tf()`,
  `request.seed()`, `request.dividends()`, `request.earnings()`,
  `request.splits()`, `request.financial()`, `request.economic()`, and
  `request.quandl()`, plus `ignore_invalid_currency` for
  `request.currency_rate()` and unseeded `request.footprint()` returning `na`.
  It also covers `request.security()` currency routing, request-level
  `calc_bars_count`, declaration-level `calc_bars_count` metadata, the
  higher-timeframe lookahead difference between future-leaking and confirmed
  values, and all official `ticker.*` constructors/modifiers feeding concrete
  `request.security()` symbols. Wrong-before count from T35 was zero runtime
  behavior checks; existing semantics were aligned, but there was no previous
  both-path seeded fixture proving the option surface.
- `tests/compat/pine-alert-log-runtime-behavior.test.ts` pins behavior for all
  9/9 official alert/log/runtime names in the manual index: `alert`,
  `alertcondition`, the three `alert.freq_*` constants, `log.info()`,
  `log.warning()`, `log.error()`, and `runtime.error()`. It asserts literal
  alert event counts for `freq_all`, `freq_once_per_bar`, and
  `freq_once_per_bar_close`, `alertcondition()` value alignment and placeholder
  rendering, `log.*` placeholder formatting, and `runtime.error()` halting
  inside a UDF and inside a seeded `request.security()` expression on both the
  interpreter and compiled paths. Wrong-before count from T36 was one behavior
  check: compiled request-expression subprograms converted `runtime.error()`
  into a plain `Error` and swallowed it as a per-request-bar failure, so a
  request expression that should halt instead returned `na` through the compiled
  path. Request subprograms now throw the same compiled runtime-error exception
  as the main path and propagate it out of the request series loop.
- After T36, the behavior axis covers every implemented public-indicator
  namespace with user-visible values or side effects: math/str/array/matrix/map/
  color, TA, drawings/objects, runtime metadata, barstate, inputs, request/
  ticker, alerts/logs/runtime errors, and rendering surfaces already covered in
  Tealchart. The remaining official names without behavior assertions are the
  16 known-missing allowlist entries and the intentionally minimal
  strategy/backtest tail; they matter for complete TradingView broker/provider
  fidelity, but they are labelled rather than silently counted as working
  public-indicator support.
- `tests/compat/pine-grammar-differential.test.ts` adds grammar-driven
  differential coverage that does not depend on pasted third-party scripts. It
  generates deterministic programs from v6 grammar feature blocks covering
  operators/history/ternaries, if/switch, for/while with break/continue, UDFs,
  methods, UDTs, enums, tuples, arrays, matrices/maps, var/varip,
  `input.source()`, seeded `request.security()`, drawings, alertcondition/log
  side effects, and imported library calls. T39 adds expression-level and
  structural randomness on top of the block composition: nested expression
  trees mixing `na` and history, the same UDF or method called from several
  sites with different arguments, UDTs held in arrays and maps and mutated
  across bars, request expressions wrapping generated UDFs, and `varip`/history
  combinations. Full-execution generated programs run through both interpreter
  and compiled execution over fixed bars and seeded request/library seams,
  comparing plots, drawings, alerts, logs, and runtime-error code/message
  output. The default gate explores 48 full-execution programs; the opt-in soak
  is `TEALSCRIPT_GRAMMAR_DIFF_SOAK=1 yarn vitest run
  packages/tealscript/tests/compat/pine-grammar-differential.test.ts`, which
  currently explores 384 full-execution programs. T37/T39 found zero
  full-execution compiled/interpreter divergences over both counts.
  The same file also runs 12 default realtime generated programs, or 96 under
  the soak flag, through production worker same-bar updates and compares those
  outputs to interpreter `updateBar(...)`. This lane found a real residual
  compiled-worker gap: all 36 default generated updates and all 288 soak
  generated updates currently classify as
  `compiled-worker-stateless-intrabar-reentry`. The mechanism is that the
  worker's compiled realtime path reconstructs execution from the current bar
  window instead of maintaining an incremental compiled VM state, so generated
  stateful intrabar shapes (`varip`, mutable UDT/collection state, and
  history-sensitive nested expressions) diverge from interpreter re-entry. The
  test treats that single classification as known data and fails on any new
  unclassified generator finding.
- `tests/compat/pine-composite-indicators.test.ts` enforces realistic composite
  length: legacy long composites must be 150-300 lines, true-length composites
  must be 200-300 lines. Do not replace these with short single-idiom snippets.
- `src/compat/compiledFallbackBaseline.ts` stores the sampled compiled fallback
  rate over written corpora. Sampling is useful but not exhaustive; keep it in
  sync when adding/removing eligible corpus fixtures.

### Compiled Parity Harness

The compiled path is treated as user-critical because the measured realistic
performance baseline shows compiled execution materially faster than the
interpreter on dense scripts. Every new compiled feature needs a test that:

- Parses the same Pine source once.
- Executes interpreter and compiled paths over deterministic bars and seeded
  request data when needed.
- Compares normalized plot/drawing/log/alert output, not just successful
  compilation.
- Exercises at least two call sites when state is involved.

The two-call-site rule is not optional. This branch already found multiple
silent state-sharing bugs: stateful `ta.*` calls inside UDFs, `input.source`
override propagation, and imported library persistent state. A one-call-site
test can pass while production output is still wrong.

### Request/Datafeed State

`src/runtime/requestDatafeed.ts` is now the provider seam for host-backed
request data. `InMemoryRequestDatafeed` has deterministic seed helpers for
tests. The implemented request surface includes:

- `request.security()` and legacy `security()`.
- `request.security_lower_tf()`.
- `request.seed()`.
- `request.currency_rate()`.
- `request.economic()`.
- `request.dividends()`, `request.splits()`, and `request.earnings()`.
- `request.financial()`.
- Legacy `request.quandl()`.
- `request.footprint()`, including `footprint.total_volume()`,
  `footprint.buy_volume()`, `footprint.sell_volume()`, `footprint.delta()`,
  `footprint.rows()`, `footprint.poc()`, `footprint.vah()`,
  `footprint.val()`, `footprint.get_row_by_price()`, and the corresponding
  `volume_row.*` accessors for prices, volumes, delta, and imbalance flags.

Unseeded provider data returns `na` cleanly where Pine semantics allow missing
data. It should not classify as a runtime failure. Synthetic ticker IDs from
`ticker.*` modifiers are preserved through request routing.

### Library/UDF State

Host-provided Pine libraries are consumed through the parser, checker,
interpreter, worker protocol, and compiled path. Current compiled support covers
exported constants, expression and block-bodied exported functions, methods,
UDTs, enum members, enum `.title()`, imported helpers inside request
subprograms, versioned aliases, export-to-export calls, transitive imports, and
call-site-isolated persistent library state.

UDF support covers single-expression and block bodies, defaults, named
arguments, tuples, methods, nested helper graphs, request wrappers, UDT field
history, indexed UDF/TA returns, recursion, and call-site-local state for
stateful `ta.*` calls.

Recursion is a deliberate TealScript superset behavior. Pine v6 rejects
recursion, but TealScript runs direct and mutual recursion with the existing
maximum-depth guard. The semantic checker emits a warning that names the cycle
and explains the script will not run on TradingView. The warning must not block
execution or count as a corpus failure.

### Remaining Gaps With Evidence

- Host-backed compiled `request.*` data and host-provided imported libraries now
  reach the app-facing production path. The measured worker baseline exercises
  the real worker protocol, request-data bridge with seeded resolver replies,
  and host-provided library registry over the same 89 eligible external corpus,
  true-length composite, awkward composite, and performance composite scripts as
  the in-package fallback baseline. Runtime request discovery closed the old
  bridge gap from 60 compiled and 29 `unpreloadable-request-data:*` fallbacks to
  89 compiled and zero request/library fallbacks. The current session-safe
  baseline then applies the sharpened realtime safety classifier and records 81
  compiled load executions plus 8 visible
  `compiled-worker-stateless-intrabar-reentry:*` interpreter fallbacks.
- Same-time `updateBar` messages now route through the compiled worker bridge
  instead of `state.engine.updateBar(...)`. The worker updates its last bar,
  preserves the resolved request-data cache, cancels stale in-flight request
  misses from older ticks, and reuses the host-provided library registry. This
  preserves compiled execution for realtime-safe scripts and avoids refetching
  unchanged request contexts. The committed live-update baseline measures three
  same-bar ticks for each of the 89 production-worker eligible scripts and
  records 243 compiled updates plus 24 visible realtime safety fallbacks. The
  compiled path currently reconstructs execution from the current bar window
  rather than using a
  dedicated incremental compiled VM; T39 shows that distinction is not just
  theoretical. Generated same-bar programs with `varip`, mutable UDT/collection
  state, or history-sensitive nested expressions diverge from interpreter
  `updateBar(...)` and are classified as
  `compiled-worker-stateless-intrabar-reentry`. T41 made that classifier
  conservative enough to catch matching stateful intrabar shapes in the corpus
  and route them to the interpreter instead of serving silent compiled drift.

### T40 Assessment: Compiled Worker Realtime State

T39's realtime generator findings are architectural, not another defect inside
one shared execution model. The compiled worker realtime path currently
reconstructs output by replacing the last bar in the current bar window and
running compiled execution again. The interpreter `updateBar(...)` path is
incremental: it rolls back to the last committed bar, keeps intrabar-persistent
state, and advances through each same-bar tick. Those models agree for the
measured production corpus, but generated stateful intrabar programs prove they
do not agree in general.

The generated shapes that actually diverge all need state from earlier
same-bar executions that is not present in the final bar window:

- `varip` plus history: a `varip` value updated on tick N must be visible on
  tick N+1 of the same bar. Reconstructing from the bar window sees only the
  current OHLCV row and loses that intrabar accumulator.
- Mutable UDTs stored in arrays or maps: interpreter re-entry preserves the
  object graph and collection identities across same-bar ticks. Stateless
  compiled reconstruction creates a fresh object graph for the current window,
  so mutation counts, stored field values, and derived plots can drift.
- History-sensitive nested expressions: these appeared in first-difference
  reports when composed with the stateful intrabar blocks above. They are not
  yet proven to diverge alone; the observed mechanism is still missing
  same-bar incremental state, not expression nesting by itself.
- Request-wrapped UDFs, imported helpers, and library registry calls were
  present in generated programs but were not the observed cause. The request
  bridge and imported-library registry remain clean on the full-execution lane.

Bounded changes can make the reconstruct-from-window model more useful, but
not equivalent to Pine realtime semantics. It can preserve request caches,
host-provided library registries, input metadata, known realtime barstate phase,
confirmed previous-realtime-bar markers, and retry/discovery bookkeeping across
compiled worker updates. That is enough for pure expressions, request-heavy
scripts, imported-library calls, and the current 89-script production live
baseline. It cannot recover values whose only source is a prior same-bar
execution: `varip`, mutable array/map/matrix/UDT identities, function-local
persistent state, stateful TA caches nested behind multiple call sites, drawing
IDs mutated once per tick, alert frequency bookkeeping, or strategy ledger
state updated intrabar. Carrying a few selected snapshots across the stateless
rerun would become a partial incremental VM and would be fragile in exactly the
state-keying and object-cloning areas that have already produced bugs on this
branch.

A real incremental compiled VM should be designed as a session runtime, not as
ad hoc state patches around `executeCompiled(...)`. The likely production work
is:

- Compiled runtime: introduce a compiled execution session in
  `src/runtime/codegen/execute.ts` or an adjacent file that compiles once, owns
  the generated script instance, `ExecutionContext`, plots, drawings, alerts,
  logs, strategy ledger, request/security caches, input definitions, imported
  library state, and runtime profile. It needs `executeInitial(bars)` and
  `updateBar(bar)` methods that mirror `TealscriptEngine.updateBar(...)`,
  including rollback/commit, same-bar replacement, next-bar confirmation, and
  execution-mode/fallback reporting.
- Generated code and snapshots: audit generated `save/restore` behavior for
  arrays, maps, matrices, UDT object graphs, function scopes, dynamic TA cache
  keys, request subprogram state, plot metadata arrays, and exact `varip`
  restore semantics.
- Worker ownership: keep one compiled session per script/generation in
  `src/worker/worker.ts`, invalidate it on `init`, `updateBars`, `setInputs`,
  script/runtime/library changes, and preserve it across `updateBar`,
  request-cache retries, and request discovery. Hidden discovery passes must
  run in a forked or discardable session so their plots, drawings, alerts, logs,
  runtime errors, strategy state, and cache mutations do not leak into visible
  output.
- Tests and baselines: add focused two-call-site fixtures for `varip`, mutable
  UDT/collection state, request-wrapped UDFs, imported methods, alerts/drawings,
  and strategy state, then change the T39 realtime generator from the known
  `compiled-worker-stateless-intrabar-reentry` classification back toward zero
  findings and rerun the T11/T14/T16/T39 baselines.

Rough size: a conservative visibility/fallback classifier is likely under 100
production lines plus focused tests. A robust minimal compiled session VM is a
multi-day change, roughly 600-1200 production and test lines for indicator
realtime semantics, and larger if strategy, drawing lifecycle, and request
discovery fork semantics are completed in the same pass.

User-visible consequence today:

- Current measured corpus: no observed user-facing divergence. The production
  live baseline is now 243/267 compiled updates plus 24/267 visible interpreter
  fallbacks for stateful intrabar shapes, and the realtime correctness sweeps
  match for scripts that remain compiled while classifying unsafe shapes instead
  of serving them through the stateless compiled realtime path.
- `varip` realtime scripts: medium likelihood in public indicators that count
  ticks, gate alerts once per live bar, update last-bar labels/tables, or track
  intrabar highs/lows. A user may see live plots, labels, or alert guards reset
  or undercount during ticks; a reload can appear to "fix" the chart because
  full historical execution is self-consistent.
- Persistent arrays/maps/UDTs mutated on the last bar: medium-low to medium
  likelihood, concentrated in advanced pivot, zone, volume-profile, table, and
  market-structure indicators. A user may see live drawings/tables lag, reset,
  miss a mutation, or show stale counts while historical bars remain plausible.
- Nested history expressions alone: likelihood and consequence are unknown
  until isolated. When combined with `varip` or mutable collections, they can
  surface as plausible plot drift rather than a crash.
- Side effects and strategy state: potentially high consequence when guarded by
  stateful intrabar conditions. The generator did not prove a separate alert,
  log, drawing, or ledger defect, but the same model boundary can suppress or
  duplicate visible side effects if the compiled worker serves a script whose
  intrabar state cannot be reconstructed.

Decision: do not start an incremental compiled VM yet. T41 implemented the
bounded visibility step instead, and T44 sharpened it after measuring the
over-trigger population. `src/runtime/realtimeSafety.ts` conservatively detects
scripts with `varip`, `varip` UDT fields, persistent mutable tuple state,
persistent collection mutation, and compound mutation of persistent state, then
the worker routes those scripts through the interpreter with a
`compiled-worker-stateless-intrabar-reentry:*` fallback reason visible in
`RuntimeProfile`. Standalone stateful TA calls and persistent mutable
declarations are allowed to stay compiled because T43 forced them through the
stateless realtime path and found matching output in the production corpus. The
detector still intentionally biases toward false positives where the shape is
not proven safe: losing compiled speed on realtime updates is acceptable, while
silently serving wrong intrabar values is not. Classified scripts are
interpreter-owned from load instead of switching only on the first live tick,
because drawing/object handles and other side-effect state must stay coherent
across the session. T46 leaves the residual conservative fallbacks in place:
their forced-compiled samples matched, but their AST mechanisms are
indistinguishable from genuine divergence without deeper path-sensitive dataflow.
If the product needs compiled speed for those scripts, build a proper compiled
session VM rather than carrying isolated snapshots across stateless reruns.

T42 measured the cost of that decision with the same production worker baseline:
18/89 scripts fall back from initial load, and 54/267 same-bar tick updates fall
back during live execution. The external corpus accounts for 7 scripts and 21
ticks; true-length composites account for 3 scripts and 9 ticks; awkward
composites account for 5 scripts and 15 ticks; performance composites account
for 3 scripts and 9 ticks. This is a material but bounded share: users get the
interpreter's correct incremental state for those shapes at slower realtime
speed, while the remaining 71 scripts and 213 tick updates stay compiled.

T43 measured whether the T41 share was genuine divergence or conservative
over-triggering before sharpening the classifier. The method forced the 18
classified scripts through the stateless compiled realtime path anyway, compared
their same-bar tick outputs against interpreter `updateBar(...)`, and normalized
implicit plot metadata defaults (`style=line`, `linewidth=1`, `offset=0`) so
representation noise did not count as a divergence. Result:
`PINE_REALTIME_SAFETY_FORCED_COMPILED_AUDIT` records 4/18 scripts and 12/54
tick updates as genuine divergence, 14/18 scripts and 42/54 tick updates as
over-triggering, and zero compiled-unavailable cases. Genuine divergences are
the drawing/object lifecycle and request-fanout collection-state shapes; pure
stateful TA calls, persistent declarations alone, and simple UDT member mutation
matched the interpreter in this corpus.

T44 sharpened the classifier from that measurement without weakening the
observed divergence family. Standalone stateful TA calls and persistent mutable
declarations no longer force fallback, because the forced-compiled audit showed
they matched. Persistent collection mutation, persistent mutable tuple state,
`varip`, `varip` UDT fields, and compound mutation of persistent state remain
classified, because those mechanisms overlap the genuine drawing/object and
request-fanout divergences and are not proven safe in the general case. Result:
10/18 script fallbacks and 30/54 live tick fallbacks were recovered. The current
production baseline is 81/89 compiled on load and 243/267 compiled on live
updates; the remaining 8 scripts and 24 ticks are visible interpreter fallbacks.

T46 re-audited that post-sharpening residual. Of the 8 remaining load fallbacks
and 24 live tick fallbacks, 4 scripts/12 ticks are genuine stateless-compiled
realtime divergences (`True Length Structure Lifecycle`, `Awkward Interleaved
Drawings`, `drawing lifecycle composite`, and `request fanout composite`). The
other 4 scripts/12 ticks matched when forced through the stateless compiled
realtime path (`True Length MTF Confluence Dashboard`, `True Length Volume
Signal Matrix`, `Awkward Collections`, and `dense computation composite`), but
they still contain the same persistent collection/history/compound-mutation
mechanisms as the genuine divergences. That is the conservative floor for the
current syntactic detector: sharpening further would require path-sensitive
dataflow proving that persistent mutated state cannot reach plots, drawings,
alerts, logs, or request expressions on an intrabar update. Until that analysis
or an incremental compiled VM exists, these shapes intentionally stay on the
interpreter realtime path. This preserves correct user-visible values at the
cost of realtime speed, and keeps the fallback visible through
`RuntimeProfile.fallbackReason` rather than silently serving wrong compiled
intrabar output.

- Realtime correctness is now measured separately from execution mode. Mode is
  now 243/267 compiled for live worker ticks after the sharpened safety
  fallback. The default gate covers a fast request/import subset; the opt-in
  `TEALSCRIPT_REALTIME_SWEEP=1` sweep records output parity against fresh full
  execution for scripts that remain in the compiled worker path and visible
  interpreter fallback for classified stateful intrabar shapes.
- Interpreter `updateBar(...)` remains the intentional worker fallback path.
  A re-entry bug previously cleared imported-library bindings without clearing
  the import-registration keys, so imports were skipped and calls such as
  `rt.adjusted(...)` failed with `Unknown function`. The fix clears both
  structures before re-registering imports. Restoring the live worker parity
  oracle also exposed a source-aware wrapper leak from imported function returns;
  binary operators now unwrap those values before arithmetic/comparison so
  request-heavy fallback scripts do not produce `[object Object]...` plot
  values. T16 found a second fallback-path re-entry class: scope snapshots did
  not clone plain arrays, so stateful builtin histories such as RSI could be
  mutated through the snapshot and re-entered from the wrong state. Scope
  snapshots now clone plain arrays recursively, and same-time replacement
  restores a pre-last-bar scope snapshot before replaying the bar. The strategy
  corpus realtime sweep now records 36/36 matching updates on both worker and
  interpreter paths, including normalized strategy ledger state.
- Footprint object accessors now route through the same provider seam as
  `request.footprint()`. Seeded footprints expose total/buy/sell volume, delta,
  rows, POC, VAH/VAL rows, price-addressed row lookup, and row price/volume/
  delta/imbalance accessors in both interpreter and compiled execution.
  Unseeded guarded access returns `na` cleanly rather than throwing or falling
  back.
- Strategy execution now has a minimal deterministic position model for both
  interpreter and compiled paths. It executes market/limit/stop/order/entry/
  exit/close/cancel calls against a ledger that moves `strategy.position_size`,
  `strategy.position_avg_price`, `strategy.netprofit`, open/closed trades, and
  equity/open-profit values. The v6 reference points used for this slice:
  `strategy.entry()` reverses positions by sizing the order large enough to
  close the old position plus open the requested new one; `strategy.order()` is
  a raw order command that reduces an opposite position rather than implicitly
  reversing; `qty` overrides default quantity; `process_orders_on_close` fills
  market orders on the current close; and `pyramiding` is the maximum number of
  same-direction `strategy.entry` trades, defaulting to one. TealScript still
  accepts `pyramiding=0` from the checker and treats it as one initial entry so
  accepted scripts do not become inert.
- The strategy model deliberately stops short of a full TradingView broker
  emulator. Exact intrabar fill ordering, bar magnifier fidelity, session/risk
  halt edge cases, margin/liquidation, fill assumptions for non-standard
  charts, slippage/commission subtleties, and multi-session calendar behavior
  remain partial. Use the deterministic model for language/runtime parity and
  visible position accounting, not for TradingView backtest fidelity claims.
- Data availability, exchange calendars, corporate-action freshness, and
  synthetic ticker bar generation remain host/provider responsibilities. The
  language/runtime path should still parse, check, compile, and return `na` or a
  precise diagnostic when host data is unavailable.
- The compiled-path production baselines are web-path baselines. Native mobile
  currently runs TealScript through the interpreter only, so mobile users get
  correctness fixes, diagnostics, host-provided request data, and host-provided
  Pine libraries, but not compiled worker/request-discovery speedups. With the
  current `new Function(...)` compiler, mobile compiled support first requires
  a native Hermes smoke that proves generated Function-constructor code executes
  and measures its startup/per-bar cost; without that proof, do not infer mobile
  benefit from the web compiled numbers.
- T61 measured the native mobile TealScript capability gap through
  `MobileIndicatorManager` rather than inferring it from the web path.
- T62 wired the interpreter-only mobile library registry. Native hosts can pass
  `getTealscriptLibraries` into `SkiaTealchart`; the hook forwards it to
  `MobileIndicatorManager`, which gives the registry to `TealscriptEngine`.
  Imported-library scripts now resolve and render on mobile without compiled
  execution. The no-registry case still fails visibly as import-not-found.
- T63 wired the interpreter-only mobile request datafeed seam. Native hosts can
  pass `getTealscriptRequestDatafeed` into `SkiaTealchart`; the hook forwards it
  to `MobileIndicatorManager`, which gives the synchronous `RequestDatafeed` to
  `TealscriptEngine`. Request-backed scripts now receive real provider data on
  mobile when the host supplies it. Without a provider, the existing nonfatal
  `request-data-unavailable` warning remains the correct visible behavior.

  | Capability | Web path | Mobile path | Result |
  | --- | --- | --- | --- |
  | Custom-source save and plot handoff | Supported | Supported | Mobile parses caller source, executes through the interpreter, tags plots, and exposes pane metadata for Skia. |
  | Drawing render handoff | Supported | Supported | Mobile returns tagged drawing outputs through `getDrawings()`. |
  | Parse and runtime diagnostics | Supported | Supported | Mobile emits true parse/runtime failures as `severity: 'error'` through `onTealscriptError`. |
  | Request-backed scripts | Supported with host resolver | Supported with host datafeed | Mobile hosts can supply a synchronous `RequestDatafeed`; without one, mobile emits nonfatal `request-data-unavailable` instead of a script-failed error. |
  | Imported Pine libraries | Supported with web registry | Supported with host registry | Mobile hosts can supply deterministic Pine library ASTs; imported-library scripts resolve and render through the interpreter path. |
  | Compiled execution/realtime fallback diagnostics | Supported on web worker | Missing | Mobile is interpreter-only under the current `new Function(...)` compiler and stock Hermes assumptions. |

- Rendering normalization is useful and covered for plots, hlines, fills,
  bgcolor/barcolor, markers, OHLC visuals, labels, lines, boxes, tables,
  polylines, and linefills, but it intentionally does not claim pixel-perfect
  TradingView geometry, text metrics, marker shapes, candle pixels, or table
  sizing.
- Arbitrary nested layout, imported-library diagnostics, and qualifier-sensitive
  request-expression edge cases are hardening areas. Treat any newly found
  pasted-script failure as a test-first parity cluster, not a documentation
  item.

### RequestDatafeed Worker Bridge Design

The bridge must keep the compiled runtime synchronous while data loading stays
asynchronous across the Web Worker boundary. Do not try to structured-clone a
`RequestDatafeed`: methods such as `getBars()`, `getCurrencyRate()`, and
`getCorporateAction()` are functions and cannot be posted to the worker.

Use protocol messages, all serializable:

```ts
type WorkerRequestDataKind =
  'bars' | 'series' | 'currency_rate' | 'corporate_action' | 'economic' | 'financial' | 'quandl' | 'footprint';

interface RequestDataMessage {
  type: 'requestData';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  query:
    | RequestBarsQuery
    | RequestSeriesQuery
    | CurrencyRateQuery
    | CorporateActionQuery
    | EconomicSeriesQuery
    | FinancialMetricQuery
    | QuandlSeriesQuery
    | FootprintQuery;
}

interface RequestDataResultMessage {
  type: 'requestDataResult';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  ok: true;
  value: RequestDataContext | RequestSeriesPoint[] | number | CorporateActionValue | FootprintValue | null;
}

interface RequestDataErrorMessage {
  type: 'requestDataResult';
  scriptId: string;
  requestId: number;
  generation: number;
  kind: WorkerRequestDataKind;
  ok: false;
  error: {
    code: 'missing-provider' | 'not-found' | 'timeout' | 'invalid-query' | 'provider-error';
    message: string;
  };
}
```

Correlation is `scriptId + generation + requestId`. `requestId` is worker-local
and monotonically increasing for one worker instance. `generation` must match
the existing output metadata generation so results from an old script, input
set, or bar set are ignored after `init`, `updateBars`, `updateBar`,
`setInputs`, or `dispose`.

Cache ownership should be split:

- Main thread owns provider calls and de-duplication across scripts. It can
  coalesce identical normalized queries in
  `packages/tealchart/src/tealscript/TealscriptManager.ts` or the host adapter
  beneath `packages/tealchart/src/TealchartWidget.ts`, then fan the result out
  to each waiting worker request.
- Worker owns the execution cache because `tryExecuteScript()` needs a
  synchronous `RequestDatafeed`. Implement a worker-local serializable cache
  keyed by `scriptId + generation + kind + normalizedQuery`.
- Worker invalidates the cache on `init`, `updateBars`, and any symbol/timeframe
  change. On `updateBar`, invalidate only entries whose query overlaps the
  current incomplete bar or whose provider marks them realtime-sensitive.
  Static point series such as financial/economic/corporate-action values can
  survive an incremental bar update when their query key and bar time range do
  not change.

Choose a two-pass collect-then-execute model:

1. First pass runs analysis before compiled execution and enumerates required
   request queries from compiled request subprogram metadata plus literal/simple
   request arguments. It posts cache misses as `requestData` messages and does
   not execute the script yet.
2. Main thread resolves every miss asynchronously, using its live/chart
   datafeed, and posts `requestDataResult` messages.
3. Worker stores successful results in the execution cache. Failed or timed-out
   results store a typed miss, not an exception.
4. Worker retries the same generation once all required responses for that
   generation are settled. `tryExecuteScript()` then receives a synchronous
   cache-backed `RequestDatafeed`.

When the host cannot serve a request, the main-thread resolver returns a typed
failure (`missing-provider`, `not-found`, `timeout`, `invalid-query`, or
`provider-error`). The worker warms that cache slot as a missing value so Pine
request calls return `na`/empty arrays where applicable rather than turning data
absence into a script runtime error. Tealchart separately reports a nonfatal
`request-data-unavailable` runtime diagnostic through `onTealscriptError`, with
the symbol/field/query and provider detail in the message.
Realtime interpreter fallback for classified stateful intrabar shapes follows
the same visibility rule: `RuntimeProfile.fallbackReason` keeps the stable
`compiled-worker-stateless-intrabar-reentry` classification used by baselines,
and `RuntimeProfile.fallbackDiagnostics` names the triggering construct plus
source line/column. Tealchart surfaces that as a nonfatal
`realtime-compiled-fallback` diagnostic. It must read as correct-but-slower, not
as a script error: the interpreter path is the correctness path for those live
ticks.

This is preferable to suspending mid-bar because compiled code currently calls
`request.security()` synchronously inside emitted closures and bar loops; adding
continuations through those closures would touch the emitter, runtime,
rollback, profiling, and drawing lifecycles at once. It is also preferable to
falling back on the first cache miss because that preserves the exact silent
interpreter fallback this branch made observable.

Rejected options:

- Do not pass a function-bearing provider in `InitMessage`; structured clone
  rejects it.
- Do not make compiled request builtins return promises; Pine semantics and the
  current series model require a value at the current bar.
- Do not block the worker with `Atomics.wait` or a synchronous XHR-style bridge;
  it would be brittle in browsers and hostile to chart responsiveness.
- Do not let the interpreter be the fallback for provider misses. Missing host
  data should resolve to `na` or a precise diagnostic, while missing bridge
  plumbing should remain visible in `RuntimeProfile.fallbackReason`.

Static preload limits:

- The worker preload pass only enumerates request calls whose routing arguments
  can be determined before execution: string/number/boolean literals, supported
  enum constants such as `currency.USD` and `dividends.gross`,
  `input.timeframe()`/`input.int()` defaults or supplied input overrides for the
  relevant arguments, and `syminfo.ticker`, `syminfo.tickerid`,
  `syminfo.main_tickerid`, `syminfo.currency`, and runtime chart timeframe
  metadata.
- For `request.security()`, `request.security_lower_tf()`, and `request.seed()`,
  the current preloadable expression surface is direct OHLC identifiers and
  OHLC array/tuple literals such as `[open, high, low, close]`. Computed request
  expressions still compile when a synchronous provider is present, but the
  worker cannot preload them until the bridge can enumerate those dependencies
  without running generated request subprograms.
- A symbol, timeframe, source, financial id, Quandl column, footprint setting,
  or request field computed from a series value or otherwise varying per bar
  cannot be enumerated ahead of execution. The worker bridge handles that
  residual with runtime discovery: after static preload misses are resolved, the
  worker runs a hidden compiled pass with a cache-backed discovery datafeed. The
  discovery datafeed records the concrete request queries issued at runtime,
  returns the normal missing-data shape for cache misses, and the worker
  discards the entire discovery result. The interpreter is not used for
  discovery because it would exercise a different execution engine and could
  hide compiled-only request paths.
- Runtime discovery is bounded per output generation. The worker retries the
  same generation for up to three request-discovery fetch rounds. That is enough
  for ordinary series-varying symbols/timeframes and for data-dependent request
  branches that reveal another query after earlier data is warmed, while keeping
  a script that keeps revealing new contexts from looping forever. A symbol that
  is genuinely different on every historical bar still converges in one
  discovery round if the finite bar set stays within the compiled runtime's
  unique-request-context limit. A script whose warm-cache passes keep revealing
  new request contexts after the limit is classified as a clean interpreter
  fallback with `RuntimeProfile.fallbackReason` starting
  `unpreloadable-request-data: discovery-not-converged:` and including the
  still-missing request kinds. A script that exceeds the compiled/interpreter
  Pine-style unique request context limit remains a visible runtime error:
  `Too many unique request.* contexts: maximum is 40`.
- Discovery output is never posted to the main thread. Plots, drawings, alerts,
  logs, strategy state, and any runtime error produced during the hidden pass
  are discarded with that pass. Only the final compiled execution or the
  classified interpreter fallback can produce visible worker output; this avoids
  duplicate user alerts or transient drawings while the request cache is being
  warmed.

Concurrent scripts:

- Normalize queries before coalescing. A query key should include kind, symbol
  or synthetic ticker id, timeframe, expression/subprogram id where relevant,
  field/column/period/action kind, barmerge gaps/lookahead, session/currency,
  calc bars count, and requested chart time range.
- If two scripts request the same symbol/timeframe concurrently, the main
  thread should issue one provider call and attach both worker requests as
  waiters. The responses still go back separately with each worker's
  `scriptId`, `generation`, and `requestId`.
- If one script is updated while a shared provider call is in flight, drop only
  that script's stale waiter. Do not cancel the provider call if another current
  waiter still needs it.

Failure behavior:

- Provider not wired: return `ok: false`, `code: 'missing-provider'`; worker
  records `fallbackReason = 'missing-request-datafeed'` only if no cache-backed
  provider can be constructed.
- Provider has no data: return `ok: true`, `value: null`; the cache-backed
  datafeed returns `na` or an empty lower-timeframe array according to the
  existing package-level request semantics.
- Timeout: main thread returns `ok: false`, `code: 'timeout'`; worker emits a
  result using cached previous-generation data only if the query is explicitly
  marked reusable. Otherwise it returns `na` and logs/profile-tags the timeout
  so the chart does not silently show stale signals.
- Invalid query/provider error: surface a precise worker error or semantic-like
  runtime diagnostic when the request shape is wrong. For transient provider
  errors, prefer `na` plus a profile/log marker over killing the whole script.

Files to touch:

- `packages/tealscript/src/worker/protocol.ts`: add `requestData` and
  `requestDataResult` message types and serializable query/result unions.
- `packages/tealscript/src/worker/worker.ts`: add cache state, request-miss
  collection, result handling, generation checks, and pass the cache-backed
  provider into `tryExecuteScript()`.
- `packages/tealscript/src/runtime/codegen/execute.ts`: expose enough compiled
  request metadata to enumerate preloadable queries before execution; keep the
  runtime `RequestDatafeed` interface synchronous.
- `packages/tealscript/src/runtime/requestDatafeed.ts`: add a small
  cache-backed implementation that reads serializable worker cache entries and
  returns the same shapes as `InMemoryRequestDatafeed`.
- `packages/tealchart/src/tealscript/TealscriptManager.ts`: handle
  `requestData`, call a host-supplied provider adapter, coalesce duplicate
  in-flight queries, and post correlated `requestDataResult` messages.
- `packages/tealchart/src/TealchartWidget.ts` and `packages/tealchart/src/types.ts`:
  add an optional host request-data adapter next to `getTealscriptLibraries`.
- `apps/web/src/components/tealchart/TealchartDirectWeb.tsx`: wire the app's
  chart/live data provider into the Tealchart adapter once the package seam
  exists.

Smallest proving commit:

1. Add protocol types and a worker-local cache-backed `RequestDatafeed`.
2. Support only `kind: 'currency_rate'` for the first end-to-end proof.
3. Add a TealScript worker test where a script with
   `request.currency_rate("USD", "JPY")` first emits `requestData`, receives a
   seeded `requestDataResult`, reruns compiled execution, and reports
   `RuntimeProfile.executionMode === 'compiled'`.
4. Add a Tealchart `TealscriptManager` unit test proving a supplied host
   adapter resolves the worker's `requestData` and that no adapter preserves
   today's clean fallback/profile behavior.
5. Gate with the full TealScript package suite, `@tealstreet/tealscript`
   typecheck, Tealchart `yarn test-unit`, Tealchart web/native typechecks, and
   `git diff --check`.

### Landing Report Facts

The external reduced corpus remains 85 scripts: 77 passing runnable fixtures,
seven intentional negative/self-test diagnostics, and one datafeed parity case
now covered by the worker/mobile provider seam work. The corpus metric
saturated early; the stronger landing signals are now the production worker
baselines, independent manual-index surface audits, behavior-value tables with
declared provenance, realtime correctness sweeps, render-path differential
tests, and the asserted mobile capability baseline.

Implementation domains that genuinely improved:

- Compiled UDF request/security wrappers now handle captured params, computed
  expressions, tuple returns, imported helpers, local/root values, and request
  subprograms.
- Host-backed `request.*` support now has a provider seam for currency,
  economic, corporate actions, financial, Quandl, footprint, seed/security, and
  lower-timeframe data.
- Imported Pine libraries now cover exported constants, block/expression
  functions, methods, UDTs, enums, overloads, transitive imports, and compiled
  persistent state isolation.
- UDF runtime now covers qualifier diagnostics, recursion as a TealScript
  warning-only superset, per-call-site state for stateful builtins, and nested
  helper graphs.
- Builtin name/signature coverage is executable data rather than prose. The
  committed TealScript builtin inventory currently has 899 names, of which 860
  are official manual names and 39 are labelled aliases/local extensions. The
  independent official manual index has 860 names, so the inventory denominator
  is now complete, but the honest implemented/resolved numerator is 844/860
  because 16 official names are known-missing with reasoned allowlist entries.
  The audit delta is committed and grouped by reason instead of being folded
  into the headline number.
- Rendering normalization now covers the high-traffic structural output needed
  for useful chart output, while explicitly avoiding pixel-perfect claims.
- Strategy namespace foundations now parse/check/run enough for pasted public
  strategies to produce outputs or precise diagnostics without claiming fill
  simulation parity.

Domains verified already-correct rather than fixed:

- Ticker modifier request round trips for renko, linebreak, kagi, pointfigure,
  standard, inherit, and `ticker.modify()` were mostly already routed correctly;
  the branch locked them with request-family tests.
- `request.security()` barmerge gaps/lookahead combinations were already aligned
  for the tested higher-timeframe scenarios; the branch added exact per-bar
  fixtures to prevent drift.
- Pine v6 grammar coverage is now executable local reference data rather than a
  vague phrase: `packages/tealscript/src/compat/pineV6GrammarReference.ts`
  enumerates 63 official-doc and manual-index construct snippets spanning declarations/imports,
  variables, type syntax, operators including ternary/history-reference forms,
  if/switch/loops, functions/methods, UDTs, enums, tuples, collections, and
  multi-line continuation, plus built-in object/provider type annotations and
  doc annotations. `yarn vitest run
  packages/tealscript/tests/compat/pine-grammar-coverage.test.ts` parses and
  typechecks each non-allowlisted snippet and fails if the allowlist goes stale.
  The local construct list is 63/63, and the official manual-index audit now
  finds zero grammar entries absent from that list. The 18 entries missing after
  T22 were already-supported coverage omissions: object/provider type
  annotations typecheck, while doc annotations parse as comments and their
  metadata payloads are not interpreted.

Silent wrong-chart bugs found and fixed:

- Compiled stateful `ta.*` calls inside a UDF shared state across call sites.
- Nested UDF `ta.*` state also shared state before call-chain-local isolation.
- Several `ta.*` warmup paths emitted plausible numeric values before Pine's
  first valid bar.
- `ta.adx` resolved but had the wrong signature/default behavior.
- `ta.tr` named/value form and direct variable behavior needed signature/runtime
  alignment.
- `ta.supertrend()` returned the correct line but inverted `direction` polarity,
  which silently flipped public scripts using the documented
  `direction < 0`/`direction > 0` up/down idiom.
- `input.source()` overrides were ignored in compiled request/subprogram paths.
- Imported library `var`/`varip` persistent state was fallback-only, then exposed
  shared-state behavior in compiled execution.
- Imported method overloads were keyed too coarsely before overload-aware
  compiled resolution.

If work resumes, prioritize:

1. Continue paste-and-fix diagnostics on real public indicators, especially
   qualifier-sensitive request expressions and nested layout edge cases.
2. Harden the deterministic strategy ledger where real scripts expose gaps, but
   keep it bounded to clear runtime semantics rather than expanding into a full
   backtest emulator.

Compared with PineTS, TealScript now has broader local tests for compiled-vs-
interpreter parity, diagnostics, rendering normalization, and production-path
worker/request/library execution inside the Tealstreet package boundary. PineTS
still remains useful as a provider-backed execution reference, while TealScript
now has its product path measured through the worker and web registry instead
of only through package-level compiler calls.

Current paste-readiness assessment: a public TradingView indicator is credible
when it stays inside the implemented parser/runtime surface, but the official
manual-index audit means this is not yet a full Pine v6 claim. Current measured
surface against the independent manual index is 844/860 implemented/resolved
official builtin names after the T53 footprint row lookup cluster. The committed
inventory enumerates 860/860 official manual names, but 16 are explicitly
known-missing with reasons rather than supported; none of the remaining gap is
bookkeeping debt. The grammar inventory is 63/63 against parser/typechecker snippets with zero
manual-index grammar entries absent. The strongest product-path evidence is
81/89 production-path compiled load executions plus 8 visible
session-correct interpreter fallbacks, 243/267 compiled live updates plus 24
visible realtime safety fallbacks. The remaining realtime safety fallbacks split
into 4 genuinely divergent scripts/12 ticks plus 4 conservatively rejected
scripts/12 ticks that require deeper dataflow proof before they can safely stay
compiled. Realtime output matches for safe compiled scripts, and request/import
support is wired through the worker and web registry.
What still would not reliably work: exact TradingView pixel/rendering geometry,
the long tail of unimplemented manual builtin/provider names, scripts depending
on provider data the host does not seed, and strategy scripts that require
broker-emulator fidelity such as exact intrabar fills, bar magnifier behavior,
margin/liquidation, or session/risk halt edge cases. Host/provider data absence
is now a labelled user-facing diagnostic rather than a silent empty plot or
script-broken error. Realtime safety fallback is also labelled with the source
construct and line/column that triggered it, while continuing to produce correct
output through the interpreter. Public indicators are the credible target now;
TradingView-equivalent strategy backtests are not.

External public-corpus measurement is now separate from self-authored parity
fixtures. Corpus v1 lives outside the repo at `/tmp/pine-corpus-v1`; no
third-party source is committed. The committed report is
`packages/tealscript/reports/external-pine-corpus-v1.report.json`, generated by
`yarn workspace @tealstreet/tealscript pine:external-corpus --input
/tmp/pine-corpus-v1 --output packages/tealscript/reports/external-pine-corpus-v1.report.json`
from the repo root, or with an absolute output path from the package. If `/tmp`
has been cleared, rebuild the corpus with
`yarn workspace @tealstreet/tealscript pine:external-corpus:refetch --output
/tmp/pine-corpus-v1`; the refetcher downloads the recorded GitHub path at the
recorded commit SHA and verifies the committed byte size for every script before
writing `manifest.json`. It records repo URL, source path, commit SHA, declared
version, byte size, first failed pipeline stage, exact diagnostic, execution
mode, output counts, compiled/interpreter output parity, and a conservative
validity classification. Corpus v1 contains 220 distinct public scripts from 22
repos: 116 `indicator`, 78 `study`, and 26 `strategy`; version mix is v2 1, v3
22, v4 63, v5 121, v6 13. Current parity-enforced raw funnel result is parse
219/220 (99.55%), semantic/typecheck 190/220 (86.36%), compile 190/220
(86.36%), execute 150/220 (68.18%), visible output 139/220 (63.18%). All 190
semantically executable scripts compile in this direct harness, but the runner
now compares compiled output with the interpreter and fails the execute stage
when core plot values, drawings, alerts, logs, or runtime diagnostics disagree.
The output comparator rounds numeric values to 1e-8, canonicalizes drawing IDs,
omits undefined object fields, and stays strict on plot/drawing/alert/log order,
series lengths, `na`/null versus zero, and side-effect presence. Current output
parity splits as 150 matched, 38 mismatched, and 32 not-run; mismatch kinds are
23 plot-value, ten drawing, two alert, one plot-structure, one runtime-error,
and one log difference. The compiled profile now records swallowed ordinary
per-bar and request-expression JavaScript errors as `swallowedErrors` with a
stable site, first bar index, and first message; current v1 instrumentation
shows zero swallowed errors after fixing request dependency capture/replay, so
any future nonzero count is a newly diagnosable runtime gap rather than an
empty-output mystery. The validity
split is 143 supported, 54 TealScript gaps,
21 invalid Pine rows, and two host-dependency gaps; no v1 row remains undecided
for the achievable-ceiling calculation. The
achievable ceiling excludes only rows classified invalid by a specific
TradingView rule or obvious non-Pine corpus hygiene, leaving a denominator of
199; against that ceiling, visible output is 139/199 (69.85%) and
semantic/typecheck is 190/199 (95.48%). Host-dependency gaps remain counted
against the product because valid Pine with missing imported library source
still fails for the user until the host supplies or accepts that source.
`unresolved-import` now surfaces this as its own actionable diagnostic naming
the requested owner/library/version and explaining that the host library
registry did not supply it. The runtime seam already exists on web and mobile:
hosts can provide a `Map<string, Program>` library registry, and apps/web builds
one from saved Tealstreet `library(...)` studies under
`Tealstreet/<LibraryName>/1`. The unresolved public-import gap is source
acquisition, not checker/runtime plumbing: a product surface must let the user
paste or install the matching third-party Pine library source under the exact
`Author/Library/Version` import key. These rows stay counted against the
product until that surface exists.

T126 made intentional runtime continuation visible instead of silent. The first
current-HEAD regeneration after the T125 request-UDF global replay fix still
showed request-expression swallows, so the 1601 v2 events were post-fix data,
not stale residue: three v2 scripts reported 1601 swallowed events, led by
unresolved request-scope identifiers `period_ama`, `adrRange`, `atrRange`,
`dollarVolumePeriod`, `rpsPeriod`, and `volumePeriod`; v1 scratch runs showed
the same class at larger scale before the final capture/replay fixes. The fix
enumerates every expression- or statement-bearing `SecurityCallSite` field
(`symbolExpr`, `timeframeExpr`, `expressionExpr`, `sourceExpr`, option
expressions, `calcBarsCountExpr`, and `expressionLocalStatements`), replays
dependency-selected `var`/`varip` globals that do not perform requests, and
captures non-replayable prior request results rather than emitting unresolved
names inside request subprograms. Final committed reports show v1
`swallowedErrors` zero and v2 only the known single `compiled-bar` array-bound
event; compiled request-expression swallow counts are zero on both corpora.

The
pre-parity-output funnel had 159/220 scripts producing
some visible output, but T80 found that many compiled outputs disagreed with the
interpreter; those rows are no longer counted as successful because the compiled
path is the product path on web. The manual value-member emission audit covers
358 official manual-index `namespace.member` variables/constants after excluding
13 known unresolved provider fields. It prevents the `ta.tr` class from
recurring by routing any known builtin namespace member that misses an explicit
compiled branch through `ctx.callBuiltin(...)` instead of emitting a bare
nonexistent namespace object reference.
The first calibrated mismatch fix was interpreter-owned, not compiled-owned:
tuple-returning `request.security()` expressions now preserve tuple arity on
unaligned bars so valid Pine destructuring receives `[na, ...]` instead of a
scalar `na` on the interpreter/fallback/mobile path.
The second calibrated mismatch fix was compiled-owned: history access on the
built-in `bar_index` series now emits `ctx.barIndex - offset` instead of
falling through to generic indexing on a scalar. That moved v1 execute/output
97/85 to 99/87 and v2 74/60 to 76/62, with drawing mismatches dropping by two
in each corpus.
The latest T85 cluster fixed legacy bare UDF precedence and return semantics:
compiled analysis/emission and the interpreter now resolve script-local helpers
before global compatibility aliases such as `dema`/`median`, and old Pine
same-name UDF accumulator returns keep function-local history isolated per call
site. It moved v1 execute/output 111/99 to 115/103 and v2 77/63 to 79/65.
The first T88 parity-wall cluster fixed a compiled-owned emitter bug for global
`array.*` calls with named arguments: calls such as
`array.push(id=store, value=item)` previously emitted zero-argument helper
calls, so scripts that stored drawing or snapshot state in arrays could compile
successfully while drawing nothing. The fix orders named arguments by the Pine
signature for the full array namespace. It left v1 flat and moved v2
execute/output 79/65 to 80/66.
The second T88 cluster fixed an interpreter-owned duplicate-input identity bug:
runtime input IDs were derived from display title alone, so repeated titles such
as three legacy `input(..., title="Periods")` declarations collapsed into one
effective input value. Pine treats each input declaration as distinct; TealScript
now preserves normal `input_Title` override IDs for unique titles and adds a
call-site suffix only for duplicates, mirrored in the compiled analyzer so input
definitions stay comparable. It moved v1 execute/output 115/103 to 121/109 and
v2 80/66 to 88/74.
The third T88 cluster fixed a compiled-owned block-local `var` initialization
bug: `var table`/`var label` declarations inside delayed blocks such as
`if barstate.islast` were guarded as bar-zero root declarations, so compiled
execution never created drawings whose first execution happened after the first
bar. The emitter now uses persistent init flags for `var`/`varip` declarations.
It left v1 execute/output flat at 121/109 while converting one drawing mismatch
into a later plot-structure mismatch, and moved v2 88/74 to 89/75.
The fourth T88 cluster fixed a compiled-owned `ta.cum(na)` edge: the compiled
state class returned the previous cumulative sum on an `na` source bar, making
`na` indistinguishable from zero in OBV-style expressions, while Pine semantics
return `na` for that bar without advancing the accumulator. Focused TA parity
now pins that edge. The v1/v2 funnel stayed flat, but the v2 OBV row advanced
past its first-bar mismatch to the next real output-parity difference.
The fifth T88 cluster fixed compiled `!=` semantics for `na`: the generated
runtime helper returned true whenever either side was `na`, while Pine
comparisons involving `na` are false unless the script explicitly uses
`na()`/`nz()`. That made ternary branches such as `stdev(x, n) != 0 ? ... : 0`
choose the wrong side on early bars and produced plausible empty/shifted plots.
It moved v1 execute/output 121/109 to 138/126 and v2 89/75 to 91/77.

Corpus v2 is the holdout measurement and remains separate from v1. It lives at
`/tmp/pine-corpus-v2`, contains no repository overlap with v1, and was run once
before making any TealScript fixes in response. The committed metadata report is
`packages/tealscript/reports/external-pine-corpus-v2.report.json`; refetch it
with `yarn workspace @tealstreet/tealscript pine:external-corpus:refetch
--report packages/tealscript/reports/external-pine-corpus-v2.report.json
--output /tmp/pine-corpus-v2`. Corpus v2 contains 151 public scripts from 20
repos: 98 `indicator`, 46 `study`, and seven `strategy`; version mix is v3 40,
v4 5, v5 9, v6 96, and one unknown. Its current raw funnel is parse 139/151
(92.05%), semantic/typecheck 113/151 (74.83%), compile 113/151 (74.83%),
execute 100/151 (66.23%), visible output 86/151 (56.95%). One row is classified as non-Pine
corpus hygiene and eight as invalid Pine, leaving a current ceiling denominator
of 142; against that ceiling, visible output is 86/142 (60.56%) and
semantic/typecheck is 113/142 (79.58%). Validity splits as 88 supported, 39
TealScript gaps, 15 host-dependency gaps, eight invalid Pine rows, and one
corpus-hygiene row; no v2 row remains undecided for the achievable-ceiling
calculation. The v2 invalid-Pine parse rows are limited to specific rules:
non-Pine triple-quoted strings, a colonless conditional expression, a non-ASCII
identifier, and malformed local-block indentation. Remaining parse failures are
TealScript parser gaps by default because they are not proven invalid Pine or
corpus hygiene. Output-silence rows that remain conditional or data-gated after
the 2,880-bar probe are also counted as TealScript gaps until proven correct
silence. Output parity splits as 100 matched, ten mismatched, and 41 not-run;
mismatch kinds are six drawing, two alert, one plot-value, and one runtime-error.
Its swallowed-error instrumentation currently shows one script and one
`compiled-bar` error from an empty-array access in
`sources/0023-Erald12-PinescriptIndicator-order_block.txt`; request-expression
swallows are zero after the request dependency capture/replay fixes. The first
holdout-driven semantic fix was v2-specific: `timestamp(TZ, y, m, d, ...)` and
`time(timeframe.period, session, TZ)` now resolve `TZ` as a timezone when it is
a string variable, matching the runtime's existing argument binding. It moved
v2 semantic/typecheck from 89/151 to 104/151 while v1 stayed 188/220. The
second holdout semantic fix made unary numeric literals keep their numeric kind,
so local sentinels such as `latest = -1` can widen correctly when reassigned
from loop indices; it moved v2 semantic/typecheck to 109/151 while v1 moved
from 188/220 to 187/220 because a v5 script that passed an integer to
`alertcondition()` is now correctly classified as invalid Pine. The third
accepted `text.align_center` as a vertical table/box text alignment value,
moving v1 semantic/typecheck from 187/220 to 190/220 and v2 from 109/151 to
110/151 while exposing additional output-parity mismatches rather than terminal
success; these rows are now counted against T85's output-parity surface rather
than hidden as checker failures. The fourth accepted `str.tointeger` as a
compatibility alias used by public v6 scripts but absent from the official v6
manual index; it is intentionally excluded from the official denominator while
moving v2 semantic/typecheck to 112/151, execute to 74/151, and visible output
to 60/151 with no v1 movement. The first T87 parse fix kept the small-indent
normalizer from promoting two-space call/declaration continuations into block
indentation; it moved v2 parse from 134/151 to 139/151 and semantic/typecheck
from 112/151 to 113/151, with v1 unchanged and the new executable row landing
at the output-parity wall. Every corpus delta must continue to be reported as a
v1/v2 pair. The
close terminal output rate to v1 is not evidence that the v1 checker fixes
generalized: v2 is 10.8 points lower at parse and still 13.5 points lower at
semantic/typecheck,
then loses fewer rows at execute because fewer scripts reach execution. The
honest reading is that v1 is the tuned measurement set, while v2 is the
holdout that exposed a v6-heavy semantic cliff and host-dependency surface.

The measurement refuted the pre-run prediction on parse coverage: predicted
parse was 55%, but actual parse is 99.55% raw and 100% against the
invalid-excluded ceiling. Qualifier inference, version-conditional legacy
signatures/strictness, and public-corpus parse syntax handling moved
semantic/typecheck from 90/220 to the current 190/220. T81 resolved the 17 original parse
failures individually: supported Pine syntax gaps covered comma-wrapped tuple
declaration chains, mixed declaration/reassignment/expression chains, comments
inside continuation initializers, two-space UDF indentation, blank lines before
switch cases, `indicator` as a local variable name, and whitespace before `[]`
array type brackets. The only remaining parse failure is classified invalid
Pine because the scraped source contains a raw line break inside a string
literal before the closing quote. Remaining raw v1 failures are
compiled/interpreter output mismatches (49), no visible output (12), type
mismatch (11), duplicate arguments (10; classified invalid), duplicate symbols
(3; invalid), unresolved imports (2; host-dependency gaps), one
unknown `indicator()` argument, one method receiver gap, and one unknown
identifier exposed by newly parsed source. The no-output cohort is traced
in the report as 4 correct-silence rows and 8 undecided rows. Correct-silence
means the source has no visible output intent, only strategy ledger activity, or
visible output only under the extended 2,880-bar probe. Undecided means the
source has conditional/local or data-gated visible-output calls that did not
fire under either synthetic series; those analysis rows remain counted as
TealScript gaps in row validity unless a stronger external oracle proves correct
silence.

T90/T91/T92 investigated whether TealScript can converge on codegen as the single
evaluation path while keeping native mobile self-contained. The committed data
is `reports/mobile-codegen-investigation-t90.json`,
`reports/mobile-codegen-investigation-t91.json`, and
`reports/mobile-codegen-investigation-t92.json`.

- No-eval closure prototype: T90's first prototype pre-bound top-level
  statements but delegated expression evaluation to the interpreter, so its
  interpreter-speed result was structurally invalid for deciding the backend
  question. T91 corrected the experiment by binding expression nodes too:
  parent closures capture child closures directly, and the per-bar path does
  not patch `evaluateExpression`, traverse AST nodes, or look up closures by AST
  node. On the same 24-script target sample, the prototype honestly handled
  14 scripts and rejected 10 because it still lacks UDFs, loops, switch,
  tuple assignment, UDTs, method dispatch, requests, drawing constructors, and
  strategy order semantics. On the handled scripts, current compiled execution
  measured 21.7 us/bar steady state, the interpreter 34.8 us/bar, and the
  bound-expression closure prototype 25.5 us/bar. Cold startup was 24.8 us/bar
  compiled, 35.4 interpreter, and 25.6 closures. T91 was directionally
  optimistic because the rejected scripts were not random: they were rejected
  specifically for harder constructs. T92 then bound script-local UDF calls and
  numeric/collection/while loops into the same direct closure tree, still with
  no per-bar AST traversal or `evaluateExpression` fallback for covered nodes.
  That raised the handled sample to 22/24 scripts, or 3,520 identical bars per
  backend. On that harder sample, current compiled execution measured 28.0
  us/bar steady state, the interpreter 41.8 us/bar, and the closure prototype
  29.9 us/bar; cold startup was 31.4 compiled, 40.4 interpreter, and 29.8
  closures. This refuted the T91 bias assumption: adding the hard common
  constructs made closures relatively closer to compiled, not farther. The
  prototype still rejects imports, method dispatch, UDT/collection mutation,
  request subprograms, drawings, strategy orders, switch, and tuple assignment,
  so the direction of the remaining bias is unknown rather than assumed
  optimistic.
- String-dependent emitter surface: the current backend depends on emitted JS
  source for native arithmetic/comparison/short-circuit expressions, JS
  `if`/ternary/`for`/`while`/`break`/`continue`, generated UDF methods with
  direct positional arguments and callsite state, generated class fields for
  persistent series/history/drawings/strategy state, direct TA class members,
  and direct helper calls for arrays/maps/matrices/UDTs/request/plots/alerts.
  These are performance-bearing source-emitter semantics, not just the final
  `new Function` wrapper.
- Hermes correction: React Native documents Hermes as the default engine and
  release builds as Hermes-bytecode builds. The local React Native 0.87
  `hermesc` bundled in this repo accepts `new Function` under default compiler
  settings and emits bytecode constructing the global `Function` object; direct
  `eval` compiles with a lexical-scope warning. Hermes source still documents a
  runtime `enableEval` flag applying to `eval` and the Function constructor.
  This repo has no consuming native app runtime or Hermes shell execution path,
  so the decisive question is not settled here. The old statement that stock
  Hermes permanently blocks the current compiled backend was too strong; the
  correct statement is that mobile compiled execution is unproven and must not
  be claimed until a native-host smoke runs TealScript's generated Function path
  and measures it.
- QuickJS alternative: the repo already has
  `@tootallnate/quickjs-emscripten@0.23.0`; the installed package is about
  1.8M and its npm unpacked size is 1,732,565 bytes. Registry probes measured
  `react-native-quickjs` at 2,612,537 unpacked bytes and `quickjs-emscripten`
  at 2,448,401. A Node/WASM QuickJS probe compiled 24 generated-script factory
  sources totaling 487,809 bytes in 22.04 ms, or 0.92 ms/script, and a primitive
  `step(...)` boundary probe took about 1.0 us/call over 3,840 calls. These
  numbers make QuickJS plausible, but they are not React Native JSI/device
  numbers and do not prove binary size, startup, ownership, or full TealScript
  execution cost.
- Costed recommendation at T92: do not delete the interpreter yet, but the
  preferred long-term direction is now "one compiler analysis, two codegen
  backends" if mobile must avoid dynamic Function. The cheapest immediate proof
  remains a native Hermes smoke/benchmark running the current generated Function
  path on simulator/device. If it executes and lands near the web compiled path,
  wiring it into `MobileIndicatorManager` without a Worker is a 5-8
  engineering-day task using the existing request/library seams and visible
  realtime fallback diagnostics. If generated Function fails or is not
  acceptable, the T92 result says a no-eval closure backend is plausible rather
  than dead; completing it across imports, method dispatch, UDT/collection
  mutation, requests, drawings, strategy, and realtime state was estimated at
  roughly 18-30 engineering days before the production closure backend work
  started. A QuickJS route remains roughly 10-18 engineering days plus native
  integration and release-size validation. The largest estimate risk is no
  longer whether expression closures, UDF calls, or loops can be fast; it is
  whether the remaining dynamic constructs can preserve full Pine semantics and
  realtime state without reintroducing interpreter-style dispatch.
- Production closure backend baseline: T96 promoted the no-eval closure tree
  from benchmark prototype into `src/runtime/closure/execute.ts` as a real
  third selectable execution mode. The backend is intentionally partial and
  fails unsupported constructs loudly at closure compile time; it does not
  silently fall back. The external corpus runner schema now records closure
  compile/execute/output coverage and three-way output agreement against the
  current compiled and interpreter paths. T96's initial closure baseline was
  v1 compile 83/220, execute 81/220, output 75/220; v2 compile 57/151,
  execute 55/151, output 55/151. T97's first coverage cluster added
  request-family call support through the existing request-datafeed evaluator
  bridge, moving closure coverage to v1 compile 102/220, execute 99/220,
  output 90/220 and v2 compile 65/151, execute 63/151, output 62/151.
  Three-way agreement is still low: v1 has 37 all-three matches, three
  closure/interpreter-only matches, one closure/compiled-only match, 50
  compiled/interpreter-only rows, 11 true three-way mismatches, 88 closure
  unsupported rows, and 30 closure-not-run rows; v2 has nine all-three
  matches, one closure/interpreter-only match, 50 compiled/interpreter-only
  rows, five true three-way mismatches, 45 closure unsupported rows, and 41
  closure-not-run rows. Request support currently delegates request-expression
  evaluation to the existing engine request evaluators, so it is measured
  closure-backend coverage but still a migration bridge; before interpreter
  deletion, request expression execution must be bound into closure subprograms
  rather than routed through AST-evaluating engine helpers. Ranked unsupported
  causes are committed in the reports. The next T97 cluster bound official
  runtime metadata members (`syminfo.*`, `timeframe.*`, `chart.*`,
  `barstate.*`) through the same engine helpers used by the interpreter, plus
  legacy bare `ticker`/`tickerid`/`n` and full `input.*` type constants. That
  moved closure coverage to v1 compile 124/220, execute 119/220, output
  108/220 and v2 compile 74/151, execute 72/151, output 70/151. The largest
  blockers after that were the legacy scanner helper call
  `syminfo.ticker(symbol)` on v1, switch expressions on v2, strategy
  constants/orders, and UDT/method/object mutation shapes. The next T97 cluster
  bound keyed, condition-only, and block-arm switch expressions without
  per-bar AST traversal. It moved v1 closure coverage to compile 132/220,
  execute 126/220, output 114/220; v2 stayed at compile 74/151, execute
  72/151, output 70/151 because the remaining v2 switch rows are tangled with
  UDT/method/enum shapes. The next T97 cluster bound local UDT declarations,
  `.new(...)` constructors, field defaults, first-level field reads, and local
  enum member constants. It moved closure coverage to v1 compile 149/220,
  execute 137/220, output 124/220 and v2 compile 86/151, execute 81/151,
  output 78/151. Against the current compiled-output counts, closure is now
  124/129 on v1 (96.1%) and 78/80 on v2 (97.5%). Constructor and enum support
  is real closure binding; UDT field assignment, nested mutation-heavy object
  graphs, and non-identifier history/indexing remain
  explicit unsupported causes rather than silent fallbacks. The next small T97
  cluster bound legacy bare ticker helper aliases (`tickerid`, `heikinashi`,
  `renko`, `linebreak`, `kagi`, `pointfigure`) to the same `ticker.*` builtins
  the interpreter/checker already use, after script-local function lookup so
  aliases cannot shadow user code. It moved v1 closure compile coverage
  149/220 to 153/220 and unsupported rows 41 to 37, but execute/output stayed
  137/220 and 124/220; v2 did not move. The closure-vs-compiled output ratio
  remained 124/129 on v1 (96.1%) and 78/80 on v2 (97.5%). The next T97
  cluster bound user-defined methods and receiver builtin methods for arrays,
  maps, and matrices, with user methods taking precedence. It moved closure
  coverage to v1 compile 179/220, execute 162/220, output 149/220 and v2
  compile 90/151, execute 83/151, output 78/151. Against current
  compiled-output counts, closure is now 149/129 on v1 (115.5%) and 78/80 on
  v2 (97.5%); this count ratio is only a progress signal, not the cutover gate,
  because per-script domination is required before closure can replace the
  compiled path. The next T97 cluster bound UDT field assignment, local-array
  index assignment, and array-index reads for non-identifier receiver
  expressions. It moved closure coverage to v1 compile 184/220, execute
  163/220, output 150/220 and v2 compile 105/151, execute 89/151, output
  83/151. Against current compiled-output counts, closure is now 150/129 on v1
  (116.3%) and 83/80 on v2 (103.8%) by count; this still does not satisfy the
  cutover gate because the gate is per-script domination and output equality.
  The next T97 cluster bound `if` used as a value in declarations and
  assignments. It moved v1 closure coverage to compile 190/220, execute
  165/220, output 152/220 and eliminated v1 closure unsupported rows. v2 stayed
  at compile 105/151, execute 89/151, output 83/151 because its former
  if-initializer rows now expose narrower dynamic callee/local UDF resolution
  blockers. Against current compiled-output counts, closure was then 152/129 on
  v1 (117.8%) and 83/80 on v2 (103.8%) by count; this still did not satisfy
  the cutover gate because the gate is per-script domination and output
  equality. T100's first plot-values cluster found a shared source-wrapper bug:
  closure preserved TA/input source arguments with a private
  `__tealscriptSource` marker while the shared engine helpers only recognize
  `__tealscriptKnownSource`. Source-aware TA helpers such as `ta.ema(close, n)`
  saw an object instead of a series-backed value and returned `na` from bar
  zero. Reusing the engine-known marker moved closure output to v1 156/220 and
  v2 83/151, and reduced closure cutover exceptions from v1 94/v2 64 to v1
  63/v2 36. The next T100 plot-values cluster found an independent first-bar
  accumulator cause: closure normalized missing history to `na` for array
  element reads but returned raw `undefined` for missing identifier history.
  Legacy UDF accumulators such as `acc := nz(acc[1]) + source` then stayed `na`
  on bar zero while interpreter/compiled seeded from zero. Normalizing closure
  identifier history misses to Pine `na` moved closure output to v1 158/220 and
  v2 83/151, and reduced closure cutover exceptions from v1 63/v2 36 to v1
  54/v2 21. The next T100 plot-values cluster found a closure run-loop
  contract bug: closure treated any top-level statement result of `true` as a
  historical execution halt, so normal plotting statements such as a true
  `plotshape(...)` could stop the remaining bars and shorten plot series. The
  interpreter only halts historical execution for `runtime.error`, so closure
  now ignores ordinary statement values when deciding whether to continue. This
  reduced closure cutover exceptions from v1 54/v2 21 to v1 38/v2 19 and
  cleared v2's remaining plot-values exceptions. The following T100
  plot-values cluster found the same source-identity class through legacy
  generic `input(close, ...)`: closure preserved `input.source(...)` defaults
  but did not preserve the first positional `defval` for generic `input()`, so
  downstream TA helpers read a constant default value instead of the backing
  source series. Preserving the generic input `defval` source cleared v1's
  remaining plot-value cutover exceptions and reduced dominated exceptions from
  v1 38/v2 19 to v1 31/v2 19. The first T100 drawings cluster found a
  closure-owned persistent lifecycle gap: interpreter and string codegen mark
  drawings created while initializing `var`/`varip` declarations as persistent,
  but closure declared the handle without marking the drawings created during
  the initializer. This made table/label payloads differ even when their
  visible content matched. Marking persistent declaration drawings reduced
  dominated exceptions from v1 31/v2 19 to v1 22/v2 15. The next T100 drawing
  cluster found closure's built-in series history gap: `bar_index[1]` in
  label/line coordinates could not read from scope or a known series, so
  closure passed `na` where interpreter/string codegen passed the previous bar
  index. Treating `bar_index` and legacy `n` as deterministic known series
  reduced dominated exceptions from v1 22/v2 15 to v1 20/v2 12. The next T100
  drawing cluster found repeated constructor handle aliasing: closure drawing
  IDs used only source location plus `bar_index`, so a loop executing the same
  `label.new`/`line.new` call site multiple times on one bar created duplicate
  handles and later mutators targeted the wrong object. Adding a per-bar
  invocation suffix for drawing ID-producing builtins reduced dominated
  exceptions from v1 20/v2 12 to v1 19/v2 11. Do not choose closure coverage
  work from the manual or from intuition; rank it from the reports.
- The first T100 runtime-error cluster found two closure compatibility gaps
  that the existing interpreter and string-codegen paths already handled:
  legacy bare visual constants (`cross`, `dotted`, `dashed`, etc.) and
  strategy namespace members. Closure now resolves those bare constants through
  the same value set, evaluates `strategy.*` constants/readouts through the
  shared strategy ledger helpers, and applies strategy declaration settings on
  bar zero. This moved closure coverage to v1 execute/output 174/163 and v2
  92/85, reducing dominated exceptions from v1 19/v2 11 to v1 17/v2 10.
- The next T100 drawings cluster found closure drawing constructor IDs still
  differed from interpreter/string-codegen on repeated real scripts. The earlier
  closure-local per-call-site invocation suffix prevented handle aliasing, but
  it did not match the shared runtime rule: drawing constructors use the
  engine's per-builtin per-bar `nextBuiltinCallId()` sequence. Switching closure
  to that sequence preserved repeated-call-site uniqueness and reduced dominated
  exceptions from v1 17/v2 10 to v1 17/v2 8; the movement was v2-heavy because
  the cleared rows were pure drawing-ID/order differences in holdout scripts.
- The next T100 plot-structure cluster found the same call-id rule applied to
  visual fallback titles, not just drawings: `barcolor`, `plotbar`, and
  `plotcandle` derive their default titles from the runtime call id.
  Closure was passing a source-location id, so values matched while plot
  identity/order diverged. Routing those builtins through the shared sequential
  call-id path eliminated the remaining plot-structure cutover exceptions and
  moved the gate to v1 118/129 matched (91.47%) and v2 73/80 matched (91.25%).
- The next T100 drawings/runtime cluster found closure missing the runtime time
  identifiers already supported by interpreter and string codegen. Public
  drawing scripts use `timenow` and related runtime time series for right-edge
  coordinates; closure treated them as unknown identifiers and continued with
  per-bar errors, so drawings were absent or stale while the other paths drew.
  Binding `timenow`, `time_close`, `time_tradingday`, `last_bar_time`, `bid`,
  and `ask`, including historical offsets, moved the gate to v1 119/129 matched
  (92.25%) and v2 76/80 matched (95.00%).
- The next T100 runtime/alerts cluster found closure was still treating
  non-identifier history expressions such as `ta.lowest(_p)[1]` as unsupported
  runtime errors. Pine treats those as history reads on the expression's
  per-call-site series, and interpreter/string codegen already did. Binding
  expression history as a call-site series cleared the cross-corpus v2 alerts
  rows plus the remaining v2 runtime row and moved the gate to v1 121/129
  matched (93.80%) and v2 79/80 matched (98.75%).
- The next T100 runtime/alerts cluster found closure missing the bare legacy
  input type constants that the checker and interpreter already accept for
  v3/v4 scripts, such as `input("30", type=resolution)`. Binding `resolution`,
  `timeframe`, `session`, and `symbol` through the same legacy type aliases
  cleared the remaining v1 runtime/alert exceptions and moved the gate to v1
  125/129 matched (96.90%) and v2 79/80 matched (98.75%).
- The next T100 plot-values cluster found closure's input-title detection did
  not match interpreter/string codegen for untitled `input(...)` calls. Absence
  of a title is still a stable call-site identity; treating it as dynamic made
  repeated untitled legacy inputs share the same `input_<type>` value, flattening
  MACD EMAs and changing PSAR parameters. Sharing the same static-title rule
  cleared the remaining plot-value gate rows and moved the gate to v1 127/129
  matched (98.45%) and v2 80/80 matched (100%).
- The final T100 drawings cluster found closure did not apply declaration
  drawing limits such as `max_labels_count` on the first bar. Public scanner
  scripts that request `max_labels_count=500` created one label per bar, but
  closure pruned to the default 50 while interpreter/string codegen retained
  all 160 synthetic bars. Applying the declaration limits before drawings are
  created closed the dominated cutover gate: v1 129/129 matched (100%) and v2
  80/80 matched (100%).
- Closure cutover gate: T99 defines the migration gate as per-script
  domination, not aggregate output count. For every corpus row where the
  current compiled path reaches parity-enforced visible output
  (`outcome === produced-output-compiled`), closure must also render visible
  output and agree with compiled under the calibrated plots/drawings/alerts/logs
  comparator. Closure-only rows are split into corroborated gains when the
  interpreter also renders and agrees, and uncorroborated closure output when
  neither existing validated path agrees. Current generated data lives in
  `reports/closure-cutover-gate.report.json`, regenerated deliberately with
  `yarn workspace @tealstreet/tealscript pine:closure:cutover`; the standing
  test recomputes the report from the committed v1/v2 reports and fails on
  drift. After the uncorroborated-row pass fixed scalar legacy `input()`
  defaults from unary numeric expressions, callable `syminfo.prefix/ticker(symbol)`,
  drawing object method dispatch, closure statement error locations, compiled
  untitled `plot()` fallback titles, interpreter input-call identity when
  cached persistent declarations are skipped, and interpreter handling of
  explicit qualified namespace calls shadowed by same-named UDF parameters, the
  current cutover gate status is v1 dominated 139 with zero exceptions
  (139/139 matched, 100%), 33 corroborated gains, and zero uncorroborated
  closure outputs; v2 dominated 86 with zero exceptions (86/86 matched, 100%),
  seven corroborated gains, and zero uncorroborated closure outputs.
  `syminfo.prefix/ticker(symbol)` are callable helpers as well as
  metadata-style names; the helper strips ticker modifiers and exchange prefixes
  for `ticker` while preserving direct member reads. Drawing object method syntax
  resolves by the receiver handle's namespace after user/imported methods, so
  `lineId.delete()` reaches `line.delete(lineId)` without shadowing script
  methods. Untitled compiled `plot()` fallback titles use the per-`plot()` call
  order rather than the global visual-site index, so interleaved `plotshape()` or
  `barcolor()` calls do not rename later plots. Legacy/interpreter `input()`
  and explicit namespace-call fixes keep closure-only corpus output from being
  counted as a win unless an independent path agrees.
  Beyond the corpus gate, cutover still requires running the TealScript and
  Tealchart suites with closure as the selected backend, the grammar
  differential under closure, a performance measurement on the production
  closure backend rather than the prototype, and an on-device mobile smoke.
  T105 proved the realtime sweep with closure explicitly selected, and T108
  made backend choice a shared runtime selector consumed by the worker, web
  widget, CLI/sync helper, and `MobileIndicatorManager`. Web/worker/CLI keep
  the compiled default; mobile passes its current interpreter default so T108
  changes no user-visible path until an override or rollout flag selects
  closure. `ENABLE_TEALSCRIPT_CLOSURE_BACKEND` is only a rollout lever.
- T101/T108 mobile closure wiring: the Tealchart-side selector path is now
  present. `SkiaTealchart` accepts the same explicit backend override and
  closure-rollout flag as the web widget, passes them through
  `useNativeTealchartCoreRuntime`, and `MobileIndicatorManager._recomputePlots()`
  calls the shared `executeSelectedTealscriptBackend(...)` helper with its
  existing library/request seams. Cached mobile indicator results include the
  selected-backend key, so a flag or override flip recomputes once instead of
  serving plots from another backend. `ActiveIndicator.runtimeProfile` exposes
  the last selected/actual backend for diagnostics. Unsupported closure
  constructs still surface as explicit TealScript runtime errors during the
  migration phase; they must not silently fall back if the goal is proving one
  execution system.
- T101 React Native compatibility assessment: `src/runtime/closure/execute.ts`
  uses ordinary TypeScript imports, Maps/WeakMaps, classes, and direct closures;
  a source scan of the closure runtime found no `new Function`, `eval`, dynamic
  `import(...)`, `require(...)`, or Node built-in imports. Its direct imports
  are the existing TealScript runtime helpers (`engine`, `context`, arrays,
  maps, matrices, objects, scope), so Metro/Hermes compatibility should be
  governed by the same source-consumption path Tealchart already uses. Do not
  add an internal closure barrel: TealScript's package entry exports directly
  from `./runtime/closure/execute`, while `src/runtime/closure/` itself stays
  non-barrel for the TS7/source-consumption carveout. What this repo cannot
  prove is the consuming mobile app's Metro bundle and on-device Hermes runtime:
  a mobile engineer still needs to run a simulator/device smoke with
  `MobileIndicatorManager` selecting closure on scripts that cover plain plots,
  imports, request data, drawings, and same-bar bar updates. Until that smoke
  passes, the capability row should not say "mobile compiled execution
  supported"; after repo wiring and Tealchart native tests it should say
  "closure execution supported in Tealchart unit/native tests; on-device Hermes
  smoke pending." Full closure of the row requires that on-device smoke plus a
  device performance check, because T102's host performance measurement will
  not prove Hermes speed.
- Real-script realtime corpus replay: T112 adds
  `scripts/run-external-pine-corpus-realtime.ts` and the committed
  `reports/external-pine-corpus-realtime.report.json`. This is measurement
  only, not a fix. It now covers every script from each historical
  closure cutover dominated set, because those scripts already have all-three
  historical agreement; any new mismatch is therefore a realtime/re-entry
  finding rather than a pre-existing historical difference. The replay seeds 148
  historical bars, then runs twelve realtime appends, two same-time replacements
  on each appended realtime bar, and one confirming next bar through the
  interpreter, compiled, and closure backends. The comparator is the calibrated
  historical corpus comparator over plots, drawings, alerts, and logs, with a
  fixed runtime clock so `timenow`/date output does not produce harness noise.
  T113 first adjudicated the sampled 40-row-per-corpus mismatches. The
  `ATR_Projection` 73/25/13 drawing-count row was closure-owned: closure was
  missing the same reconstructed realtime phase hints compiled already
  received, and both generated backends only replayed the immediately
  previous/current realtime bars. Passing `confirmedRealtimeBarStartIndex`,
  `confirmedRealtimeBarIndex`, and `realtimeLastBar` through generated
  reconstruction makes them replay the original loaded last historical bar plus
  every confirmed realtime append as `barstate.islast`, matching the
  incremental interpreter for that Pine lifecycle. The next v2 drawing-drop
  group was interpreter-owned: drawings created on the right-hand side of
  assignment into an existing `var`/`varip` handle were treated as transient
  unless the constructor appeared directly in the declaration initializer.
  Confirmed historical and confirmed realtime assignments now mark those
  drawings persistent across all three backends; unconfirmed same-bar ticks
  remain rollback-only. The final sampled row was table-owned:
  `table.merge_cells()` is idempotent for an identical existing range, so
  repeated dashboard updates in `barstate.islast` do not create backend-specific
  runtime errors or suppress later alerts. After those fixes, the sampled T113
  replay matched v1 40/40 and v2 40/40 with 840/840 pair comparisons matched in
  each corpus.

  T114 widened the same measurement to the full dominated sets and deepened the
  replay. That larger denominator found new realtime divergence, so the 40-row
  sample was not representative: v1 matches 122/138 scripts with 14,222/15,318
  pair comparisons matched, and v2 matches 68/82 scripts with 8,418/9,102 pair
  comparisons matched. There are zero script-level failures. The mismatch split
  is v1: 740 plot-value, 188 alert, and 168 drawing pair mismatches; v2: 360
  alert, 296 plot-value, and 28 drawing pair mismatches. This is a cutover
  blocker until adjudicated; it is not a stale report to regenerate away.

- T115 reproducibility proof: both external corpora were refetched into fresh
  directories outside the repo (`/tmp/pine-corpus-v1-t115-fresh` and
  `/tmp/pine-corpus-v2-t115-fresh`) from the committed report rows. Refetch
  matched every byte-size claim: v1 220/220 scripts across 22 repos, v2 151/151
  scripts across 20 repos. Fresh historical reports reproduced the committed
  funnel summaries exactly: v1 parse/semantic/compile/execute/output
  219/190/190/150/139 with ceiling denominator 199; v2
  139/113/113/100/86 with ceiling denominator 142. A fresh cutover gate built
  from those reports reproduced v1 dominated 139 with zero exceptions and v2
  dominated 86 with zero exceptions. A fresh full/deep realtime report built
  from those reports reproduced T114 exactly: v1 122/138 matched with
  1,096 mismatched pair comparisons, and v2 68/82 matched with 684 mismatched
  pair comparisons. The same-sample closure profile, using the committed
  T103/T109 performance report to select the sample while reading source from
  the refetched directories, reproduced the plateau shape: 160 bars 1.42x,
  1,000 bars 1.35x, 5,000 bars 1.57x, 10,000 bars 1.67x, and 20,000 bars
  1.64x closure/compiled. Regenerating the performance report first changed
  the median-selected profile sample under local timing noise and produced a
  non-comparable 20,000-bar ratio; use the committed performance report when
  verifying the committed plateau sample, and use a regenerated performance
  report only when intentionally refreshing the measurement.
- T102/T103 real production-closure performance:
  `reports/production-closure-performance-t102.json` measures the current
  production `src/runtime/closure/execute.ts` backend against the interpreter
  and current generated-JS compiled backend across both external corpora. The
  benchmark uses the committed corpus rows, the same 160-bar synthetic window,
  and the same synthetic request datafeed as the corpus harness. It reports two
  cohorts: every semantic-passed script, and the compiled-visible dominated set
  that defines the web cutover cost. T103 added per-script closure/compiled
  ratios because aggregate us/bar means are outlier-weighted and answered the
  wrong question. The user-cost headline is the per-script median: v1 median
  closure/compiled is 1.52x (Q1 0.93, Q3 2.22, min 0.17, max 6.17) across 138
  dominated scripts, and v2 median is 1.50x (Q1 1.28, Q3 2.19, min 0.32, max
  7.36) across 82 scripts. Pooled, the median is 1.51x (Q1 1.12, Q3 2.22):
  41/220 scripts are faster under closure, 179/220 are slower, 67/220 are at
  least 2x slower, and 31/220 are at least 2x faster. The aggregate totals are
  still recorded but not the headline: v1 totals say closure/compiled 0.31x
  because a handful of scanner rows make compiled take several ms/bar, while v2
  totals say 1.49x. Closure wins are coherent: 27 of the 41 pooled faster rows
  are scanner/screener-style scripts (`TARAMA`, `Scanner`, `Screener`, etc.),
  so closure appears materially better on that pathological fanout class even
  though the typical script pays roughly 50% over compiled today. Limitations:
  the timing is Node on the shared development machine, not Hermes/device; it
  excludes Worker transport, Tealchart rendering, Metro bundling, and native
  startup; the steady pass is one warmed full-corpus run to keep the benchmark
  practical; and the current `executeClosure(...)` API re-binds the closure tree
  on execution, so a future cached-bound artifact could improve steady-state
  closure cost.
- T104/T107/T109 closure cost profile:
  `reports/production-closure-profile-t104.json` profiles the middle of the
  T103 distribution rather than the scanner outliers: the eight scripts nearest
  median closure/compiled ratio from each corpus. T106 then bound globals, UDF
  parameters/locals and block/loop locals to static closure slots while keeping
  the engine scope as the compatibility seam for builtins, request replay,
  history and diagnostics. T107 extended the bar-count curve to long charts and
  showed the curve plateauing rather than growing unbounded. T109 then pre-bound
  safe closure builtin call shapes and direct-routed the highest-volume
  positional helpers (`timestamp`, calendar parts, `color.new`, and
  `array.get`) without changing named-argument, source-preserving, or input
  metadata semantics. The current curve is 1.42x at 160 bars, 1.37x at 1,000,
  1.59x at 5,000, 1.62x at 10,000, and 1.65x at 20,000 on the same
  middle-ratio sample. Compared with the pre-T109 profile, the 20,000-bar
  plateau improved from about 1.76-1.78x to 1.65x. Construction remains
  amortized away on long charts: closure binding costs about 13.9 us/bar at
  160 bars but 0.11 us/bar by 20,000. Scope/lifecycle probe volume remains about
  8.6M calls at 1,000 bars after slot binding, so dynamic name lookup is no
  longer the dominant measured gap.

  T107 also added per-method series probes to answer whether the long-chart
  slope is history copying/scanning. It is not the measured mechanism today:
  at 5,000 bars generic `Series.snapshot()` touched about 2.18M values but cost
  only 6.84ms total (0.09 us/bar), and generic `Series.toArray()` was not
  called. Ordinary O(1) `Series.get/set/advance/commit` time was similarly
  small compared with the gap. The measured slope is longer-window workload
  activation: builtin calls rise from 156.39 to 212.92 per bar and
  scope/lifecycle calls from 535.82 to 686.15 per bar between the 1,000- and
  5,000-bar probes as scripts cross lookback, drawing and array thresholds.
  T109 answered the first builtin-dispatch question: much of the old bucket was
  missing binding, not inherent closure cost. At the 1,000-bar probe,
  builtin-inclusive time fell from about 78.7 us/bar over 2.50M calls to
  27.8 us/bar over 1.24M calls, and the generic "other" family fell from about
  55 us/bar to 7.9 us/bar after the time/date helpers left the shared registry
  path. The remaining top builtin costs are split across visual and drawing
  emission (`plotshape`, `plot`, `line.set_*`), input registration, and TA
  kernels rather than one name-dispatch mechanism. Those surfaces are
  user-visible identity/metadata or formula code, so they need targeted work and
  parity gates before any further optimization. The profiler uses inclusive
  monkey-patched probes and restores them inside the measurement block; those
  buckets identify rank/call volume, not additive wall-clock shares.
- T110 production observability for staged cutover: Tealchart now emits a
  compact `onTealscriptExecution` summary for every accepted worker execution
  result and runtime halt after stale worker responses are discarded. The
  summary carries actual `executionMode`, selected backend, selection source,
  elapsed time, bar count, request kind, output counts, runtime-error count, and
  a closed fallback family, so a closure rollout can be attributed by backend
  without inspecting script text. Apps/web wires that summary to the existing
  Sentry path using a static `TealScript execution telemetry` message:
  successful runs are sampled locally, while empty-output and runtime-error
  runs are capped per browser session. The Sentry payload deliberately excludes
  script id, source, line/column, symbols, import names, runtime messages, raw
  fallback reasons, arbitrary tags, and arbitrary extra; only low-cardinality
  backend/timing/output buckets leave the browser. Defaults did not change:
  closure remains a flag/override rollout, not the web default.
- T121/T122 realtime performance assessment: `reports/realtime-event-cost-profile-t121.json`
  measures mechanisms, not product routing. Its first finding is that a
  generated-backend realtime reconstruction costs about one historical replay,
  not tens of historical replays; the 64-minute widened oracle was dominated by
  a few expensive scripts. Its second finding is the cutover-sensitive one:
  generated-backend reconstruction is far more expensive than the interpreter's
  incremental `TealscriptEngine.updateBar(...)` replacement path, and the gap
  grows with chart length. On the measured subjects, compiled reconstruction was
  20.3x/50.2x/76.7x the incremental interpreter replace cost at
  160/1,000/5,000 bars; closure reconstruction was 81.3x/201.8x/358.1x.
  Tracing the product paths shows web ordinary realtime ticks already use
  reconstruction for generated backends: `ChartWidgetCore._emitRealtimeUpdate`
  calls `TealscriptManager.updateBar`, the worker `handleUpdateBar` mutates
  `state.bars`, then `executeAndSendResults` runs compiled or closure over the
  full bar window unless the compiled realtime-safety detector routes that
  script to the incremental interpreter fallback. This is not limited to
  same-time replacement; new realtime bars also reconstruct. Mobile is also
  full-window today despite its interpreter default: `ChartWidgetCore` falls
  back to `MobileIndicatorManager.setBars(...)` because the manager has no
  `updateBar(...)`, and `_recomputePlots` calls `executeSelectedTealscriptBackend`
  over `this._bars` with `defaultBackend: 'interpreter'`. Therefore closure
  does not introduce full-window recomputation into mobile, but enabling closure
  there would replace today's full-window interpreter execution with full-window
  closure execution, while the much cheaper incremental interpreter API remains
  unused by the mobile chart integration. A production closure rollout needs a
  separate realtime-performance condition: web compares closure reconstruction
  against the existing compiled reconstruction baseline; mobile needs either an
  explicit acceptance of full-window closure cost on device or an incremental
  closure/mobile update path before claiming live-chart suitability.
- T123 incremental realtime assessment: the cheap path exists only in the
  interpreter engine today. `TealscriptEngine.updateBar(...)` maintains one
  `ExecutionContext`, scope history, drawing/alert/log truncation, request
  caches, realtime rollback snapshots, and strategy intrabar state, then
  re-executes only the current realtime bar. Generated backends do not expose a
  corresponding persistent execution instance. The string backend's
  `executeCompiled(...)` creates a fresh `ExecutionContext` and loops
  `barIndex = 0; barIndex < bars.length; barIndex++` for every call, even when
  realtime phase hints are supplied. The closure backend likewise creates a
  fresh `TealscriptEngine`, re-binds the program, installs bound historical
  execution, then calls full `engine.execute(...)`; `installBoundExecution(...)`
  only overrides `executeHistoricalStatements`, so keeping that engine alive and
  calling `updateBar(...)` would run interpreter realtime statements rather than
  closure realtime statements. The realtime-safety detector is therefore not a
  proof that incremental execution is generally unsafe. It guards the opposite
  problem: generated reconstruction is known to be unsafe for varip,
  persistent mutable collections/UDTs, compound persistent mutations, and
  history composed with those intrabar state shapes, so compiled routes those
  scripts to the interpreter incremental fallback. For stateless or
  reconstruction-safe scripts, generated reconstruction is semantically valid
  but still pays full-window cost. Classification: not "incremental is unsafe
  for the general case" and not "safe incremental generated execution is already
  implemented but unwired"; it is "incremental is implemented for the
  interpreter only, while generated backends reconstruct because no persistent
  generated realtime VM exists." Product wiring reflects that: web uses worker
  reconstruction for generated backends by default and only uses incremental
  interpreter through the realtime-safety fallback; mobile has no
  `IIndicatorManager.updateBar(...)` implementation and recomputes full-window
  through `setBars(...)` on its current interpreter default. The largest
  realtime performance opportunity is a generated incremental path plus host
  wiring, but it is a product/architecture decision, not a safe one-line
  switch.
- T124 generated incremental cost assessment: this is a persistent-runtime
  project, not a wiring flip. The closure backend is the right target; the
  string emitter should be retired first unless Sam explicitly wants to fund a
  second generated realtime VM. A production closure incremental path needs a
  long-lived execution object that owns one `TealscriptEngine`/`ExecutionContext`
  plus a bound closure program, keeps initialized global/input/import/request
  state across ticks, and exposes explicit `advanceBar(...)` and
  `replaceLastBar(...)` operations instead of calling full `execute(...)`.
  The dangerous shortcut is already documented in `CLAUDE.md`: current
  `installBoundExecution(...)` only overrides historical statements, so calling
  `updateBar(...)` on that engine would silently run interpreter realtime
  statements under a closure-selected profile.

  Estimated cost: 8-15 engineering days for an indicator-grade closure
  incremental runtime and host wiring, assuming strategies remain on existing
  full-window/fallback paths during the first rollout. A full cutover-grade
  version that includes strategy intrabar order/profit semantics, request-local
  replay hardening, and broader corpus/realtime proof is more likely 15-25
  engineering days. Adding the same capability to the string emitter is a
  separate project rather than shared work: it would need its own persistent
  generated instance, per-tick entry points, rollback hooks, and state export
  discipline. The shared value would mostly be tests and `ExecutionContext`
  semantics, so doing this for compiled first is hard to justify if compiled is
  being retired.

  The buy is direct and large on live charts. Today generated web realtime
  re-executes the whole bar window on every tick. Using the current long-chart
  profile, a 5,000-bar indicator is roughly 435ms/tick on compiled
  reconstruction (87 us/bar * 5,000) and roughly 720ms/tick on closure
  reconstruction (144 us/bar * 5,000). T121 measured reconstruction against the
  interpreter's warmed incremental replacement path at 20.3x/50.2x/76.7x for
  compiled and 81.3x/201.8x/358.1x for closure at 160/1,000/5,000 bars. A
  generated incremental runtime would not automatically match interpreter
  `updateBar(...)` cost, but it changes the shape from O(history length) per
  tick to O(current bar plus touched realtime state), which is the difference
  between a bounded per-tick update and continuous full-window replay.

  Closure makes this easier than the string emitter because its execution units
  are already ordinary functions bound around shared runtime state. A persistent
  closure runner can keep the engine/context alive and call a bound realtime
  statement runner directly. The hard parts are: binding that realtime runner
  instead of only `executeHistoricalStatements`; aligning rollback/truncation
  for plots, drawings, alerts, logs, arrays, UDT-held handles, and table cells;
  preserving input IDs and invalidating on settings/library/provider changes;
  replaying or caching request expressions without keeping hidden AST-dispatch
  fallbacks; maintaining call-site identity for loops/UDFs/methods; and proving
  phase behavior for same-time replacement, confirmed-bar replay, and appended
  realtime bars. The likely estimate-buster is request/security local-scope
  replay combined with persistent UDT/collection drawing handles; strategy
  intrabar order recalculation is the next largest uncertainty if included in
  the first milestone.

  The realtime-safety detector remains needed during rollout, but its role
  changes. For compiled reconstruction it still protects known unsafe shapes.
  For closure incremental it should become a capability guard: if a script uses
  a construct the incremental closure runtime has not proven, route it to the
  existing safe path and report the reason. Once closure incremental proves
  varip, persistent mutable collections/UDTs, compound persistent mutations,
  and history composed with intrabar state under the widened realtime corpus
  and sweep, those reconstruction-specific fallback reasons should shrink or
  retire for closure. Until then, false positives are acceptable; a false
  negative silently corrupts live values.

### Working Rule

Do not claim compatibility from implementation alone. Every parity improvement
needs a failing-before test, compiled-vs-interpreter parity wherever compiled
support exists, the relevant package gate, an atomic commit, and a push.
