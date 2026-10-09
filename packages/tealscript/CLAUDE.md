Native capture requests and evidence belong in the public `Tealstreet/tealscript-oracle`
repository. Read [ORACLE.md](ORACLE.md) for pinned sparse test fixtures, capture
handoffs and promotion. Missing fixtures fail explicitly; tests are never skipped.

Native v5/v6 missing strings use the empty-string representation for no-match
if results and explicit string na initializers; na("") is true. Earlier versions
retain their existing representation and code generation.

Native v5 numeric array.join uses sixteen significant digits for finite fractional
values in both namespace and receiver calls. The version flag is emitted only at
those call sites; v6 joins and str.tostring retain their existing behavior.

Visual boolean-kind contracts cover each documented boolean option across all
plot-family signatures, including three fill overloads. Keep false/true controls
and wrong scalar/reference kinds separate from qualifier and rendering evidence.
Visual numeric-kind contracts distinguish fractional/signed coordinates from
boolean, string, color and reference arguments. V6 builtin plot series validates
inferred numeric kinds; user callables and legacy checks keep their own contracts.

Value-vector member detection compiles its fixed, non-global regex inventory once
per module; source scanning and every deterministic vector still run by default.

`str.split` results always carry the series qualifier of an array reference,
independently of the source and separator qualifiers.

`str.replace` inserts dollar-pattern replacement characters literally, including
when the selected occurrence is zero.

V6 string calls require the documented format/time arguments and integer numeric
slots. Color and line formatting values are refused; disputed unions stay unchanged.

Leading regex `(?i)` folds ASCII only and publishes the original matched text;
character ranges and escaped letters retain their case-equivalent membership.
The existing leading `m` and `s` modes remain independent of case folding.

V6 TA nearest-rank and linear-percentile lengths require integer kind through the
shared argument checker. Receiver methods retain their own signatures.

Native v52 v6 falling/kc/kcw length slots also require integer kind. Preserve
falling series lengths, Keltner simple length ceilings and earlier-version routes.

Pivot-point type requires string kind through the resolved builtin argument
checker. Invalid string domains remain runtime checks.

Drawing argument contracts parse their common setup once, clone its AST per case,
and pad the suffix to preserve original source spans. Semantic checks stay fresh.

Default arity suites sample one maximum boundary per distinct limit and exercise
small calls for every element kind. `TEALSCRIPT_ARITY_SWEEP=1` restores every
maximum/+1 case in the CI semantic sweep step.

Composite fallback metadata uses the compilation already checked and executed by
the parity helper. Keep the independent source classifier and output assertions.

Worker tests can reuse `createWorkerTestModule` within a file: it imports once,
attaches each fresh worker global, and sends dispose before each case. Keep all
initialization, request, retirement and output assertions in the default suite.

Windowed TA reservations stop at the existing source capacity; declared lengths cannot manufacture deeper history reads or enlarge demand metadata. Actual source reads retain their history guards and late warmup reservations.

History discovery shrinks only a reached positive lookback; current-slot maintenance cannot establish a zero-sized historical requirement.
Reached windowed TA calls reserve available window capacity before warmup. Late growth collects one pass of demand, then replays with fresh chart/request state before realtime or result publication.

Supplied user-library tuples reuse function-body member inference and the tuple
qualifier floor. Bind function arguments without a method-receiver offset;
registered official adapters and existing fill overload checks stay independent.

Requested programs discover local function dependencies from checker-resolved
call identities and their nested call contexts. Expand only defaults omitted by
reachable calls, and share the resulting function/global set between capture
preparation and requested AST construction; unrelated method overloads do not replay globals.

Requested arithmetic expressions proven bar-invariant from their AST evaluate once
when every actually read capture is primitive and has no requested source. Their
ordinary output arrays retain all requested slots; history, TA and UDF calls replay normally.

Imported function and method results qualify exported UDT identities through the caller alias, including local-variable tails and collection members. Preserve already-qualified names, chosen callable binding and the simple/series return qualifier rule.

Captured v5 `import notlib as n` rejects `as` with the native reserved-name
message at the parser's existing error site. This diagnostic enhancement does
not change import admission or reserve `as` globally in other contexts.

Native v6 sources in the v5 capture bundle settle 1x1 missing-column operations: remove_col(na)
removes the sole column; swap_columns(na, 0) retains it. Wider missing-index
selection and matrix.get(na) remain held and preserve existing refusals.

Symmetric finite matrix eigenvalues use the captured implicit QL recurrence
and descending value order. Unit-scale dimensions16/32 have native bit-exact
proof; scaled settings and arbitrary native eigenvector bases remain held.

Dynamic integer time/time_close offsets outside [-500..5000] raise RE10002.
Keep bars_back and timeframe_bars_back argument names in the error; fractional
and nonfinite offset handling remains outside this captured rule.

Visual color-kind contracts distinguish color literals and color.new results from
numeric, quoted-hex, boolean and reference arguments across all plot signatures.
Const hline controls keep kind checks separate from its native qualifier rule.
Visual string contracts distinguish titles/text/characters from unrelated kinds.
V6 builtin marker style/location/size and plot formats also require strings.
Resolve aliases and builtin binding independently of the existing domain checks.
V6 builtin visual offsets, show_last, arrow heights and precision require
inferred integers; float aliases do not become integers by rounding. Known
precision literals, aliases and input defaults must remain within 0 through 16.
Visual required-argument contracts keep positional and reordered named controls.
An optional title cannot substitute for a required series, OHLC coordinate, color,
price or fill handle, even when the total argument count is otherwise sufficient.
V6 builtin marker series accepts numeric and boolean inputs at ordinary and
absolute locations, rejecting unrelated inferred kinds. Resolve builtin binding
before checking series so local marker callables retain their own contracts.
V6 builtin visual display options reject unrelated inferred kinds while retaining
named constants and mask arithmetic. Numeric encoding and host presentation
remain separate contracts; local callables do not inherit builtin display checks.

Gradient fill overload detection reads positional bottom_value independently of
a named title. Hline and plot masks share gradient endpoint binding; flat
color/title fills retain their existing overload.

Conditional calls to resolved local UDFs that read parameter or local history
emit a consistency warning. Callable binding, admission and generated code stay
unchanged; unconditional calls and no-history or shadowed callables stay silent.

Numeric timestamp calls in requested contexts default to the requested symbol's
exchange timezone. Pass requestSyminfo into both evaluators; explicit zones
and date-string UTC defaults remain independent of that numeric default.

Compiled primitive-literal timestamp calls reuse results within one chart or requested
execution pass, checking the effective timezone before every hit. Keep first-use
parsing/arithmetic and execution-context ownership unchanged. Allocate its cache
only on first reached literal use; dynamic-only or non-timestamp executions create none.

Captured negative integer Pivot strengths raise RE10001 at the executed call,
with the executing bar and leftbars/rightbars identity. Static construction defers
the failure; dynamic windows share validation, preserving noninteger normalization.

Request.security dispatch metadata retains a bounded entry per primitive symbol
at each call site, rechecking options, captured source bindings and call-scope identity.
Mutable capture values are compared with their serialized snapshot; changing series values retain their source identity.
Object/function options retain single-entry behavior; request values, budgets and provider retries remain independent.

Native v5 division captures reject literal 0.0 and -0.0 denominators during compilation. The checker reuses literal extraction without inferring alias, dynamic denominator, or v6 refusal behavior.

Native v5 captures reject duplicate local user-method parameter signatures, even when uninvoked. The local declaration guard preserves builtin overrides and distinct signatures; identical v6 method policy remains uncaptured.

V6 loop result initialization uses scoped semantic result-member types: unevaluated
boolean members default to false, while other members remain missing. Preserve
v5 missing booleans and the last evaluated tail across break/continue.

Compiled root loops reuse line Y1 levels only when the line array is stable and
all calls are known to preserve lines and line arrays. Cache lifetime is one
loop invocation; unknown calls, line mutations, reference reassignment, imported
namespaces and UDF or custom-method scopes retain live reads. Legacy paired OHLC comparisons keep
eager bound reads, while v6 retains lazy evaluation and every loop clock check.
Array fill rejects captured negative starts and overflowing end bounds at the endpoint, while reversed in-bounds ranges remain no-ops. Native terminal errors do not expose a post-error mutation/atomicity contract.

Numeric map keys accept the captured float(na) and overflowing-exp source results; reference-type keys still reject. Blank exported keys do not establish native NaN-versus-infinity representation.

Array standardize preserves the input slot count and missing positions while computing mean/stdev from numeric values. Keep the existing all-missing retention and result-kind rules.

Array percentrank returns zero for a missing index on the captured nonempty numeric arrays. Empty arrays remain NA and finite out-of-bounds indices still reject.

Array linear-percentile finite percentages outside 0..100 raise runtime errors; missing percentages retain NA publication. Keep the native numeric rank definition separate from this domain check.

Array covariance rejects unequal input sizes before filtering numeric pairs, as captured by v7 unequal-size probes in both operand orders. Preserve biased/sample arithmetic for equal-size arrays.
Pine v5 compiled cross/crossover/crossunder calls publish na for a missing
current operand after advancing the existing TA state. Evaluate operands once;
preserve complete-pair recovery, snapshots and the v6 boolean result.
Imported helper bodies and defaults share arithmetic-site collection, and imported
function and method calls record the same operand context as local calls.

Call-specific arithmetic operand recording traverses non-returning if/else, for,
while and expression statements in UDF bodies. Preserve const/series association
inside nested control flow; source-composed SMA uses the shared rule.

Callable checking uses one function-depth counter and one resolved-symbol reassignment guard. Global-only calls share one local-scope guard, so each emits one scope diagnostic. Retain current scoped type collectors and matrix argument binding alongside direct nested-collection refusal.

Drawing lookup caching preserves reference-type metadata after deletion; clear resets both the ID cache and reference-type map. Currency requests use one resolver in chart and requested contexts. Economic gap-series results use the same prepared point-series cache, preserving provider lookup, history sizing and main-timeframe metadata.

The dedicated array percentile receiver guard owns its numeric-element refusal. The general numeric collection guard skips only those two percentile operations so a bad receiver emits one diagnostic, while other numeric array/matrix helpers keep their shared validation.

Requested point-series routing keeps the same resolver through captured-expression recursion and nested security evaluation. Preserve original main-timeframe metadata, adaptive history sizing and requested footprint providers alongside that callback.

Same-timeframe independent scalar request programs advance their cached evaluator through the selected chart time. Keep the full requested dataset and last-bar metadata; retain primitive tuple/state history and restart the cursor on adaptive buffer growth. Captures, imports, references, nested requests, host-time/random reads and other timeframes keep eager evaluation. Request cache identity and the 500ms loop guard stay unchanged.

ValueWhen instances have a fixed occurrence, so only the newest occurrence+1
matches can affect later results. Missing source matches still occupy a slot;
save, restore and recompute retain independent copies of that bounded state.

Independent scalar requested programs build builtin histories only before an
operation that reads them. Table-reference normalization does not read bar
history; other registry calls and time/session operations synchronize first.
Same-timeframe selection ignores confirmation metadata in every gaps/lookahead
mode, so its cache does not build a confirmation close-time vector.

DMI starts its true-range seed after the initial physical bar, as captured with valid OHLC in native coverage-register-ta-1. Those clean captures do not establish a general OHLC-hole policy. Preserve the integrated RMA arithmetic and missing-publication semantics while merging this seed change. Valuewhen occurrence keeps the v6 simple-or-weaker contract.

Calculated-bars history selection belongs only in executeCompiled, before history sizing. Preserve the previous confirmed-realtime start/index and realtime-last fallback chain while rebasing. The inner pass must not retrim the static declaration after an input override, especially zero; project selected outputs back onto chart indices.

When merging TA call guards, Supertrend ATR period joins the shared v5+ integer
helper. Keep scoped SMA invocation state and native SAR checkpoints intact while
adding legacy Sunday names and nested footprint provider routing.

Fixed-length Dev uses the native compensated SMA mean with a physical source
window for absolute deviations. Save and restore both states. Missing physical
samples still mask output; keep the separately captured CCI arithmetic intact
when merging Dev, rather than rebuilding its mean with an ordinary window sum.

The shared variable-declaration type helper applies initializer qualifiers before
v6 mutable declarations widen to series. Do not repeat initializer qualifier
inference after that helper: it would demote explicitly typed mutable scalars.

HighestBars and LowestBars lengths use the shared integer-kind argument guard,
including v5/v6 single-positional and named overloads. Preserve their membership
when merging other TA length guards; numeric float lengths remain rejected.

Generic `input()` widget kinds come from the scoped semantic expression type,
including const integral floats. Reuse the same lazy collector for input kinds,
boolean defaults and color `nz`; keep the separate v5 division analysis. Source
inputs still carry their source metadata rather than a numeric widget hint.

Intrabar runtime snapshots copy chart.point values, including points held by
arrays, matrices and maps, while preserving point aliases within each snapshot.
Read-only arrays retain protected storage after their point elements are cloned;
explicit array copies remain editable.
Pine collection copy operations remain shallow; mutable live points must not
change the stored pre-tick snapshot used when the previous bar is confirmed.

Literal declaration max_labels_count and max_lines_count values above 500 are
refused through the existing integer-range checker. This ceiling check does not
infer exact native garbage-collection cadence from the approximate retention limit.

# CLAUDE.md — @tealstreet/tealscript

Requested EMA programs bulk-fill only the selected result prefix after the existing
fixed-input state/output certificate settles. Keep that Object.is certificate,
request identities and adaptive-history restart behavior unchanged. Uncertified
programs retain direct callable evaluation with no per-value certificate accessor.

Regular scalar `_` declarations evaluate their initializers without creating a
binding, including local calls and loop iterations (original1441eed5a4). Semantic
discard-only lookup remains the normally reused originalb4fed79d4f.

Builtin variable shadowing emits a checker warning for scalar and tuple names in
global or local scopes. The originald93c7aeb8a warning remains separate from the
existing use-before-shadow refusal and initializer validation.
Positional scalar `math.log` calls invoke the context's scalar helper directly,
avoiding per-call evaluator lookup and argument packing. Named and legacy calls
retain dispatcher binding; all routes use the same numeric conversion and kernel.
Its positive finite exponent reduction adds split ln(2) with a compensated
sum, preserving the native v2 captured binary64 values. Keep direct near-unity
evaluation to avoid cancellation, and retain native Math.log domain/NA handling.
This scalar leaf does not change `math.log10`, argument binding, callable shadows,
or the shared TA kernels.
Matrix pseudoinverses use scaled one-sided Jacobi SVD to determine rank.
Full-rank square matrices retain the native-matching LU inverse arithmetic;
rank-deficient and rectangular matrices use the SVD pseudoinverse. Native
binary64 output outranks the reference's algorithm-name remark.

Compiled IANA calendar/session conversions reuse successful offsets for the
exact timezone string and timestamp in an 8192-entry FIFO cache. Keep the
timestamp exact: day or minute buckets can change DST-boundary or fractional
timestamp results. Invalid-zone/nonfinite fallbacks are not cached; the
existing bounded formatter cache and native conversion arithmetic remain.
Native v4 captures require array nearest-rank percentages outside 0..100 to
raise a runtime argument error at the executing bar, including dynamic int/float
arrays. Preserve valid endpoint/rank behavior; do not clamp invalid values.

TA nearest-rank percentiles retain physical missing slots in their ranked
insertion state, matching native v4 ranked-window captures. Insert before the
first greater-or-equal finite value, remove the last matching evicted finite
value or first evicted missing slot, and wait one full physical window before
returning a rank. Snapshots include both physical history and ranked positions.
This behavior is separate from linear interpolation and array NA percentages.
Indicator `calc_bars_count` resolves numeric arithmetic and named explicit
`const` declarations before selecting bars and producing metadata. Zero and
oversized counts retain all bars; positive smaller counts rebase history.
Precision and drawing-limit properties use that same numeric declaration evaluator,
so accepted arithmetic and named explicit const values match equivalent literals.
Declared `max_bars_back` uses the same evaluation in history setup and result
metadata; buffer sizing, growth, ceilings and host overrides remain independent.

`math.toradians` multiplies the source by PI before dividing by 180. Preserve
that binary64 operation order rather than precomputing PI/180.

Pine v4 global `sign` names its argument `x`; Pine v5+ `math.sign` names it
`number`. Use the shared versioned parameter rename table and legacy-math
emission binding, retaining positional calls and rejecting the other version's
named slot.

`str.substring` rejects a negative or invalid starting position and an end
before its beginning instead of using JavaScript's clamping/swapping. An NA
beginning means zero; equal bounds yield an empty string and omitted or
beyond-length end positions include the remaining source tail.

Pine v5/v6 `ta.linreg` length and offset parameters require integer kinds,
including rejection of integer-valued float literals. Length retains its
series-int allowance; offset retains its simple-or-weaker qualifier cap. Use
the shared TA integer argument helper, preserving source numeric admission.

Missing switch results in v6 must use `false` when the scope-aware semantic
expression kind is boolean. Both discriminant and predicate switches use the
same typed fallback; v5 booleans and numeric results retain `NaN`. Reuse the
emitter's semantic expression map rather than guessing from branch syntax.
Lower-timeframe array requests share the cached scalar selector's timeline
validation and binary interval bounds. Ordered finite timestamps visit only
the chart interval; unordered or nonfinite datasets retain the original full
scan and provider order. Keep duplicate endpoints, tuple/NA positions, and
execution-local cache lifetime unchanged.
Emitter membership, history walks and local evaluation indexing exclude `loc`
before reading child values. Locations remain on the AST for diagnostics and
runtime error mapping; expression nodes and emission cache lifetimes are unchanged.
Analyzer TA membership uses a per-analysis descendant index and rejects calls
with disjoint finite source offsets. Equal or missing offsets retain the serialized
substring fallback for cloned expressions. Series checks index generic `name` fields whose values
match the prior unescaped JSON search; string contents do not count as fields.
Cross-analysis cache lifetime remains unchanged.

Emitter membership and history walks exclude the `loc` source-coordinate
metadata subtree. Locations remain on the AST for diagnostics and runtime
error mapping; expression nodes and each emission's cache lifetime are unchanged.

TealScript is a PineScript-like indicator scripting language that runs in Web Workers. It provides a PEG parser, compiled execution path, and series-based execution model for technical indicators in Tealchart.

- `nz` accepts legacy named slots `x`/`y` in Pine v3/v4 and binds them to
  `source`/`replacement` in both semantic inference and generated execution.
  Pine v5/v6 reject those legacy names; positional calls retain their order.

- Omitted `nz(color)` uses transparent black `#00000000`, selected from the
  existing scoped semantic expression types during emission. Explicit replacements,
  including missing ones, are preserved. Legacy v4/v5 omitted bool replacements
  use `false` through the same scoped type hint; v6 bool calls remain refused.
  Lazy type collection avoids a separate
  name-based color walker; incompatible polymorphic source kinds remain unknown.

## Architecture

Four-layer design: **Parser → Semantic/Runtime → Compiled Runtime → Worker**

### Parser (`src/parser/`)

- `grammar.peggy` — Hand-written PEG grammar for a PineScript v6 subset
- `parser.ts` — Wrapper with error handling (`parse()`, `validate()`, `formatParseError()`)
- `ast.ts` — Strongly-typed AST node definitions
- `generated.js` / `generated.d.ts` — Auto-generated Peggy parser output (git-tracked)

Function bodies use the established fixed-depth rules for ordinary nesting and a recursive indentation-aware parser beyond that depth; this avoids a hard maximum while preserving block boundaries.

**Rebuilding the parser:**

```bash
yarn build:parser    # runs scripts/build-parser.js → regenerates generated.js + generated.d.ts
```

Always commit both `grammar.peggy` and the generated files together.
Numeric literal tokens must end before identifier continuation characters.
Otherwise invalid digit-leading declarations such as `1name = 2` can silently
split into a numeric expression and a separate `name` declaration. The boundary
applies after the full fractional or scientific literal, preserving valid ASCII
identifiers and exponent signs without changing identifier character policy.
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
Global indicator/strategy/library declarations and imports can start comma
statement chains. Their terminator belongs to the chain, so a wrapped leading
comma can continue a declaration and same-line imports retain separate AST nodes.
Keep this continuation rule scoped to global declarations.
V5/v6 reject the documented reserved variable/function names through the
version table and semantic declaration checks, including parameters and loop
counters; v4 names remain valid. The
parser return-statement diagnostic exempts assignment and function-declaration
shapes so legacy `return` names reach those version checks.
V5 duplicate call arguments produce warnings and retain the first bound value.
Codegen reuses semantic binding decisions to copy a duplicate-containing v5
program without later arguments before analysis; the caller AST remains intact.
V6 and older-version duplicate guards retain their existing error behavior.
Signed switch-case keys on a new line must start a fresh arm rather than
continuing arithmetic from the preceding result. The continuation guard ignores
arrows inside strings and inline comments.
Both triple-quotation-mark and triple-apostrophe strings retain their literal
indentation, tabs and non-breaking spaces. Layout normalization and foreign-syntax
diagnostics must skip string contents, including multiline continuation lines.
Legacy bare `security()` expressions reject directly referenced reassigned
bindings, including assignments after the call. Semantic checks retain binding
identity across scopes; mutable calculations inside a UDF expression remain
admitted. Codegen surfaces the same refusal for unchecked legacy programs.
Parser-wrapper diagnostics intentionally explain already-rejected JavaScript
idioms and invisible whitespace without widening grammar acceptance. Keep these
as message/location shims unless TradingView evidence supports accepting the
syntax.
Program parsing rejects leading indentation on an actual top-level statement.
This check uses the statement's source-line prefix, so it preserves nested
blocks, wrapped expressions, indented comments and comma-separated statements.
It does not enforce a new local indentation or identifier character policy.
`src/compat/pineInvariantGate.test.ts` is the standing fast gate for parser and
semantic invariants found during corpus audits. Keep AST structural,
doc-derived operator precedence, and semantic type/qualifier invariant cases
there when a silent wrong-tree or wrong-type class is fixed; a one-off corpus
sweep is not enough to defend against reintroducing it.

Sparse table dimensions are coordinate bounds, not eagerly allocated cells.
Do not enforce an invented 10,000-cell budget by summing `columns * rows` at
`table.new()`: current official reference/manual specifies no such numeric
limit, and repeated sparse table allocations must not truncate execution.
Table cells remain allocated only when populated; this does not establish
TradingView's undocumented resource thresholds or hidden-table lifetime.

Function syntax can select a user-defined method overload by its explicit first
argument, alongside ordinary same-name function overloads. Semantic return/tuple
inference must consider both sets; compiled dispatch evaluates supplied arguments
once and retains each method call site's persistent state. The official
ValueAtTime library relies on this documented form.

Local UDF overload selection compares collection element types as well as scalar
types. Equally specific viable UDF calls are refused by checking and compilation;
they must not fall through to a builtin call with the same name.

### Declaration checks
Indicator calc_bars_count refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Indicator format and scale arguments reject inferred numeric operands before
their existing domain checks. Strategy and library declaration checks stay separate.

Indicator precision constants, including arithmetic and aliases, must stay within 0..16.
Literal precision diagnostics remain single; strategy declaration checks stay separate.
Indicator precision requires an int kind, including integral-valued floats being refused.
Existing literal range diagnostics, const qualifier checks and strategy behavior remain unchanged.
The existing nonnegative integer and const qualifier checks remain separate.

Indicator max_bars_back constants, including arithmetic and aliases, must be within 0..5000.
The resolved lower-bound check is indicator-only; strategy declaration checks stay separate.
Indicator max_bars_back refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Indicator max_labels_count arithmetic and aliases retain the 500 ceiling.
Literal bounds and qualifier checks stay separate; strategy checks are unchanged.
Indicator max_labels_count refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Indicator max_polylines_count rejects literal and resolved constants above 100.
Indicator max_polylines_count requires at least 1, including resolved arithmetic and aliases.
Indicator max_polylines_count refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Indicator max_boxes_count rejects literal and resolved constants above 500.
Indicator max_boxes_count refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Indicator max_lines_count arithmetic and aliases retain the 500 ceiling.
Indicator max_lines_count refuses inferred float kinds, including integral-valued floats.
Existing range and qualifier diagnostics and strategy behavior remain unchanged.

Tuple declarations infer their member types and cannot carry type, qualifier,
or var/varip keywords. UDT fields require explicit type annotations, as do UDF
parameters with literal `na` defaults. Function and method overload identity
uses required parameter count and qualified types, including method receivers;
parameter names and optional slots do not distinguish v6 overloads; existing
legacy admission remains unchanged pending native adjudication. Unqualified
typed UDF parameters infer series unless their body requires simple.

A UDF ending in `once` has no return value. Call it as a statement; reject
assignment or argument use of its void result. A later expression in the UDF
body can still return a value after the once block.

Modern Pine plot and hline style constants carry distinct unique kinds
(`plot_style`, `plot_line_style`, `hline_style`). Preserve their family on aliases;
refuse scalar assignment, unrelated builtin arguments, and known non-unique
values in v5/v6 style slots. The documented v4 `plot.style_columns` value is 5:
`columnsStyleNumericValue` controls its integer inference, arithmetic emission,
and Columns output metadata. Other legacy numeric codes are not inferred from
this example. Literal-na version rules and visual qualifier ceilings remain
separate checks.

Executed `footprint.rows()` and `volume_row.up_price()` reject missing IDs with
the captured RE10029/RE10145 text and executing bar. Typed receiver methods use
the same guards; missing requests and unmatched row lookups still return `na`.

Builtin footprint references infer series types: `request.footprint()` returns
`footprint`; `footprint.poc/vah/val/get_row_by_price()` return `volume_row`;
`footprint.rows()` returns `array<volume_row>`. This is checker return metadata,
independent of provider availability and missing runtime values.

### Runtime (`src/runtime/`)

- Native v3 bounds-11/12 reject literal negative `text_size` for `table.cell`
  and `table.cell_set_text_size` during compilation (CE10039). The existing
  semantic drawing-size hook resolves each argument and uses the value-based
  non-negative literal guard before runtime;
  string size constants and dynamic numeric sizes retain their existing rules.

Enum `str.tostring` lowering resolves titles through variables, typed function
parameters, inferred function returns, UDT fields and enum arrays, including
positional/named arguments, aliases and `input.enum`. Analyzer parameter
annotations and scoped value types preserve identities and ordinary strings.
The semantic checker requires integer-kind `ta.stoch` lengths, including
integer-valued floats such as `3.0` being rejected. Its source/high/low arguments
retain numeric kinds, and length accepts const/input/simple/series integers.
Shipped v4 native errors also require v5 MACD fast/slow/signal lengths, WMA length,
and linear-percentile length to have integer kind at compile time. These exact
v5 selectors reuse the integer checker without extending other version policies.
Native stochastic captures pin retention of the last output through source-only
holes and undefined flat-range ratios; a never-defined flat output stays `na`.
High/low windows advance, and retained output participates in save/restore and
intrabar recomputation. High/low-hole contracts remain separately adjudicated.

Gap15 session metadata witnesses are ordinary tests with the integrated shared
input guard `678c6850cf`; their inverse proof covers all eight unchanged assertions.

The v5 `barcolor()` signature has color, offset, editable, show_last, title, and
display parameters. It rejects the unsupported `transp` keyword; use a color
constructor for transparency. Earlier-version signature entries are separate.
Eligible local collection methods infer their return type from the selected body
before builtin helper inference; builtin overloads still use argument eligibility.
Matrix multiplication accepts a numeric matrix, array, or scalar for id2. Its
result members dispatch using the actual result family because vector products
return arrays while matrix and scalar products return matrices.

Eligible local collection methods infer their return type from the selected body
before builtin helper inference; builtin overloads still use argument eligibility.

Native v2 standardize captures retain the source length when every array element
is unavailable, producing an equally sized array of `na` values. Empty arrays
stay empty; this witness does not change mixed-availability arithmetic.

`str.tostring(value, format.mintick)` rounds to tick multiples with ties upward
and retains the tick decimal scale, including scientific-notation ticks. Named
and positional calls share this path; preserve it when integrating default formatting.
The v6 signature inventory keeps `input.source` confirm last and omits inline
from `input.text_area`, matching the documented compiler/runtime bindings.
Native volume-index formula captures require a tighter near-zero equality rule
than nine-decimal operand rounding. Equality and inequality against numeric zero
share the captured reset behavior; other operand rounding and NA handling remain
in the existing comparator helpers.
- `ticker.heikinashi` requires a string symbol at any qualifier. Its semantic
  kind guard reuses resolved builtin bindings, including the legacy alias, and
  preserves local callable shadows; runtime string coercion is not admission.
- Requested expressions share the top-level financial, dividend, economic and currency-rate provider resolver,
  series cache and request budget, using their own bar clock and symbol args.
  Pass this callback through nested requested evaluators; other
  point-provider families keep their existing requested-context behavior.

**Float comparisons:** the native v4 `native-float-comparison-boundary-v1`
RUNS capture extends the original `282973b081` zero-equality rule to nonzero
operands and ordering. `_comparisonEqual` uses inclusive `abs(a - b) <= 1e-10`;
all six v6 operators share it, preserving unavailable-value guards. Native
phase masks supersede the manual's nine-decimal operand-rounding description.
V5's separate unavailable-bool comparison helpers retain their existing behavior.
**Zero equality (`282973b081`):** retain `_comparisonEqual`'s numeric-zero
exception: when either operand is zero, equality uses `abs(a - b) < 1e-10`.
Native volume-index reset captures settle this rule; do not narrow it to those
formulas or revert it to nine-decimal rounding. Nonzero comparisons and NA
handling retain the existing helpers.

Native rolling-flow and v5-bundle association captures distinguish const and
series float subtraction operands in v5/v6. Const RHS values retain grouping;
series subtraction RHS values join the addition accumulator, including explicit
parentheses and left subtraction chains. Preserve const subtrees and the prior
single ungrouped subtraction lowering when operand metadata is unknown. Other
compound operators, strings and earlier Pine versions keep their existing order.
Identifier, UDF, field and index assignments share this lowering. Per-call
arithmetic metadata records assignment operands separately for each UDF call,
including nested calls, without changing ordinary semantic-checker admission.
Explicit parentheses remain marked in the AST for other consumers.

Native captured formula regressions include the COG literal called twice per bar.
Its nested `math.sum` must advance independently for each written UDF call;
`pine-native-udf-sum-history-v1.test.ts` pins the captured denominator and values.
Native RMA formula witnesses also pin conditional `ta.sma` reseeding after source
holes. The nested SMA advances when selected, independently of parameter history.
Native v11 sparse-UDF captures pin v6 root conditional calls with literal
parameter offsets2/3 to chart-bar slots. Those skipped calls retain the prior
argument in intervening slots through `_updateScopeHistory` gap filling. Dynamic
offsets, older versions, nested calls and implicit TA-source parameter histories
retain their prior policy; written call sites keep independent histories.
- `DMI` excludes its first bar from the true-range seed because directional movements require a previous bar. This aligns DI smoothing with native `coverage-ta-3-v1` and `coverage-tab-1-v1` startup captures; preserve the original `e6bb97364a` seed guard.

Native DMI precision uses `100 * smoothedDM / smoothedTR` for each DI and
`100 * rma(abs(plus - minus) / diSum)` for ADX. Moving either factor of 100
changes binary64 values; preserve the shared RMA seed and recurrence.

Non-missing TA windows use immutable queue nodes, so checkpoints share safe
structure instead of copying the full window each bar. Highest/Lowest read
cached extrema; other consumers retain their established sample order.
Highest/Lowest count physical bars for warmup and clear their extrema on a
missing source. Restored checkpoints retain that physical-bar count.

`ta.valuewhen` rejects negative occurrences when the call executes, matching
the native v3 bar-zero runtime error rather than clamping them to zero.

Williams accumulation/distribution validates only the price bound selected by
the direction of the close change: low on a rise, high on a fall. Missing an
unused bound does not suppress an otherwise defined contribution.

`math.sum` uses shared compensated rolling-sum state in chart and requested
contexts. Changing its series length reuses retained source and eviction
history rather than rebuilding a window from the current width.
Collection scalar reads preserve their documented return qualifiers:
`array.percentrank()` namespace and receiver calls retain the existing float kind
with a `series` qualifier. Selected custom methods retain their declared returns.
`array.covariance()` namespace and receiver calls return `series float`;
selected custom methods retain their own result types.

Builtin `matrix.is_identity/is_symmetric/is_square` receiver calls retain the
documented `series bool` floor; user-defined methods keep their declared returns.

Builtin `matrix.det/min/max` namespace and receiver calls return the numeric
element kind with a `series` qualifier. Selected user methods keep their own
returns; this inference does not change matrix numerical kernels.

`array.binary_search()` and its receiver method return `series int` when the
builtin is selected. User methods preserve their own return types.
`array.last()` and its receiver method return the element type with a `series`
floor; `matrix.columns()` and its receiver method return `series int`.
Keep element metadata when applying the floor. The collection ranks 281–320
regression independently checks inference and bounded runtime values.
- Builtin `array.binary_search_leftmost()` returns `series int` through both
  namespace and array receiver calls, independently of the searched value's
  qualifier or the numeric field selected from a UDT. Selected custom methods
  retain their own return types.
Array `lastindexof`, `some`, and `binary_search_rightmost` return explicit `series`
scalar types in namespace and receiver calls. Their result qualifier comes from
the collection operation, so literal elements cannot make the result `const`.

Ranked collection clauses 841–880 have bounded namespace and receiver witnesses
in `pine-collection-ranked-22-{insert,aggregates}.test.ts`. `array.mode` preserves
the numeric element kind and returns `series`, including constant-content arrays;
it cannot initialize a `const` numeric variable. The mode no-winner/tie outcome
remains outside these witnesses because the reference and arrays manual conflict;
qualifier admission does not settle that outcome. Selected custom methods retain
their own return types. Insert index omission is also unpinned: absent requiredness metadata is not a default.


- `compiledOnly.ts` — Public compiled execution wrapper that fails loudly when codegen cannot run a script.
- `types.ts` — Shared execution result/profile/options types.
- `context.ts` — Execution state: OHLCV series, `barstate`, `syminfo`, `timeframe`, plots, inputs
- `series.ts` — `Series<T>` class: time-series values with history access
- `scope.ts` — Variable scoping with `var`/`varip`/regular semantics
- `codegen/` — Compiled execution path. Emits and runs a generated script class.
- `ta.supertrend()` retains its initially sampled factor with ATR and band state.
  Native v6 standalone first2/first3 and paired captures supersede the live-factor
  reference model. Snapshot restoration includes factor initialization; the
  existing missing-factor guard and ATR recurrence remain unchanged.
- V6 literal constant quotients fold to 16 significant digits at the shared division emitter.
  Runtime operands and legacy const-int truncation retain their existing paths;
  source-composed EMA precision uses this rule without changing TA kernels.
- `ta.supertrend()` receives factor at each compute/recompute call. Only ATR
  period belongs in constructor state; changing factor must preserve ATR and
  previous bands, including function-scoped calls.
- `ta.sar()` follows the published Pine equivalent: seed on bar 1 using close
  direction, test reversals before history clamps, and retain close/bar index
  in rollback state. Bar 0 returns `na`.
- `ta.change()` preserves boolean source identity before storing numeric history:
  its boolean overload returns whether the source changed, for either direction,
  while numeric sources return the signed difference at the requested lag.
- Drawing receiver calls with a resolved semantic kind carry the builtin name into
  runtime dispatch. Unknown receivers retain family resolution; both routes evaluate
  arguments before missing-handle checks and read live drawing state in the builtin.
- There is one Pine evaluation path: compiled codegen. `executeScript(...)` in
  `compiledOnly.ts` is a public wrapper around `executeCompiledScript(...)`, not
  an interpreter or semantic alternative. A compiled-versus-interpreter
  differential over corpus scripts is therefore tautological unless a genuinely
  separate evaluator is reintroduced; it only proves the compiled path agrees
  with itself.
- Backend selection is centralized in `src/runtime/backendSelection.ts` and
  `executeSelectedTealscriptBackend(...)`. Hosts pass an explicit override first,
  then their safe default. Web/worker/CLI default to compiled. Mobile must fail
  loudly until the hidden-WebView compiled host lands. `RuntimeProfile` keeps
  `executionMode` as the actual path that ran and adds
  `selectedBackend`/`backendSelectionSource` so fallback and rollout state are
  visible without inferring from messages.
- TradingView v6 capture-backed cross and direction state: `Crossover`,
  `Crossunder`, and `Cross` retain the last complete nonmissing operand pair;
  missing current operands return false without overwriting that pair.
  `Rising` and `Falling` count consecutive strict adjacent chart-bar changes,
  resetting on equality/opposite direction and retaining the count when either
  comparison operand is missing. They update the previous sample even when it
  is missing, so the first valid sample after a hole does not bridge the hole.
  These rules are established by the 2026-10-03 `na-holes-crosses-v1` TradingView
  capture, whose results contradict interpreting the reference prose as a
  current-extrema test or literal previous-chart-bar comparison across holes.
  `ta-cross-direction-oracle.test.ts` pins hand-built examples, compiled calls,
  and save/restore/recompute behavior; it imports no capture CSV data.
- `src/semantic/checker.ts` — Semantic diagnostics for pasted scripts. Unresolved imports, builtin binding errors, UDF qualifier mismatches, and typed assignment errors must retain line/column and symbol-specific messages.
- `map.put_all` validates the source `id2` as a map reference for namespace and
  receiver calls using the resolved builtin signature. Missing references,
  unresolved UDF arguments, and same-spelling user methods retain their existing
  admission; this check does not impose map template or storage policies.
- Source-aware values passed into shared engine builtins must use the
  engine-recognized `__tealscriptKnownSource` wrapper. TA/input helpers rely on
  that shared wrapper to recover the backing series for calls like
  `ta.ema(close, n)`.
  Generic legacy `input(close, ...)` preserves source identity through its
  first positional `defval` argument; treating it like an ordinary scalar input
  silently flattens downstream TA output.
- RSI uses the published upward/downward RMA ratio after warmup: zero gain and
  zero loss produce `na`, while positive gain with zero loss produces 100.
  This ratio rule does not change the separately measured source-hole policy.
  In Pine v5+, RSI length requires an integer kind as well as a simple-or-weaker
  qualifier; an integer-valued float such as `3.0` is refused. Pine v4's separate
  float overload eligibility remains unchanged by this integer check.
  Pine v3/v4 RSI named slots `x`/`y` canonicalize to `source`/`length` for both
  constructor and compute arguments, including input-backed lengths. The shared
  builtin parameter rename table governs this binding; user-defined `rsi` calls
  retain their own parameter names, and v5+ rejects legacy slots.
- The builtin bare `dotted` hline style name belongs to Pine v3; v4+ requires
  `hline.style_dotted`. A local variable named `dotted` still shadows the builtin.
  This name-migration diagnostic leaves versioned raw string style acceptance
  and the separate unique-style type and qualifier contracts intact.
- Commit `39757006c2` deliberately changed invalid TA lookback lengths from
  silent normalization to loud reference-correct refusal. TradingView documents
  that TA lengths cannot be zero; non-finite, fractional, zero, and negative
  runtime lengths now error. Corpus output counts for v5, v6, or v7 may drop at
  or after this commit because we stopped producing plausible wrong output for
  scripts TradingView refuses. Treat that as expected, not a regression, and do
  not revert this behavior to improve corpus output numbers.
- Positive literal indicator `calc_bars_count` adds a Calculated bars input in
  Calculation. Selection rebases script history and indices; output projection
  aligns chart series/drawings, and realtime bars continue from the initial origin.
- Bare legacy `exp(x=...)` uses the shared v4 parameter-rename table to bind
  `x` to the runtime `number` slot. Modern `math.exp(number=...)` refuses `x`;
  legacy `exp` refuses the modern named slot while positional calls keep position.

- `na()` selects its documented return overload: numeric arguments up to
  `simple` return `simple bool`; series numeric and nonnumeric arguments
  return `series bool`. It does not preserve const/input qualifiers.
- `float(na)` returns `const float`; the cast supplies the qualifier when
  an untyped `na` argument has none. Defined arguments retain their qualifier.
- The six `size.*` constants infer `const string`, so ordinary inferred size
  variables can widen on string reassignment. Explicit const declarations still
  forbid reassignment, and numeric values cannot replace the inferred string.
- In v6 an unqualified scalar reassigned with := or a compound operator is
  series even before its first reassignment. The semantic prepass resolves
  declaration scope and local shadows, and root/UDF inference uses the same
  declaration type. Explicit qualifiers retain their existing constraints; v5
  keeps the documented older mutable-constant inference behavior.


- Bare legacy `exp(x=...)` and `round(x=..., precision=...)` use the shared
  v4 parameter-rename table to bind `x` to the runtime `number` slot.
  Modern `math.exp`/`math.round` require `number` and refuse `x`; legacy
  calls refuse the modern named slot while positional calls keep position.
- `fixnan()` always returns a `series` value of its source kind, including
  const/input/simple numeric and color sources. Checker and semantic
  invariant inference preserve this documented return floor. Its source admits
  numeric/color values and the legacy v5 bool overload; strings, drawings, and
  collections are refused by semantic argument checks.
- User-function `polyline` parameter annotations require a polyline argument,
  independently from qualifier restrictions. Valid polyline references preserve
  their series kind through a typed identity function.
- `syminfo.prefix(symbol)` returns `simple string` for const/input/simple
  symbols and `series string` for a series symbol. The prefix overload follows
  argument qualifiers independently from sibling syminfo functions. Its symbol
  argument must be a string for both positional and named calls.
- `ta.highestbars:length` and `ta.lowestbars:length` also require integer kinds
  through the series qualifier. A lone positional argument to a default-source
  extrema helper binds to length consistently in static checks.
- Legacy `round_to_mintick(x=...)` binds through the shared v4 rename table
  to the runtime `number` slot. Modern versions require `math.round_to_mintick`
  and its `number` keyword; positional calls retain their order.
- Array percentile percentage numeric checks use the resolved builtin name for
  namespace and receiver calls, while signature lookup retains the raw callee
  to preserve receiver binding and user-method shadowing.
- Native v3 bounds01–04 require TA nearest/linear percentile percentages outside
  [0..100] to raise runtime errors, including before warmup. Preserve missing
  percentage handling separately; invalid finite values must not be clamped.
- Positive literal indicator `calc_bars_count` adds a Calculated bars input in
  Calculation. Selection rebases script history and indices; output projection
  aligns chart series/drawings, and realtime bars continue from the initial origin.
  Select once in the outer execution wrapper, including zero input overrides;
  the inner pass receives the already selected bars. Preserve the historical
  cutoff from confirmed transition indices or exclude the active realtime bar.
- Bare legacy `exp(x=...)` uses the shared v4 parameter-rename table to bind
  `x` to the runtime `number` slot. Modern `math.exp(number=...)` refuses `x`;
  legacy `exp` refuses the modern named slot while positional calls keep position.
  Math argument-kind dispatch canonicalizes bare aliases before consulting the
  existing numeric parameter table; a legacy named binding cannot bypass it.
- Legacy `sqrt(x=...)` binds the published `x` slot through the shared rename
  table. Modern `math.sqrt(number=...)` and legacy calls refuse each other’s
  renamed slots; numeric kind checks apply after canonical binding.
- Pine v6 `ta.wma` and `ta.rma` lengths require integer kind and reject
  integer-valued float literals. WMA retains its documented series-int length
  classification and joins the shared integer-derived division admission and
  call-boundary truncation mechanism; RMA retains its simple ceiling.
  Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.wma
- Generic `matrix.new<T>` checks an explicit `initial_value` against `T` using
  assignment compatibility, including integer promotion and matching reference types.
- Each library version can be imported once. Import owner, library and alias
  identifiers reject `as` and `import`; host registry resolution remains required.
- Native v3 refuses a Pine v6 `const string` initialized directly with `na`
  as a simple-na qualifier mismatch; nonconst missing strings remain valid.
- Native v3/v5 captures admit direct integer-operand division initializers for
  `int` declarations in v5/v6, including v6 const/input operands. Native target
  values retain fractions; float operands remain refused. Runtime arithmetic is unchanged.
- Published v4 `log`, `floor`, and `cos` named `x` arguments use the shared
  parameter rename table. Modern names remain `number` and cosine `angle`;
  legacy `x` is refused after the v5 namespace migration.
- In v6 an unqualified scalar reassigned with := or a compound operator is
  series even before its first reassignment. The semantic prepass resolves
  declaration scope and local shadows, including each tuple-declared binding;
  an unchanged tuple sibling retains its qualifier. Root/UDF inference uses the
  same declaration binding type. Explicit qualifiers retain their existing constraints; v5
  keeps the documented older mutable-constant inference behavior.
- Legacy `tostring(x, y)` uses the v3/v4 named slots x/y. The emitter
  translates only the bare legacy call to the runtime value/format slots;
  modern `str.tostring` keeps the documented value/format names and refuses x/y.
- With dynamic requests disabled, `request.security` and
  `request.security_lower_tf` context strings (symbol/timeframe/currency) accept
  at most simple; their expression still accepts series. Use the declaration
  override or the central v5/v6 dynamic-request default for this static gate.
- Table values are immutable canonical runtime handles; stored drawing IDs remain
  strings. `na()` resolves actual table handles against rollback-aware deleted-ID
  state, including references forwarded through collections, fields, and generic
  functions. Ordinary strings equal to internal table IDs remain strings.
  Table casts accept branded handles with matching allocation-family provenance,
  including deleted handles whose availability remains missing. Plain strings
  matching allocated IDs cannot pass the table cast. `table.all` returns the same handles as table construction. Persistent container
  tracking preserves those immutable values. Table-specific operand type metadata
  and source-descriptor tagging are unnecessary and removed.
  Eligible local collection methods retain the checker's selected declaration
  before receiver builtins; namespace calls retain builtin routing.
- `label.new` defaults text to black before v6 and white in v6, using the
  central `usesV6DefaultColors` rule in both coordinate and chart.point overloads.
  Builtin registries receive the script version in chart and request contexts;
  explicit text colors and explicit na must not be replaced by that default.
- Numeric masks shared by `str.tostring` and `str.format` count integer `0`
  placeholders for leading padding, group the padded integer, and scale custom
  `%` masks by 100 before rounding. Missing numbers remain `NaN` text before
  any padding or percent suffix. Fractional `#` remains optional; fractional
  `0` remains required. The `str.format` percent keyword keeps its own behavior.
- Returned local tuples share one qualifier across every member: at least simple,
  or series when any member or conditional/loop control is series. This applies
  to functions, methods, if/switch and loops; preserve each member's value kind.
  A constant length beside a series price cannot bypass a simple-only TA slot.
- `ta.sma:length`, `ta.stdev:length` and Pine v5+ `ta.dev:length` accept integer
  values at every qualifier, including series, but reject float kinds even when
  an integral literal such as `3.0` is used. Dev sources accept int and float.
  Use the shared TA integer-kind helper for this static check, separately from
  runtime positive-length validation.

- Native v2 TSI(5,14) uses SMA-seeded, missing-output-masked EMA children
  for both smoothing stages. Startup first publishes at bar18, or bar23 after
  five leading missing sources. Mature source holes40/41 suppress bars40..42;
  retained smoothing state resumes at43. These captures do not settle the
  zero-momentum denominator rule or every length/hole pattern.
- Pine v6 `ta.tsi:short_length` and `ta.tsi:long_length` require integer kind, preserving their
  existing simple-or-weaker qualifier ceiling and numeric source slot. Its
  member-specific entries reuse the shared TA integer-parameter map and helper.
- V5/v6 correlation, percentrank, MFI and CCI lengths likewise accept every
  integer qualifier and reject float kinds in positional and named calls.
  Their numeric source admission and runtime arithmetic remain separate rules.
- Pine v5+ `ta.ema:length` additionally requires integer kind, including when a
  float value is integral (`3.0`). Its source still accepts int/float and its
  existing simple-or-weaker length qualifier rule remains separate. Positional
  and named arguments use the normal signature binder; an explicit `int(...)`
  cast permits a float expression as a length. Do not generalize the EMA kind
  constraint to other TA slots without checking their reference declarations.
- Pine v6 `ta.cmo:length` uses that same integer-kind check and retains every
  integer qualifier. This selector does not change older-version admission.
- CMO returns `na` when its total upward/downward movement is zero, matching
  the reference's same-on-Pine ratio. Native v1 oscillator captures also match
  its two independent `Sum` windows: `change >= 0 ? change : 0` for gains and
  `change >= 0 ? 0 : -change` for losses. A missing adjacent change adds a zero
  to gains while the loss window skips `na`; retain the previous raw source,
  including `na`, instead of connecting non-adjacent finite sources. CMO
  rollback snapshots include that previous source and both sum windows.
- Pine v6 `ta.median`, `ta.mode`, and `ta.mom` also require integer-kind
  lengths at every qualifier. Their numeric source slots remain unchanged.
  Integration must retain these narrow selectors alongside SMA/HMA and other
  owners' integer-parameter selectors; reuse the shared argument-kind helper.

- `na()` selects its documented return overload: numeric arguments up to
  `simple` return `simple bool`; series numeric and nonnumeric arguments
  return `series bool`. It does not preserve const/input qualifiers.
- Builtin argument qualifier checks use the same declaration tables as UDF
  inference, but the TA table must be derived per parameter from TradingView's
  live reference `allowedTypeIDs`, not generalized from the `ta.ema()` example.
  Declared Pine v5 direct `ta.*` simple-only enforcement covers 21 parameter
  slots; v6+ covers those plus `ta.rci:length`. Common TA length slots such as
  `ta.sma`, `ta.highest`, `ta.lowest`, `ta.correlation`, and `ta.vwma` are
  documented as accepting `series int` lengths in both v5 and v6 and must not
  be refused. `ta.lowest` length checks also require integer kind, including
  the default-low and named overloads; integer-valued floats are refused.
  Direct `input.*` default values still reject `input`, `simple`,
  or `series` values where the typed input helper requires a `const` `defval`.
  Input titles, tooltips, inline/group identifiers and `confirm` also require
  `const` values. The `active` parameter accepts `input bool` or `const bool`;
  admitting a correct base type must not bypass these qualifier checks.
  `nz()` has `simple` and `series` return overloads for numeric/color sources
  (and booleans before v6). Const/input arguments therefore return at least
  `simple`; a series source or replacement produces a series result.
  Numeric `int()`/`float()` casts accept int/float or unavailable values,
  preserving the argument qualifier. Reject bool/string/color arguments before
  JavaScript coercion can turn an invalid Pine cast into a plausible number.
  Color constants emit their actual hex value using the script version's
  palette. Pre-v6 red/teal/yellow differ from v6; preserve that value through
  inputs, color functions, comparisons and plotting rather than a color name.
  Native v6 CF009 captures settle `color.blue` as `#2962FF` (RGB 41/98/255).
  Native v4 capture bundle drawing-default-blue-v5-v1 also settles v5 blue
  as `#2962FF`, including box border/background and polyline defaults.
  The earlier-version blue palette remains unchanged; those captures do not adjudicate
  earlier Pine versions.

  `ta.atr:length` and `ta.highest:length` require integer kind in v5/v6;
  integer-valued floats are refused independently of qualifier ceilings.
  Highest continues to accept const, input, simple, and series integer lengths.
  The earlier six-row TA blast-radius report was a false refusal measurement:
  it judged documented-series TA length calls against one builtin's simple-only
  rule.
- `math.round` rounds halfway magnitudes away from zero, including negative
  values and decimal precision; native v2 math captures pin that tie rule.
- Two-argument `math.round` preserves the number argument's qualifier when
  precision is const, input, or simple; series precision produces a series float.
  Native CF016 captures confirm const/input results despite simple precision.
- Pine v6 math integer slots require int operands: round precision, random seed,
  and sum length. Other numeric operands and older-version admission are unchanged.
- Mintick decimal compensation cannot move an exact tick or a clear non-tie
  to a farther tick; the existing decimal half-tick controls retain compensation.
- `syminfo.ticker(symbol)` selects its series-string return overload for a series
  symbol; constant, input, and simple symbols select its simple-string overload.
  Both overloads require a string-kind symbol argument.
- `timeframe.in_seconds` returns `series int` for a series-string argument;
  constant, input, simple, and omitted arguments select its `simple int` overload.
- `hline()` requires a const title and rejects simple or series arguments.
  Price, linewidth, and editable flags accept input or const values; constant
  colors remain valid. Positional and named bindings share the qualifier check.
- TA and array numeric argument checks resolve receiver-method names before
  selecting namespace rules. Arrays returned by calls accept series percentile
  percentages; actual TA percentile calls retain their simple-only percentage
  ceiling. Array percentage arguments still reject strings in all call forms.
- Corpus and differential measurements must suspect the instrument before
  trusting a surprising uniform movement. Tonight's false/incomplete instruments
  included the external consensus plot-count ceiling, missing syminfo context,
  output-family under-capture, JavaScript string coercion inherited by both
  external voters, a qualifier blast-radius classifier that treated
  `int()`/`float()`/`bool()` casts as `input.*` constructors, and a shipped TA
  qualifier table that generalized the `ta.ema()` simple-length example across
  documented-series TA length parameters. Durable gates beat note-shaped
  conventions, but the gate's input data still needs suspicion.
- Direct Pine v5+ `ta.hma()` lengths must have integer kind as well as a
  `simple`-or-weaker qualifier. An integral float such as `3.0` is still a
  float and is refused; `int(3.0)` is eligible. This member-specific check
  uses the shared builtin argument-kind helper and does not constrain the
  numeric source or change HMA arithmetic.
- Native v2 HMA uses `floor(sqrt(length))` for its final weighted window:
  length14 uses3, and length3 uses1. Native clean and leading-missing captures
  establish the seed position and output values. All three HMA children use
  WMA's fixed chart-slot mode: missing slots repeat the last valid source for
  weighting, current missing values publish `na`, and warmup counts valid
  samples. Advance the final child even when either input child publishes `na`.
  Native length2/5/14 hole captures establish this composition; preserve the
  WMA snapshot's last-source and valid-count state during save/recompute.
- Native v2 SAR begins with `na` on bar0, initializes its direction from the
  second close versus the first, then projects and tests reversal before
  clamping against previous high/low extrema. Reversal uses the current
  extreme as well as the prior trend extreme and resets acceleration; the
  first trend bar does not increment it. Close and sample count are part of
  compute/recompute/save/restore state. This order is verified against all six
  routed native SAR columns, rather than inferred from a generic SAR formula.
- Semantic builtin rules are especially prone to partial implementation:
  argument type checking first missed only `array.percentile_*` while sibling
  numeric builtins already refused strings; direct builtin qualifier checking
  missed the live-reference-derived TA simple-only slots while UDF inference
  already carried the same table; and builtin return checking missed 114
  side-effect `void` returns while array mutators and `map.clear()`/
  `map.put_all()` already refused assignment. Treat these as one transferable
  defect shape: a shared Pine rule implemented for some members and not others,
  masked by the correctly handled siblings. Prefer reference/declaration-table
  derived sweeps over member spot checks when auditing semantic builtin
  coverage, and verify each parameter's declared qualifier rather than
  generalizing across a namespace. The array-mutator `void` path is not limited
  to that v5+ 114-name cluster: declared-v4 `array.push()` used as a value is
  correctly refused too.
- Parser continuation edge recorded on 2026-09-12: a single-line UDF header
  such as `f(x) => x` is no longer treated as assignment-like by
  `startsWithAssignmentStatement`, so a following zero-indent leading `+`/`-`
  can attach as a binary continuation. Both reported parses are invalid Pine;
  do not chase this without a valid-script trace or corpus row.
- Explicit matrix `get`/`set` namespace calls retain their supplied ID when a
  variable is named `matrix`; receiver syntax still omits that ID argument.
- Generated expression-source series for optimized `ta.sma(...)` calls must be
  updated at the call site, after the declarations that feed the source and
  length have executed. Pre-updating those hidden series at the top of `onBar`
  makes nested public-script shapes such as `sma(stoch(src, high, low, period),
  smooth)` construct `stoch` with the previous bar's input-backed length, which
  appears as an invalid `na` TA length once silent length coercion is removed.
- Native `ta.percentrank` compares the current value against the preceding
  `length` raw bars, after `length + 1` bars exist. Missing comparisons count
  as false; the denominator remains `length`, including a missing current value.
- History reads in generated backends must normalize missing identifier or
  built-in series history to Pine `na` (`Number.NaN`), not JavaScript
  `undefined`. Public legacy accumulators rely on `nz(local[1])` seeding from
  zero on the first bar, and drawing constructors rely on `bar_index[1]`
  resolving to the previous bar coordinate instead of `na`.
- History offsets are Pine integer offsets. Truncate fractional offsets toward
  zero before reading history; finite negative offsets raise a history runtime error.
- Indicator `calc_bars_count` restricts the initial historical dataset to its
  most recent bars before state and history are initialized. Zero or a count
  covering all history preserves the full dataset. Keep realtime bars after the
  historical window and rebase explicit host realtime indices with the window.
- Declaration `max_bars_back` is a minimum history depth; a deeper static `[]`
  reference increases the general runtime buffer beyond that minimum. Generated
  history series need one current slot plus the provisioned history depth.
  The explicit host `maxBarsBack` option still controls the runtime offset limit.
  `max_bars_back(var, num)` is target-scoped and sizes only that series.
- Indicator `max_bars_back` accepts constant integer depths from 0 through 5000,
  including constant arithmetic and aliases. This declaration range does not
  replace adaptive history growth or the explicit host execution limit.
- Generated history buffers include one current slot in addition to past values.
  Declaration `max_bars_back` and `max_bars_back(var, num)` set initial minimum
  depths; function hints apply only to their targets. Historical dynamic reads
  can grow individual buffers and restart execution with fresh state and outputs.
  Stable buffer keys include UDF call paths and survive rollback. Realtime reads
  cannot grow buffers: their limits are each series' greatest historical offset
  or explicit minimum. Most series stop at 5000 past bars; builtin OHLC/time
  series allow 10000. Host `maxBarsBack` remains a hard execution limit.
  Requested runtime timestamp history uses the same adaptive buffer check as
  chart timestamp history; emitted per-series hints are minimum depths, rather
  than hard limits. Each requested evaluator retains its own sizing/retry state.
- The `max_bars_back()` function's `num` has a 5000 ceiling. Literal values
  above it receive a semantic diagnostic; compiled execution enforces the
  same limit for values that reach runtime.
- Its `num` argument requires `const int`: input/simple/series integers and
  float/string/bool values receive semantic diagnostics, including named
  argument calls. Integer constant expressions remain admissible.
- Direct derived-price builtins (`hl2`, `hlc3`, `ohlc4`, `hlcc4`) cannot be
  `max_bars_back()` targets; checker and compiler refuse them. Size their
  underlying OHLC series or a stored user-variable series instead.

  Requested runtime timestamp history uses the same adaptive buffer check as
  chart timestamp history; emitted per-series hints are minimum depths, rather
  than hard limits. Each requested evaluator retains its own sizing/retry state.
- Non-identifier history expressions in generated backends, such as
  `ta.highest(high, 2)[1]` or `(close - open)[1]`, are per-call-site series.
  Treating them as unsupported runtime errors drops plots/alerts on public
  scripts.
- Generated backend bar runners must not treat ordinary statement return
  values as halt signals. Historical execution stops for `runtime.error`
  exceptions, not because a plotting or expression statement evaluated to
  boolean `true`.
- Native v3 scalar-07 accepts repeated identical `table.merge_cells` ranges
  without an anchor reset, contradicting the reference already-merged-cell
  error remark. Identical merges preserve one existing range. Distinct overlap
  refusal is retained; these captures do not settle arbitrary overlaps.
- `line.get_price` rejects a live line whose current `xloc` is `bar_time`,
  including after `line.set_xloc`; missing/deleted IDs retain their `na` result.
  The documented coordinate error is public and must not be swallowed.
- RCI distinct ranks use population covariance divided by the product of the
  population standard deviations before the final percentage division. Native
  len14 captures pin this order; tied-rank arithmetic and storage stay separate.
- LinReg accumulates oldest-to-newest with one-based x coordinates and keeps
  `sumY / n - slope * sumX / n + slope` as the zero-based intercept. Native
  fixed/dynamic/offset captures pin this operation order without a tolerance.
- Traditional pivot R3–S5 preserve the grouped arithmetic in TradingView’s
  Pivot Points Standard formulas; expanding those parentheses changes binary64
  values. Native coverage-ta-4 pins both regular and suppressed anchors.
  len14 captures pin this order. Tied ranks retain average ordering and use the
  zero-based rank second moment minus squared mean for price variance, then the
  same population normalization. Startup, missing slots and snapshots are unchanged.
- `ta.pivot_point_levels` rejects `type="Woodie"` with `developing=true`
  at execution, independently of the anchor, per the v6 reference remarks.
  Native v3 bounds-07 and scalar-05 confirm invalid-type and Woodie/developing
  runtime refusals on bar0; preserve both guards when merging original fixes.
  This guard does not establish numeric parity for the pivot formulas.
- Formatting calls validate unquoted braces at execution. `str.format` allows
  unmatched right braces per its reference; formatted `log.*` requires both
  sides balanced. Apostrophe quotes protect literal braces/placeholders and
  doubled apostrophes emit one apostrophe. Plain one-argument logs are literal.
  These documented errors use `runtime.error`; no TV numeric code is inferred.
- `ta.hma(source, 1)` raises captured Pine `RE10001` on its first executed
  call: the internal half-length WMA receives zero. Keep this check in HMA
  computation, because generated call sites are constructed eagerly and
  skipped calls must not fail. The public error includes the execution bar
  index and the internal `wma` argument message, even when source is `na`.
- Barstate at compiled bar boundaries is composed in `executeCompiled()` before
  the emitted `onBar()` sees the bar. When a run includes a realtime last bar,
  the immediately preceding historical bar is
  `barstate.islastconfirmedhistory`; that boundary exists even when the host
  uses only `realtimeLastBar` rather than an explicit confirmed-realtime start
  index. That historical predecessor is **not `barstate.islast`**: the realtime
  bar follows it and owns the chart-last flag. Keep this transition aligned with plot/history output replacement:
  user code must observe the settled barstate before it writes series,
  strategy, drawing, or plot output for that bar.
- Generated backend assignment emission must route expression-valued RHSs
  through the normal assignment writer rather than assigning directly into an
  emitted read expression. History-read variables and UDT fields can compile to
  reads such as `series.get(0)` or field getters; those are values, not
  JavaScript lvalues.
- Selected switch arms ending in assignment execute the normal assignment writer
  and return the updated value; standalone switches retain those side effects.
- Generated switch arm statement blocks are expression-valued: if the selected
  arm's final statement is a nested `if`, loop, or expression statement, that
  final selected value is the switch value. Do not lower unsupported tail
  statement shapes to `na` without a value-vector or trace-backed reason.
- Crossunder's legacy v4 named slots are `x`/`y`, renamed `source1`/`source2`
  in v5. Checker signatures enforce the version boundary; TA compute-argument
  binding preserves reversed and mixed positional/named calls. Numeric type
  validation resolves those same versioned slots before checking each operand.
- Value-vector expected-reds are an executable register, not a parking list.
  Every `EXPECTED_VALUE_VECTOR_FAILURES` entry must include an owner lane, a
  reason (`trace-required`, `other-lane`, or `open-defect`), and a named
  `openDefect` when it is fixable. The value-vector gate fails entries that
  omit this metadata.
- `tests/compat/versionBooleanReference.test.ts` pins documented version
  boundaries with independent plot values and named `it.fails` defects.
  Ordinary passing cases require a breaking implementation mutation observed
  failing; expected-reds require the inverse proof: a documented engine patch
  in an isolated copy must make the unchanged assertions pass. Discard proof
  copies; a defect-fix lane converts each repaired expected-red to an ordinary
  test in the same commit. V6 bool declarations initialized with literal `na`
  are refused just like reassignment; v5 declarations retain their `na` state.
  Typed bool UDF defaults also preserve `na` in v5 while v6 refuses it;
  explicit false/true arguments remain distinct from an omitted argument.
  Logical operand lowering follows `usesLazyLogicalOperators`: v3-v5 evaluate
  both operands before combining truth values; v6 evaluates the RHS only when
  needed. Ternary expressions remain lazy in both versions.
  Its math-rename sibling checks v4 legacy calls, modern positional/named
  calls, and modern legacy-name refusals against literal mathematical values;
  preserve negative/fractional and reordered-parameter discriminators.
  The visual-version sibling separates v5 acceptance from v6 refusals and
  uses nonmonotonic offsets to discriminate whole-chart last-value metadata
  from first/min/max selection. V6 visual offsets require const/input/simple
  qualifiers; series offsets remain valid in v5. Preserve initializer qualifiers
  on unqualified typed declarations so typed series offsets are also checked.
  `bgcolor` follows the same transp version boundary as plot/fill/markers:
  the argument is accepted by legacy v4/v5 signatures and refused in v6.
  Pine v5 plot/hline linewidths permit negative integers; fractional widths
  remain invalid. The v6 lower bound remains one in `pineVersionRules.ts`.
  V5 `plot()` updates its scalar offset metadata on each call, applying the
  final computed offset to every source value. This rule is scoped to v5 in
  `pineVersionRules.ts`.
  The input-split sibling pins legacy selectors and modern inferred input
  types, including a color literal versus an identical quoted string; do not
  infer color input types from runtime string contents.
- New value-vector cases must carry red-first discrimination metadata unless
  they are explicitly listed in
  `reports/pine-value-vector-red-first-exemptions-v1.json`. There is no
  coverage-snapshot grandfather baseline: `run-pine-value-vectors.ts` is new in
  this PR, so `pine-value-vectors-coverage-v174.json` is not a pre-rule
  baseline. The exemption report is closed-ended: its checker fails on drift
  and does not add rows automatically, so a new exemption must be a deliberate
  tracked edit. A valid proof must assert bar-count output length and include a
  value-flipping mutation (`flip-first-value` or
  `flip-first-non-null-value`) that the gate verifies would make the case fail.
  Length-only mutations such as truncating or dropping an output are not
  accepted as proofs. Null-output expected diagnostics/expected reds are
  unprovable by output mutation and must stay on the exemption list until they
  have a different discriminator. New helper-derived expectations must also
  cite a concrete published formula, reference composition, or equivalent
  implementation; broad family-level docs are not enough for new helper
  vectors.
- Generated JavaScript identifiers and state member suffixes must be escaped
  from Pine names at emission time. Pine permits names such as `delete` that
  are JavaScript syntax errors when emitted raw, and the same escaping must be
  used for locals, UDFs, loop counters, state slots, snapshots, and history
  members. UDF parameter locals and ordinary UDF body locals also need
  generated-private prefixes so Pine names like `ctx`, `_state`, etc. cannot
  collide with hidden generated parameters.
- Root-block regular declarations bind after their initializer, so earlier `:=`
  still targets the enclosing variable. Give nested shadows distinct generated
  names and prevent local assignments from writing the outer history buffer.

- Generated for-in index and value counters use the private local-name prefix,
  so Pine names such as `_i` cannot shadow generated iteration state.

- Stateful runtime builtin IDs include the complete written UDF call path, including nested callers.
  UDF `fixnan` memory belongs to that function state and is copied by root and child snapshots.
  `nextBuiltinCallId` emits a JavaScript expression, including its own string
  quoting; insert it directly, including VWAP's synthesized daily anchor.
- Generated UDF local lookup is block-scoped for regular locals and
  function-scoped for `var`/`varip` state. Public libraries use a temporary
  `sum` during scale initialization and a persistent `sum` accumulator later in
  the same function; binding either name at the wrong scope corrupts history
  and output.
- A scalar declaration at the end of a UDF returns the declared identifier,
  including `var`/`varip` declarations, after evaluating its initializer once.
  The name need not match the function name. The verbatim official `ta.stdev`
  example in `udf-terminal-declaration.test.ts` guards this path. Final branch
  identifier assignments and scalar declarations also supply the block result
  after their single evaluation; this is required by the example's nested `SUM`
  helper. Direct identifier assignments and tuple declarations retain their
  separate returns.
- Generated user-function overloads need distinct internal identities by
  callable argument shape. The semantic checker accepts `hl()` and `hl(bar)` as
  separate UDFs; codegen must not key both bodies under the bare display name or
  runtime calls select whichever overload was registered last.
- Declared UDF collection parameters validate array/matrix element types and
  map key/value types for positional and named arguments before execution.
- `matrix.mult` namespace return inference reads canonical `id1` and legacy
  `id` as the first matrix argument, including reordered named arguments.
  The second operand selects scalar/matrix versus array-vector return kind.
  Numeric scalar sum/diff/mult preserves the first matrix's element metadata;
  matrix/array operands retain numeric promotion. Native v7 integer-matrix sum
  with 0.5 retains matrix<int> metadata while exporting raw value 1.5.
  Numeric matrix assignments require matching element kinds; primitive
  integer-to-float assignment remains separate.
- Compiled collection lowering must preserve Pine collection wrappers and Pine
  argument ordering. Array literals are Pine arrays, collection receiver
  methods use the same ordered arguments as namespace calls, and collection
  history reads must not be confused with array element indexing. Receiver
  methods reached dynamically, such as UDT-field arrays, still need Pine-to-JS
  helper-name aliases (`indexof` -> `indexOf`) before dispatch.
- Compiled array get/set/insert/remove calls enforce `allowsNegativeArrayIndices`
  for namespace and receiver forms: negative indices are accepted in v6 and
  rejected in earlier versions; missing indices retain their existing behavior.
- `array.shift()` and its builtin receiver method return a `series` value of the
  stored element kind. Preserve the element metadata while giving this mutable
  collection read its documented qualifier; constructor seed qualifiers do not
  make the removed value `const`, `input`, or `simple`.
- Float array constructors (`array.new<float>` and `array.new_float`) check
  supplied `initial_value` arguments through the existing signature binding and
  float assignment rules. Int seeds promote to float; omitted/`na` seeds and
  unknown types retain their existing handling. This check is constructor-only.

- Compiled array get/set/insert/remove calls enforce `allowsNegativeArrayIndices`
  for namespace and receiver forms: negative indices are accepted in v6 and
  rejected in earlier versions; missing indices retain their existing behavior.
- `array.new_line` and `array.new_box` use that same validator for supplied
  `initial_value`: require a matching reference kind, including reordered named
  arguments, while preserving omitted/`na` seeds and namespace shadows.
- Compiled array get/set/insert/remove calls enforce `allowsNegativeArrayIndices`
  for namespace and receiver forms: negative indices are accepted in v6 and
  rejected in earlier versions; missing indices retain their existing behavior.
- Negative `array.insert()` indices identify the same end-relative element
  coordinates as `array.get()`/`array.set()`: translate with `size + index`,
  then insert before that element. `-1` inserts before the last element and
  indices below `-size` still throw; adding one silently appends or admits an
  extra invalid negative coordinate.
- `array.binary_search_leftmost()` returns zero for a target below the
  first value of a nonempty sorted array, as specified by the v6 reference.
  Interior misses return the predecessor index; the empty-array result remains
  unchanged because the reference does not specify it.
- AST membership caches are scoped to one analysis/emission/compilation. Analyzer
  membership still uses serialized structural matching for cloned request
  expressions; emitter membership uses source-object identity. Security owner
  indices keep the first parent statement, and request-function summaries are
  shared across that compilation's subprograms. Recompiling a mutated AST must
  build fresh caches, without changing captured dependencies or generated code.
  Local TA evaluation membership is indexed once per `emit()` call, retaining
  conditional branches, loop/function bodies, switch cases and logical right
  operands. Shared AST objects are promoted if later reached from a local subtree.
  The local-evaluation index also skips `loc` metadata while retaining AST
  locations for diagnostics.
  Function body/default call-presence predicates are also cached for that
  emission; recursive called-function state traversal keeps its original seen set.
- IANA offset lookup reuses at most 64 successful `Intl.DateTimeFormat` instances
  by timezone, evicting the oldest entry when full. It still converts every
  timestamp separately, including DST transitions and fractional-hour offsets;
  invalid zones retain the existing UTC fallback and are not cached.
- Eigen QR iterations reuse workspace arrays within one calculation, including
  projection vectors, Q/R factors, and alternating matrix products. Arithmetic
  order, eigen ordering, tolerances, the 128-iteration limit, and approximation
  reports remain unchanged. Workspace never survives a call or caches mutable
  Pine matrices; input values must remain untouched.
- Collection templates cannot directly contain arrays, matrices, or maps. The
  checker rejects nested collection element/value templates in declarations,
  constructors, fields, and parameters; use UDT fields to wrap inner collections.
  Enum map keys remain valid in standalone maps and in those UDT fields, per
  the [Maps manual](https://www.tradingview.com/pine-script-docs/language/maps/#maps-of-other-collections).
- Array helper signatures must keep live v6 parameter names and compatibility
  aliases in sync between semantic binding and codegen ordering. In particular,
  `array.concat(id1, id2)` still accepts legacy `id=` as `id1`, and
  `array.binary_search*()` uses live `val`/`sort_field` while preserving
  `value=` as an alias. `sort_field` must reach the runtime helper for UDT-field
  comparison; accepting the named argument and then comparing whole objects is a
  silent binding defect.
- Integer arrays retain the documented integer scalar overloads for `sum`,
  `range`, and `percentile_nearest_rank`, including arrays returned by matrix
  rows/columns and map keys. These scalars retain their series qualifier;
  float arrays return series float values.
  Resolve those array receivers before bare TA aliases, including when the
  receiver is itself a call result.
- Actual builtin `array.avg()` namespace/receiver calls infer a `series int`
  result for integer arrays and `series float` for float arrays. Keep that
  inference separate from same-name user methods and from runtime averaging:
  integral-mean witnesses do not settle fractional integer rounding.
- Live-reference integrity comparisons must include zero-argument callable
  entries and normalize packed variadic labels such as
  `number0, number1, ...` on both sides before diffing. Otherwise the report
  invents snapshot-extra rows for documented functions like
  `strategy.cancel_all()` or variadic helpers and sends people toward false
  removals.
- Sized `array.new*()` calls without `initial_value` fill elements with Pine
  `na` (`Number.NaN`), not JavaScript `undefined`; `array.get()` must expose
  those elements as `na` while ordinary out-of-bounds reads still throw.
  Pine v6 boolean constructors (`array.new_bool` and `array.new<bool>`) instead
  default to `false`; codegen must retain the element type when supplying this
  default. Explicit initial values and legacy versions' boolean `na` defaults
  are preserved.

- `array.from()` compiler argument limits are 4000 for int/float/bool/color
  elements and 999 for other known element types, including UDTs and enums.
- Array UDT sorting resolves its omitted field once for the collection, then
  rejects missing object IDs. Numeric na values and valid objects with na
  sort fields remain sortable in both directions.
- Collection namespace calls require a collection reference for their first ID
  argument; known scalar arguments receive semantic type diagnostics.
- Numeric array and matrix helpers require int or float collection elements
  in their first ID or receiver; known bool/string/UDT element types are refused.
  Unknown element types retain deferred validation.
- `array.covariance()` also requires a numeric array for `id2`, through namespace,
  named and receiver calls. Known nonnumeric arrays and nonarray values are
  refused; unknown element types and missing references retain deferred checks.
- Native v2 array population variance uses the ordered mean of squares minus
  the squared mean; stdev takes its square root. Keep results nonnegative,
  retaining NA filtering and existing sample-variance arithmetic. The six captured
  coverage-collections-1 columns pin binary64 results, not a tolerance.
- Array `stdev`, `variance` and `covariance` validate `biased` as a bool through
  namespace, named and receiver calls. They reuse the existing version rule for
  v5 numeric-to-bool coercion and v6 refusal; matching UDT methods stay independent.
- UDT arrays retain element metadata through typed construction, `from`, copies,
  slices and typed UDF/field/matrix expressions. `sort`/`sort_indices` reject
  missing UDT IDs even in singleton/all-na arrays; numeric na and empty arrays remain valid.
- UDT matrix provenance survives `transpose` and `concat`, including named `id1`,
  before row/column extraction. In-place `reverse`, `copy` and `submatrix` retain
  the same distinction between missing object IDs and numeric na during sorting.
- Matching custom UDT matrix methods use their inferred return provenance rather
  than the built-in transform's receiver type; numeric return matrices stay numeric.
  A method missing required arguments or incompatible named bindings cannot replace
  builtin provenance; unavailable numeric elements remain distinct from UDT IDs.
  Overloaded names retain return provenance per matching matrix declaration.
  Eligible local collection methods precede receiver built-ins; namespace calls
  keep built-in routing. Dispatch and UDT provenance share the checker's selected
  declaration for known collection receivers, including argument types. Untyped
  receivers use runtime family checks; declared missing receivers retain their type.
- `array.size` returns series int in namespace and receiver forms, including named
  ID binding; const and simple destinations reject the result.
- `array.get` returns a series-qualified element for namespace and receiver calls;
  const and simple destinations cannot accept that read result.
  Native v3 captures show a missing index returns `na` in Pine v6; the explicit
  warmup guard also preserves published v5 color/search-index shapes. Chart and
  security subprograms share the same getter; finite bounds remain enforced.
- Native v6 CF003 compiler captures reject known int/float arrays passed to
  `array.every()`/`array.some()`, including receiver forms. Bool arrays remain
  admitted; the v6 semantic guard leaves earlier-version behavior unchanged.
- `matrix.is_antisymmetric()` is registered as a builtin receiver method,
  so its zero-argument receiver form gets the same signature validation as
  the namespace form with one matrix ID.
- Native v3 CF019/CF020 distinct captures establish that omitted matrix removal
  selects the last row or column, preserving the order of removed and remaining
  cells. Namespace/named/receiver forms share optional-index signatures and defaults.
- Collection dimensions, occurrence ranks, matrix coordinates and powers,
  and array indices outside `get`/`set`/`fill` require integer arguments in
  semantic checking, including receiver methods and named bindings. Valid
  const/input/simple/series integers are admitted.
- Owning-array `array.indexof()`, `array.lastindexof()`, and `array.includes()`
  search their backing values directly. Copying and validating every element
  before each lookup dominates public market-profile execution even when a
  lookup matches immediately. Slice searches retain their validated, relative
  window so parent mutations and invalidated slice bounds remain visible.
  UDT `elementType` belongs to the public `PineArray` handle, including seeded
  constructors; the private search cache stores values and lookup state only.
- Numeric array stats/transforms use the reference-derived receiver parameter
  table (13 operations), including both covariance inputs, empty arrays, methods,
  and named/alias arguments. Require `array<int>` or `array<float>` before
  execution; empty drawing/UDT arrays returning `na` hide forbidden acceptance,
  while bool/string coercion produces wrong values. Preserve generic array
  helpers and user methods that shadow a builtin stat name. `array.abs` and
  `array.standardize` retain their previous admission because applying the new
  receiver restriction refused sixteen previous-OK corpus sources outside this
  repair scope. That compatibility boundary is not proof of native acceptance;
  their documented restrictions remain an explicit admission gap.
- The request-context budget uses captured binding/call-scope identity, not each
  changing scalar sample. Evaluation caches still use capture values and source
  descriptors. Request-containing UDFs need stable call state even without `var`
  or TA calls, so different written UDF call scopes remain distinct contexts.
- The v5/v6 Arrays manual's “Distance from high” example admits float
  indices for `array.get()`. The reading/writing operations `get`, `set`,
  and `fill` floor their supplied index slots before access or iteration.
  This does not relax collection sizes, matrix coordinates, or other
  integer-only array parameters. Missing-index and versioned negative-index
  rules still apply independently. Fractional `set`/`fill` flooring remains a
  local extension pending the v7 native probe.
- `array.get()` with a missing (`NaN`) index returns Pine `na`, including for
  empty arrays and valid slices. Published warmup color/search-index shapes
  depend on this. Receiver and slice validity checks still apply; finite
  out-of-range indices still raise runtime errors. Keep this exception in the
  getter rather than relaxing the index normalizer used by mutators.
  Native v3 array-02/03 confirm the v6 int-array cases; those captures alone do
  not settle the separate v5 color-array policy questions.
- Collection sort helpers must recognize Pine `order.*` enum values at runtime
  (`order.descending` as descending) as well as the legacy bare strings used by
  older helper-level tests.
- Array sorting, sort-index extraction, and binary searches select UDT field
  index 0 when `sort_field` is omitted; primitive elements remain their own
  comparison values. Explicit field names and indices override this default.
- `ta.highestbars()` and `ta.lowestbars()` return negative-or-zero offsets from
  the current bar back to the extremum, not positive bars-ago distances. The
  official TradingView `ta` library's `aroon()` calculation is the built-in
  endpoint form: it queries `ta.highestbars(..., length + 1)` /
  `ta.lowestbars(..., length + 1)` and then adds `length`. The public
  TradingView `ta` library v4 release note says Aroon was updated to match the
  built-in indicator values; with negative offsets, a `length`-only window
  cannot reach the 0 endpoint. Do not compensate by flipping the sign again in
  Aroon or corpus-facing helpers.
- `matrix.concat(id1, id2)` appends the rows of `id2` into `id1` and returns
  `id1`, matching array-style left mutation. Do not "fix" corpus rows by
  returning a detached combined copy; scripts that need an unmutated left matrix
  must copy before concatenating. Column counts must match even when either
  operand has zero rows; an empty left operand retains its declared columns.
  Named `id1`/`id2` arguments bind independently of their order, and semantic
  inference uses the bound left operand to retain its matrix element type.
- Matrices allow at most 100,000 elements, counting `rows * columns` rather
  than either dimension separately. Constructors, row/column insertion, and
  concatenation enforce this limit before allocating defaults or mutating the
  matrix; exactly 100,000 elements remains valid.
- Pseudoinverse rank checks compare squared vector norms to squared epsilon.
  Using an unsquared threshold incorrectly discards small independent columns
  and violates inverse equality for nonsingular matrices such as `[[1e-6]]`.
- `footprint.buy_volume()` and `footprint.sell_volume()` return `series float`.
  Their numeric return metadata is independent of the footprint host provider
  and POC/volume-row object metadata.
- Pine v6 `ticker.linebreak(symbol, number_of_lines)` requires a string symbol
  and integer-kind line count, accepting const, input, simple and series arguments.
  Its member-only checker uses the shared kind helper and builtin signature binder.
  The return is simple for weaker arguments and series when either argument is series.
  The v4 global `linebreak()` migrates to `ticker.linebreak()` in v5; the modern
  spelling is refused in legacy scripts using the existing version rule.
- `ticker.kagi()` has live v6 overloads for `ticker.kagi(symbol, reversal)` and
  `ticker.kagi(symbol, param, style)`. Keep the checker overload selection and
  runtime lowering explicit; older style-first positional tests are compatibility
  evidence, not a reason to collapse the live overloads into one parameter list.
  The v4 `kagi()` global migrates to `ticker.kagi()` in v5; refuse the
  opposite namespace/version while retaining local callable shadowing.
- `timestamp()` with seven positional arguments selects the timezone overload
  when the first argument is still unknown inside an untyped UDF. Known numeric
  first arguments retain the numeric-date overload's six-argument ceiling.
- Compiled enum lowering is family-specific. Visual/chart enum families such as
  `shape.*`, `location.*`, `size.*`, `format.*`, `scale.*`, `xloc.*`, `yloc.*`,
  `extend.*`, and `position.*` lower to bare suffix strings; `display.*` lowers
  to numeric bitmask values; `barmerge.*` lowers to fully qualified strings;
  `session.*` goes through `ctx.sessionValue(...)`; strategy declaration/risk
  families normalize to bare suffix strings or AST-derived declaration chains.
  When an enum-valued runtime parameter silently defaults, first measure which
  representation the compiled path is actually receiving before changing the
  consumer.
- `map.size()` returns a series int through namespace and receiver calls,
  regardless of the map's value type; preserve this qualifier during inference.
- Matrix `is_stochastic`, `is_binary`, `is_diagonal`, and `is_zero` return
  `series bool` through namespace and receiver calls. Match local user methods
  before assigning this builtin result type.
- Semantic binding for collection receiver methods must use the receiver type
  even when the receiver is a call result. `matrix.inv().fill(...)` is
  `matrix.fill`, not the visual `fill()` builtin.
- Builtin `array.variance()` retains its existing float result kind and returns
  a series value in namespace and receiver forms; const/simple destinations
  must refuse it. Integer-overload fractional rounding remains unresolved.
- Builtin `array.every()` returns `series bool` in namespace and receiver forms,
  even for constant contents; const/simple scalar destinations must refuse it.
- Semantic type inference must keep Pine reference/special values as `series`
  unless an explicit stronger local rule says otherwise. Drawing constructors,
  collection constructors/helpers, UDT constructors, `plot()`/`hline()` handles,
  and typed annotations for arrays, maps, matrices, drawing handles, plots,
  hlines, and UDTs all inherit this series behavior from Pine's type system.
  Do not "simplify" absent qualifiers on those values back to unqualified
  handles; that loses the distinction checked by semantic invariants.
- Matrix `avg`, `mode`, and `trace` infer a `series` scalar of the numeric
  element kind; `rank` infers `series int`. Namespace named/positional calls
  and receiver calls use the same matrix-ID binding and result inference.
- Builtin `matrix.elements_count()` and `map.size()` return `series int` on
  namespace and receiver calls. Apply this floor only to builtin calls so
  eligible script-local methods and imported callable shadows retain their inference.

- Map keys accept the five primitive key types and declared local/imported enum
  types. Apply the same rule to constructors, annotations, nested collection
  templates, and assignment compatibility; enum support must not admit UDT or
  collection keys or disable mismatched map/key diagnostics.
- Pine keeps value identifiers separate from method names and user-defined type
  names. Published TradingView scripts use patterns such as `method n(...)`
  beside `n = bar_index` and `type lab` beside `lab[] lab`; semantic duplicate
  checks must not collapse those namespaces. Ordinary function/value same-name
  rows still need compiler evidence before accepting them.
- Version-sensitive boolean rules must follow `pineVersionRules.ts`. Pine v3-v5
  allow implicit numeric-to-bool assignment and bool `na` behavior that Pine v6
  rejects; do not apply the v6 bool diagnostics uniformly to declared-v5
  scripts.
- Declared Pine v5 comparison expressions preserve legacy boolean `na` when an
  operand is unavailable: `na(close[10] == 1)` must observe `na`, while
  `(close[10] == 1) ? ...` still takes the false branch because v5 boolean `na`
  casts false in conditions. The compiled runtime therefore uses v5-specific
  comparison helpers for equality and ordered comparisons. Pine v6 keeps the
  false-returning comparison helpers because bool values are never `na`; v4 was
  not changed by the 2026-09-12 audit because the v4 operators page did not
  carry the v5 comparison-result wording.
- Declared Pine v5+ `%` is floor-quotient modulo, not JavaScript remainder:
  lower `%` and `%=` through the compiled `_mod(a, b)` helper so negative
  operands follow `a - b * floor(a / b)`. TealScript clamps forward-declared
  versions such as v7 onto the v6 rule set, so they must use `_mod()` too. The
  v4 operators page consulted on 2026-09-12 did not state the negative-operand
  formula, so do not extend this behavior to v4 without version-specific
  evidence.
- Native v3 captures settle declared-v4/v5 `const int / const int` as
  truncation toward zero for either operand sign (`-5/2=-2`, `5/-2=-2`,
  `-5/-2=2`). Keep the version-rule gate and per-call operand qualifiers in
  checker, emitter and invariant audit aligned; float operands, nonconst
  integers and v6 division stay fractional. Normalize integer signed zero and
  preserve `na` for nonfinite quotients. The existing helper name is retained
  for compiled dependency compatibility.
- Captured v5 dynamic positive/negative zero denominators yield missing values
  before `na()`/`nz()` observe them, including UDF fractional division and `/=`.
  Reuse 6f4d459299’s helper only in v5 fractional paths; preserve const-int
  dispatch and other versions. e6bdfdf1b5 reverted the docs-only candidate
  pending these native observations. Literal-zero refusal is separate 547eeb74aa;
  v6 and uncaptured zero contexts remain native-pending.
- Ternary expressions cannot return literal, callable or builtin tuples; use an
  `if` or `switch` local scope instead. Scalar and array-ID ternaries remain
  valid. This refusal reuses tuple inference without changing tuple qualifiers.
- `void` describes internal side-effect-only results, but is not an available
  declaration, parameter, field or collection-element annotation. Reject those
  annotations without removing internal void result inference or standalone
  side-effect calls; user-declared type-name resolution remains separate.
- Reading a UDT field combines its declared qualifier with the existing
  receiver qualifier, including imported fields. A constant initializer does
  not make a field read from a series object constant. Preserve the field's
  full type metadata and keep reference-annotation authority disputes separate.
- History syntax uses the existing version policy: v6 refuses direct literal,
  builtin-constant and UDT-field history. Named variables remain valid even
  when constant; `(object[1]).field` and an extracted field variable are legal.
  v5 admission remains intact. This check does not change history allocation.
- Operator operand validation is a semantic rule, not a runtime coercion rule.
  Pine arithmetic accepts numeric operands, with `+` also accepting two strings
  for concatenation; ordered comparisons accept numeric operands; equality and
  inequality may compare non-numeric fundamental values; logical operators
  accept bool operands, with the existing version rules preserving legacy
  numeric-to-bool behavior before v6. Do not inherit JavaScript coercions such
  as `"5" - 2`, `"price: " + close`, `"b" > "a"`, `color.red > color.blue`, or
  `"yes" and flag`.
- The legacy global `iff(condition, then, else)` helper is available only before
  Pine v5. Declared v5/v6 scripts should receive the migration diagnostic that
  points authors to the `condition ? thenValue : elseValue` operator rather than
  silently accepting a helper removed from modern Pine.
- `security`/`request.security` barmerge arguments reject runtime-series
  computation, but the semantic check must still accept TradingView-published
  legacy forms: Pine v4 `security(..., true, lookahead=true)` boolean switches,
  and non-series conditionals selecting between allowed `barmerge.gaps_*` or
  `barmerge.lookahead_*` constants, including official library wrappers that
  store that selection in a local variable.
- `array.slice(id, from, to)` requires `from < to`; equal or descending
  endpoints raise a public runtime error, including inside for-in expressions
  and persistent initializers. `matrix.submatrix` similarly requires strictly
  increasing row and column ranges. This follows the official v6 collection
  error-handling rules, superseding the previous empty-slice acceptance.
- Runtime helper errors that are Pine runtime failures must be classified by
  `isKnownPineRuntimeError()` in `src/runtime/codegen/execute.ts`. Otherwise the
  compiled bar/global-initialization and request-expression replay boundaries
  record them as swallowed generated errors and the script can look like
  `errors: []`, `plots: []`, or produced output with `profile.swallowedErrors`
  only. Keep broad Pine-facing families such as array/map/matrix/table/TA/output
  limit errors on that boundary list; do not add internal codegen/backend
  guardrails there.
- `src/runtime/approximationSurface.test.ts` is the standing guard for the
  runtime/tealchart approximation audit. It derives its scope from the
  Pine-facing runtime and tealchart rendering roots, then requires each
  clamp/floor/fallback/coercion/error-swallowing candidate to be scanned or
  explicitly excluded with a documented reason. A new match should either
  become loud/reference-correct behavior, be reported through
  `RuntimeProfile.runtimeApproximations`, join `codegen/fallbackInventory.ts`,
  join tealchart's `pineVisualNormalizationRegister.ts`, or be added to the
  explicit allowlist with a documented reason. Do not widen the detector or add
  noisy file exclusions just to make a new red go away. The same guard also
  checks that generated-code/request replay swallow catches consult
  `isKnownPineRuntimeError(error)` before demoting an exception into
  `RuntimeProfile.swallowedErrors`; a profiled swallow is not sufficient when
  the thrown value is already a known Pine runtime failure.
- Four scoped class sweeps in the runtime/tealchart parity effort found
  isolated defects rather than systemic shared-normalizer failures:
  `extractStrategySettings()` dropped only
  `backtest_fill_limits_assumption`, point-data request scalar shortcuts were
  limited to `request.economic()`, receiver-method named argument binding for
  `table.cell()` was a shadowing one-off rather than a general method binder
  break, and `positiveInteger()` only feeds `table.new()` columns/rows. Treat
  suspected classes as measurement questions; these precedents say to grep and
  prove the caller set before generalizing from a single silent normalization.
- Per-call typed method contexts are recorded through the scalar call-inference
  mechanism for standalone void and tuple calls as well. Untyped UDF parameters
  inherit argument types separately at each written call; return shape must not
  drop overload selection or independent function state.
- Local method overloads keep distinct generated identities by receiver type
  and arity. Resolve user/imported methods before generic collection method
  fallback so script methods named like `copy` or `size` are not swallowed.
- Imported array methods use their declared array receiver kind for runtime
  matching, independently of qualified library type names. Typed-array calls
  retain compatible selected imported methods before builtin dispatch.
- Imported receiver methods resolve before the same-named ordinary chart
  function fallback. A wrapper `update() => zigzag.update()` must call the
  imported method; resolving by the member name alone recursively calls the
  chart wrapper. Keep call-site analysis and emitted dispatch in agreement.

- Local method dispatch falls back to a registered builtin for the actual receiver
  after custom overload matching. A UDT `delete` can call line/label field
  `delete` methods; the receiver is evaluated once and unmatched calls still error.
- For Pine handle receiver methods, codegen must only let compatible local
  methods/functions shadow the builtin namespace method. Incompatible helper
  names such as a wrapper `cell(...)` must fall through to `table.cell(...)`
  with the receiver prepended so named arguments bind against the builtin
  signature.
- Official TradingView import aliases do not hide builtin namespaces. Exported
  library members resolve first, then unresolved members fall back to the
  builtin namespace with the same alias. This priority still applies when the
  import's default alias is the builtin namespace name (`import TradingView/ta/7`
  -> `ta`): exported official members own signature checks before builtin
  fallback. Do not add builtin members to official export lists to fix alias
  fallback.
- Explicit `const` declarations forbid reassignment and compound assignment,
  including constant replacements and block-if values. Track declaration identity
  separately from inferred `const` qualifiers, so ordinary mutable variables and
  shadowed locals remain mutable.
- A variable declaration cannot shadow a builtin variable already read anywhere
  earlier in the script, including another scope. Record only reads that resolve
  to the builtin, so parameter and custom-variable reads do not prohibit later
  legal shadows. Apply this to single and tuple bindings without changing the
  separate shadow-warning policy.
- UDT variable names cannot obscure builtin namespaces, including inferred and
  tuple bindings. Scalar and enum values may coexist with the same-named builtin
  namespace; do not turn this UDT restriction into a general namespace-name ban.
- UDFs and methods cannot reassign global variable values or reference IDs,
  including compound assignments in nested blocks. Compare resolved binding
  identity with the root binding so mutable local shadows remain legal. Global
  reference contents may still change through setters and field assignments.
- UDF and method parameters keep their original values or reference IDs within a
  call. Reject reassignment and compound assignment to their resolved bindings,
  while allowing setters on referenced contents and mutation of local shadows.
- TradingView v3 captures settle const array/matrix/map/line IDs: constructors
  and content mutation are accepted, ID reassignment is refused. `const` fixes
  supported reference IDs while their values stay `series`; preserve declaration
  identity tracking independently of qualifier inference. The manual excludes
  UDTs, plot and hline from this const reference exception.
  Keep the independent type audit aligned. Captured const matrix/map/line
  values remain invalid numeric `plot(series=...)` inputs after their declarations
  succeed; reuse the existing array admission guard for those captured kinds.
- Exported library variables require explicit `const` and a fundamental type
  (`int`, `float`, `bool`, `color`, or `string`); a literal `na` initializer does
  not make a reference type exportable.
- Legacy v3/v4 `vwap(x=...)` binds `x` to the source; v5+ uses `source`.
  Bare legacy `vwap` maps to `ta.vwap` through v4; v5+ rejects that spelling.
  The separate v3-to-v4 timeframe rename maps v3 `isintraday` and `interval`
  to `timeframe.isintraday` and numeric `timeframe.multiplier`. Their bare builtin
  spellings are refused in v4+, using `supportsLegacyTimeframeVariableAliases`.
  Locally declared variables still shadow these names in every version.
- `array.pop()` returns the existing element kind with a `series` qualifier in
  namespace and receiver forms, including arrays constructed from literals.
- `array.max()` keeps the existing numeric element kind and returns `series`
  in namespace and receiver forms; literal contents do not lower the qualifier.
- `matrix.rows()` returns `series int` in namespace and receiver forms, so its
  result cannot initialize a `const` or `simple` variable.
- Semantic inference for `else if` ladders must avoid re-walking assignment-only
  alternate chains for type after a branch has no expression return. Public v6
  alert dashboards use 50+ arm selector UDFs; exponential inference there turns
  semantic checking into a CPU-bound hang.
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
- Persistence bookkeeping must allocate its cycle-tracking set only for object
  traversal, and probe drawing persistence only for string handles. Numeric
  volume-profile bins and numeric UDT fields are hot paths in public scripts;
  allocating a set and stringifying each value adds work with no persistence
  effect. Continue traversing mutable nested containers on every marking call,
  including aliases and cycles; a previously marked object can receive new
  drawing handles later.
- Realtime drawing rollback must truncate by each drawing's creation
  `barIndex`, not by insertion order. Pine scripts can create a drawing with a
  historical x coordinate after newer realtime/session drawings; assuming the
  store is sorted by `barIndex` drops valid historical drawings.
- Direct alert frequency checks index non-all events by bar per alert object.
  The derived index consumes appended events once and rebuilds when truncation
  replaces the event array, preserving invocation isolation and rollback.
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
- Requested scripts receive realtime phase flags from the chart execution and
  their own interval boundaries. The worker carries the prior opening update
  separately; v23 witnesses bound this behavior to the captured two live bars.
- Realtime `request.security` selects the active requested interval even when
  the chart bar is confirmed; historical reload retains confirmed-at-close
  selection. The v23 clock-only witness binds these distinct selections.
- Generated backends must apply declaration drawing limits such as
  `max_labels_count` before the first bar creates drawings. Otherwise public
  scanner scripts that request larger limits silently prune to the default
  retained drawing count.
- Strategy declaration extraction owns declaration-to-ledger plumbing. Every
  declaration argument that affects `StrategyLedgerSettings` must be mapped in
  `extractStrategySettings()` before bar execution starts; for example,
  `backtest_fill_limits_assumption` feeds
  `backtestFillLimitsAssumptionTicks`, which the order engine already uses for
  verified limit fills. Trace-required strategy options remain loud semantic
  refusals rather than inferred approximations.
- `scripts/check-strategy-ledger-invariants.ts` is the trace-free consistency
  gate for strategy ledgers over external corpora. It checks internal arithmetic
  relationships such as equity decomposition, open/closed trade counts,
  realized P/L versus closed trades and commissions, open size, and average
  price reconstructed from remaining lots. A violation is a runtime money bug
  even without a TradingView trace.
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
- **Raw custom OHLC (`fcf9d33018`):** `plotbar()` and `plotcandle()` retain the
  supplied fields independently, including finite fields beside a missing
  field, as native v2 CSV exports show.
  Drawing adapters normalize finite extrema and suppress incomplete OHLC bars;
  runtime draw-presence values/colors remain masked without erasing raw data.
  Native `coverage-plot-1-v1.csv` bars 0..10 pin all twelve differing channels;
  CSV establishes data semantics, not rendering geometry or pixels.
- `plotshape()` and `plotchar()` treat finite numbers at `location.absolute`
  as coordinates, including zero. Other locations use numeric nonzero/boolean
  visibility. Color masking must follow that location-aware marker value so
  an absolute zero coordinate retains its supplied color.
- The v6 checker enforces visual parameter qualifiers from the pinned reference,
  resolving positional, named, and fill-overload slots before checking limits.
  Hline simple/series colors exceed both authorities; input-color eligibility remains disputed.
- Builtin `plot()` requires global scope; conditional sources remain valid at
  global scope, while local user functions named `plot` retain their own scope.
- Flat `fill()` calls require only their two IDs; color is optional in both
  plot and hline overloads, including named-ID calls.
- The checker requires both `fill()` IDs to have the same handle kind, including
  reversed positional IDs and named hline aliases.
- Modern color `fill()` selects its parameter slots from the registered handle
  type: hline fills omit the plot overload's `show_last` slot. Resolve named
  `hline1`/`hline2` aliases before selecting the overload; retain v4 ordering.
- `hline(color=na)` preserves an invisible color output (`[]`), rather than
  replacing it with the omitted-color default. The level still supplies fill geometry.
- `plotshape`/`plotchar` retain their unsuppressed series in `displayValues`:
  booleans become 1/0, numeric zero remains zero, and na remains null. Painting
  still uses `values` with false/zero suppressed. Worker outputs retain both;
  realtime truncation must truncate both arrays before replacing the last bar.
- `fill()` binds three distinct v6 tails: gradient fills use `title, display,
  fillgaps, editable`; flat hline fills use `title, editable, fillgaps, display`;
  flat plot fills additionally have `show_last` before `fillgaps`. Select a
  positional gradient by numeric stop arguments; when a tuple-derived stop is
  still unknown, two known color arguments in slots five/six identify the
  gradient if the other stop is numeric or unknown. Keep ordinary argument kind
  checks and fully positional flat fills. Conditional tuple returns retain a
  known sibling kind when the corresponding slot is explicitly `na`; missing
  slots must not erase string/bool stop kinds and bypass numeric validation.
  Other unresolved expressions remain unknown, and both branch qualifiers
  still contribute. Gradient stop/color arrays are
  series outputs and truncate with the other per-bar visual arrays on replay.
  Compatibility fixtures must also omit `show_last` for hline fills: an extra
  positional slot shifts the display value into legacy `transp`, making an
  alpha-bearing color opaque. The valid hline positional tail preserves color
  alpha and leaves `showLast` undefined.
  Native CF011 accepts two hline handles for the gradient overload; the v2
  batch-8 CSV pins admission, while its separate pane capture pins the vertical
  gradient. Reuse the same gradient arrays and handle IDs for either handle kind.
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
- Identical table re-merges are idempotent; no `table.cell()` anchor reset is
  required. Full-history creation of fresh tables has a separate cell-capacity
  limit and must not be mistaken for a repeated-merge failure.

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
- Dynamic array linear-interpolation percentages outside 0..100 raise
  `PineRuntimeArgumentError` with `RE10002`; nearest-rank percentages also reject
  finite out-of-range values. Do not restore percentile clamp approximations.
- Color constructor channels and transparency outside documented ranges retain
  their existing approximation policies. RGB channels use packed integer lanes,
  matching captured negative and overflowing integer boundaries. Outcomes beyond
  those captured boundaries remain trace-required and visible through
  `RuntimeProfile.runtimeApproximations` rather than claiming full-domain parity.
- Color transparency values inside the documented 0..100 range must stay
  floating point until conversion to the underlying 8-bit alpha channel.
  TradingView documents float transparency as the way color functions access
  all 256 alpha values; rounding `color.new()`/`color.rgb()` transparency before
  alpha conversion silently shifts colors such as `12.5` by one alpha step.
- `color.new()` with missing transparency preserves the RGB channels and renders
  them fully transparent, as observed in the native dynamic-transparency capture.
  Preserve the omitted zero-transparency default and fractional alpha conversion.
- Equal finite `color.from_gradient()` bounds produce transparent-zero channels
  for the captured finite and missing source values. Keep nondegenerate endpoint
  clamping and missing-source behavior separate from this degenerate range.
- Request-expression replay must be dependency-selected for both globals and
  request-local statements. Replaying every prior statement is correct-looking
  but unaffordable: one public scanner request sat after 100+ replayable
  declarations, turning a single request into hundreds of requested-context
  statement executions per provider bar. Keep replay scope precise and let the
  corpus/realtime gates prove the narrowing did not drop required dependencies.
  UDF-local dependencies include persistent declarations and all preceding writes
  that determine the requested expression, in source order. Conditional writes
  retain their containing statement; writes after the request are excluded.
  Scalar input declarations may be treated as requested-context invariant, but
  `input.source()` and legacy `input(..., type=input.source)` must not be:
  they return source-series values that remap to the requested symbol, and
  capturing the chart-context value makes request expressions use the chart's
  source instead of the requested series. Unknown or series-like dependencies
  stay replayed.
- Provider-backed point requests must preserve event timestamps when Pine
  `gaps=barmerge.gaps_on` is requested. Scalar provider shortcuts are only safe
  for fill-forward modes; `request.economic()` uses the generic point-series
  merge path for `gaps_on` so bars without a new point return `na`, matching the
  documented `request.*()` gaps rule.
- `request.security()` and `request.security_lower_tf()` resolve an empty
  symbol to the active context ticker ID, including the parent symbol inside
  nested requests.
- Each request family (`request.security()` / `request.security_lower_tf()`)
  reuses the first `calc_bars_count` for the same expression and context,
  including an omitted count. Expression identity ignores source locations
  while retaining function/import scope, local dependencies, and captures.
- `request.security_lower_tf()` accepts equal timeframes in both top-level and
  nested requested contexts; an empty timeframe inherits the active context.
  It rejects higher timeframes unless `ignore_invalid_timeframe` is enabled.
  Ignored invalid symbols or timeframes return `na`, including inside nested
  requests; a valid context without intrabars still returns an empty array.
- `request.security_lower_tf()` accepts tick timeframes such as `1T` as lower
  than time-based chart periods. Tuple expressions return one intrabar
  `PineArray` per tuple item, including `bid`/`ask` source fields; returning an
  array of per-tick tuples makes destructuring assign mismatched arrays.
- Exported library functions and methods must use every parameter in the body.
  Defaults, shadowing locals or loop counters, and callee names from the function
  namespace do not count as references to a parameter.
- Compiled imported-library support has two symbol surfaces: exported API for
  importing scripts, and private library-local helpers/types/methods for code
  executing inside that library. Keep those identities distinct. Request
  subprograms created from an imported function must retain the imported alias
  context so bare library-local helpers still resolve inside the requested bars,
  while external calls to private members fail loudly.
- Omitted imported-function defaults resolve library-local names in the
  callee context, while supplied arguments resolve in the caller context.
  Resolving a default `Settings.new()` in chart scope breaks default ZigZag
  construction or accidentally binds a chart type with the same name.
- TA calls that consume imported/UDF source expressions need a real source
  series at the call site. Do not sparse-call stateful TA helpers under
  conditionals or switch blocks; push the resolved source once per bar and have
  the TA read that series history.
- Generated UDFs must create local history series for function-local values
  later consumed as TA source inputs; TA source locals are series, not globals.
- The `ta.vwap` variable (legacy `vwap`) has its own VWAP state and history,
  using `hlc3` and volume rather than the generic five-OHLCV TA-variable call.
- VWAP argument binding must preserve missing/default `source` and named
  `anchor` slots. Do not filter missing args before positional/named binding.
- TradingView v6 capture-backed oscillator contracts (2026-10-03): EMA seeds
  from the first `length` valid samples' SMA and emits `na` on missing input
  without discarding recursive state; seed buffers participate in save/restore.
  This contradicts the reference's first-source equivalent example. BBW returns
  percentage width (`100 * (upper - lower) / basis`), matching the actual builtin
  and the reference example rather than its ratio-only prose.
- KC/KCW compute the source and range EMAs independently. True range uses the
  `ta.tr` variable's initial `na`, and source holes neither suppress the chart
  range nor erase the known chart close. Stochastic advances its supplied high/low extrema but
  holds its last output when its explicit source is missing. The v54 independent
  bound-hole captures also retain that output when the current high or low is
  missing; each bound keeps its existing contiguous finite suffix independently.
- CCI and `ta.dev` use contiguous chart-bar windows: a source hole poisons the
  deviation window until it expires. `ta.stdev` retains its separately observed
  non-na sample window. CMO composes adjacent changes and independent gain/loss
  `math.sum` state, so its recovery is not blocked on a contiguous source window.
  `oscillatorOracle.test.ts` pins these rules with small arithmetic inputs;
  captures and replay reports remain external.
- TradingView volume captures settle **VWAP startup/reset**: `ta.vwap` uses
  `hlc3`, and omitted-anchor calls reset daily (including initialization on the
  first loaded bar). Explicit-anchor calls stay `na` until the first true
  anchor. The v54 finite-volume source-hole capture settles explicit-anchor
  calls only: their weighted accumulators stay poisoned until a valid anchor.
  Omitted-anchor calls and the variable retain their prior interior source-hole
  skip behavior; the explicit-anchor capture does not settle those calls.
  Explicit-anchor bands and recomputation use
  the same accumulators. Interior missing-volume behavior remains separately
  held. Snapshot/restore must preserve initialization along
  with all three weighted accumulators.
  `timeframe.change()` itself is false without a previous bar.
- **MFI flows stay signed** and follow the published comparison predicates:
  unavailable change contributes the current signed flow to both rolling sums,
  and missing flows are skipped separately by the sums. Warmup is `length`
  non-missing flows, including the initial source. The captured builtin returns
  100 when both sums are exactly zero after a constant-source seed, while the
  published expression returns `na`; do not substitute the expression for this
  builtin singular case or clamp signed-source results to [0,100]. Flat short
  windows can expose unresolved TradingView summation residues; direct-window
  sums do not establish exact TradingView numeric-state parity.
  `pine-ta-native-mfi.test.ts` pins native v2 initial-flow/hole cells and the
  v1 constant-source builtin/literal disagreement with their CSV hashes.
  `ta.obv` and `ta.pvt` return `na` before a prior close exists while keeping
  their internal cumulative seed at zero. Small volume policy tests live in
  `tests/compat/pine-volume-oracle-behavior.test.ts`.
- **Extrema NA horizon (`9b5d2c984b`):** highest/lowest window helpers reject
  invalid lengths through the shared positive-integer validator. Their warmup
  counts physical bars, including `na`.
  After warmup, `ta.highest`, `ta.lowest`, `ta.highestbars`, and `ta.lowestbars`
  select from the contiguous suffix of at most `length` bars, stopping at the first
  `na`. A current `na` yields `na` values and zero offsets; finite data resumes
  immediately without retaining pre-hole extrema. Offset ties select the oldest
  equal value in that suffix. This follows the 2026-10-03 TradingView
  extrema-barsago-v1 capture rather than a last-N-non-na interpretation of the
  reference's ignore-na remark. `extrema-behavior.test.ts` pins small synthetic
  discriminators, including endpoint Aroon and rollback/snapshot behavior.
- Pivot candidates still need the full physical left/right window and a finite
  candidate. Each flank scans outward from the candidate and stops at its first
  `na`; equality is allowed on the older (left) side and rejected on the newer
  (right) side. A rejection before a hole remains a rejection. The same capture
  distinguishes stopping from skipping holes and strict equality on both sides.
- `ta.max(source)` and `ta.min(source)` are v6 all-time extrema helpers. Do not
  accept a second Pine argument for pairwise comparison; the runtime TA class has
  an internal two-input compute mode, but the Pine-facing callable is one-arg.

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
- Persistent state identity is declaration-scoped, not name-scoped. A
  block-local `var`/`varip` may shadow an outer persistent variable with the
  same identifier, so generated state members and init flags must not key only
  on the Pine name.
- Identifier history resolution must honor user declarations before builtin
  fallbacks. A local `n`, `bar_index`, `last_bar_index`, or price-field name
  shadows the builtin; `name[1]` is then the user series history, not the
  fallback runtime series.
- Function call-site parameter/local history follows Pine local-scope time
  series rules. Each written call owns independent buffers, and history is
  built from successive calls, not chart bars with filled holes. A skipped call
  does not commit a new value; repeated loop executions on one bar update one
  slot, not multiple prior-history entries.
- Nested UDF parameter and regular-local histories belong to the parent written
  call's child state and participate in recursive snapshot restore. Discover
  histories in loop boundaries, returned loop bodies, and switch-arm locals;
  those expression blocks retain their owning function during analysis.
- Dynamic `request.*()` calls in loops split context from expression semantics:
  loop variables and loop-mutated values may select the requested context, but
  Pine forbids the evaluated expression from depending on them. Reject that
  shape before runtime; otherwise the request subprogram can swallow the
  generated missing-local error and return plausible `na` values. Root block
  locals named like builtins or legacy input aliases (`symbol`, `n`, `close`,
  etc.) must enter the local-name stack before request argument emission.
- User identifiers shadow builtins and legacy aliases in every generated path.
  This is an invariant, not one resolver: ordinary reads, history reads,
  request source descriptors/captures, assignment targets, analyzer
  classification, and persistent-state identity make separate decisions today.
  Keep analyzer declared-name collection aligned with emitter root/block
  promotion so a user `close`, `n`, `symbol`, or `source` cannot silently fall
  through to a builtin/alias on only one surface. `compile.test.ts` carries the
  structural gate for the general rule: branch-local declarations named like
  builtin series, generated values, legacy aliases, colors, and visual constants
  must classify as user history series and write the scoped value into the same
  `_sv_*` buffer that `name[1]` reads. The opposite side of the same rule is
  guarded too: in legacy scripts with no user declaration, bare TA variable
  aliases such as `pvt` must stay on their TA-variable path instead of becoming
  unresolved generated JavaScript.
- Untyped variables inferred from literal initializers can widen qualifiers on later reassignment or compound assignment; explicit `const`/`input`/`simple` annotations remain enforced.
- Unary numeric literals such as `-1` and `+1` are numeric literals for type inference, not `unknown`; sentinel locals initialized that way must still widen when reassigned from loop or series values.
- Explicit type annotations can initialize from `na`, including `bool flag = na`;
  the annotation supplies the missing type. Numeric widening is one-way:
  `int` can flow into `float`, but `float` does not implicitly flow into `int`.
- Bare user/imported function calls resolve before builtins and before legacy
  global compatibility aliases. Public v3/v4 scripts often define helpers named
  like later builtins (`median`, `sum`, `dema`); compiled analysis/emission
  must preserve the script-local binding.
- TA lookup tables must check own properties rather than JavaScript prototype
  membership. Valid UDF names such as `toString` and `constructor` must not be
  classified as TA classes or crash compilation on inherited object methods.
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
- Collection locals may also share their namespace name. Distinguish explicit
  namespace receivers such as `matrix.set(matrix, row, column, value)` from
  receiver methods such as `matrix.set(row, column, value)` by binding the
  receiver argument and its collection kind; preserve named/mixed arguments
  and do not prepend the namespace local a second time. Check active scope
  bindings so a UDF-local namespace name cannot shadow outer namespace calls;
  binary receiver calls such as `matrix.sum(other)` still take one argument.
- Pine functions return their final local declaration or identifier assignment,
  including compound assignments and `var`/`varip` declarations, regardless of
  whether the local shares the function name. Nested branch/loop tails must
  propagate the same value. Emit the ordinary declaration/assignment first,
  then read its stored value so initializers run once and local history/state
  updates remain isolated per call site.

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
`strategy(calc_on_every_history_tick=true)` executes the historical strategy
body for each synthetic OHLC tick. Generated series update in place after the
first tick so repeated historical executions do not duplicate bar history.
Per-bar visual outputs must follow the same replacement rule: `plot()`,
`fill()`, `plotshape()`/`plotchar()`, `plotarrow()`, `plotbar()`/`plotcandle()`,
`bgcolor()`, `barcolor()`, and `alertcondition()` write by `bar_index` so
same-bar recalculations leave one output value per chart bar.
Default strategies still process pending broker fills on unconfirmed realtime
ticks even though they skip statement execution and equity finalization; do not
trim the ledger after the fact. Confirmed realtime close replay must mirror the
historical pre-statement fill/mark ordering so closed-trade runup/drawdown sees
the confirmed bar OHLC excursion before exit fills are replayed.

**Realtime updates:** `commit()` finalizes a bar; `rollback()` reverts to last commit for intrabar recalculation. Same-time replacement of the loaded final bar restores a pre-last-bar scope snapshot, including plain array-backed builtin caches, then replays the bar; newly appended realtime strategy bars still honor `calc_on_every_tick=false`. Reconstructed realtime executions in string codegen must apply the same rule only for the appended realtime segment: unconfirmed appended strategy bars do not execute top-level statements unless `calc_on_every_tick=true`, while indicators still calculate every tick and same-time replacement of the loaded final bar still executes. Worker `confirmedRealtimeBarStartIndex` metadata marks the appended realtime segment only; setting it for loaded-bar replacement makes generated backends skip strategy updates they must replay. Static outputs such as `hline` must not gain per-bar values during truncation, while per-bar visual arrays such as `plotarrow` colors must be replaced at `bar_index` rather than appended. Source-aware values returned from imported/user helpers preserve series identity for history-sensitive calls, but normal binary arithmetic/comparison must unwrap them before operating.

Structured Pine runtime errors halt the worker script across subsequent realtime
updates. Retain the original error and profile while attaching each incoming
message's metadata; `init`, `updateBars`, and `setInputs` reload execution and
clear the halt. See `tests/compat/pine-worker-runtime-halt-reference.test.ts`.
Worker indicator Pine log output retains historical messages once and appends
each realtime execution's messages across same-bar rollback. Track the last
executed bar to avoid duplicating historical replay; initialization/full-bar/input
reloads replace the log history. Strategy logs use the complete execution result.
See `tests/compat/pine-worker-log-retention-reference.test.ts`.

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

Compiled array/matrix helper tables validate collection receivers before
execution. Missing IDs raise recognized Array/Matrix errors through the public
execution result, including namespace calls, receiver methods, UDFs, and
persistent initialization; they must not become profiled JavaScript exceptions.
Generic receiver dispatch retains function-scoped parameter type hints, so
`na` array/matrix UDF receivers reach the same validated helpers and named
argument ordering as namespace calls. In particular, a typed matrix parameter's
`rows()` must not fall through to footprint dispatch when its ID is missing.
An untyped missing receiver raises an explicit public collection runtime error
instead of silently returning `na`. User/imported methods retain precedence,
and typed UDT/chart.point `copy()` receivers retain their nullable behavior.
Constructors and the internal matrix validity predicate remain exempt. Required
second array receivers (concat/covariance) and matrix receivers (concat/kron)
are validated too. Array insertion negative indices start at `-size` (while
positive `size` appends), and `array.percentrank` validates an element index,
rather than treating invalid indices as sample values. Empty-array percentrank
still returns `na`, as specified by its reference remarks. Captured v7/v14 finite
nonnegative arrays without ties of size at least three use
`(count(<=x) - 1) * 100 / (n - 1)`. The captured four-slot middle tied pair uses
the same rule and pins multiplication before division. Other tie shapes,
negative/nonfinite elements, holes and sizes one/two retain their previous
arithmetic pending native probes. Missing indices still return zero.
Matrix construction and growth (row/column insertion and concat)
refuse more than 100,000 elements before mutating the collection. These public
refusal contracts and passing small-input controls are pinned in
`tests/compat/pine-collection-errors.test.ts`.

TA compatibility has two separate guards: the compiled warmup sweep in
`src/runtime/codegen/execute.test.ts` pins first-valid-bar/`na` behavior, and
`tests/compat/pine-ta-value-behavior.test.ts` pins fixed numeric/boolean values
for every official `ta.*` manual-index name. `ta.cum(na)` returns `na` for that bar without advancing the saved
sum; treating it as the previous sum makes `na` indistinguishable from zero in
OBV-style expressions. Keep both current when changing TA formulas or compiled
TA classes.
The reference remark that `ta.percentrank()` includes missing observations
and propagates `na` conflicts with native `coverage-register-ta-1-v1` captures.
The integrated native implementation counts preceding physical slots and treats
missing comparisons as false. The pre-oracle NA-inclusion assertions are retired or corrected to the captured
values as DOC-vs-NATIVE, native wins; the contradicted reference remark remains TRACE.

TradingView's `rma-chain-v1` capture establishes that `ta.rma(na, length)`
returns `na` on that bar while retaining its seed and smoothing accumulator;
the next valid input resumes from that state. `ta.rsi` uses adjacent-bar source
changes, including missing inputs, so both a source hole and the first valid
bar after it return `na`. Its gain/loss RMAs retain their state across those
missing deltas; they do not smooth a change bridged from the last valid source.
Keep compute, same-bar recompute, and save/restore aligned with these rules.
Small independent inputs in `tests/compat/pine-rma-rsi-holes.test.ts` pin the
output mask, seed-period holes, recovery values, and replacement-tick state.

`ta.pivot_point_levels(type, anchor, developing)` is a stateful TA call per
call site and UDF invocation. Its anchor is a boolean reset condition, never a
timeframe string. An anchor closes the accumulated prior OHLC interval and
starts the new interval with the current bar. Nondeveloping levels hold until
the next anchor (initially all `na`); developing levels use the current interval,
starting at bar zero when no anchor has fired. Woodie uses the new interval's
open with the prior interval's high/low and rejects `developing=true` as a public
runtime error, including before a completed interval exists.
All six types follow TradingView's Pivot Points Standard formulas and always
return 11 slots in `[P, R1, S1, R2, S2, R3, S3, R4, S4, R5, S5]` order, with
`na` for levels that the type does not calculate. The state participates in TA
recomputation and snapshot restoration; array-valued call-result history uses
`ValueSeries`. `src/runtime/codegen/pivot-levels.test.ts` pins the formulas on
small hand-built periods, anchor/developing boundaries, array history, UDF
isolation, and rollback.

**Captured smoothing arithmetic:** RMA updates as `(previous * (length - 1) +
source) / length`; EMA updates as `previous + alpha * (source - previous)`.
RMA's initial valid-sample window uses the shared native compensated sum kernel;
the native warmup length-five seed pins the resulting binary64 value. Retain
the buffered seed prefix in snapshots so replacement and rollback replay it.
RMA private rollback stores the single seed slot a step can replace. Public
snapshots capture stable seed storage through shared accessor targets and materialize
independent Float64Array buffers on access; writes and restore preserve outstanding captures.
Algebraically equivalent alpha-weighted forms change binary64 results. KC's
EMA instances use a Neumaier-compensated SMA seed over `length` valid samples;
seed count, sum and compensation must all roll back on same-bar replacement.
KC's range seed consumes strict true range (missing without a previous close)
from chart OHLC independently of indicator-source holes.
The four explicit `ta.ema` compositions in v1 independently match that seed
and recurrence, with missing-source output masked while state is retained.
The analyzer configures compiled `ta.ema` with SMA seeding and source masking
in both static and dynamic constructor arguments. Low-level EMA retains the
TV-settled SMA/masked defaults; explicit false flags permit first-source
seeding and holding output without changing existing compositions.
Correlation advances five compensated sums independently for both sources,
their product, and their squares. Captured one-sided holes can yield values
outside [-1, 1]; all five accumulators must roll back together.
MACD explicitly configures SMA-seeded, missing-masked fast/slow/signal children;
`ta-native-macd.test.ts` pins leading and consecutive holes and the signal seed.
BBW divides the band distance by the basis before multiplying by 100. These
operation orders are pinned without tolerance in `codegen/ta-arithmetic.test.ts`.
SMA/stdev use native compensated sums and raw moments; compiled SMA's
source-series history uses SourceSeriesSMA with Sum compensation, eviction,
and same-bar restoration. CMO scales the gain/loss
difference before division: `(100 * (gains - losses)) / total`.
CMO snapshots retain the shared Sum accumulator shape for both gains and losses,
including compensation and window state during same-bar restoration.
Changing this operation order loses strict binary64 parity with v1 captures.
WPR likewise multiplies the signed distance from the highest high by 100
before dividing by the high/low range.
RSI remembers the immediately preceding source, including `na`. If either
adjacent source is missing, emit `na` without advancing either RMA; resume
only at the next valid adjacent change. Its ratio/subtraction order stays
`100 - 100 / (1 + averageGain / averageLoss)`. V1 does not settle seeded
zero-gain/zero-loss boundaries.

Native v2 smoothing adjudication is pinned by `codegen/ta-native-*.test.ts`.
CF040 confirms the standalone EMA SMA seed and missing-output mask; CF048
confirms RSI adjacency. CF046 WMA uses fixed chart slots filled by the previous
source on captured single holes, waits for `length` valid source samples, and
emits `na` on the current hole. Compiled `ta.wma` enables this mode through both
static and dynamic constructor arguments; low-level WMA defaults remain for
compound helpers whose hole policy is unobserved. Filled slots, prior source,
and valid-sample count all roll back on same-bar replacement. Additional native
v2 warmup and TA captures confirm leading holes and consecutive runs (including
six holes) for fixed lengths 2, 3, 5 and 14; the literal excerpts are pinned in
`ta-native-wma-v2-holes.test.ts`. Arbitrary dynamic windows remain a separate
call-history contract outside these fixed-length witnesses. The native TAD
alternating-length 2/3 vector is pinned in `ta-native-wma-dynamic.test.ts`.
Dynamic WMA uses the retained call-site source series and the current length;
each source-history slot carries its filled source and cumulative valid-sample
count, preserving warmup through history eviction and replacement. Replaying
the current physical window preserves filled slots and current-hole publication.
CF047 configures standalone `ta.rma` to emit `na` on missing source without
resetting or advancing its seed/accumulator. Recovery uses the retained value
and the captured operation order. Both static and dynamic constructor paths
enable this mask; compound RMA helpers retain their existing configuration.

Strategy value compatibility is pinned by
`tests/compat/pine-strategy-value-behavior.test.ts`, which uses fixed bars and
literal expected values for position/profit readouts plus open/closed trade
accessors. Keep it current when
changing the deterministic ledger, compiled strategy loop, or strategy accessors.

Continuous 24-hour session boundaries compare exchange-local session cycles as well
as adjacent active/inactive bars. The native v5/v6 BTCUSDT 24x7 captures reset at
UTC midnight, restoring prior-session extrema; non-midnight anchors and timezone
changes retain their configured cycle. Classification, closures and edge-bar behavior
remain separate checks; this does not establish other exchanges' native schedules.

Compiled `time_tradingday` returns UTC midnight of the last day in the
exchange session, rather than exchange-local midnight of the bar opening.
Root and requested contexts use their own session metadata, including overnight
and weekday-specific feed schedules. Above 1D the final session in the bar
sets the date. Native DXY/SPX labels and overnight/DST/history controls are
pinned in `pine-tradingday-session-boundary-native-v1.test.ts`; other clocks,
session classification and VWAP arithmetic retain their separate contracts.

`session.ispremarket` and `session.ispostmarket` always return false on
nonintraday timeframes, even when a bar opens inside the host-provided
premarket or postmarket session segment.

`timeframe.main_period` retains the resolved script timeframe through every
request-expression evaluator, including nested calls. An indicator declaration
timeframe takes precedence over the host chart period for this value.
Carry that period through both the history-growth retry wrapper and its pass
evaluator; creating a fresh history pass must preserve the request's outer context.

Runtime metadata compatibility is pinned by
`tests/compat/pine-runtime-metadata-behavior.test.ts`, covering official
`timeframe.*`, `session.*`, implemented `syminfo.*`, and chart metadata fields
for runtime metadata behavior. `timeframe.in_seconds()` uses the documented
2,628,003 seconds per month, multiplied by the monthly timeframe multiplier;
calendar timeframe buckets use actual month boundaries.
Provider-owned `syminfo.*` values
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

`str.replace_all()` treats target and replacement literally, including inserting
a replacement at each boundary for an empty target (once for an empty source).
`tests/compat/pine-documented-strings.test.ts` pins this contract; its Unicode
case/trim registrations remain authority-conflicted between reference and manual.
`str.tonumber()` accepts the complete decimal string, with an optional initial
sign and decimal point. It rejects exponent notation and all whitespace, including
a final newline; do not trim the source before validation.

`str.tostring()` defaults to `#.##########`: round to ten fractional digits and
omit optional trailing zeros, including numeric array/matrix elements. Explicit
formats preserve mandatory `0` digits; strings, booleans, and `na` keep their
documented representations.

`math.random()` uses fresh randomness when seed is omitted. Explicit seeds retain
repeatable per-call-site streams; both paths exclude the minimum and maximum.

`str.format()` removes apostrophe delimiters around literal text and leaves quoted
placeholders uninterpreted. Two adjacent apostrophes emit one literal apostrophe.

Generic `input()` preserves Pine color defaults through a compiled type hint,
including literals, color constructors/constants, and root constant aliases.
Color defaults produce color widgets and an `input color` return qualifier;
hex-looking strings remain strings. Integral-valued Pine float defaults also retain
float widgets, including decimal literals, casts, aliases, arithmetic, and color
channels; JavaScript integer values do not determine their Pine type.

Input behavior compatibility is pinned by
`tests/compat/pine-input-behavior.test.ts`, covering all official input
functions. `options`, `minval`, and
`maxval` reject invalid defaults rather than clamping; `step` is widget metadata
only. `input.source` must keep resolving price composites and plot-source
overrides as series values. Generic `input()` with a series float default likewise
preserves its series qualifier instead of promoting it to an input scalar. Runtime input identity is declaration-based, not
display-title-based: repeated public-script titles such as multiple
`input(..., title="Periods")` declarations must stay distinct by call site,
while unique titles keep the stable `input_Title` override ID.
Integer inputs without an explicit title use their declaring variable name,
including function locals, and expose the corresponding `input_Name` ID.
In v5 and v6, `input.int` range parameters (`minval`, `maxval`, `step`)
require `const int`, with the same checks for positional and named arguments.
An omitted positional default is emitted as undefined so a named `defval`
cannot accidentally supply the title with a synthetic NaN argument.
Source-aware input defaults are for preserving `input.source` identity only. Explicit scalar
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

`request.currency_rate` also halts on a structured `invalid_currency` series
provider failure when `ignore_invalid_currency` is false/default. Equal
currencies still return 1, seeded specialized rates take precedence, and
unavailable host conversion data remains `na`.

Line, label, and box creation/coordinate setters reject bar-index coordinates
more than 500 bars beyond the last chart bar. Native v3 drawing-01 through
drawing-11 repeatedly request bar_index + 501, but fail only on the last chart
bar (24223 through 24226); the chart-boundary comparison follows those captures
rather than rejecting the first historical call. Errors include the executing
bar index and the captured wording. The same guard covers chart-point overloads
and switching from time to index coordinates. Exactly 500 future bars, `na`
coordinates, and time-based positions remain legal; coordinates are not clamped.
First-bar-only out-of-range drawings await the registered v5 probes; these
captures do not settle deferred validation of a retained drawing.

Point-series requests (`financial`, legacy `quandl`, `earnings`, `dividends`,
`splits`, `economic`) halt on a provider's structured `invalid_symbol` failure
when `ignore_invalid_symbol` is false/default, and return `na` when true.
Validate the economic gaps-on series path before falling back to a specialized
getter. Missing/unseeded host data retains its `na` contract and must not be
misclassified as a rejected symbol. This does not infer a TV numeric error code.
Cached financial `invalid_symbol` errors pass through the specialized getter
and discovery adapter to the same halt policy, retaining the provider text exactly.
Absent entries, null values and resolved missing points remain `na`.

Request/ticker option compatibility is pinned by
`tests/compat/pine-ledger-gaps-31-ticker.test.ts` for `ticker.new()` adjustment
string kinds and the simple qualifier ceilings of backadjustment/settlement
flags, plus `ticker.modify()` ticker ID/session string kinds. Both simple and
series string overloads remain admitted; flag ceilings use the existing bound
argument checks.
An omitted `ticker.new()` or `ticker.modify()` session uses `syminfo.session`
from its execution context. Resolved builtin `ticker.modify()` calls infer the
simple/series string result from their argument qualifiers; imported callables
and receiver methods retain their ordinary return inference. Chart and requested evaluators both call the same ticker helper;
requested calls must use requested symbol metadata rather than return a blank
placeholder or inherit the chart's session.
The wider value behavior is pinned by
`tests/compat/pine-request-ticker-option-behavior.test.ts`, which asserts
literal values using a seeded
`RequestDatafeed`. It covers `ignore_invalid_symbol`/`ignore_invalid_currency`,
request-level `currency` and `calc_bars_count` routing, declaration-level
`calc_bars_count` metadata, repainting-safe higher-timeframe lookahead
differences, `request.footprint()` missing-data behavior, and all official
`ticker.*` constructors/modifiers feeding concrete `request.security()` symbols.
Requested calendar parts and `time()`/`time_close()` calls use the same helpers
as chart expressions, with the requested execution context, bars, timezone,
timeframe and session options. They must not return placeholder `na` or use
chart timestamps. `tests/compat/pine-request-calendar-native-v2.test.ts` pins
all four HTF gaps/lookahead combinations to native TradingView CSV bars0–8;
its fixture records the original capture path and SHA.
Requested calendar history uses the requested evaluator's history sizing checks,
just like chart calendar history. The emitted per-series hint is a buffer sizing
hint, not a hard `max_bars_back` limit; a zero hint must allow historical offsets
and requested-bar buffer growth.
With `dynamic_requests=false`, inline inner security calls execute independently
in the caller context. Their evaluated values are captured by the outer request
subprogram, like prior request declarations; they are not reexecuted in the
outer requested context. With dynamic requests enabled, nested calls retain
requested-context evaluation.
Historical higher-timeframe `request.security(..., lookahead_off)` selects the
last requested bar whose scheduled close is at or before the chart bar's
scheduled close. `gaps_on` publishes it on that confirming chart bar only
(comparing against the previous chart close), while preserving first-bar
prehistory publication. Cache requested closing timestamps; do not require a
following requested opening to confirm the last provider bar or bridge missing
provider bars. Nested requests use the enclosing requested bar's close.
Lookahead-on, unconfirmed realtime, same-timeframe and lower-timeframe selection
retain their existing opening/intrabar rules. Requested `time_close` variables
and history reads use the same timeframe/timezone helper as chart `time_close`,
with requested-context timestamps and history bounds. Small constructed-input
cases live in `tests/compat/pine-request-confirmation.test.ts`.
`request.footprint()` requires integer-kind `ticks_per_row`; string, boolean and
float arguments reject through the existing bound-argument kind check.
It requires only `ticks_per_row`; omitted `va_percent` and
`imbalance_percent` default to 70 and 300 in both preload routing and runtime
provider queries. Explicit unresolved routing values must remain unresolved,
not turn into those defaults.
The distinct footprint budget is separate from the general request-context
budget and shared across chart, captured-source and nested requested evaluations.
Unused footprint-dependent chart/requested copies must not consume that budget;
keep the original AST available to compile the requested output dependency.
The documented limit is one unique footprint request per script, including
copies in `request.security()` and `request.security_lower_tf()`:
https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#requesting-footprints-on-other-datasets
`request.splits()` requires both `ticker` and `field`; supplying optional merge
settings cannot substitute for either required parameter. The checker and v6
signature inventory must agree on this two-argument minimum.
Empty request timeframes mean the chart timeframe; if a host omits chart
timeframe metadata on the compiled path, TealScript uses the runtime default
`60` rather than treating the request as unseeded or recursing.
`tests/compat/pine-request-empty-context.test.ts` independently checks empty
symbol, empty timeframe and paired empty arguments against explicit identifiers.
Its distinct chart and remote values pin nested inheritance to the requested
parent, including lower-timeframe requests, rather than the chart context.
`request.security()` and related expression evaluators must replay prior
regular global/local value dependencies in the requested context, not capture
chart-scope scalar results. With dynamic requests enabled, prior `request.*` declarations are dependencies
too: compile them in each subprogram using its own nested request ID map. With
dynamic requests disabled, their chart-side results remain captures. Copy local UDT declarations into
request sub-engines before replaying typed values such as `MyType.new(...)`.
Computed UDF arguments forwarded into requests carry compiled expression
subprograms and their parameter/local dependencies, so TA state and history are
recomputed from requested bars. Captured parameter history is fed those actual
per-requested-bar values; indexing a chart scalar is not a substitute. Unused UDF
declarations are omitted from request subprograms to avoid recursively compiling
the enclosing request wrapper.
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
surface, not only the functions a corpus happens to call.
Both facade metadata and embedded program exports must match the published
version. `ta/4` retains all-time helpers and `trima2`; v7 removes them. Versions
12–14 share export names; v14 request improvements do not restore removed exports.
`pine-library-export-surfaces.test.ts` pins every supported library/version.
Unsupported official versions or documented exports without runtime bodies stay TealScript gaps and
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

Performance tests keep timing threshold assertions behind
`TEALSCRIPT_PERF_ASSERT=1` while functional assertions run by default. The full
package Vitest suite runs enough
concurrent work to make microbenchmark timing noisy. CI must run that opt-in
mode as a separate isolated step; a perf gate that only exists locally is not a
gate. Do not increase the benchmark workload or thresholds to make a timeout
pass. The request-backed worker smokes have 10s local timeouts because the
CI-shaped Turbo run stretches sub-second isolated checks under package
concurrency.

Behavior tables that assert literal expected values must declare provenance for
those values: independently derived from Pine v6/reference semantics, taken
from a published worked example, or a TealScript regression pin. Values captured
from current TealScript output are not correctness assertions; keep them labelled
as regression pins with a note explaining what local behavior they freeze.

**Corpus refusal provenance:** retain documented guards such as the invalid TA
length refusal in `39757006c2`. A non-TV fixture may be classified as
documented-invalid only with its unchanged source hash, declared version and
the exact reference contract; this is not native refusal evidence. An unchanged
published TV source's matching version/call shape establishes acceptance, so a new
engine refusal needs native refusal evidence. Keep raw gate failures and their
provenance; do not relax a guard or exclude a source to improve corpus counts.

**Language reference tests** keep named open defects executable with
`it.fails`; their `beforeAll` checks execution errors and output length separately,
so an unrelated crash cannot satisfy an expected value failure. Passing tests
require an observed failure under a targeted implementation mutation. Expected
reds require the inverse proof: the same assertion must pass against a documented
patch in an isolated source copy, which is then discarded.
For missing syntax, `beforeAll` may capture only the named parse error's class,
token and source location; unrelated failures must still fail that setup. Once
the syntax parses, execution and output-shape guards precede the functional
value assertion. Its inverse proof must parse, execute and satisfy that assertion.

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
constant, or getter coverage, including the five bare drawing casts.
Object-style drawing method calls must resolve by the receiver handle namespace
after user/imported methods, so `lineId.delete()` reaches `line.delete(lineId)`
without allowing builtin methods to shadow script-local methods.
`line.get_price()` raises a runtime error for an existing line using `xloc.bar_time`.
Namespace and receiver calls share the native v3 runtime message, including the
query bar index; bar-index lines retain extrapolation.
Numeric `label.set_size()` values below zero raise the captured native runtime
error on the calling bar before the label is mutated. Zero remains valid.
Box border/background and polyline line colors default to the script version's
`color.blue` value. Explicit colors and explicit `na` retain their values;
line and label body defaults keep their separate contracts.
Deleting a line removes every linefill that references it, preserving unrelated
fills and the surviving parent lines. Drawing-limit eviction uses the same
deletion path so discarded lines cannot leave orphan fills.

**Repeated table deletion (`e7b15a0ae5`):** namespace and receiver deletion of
an already deleted or missing table is a no-op. Other tables and their cells
remain intact; `table.all` contains only surviving tables.

`table.clear()` defaults each omitted end coordinate to the corresponding start
coordinate. Omitting both end coordinates clears one cell; supplying just one
end coordinate expands only that axis.
`table.cell()` binds its last optional arguments as tooltip, font family, then
text formatting in runtime and semantic validation. Named arguments retain
their parameter identities when combined with positional arguments.
Drawing `.all` values are read-only Pine arrays: aliases and slices reject
writes. Collection history and scope snapshots preserve this constraint;
explicit `array.copy()` results are independent mutable arrays.
The internal read-only array constructor, like `array.new` and `array.from`,
has no receiver and must bypass collection receiver validation.
Drawing `na` casts infer a series reference, including aliases of the result.
Keep the qualifier for `table`, `line`, `label`, `box`, and `linefill` missing
handles; a known object kind without a qualifier loses this reference contract.

Drawing casts return series references for `table`, `line`, `label`, `box`, and
`linefill`, including missing handles and result aliases. Positional and named
`x` bindings preserve the original handle; mutation through a cast affects it.
Drawing casts refuse known scalar and foreign-family inputs in the checker;
invalid inputs do not receive destination-family types. Runtime casts accept
missing values or handles allocated in the matching family and surface other inputs
as errors. Allocation-family records survive deletion and eviction until context reset.
Positive array history offsets also return read-only references, using the
same array helper. Historical slices reject writes through their parent;
copying the historical array first allows modifying the copy or its slice.
Offset zero returns the current reference. Keep missing references, history
offset validation, array metadata, and matrix/map history behavior intact.
Table cell updates bind named/positional arguments once and reuse a coordinate
index keyed by the table output object. The index rebuilds when the cells array
or its length changes, so clear, setter-created cells and realtime restoration
retain ordered output without a linear scan on every update.
Text alignment validation intentionally accepts `text.align_center` as a
vertical table/box alignment value in addition to `text.align_middle`; public
scripts use the center constant for vertical cell centering, and rejecting it
pushes valid Pine into the semantic-failure bucket.

Host-linked `input.source()` overrides may carry `{type: 'plot-source', values}`
through the existing generic inputs payload. Resolve the aligned sample at the
current source bar and normalize gaps to Pine na; do not coerce the descriptor
itself to a scalar. `visualTitleSources.test.ts` asserts history and TA behavior.

Lower-timeframe `request.security` selects the first/on or last/off intrabar
historically and the latest available intrabar for either lookahead on realtime
bars, including confirmed realtime bars. HTF publication retains its separate
unconfirmed-realtime condition.

## Worker Protocol

`request.security_lower_tf()` expressions cannot return arrays, matrices, or
maps directly, including inside tuples or through user-defined functions.
Collections inside user-defined object fields remain allowed.

**Main → Worker:** `init`, `updateBars`, `updateBar`, `setInputs`, `requestDataResult`, `dispose`
**Worker → Main:** `ready`, `requestData`, `result` (plots + inputs), `error`, `parseError`

Initialization retires the previous script and pending data requests before
validating replacement source. A failed replacement publishes its parse or
semantic error; later bars, inputs and old request replies cannot resume the
previous source. A successful initialization rebuilds state normally. See
`tests/worker/pine-worker-initialization-lifecycle-reference.test.ts`.

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
Requested UDF dependency selection includes global UDT receivers used only by
field assignments, including assignments in nested UDFs. An unused field read
must not be required to include the receiver's declaration.
Same-bar `updateBar` messages also route through the compiled worker bridge and
reuse the worker request cache; stale in-flight misses are cancelled per update.
Realtime re-entry correctness has a fast representative default test and a full
corpus sweep behind `TEALSCRIPT_REALTIME_SWEEP=1`; keep the full sweep opt-in so
the package gate stays cheap enough to run routinely.

`request.quandl` is deprecated and raises a visible runtime error, even with a
seeded provider or inside a requested expression. Explicit
`ignore_invalid_symbol=true` returns NA. Workers do not preload this unavailable
family; other request families retain their provider and discovery routing.
Index-zero refusals retain the captured `Invalid symbol: QUANDL:<ticker>|0.0`
identity from the bound request key. Nonzero index wording remains unobserved
and retains the existing deprecation message.

`request.quandl` column indices use the shared integer argument check. Both
named and positional calls admit int qualifiers through series and omit the
optional index; float, bool, string and collection indices are refused.

`ticker.modify` admits string qualifiers through series for its ticker, session
and adjustment slots. Futures backadjustment and settlement selectors retain
their distinct types and accept qualifiers through simple. Omitted session uses
the chart session; omitted adjustment leaves the instrument default. Omitted or
explicit inherit futures settings preserve the source ticker settings.

## Grammar Features

- Pine v6 unavailable boolean history is `false`, including an untyped UDF used
  with both bool and numeric arguments. Ambiguous identifier types dispatch on
  the invocation's value type; numeric unavailable history and v5 bool NA remain NA.
Value-returning `if` branches must have compatible types. The checker reports
`conditional-branch-type-mismatch` for incompatible known types instead of
silently inferring `unknown`; compatible integer/float branches widen to float.
Only the consumed final statement supplies a block return type. Intermediate
conditionals with discarded results can have incompatible branch types.
History references to variables declared in conditional or loop scopes report
`inconsistent-local-history` as a warning because those scopes can skip bars.
Function and method definitions belong to global scope. A nested definition
retains the established `function-scope` diagnostic inside a function; other
local definitions report `function-definition-scope`. Global-to-global calls remain allowed.

Version annotation detection ignores quoted markers using the parser’s existing protected string ranges. Real compiler comments retain their source order and may appear after executable statements.

Explicit v6 single-line quoted continuations insert one space per wrapped line, without a line terminator. The parser passes its detected version into the grammar; triple-quoted literal contents and pre-v6 behavior remain independent.

Supported: version annotations, indicator and strategy declarations, library declarations, imports, function definitions, methods, user-defined types, enums, variable declarations (var/varip/typed), tuple declarations/reassignments, if/else, switch, for, for-in, while, break/continue, binary/unary/ternary operators, function calls with named and mixed args, member access, index/history access, literals (number, string, boolean, color, na), comments.

Measured v6 grammar coverage is committed in `src/compat/pineV6GrammarReference.ts` and pinned by `tests/compat/pine-grammar-coverage.test.ts`. The current inventory covers 63/63 official-doc and manual-index construct snippets and the known-missing grammar allowlist is empty. Run `yarn vitest run packages/tealscript/tests/compat/pine-grammar-coverage.test.ts` after parser/checker grammar changes, and rebuild/commit generated parser files when `grammar.peggy` changes.

The official reference manual index audit is separate from the local grammar and
builtin inventories. `src/compat/pineV6ReferenceManualIndex.ts` is a names-only
snapshot from `https://www.tradingview.com/pine-script-reference/v6/`, and
`src/compat/pineV6ReferenceManualAudit.ts` records what the local inventories
omit or include that the manual does not. Keep that audit current when changing
grammar or builtin reference data; it is the guard against measuring only a list
we wrote ourselves.

**Important current gaps:** imported Pine libraries are parsed/checked, and compiled execution supports host-provided exported constants, expression/block-bodied pure functions, methods, UDT constructors/fields, local/imported enum members and `.title()`, versioned aliases, export-to-export calls, and transitive host-provided imports inside compiled security expression subprograms; host-backed request data depends on the caller's datafeed, with `request.currency_rate()`, `request.economic()`, `request.financial()`, `request.footprint()`, `footprint.*`/`volume_row.*` object accessors, and corporate-action requests routed through provider seams and returning `na` when unseeded; `request.*` calls inside user-defined wrapper functions compile for direct source parameters, captured computed expressions, root-scope regular values, `input.source()` aliases, imported tuple helpers, UDF parameter/local history, UDT field history, indexed TA call-result history, and nested UDF call-chain-local `ta.*` state; timeframe parsing follows v6 bounds, `timeframe.from_seconds()` requires integer seconds in v6 and propagates series arguments to a series string result; duration conversion floors finite values at one second and chooses daily durations before the next weekly boundary, and `timeframe.change()` uses calendar-aware timeframe buckets; compiled drawing objects use declaration `max_*_count` limits and oldest-first eviction; the strategy ledger tracks deterministic position accounting but is not an exact TradingView broker emulator.

Legacy Pine compatibility is version-conditional in the checker and compiled execution. v2/v3/v4 scripts accept
legacy `input()` type selectors, bare color/style constants, old ticker helpers,
bare `tickerid`, bare `random()` routed to `math.random()`, v3 `n` as `bar_index`, numeric truthiness in boolean built-in
parameters, legacy visual `transp`, and boolean `strategy.entry()`/`order()`
directions; bare colors are v2/v3-only and require `color.*` starting in v4.
V6 signatures remain strict unless the reference says otherwise.
For legacy visual `transp`, an alpha-bearing color retains its own alpha,
including explicit `00` and `FF`, regardless of the transparency argument.
Only colors without an alpha component receive the deprecated parameter's alpha.
The v3 `color(color, transp)` constructor was renamed to `color.new()` in v4.
Both semantic checks and compiled execution reject the old multiargument builtin
in v4-v6; current single-argument `color(x)` casts and user function shadows remain valid.
The histogram spelling changed at v4: builtin `histogram` is v3-only, and
`plot.style_histogram` requires v4+. Keep this boundary in the version-rule
table and preserve declared local shadows. The modern `ta.hma`, `ta.cum`, and
`str.tonumber` calls require v5+; their old global names remain the v3/v4 forms.
These member-specific guards preserve user/imported callable shadowing.

V4 `fill()` defaults omitted `transp` to 90, while embedded color alpha
takes precedence over both default and explicit `transp`; modern fills
have no implicit transparency.
Bare
`tickerid` and `period` variables are pre-v4 spellings of `syminfo.tickerid`
and `timeframe.period`; v4+ refuses them unless user-defined. Legacy
`tickerid()` constructor calls retain their separate callable rules.
Non-exported request wrappers may run from local blocks without
`dynamic_requests=true` in v3-v5; v6 requires it for wrapped requests invoked
from local blocks. Keep this rule in `src/pineVersionRules.ts`.
TradingView v2 capture attempts 1/2 refuse the v6 constant expression
`timeframe.in_seconds(timeframe.from_seconds(59))` with CE10294. Checker and
compiled analysis surface that captured refusal, including equivalent named bindings.
The `time()` named timeframe slot accepts legacy `resolution` in v3/v4;
v5/v6 require `timeframe`. Checker binding and compiled time filtering both
use the version table so legacy named calls select the requested bucket.
Legacy `security()` binds `resolution` to the requested timeframe in v3/v4,
including mixed positional/named routing. V5/v6 use `request.security()` and
`timeframe`; the legacy alias is scoped to the old global function.
Direct literal `na` comparisons emit warnings in v5, matching the compiling
v5 type-system example and native Pivot Candles intake. V6 retains errors,
as required by the current type-system manual. Runtime comparison semantics
are unchanged; `na(value)` remains the supported missing-value test.
Self-history variable initializers are admitted only for explicit Pine v2.
Pine v3 onward checks the initializer before declaring the variable; the
documented replacement declares the variable and then reassigns it.
Keep this boundary in `src/pineVersionRules.ts`.
Version-sensitive v6 migration rules live in `src/pineVersionRules.ts`; do not
hard-code `<= 5` checks at enforcement sites when the rule belongs in that
table.
Published builtin slot renames live in `src/pineBuiltinParameterRenames.ts`.
The checker accepts `crossover(x, y)` names only before v5, while the analyzer
normalizes those slots to `source1/source2` before TA extraction. Normalize
named-prefix plus positional arguments together; keep modern old-name refusal
and legacy duplicate-binding checks intact.
The same table maps legacy `cum(x)` to `ta.cum(source)` and `tonumber(x)`
to `str.tonumber(string)`. TA extraction and the legacy string emitter normalize
these names before runtime binding; keep v5+ old-slot refusal scoped to those
member declarations.

Native captures refuse the builtin `bar_index` in explicit v3 scripts; legacy
`n` and user bindings named `bar_index` remain available. Semantic preflight and
the compiler analyzer enforce the same central availability rule. The captured
bgcolor probes fail at that identifier, so they do not settle offset semantics.
The shipped v4 native v6 probes refuse `==` and `!=` for `box`, `chart.point`,
`polyline`, and `table` operands during semantic compilation. The version table
selects each operator's kinds; the shipped v2 native capture also refuses `linefill ==`.
Compiler user-binding exemptions track declared names in their active lexical
blocks, parameters and loop iterators. A future declaration or a declaration
in another block cannot mask the unavailable builtin; assignment targets use
the same availability guard. Existing TA-name and request-capture tracking is
unchanged. Scope witnesses establish checker/compiler consistency, with
runtime controls; they are not new TradingView capture outcomes.

External public-corpus reports are metadata only, read source from
`/tmp/pine-corpus-v1` or `/tmp/pine-corpus-v2`, and carry row-level validity
classification: `supported`, `tealscript-gap`, `host-dependency-gap`,
`unsupported-by-design`, `invalid-pine`, or `corpus-hygiene`. The achievable
ceiling excludes rows marked invalid by a specific TradingView rule, obvious
non-Pine corpus hygiene, corpus input gaps, and permanent unsupported-by-design
policy outcomes. Rows not proven invalid, hygiene, corpus-input, or
unsupported-by-design remain in the product denominator as TealScript or
host-dependency gaps so the corpus cannot flatter TealScript by guessing.
`yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate` is the
standing cheap acceptance-regression gate over a 12-row committed real-script
fixture selected from v5/v6/v7. It catches parse/semantic/compile/execute/output
regressions on that subset only; it does not replace a full pinned corpus rerun
or prove output correctness.
`yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate` is
the sibling expected-refusal gate over a 6-row committed fixture. It asserts
specific refusal diagnostics for invalid TA lengths, modern `iff()`, computed
request barmerge modes, v6 migration linewidth, and surfaced array.slice range
errors. It catches refusals silently becoming accepted or changing into the
wrong failure, but it also does not replace a full pinned corpus rerun.
`pine:external-corpus:pinned` archives `packages/tealscript` before importing
the runner from the measured commit. The report directory is large enough that
the archive needs a 1GB `maxBuffer`; lowering it can make current reruns fail
with `spawnSync git ENOBUFS` before any corpus measurement starts.

See `PINE_PARITY_AUDIT.md`, `PINE_COMPATIBILITY_INVENTORY.md`, and `PINE_BUILTINS_COVERAGE.md` before claiming PineScript compatibility.

## Commands

The documented `ta.supertrend` worked example still evaluates band recurrence
when current high/low are unavailable. Do not return early for a missing range:
with established bands and a known prior/current close inside those bands, the
recurrence retains the prior band and direction. The narrow range-hole witness
uses equal prior high/close to avoid the separate ATR authority conflict; it
does not settle subsequent recovery or dynamic-factor native behavior.

The package `typecheck` script intentionally runs with
`NODE_OPTIONS=--max-old-space-size=12288`. This was first raised to 8GB when
the post-parity TypeScript graph outgrew Node's default heap, then raised again
on 2026-09-12 after a package typecheck OOMed at 8192MB before diagnostics.
The same growth moved the healthy-gate wall time from an earlier 86s baseline
to a 2:16 12GB pass; keep dated heap and timing measurements with any future
change.

```bash
yarn build:parser     # Regenerate parser from grammar.peggy
yarn build-force      # Build with tsup
yarn dev-force        # Watch mode
yarn test             # Vitest
yarn pine:external-corpus:fast-gate # Fast real-script corpus acceptance gate
yarn pine:external-corpus:refusal-gate # Fast expected-refusal corpus gate
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

- A function whose last statement reassigns an identifier returns its resulting
  value, including compound assignments. Read that value after assignment so
  UDF history/state writes and compound operand evaluation occur once. Native
  EMA reference captures pin this behavior; function-name declaration returns
  retain their existing handling.
- Dynamic `ta.variance`/`ta.stdev` biased flags select the current divisor without
  splitting the callsite source history; constructor-cache keys retain length
  identity, and compute/recompute receives the current flag.

- Series-length ALMA/BB/BBW/CCI/CMO/COG/Correlation constructors share timestamped
  call-site source history. A selected tuple catches up on intervening samples
  before computing; same-bar replacement and snapshots preserve its cursor.
  Keep the existing TA classes as the arithmetic and missing-value authorities.

- ALMA offset/sigma/floor and BB/BBW mult use the shared simple-parameter
  qualifier table. Their sources and integer lengths still admit series values;
  positional and named tuning arguments admit const/input/simple values only.

- **Canonical compiled SMA (`2955028898`):** local or conditional calls advance
  their call-site machine only when reached; unconditional global calls may use
  source-series history. Reuse this consumer; `903cd018b7` is retired and must
  not be merged as a second adapter.
  The unconditional `_smaFromSeries` route retains one native compensated sum
  machine per written call via `SMA.sourceHistory`; it advances from source
  history instead of restarting a fresh fold. Changing lengths retain the
  source/eviction history, and same-bar replacements restore the pre-current
  machine state. Both state and replacement snapshot participate in script
  rollback. Scoped and conditional SMA call clocks remain separate.

- Typed v6 bool declarations initialized by `if` use `false` for an unselected arm, including persistent declarations; v5 bool keeps its `na` default.

- Pine v6 plot `style` is a unique-type parameter and rejects an explicit `na`; legacy versions keep their existing parameter rules.

- `varip` validation rejects drawing IDs, including map values and drawing fields reached through collected UDTs and their collection fields. Direct UDT variables retain independent eligibility. Current collection manuals settle fundamental/chart.point/footprint/volume_row elements and eligible UDT fields; preserve captured v3 scalar special types, enum values and primitive maps. Collection enum eligibility remains unadjudicated and retains acceptance. Imported UDT fields resolve in their library namespace during the transitive check.

- Native v3 history offsets reject negative bars-back values at execution.
- Native v3 `close[int(na)]` reads the current close; normalize missing history offsets at the history operator.
- History `[]` cannot be chained on the same value (`close[1][2]`); the semantic checker reports this before execution.
- Builtin `matrix.is_antidiagonal` and `matrix.is_triangular` return `series bool`
  in namespace and receiver forms; compatible custom predicate overloads retain
  their existing inference. Predicate arithmetic and storage are unchanged.
- `array.first` preserves its element kind with a `series` result qualifier;
  `array.indexof` returns `series int` and checks searched-value compatibility,
  including int-to-float widening. These checks resolve actual builtin calls
  before applying namespace or receiver rules, preserving custom method binding.

- `generated.js` is auto-generated — edit `grammar.peggy`, not the generated file
- Loops enforce a 500 ms elapsed-time budget per bar, including nested work; timeout errors halt execution. The bound host clock is checked on the first iteration and after exit. Adaptive checks double their stride up to 1024 while intervals stay below 1/32 of the budget, and reset to every iteration after an expensive interval.
- Literal-bound numeric loops use a fixed direction only for an omitted or finite nonzero literal step; computed and missing steps retain runtime sign selection.
- Direct `var`/`varip` initialization from `for`, `for...in`, or `while` stops
  after its first iteration, including `continue`, without reevaluating the next
  header. Regular initialization, reassignment, and UDF wrapping retain full loops.
- `na` is represented as `NaN` internally; `na == na` is false in v6; v5 comparisons retain boolean `na` for unavailable operands
- Native v4 float-comparison phase masks settle an inclusive absolute-difference tolerance of `1e-10` for v6 equality and ordering, including nonzero operands. This overrides the [type-system float prose](https://www.tradingview.com/pine-script-docs/language/type-system/#float) about nine-digit rounding. Preserve unavailable-value guards and the original volume-index reset behavior.
- `na` is represented as `NaN` internally; `na == na` is false in v6; v5 comparisons retain boolean `na` for unavailable operands
- ESLint ignores generated parser files (configured in `eslint.config.mjs`)
- The worker entry point requires bundler URL resolution: `new URL('@tealstreet/tealscript/worker', import.meta.url)`
- Compiled tuple/control codegen must treat `_` as discard-only, read tuple elements through runtime indexing, and propagate expression-result assignment through nested if/loop tails.
- **Scalar `_` declarations are discard-only too.** Check their initializer and annotation normally, but do not bind a semantic symbol or seed a self-history symbol. Repeated discards in the same scope are valid; reads remain unknown identifiers, matching tuple discards.
- Regular scalar `_` lowering evaluates the initializer for its effects without creating a JavaScript binding, including in functions and loops. This prevents duplicate local declarations for repeated discards.
- **Tuple declarations use regular declaration mode.** The parser can represent `var`/`varip` tuples, but the semantic checker refuses those modes; persistence keywords remain valid for scalar declarations.
- **Pine declaration arguments require `const`.** Check every recognized expression field of `indicator`, `strategy`, and `library`, including titles and numeric/boolean options. Unknown types retain their existing diagnostics; the TealScript-only `calc_on_every_history_tick` extension retains its existing contract.
- Complete-script checking opts into `requireDeclaration`: exactly one global `indicator`, `strategy`, or `library` is required and declarations in local scopes are refused. Worker initialization enables this option before storing state. Default semantic checking remains suitable for declaration-free fragments and combined diagnostic fixtures.
- **Generated value-vector coverage snapshots are gitignored** (`reports/.gitignore`). `pine:value-vectors` writes one every run and adjacent generations are near-identical — a 2026-09 audit measured **0 of 931 cases changed between consecutive versions** — so the committed series had grown to ~570MB of history carrying no reviewable signal, and it was stripped from the parity branch before merge. `coverage-v117.json` and `coverage-v174.json` stay **tracked** because scripts import them; gitignore does not untrack existing files. **If a future generation is genuinely needed as a committed input it will be silently ignored** — the same failure mode as the bare `coverage/` rule in the root `.gitignore` that once kept a real source file out of a build. Stage it with `git add -f` and say why in the commit message.
- **A blast-radius sample is a lower bound; an exposure count is an upper bound.** Both were measured on 2026-09-12: the TA qualifier enforcement predicted 6 newly-refusing corpus rows and the full rerun found **10**, while negative modulo had **165** definite negative-capable rows and a measured value impact of **5**. Neither method is a forecast — quote them as bounds, and measure the real delta before claiming one.

Native v2 three-slot array percentile captures retain the original array size
when calculating rank positions, even when some slots are NA. A selected
position beyond the finite sorted values returns NA instead of shrinking ranks.

Native v2 RCI normalizes average price ranks with Pearson covariance and both
rank variances. The untied sum-of-squared-rank-differences shortcut overstates
correlation when price ranks tie. Missing-slot behavior is separate.

Native v2 TA linear percentile captures select the clamped zero-based position
`percentage / 100 * length - 0.5` and interpolate its adjacent sorted values.
This position differs from the array helper; missing-window policy is separate.

Native v2 RCI starts publication after `length + 1` physical source bars. It
then ranks the latest `length` slots; the extra startup observation does not
extend the ranked window. Recompute restores this observation count as well.

TA volume-index reference contract: NVI/PVI hold their previous value whenever current or previous close is zero or missing, as specified by the official equivalent Pine implementations. A zero close must not extinguish the accumulated index.

NVI/PVI compare current volume with `nz(previous volume, 0)`. Missing current volume does not update; missing previous volume is zero for the comparison, so positive current volume can advance PVI.
Direct map `for [key, value] in map` loops reject size changes at shared map
mutators, including alias/UDF changes; updates of existing values remain allowed.
An active-iteration count is released with try/finally on break, return or error.
Single-variable direct map loops are semantic errors; keys-array/copy iteration
can still modify a different map. Numeric v5 boundaries stay fixed, and NA end
values prevent iteration.

Native percentile startup and interpolation follow the verified rank position and saved finite-sample timestamps. Interior gaps preserve missing-window publication separately from initial leading padding; wider chart-hole behavior remains bounded to native evidence. Preserve explicit percentage range refusals and the separate nearest-rank path.

Native PercentRank compares the current sample with the previous physical lookback and counts unavailable comparisons as false. This differs from the reference NA-inclusion remark; native captures govern runtime behavior; the contradicted documentation assertions are recorded as DOC-vs-NATIVE with native winning.

Series-length `ta.mom` must share one source history at its call site across changing offsets. Reconstructing or caching independent Mom instances per length discards intervening samples, causing false warmup NA or stale differences when an old length returns. The generated source history participates in function-call isolation, snapshots, and same-bar replacement.

KC/KCW with `useTrueRange=false` compute high-low range independently of the explicit basis source. A source-only NA must not freeze the range EMA. This is also covered by the queued oscillator capture fix; preserve the independent-range rule when integrating both branches.

Native stochastic recovery captures settle undefined ratios: a never-defined flat window remains NA; after a finite output, source-only holes and 0/0 flat ratios retain the last computed output. High/low windows continue advancing independently.
The semantic checker stores user-defined function symbols separately from values. Pine source can declare `scale = scale(close)` or tuple values sharing UDF names; function-call resolution must retain argument/qualifier/return checks after the value declaration. Duplicate value declarations still error. A function and a same-name value must not overwrite one another in SemanticScope.

Wrapped tuple declarations can place the indented equals on a later line after blank lines. DeclarationEqualsSpace must skip the same blank-line form as InitializerSpace while still requiring an indented equals, so unrelated subsequent statements remain separate. Regenerate the parser alongside grammar changes.
The `bool(x)` cast accepts numeric, boolean and explicit NA arguments, preserving
qualifier inference. It rejects strings, colors and collection/object IDs rather
than converting their JavaScript truthiness; casts shadowed by user callables
retain normal user-function checking.

The common v6 visual qualifier table includes input-or-weaker bgcolor
editable/show_last/display and const title/force_overlay. Keep the row-specific
background witnesses; offset/transp version rules remain separate.

Corporate forecasts `dividends.future_amount`, `dividends.future_ex_date`,
`dividends.future_pay_date`, `earnings.future_eps`, `earnings.future_revenue`,
`earnings.future_period_end_time` and `earnings.future_time` read scalar host SymInfo metadata,
with missing values represented by NA. The initial context copy fixes these values until
recalculation; timestamps retain milliseconds and estimates retain instrument currency.
Hosts supply forecast availability.
Corporate forecasts `dividends.future_amount`, `dividends.future_pay_date` and
`earnings.future_period_end_time` read scalar host SymInfo metadata, with missing
values represented by NA. The initial context copy fixes these values until
recalculation; timestamps retain milliseconds. Hosts supply forecast availability.
- `array.new_label` and `array.new_color` supplied seeds use the resolved constructor binding and must match the element kind;
  omitted/NA seeds and locally shadowed array receivers retain their existing admission.
  Both reuse the float-constructor seed check and leave runtime allocation unchanged.




### Collection result qualifiers and symmetric eigen roots

`array.min` namespace and receiver calls return the element kind with a series
qualifier, even when the stored elements are constants. A simple declaration
must not erase that result qualifier.

For finite symmetric matrices larger than 2x2, eigen roots use Householder
tridiagonal reduction and implicit QL (public-domain JAMA adaptation). This
avoids treating equal-magnitude opposite-sign real roots as missing merely
because unshifted QR stalls. The existing nonsymmetric and 2x2 paths remain;
exact native eigenvector ordering/sign and nonsymmetric algorithm parity are
not inferred from residual tests.
Legacy v3/v4 `sin(x=...)` retains its old named slot through signature binding
and emission; v5/v6 use `math.sin(angle=...)` and reject old `x`.

Legacy v3/v4 `ceil(x=...)` binds and emits the old slot; modern
`math.ceil(number=...)` does not accept old `x`.

Legacy `time_close(resolution=...)` aliases to `timeframe` without changing
positional timezone/offset overload selection; v5/v6 reject `resolution`.

`timenow` samples the wall clock per historical/realtime execution. Explicit
`runtime.now`/`ExecutionContext.setNow` remains a fixed deterministic clock.

Workers retain per-bar `timenow` observations while refreshing only the open bar.
Reload/input changes clear observations; request discovery uses a copied cache
so provisional executions do not seed displayed timestamps or varip state.

`table.clear()` defaults omitted end coordinates to their respective starts;
omitting both clears one cell, and one supplied end expands only that axis.

- `array.new_label` supplied seeds use the resolved constructor binding and must be label values;
  omitted/NA seeds and locally shadowed array receivers retain their existing admission.
  The guard reuses the float-constructor seed check and leaves runtime allocation unchanged.
- Generic `array.new<T>` supplied seeds use the same assignability and resolved-binding guard
  for the declared element type, including numeric widening and matching reference families.
  Omitted/explicit NA seeds remain valid; named constructor families retain their own guards.

- `array.new_int` supplied seeds use resolved `initial_value` binding and int
  assignability. Omitted/NA seeds remain valid; user calls and generic
  constructors retain their existing selection rules.

- Builtin `array.remove` and its receiver method return the stored element type
  with a `series` qualifier, retaining UDT/template identity. Selected custom
  methods keep their own return inference.
- Builtin `close` history retains its inferred/declaration capacity up to the documented 10,000
  offset ceiling; larger requests surface the existing historical-offset runtime error.
- Pine v6 `array.from` refuses definitely incompatible element kinds in a single call while
  accepting int/float promotion. Unknown/NA arguments defer to existing inference; local
  callable shadows and legacy numeric-to-bool version rules retain their admission.
Drawing v6 argument contracts use `point` for line point setters and `text_size`
for `box.set_text_size`. Table position and linefill color are required; table
setters accept their documented optional values, and reference casts require x.

`chart.point.now` defaults an omitted price to the current close; an explicit
unavailable price remains unavailable, independently of its time and index.

A successful table.new call automatically deletes older tables at its position,
including empty replacements. Replaced references become missing for na checks
and their cells stop consuming the table allocation budget. Capacity validation
preserves the previous table if the requested replacement itself is invalid.
Identical table.merge_cells ranges remain idempotent as captured in native v3
scalar-07; this does not settle arbitrary overlapping ranges.

Drawing argument checks distinguish integer coordinates/dimensions from numeric
prices and table cell percentages, require matching reference IDs/points, and
enforce const force_overlay in function and method calls.

An omitted table.cell_set_text_size value resets the addressed cell to size.normal,
preserving its other attributes and the other cells.

Native v4 corpus5-table-na-row-v1 settles the v5 table.cell missing row at zero:
the script runs and paints its single cell. Finite row bounds remain enforced;
other versions and table operations keep their coordinate checks.

- Pine v6 ta.alma length is integer-kind, including numerically integral float literals: the existing narrow TA parameter map enforces this slot. Series-int lengths and legacy numeric admission retain their existing contracts; ALMA arithmetic and missing-value windows are unchanged.

- Legacy v3/v4 asin(x=...) reuses the shared canonicalBuiltinArguments mapping into the existing internal number slot. Captured v4 bundle evidence settles the conflicting modern spellings: v5/v6 math.asin accepts angle and refuses number. Legacy x binding remains unchanged.

- Legacy v3/v4 swma(x=...) maps to the canonical source argument through the shared TA analyzer normalization and version-gated signature alias. Modern ta.swma(source=...) remains canonical; missing values still occupy the four-bar symmetric window.

Pine v3/v4 bare `dividends()` routes through the same corporate-action provider and field validation as `request.dividends()`. Static preload and dynamic-query discovery normalize that alias too; a local function named `dividends` retains precedence and creates no corporate-action preload. The bare builtin is unavailable starting in v5.
Drawing copy and table clear receiver methods dispatch by receiver type, even
when their names overlap collection methods; collection, UDT and point paths retain their semantics.
Collection parameter hints and untyped missing-ID refusals remain in that
dispatch; nullable UDT/point copies keep their separate missing-value behavior.

Integration of version rules with distinct visual style types: named plot/hline unique values pass the versioned style guard, while the dedicated unique-family guard rejects use in another family or scalar slot. Visual offset qualifiers run once with the assignment-aware scope. TA integer kind refusals take precedence over qualifier checks on the same invalid argument; valid integer arguments retain their simple/series checks.

The engine-baseline strategy fixtures 004-ema-trend-follow and 011-bidirectional exclude the initial trade produced before the slow EMA warmup. Their remaining captured baseline trades are unchanged; both preceding integration and the priority batch produce identical strategy output. This follows TV-settled CF040 SMA startup, while these fixture CSVs remain explicitly engine-baseline evidence, not TradingView exports.

Native smoothing integration keeps masked RMA output as the direct-class default, while exposing the verified retention mode with an explicit false flag. Native ta.rma/ta.wma constructors carry their explicit mode flags. Conditional SMA invocations preserve the lane-B call clock alongside existing visual-offset qualifier and numeric-value tracking.


- Fill budget counts come from the semantic color qualifier: const/input/simple
  fills cost zero; series fills cost one. Hidden ordinary plots still count.

- Same-arity local overloads have distinct internal declaration names. Compiled
  calls reuse semantic type/qualifier resolution instead of binding by arity alone.

- Non-dynamic direct local requests fail during compilation, using the analyzer's
  version-aware scope reason. Legacy non-exported wrappers remain accepted;
  conditional-operand and nested-request policies retain their separate guards.

- Native v6 `timeframe.change()` is false without a previous bar; it signals
  subsequent timeframe boundaries. Explicit first-bar initialization remains
  separate. Legacy behavior stays version-gated pending native evidence.

- Ordinary builtin `plot()` rejects definitely typed array series before execution.
  Local callable shadows and unknown/NA arguments retain their existing rules;
  project arrays to scalar values before plotting.

- `ta.pivot_point_levels` checks its six documented type strings at runtime,
  before computing levels. Native v3 bounds07 pins invalid-type refusal on bar0.
**BBW native scale:** `BBW` returns percentage width, `(upper - lower) / basis * 100`. The native CF034 v2 CSV settles the conflict with the ratio-only description; preserve BB state/warmup and the existing zero/missing basis guards. `pine-ta-adjudicated-bbw.test.ts` pins native historical cells and same-bar recomputation.

**COG/Dev holes:** native CF035/CF039 follow raw chart-slot numerator/deviation windows. COG retains its separate non-na `Sum` denominator and snapshots both histories. Dev uses the verified compensated SMA mean and physical deviation window. Holes mask the result until they leave that window; both mean and source state participate in recomputation. This preserves the exact captured v1 CCI formula. `pine-ta-adjudicated-cog-dev.test.ts` pins source-hash-backed native missing cells and recovery.

**Native statistical kernel:** `Sum`, the SMA class and runtime `math.sum` reuse
the compensated rolling-sum machine, including realized eviction entries and
fixed-order rebaselining. StdDev/Variance use independent source and squared
source sums with native population/sample raw-moment association and a
nonnegative variance clamp. Preserve all compensation and retained history in
rollback state. The emitter's `_smaFromSeries` remains a separate fresh-fold
path. MFI applies its separately captured private zero boundary to the two
flow sums at publication; it never changes shared Sum state or arithmetic.

**Dynamic Dev lengths:** include `Dev` in the gated `dynamicWindowClasses` opt-in so root and function calls retain their source history independently of constructor length. `_windowTAFromSeries` reconstructs Dev from the current physical window; a missing raw slot masks publication, while an all-valid window also supplies its full non-na mean. Static Dev arithmetic is unchanged. `pine-ta-native-dev-dynamic.test.ts` pins native length-switch cells for positional, named and function calls.

**VWAP daily default:** native one-source calls and the `ta.vwap` variable reset daily. Lower an omitted call anchor and the variable's preupdate anchor through the existing `timeframe.change("1D")` runtime builtin so requested contexts and symbol timezone use their own clocks. Preserve the variable's `hlc3` source and prior-bar history across resets. Explicit call anchors (including false) remain caller-controlled; scalar/tuple overload metadata is a separate unresolved documentation conflict. `pine-ta-adjudicated-vwap.test.ts` uses the native v1 midnight discriminator, with v4/v5/v6 variable controls in `pine-vwap-variable-reference.test.ts`.

**KC source holes:** use separately SMA-seeded basis/range EMAs. Native CF041/CF043 mask the basis publication on a missing source while retaining its accumulator; the OHLC span EMA continues advancing on those bars. Reuse EMA's missing-output option for KC basis only, and snapshot both streams for recomputation. False-mode source-hole fixtures are in `pine-ta-adjudicated-kc.test.ts`; no global OHLC-hole policy follows from them.

Keltner integration uses explicit SMA/mask flags for its basis and SMA/retention flags for its range, preserving direct EMA defaults and noise arithmetic. Raw-slot COG snapshots its independent Sum accumulator; Dev preserves the compensated SMA mean, physical deviations and both snapshots. For-in counters retain private local names together with live _iterEntry/_iterSize traversal and the persistent-declaration iteration cap.

UDF invocation isolation retains both __historyKey for adaptive series sizing and __callPath for stateful builtin dispatch in root and nested function states. Scoped builtin IDs are emitted JavaScript expressions on all existing collection/drawing/footprint paths; named aliases, read-only .all arrays, nullable copies and receiver kind hints remain in those dispatchers. Conditional-call placement and function-call detection are separate guards. Local-evaluation indexing skips `loc` metadata just like other semantic emitter walks, while preserving diagnostic coordinates and revisiting shared nodes when they occur inside a local subtree.

Drawing .all members route chained array methods through collection dispatch,
including mutable copies and visible refusals for direct read-only mutation.
Direct map `for [key, value] in map` loops reject size changes at shared map
mutators, including alias/UDF changes; updates of existing values remain allowed.
An active-iteration count is released with try/finally on break, return or error.
Single-variable direct map loops are semantic errors; keys-array/copy iteration
can still modify a different map. Numeric v5 boundaries stay fixed, and NA end
values prevent iteration.
Linefill reference IDs reject equality and inequality operators; other drawing
references retain their existing identity comparison behavior. Drawing copy
and linefill parent getters preserve their reference kind and series floor.

The shared requested financial resolver preserves the structured invalid-symbol contract in chart and nested contexts: throw when ignore_invalid_symbol is false or omitted, and return missing when true. Other absent-provider responses retain their missing-value behavior.

The shared v6 visual qualifier table checks input-or-weaker bgcolor
editable/show_last/display and const title/force_overlay after ordinary
kind/binding checks. Older-version signatures and the separate visual
offset qualifier/version rule remain unchanged.

Declared-v4 `bgcolor` defaults omitted transp to 90; v5 stays opaque unless
the color specifies transparency. Embedded RGBA alpha wins over both omitted
and explicit transp for v4 bgcolor, as specified by the v4 colors manual.
This rule is scoped to bgcolor/v4 and does not infer older series-offset placement.

Map iteration guards wrap the live indexed for-in traversal in try/finally; both early exits and normal completion clear only the map mutation guard. Private counter names and the persistent-declaration one-iteration limit remain in this traversal.

Worker varip snapshots retain their explicit local-name lists alongside both builtin invocation paths and adaptive history keys. Monthly timeframe conversion remains centralized in the preoracle duration converter; timeframe.in_seconds divides that duration once, without a duplicate monthly fast path.

The builtin-signature coverage mirror follows the verified input.source positional tail (display, active, confirm) and input.text_area signature without inline. Keep it aligned with the semantic checker and compiled input metadata when merging the documented UI fixes.

Native HMA integration uses chart-slot WMA children and floors the square-root window, while retaining deferred internal zero-length validation for eagerly constructed call sites. Legacy cum/tonumber aliases share canonical named binding without dropping the older tostring x/y mapping or expression-valued scoped builtin IDs. Integer guards and histogram version checks coexist with the earlier per-builtin and dotted/color migration guards. The unified integer helper includes the verified HMA v5/v6 length guard, rejecting float-typed lengths before checking their simple qualifier.

Dynamic TA window integration retains the existing captured NumericSeries extrema windows and older-tie chart offsets. Dynamic Dev joins the shared source-history window classes while retaining cached local/UDF placement and the existing LinReg/Range/Median/Mode/PivotHigh paths. The expanded per-call source-history map coexists with conditional SMA invocation clocks, independent momentum history, scoped builtin IDs, and host history sizing. V4 non-gradient fill transparency uses the resolved plot/hline argument slots; embedded alpha takes precedence over the default90.

Dynamic Highest/Lowest/HighestBars/LowestBars reduce the collected source window directly instead of replaying temporary instances that copy a length-sized snapshot on every sample. Constructor validation, physical warmup, contiguous suffixes, and older-tie offsets stay identical; persistent TA instances and snapshot APIs retain their existing behavior.

Legacy VWAP x binding is resolved after shared parameter aliases, with the Pine version passed through analyzer extraction. Explicit const-symbol reassignment checks coexist with the v6 mutable-declaration prepass and same-name UDF/value inference. Only the v3 timeframe-variable lowering remains for isintraday/interval.

Requested-calendar integration retains one historyCheck(calendar:name, offset, hint) callback and reads requested bars with Infinity after that sizing check; the emitted hint is not a hard host limit. Requested calendar/filter/session evaluation, independent nested captures, and source-subprogram dependency replay share the recursive compiler, while imported-library emission still receives the library map.

Compilation performance caches coexist with the inherited-request recursive compiler. Parent membership indices preserve the first owner of either the request node or its expression, defaulting to the complete body when neither is present. The shared parent function-request summary feeds dependency selection and capture preparation without changing independent-versus-dynamic replay; source-parameter wrappers retain their requested subprograms. Each recursive compile builds its own fresh context and still forwards the library map.

Request-source replay captures caller loop counters and loop-local values when
they are passed through a UDF. Those bindings mask same-name global source aliases
and global dependency declarations; requested bar expressions retain their own
history. The existing direct loop-dependent request-expression guard remains.

Conditional SMA placement receives the same per-emission membership cache used by other scoped-state checks, including absent child-node guards. Known function-owned TA sites are classified directly from the shared membership map, and other roots are pruned when they do not contain the target. Function state selection returns immediately for known TA bodies before its general call scan. These checks preserve scoped evaluation without rescanning unrelated function bodies for each TA call. Captured request-source evaluation forwards the original chart timeframe and parent host history sizing to the recursive requested evaluator.

Matching local user methods take precedence over drawing cast names and builtin
receiver methods in semantic binding and return inference. Drawing method emission
uses recorded Pine receiver kinds to distinguish handles from their host primitive
representation and retain builtin fallback for nonmatching custom receivers.
Integer coordinate/dimension guards remain in force for builtin calls. Method
declarations are not refused by UDF required-signature uniqueness: the Methods
manual permits overriding. Identical user-signature invocation selection remains
native-pending; the unchanged v56:1376 declaration-only fixture stays admitted.

CMO snapshots retain the previous raw source and both independent Sum states; keep one snapshot declaration matching those saved fields when combining oscillator changes.

Tuple-ternary refusal follows matching local user-method precedence as well as matching UDFs. After the drawing-method shadow-resolution fix, inspect both existing tuple-return inference helpers before any builtin fallback; a user method returning a tuple still cannot be a ternary arm. This preserves method overrides while retaining v5/v6 tuple refusal.


Mutable v5 EMA first-constructor reuse is not implemented by this slice. The former length-one witness could pass through repeated first-source seeding without proving a freeze; it is replaced by a fixed input-length control using the settled SMA seed/recurrence. Expanded mutable root/UDF comparisons remain skipped with the native v5 probe reference until adjudicated. Root/scoped TA caches retain their original argument-sensitive keys; no EMA arithmetic or constructor policy changes are promoted.
V4 log10 uses x, and correlation uses source_a/source_b; their modern slots
are number and source1/source2. Keep entries in the shared rename table and
normalize correlation constructor arguments as well as compute arguments.

Native v1 CCI holes suppress output until the physical lookback clears every
missing slot. Its mean uses the shared rolling SMA kernel; absolute deviations
retain oldest-first raw-slot summation. Save and restore both states together.

Ordinary persistent UDT references keep only marked primitive fields across
worker ticks. Capture those fields at root/block/UDF sites without retaining
ordinary sibling fields or changing the existing before/after intrabar stores.

Ledger24 integration reuses shared aliases for all analyzer constructor and compute arguments. Its persistent UDT field lists coexist with UDF builtin call paths in root and child states; the shared TA integer helper retains both prior HMA/EMA/RSI and incoming correlation/percentrank/MFI/CCI guards. CCI retains its captured raw-slot NaN-window mask and oldest-first deviation sum while sharing the canonical SMA mean kernel.

Ledger8 integration keeps both drawing checker dispatches and bypasses the broad closed-argument checker only for the five bare reference casts; dotted constructors, methods and chart.point retain closed-slot validation. LTF realtime selection takes its own flag after the optional HTF confirmation metadata, so confirmed realtime LTF bars select the latest intrabar without changing requested calendar confirmation.


Linefill IDs reject equality and inequality operators. Line and label IDs support
both operators; other reference families retain prior behavior pending native probes.
Use na() for unavailable references and array.indexof() for collection membership.
Drawing copy and linefill parent getters preserve their reference kind and series floor.

Drawing .all members route chained array methods through collection dispatch,
including mutable copies and visible refusals for direct read-only mutation.

Keep the row-specific background witnesses for the shared visual qualifier guard.

Dynamic WMA source history keeps filled values and valid counts per chart slot,
while other dynamic TA windows retain their existing missing-slot/length policies.
Compound += subtraction follows the verified captured association; explicit
binary grouping remains marked by the parser. UDF tail returns use the existing
shared emitTailAssignment implementation for declarations, assignments and loops.

Pivot integration keeps the stateful PivotPointLevels class and all six formula
families, with the native invalid-type message on its existing runtime guard.
Its native invalid-type wording is recognized by the existing fatal-error path;
other unexpected errors retain their swallowed-error diagnostics. The incoming
stateless fallback is not a second execution path. Fill budgeting
uses semantic color qualifiers without dropping gradient slots or handle binding.
Native array percentile captures retain the original array size when calculating
rank positions. The v4 fourteen-slot linear captures select the clamped position
`percentage / 100 * size - 0.5`: an integral rank can select a finite value despite
missing slots, while fractional interpolation requires a fully numeric array.
The v2 three-slot median captures retain their selected positions and missing
results. These captures do not settle other percentages or integer rounding.

Native v2 RCI normalizes average price ranks with Pearson covariance and both
rank variances. The untied sum-of-squared-rank-differences shortcut overstates
correlation when price ranks tie. Missing reads retain private ring slots.
correlation when price ranks tie. Missing-slot behavior is separate.

Native v2 TA linear percentile captures select the clamped zero-based position
`percentage / 100 * length - 0.5` and interpolate its adjacent sorted values.
Its missing-window policy is separate from the array interpolation helper.

Native v2 RCI starts publication after `length + 1` physical source bars. It
then ranks the latest `length` slots; the extra startup observation does not
extend the ranked window. Recompute restores this observation count as well.

Native v2 TA percentile startup uses physical source-bar count. Initial missing
slots retain the lowest rank positions until finite samples fill the window;
linear and nearest captures can publish before `length` finite samples arrive.

Native v2 RCI holds its published value when the current source is missing.
Its private length+1 ring starts at zero; missing writes advance the head while
retaining the target slot. Snapshots restore the ring and published value.
Known drawing method names require a compatible receiver before argument binding;
matching collection, point, local/imported methods and UDT copy remain valid.

Unshadowed builtin namespace calls use signature resolution instead of receiver
inference: v4's bare `line` also has legacy plot-style string metadata. Local
variables shadowing that namespace still require a compatible method receiver.

Seeded `math.random` uses a 48-bit LCG with seed scrambling and 26+27-bit
double extraction, matching all historical seed42 v2 capture values. Plot
holes mask outputs without changing draws. Native live advancement and other
seed/rollback details are separate evidence limits; keep call-site state keys.
Dynamic dividends in requested expressions reuse the shared point-series resolver, corporate-action selector and main cache/budget. Evaluation uses the requested ticker and timestamp, with existing gaps/lookahead merging and ignore-invalid policy. History-sizing retries and recursive requests forward the same resolver. Other point-provider families retain their separate routing; this does not certify host dividend timing or values.

Nested `request.economic` expressions reuse chart-context provider lookup and
point-series merging, using requested timestamps with the shared cache and budget.
Economic content and release timing depend on the supplied datafeed.
Matrix add_row/add_col lowering keeps a supplied numeric insertion index in its index slot when array_id is omitted, including named-id and receiver forms. Its existing omitted-index array shorthand remains supported; runtime argument disambiguation evaluates UDF/side-effecting arguments once. Native CF018 settles explicit column1 plus omitted array as a2x3 matrix with missing inserted cells; that capture is not generalized to every overload or to the array shorthand.
DrawingStore handle lookups use a derived ID index, invalidated on additions,
deletions, restore, truncation and clear. The ordered drawing array remains the
source for oldest-first eviction and snapshots; duplicate IDs resolve first.

Requested point series are sorted once in each execution's cache and selected
by binary search. Stable duplicate-time ordering and gaps/lookahead selection
are preserved; provider arrays remain untouched and new executions rebuild.
Function and method declarations cannot be nested inside another UDF. Existing
top-level local-block admission is retained pending native adjudication. While checking their bodies,
identifier reassignment (including compound and tuple reassignment) rejects resolved
parameters and global variables. Resolve symbol identity to preserve function-local
shadowing; mutation through reference fields and collection methods remains allowed.
The checker restores function context with try/finally across nested blocks.

Pine v6 function results reject known incompatible scalar branch types in their
returning ternary, if, switch, and nested tail blocks. Analyze only return paths,
not earlier conditional blocks used for side effects. Numeric widening and untyped
NA remain compatible; unknown inference does not manufacture a refusal.

Inside a Pine v6 non-method function overload, a call to a different overload
with the same name requires that target to have been defined earlier. Use the
existing typed/arity resolver and declaration identity; ordinary differently
named forward calls and the explicit recursion-extension policy are unchanged.

Pine v6 UDT field defaults must be literal values or compatible built-in variables;
collection/table constructor calls are also prohibited. Construct referenced
collections separately and pass them to UDT.new or assign the fields afterward.
The earlier-version constructor-default extension remains unchanged.

Pine v6 collections cannot directly contain collection IDs. The existing template
checker rejects nested array/matrix/map types used as elements or map components;
array.from also checks inferred argument types. Collection IDs inside UDT fields
remain allowed, and callable shadows retain normal binding. Earlier-version
nested-collection extensions remain unchanged; storage and arithmetic are untouched.

### Corpus UDF admission boundaries

The gaps43 followup preserves two previous-OK corpus admission boundaries:
Pine v5 identical method signatures and UDF declarations in top-level local
blocks. The required qualified-signature guard applies only to v6; the nesting
guard rejects declarations inside another UDF, without extending that refusal
to top-level if/loop blocks. Their exact native admission is still unobserved,
so preserving these local behaviors is not a native Pine acceptance claim.
Exact byte-preserved sources and isolated controls remain registered in archive
[GAPS43 corpus refusal blockers](https://github.com/Tealstreet/tealscript-oracle/blob/8425039c3539ac14152e305ee4b627128efc2551/v5-outcomes/GAPS43-CORPUS-REFUSAL-BLOCKERS-v1.md) under the shared
bundle lock. Retain the v6 duplicate-signature and genuine nested-UDF refusal
controls, and require zero new refusals in the previous-OK corpus gate.


### Superseding gaps43 corpus ruling

The eligible gaps43 candidate is the original 154e34fd2e plus followup
1a5453c14e, verified as a pair. The general policy allowing documented refusals
for non-TradingView-published sources applies only when authority establishes
that the source is invalid. It does not classify corpus v56:1376 as invalid.
The current official Methods manual states: “User-defined methods can override
and overload existing built-in and user-defined methods with the same identifier.”
See https://www.tradingview.com/pine-script-docs/language/methods/ .
Consequently, the identical-method fixture must not be adjudicated as a
documented-invalid source merely because it is not a TradingView publication.
This supersedes the contrary source classification and integration disposition
in dd93b8f458. Preserve the followup admission narrowing; exact native probes
remain pending confirmation. The manual's general override permission does
not establish an exact identical-signature dispatch trace. Do not cite the
retained v6 duplicate-method control as proof of documented invalidity; keep
function-overload restrictions distinct from method override permission.

`pine-native-linear-residual-v1.test.ts` independently pins the batch7 clean and
leading linear-percentile residuals to source-hashed native CSV prefixes. The
four closure assertions cover register length4 and chart length14 at 75 percent; they
do not establish an uncaptured later-hole ranking policy. Complete native
vectors and neighboring columns are scored separately during residual gates.

Native linear percentile hole captures retain missing rank slots in insertion
order. Insert before the first rank comparing greater than or equal to the new
source; missing slots can interrupt the ordered prefix, so binary search is invalid.
Reorder numeric ranks when the physical window recovers. Publish interpolation
from the selected rank neighbors; missing physical slots outside those neighbors
do not suppress their numeric result. Native v6 ascending length4/75 captures
publish at bars15/16 while physical holes remain. Leading startup slots keep their
rank padding. Snapshots retain physical samples, rank slots and source-bar count.
The bounded chart length14/25/75 and register length4/75 captures pin both finite
hole cells and missing recovery cells; this is not an uncaptured-hole claim.
A native paired clean/missing control also checks same-bar replacements and
snapshot restoration before replaying the captured recovery tail.

Collection receiver-overload selection and emitted expression-kind lookup share
one recorded semantic type map. Preserve imported libraries when recording
selected methods, and reuse that map for later emitter type queries.

Dynamic extrema source-history evaluation folds the physical source window
directly, retaining hole boundaries and oldest-equal offset ties without
replaying a checkpointed TA instance for every sample. Static extrema retain
the immutable native physical-bar queue.

Earnings in requested expressions use that resolver with the earnings provider
kind, selected field and currency. Seeded context tests certify dispatch and
data flow; provider release timing remains a separate host obligation.

Nested `request.splits` shares the existing corporate-action and point-series
resolver, with the requested clock and ticker. Root and nested paths retain
field selection, gaps/lookahead merging, cache identity and invalid-symbol policy.

Dynamic request calls reject newly accessed contexts or expression identities
on realtime bars before provider lookup. Historical accesses reuse the existing
request-context identity; this does not change the forty-context budget.

Nested `request.seed` evaluates its expression through the existing requested
subprogram evaluator and cache, using the parent requested timeframe and seed
symbol. Inherited root seed merging remains; native EOD/gaps timing is separate.

Compilation counts direct tuple literals across executable request sites and
refuses totals above127. Uncalled functions are excluded; UDF tuple accounting
remains native-pending after the corpus admission audit. Scalar UDT IDs are separate.
Matching local user methods take precedence over drawing cast names and builtin
receiver methods in semantic binding and return inference. Drawing method emission
uses recorded Pine receiver kinds to distinguish handles from their host primitive
representation and retain builtin fallback for nonmatching custom receivers.
Integer coordinate/dimension guards remain in force for builtin calls. Method
declarations are not refused by UDF required-signature uniqueness: the Methods
manual permits overriding. Identical user-signature invocation selection remains
native-pending; the unchanged v56:1376 declaration-only fixture stays admitted.

CMO snapshots retain the previous raw source and both independent Sum states; keep one snapshot declaration matching those saved fields when combining oscillator changes.

Tuple-ternary refusal follows matching local user-method precedence as well as matching UDFs. After the drawing-method shadow-resolution fix, inspect both existing tuple-return inference helpers before any builtin fallback; a user method returning a tuple still cannot be a ternary arm. This preserves method overrides while retaining v5/v6 tuple refusal.


Mutable v5 EMA first-constructor reuse is not implemented by this slice. The former length-one witness could pass through repeated first-source seeding without proving a freeze; it is replaced by a fixed input-length control using the settled SMA seed/recurrence. Expanded mutable root/UDF comparisons remain skipped with the native v5 probe reference until adjudicated. Root/scoped TA caches retain their original argument-sensitive keys; no EMA arithmetic or constructor policy changes are promoted.
Lower-timeframe request.security selection uses an ordered timestamp lookup owned by its execution-local security cache. Keep the half-open chart interval and first/last input-index semantics for duplicate timestamps; unordered or nonfinite-timestamp datasets use an allocation-free input-order scan. Build fresh selection state for each execution so provider arrays reused between executions remain fresh. This optimization does not change HTF merging, requested expressions, lookahead policy, or request.security_lower_tf tuple collection.

Plain-array copies remain dense and shallow; searches avoid materializing a copy.
Slice searches retain the existing bounds validation and materialization path.
`matrix.is_antisymmetric` returns series bool in both native namespace and receiver calls.
Selected user-defined methods retain their declared or inferred return type.

`matrix.median` returns series int for int matrices and series float for float matrices.
Its native result metadata does not override selected user-defined methods.
- Kronecker-product admission binds id2 for both namespace and receiver calls.
  Known second operands must be int/float matrices; missing/unknown IDs defer.
  User-defined methods and local namespace shadows retain their own signatures.

Matrix.sum validates both numeric operands, including numeric matrix elements in
the second operand. Eligible local methods and imported callables retain precedence;
unavailable and unresolved operands defer to existing inference.

Matrix.add_col requires a supplied array_id to be an array reference in namespace
and receiver calls. Omitted/unavailable arrays and eligible local/imported callables
retain their existing binding and inference.
Size constants infer builtin const strings only when lexical scope has no symbol named size. Local objects and UDF parameters shadow the namespace; their member types and emitted field access come from the declared object.
The manual's global-only visual calls, `alertcondition`, and script declarations
are refused in all local scopes, including functions, `if`, `switch`, and `once`.
Single-expression switch arms create a local scope just like block arms.
Resolve builtin signatures before checking call scope so compatible local and
imported callable shadows retain their ordinary semantics. Inputs, drawing
setters, and strategy orders remain callable locally.

Compiled builtin calls populate a fresh named-argument Map directly from their
generated records' own keys, avoiding intermediate entry-pair allocations.

Batch12 oscillator fixtures retain CMO's independently sampled gain/loss sums. A
short source-hole fixture can reach two zero sums; its ratio is `na`, matching the
existing CMO zero-movement contract rather than a new generic division policy.
Method declaration fixtures preserve v5/v6 identical-method admission under the
Methods-manual ruling; ordinary UDF uniqueness and unobserved replacement choice
remain separate.
The common v6 visual qualifier table includes input-or-weaker bgcolor
editable/show_last/display and const title/force_overlay. Keep the row-specific
background witnesses; offset/transp version rules remain separate.

- Array constructor/from guards use canonical callable resolution even when a parameter is
  named `array`; explicit namespace calls retain builtin checks, while actual local/imported
  callable overrides keep normal user-function checking.

Pine v5 `fill` binds its fourth positional argument to `title` even when deprecated
`transp` is supplied by name. Its legacy signature appends `transp`; v4 keeps
`transp` before `title`. Runtime fill argument ordering already follows this split.

Ordinary v5 function overloads with fully typed equal-arity signatures must have
unique parameter type combinations, as specified in the v5 November 2021
release notes. This check uses all parameter slots and excludes user methods;
the v6 required-parameter check and pre-v5 admission remain unchanged.

Matrix sort-field qualifier validation applies only to resolved builtin matrix.sort
calls. Eligible user-defined sort methods retain their own parameter qualifiers.

Conditional SMA placement receives the same per-emission membership cache used by other scoped-state checks, including absent child-node guards. Captured request-source evaluation forwards the original chart timeframe and parent host history sizing to the recursive requested evaluator.

### Omitted UDF default bar dependencies

Analyzer function registration walks optional parameter default expressions,
including methods and imported functions. Otherwise a bar field used only by
an omitted default (notably volume/time) never enters usedBarFields, so the
compiled onBar optimization omits its updates and valid default values become
NA. Preserve call-site parameter history and explicit caller argument routing;
this dependency walk is not a UDF clock/state/history-buffer policy change.
The default-bar-field regression uses distinct handwritten OHLCV bars and
checks omission, explicit arguments, method defaults, expressions and history.

Shared array numeric operations use the dedicated receiver guard once; the general
collection guard retains matrix and array-only operations absent from that table.
Preserve canonical namespace/receiver binding and separate second-ID validation.

Earnings in requested expressions use that resolver with the earnings provider
kind, selected field and currency. Seeded context tests certify dispatch and
data flow; provider release timing remains a separate host obligation.

`ticker.new` selects its simple or series string result from argument qualifiers.
The narrow builtin branch preserves UDT, imported and eligible receiver-method
shadows independently of the fallback used by other ticker members.

V6 builtin `ticker.inherit` selects its simple/series return overload from both
argument qualifiers. Imported and receiver callables retain their own types;
other ticker members and legacy inference keep their existing paths.

Published compiled MA Sabres and BackQuant sources settle admission of their
integer-derived coordinates in `chart.point.from_index(index)` and `label.new(x)`.
For these slots, retain integer operands and validate that each division has an
integral result from known constants/input defaults before combining it with an
integer chart index. Resolve numeric defaults by symbol identity, with existing
write invalidation. Do not widen arbitrary floats, odd/unknown quotients, other
integer slots, or arithmetic inference/runtime rounding from these publications.

Captured v4 chart-background source refuses str.tostring(color) at compilation. The narrow value-kind guard preserves numeric, bool, string and enum-title conversion; failed foreground capture instrumentation establishes no chart.fg_color outcome.

Pine v6 `ta.roc` length uses the shared integer-kind argument selector.
Known float lengths are refused in positional and named calls; const, input
and series-int lengths retain their existing qualifier admission.
Pine v5 `fill` binds its fourth positional argument to `title` even when deprecated
`transp` is supplied by name. Its legacy signature appends `transp`; v4 keeps
`transp` before `title`. Runtime fill argument ordering already follows this split.

DrawingStore maintains its first-ID lookup and family counts through add/delete
churn. Duplicate IDs retain first-object selection; linefill cascades update the
index, and bulk restore/truncation/clear invalidate all derived state.
Runtime color conversion uses a fixed hex-byte lookup and one RGB integer parse.
Channel clamping, alpha rounding and accepted color strings retain their existing semantics.

Native v2 strings/color CE10275 refuses v6 literal ISO date-times ending in `Z`
at compile time. Keep that lexical check on the resolved dateString overload;
calendar arguments, RFC/numeric-offset strings and local timestamp functions retain their existing paths.
- Captured Pine v5/v6 `array.every` and `array.some` refuse string arrays in
  namespace and receiver forms. Reuse canonical binding and preserve selected
  user/imported calls, numeric eligibility and missing-reference behavior.
Table cell binding resolves positional/named arguments and defaults once per call.
Supplied named values, including explicit undefined, bypass positional defaults.

PVT and ACCDIST publish `na` when the current implicit volume is unavailable.
Their accumulators and snapshots retain their existing state behavior.


### Discarded prefixes during function-return checking

`checkFunctionReturnBranches` infers declaration bindings in a function-body prefix without consuming its final statement as a return value. Only the actual function/arm tail is checked for return compatibility. This preserves mixed discarded branches before a numeric return, as required by the conditional-structures manual’s matching local block type rule.

Requested point-series callbacks preserve the Quandl deprecation refusal in
nested request contexts; explicit ignore-invalid requests retain their NA result.


## Native MFI zero handling

MFI retains shared compensated Sum state, but normalizes its private sums below
absolute `1e-10` before taking the ratio. Native v6 `mfi-private-zero-boundary-v1`
captures distinguish this handling from the published formula and raw-zero-window
normalization. Preserve nonzero native carries above that boundary; do not change
shared Sum arithmetic. This reuses original guard `d97ed6a779` after its staged
native discriminator was captured. V1 endpoint and v2 flat-flow tests pin both
normalization and the native carries it must preserve. Tiny-scale source comparison
semantics are separate from private sum normalization.

UDT type-namespace `new` calls must retain constructor identity before instance-method inference. A same-named instance method can coexist and return its own result on a non-namespace-named receiver. Keep the namespace-obscuring guard; the ticker-named synthetic control is refused and queued for native v11 adjudication.

Pine v6 generic `input()` defaults require constants or unshadowed source builtins.
Computed sources such as `close * 2` are refused, following native CE10212;
`input.source()` keeps its numeric-series default contract. Earlier version
admission remains unchanged pending native evidence. Bare `volume` retains
its existing admission; the captured computed-source refusal does not settle it.

Generic v6 source inputs bind positional metadata as inline, group, tooltip,
following the captured source-overload order. Primitive generic inputs, typed
`input.source` (including its confirm tail), and older versions retain their
existing metadata signatures.
Native v4 capture shows descending array.sort_indices reverses finite equal-key indices relative to ascending; missing-value tie order and array.sort retain their separate contracts.

Background colors retain raw source-bar samples and the latest global offset, applied by web/native rendering, so legacy series offsets cannot overwrite earlier color bands.

Captured dynamic-NA array nearest-rank percentages select the first sorted numeric element; empty arrays remain NA. Finite bounds and TA window policies are separate contracts.

Compiled positional builtin calls reuse an immutable empty named-argument map; internal registry handlers only read that map.
Calls with a nonempty named record still receive a fresh map, preserving bound names, undefined values and positional offsets.

Compiled positional line.get_y1 and label.get_text calls invoke the registry-selected specialized reader, retaining existing drawing ID/type checks.
Named calls retain their ordinary binding callback; getter results are never cached.

HistoryBufferSizing retains each series ceiling in its shared sizing record. Every read still checks historical/realtime offsets; later historyCheck hints update the same live record. Growth, restart and explicit limits retain their existing rules.


GuardedNumericSeries and GuardedValueSeries share read methods across executions while retaining execution-specific guards, live sizing records and realtime callbacks. Existing instances still enforce their own allocation bound after another instance grows a shared record.

Owning array search state uses a non-enumerable private symbol and shared values accessors. Appends resolve the backing storage once while retaining capacity checks and first-match cache updates. Exposing or replacing values disables search caching, and enumerable host copies do not inherit private storage state.

Unexposed owning arrays buffer prepends in reverse order within their private storage state. Size, indexed reads/writes and slice views use logical order; copies and rollback snapshots copy that order independently. Operations requiring contiguous storage materialize it. Exposing or replacing `.values` materializes the prefix and disables buffering so retained backing aliases observe later writes. Capacity, read-only protection, search invalidation and UDT element identities remain unchanged. Direct numeric sum, variance and search-cache readers resolve `arrayStorage` before iterating; extrema and order-statistic consumers use the ordered `getArrayValues` snapshot through `numericArrayValues`. Physical `state.values` access is confined to storage adapters that explicitly account for the pending prefix.

Owning array construction starts empty storage from a literal and fills nonempty storage directly with the seed, preserving reference identity, missing slots, size coercion and capacity limits without per-element callbacks.

Numeric array reductions compact converted, non-missing values inside a shallow snapshot. Preserve left-to-right conversion and original element references when user coercion mutates the source array; no variance or rounding formula changes.

Array sum reduces private unexposed owning primitive numeric storage directly, adding present values left-to-right from positive zero and returning missing for empty/all-missing input. Each call reads current storage; exposed backing, views and coercible values retain the ordered numeric snapshot path.

Array push uses fixed-arity forwarding at the collection receiver boundary, retaining the shared missing-ID predicate and error. Other collection helpers retain their existing receiver counts and argument forwarding.

Variance can reduce unexposed owning storage directly when every value is a primitive non-missing number. Both storage paths use the captured population formula (mean of squares minus squared mean) for biased variance; unbiased variance retains ordered squared deviations. Exposed backing, views, missing entries and coercible objects retain numeric snapshots and ordered conversion.

History offsets normalize nonnegative finite primitive numbers directly. Other values retain general Number coercion, missing-offset normalization and the native negative-offset error.

Legacy v5 named `when` is admitted on cancel, cancel_all and close_all; modern
v6 signatures refuse it. False conditions leave pending orders and positions
unchanged; cancellation guards apply before modifying the strategy ledger.
- Root-block regular declarations that shadow actual global scalars use distinct local bindings. Reads before the declaration and in its initializer resolve to the earlier outer container; local writes do not replace that global history. Promoted branch-only locals and UDF invocation/history lowering retain their existing paths.
- SMA's identifier history shortcut excludes those active local shadows; their emitted local value reaches the existing SMA member instead of selecting the same-named global series.
- Local scalar declarations of builtin names emit a `builtin-shadow` warning without changing acceptance. Parameter-name and use-before-shadow contracts remain separate checks.
Captured parameters remain dependencies when a requested subprogram compiles a
nested request. Propagate their existing descriptors through the analyzer instead
of emitting an unbound identifier or sampling the chart-context scalar.
The `bool(x)` cast accepts numeric, boolean and explicit NA arguments, preserving
qualifier inference. It rejects strings, colors and collection/object IDs rather
than converting their JavaScript truthiness; casts shadowed by user callables
retain normal user-function checking.
- `array.new_label` supplied seeds use the resolved constructor binding and must be label values;
  omitted/NA seeds and locally shadowed array receivers retain their existing admission.
  The guard reuses the float-constructor seed check and leaves runtime allocation unchanged.
- Generic `array.new<T>` supplied seeds use the same assignability and resolved-binding guard
  for the declared element type, including numeric widening and matching reference families.
  Omitted/explicit NA seeds remain valid; named constructor families retain their own guards.
Nested `request.splits` shares the existing corporate-action and point-series
resolver, with the requested clock and ticker. Root and nested paths retain
field selection, gaps/lookahead merging, cache identity and invalid-symbol policy.

Dynamic request calls reject newly accessed contexts or expression identities
on realtime bars before provider lookup. Historical accesses reuse the existing
request-context identity; this does not change the forty-context budget.

Nested `request.seed` evaluates its expression through the existing requested
subprogram evaluator and cache, using the parent requested timeframe and seed
symbol. Inherited root seed merging remains; native EOD/gaps timing is separate.

`log.info`, `log.warning`, and `log.error` formatting arguments accept only
primitive values and arrays of int, float, bool, or string elements. Apply this
check after builtin resolution so local receiver methods keep their contracts.

Finite exactly symmetric matrices larger than 2x2 reuse original 54c094545e Householder/Implicit QL decomposition for eigenvalues and eigenvectors. Preserve the existing QR workspace for nonsymmetric matrices and the 2x2 path. Sorted spectral tests do not establish native order/sign, nonsymmetric algorithm policy or SVD cutoff; pinv arithmetic is separate and requires its own native adjudication.

Dynamic pivot-low strengths use the existing pivot-high source-window routing.
Both collect the same physical samples, then evaluate the shared Pivot window
kernel once without allocating and replaying a temporary TA instance. Fixed
Pivot snapshots, guarded source reads, comparisons, missing slots and ties stay unchanged.

Published Leviathan v5 labels admit an integer-derived midpoint `(bar_index - 1 + int(startBar)) / 2`, including an unqualified UDF parameter explicitly cast to int. The contextual label.new x admission keeps the literal integer divisor 2 and integer numerator; it does not widen v6, other slots or float operands. Published AVWAP v6 admits a series int initializer combining a chart index with a known integral integer quotient. Reuse the coordinate proof for that initializer without changing arithmetic or drawing rounding. Publication proves these expression admissions; original-source equivalence and native runtime outcomes remain separate evidence.

Lower-timeframe request datasets may reuse their existing scope/context result
when full requested evaluation reads none of its captures. Captured source
expressions and captured history remain dependencies, preserving their cache keys.

Table variable IDs always infer series, including input/simple annotations initialized
with na. The floor applies after initializer compatibility checks, preserving existing
constructor refusals, parameter rules, scalar qualifiers and const ID binding.

Pine v6 history offsets with known scalar kinds must be numeric, as specified by the `[]` reference entry. Reuse scoped expression inference for literals, inputs and user functions; preserve unresolved offsets and earlier-version policies. Numeric float admission does not establish a runtime rounding proof.

`ticker.modify` validates adjustment string kinds and the simple qualifier ceilings of both futures flags through resolved builtin signatures, preserving imported callables with their own parameter types. Both documented string overloads remain supported.

`ticker.modify` resolves explicit backadjustment/settlement `inherit` against settings already carried by the incoming ticker ID. It preserves explicit on/off as well as omitted settings; the host provider supplies the symbol default when the incoming ID has no setting.

- UDF parameter qualifier inference resolves array receiver methods by their builtin namespace,
  matching direct-call validation. Array percentile percentages accept series numeric values;
  TA percentile percentages retain the simple ceiling.

- Array median return-kind inference preserves integer and float element kinds,
  including returned-array receivers before legacy TA alias inference.
  Integer even-cardinality arithmetic remains a separate native-evidence question.

- User-defined median methods retain their inferred return type before builtin
  array median recovery; namespace array.median keeps the builtin overload.

Native v5/v6 array.get captures refuse ordinary float indices, including literal
fractions and division by input.float. Integer-derived division retains admission
through the canonical SemanticType.integerDivision marker; set/fill are separate.

ALMA sums oldest-to-newest products with Gaussian weights normalized individually.
Compute fixed-parameter weights once; dividing the accumulated weighted sum later
changes captured binary64 values. Preserve physical NA windows and snapshot state.

Array-index assignment checks use the array assignment numeric-index diagnostic;
only value-read history expressions also receive the history-offset numeric check.

Array includes uses strict element equality, so a numeric or reference NA represented
by NaN never matches itself. Preserve indexof behavior, finite signed-zero equality
and object identity; native v8 float search and reference factorization pin this boundary.

Dynamic extrema source windows reuse a per-series monotonic queue on adjacent bars.
Length/family changes, same-bar replacements and skipped bars rebuild from source history;
restore discards the derived cache. Physical warmup, newest missing-value boundaries,
oldest equal offsets and signed-zero extrema retain the prior window reduction semantics.

### Scalar exponential precision

`math.exp` uses the shared compensated scalar implementation in `codegen/pineExp.ts` for emitted and interpreted execution. The helper reduces with split ln2 and uses a compensated 24-term Taylor series. Its JavaScript body is stored literally so transpiler-injected names cannot enter compiled factories. Returned v2 exp columns are exact in the captured domain; this changes no TA kernel or math namespace binding policy.

Finite `math.exp` operands that overflow binary64 return NaN, matching the v9 explicit missing-state flags for 710 and 1000. The 709 nonmissing and -1000 zero controls retain their behavior. This captured rule does not establish a general non-finite normalization policy for other operations or non-finite operands.

Native v4 capture shows descending array.sort_indices reverses finite equal-key indices relative to ascending; missing-value tie order and array.sort retain their separate contracts.

Background and bar colors retain raw source-bar samples and the latest global offset, applied by web/native rendering, so legacy series offsets cannot overwrite earlier color samples.

Pre-v6 const plot_style and plot_line_style values retain legacy string concatenation admission. Pine v6 keeps unique style operator refusal. This preserves known-original corpus admission; whole-source native acceptance remains unknown.
Visual style validation applies after callable resolution; local functions named
`plot` or `hline` retain their declared parameter contracts.
Runtime math dispatch resolves an evaluator once per execution and call-site ID,
checking its builtin name before reuse. Evaluators bind context maps and mintick,
never argument values or results; root and requested executions keep separate caches.
Arithmetic, named binding, sum snapshots and seeded random state remain unchanged.
The TSX math-dispatch micro benchmark uses TEALSCRIPT_PERF_ASSERT=1 for its CPU gate.
Compiled math.log10 uses compensated high/low logarithm reduction and scaling.
Preserve the nativeLog10 operation order and route it through ctx.mathCall; a
direct Math.log10 emitter shortcut changes captured binary64 values.
Captured parameters remain dependencies when a requested subprogram compiles a
nested request. Propagate their existing descriptors through the analyzer instead
of emitting an unbound identifier or sampling the chart-context scalar.

Requested scalar progress uses one indexed evaluator per original request identity, advancing only the selected historical prefix.
History resizing recreates that evaluator and replays its prefix; equal provider data never merges distinct requests.
Requested close-time vectors parse minute/second duration once per dataset; calendar
units keep timezone-aware boundary calculation. Missing timestamps remain missing,
and scalar cache compaction must not add repeated requested-array length reads.
Eager scalar caches use the shared all-NaN compaction; incremental scalar caches
compact only after their full requested dataset has been evaluated. Compaction
releases the advance closure too; missing prefixes and lower-timeframe arrays retain their timelines.

The synthetic corpus request provider caches frozen bar arrays by symbol, timeframe,
calc_bars_count and currency for its fixed fixture. This harness cache is separate
from engine expression-result caching; query context metadata remains fresh.

Historical root and nested requests share successful provider dataset lookups within
one execution, keyed by complete symbol/timeframe/currency/count queries. Captured
expression results retain their separate caches; failures retry and realtime fetches
bypass dataset reuse. Keep the original provider object and fresh execution lifetime.
### ValueAtTime nearest timestamp selection

Internally collected finite ordered ValueAtTime timestamps use binary nearest lookup; equal-distance gaps and rounded-distance ties select the first observation. Preserve the existing input-order scan for unordered/nonfinite indices. Public collectData objects remain mutable and must not receive the private ordered-index assumption. Keep timestamp/value trimming and same-time updates paired; do not relax loop limits for lookup performance.
Guarded numeric/value history series retain their shared HistoryBufferSizing record after construction. Cache only the immutable per-key ceiling; requirements, explicit minima, allocations and historical restart counts stay live in that shared record. Every get still enforces the historical/realtime offset bounds, and historyCheck must update the same record so later hints remain visible to existing series.

Guarded NumericSeries and ValueSeries read methods belong to module-stable classes. HistoryBufferSizing.dependencies binds only their constructors to the execution-specific sizing owner and realtime callback. Historical numeric offsets inside both the already-required range and the current allocation reuse the sizing validation; realtime reads still check the live minimum/required ceiling. The base series read always retains its own instance bound and offset normalization, including after another series grows a shared allocation. Keep read targets stable across restarts/request contexts while retaining separate buffers, ceilings, snapshots and realtime callbacks for each owner; sharing a class must never share sizing state.
Builtin MFI treats near-flat source changes using the same inclusive comparison
predicate as emitted Pine equality and ordering. The predicate is defined in
`float-comparison.ts` and serialized into runtime helpers; compensated Sum and
the native private zero-sum guard remain unchanged. Native scaled-flow captures
require suppressing both signed flows before accumulation for flat changes.
History references truncate finite numeric offsets toward zero before validating
negativity. The captured v5/v6 boundary admits -0.9 as current-bar access and
refuses -1.1 as -1 bars back; missing offsets retain current-bar access.

For bounded intraday sessions, last-bar flags follow the scheduled final interval,
not the last available traded bar or the next day's first bar. An absent final
interval leaves the flag false; continuous-session cycles keep their existing path.

Prepared UDT constructors reuse per-type factories. Both factory and ordinary
creation register initial fields through one helper, preserving ordinary-field
rollback and marked varip fields after realtime reference replacement.

Compiled scalar inputs reuse their existing call-site metadata cache for named defaults too.
Keep each call-site identity, read its current named default, and exclude source inputs
and dynamic titles from this path so live source values and title-dependent IDs remain intact.

V9 captured Pine v6 undelimited binary/ternary continuations reject four-space
indentation multiples. The shared AST-span guard preserves delimiter-protected
wrapping and literal/comment contents; v5 continuation policy remains held.

Scalar exp compensation carries its high/low words in numeric locals instead of
allocating pair arrays. Preserve the original add/mul/div operation order and
24 Taylor terms; this changes no rounding, range thresholds or memoization policy.

Native v9 continuation refusals report the preceding line-ending position and
CE10156 diagnostic text; the shared indentation predicate remains unchanged.

Factories retain independent constructor-value arrays for initial fields instead
of copying each field Map. Rollback and snapshot cloning materialize entries
without changing shallow reference fields, copies or persistent object state.
UDT intrabar state belongs to each object under a non-enumerable private symbol
(`574b31b1bc`), avoiding per-object WeakMap registration. Explicit snapshot cloning
copies that state; ordinary host enumeration does not copy private rollback state.

Known legacy array get/set/insert/remove methods use dedicated guarded calls.
Evaluate receiver and every argument before the negative-index guard; preserve custom-method precedence and runtime refusal text.


Ordered private ValueAtTime queries at or before the first timestamp return the first observation directly. Keep the binary search and rounded-distance tie handling for later targets, and the input-order scan for public or unordered data; the 500ms loop budget is unchanged.
Captured parameters remain dependencies when a requested subprogram compiles a
nested request. Propagate their existing descriptors through the analyzer instead
of emitting an unbound identifier or sampling the chart-context scalar.

Historical context advancement combines each builtin Series advance and write.
Pending values commit before the next slot is created, preserving snapshots,
realtime updates and rollback; this does not change history sizing.

ValueAtTime batch queries retain immutable targets and the collected prefix at
call time. Primitive-target output buffers materialize on first read; reference targets
coerce at the call. Target edits,
duplicate timestamp writes and trimming cannot change earlier returned batches.
Private collected Data uses a per-scope call-site map; public collectData objects
keep ordinary mutable field access and input-order nearest selection.
UTC period conversions share an execution-local calendar-day cache across
requested contexts, retaining original rollover and TimeClip behavior.

Scalar request caches derive confirmation close times only when merging needs
them. Lookahead-on and lower-timeframe paths do not build confirmation calendars;
higher-timeframe lookahead-off behavior is unchanged.

Successful runtime hex-color decodings use a 512-entry FIFO cache keyed by the
exact input string. Cached channel records are immutable; unsuccessful parses
remain missing. Keep numeric palette conversion, channel arithmetic and
color.new transparency replacement unchanged. The focused color parser CPU
witness uses TEALSCRIPT_PERF_ASSERT=1 with warmup outside the timing boundary.

Compiled na() bypasses deleted-table normalization only for proven int/float operands.
Unknown and table operands retain table-reference resolution and single evaluation.

Scalar numeric median/percentile helpers select stable original-index ranks.
Retain numeric snapshot/coercion/NA filtering and exact interpolation arithmetic;
mode continues sorted grouping, and array storage is never reordered.

Compiled single-ID line, box and label getters reuse their registered positional readers in root and requested contexts. Named IDs retain canonical binding and every reader retains live lookup, missing/family/expiry checks; Y1 loop-cache eligibility is unchanged.

TA Median reuses the same stable rank selector on its private oldest-first values.
Its non-NA window, warmup, snapshots and same-bar recomputation remain unchanged;
even medians retain the lower-plus-upper then divide-by-two operation order.

Compiled plot updates look up registered IDs directly in the execution context plot map.
Public ordered snapshots and title/index/source selection retain their own matching semantics;
fill handle identity and live values/colors remain tied to the registered IDs.

Runtime timeframe specifications memoize the exact timeframe/current-period pair
in a bounded 256-entry FIFO. Preserve the canonical parsing body, cached nulls,
frozen internal specs and independently mutable public timeframe metadata.

Hole-filled WMA private recomputation reuses NumericSeries append checkpoints,
including the prior last-source and valid-count scalars. Public WMA snapshots
remain full copies; non-NA WMA state and weighted arithmetic are unchanged.

Nearest-rank array percentiles partition only their private numeric snapshot.
Keep original signed-zero tie order, unfiltered-size rank arithmetic and coercion/NA
semantics; the exported multi-rank selector and cross-bar cache policy are unchanged.

Numeric v6 `for` loops reuse the initializer's evaluated end for the first
condition and re-evaluate it on later conditions. Numeric v5 loops retain
the single evaluated end.

Native v18 line/label cadence at quota 3 permits eight live objects and trims the ninth to the oldest three survivors. DrawingStore applies a creation-only slack of five; explicit limit changes retain immediate trimming. Native v21 extends the cadence proof to quotas 50/500; quotas 496-499 remain UNOBSERVED.

Dynamic ROC and change reuse momentum’s per-call physical source history across
varying integer offsets. Preserve raw missing slots, scoped histories and
same-bar replacement; boolean change and zero-denominator ROC keep their policies.

NVI/PVI reset an exactly zero prior accumulator to one before the existing
close/volume guards and percentage update, matching the official examples.
Tiny-value comparison and magnitude publication retain their native contracts.

- Declared user-callable collection and enum parameters validate argument type identity before return inference. Distinct enum types remain incompatible even when their members have identical names or titles.

Session membership reuses frozen parsed descriptors in a 256-entry FIFO keyed by the exact session string.
Only syntax is shared; each evaluation retains its timestamp, effective timezone and original calendar/day-boundary arithmetic.
Period/day validity, order, version defaults and caller coercion remain unchanged.

- In Pine v6, plot and hline IDs are inferred constructor results, not explicit variable/parameter type keywords. Matching UDT names retain their existing resolution; legacy annotation admission is unchanged.

Legacy `atan(x=...)` binds through the shared v4 parameter rename table in both
checking and execution. Preserve positional calls, modern `angle` binding and
same-name user functions; the modern `number` authority question is separate.

Legacy `acos(x=...)` uses the same versioned rename table and binding path as
other v4 math functions. Keep namespace migration, user callable precedence
and the separately unresolved modern `number` slot authority intact.

Native v20 table merges reject reversed start/end cells at the call with RE10127 instead of reordering them. Ordered merges retain their origin cell.

Native v20 table frame and border widths retain 151 without a 100 ceiling; negative widths retain the existing no-stroke normalization.

Native v20 zero-column tables retain zero at creation; later cell access raises RE10039.
Native v7 negative integer columns raise RE10001 at the reached constructor before
allocation or replacement. Zero rows, negative rows and nonfinite/fractional dimensions remain uncaptured.

Native v21 line/label cadence captures confirm quota 50 retains 55 and quota
500 retains 505, then the next creation trims oldest objects back to quota.
The creation threshold is quota plus five, without the declaration ceiling
clamp; declared limits remain capped at 500 and explicit setLimit trims immediately.
Exact source/CSV bindings live in tests/compat/pine-v21-drawing-retention-v1.test.ts.

Native v20 permits max_lines_count=0 through compilation but refuses it at runtime before script execution. Keep that runtime phase distinct from the existing compile-time upper ceiling of 500.

Native v20 line, box and polyline widths retain 151 without a 100 cap.
Box border zero remains zero; line and polyline zero normalize to one.
Negative and missing widths retain the existing inferred fallback of one.

Eigenvalue scalars retain tiny finite values without the generic zero cleanup.
Finite triangular 2x2 matrices return descending diagonal values directly.
Tiny captured prefixes are certified; scaled stress settings remain native-held.

Native v12 refuses enum elements in varip arrays, matrices and map values. Keep the collection eligibility check distinct from scalar enum varip admission and ordinary enum collections; retain transitive drawing-field refusal.

Public matrix eigenvalues publish real components for isolated complex Schur pairs.
Eigenvectors retain missing publication for complex roots; the native complex proof
covers two captured historical rows, and scaled stress remains native-held.

Finite real eigen decomposition uses implicit QL for all sizes. Nonsymmetric matrices
use a reversed Hessenberg basis and accumulated orthogonal transformations; vectors
come from Schur back-substitution. Ordering and arbitrary native bases remain held.

Known unstructured Pine runtime errors become fatal runtime.error records.
Workers retain the halt across feed updates until reload, preserving prior output;
the error frame does not deliver new partial output from the faulting bar.
Request tuple validation retains the explicit-tuple combined budget and rejects any single UDF return wider than 127 elements.
Native v10 admits two requests sharing a 64-element UDF; accounting across different UDF returns remains native-pending.

Pine v5 const-qualified mutable EMA lengths retain their first evaluated value
per written call through call-site emission; shared TA helpers stay unchanged.
Series-capable TA lengths and v6 mutable-series refusal remain unchanged.

Native v23 v6 plot/hline variable type annotations use the captured invalid-keyword
text at the existing start, retaining invalid-type-annotation internally. CE10149
mapping is unclaimed; parameter messages, v6/UDT and legacy guards are unchanged.

Matrix pinv keeps its private max(m,n)*Number.EPSILON*sigma_max cutoff while SVD supplies singular modes; the shared matrix epsilon is unchanged.
Native v12 brackets it:1e-12 is inverted and1e-16 is zero beside unit scale; exact cutoff/scale behavior remains trace-required.

Semantic constant folding and declaration numeric properties share operand kinds with executable expressions: v4/v5 const-int division truncates through `divideV5ConstInts`; v6 and float operands retain fractional results.

Indicator dynamic request permission resolves known const bool expressions through
the checker and carries one value into compile policy, requested children and runtime.
Other declarations, unresolved options and version defaults retain their existing routes.

User-callable reference-type parameters ignore value-only qualifier ceilings, including explicit simple annotations and inferred wrapper requirements. Preserve value-type qualifiers and reference kind/identity checks; this exemption does not change variable declaration rules.

Checker namespace paths require a complete identifier root. A method on a call
result such as `array.copy(values).fill(3)` retains receiver-type dispatch; its
method name alone must not enter global plotting signature, scope or handle checks.
Imported members retain explicit alias ownership rather than decoding generated names. Ambiguous delimiter components or chart-name collisions use length-prefixed internal names; ordinary noncolliding aliases keep their existing emitted names.

Nested library dependencies retain caller-library namespace bindings. Reused aliases targeting different versions or libraries receive private compiler namespaces; noncolliding imports retain emitted names.
Imported function overloads retain every exported declaration and select by qualified argument type. Code generation carries the selected declaration into a distinct internal function name; single-overload names remain unchanged.

Local collection-overload scoring and imported reference qualifiers compose: non-method local UDFs retain recursive collection specificity, while reference parameters retain the value-qualifier exemption.

Imported overload composition retains explicit alias ownership and dependency scopes for each selected declaration. Normal merges after a withdrawn atom must restore its original behavior explicitly when multiple merge bases hide the earlier implementation delta.

Dynamic extrema deque readiness counts physical samples processed since rebuild,
independently of bounded source-buffer retention. Rebuilds seed from retained
physical history; preserve holes, ties and offset publication.

TA length admission shares the integer-derived division marker across all ta.* length slots.
Explicit float operands remain invalid for integer slots, and simple-length qualifier checks still apply.
Constant length folding uses the emitted modulo semantics: floor-quotient modulo
from v5 onward, and remainder for older versions.

Performance composites use legal v6 object-history syntax and a non-reserved
`priceRange` local. Their request count, computational load, and four-compiled
worker baseline stay unchanged when semantic admission rules tighten.

Realtime parity compares workers receiving the same complete tick prefix. Fresh
workers replay prior ticks before each compared update, retaining every log event
and the existing plots, drawings, alerts, and strategy comparisons.

Worker initialization retains one validated program for an identical source and
serialized library contents and runtime options. Every init retires execution state; changed source,
library content or options, failed validation, or explicit disposal invalidates reuse.
Worker request preloading reuses execution's prepared compilation, including across provider replies
and realtime updates. Query bindings are still collected from the current inputs and runtime each time.

Compiled loops share one counter and sample the bound clock every 64 iterations, including nested/UDF loops. Outermost entries sample their own start, excluding prior non-loop work; nested and UDF-called inner loops inherit that active start. Sampled checks enforce the outermost deadline, and outermost exits read the clock to preserve the exact 500ms exit boundary and error record. Nested entries and exits reuse the active clock state.

V6 integer-derived TA lengths retain dynamic admission but reject constant-folded fractional results. The folder handles constant arithmetic, math max/min/abs/round/floor/ceil and fully constant ternaries; rounding shares the runtime helper. V5 truncating admission is unchanged.

TA analysis reuses worker validation types only for identical AST and library identities, then carries expression and loop-result maps into emission. Changed programs or library maps are checked independently; declaration diagnostics still run at worker validation.

Nested polymorphic expression history normalizes unavailable boolean results to
false in v6, using the current result kind without evaluating the call twice.
Numeric missing history and v5 boolean missing history remain unavailable.

Enum title lowering follows resolved request expressions and their tuple members,
including local UDF tuple returns and lower-timeframe arrays. Register each tuple
binding in its own scope so enum-spelled ordinary strings retain string conversion.

Enum title inference uses the selected custom method return before interpreting
a receiver get as built-in collection access. Overloaded methods follow their selected
declaration; built-in calls infer array/matrix elements or map values.

VWAP band multipliers are per-call presentation inputs. Changing a series multiplier
retains the written call's accumulated source/volume and anchor period; it must not
select a different constructor-cache entry.

Enum title metadata follows typed matrix/map constructors, explicit collection
annotations and namespace/method get results across requests. Selected custom
get return types remain authoritative; ordinary string results keep their text.

Series-length TA PercentRank retains physical source slots and scans each current
window once through shared rank arithmetic. Fixed/input/simple lengths advance
one retained instance; never reconstruct and replay every window prefix.

Compiled line/label/box copy dispatch counts each written call's invocations per
bar, retaining its first-call ID and distinguishing repeated UDF/loop copies.
Each family caches its last written call and counts interleaved sites separately;
both states reset on the next bar, without changing constructor invocation state.

Imported callable enum members resolve through their defining library alias,
including requested execution and enum-title inference. Library parameters and
local fields that shadow enum names retain ordinary field access.

Request tuple-arity metadata follows resolved imported callable identities as well
as bare UDF calls. Lower-timeframe requests preserve separate arrays for imported
tuple members; existing tuple-budget policy and scalar-return behavior remain intact.

Return metadata inspecting a selected callable consults that callable's bound locals.
The caller's live emission scope must not shadow the callee's enum declarations;
direct member emission retains its current lexical shadow checks.

Enum title metadata resolves library-local UDT constructors in their defining
callable scope and qualifies scalar and array/matrix/map enum field annotations
through the UDT's library alias. Declared nested UDT names also retain that alias
across scalar and collection fields, so their own enum fields remain resolvable;
primitive fields and selected custom method returns stay distinct.

Map keys/values title metadata follows the map's declared key/value type into the
returned array, including requested imported UDT fields. Selected custom methods
keep their own return metadata instead of inheriting built-in extraction types.

Imported callable enum/UDT parameter and local annotations retain their defining
alias for both return inspection and conversions emitted inside the function.
String annotations remain primitive even when values match serialized enum IDs.

Enum title return metadata follows terminal if/switch UDF branches when their
returned enum types agree. Branch declarations resolve in their own local scope
and defining library; ordinary string returns retain string conversion.

A scalar terminal declaration supplies its enum-related return metadata in UDFs
and conditional blocks. The same local bindings used for expressions determine
its type; primitive string declarations keep string conversion.

An if result without an else retains its consequent enum metadata; the implicit
missing return does not change the enum type. Missing values and ordinary string
branches retain their existing runtime behavior.

Request tuple-width analysis follows equal-width literal tuple results in terminal
if/switch UDF branches, including imported functions. Lower-timeframe requests
retain one independent array per tuple member; execution and tuple budgets are unchanged.

Numeric-for and while UDF results retain their loop-body enum return metadata.
Body declarations use the defining library scope, while numeric loop counters
remain primitive bindings; loop execution, budgets and state are unchanged.

Array for-in return metadata binds the value variable to the array element type
and the optional index to a primitive type. Enum elements retain title metadata
through UDF returns; primitive string elements keep string conversion.

Map for-in return metadata binds the pair variables to their declared key and
value types. Either enum component retains title conversion through UDF returns;
array index/value inference and runtime map iteration are unchanged.

Matrix for-in return metadata binds each row as an array of the matrix element
type and keeps the optional row index primitive. Requested enum row elements
retain titles; primitive string rows and runtime matrix iteration are unchanged.

Requested child ASTs retain local method declarations referenced by member calls,
along with their transitive callable/global dependencies. Retain method overload
sets so child checking preserves custom versus built-in selection.

Inferred generic array/matrix/map constructors qualify enum and UDT type arguments
in the defining library scope, using the annotation qualification rule. Primitive
string type arguments retain ordinary string conversion through requested returns.

Builtin array first/last/pop/shift/remove return metadata retains the array element
type through local and imported UDF requests. Selected custom methods keep their own
return types, and primitive string elements retain ordinary string conversion.

Builtin array copy/slice return metadata retains the array element type in the
returned collection, including namespace and method calls through requested UDFs.
Selected custom methods and primitive string arrays retain their own return types.

Builtin matrix/map copies retain their declared collection type in requested UDF
return metadata, including enum elements, keys and values. Selected custom copy
methods keep their own return types; runtime copying and storage are unchanged.

Builtin matrix row/column extraction and removal retain an array of the declared
matrix element type in requested UDF metadata. Selected custom row/col and
remove_row/remove_col return types remain authoritative; runtime axes are unchanged.

Builtin array concat preserves the first array element type in requested return
metadata. Namespace metadata binds its documented id1/id2 arguments, including
named order; custom methods and primitive string arrays retain their own types.

Builtin map put/remove retain the declared previous-value type in requested UDF
return metadata, including named arguments. Selected custom methods retain their
own return types; runtime map mutation, previous values and ordering are unchanged.

Builtin matrix submatrix/transpose preserve the declared matrix element type in
requested UDF return metadata. Selected custom methods retain their own return
types; runtime slicing, transposition, storage and sharing are unchanged.

Builtin UDT receiver copy() retains its declared object type in requested UDF
return metadata, so enum fields keep title conversion. Selected custom copy
methods retain their own return types; runtime copying and storage are unchanged.

Static UDT.copy(id) resolves the defining library type namespace before dispatch,
using the same namespace resolution as UDT.new. Positional and named id binding
remain unchanged; local type namespaces retain their existing dispatch.

Static UDT.copy(id) return metadata retains the defining-library object type.
Caller variables with the type name do not replace that library binding; selected
copy functions retain their own return types and primitive string conversion.

Callable statement arrays normalize transient comma-chain wrappers during parsing,
including declaration-led single-line UDF bodies. Emission receives each body
statement in source order and returns the final statement result.

Explicit primitive UDF parameter annotations use canonical type assignability
at each call. Integer-to-float widening, missing values and versioned numeric
to bool conversion retain their existing type-system rules.

Imported function enum/UDT return metadata uses the existing selected overload
identity. Consuming libraries retain selected dependency calls in their defining
import namespace; collection method dispatch and overload admission stay unchanged.

Untyped local UDF parameters inherit enum/UDT return metadata from their written
call arguments in the caller's scope. Explicit annotations remain authoritative;
runtime argument binding and selected method dispatch are unchanged.

Untyped local UDF body conversions inherit enum/UDT parameter types per written
call, using the existing call-scope path to select inferred body metadata.
Typed parameters and ordinary string calls retain their own conversion rules.

Local UDF return metadata uses the declared default expression when an untyped
parameter argument is omitted. Explicit annotations and supplied positional or
named arguments retain precedence over default types.

Local UDF body profiles infer omitted enum/UDT defaults in their defining scope.
Default types follow identifier forwarding only when semantic argument types are
unknown; supplied types, annotations and imported callable scope stay authoritative.

Omitted UDF defaults emit in the defining library/global scope, with caller local,
persistent, source and history bindings suspended during expression emission.
Supplied arguments retain their caller bindings; body profiles are unchanged.

Requested child dependencies include UDF header defaults omitted at written calls.
Defaults add global references after body-local exclusions; functions without
defaults and supplied-only calls retain their existing dependency graph.

Local UDF body profiles retain array/matrix/map enum and UDT metadata from omitted
untyped defaults. Explicit annotations, supplied arguments and imported defaults
keep their existing type paths; runtime default evaluation is unchanged.

Generic `matrix.new<bool>` calls with omitted `initial_value` emit a `false` seed
in Pine v6, preserving its two-state boolean rule. Pine v5, explicit seeds and
non-boolean matrix constructors retain their existing emitted arguments.

Omitted `array_id` for v6 boolean matrix axis insertion emits a false-filled array.
Explicit arrays, v5 missing defaults and numeric matrix insertion retain their
existing arguments; receiver and index expressions are each evaluated once.

For v6 bool-valued maps, emitted `get`, `put` and `remove` calls replace a missing
return with false. Stored values, v5 returns and non-boolean value maps retain
the existing helper behavior.

Builtin array stdev, variance and linear percentile retain the integer element
kind for documented int overloads. Float arrays and selected custom methods keep
their own types; runtime arithmetic and rounding are unchanged.

Tuple destructuring records the enclosing initializer call context when metadata
inference requests per-call contexts. Nested untyped UDF body profiles keep their
written-call paths in v6; ordinary tuple binding and runtime evaluation are unchanged.
The arithmetic-only type pass excludes this tuple initializer recording so a
metadata repair cannot introduce new additive or division decisions. Existing
const/series association rules and other calls' arithmetic contexts are retained.

Local UDF body profiles retain collection types forwarded from an outer untyped
parameter's omitted default through an identifier argument. Explicit annotations
and known supplied types keep precedence; imported profiles are unchanged.

The existing series-float association branch comes from native-backed `2b690b9f0c`.
SHA-pinned v5/v6 probes explicitly plot series `x + (a - b)` and capture
`[1, -1, 1, -1]`, matching the branch rather than grouped binary64 zeros.
This pins captured outputs, not TradingView internal evaluation order or exact
Phasor/Classic/Woodie source parity; preserve the existing native association rule.

Local untyped UDF body profiles inherit supplied semantic array/matrix/map types
when their enum or UDT components require title metadata, per written call.
Explicit annotations and string collections retain their existing paths; omitted
defaults, imported callables and runtime argument binding are unchanged.

Local method body metadata uses the checker-selected local overload and excludes
the bound receiver when ordering explicit arguments. Imported method dispatch and
function-syntax calls retain their existing metadata paths.

Local function-syntax method calls record per-call body metadata only when the
body-profile checker requests it. Arithmetic and method-dispatch checks keep
their existing contexts; the explicit receiver remains the first argument.

Local UDT receiver method bodies retain selected declaration metadata in their own semantic call contexts.
The body profile falls back to that identity only when the shared dispatch map has no entry; explicit builtin selections remain authoritative.

Builtin `map.contains` returns series bool in v5 and v6, including receiver calls.
User-defined methods keep their own return types and qualifiers.

Builtin map value reads retain series provenance from dynamic writes in v5/v6.
V6 get/put/remove results always have a series floor; v5 static results keep their
existing qualifiers. Aliases share provenance; copies preserve their own state.

Builtin matrix.get results have the series qualifier in v6 while preserving
the element kind. V5 qualification, runtime values and custom methods stay unchanged.

Omitted UDF defaults resolve names in their definition scope without creating a
runtime function frame. Method-context arguments use the actual function-state
stack. Selected methods also retain checker overload selection while definition
defaults suspend caller local bindings inside an existing function frame.

Local helpers in omitted UDF defaults retain child state owned by the receiving
written call. Their header state IDs preserve the existing arithmetic/method context
IDs, while imported defaults and imported helper registrations keep their original paths.

Nonliteral indicator dynamic_requests options resolve before request-context
qualifier diagnostics are published, independent of declaration order. Check
arguments in their original scope and retain static-error ordering.

V52 native consumers require v6 input string predicate/length/position results to be simple,
str.match results to be at least simple, and str.format_time results to be series.
The shared string-result qualifier policy preserves admitted const/simple/series controls
and leaves v5 behavior unchanged; captured consumer refusals pin each qualifier kind.

Explicit realtime closing updates retain the preceding varip state and record
their closing before/after snapshots. Replaying an earlier confirmed bar starts
from its pre-update snapshot, preserving synthetic worker confirmation counts.

Pine v6 Keltner calls require simple multipliers and useTrueRange flags.
Apply these qualifier ceilings through the versioned TA argument table; earlier
versions retain their existing admission and all Keltner arithmetic is unchanged.

TA calls written directly in omitted local UDF or method defaults retain state
under the receiving written call. Their sampled histories remain independent;
imported default ownership and TA arithmetic keep their existing paths.

V5 explicit bool casts preserve a missing numeric argument as missing and evaluate
the argument once. Finite truth conversion stays the same; v6 retains its
two-state bool cast. Valuewhen receives the preserved v5 source directly.

### Gradient missing lower endpoint

A missing lower colour in `color.from_gradient` fades the upper colour alpha by the clamped interpolation ratio while preserving its RGB.
The v52 midpoint observers pin this route; finite endpoints and missing numeric bounds retain their existing behaviour.

### Native string overload admission

Pine v6 captured `str.format` matrix/enum arguments are refused. A supplied
`str.tostring` format refuses bool/string/enum and bool/string collections;
one-argument and numeric collection overloads retain their existing admission.

Polymorphic UDF request sites split requested dependency programs when their
selected callable/global sets differ. The executing call context selects the
program ID; sibling specializations never replay each other’s global initializers.

Requested call contexts select callable identities at both root and nested calls,
including typed method wrappers invoked with receiver or function syntax. Pass
that selected context through each wrapper before selecting its request program;
JavaScript number-kind dispatch cannot distinguish Pine int and float receivers.
