# CLAUDE.md — @tealstreet/tealscript

TealScript is a PineScript-like indicator scripting language that runs in Web Workers. It provides a PEG parser, compiled execution path, and series-based execution model for technical indicators in Tealchart.

## Architecture

Four-layer design: **Parser → Semantic/Runtime → Compiled Runtime → Worker**

### Parser (`src/parser/`)

- `grammar.peggy` — Hand-written PEG grammar for a PineScript v6 subset
- `parser.ts` — Wrapper with error handling (`parse()`, `validate()`, `formatParseError()`)
- `ast.ts` — Strongly-typed AST node definitions
- `generated.js` / `generated.d.ts` — Auto-generated Peggy parser output (git-tracked)

**Rebuilding the parser:**

```bash
yarn build:parser    # runs scripts/build-parser.js → regenerates generated.js + generated.d.ts
```

Always commit both `grammar.peggy` and the generated files together.
Public corpus syntax coverage goes beyond the local v6 snippet inventory: keep
parser tests for CRLF comma-wrapped statement chains, mixed declaration /
reassignment / expression chains, comments inside continuation initializers,
two-space UDF indentation, blank lines before switch cases, `indicator` as a
local variable name, spaced array type brackets such as `label []`, and
two-space continuation lines after enum/type declarations. Public corpus
sources also rely on triple-quoted multiline strings, Unicode identifier
characters, comma-chained declarations inside UDF bodies, and tuple declaration
patterns whose `=` starts on the following continuation line. The parser
wrapper's small-indent normalizer must skip obvious continuation lines,
including leading-comma argument/declaration continuations, so it does not
promote them into structural block indentation.

### Runtime (`src/runtime/`)

- `compiledOnly.ts` — Public compiled execution wrapper that fails loudly when codegen cannot run a script.
- `types.ts` — Shared execution result/profile/options types.
- `context.ts` — Execution state: OHLCV series, `barstate`, `syminfo`, `timeframe`, plots, inputs
- `series.ts` — `Series<T>` class: time-series values with history access
- `scope.ts` — Variable scoping with `var`/`varip`/regular semantics
- `codegen/` — Compiled execution path. Emits and runs a generated script class.
- Backend selection is centralized in `src/runtime/backendSelection.ts` and
  `executeSelectedTealscriptBackend(...)`. Hosts pass an explicit override first,
  then their safe default. Web/worker/CLI default to compiled. Mobile must fail
  loudly until the hidden-WebView compiled host lands. `RuntimeProfile` keeps
  `executionMode` as the actual path that ran and adds
  `selectedBackend`/`backendSelectionSource` so fallback and rollout state are
  visible without inferring from messages.
- `src/semantic/checker.ts` — Semantic diagnostics for pasted scripts. Unresolved imports, builtin binding errors, UDF qualifier mismatches, and typed assignment errors must retain line/column and symbol-specific messages.
- Source-aware values passed into shared engine builtins must use the
  engine-recognized `__tealscriptKnownSource` wrapper. TA/input helpers rely on
  that shared wrapper to recover the backing series for calls like
  `ta.ema(close, n)`.
  Generic legacy `input(close, ...)` preserves source identity through its
  first positional `defval` argument; treating it like an ordinary scalar input
  silently flattens downstream TA output.
- History reads in generated backends must normalize missing identifier or
  built-in series history to Pine `na` (`Number.NaN`), not JavaScript
  `undefined`. Public legacy accumulators rely on `nz(local[1])` seeding from
  zero on the first bar, and drawing constructors rely on `bar_index[1]`
  resolving to the previous bar coordinate instead of `na`.
- History offsets are Pine integer offsets. Truncate fractional offsets toward
  zero before reading history; negative offsets still return `na`.
- Non-identifier history expressions in generated backends, such as
  `ta.highest(high, 2)[1]` or `(close - open)[1]`, are per-call-site series.
  Treating them as unsupported runtime errors drops plots/alerts on public
  scripts.
- Generated backend bar runners must not treat ordinary statement return
  values as halt signals. Historical execution stops for `runtime.error`
  exceptions, not because a plotting or expression statement evaluated to
  boolean `true`.
- Generated backend assignment emission must route expression-valued RHSs
  through the normal assignment writer rather than assigning directly into an
  emitted read expression. History-read variables and UDT fields can compile to
  reads such as `series.get(0)` or field getters; those are values, not
  JavaScript lvalues.
- Generated JavaScript identifiers and state member suffixes must be escaped
  from Pine names at emission time. Pine permits names such as `delete` that
  are JavaScript syntax errors when emitted raw, and the same escaping must be
  used for locals, UDFs, loop counters, state slots, snapshots, and history
  members.
- Generated UDF local lookup is block-scoped for regular locals and
  function-scoped for `var`/`varip` state. Public libraries use a temporary
  `sum` during scale initialization and a persistent `sum` accumulator later in
  the same function; binding either name at the wrong scope corrupts history
  and output.
- Generated user-function overloads need distinct internal identities by
  callable argument shape. The semantic checker accepts `hl()` and `hl(bar)` as
  separate UDFs; codegen must not key both bodies under the bare display name or
  runtime calls select whichever overload was registered last.
- Compiled collection lowering must preserve Pine collection wrappers and Pine
  argument ordering. Array literals are Pine arrays, collection receiver
  methods use the same ordered arguments as namespace calls, and collection
  history reads must not be confused with array element indexing. Receiver
  methods reached dynamically, such as UDT-field arrays, still need Pine-to-JS
  helper-name aliases (`indexof` -> `indexOf`) before dispatch.
- Local method overloads keep distinct generated identities by receiver type
  and arity. Resolve user/imported methods before generic collection method
  fallback so script methods named like `copy` or `size` are not swallowed.
- Enum values keep stable runtime identities for equality; `.title()` on a
  variable-held enum value must look up that identity's display title instead
  of replacing the enum value with its title string.
- Compiled builtin argument binding must preserve Pine alias/default-source
  overloads. `source`/`series` aliases share one argument slot, but length-only
  overloads such as `ta.highestbars(4)` and `ta.pivothigh(2, 2)` must not treat
  their first numeric argument as a source series.
- Generated backends must mark drawings created while initializing `var` and
  `varip` declarations as persistent. Tables, labels, lines, boxes, polylines,
  and linefills created this way survive rollback/truncation; omitting the mark
  changes drawing payloads even when coordinates and cells match.
- Drawings created while assigning into an existing `var`/`varip` handle or a
  persistent UDT/array container are persistent in the current drawing payload.
  Realtime rollback must restore the drawing store to the pre-replaceable-bar
  snapshot, not merely truncate non-persistent drawings; otherwise confirmed
  assignment handles from a discarded same-time bar leak forward, or unconfirmed
  replay handles differ from a fresh execution. Keep this snapshot-backed rule
  in the shared generated runtime, not per call site.
- Realtime scope rollback must also be an exact non-`varip` restore. If a
  UDF-local `var` drawing handle is first initialized on the replaceable last
  bar, retaining that variable after the drawing store rolls back leaves a stale
  handle and silently drops the current tick's label/line/box mutations.
- Drawings whose handles are stored in persistent `array` values are persistent
  when execution writes them into the array through `array.push`, `array.set`,
  `array.unshift`, `array.insert`, `array.concat`, or indexed assignment.
  Public scripts commonly create a drawing in a local, then push the handle into
  a `var line[]`/`label[]`; dropping the drawing while keeping the handle makes
  realtime replay silently lose output.
- Persistent UDT values are persistence containers too. If a `var`/`varip` UDT
  contains arrays or direct fields of drawing handles, every backend must mark
  the nested value as persistent when the UDT is initialized or reassigned, and
  must mark confirmed drawing handles written through UDT fields. Public key-level
  engines commonly keep `line[]`/`label[]` handles inside a persistent UDT; only
  preserving direct `var array` values drops those drawings on realtime replay.
- The reverse nesting is equally significant: persistent arrays can hold UDT
  objects whose fields are drawing handles. Recursive persistence marking must
  walk array elements as well as UDT fields, or fixed drawing pools like
  `array<LevelSlot>` survive as handles while their rendered line/label objects
  are rolled back.
- Realtime drawing rollback must truncate by each drawing's creation
  `barIndex`, not by insertion order. Pine scripts can create a drawing with a
  historical x coordinate after newer realtime/session drawings; assuming the
  store is sorted by `barIndex` drops valid historical drawings.
- Direct `alert()` outputs are realtime state too. When rollback/truncation
  removes a replacement tick's event, restore the output-level
  `message`/`frequency` from the latest retained event, and remove direct alert
  outputs with no retained events. Keeping metadata from a discarded tick makes
  realtime output diverge while showing the same event count.
- Realtime parity harnesses compare a long-lived session after each same-time
  replacement against an independent fresh session loaded from the original
  confirmed window plus that one replacement tick. Do not compare replacement
  output to a plain historical execution of the replaced bars: request-backed
  series intentionally use the active unconfirmed requested bar in realtime,
  while historical execution uses the last confirmed requested bar. The fresh
  session must still go through the real worker/request-cache path when checking
  worker behaviour, so the guard catches stale state without rewriting request
  provider semantics.
- Generated backends must apply declaration drawing limits such as
  `max_labels_count` before the first bar creates drawings. Otherwise public
  scanner scripts that request larger limits silently prune to the default
  retained drawing count.
- Drawing ID-producing builtins need per-bar invocation identity when a single
  call site executes more than once on the same bar. Reusing only source
  location plus `bar_index` aliases handles and makes later mutators update the
  wrong object.
- Visual builtins whose fallback titles are derived from the runtime call id
  (`barcolor`, `plotbar`, `plotcandle`) must also receive the shared sequential
  builtin id. A source-location id changes plot identity even when values match.
- Untitled compiled `plot()` output uses the per-`plot()` call index, not the
  global visual-site index. Interleaved `plotshape()`/`fill()`/`barcolor()`
  calls must not rename later plots from `Plot 2` to `Plot 4`.
- User-facing visual strings are labels, not identity. Plot, hline, fill,
  bgcolor/barcolor, marker, candle/bar, and `alertcondition` outputs must not
  collapse because two calls share a title. Preserve the legacy title-derived
  plot id for the first occurrence because Tealchart style overrides can persist
  by `plotId`; use call-site identity for later collisions. Drawings and tables
  already use generated handles/call ids, so their text, position, and table
  content must stay payload only.
- External-corpus "visible output" counts ignore structurally hidden plot
  outputs (`display.none`) and invisible fills with no color/value, but sparse
  global plot declarations still count. A `plotshape(false)` or sparse
  `plotcandle(...)` defines a user-visible output control even when every
  sampled value is `na`.
- External-corpus execute failures are not automatically TealScript gaps. Pine
  runtime refusals such as the default 40 unique `request.*()` context limit,
  script-authored `runtime.error()` guards, and proven out-of-range array reads
  are corpus-valid rows when TradingView would also stop execution.
- Missing Pine declaration precision is represented as `undefined`. Do not replace it with a backend
  default such as `4`; Tealchart decides display precision at label render time
  from the pane and instrument tick precision.
- `table.merge_cells()` is idempotent for an already-merged identical range and
  still errors for distinct overlapping ranges. Dashboard scripts commonly call
  it inside repeated `barstate.islast` realtime updates on a persistent table;
  treating the identical re-merge as overlap drops later alerts or records
  backend-specific runtime errors.
- Bare legacy `color(...)` needs the same overload split as string codegen and
  Pine semantics: one or two arguments, or `color`/`transp` named arguments,
  are a transparency cast (`color.new`); RGB channel construction stays
  `color.rgb`. Do not canonicalize bare `color` to `color.rgb` before that
  split or `color(na)` becomes opaque black instead of transparent.
- Runtime sites that intentionally continue after an ordinary per-bar error
  must not hide it. Keep swallowed errors countable via
  `RuntimeProfile.swallowedErrors` with a stable site id, first bar index, and
  first message, and surface the same summary in external corpus rows. This
  applies to compiled top-level bar execution and compiled request-expression
  evaluation; loop-control catches are not error swallowing.
- Request-expression replay must be dependency-selected for both globals and
  request-local statements. Replaying every prior statement is correct-looking
  but unaffordable: one public scanner request sat after 100+ replayable
  declarations, turning a single request into hundreds of requested-context
  statement executions per provider bar. Keep replay scope precise and let the
  corpus/realtime gates prove the narrowing did not drop required dependencies.
  Scalar input declarations may be treated as requested-context invariant, but
  `input.source()` and legacy `input(..., type=input.source)` must not be:
  they return source-series values that remap to the requested symbol, and
  capturing the chart-context value makes request expressions use the chart's
  source instead of the requested series. Unknown or series-like dependencies
  stay replayed.
- `request.security_lower_tf()` accepts tick timeframes such as `1T` as lower
  than time-based chart periods. Tuple expressions return one intrabar
  `PineArray` per tuple item, including `bid`/`ask` source fields; returning an
  array of per-tick tuples makes destructuring assign mismatched arrays.
- Compiled imported-library support has two symbol surfaces: exported API for
  importing scripts, and private library-local helpers/types/methods for code
  executing inside that library. Keep those identities distinct. Request
  subprograms created from an imported function must retain the imported alias
  context so bare library-local helpers still resolve inside the requested bars,
  while external calls to private members fail loudly.
- TA calls that consume imported/UDF source expressions need a real source
  series at the call site. Do not sparse-call stateful TA helpers under
  conditionals or switch blocks; push the resolved source once per bar and have
  the TA read that series history.
- Generated UDFs must create local history series for function-local values
  later consumed as TA source inputs; TA source locals are series, not globals.
- VWAP argument binding must preserve missing/default `source` and named
  `anchor` slots. Do not filter missing args before positional/named binding.
- Highest/lowest window helpers do not clamp non-positive lengths to one.
  `ta.highest`, `ta.lowest`, `ta.highestbars`, and `ta.lowestbars` return `na`
  for zero or negative lengths after consuming the current bar.

**Execution flow:**

1. Parse script → AST
2. Run semantic checks and metadata extraction
3. Execute with compiled codegen, failing loudly when unsupported
4. Create `ExecutionContext` with bar data
5. Iterate bar-by-bar, evaluating statements
6. Collect plot, drawing, alert, log, and strategy outputs per bar
7. Support realtime rollback for intrabar updates

### Worker (`src/worker/`)

- `worker.ts` — Web Worker entry point
- `TealScriptWorker.ts` — Main-thread wrapper
- `protocol.ts` — Message types between main thread and worker

## Series Semantics

The core concept — every value is a series with history:

```
series[0]   // Current bar
series[1]   // Previous bar
series[n]   // n bars ago
```

**Variable persistence:**

- `var x = 0` — Initialized once, persists across bars
- `varip x = 0` — Persists even during intrabar updates
- `x = 0` — Re-evaluated every bar
- Regular scalar variables are series values when history-accessed, including
  booleans and strings. Generated backends must preserve value identity for
  script-variable history slots; using numeric series storage for `flag[1]`
  turns booleans into `1`/`0` and breaks strict Pine equality.
- Block-local `var`/`varip` declarations initialize the first time their
  statement executes, not necessarily on bar zero; compiled code must use an
  init flag for delayed blocks such as `if barstate.islast`.
- Untyped variables inferred from literal initializers can widen qualifiers on later reassignment or compound assignment; explicit `const`/`input`/`simple` annotations remain enforced.
- Unary numeric literals such as `-1` and `+1` are numeric literals for type inference, not `unknown`; sentinel locals initialized that way must still widen when reassigned from loop or series values.
- Explicit type annotations can initialize from `na`, including `bool flag = na`;
  the annotation supplies the missing type. Numeric widening is one-way:
  `int` can flow into `float`, but `float` does not implicitly flow into `int`.
- Bare user/imported function calls resolve before builtins and before legacy
  global compatibility aliases. Public v3/v4 scripts often define helpers named
  like later builtins (`median`, `sum`, `dema`); compiled analysis/emission
  must preserve the script-local binding.
- Bare legacy value aliases such as `ticker`, `tickerid`, `n`, and `tr` are
  fallback names, not reserved words. Script locals and inputs with the same
  name must win before those aliases resolve to runtime values.
- Only documented ticker constructors may lower through the ticker runtime
  helpers. Unknown `ticker.*` calls must fail loudly; do not route them through
  `ticker.new` as a default constructor.
- Qualified official namespace calls that explicitly pass the same-named value,
  such as `array.unshift(array, value)`, remain namespace calls even when a UDF
  parameter is named `array`; user/imported methods still get first chance
  before builtin method lowering.
- Legacy Pine functions can return by assigning or declaring a local with the
  same name as the function as their final statement, including accumulator
  locals with history such as `frama := ... nz(frama[1])`. Keep function-local
  history updates and compiled UDF call-site state isolated per call site.

**Strategy runtime:** The strategy ledger is a minimal deterministic position
model, not a full TradingView broker emulator. Market/limit/stop/exit/close
orders update position size, average price, net profit, open/closed trades, and
selected risk guards; `strategy.entry` uses Pine v6-style reversal sizing and a
`pyramiding` cap whose default is one same-direction entry. Exact TradingView
intrabar fills, bar magnifier fidelity, session halts, margin/liquidation, and
non-standard chart fill behavior remain out of scope.
`strategy.entry()` and `strategy.order()` OCA fields are structural, not display
metadata: the broker emulator uses `ocaName`/`ocaType` to cancel or reduce
sibling pending orders after a fill. Generated backends must pass those fields
into the shared ledger for entry/order calls, not only for `strategy.exit`.
`strategy.entry()` reversal order metadata stores the transaction quantity in
`order.qty` (existing opposite position plus requested size) while preserving
the user's requested size in `requestedQty`. Fills/equity and retained order
metadata must use the same reversal transaction model across all backends.
Repeated `strategy.exit()` calls with the same id/from-entry replace the
pending order parameters without resetting the original activation bar/time.
Historical price-based exits then fill against the default chart-OHLC tick path;
resetting activation on each dynamic price update leaves valid exits pending
forever on common moving-stop scripts.
Default strategies still process pending broker fills on unconfirmed realtime
ticks even though they skip statement execution and equity finalization; do not
trim the ledger after the fact. Confirmed realtime close replay must mirror the
historical pre-statement fill/mark ordering so closed-trade runup/drawdown sees
the confirmed bar OHLC excursion before exit fills are replayed.

**Realtime updates:** `commit()` finalizes a bar; `rollback()` reverts to last commit for intrabar recalculation. Same-time replacement of the loaded final bar restores a pre-last-bar scope snapshot, including plain array-backed builtin caches, then replays the bar; newly appended realtime strategy bars still honor `calc_on_every_tick=false`. Reconstructed realtime executions in string codegen must apply the same rule only for the appended realtime segment: unconfirmed appended strategy bars do not execute top-level statements unless `calc_on_every_tick=true`, while indicators still calculate every tick and same-time replacement of the loaded final bar still executes. Worker `confirmedRealtimeBarStartIndex` metadata marks the appended realtime segment only; setting it for loaded-bar replacement makes generated backends skip strategy updates they must replay. Static outputs such as `hline` must not gain per-bar values during truncation, while per-bar visual arrays such as `plotarrow` colors must be replaced at `bar_index` rather than appended. Source-aware values returned from imported/user helpers preserve series identity for history-sensitive calls, but normal binary arithmetic/comparison must unwrap them before operating.

## Built-in Functions

Registered through the shared compiled runtime helpers:

| Category           | Functions                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Math               | `math.abs`, `math.max`, `math.min`, `math.sqrt`, `math.pow`, `math.round`, etc.                                                                                                    |
| Technical Analysis | `ta.sma`, `ta.ema`, `ta.rsi`, `ta.macd`, `ta.bb`, `ta.kc`, `ta.supertrend`, `ta.dmi`, `ta.atr`, `ta.highest`, `ta.lowest`, `ta.cross`, volume variables such as `ta.accdist`, etc. |
| Input              | `input.int`, `input.float`, `input.bool`, `input.string`, `input.color`, `input.source`, `input.timeframe`, legacy `input()` forms                                                 |
| Plotting           | `plot`, `plotbar`, `plotcandle`, `hline`, `bgcolor`, `plotshape`, `plotchar`, `plotarrow`, `fill`                                                                                  |
| Drawing            | `label`, `line`, `box`, `polyline`, `linefill`, `table`, chart points, and `.all` lifecycle helpers                                                                                |
| Color              | `color.red`, `color.green`, ...; `color.new(color, transparency)`                                                                                                                  |
| Utility            | `nz()`, `na()`, `str.*`, `timeframe.*`, `ticker.*`, `request.*` host-backed families, `footprint.*`/`volume_row.*` accessors, selected strategy helpers                            |

**Adding a new built-in:** Add it to the shared compiled runtime helper surface, then add tests.

Array runtime errors intentionally follow Pine v6 for destructive edge cases:
negative constructor sizes, sizes above 100,000, growth past 100,000, empty
`array.pop()`/`array.shift()` calls, and empty `array.first()`/`array.last()`
reads throw instead of returning `na`, `undefined`, or silently clamping.

TA compatibility has two separate guards: the compiled warmup sweep in
`src/runtime/codegen/execute.test.ts` pins first-valid-bar/`na` behavior, and
`tests/compat/pine-ta-value-behavior.test.ts` pins fixed numeric/boolean values
for every official `ta.*` manual-index name. `ta.cum(na)` returns `na` for that bar without advancing the saved
sum; treating it as the previous sum makes `na` indistinguishable from zero in
OBV-style expressions. Keep both current when changing TA formulas or compiled
TA classes.

Strategy value compatibility is pinned by
`tests/compat/pine-strategy-value-behavior.test.ts`, which uses fixed bars and
literal expected values for position/profit readouts plus open/closed trade
accessors. Keep it current when
changing the deterministic ledger, compiled strategy loop, or strategy accessors.

Runtime metadata compatibility is pinned by
`tests/compat/pine-runtime-metadata-behavior.test.ts`, covering official
`timeframe.*`, `session.*`, implemented `syminfo.*`, and chart metadata fields
for runtime metadata behavior. Provider-owned `syminfo.*` values
should either surface host metadata unchanged or remain in the reasoned
known-missing allowlist; do not fake provider series in the runtime.
`syminfo.prefix(symbol)` and `syminfo.ticker(symbol)` are callable helpers as
well as metadata-style names; keep them routed through the builtin registry in
every backend so script-local functions still win and ticker modifiers are
stripped consistently.
`timestamp()`/`time()`/`time_close()` overloads must resolve a string timezone
held in a variable the same way they resolve a string literal; the runtime
already binds a third positional string as `timezone`, so the checker must use
scope-aware argument types for those overloads instead of treating identifiers
as numeric date or bars-back slots.

Barstate compatibility is pinned by
`tests/compat/pine-barstate-behavior.test.ts`, which asserts literal
historical load, same-bar realtime replacement, and next-bar confirmation
sequences for all official `barstate.*` flags across the production compiled worker path. Worker `updateBar` keeps explicit realtime
phase state so compiled output preserves the previous realtime bar's confirmed
  closing evaluation before opening the next realtime bar. Compiled execution must
  receive reconstructed realtime phase hints (`confirmedRealtimeBarStartIndex`,
  `confirmedRealtimeBarIndex`, and `realtimeLastBar`) in workers,
  selected-backend helpers, and corpus harnesses.
Generated reconstruction must replay the original loaded last historical bar
and every confirmed realtime append as `barstate.islast`; otherwise ordinary
`barstate.islast` drawing constructors disappear on live charts even though the
fresh compiled reconstruction keeps them.

Input behavior compatibility is pinned by
`tests/compat/pine-input-behavior.test.ts`, covering all official input
functions. `options`, `minval`, and
`maxval` reject invalid defaults rather than clamping; `step` is widget metadata
only. `input.source` must keep resolving price composites and plot-source
overrides as series values. Runtime input identity is declaration-based, not
display-title-based: repeated public-script titles such as multiple
`input(..., title="Periods")` declarations must stay distinct by call site,
while unique titles keep the stable `input_Title` override ID. Source-aware
input defaults are for preserving `input.source` identity only. Explicit scalar
legacy inputs such as `input(type=float, defval=-0.5)` must validate and
	register the unwrapped scalar default; otherwise valid v3/v4 scripts turn unary
	numeric defaults into source-wrapper objects.
Untyped generic `input()` uses its own UI-metadata signature; do not treat
numeric generic inputs as `input.int()`/`input.float()` range inputs or named
`inline`/`group` arguments can be shifted into `maxval` at runtime.
Cached global input declarations and skipped initialized `var`/`varip`
declarations must still reserve the sequential builtin call-id slots they
consumed when first evaluated. The IDs are part of persisted chart/study input
overrides, so do not change derivation to fix cache bugs; preserve the existing
keys and keep later uncached input expressions aligned with bar 0.

Request/ticker option compatibility is pinned by
`tests/compat/pine-request-ticker-option-behavior.test.ts`, which asserts
literal values using a seeded
`RequestDatafeed`. It covers `ignore_invalid_symbol`/`ignore_invalid_currency`,
request-level `currency` and `calc_bars_count` routing, declaration-level
`calc_bars_count` metadata, repainting-safe higher-timeframe lookahead
differences, `request.footprint()` missing-data behavior, and all official
`ticker.*` constructors/modifiers feeding concrete `request.security()` symbols.
Empty request timeframes mean the chart timeframe; if a host omits chart
timeframe metadata on the compiled path, TealScript uses the runtime default
`60` rather than treating the request as unseeded or recursing.
`request.security()` and related expression evaluators must replay prior
regular global/local value dependencies in the requested context, not capture
chart-scope scalar results. Exclude declarations that themselves contain
`request.*` calls from that replay, and copy local UDT declarations into
request sub-engines before replaying typed values such as `MyType.new(...)`.
Otherwise realtime HTF request plots either use chart-side TA state or fail only
on public scripts whose request helpers return UDTs.
UDF request expressions also pull in regular global series dependencies from
the UDF body. Omitting them makes generated request subprograms throw on
unresolved chart globals inside the request evaluator; replaying them twice
advances requested-context stateful history twice on bar zero and flips scanner
alerts.

Compiled builtins that lower directly to helper calls must preserve Pine named
argument binding before emission. Global `array.*` calls are the known guard:
`array.push(id=..., value=...)`, `array.get(id=..., index=...)`, and related
helpers must emit arguments in the declared Pine signature order, otherwise
public scripts that store drawing or snapshot state in arrays compile to
zero-argument helper calls and silently diverge.

Alert/log/runtime compatibility is pinned by
`tests/compat/pine-alert-log-runtime-behavior.test.ts`, covering all official
`alert`, `alertcondition`, `alert.freq_*`, `log.*`, and `runtime.error` names
for compiled execution. It asserts per-frequency alert event
counts, alertcondition placeholder rendering, log placeholder formatting, and
runtime-error halt semantics inside UDFs and compiled request-expression
subprograms.

The external corpus historical reports prove fixed-window execution only. The
real-script realtime replay is a separate measurement generated with
`yarn workspace @tealstreet/tealscript pine:external-corpus:realtime`; it starts
from the compiled historical output set and records append, same-time
replacement, and confirmation output parity for compiled execution. A nonzero mismatch count in
`reports/external-pine-corpus-realtime.report.json` is a known measurement
finding, not a stale report to smooth over.
`pine:external-corpus:realtime` accepts labelled source reports as
`--reports label:path`; the default with no `--reports` remains the v1/v2
indicator-focused corpus pair.
For inner-loop debugging, the realtime runner supports development subsets with
`--mismatched-only`, repeatable `--only-script`, or `--limit-per-corpus`.
Subset reports are labelled `DEVELOPMENT SUBSET`, must write to an explicit
scratch `--output`, and must never replace the committed realtime report. Use a
subset to iterate on a cause, then run the full report before committing any
coverage or cutover claim.

External public-corpus measurement is generated by
`scripts/run-external-pine-corpus.ts` and committed as metadata in
`reports/external-pine-corpus-v1.report.json`; third-party source stays outside
the repo. `reports/external-pine-corpus-v2.report.json` is the disjoint holdout:
do not merge it into v1 or tune against it before reporting a one-shot run.
Corpus refetch/repro commands should pass explicit report paths and fresh
`/tmp` directories. `pine:external-corpus:refetch` resolves `--report` from the
repo root so documented paths like
`packages/tealscript/reports/external-pine-corpus-v2.report.json` work under
`yarn workspace`; do not rely on the workspace package directory as cwd.
Unresolved host imports classify as `host-dependency-gap`, not invalid Pine or
undecided, because valid Pine still fails for the user until the host supplies
the library source. Official TradingView standard libraries are implemented as
documented builtins, version by version; register the full documented export
surface, not only the functions a corpus happens to call. Unsupported official
versions or documented exports without runtime bodies stay TealScript gaps and
fail loudly. AST-backed official surfaces such as `TradingView/ZigZag/8` are
embedded built-in library programs and still version-pinned; do not resolve
them through the host library registry or a network fetch. Third-party
TradingView library imports are
`unsupported-by-design`: TradingView exposes no network-resolvable library
source outside its closed Pine runtime, so there is no fetcher/scraper/resolver
to build, and future proposals to fetch TradingView library source should be
rejected without scoping. The `unresolved-import` diagnostic must name the
requested owner/library/version; do not collapse this into a generic checker
error. Obvious non-script files classify as `corpus-hygiene` and are excluded
from the achievable ceiling. Rows
that execute without plots, drawings, alerts, or logs are not all equivalent
failures. The runner traces
source-level output calls and records compiled runtime output. Future product
or reference comparisons must reuse the same output comparator. That comparator
compares finite numeric values with a 1e-8 absolute tolerance,
canonicalizes drawing IDs, omits undefined object fields, and stays strict on
plot/drawing/alert/log order, series lengths, `na`/null versus zero, and
side-effect presence. It then uses a 2,880-bar probe to separate TealScript gaps
from correct silence (strategy-only/no-output source or synthetic-window
artifacts) and conditional/data-gated silence. Conditional/data-gated silence
that remains undecided after the probe stays counted as `tealscript-gap` in row
validity unless a stronger oracle proves correct silence. The corpus output parity
guard is stricter than "compiled produced something"; mismatches are product
correctness gaps until fixed or reported as loud unsupported compiled cases. Keep
that split and output-parity summary current when changing the corpus harness or
output collection.
Compiled execution still swallows ordinary per-bar JavaScript errors so one bad
bar does not abort the run, but those swallowed errors must remain measurable:
`RuntimeProfile.compiledBarErrors` and the external corpus report retain the
count plus first bar/message. A script that silently throws before every output
call is a diagnosable corpus/runtime gap, not an empty-output mystery. Current
v1 instrumentation is zero; any future nonzero count is a finding to investigate.

The default `pine-composite-performance.test.ts` cases are smoke checks only;
full assertions stay behind `TEALSCRIPT_PERF_ASSERT=1`. Do not increase the
default smoke workload to make a timeout pass. The request-backed worker smokes
have 10s local timeouts because the CI-shaped Turbo run stretches sub-second
isolated checks under package concurrency.

Behavior tables that assert literal expected values must declare provenance for
those values: independently derived from Pine v6/reference semantics, taken
from a published worked example, or a TealScript regression pin. Values captured
from current TealScript output are not correctness assertions; keep them labelled
as regression pins with a note explaining what local behavior they freeze.

The product-worker realtime safety gate was removed after direct compiled
replay and worker composite tests proved the classified stateful intrabar rows
execute and match as compiled. Unsupported compiled execution still fails
loudly through the normal compile/execute path with `RuntimeProfile` diagnostics;
do not add a quiet fallback to another engine.
Worker-facing errors carry `severity`: parse, semantic, worker, and
`runtime.error` failures are `error`; host-data absence is a `warning` at the
Tealchart boundary. Keep stable `code`/`type` and profile fields authoritative
for UI branching; message wording is for humans and must not be the only
classifier.

Drawing/object compatibility has a behavior coverage assertion in
`tests/compat/pine-drawings.test.ts`: every implemented official manual-index
name under `box.*`, `chart.point.*`, `label.*`, `line.*`, `linefill.*`,
`polyline.*`, and `table.*` must have construction, mutator, deletion, `.all`,
constant, or getter coverage. The remaining bare object cast/helper names are
kept in the known-missing allowlist with reasons.
Object-style drawing method calls must resolve by the receiver handle namespace
after user/imported methods, so `lineId.delete()` reaches `line.delete(lineId)`
without allowing builtin methods to shadow script-local methods.
Text alignment validation intentionally accepts `text.align_center` as a
vertical table/box alignment value in addition to `text.align_middle`; public
scripts use the center constant for vertical cell centering, and rejecting it
pushes valid Pine into the semantic-failure bucket.

## Worker Protocol

**Main → Worker:** `init`, `updateBars`, `updateBar`, `setInputs`, `requestDataResult`, `dispose`
**Worker → Main:** `ready`, `requestData`, `result` (plots + inputs), `error`, `parseError`

The worker keeps request execution synchronous by using a message-backed cache.
It statically preloads literal/simple `request.*` calls, then uses hidden
non-codegen runtime discovery for series-varying request routing arguments.
Discovery posts concrete `requestData` misses, discards
plots/drawings/alerts/logs from the hidden pass, and retries the same output
generation with a warm cache. Dynamic discovery runs before backend selection,
so it must stay backend-agnostic and must report discovery errors instead of
silently deciding no request data is needed.
Host provider failures returned through `requestDataResult` are cached as
missing values for script execution, not as script runtime failures; Tealchart
surfaces the provider diagnostic on the main thread while Pine-side request
values remain `na`.
Same-bar `updateBar` messages also route through the compiled worker bridge and
reuse the worker request cache; stale in-flight misses are cancelled per update.
Realtime re-entry correctness has a fast representative default test and a full
corpus sweep behind `TEALSCRIPT_REALTIME_SWEEP=1`; keep the full sweep opt-in so
the package gate stays cheap enough to run routinely.

## Grammar Features

Supported: version annotations, indicator and strategy declarations, library declarations, imports, function definitions, methods, user-defined types, enums, variable declarations (var/varip/typed), tuple declarations/reassignments, if/else, switch, for, for-in, while, break/continue, binary/unary/ternary operators, function calls with named and mixed args, member access, index/history access, literals (number, string, boolean, color, na), comments.

Measured v6 grammar coverage is committed in `src/compat/pineV6GrammarReference.ts` and pinned by `tests/compat/pine-grammar-coverage.test.ts`. The current inventory covers 63/63 official-doc and manual-index construct snippets and the known-missing grammar allowlist is empty. Run `yarn vitest run packages/tealscript/tests/compat/pine-grammar-coverage.test.ts` after parser/checker grammar changes, and rebuild/commit generated parser files when `grammar.peggy` changes.

The official reference manual index audit is separate from the local grammar and
builtin inventories. `src/compat/pineV6ReferenceManualIndex.ts` is a names-only
snapshot from `https://www.tradingview.com/pine-script-reference/v6/`, and
`src/compat/pineV6ReferenceManualAudit.ts` records what the local inventories
omit or include that the manual does not. Keep that audit current when changing
grammar or builtin reference data; it is the guard against measuring only a list
we wrote ourselves.

**Important current gaps:** imported Pine libraries are parsed/checked, and compiled execution supports host-provided exported constants, expression/block-bodied pure functions, methods, UDT constructors/fields, local/imported enum members and `.title()`, versioned aliases, export-to-export calls, and transitive host-provided imports inside compiled security expression subprograms; host-backed request data depends on the caller's datafeed, with `request.currency_rate()`, `request.economic()`, `request.financial()`, legacy `request.quandl()`, `request.footprint()`, `footprint.*`/`volume_row.*` object accessors, and corporate-action requests routed through provider seams and returning `na` when unseeded; `request.*` calls inside user-defined wrapper functions compile for direct source parameters, captured computed expressions, root-scope regular values, `input.source()` aliases, imported tuple helpers, UDF parameter/local history, UDT field history, indexed TA call-result history, and nested UDF call-chain-local `ta.*` state; timeframe parsing follows v6 bounds and `timeframe.change()` uses calendar-aware timeframe buckets; compiled drawing objects use declaration `max_*_count` limits and oldest-first eviction; the strategy ledger tracks deterministic position accounting but is not an exact TradingView broker emulator.

Legacy Pine compatibility is version-conditional in the checker and compiled execution. v2/v3/v4 scripts accept
legacy `input()` type selectors, bare color/style constants, old ticker helpers,
bare `tickerid`, v3 `n` as `bar_index`, numeric truthiness in boolean built-in
parameters, legacy visual `transp`, and boolean `strategy.entry()`/`order()`
directions; v6 signatures remain strict unless the reference says otherwise.

External public-corpus reports are metadata only, read source from
`/tmp/pine-corpus-v1` or `/tmp/pine-corpus-v2`, and carry row-level validity
classification: `supported`, `tealscript-gap`, `host-dependency-gap`,
`unsupported-by-design`, `invalid-pine`, or `corpus-hygiene`. The achievable
ceiling excludes rows marked invalid by a specific TradingView rule, obvious
non-Pine corpus hygiene, corpus input gaps, and permanent unsupported-by-design
policy outcomes. Rows not proven invalid, hygiene, corpus-input, or
unsupported-by-design remain in the product denominator as TealScript or
host-dependency gaps so the corpus cannot flatter TealScript by guessing.

See `PINE_PARITY_AUDIT.md`, `PINE_COMPATIBILITY_INVENTORY.md`, and `PINE_BUILTINS_COVERAGE.md` before claiming PineScript compatibility.

## Commands

```bash
yarn build:parser     # Regenerate parser from grammar.peggy
yarn build-force      # Build with tsup
yarn dev-force        # Watch mode
yarn test             # Vitest
yarn typecheck        # tsc --noEmit
yarn lint             # ESLint
```

## Key Files

| File                             | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `src/runtime/compiledOnly.ts`    | Public compiled execution wrapper          |
| `src/runtime/types.ts`           | Shared execution result/profile types      |
| `src/runtime/codegen/`           | Compiled execution path and parity harness |
| `src/parser/generated.js`        | Auto-generated parser                      |
| `src/parser/grammar.peggy`       | PEG grammar                                |
| `src/parser/ast.ts`              | AST type definitions                       |
| `src/worker/TealScriptWorker.ts` | Main-thread worker wrapper                 |

## Gotchas

- `generated.js` is auto-generated — edit `grammar.peggy`, not the generated file
- Loop iterations are capped at 10,000 (safety limit in engine)
- `na` is represented as `NaN` internally; `na == na` is false (PineScript semantics)
- ESLint ignores generated parser files (configured in `eslint.config.mjs`)
- The worker entry point requires bundler URL resolution: `new URL('@tealstreet/tealscript/worker', import.meta.url)`
- Compiled tuple/control codegen must treat `_` as discard-only, read tuple elements through runtime indexing, and propagate expression-result assignment through nested if/loop tails.
