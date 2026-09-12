# TealScript `na` Semantics Audit v1

Date: 2026-09-12

Owner: TealScript runtime parity lane.

## Verdict

One documented defect cluster found.

TealScript's current v6-facing `na` rules are correct across the probed global
surfaces: arithmetic propagation, comparison falsehood, logical falsehood,
ternary/conditional selection, typed `na`, `na()`/`nz()`/`fixnan`, collection
defaults, and history before available bars.

Declared Pine v5 numeric comparisons are wrong when either operand is `na`.
The v5 manual says comparison operations can return `true`, `false`, or `na`;
TealScript's compiled comparison helpers currently return `false` for all
`na` operands in all declared versions. This is correct for v6, where `bool`
values are never `na`, but wrong for v5 numeric comparison results.

## Refusal Gate Confirmation

The refusal gate output is:

```json
{
  "rows": 6,
  "expectedRefusals": 6,
  "outputRows": 0
}
```

That is the same green result previously summarized as "6/6 expected refusals":
the fixture contains exactly six rows expected to refuse, and none produced
output. The newly landed qualifier, void-return, and extremebars-sign
enforcement paths did not add a hidden seventh refusal to that fixture.

## Scope Derivation

The sweep used the manual's global `na` rules plus the code paths that create,
detect, transform, or preserve unavailable values:

- `NaExpression` lowering and typed `na` casts.
- Binary arithmetic, comparison, and logical lowering.
- Ternary, `if`, and `switch` condition/result lowering.
- `na()`, `nz()`, and `fixnan`.
- `NumericSeries` and `ValueSeries` history reads.
- Array, matrix, and map default/missing values.
- Collection aggregate handling over `na` elements.
- UDF argument and return propagation.
- Semantic version rules for bool `na` and numeric-to-bool contexts.
- Existing value-vector coverage whose source, id, or expected output mentions
  `na`, `nz`, or `fixnan`.

The existing value-vector suite currently contains 336 `na`-related rows out of
991 total cases. They cluster most heavily in `ta.*` hostile leading/middle/all
`na` cases and language/runtime history cases. PineTS was not used as evidence.

## Manual Evidence

TradingView current v6 operators:

- Arithmetic: if at least one operand is `na`, the result is also `na`.
- Comparison: comparison operations return `bool` values.
- Ternary: returns the true arm only when the condition is true; otherwise the
  false arm.
- History: a too-deep reference returns `na`; the manual names `close[3]` on
  the third bar and `close[4]` on the fourth as examples.
- History `na` values used in expressions propagate through calculations unless
  explicitly handled with `na()`/`nz()`.

Source: https://www.tradingview.com/pine-script-docs/language/operators/

TradingView current v6 type system:

- `bool` values are never `na`; bool-typed expressions and structures return
  `false` instead of `na` when data is unavailable.
- Other return types, excluding `void`, return `na` when no data is available.
- Bare `myVar = na` is a compile error because the type is uncertain; explicit
  casts such as `float(na)` type the value.
- Some built-ins ignore `na` by function-specific remark; those policies must
  be read per function entry rather than inferred globally.

Source: https://www.tradingview.com/pine-script-docs/language/type-system/

TradingView v6 migration guide:

- Pine v6 removed boolean `na`.
- In Pine v5, bool variables can be `true`, `false`, or `na`.
- In v5, `na`, `0`, and `0.0` implicitly cast to false in bool contexts.
- `na()`, `nz()`, and `fixnan()` accepted bool arguments in v5 but no longer do
  in v6.
- A first-bar bool history reference returned `na` in v5 but returns `false` in
  v6.
- `and`/`or` are lazy in v6.

Source: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/

TradingView v5 operators:

- Arithmetic: if at least one operand is `na`, the result is also `na`.
- Comparison: if both operands have a numerical value, the result is bool:
  `true`, `false`, or `na`.
- Ternary: if the condition is `false` or `na`, the false arm is returned.
- History before the available bar returns `na`.

Source: https://www.tradingview.com/pine-script-docs/v5/language/operators/

TradingView v5 conditional structures:

- `if`/`switch` with no executed local block returns `na`; the page also names
  the empty-value alternatives `na`, `false`, or `""` depending on the assigned
  variable type.

Source: https://www.tradingview.com/pine-script-docs/v5/language/conditional-structures/

TradingView v4 operators:

- Arithmetic `na` propagation and history-before-available `na` are documented.
- The v4 operators page does not explicitly state the v5 wording that numeric
  comparisons can return `na`; do not extend the v5 comparison fix to v4 from
  this report alone.

Source: https://www.tradingview.com/pine-script-docs/v4/language/operators/

## Probed Results

### Correct: v6 Arithmetic `na` Propagation

Probe:

```pine
x = close[10]
plot(na(x + 1) ? 1 : 0)
plot(na(1 - x) ? 1 : 0)
plot(na(x * 2) ? 1 : 0)
plot(na(2 / x) ? 1 : 0)
plot(na(x % 2) ? 1 : 0)
```

Observed: all plots returned `1` on all bars.

### Correct: v6 Comparison `na` Produces `false`

Probe:

```pine
x = close[10]
plot(x == na ? 1 : 0)
plot(x != na ? 1 : 0)
plot(x > 1 ? 1 : 0)
plot(1 <= x ? 1 : 0)
```

Observed: all value plots returned `0`; direct literal comparisons also emitted
the existing semantic diagnostic telling users to use `na(value)`.

### Correct: v6 Logical and Conditional `na`

Runtime lowering treats unavailable numeric values as false in bool contexts,
and the semantic checker reports numeric/`na` bool contexts that v6 disallows.
The accepted v6 cases with real bool expressions match the docs:

- Empty bool `if` return -> `false`.
- Empty bool `switch` return -> `false`.
- Empty numeric `if`/`switch` return -> `na`.
- Too-deep bool history used as a bool -> `false`.

### Correct: `na()`, `nz()`, and `fixnan`

Probe:

```pine
src = bar_index < 2 ? na : close
plot(na(src) ? 1 : 0)
plot(nz(src))
plot(nz(src, open))
plot(fixnan(src))
```

Observed:

- `na(src)` -> `1,1,0,0,0`.
- `nz(src)` -> `0,0,12,13,14`.
- `nz(src, open)` -> `9.5,10.5,12,13,14`.
- `fixnan(src)` -> `na,na,12,13,14`.

### Correct: UDF Argument and Return Propagation

Probe:

```pine
f(x) => [na(x), nz(x, 7), x + 1]
src = bar_index == 0 ? na : close
[missing, filled, added] = f(src)
```

Observed:

- `missing` -> `true,false,false,false,false`.
- `filled` -> `7,11,12,13,14`.
- `added` -> `na,12,13,14,15`.

### Correct: Typed `na`

Probe:

```pine
float f = na
color c = color(na)
label lb = label(na)
plot(na(f) ? 1 : 0)
plot(na(c) ? 1 : 0)
plot(na(lb) ? 1 : 0)
```

Observed: all `na(...)` checks returned `1`.

This agrees with the previous return-type audit: typed `na` comparisons are not
hiding a wrong underlying type in scalar, color, handle, collection, tuple, UDT,
or dependent-return probes.

### Correct: Collections Defaults and Missing Reads

Probe:

```pine
a = array.new_float(2)
array.set(a, 1, close)
m = matrix.new<float>(1, 2)
mp = map.new<string, float>()
plot(na(array.get(a, 0)) ? 1 : 0)
plot(array.get(a, 1))
plot(na(matrix.get(m, 0, 0)) ? 1 : 0)
plot(na(map.get(mp, "missing")) ? 1 : 0)
```

Observed:

- Array omitted `initial_value` -> `na`.
- Matrix omitted `initialValue` -> `na`.
- Missing map key -> `na`.
- Explicitly set array element -> current close.

### Correct Where Covered: Collection Aggregates with `na`

Probe:

```pine
a = array.from(na, 2.0, 4.0)
plot(array.avg(a))
plot(array.sum(a))
plot(array.min(a))
plot(array.max(a))
```

Observed: `3`, `6`, `2`, `4`.

This matches existing local value-vector expectations and the runtime's
non-`na` filtering helpers. The current manual's global type-system page says
some built-ins ignore `na` and instructs readers to check each function's
Reference Manual entry; this audit did not re-derive every per-builtin rolling
or aggregate `na` policy from each individual entry. Those rows remain governed
by the documented/local value-vector cases and trace register rather than by a
new blanket rule.

### Correct: History Before First Valid Value

Probe:

```pine
src = bar_index < 2 ? na : close
plot(na(src[1]) ? 1 : 0)
plot(na(src[3]) ? 1 : 0)
plot(nz(src[1], 99))
```

Observed:

- `src[1]` missing until bar 3, then reads the previous valid value.
- `src[3]` remains missing on the five-bar probe.
- `nz(src[1], 99)` fills only the unavailable history bars.

This agrees with the prior history audit and its shared series-buffer fixes.

## Defect Cluster: v5 Numeric Comparison `na`

Probe:

```pine
//@version=5
indicator("cmp")
x = close[10]
plot(na(x == 1) ? 1 : 0, "eq_na")
plot(na(x != 1) ? 1 : 0, "neq_na")
plot(na(x > 1) ? 1 : 0, "gt_na")
plot((x == 1) ? 1 : 0, "eq_truth")
plot((x != 1) ? 1 : 0, "neq_truth")
plot((x > 1) ? 1 : 0, "gt_truth")
```

Expected from v5 docs:

- `eq_na`, `neq_na`, and `gt_na` should be `1` while `x` is unavailable.
- Truthiness plots should still be `0` because a legacy bool `na` casts to
  false in bool contexts.

Observed:

```text
eq_na  = 0,0,0
neq_na = 0,0,0
gt_na  = 0,0,0
eq_truth = 0,0,0
neq_truth = 0,0,0
gt_truth = 0,0,0
```

The same result occurs in v3 and v4 probes, but this report has only v5 manual
evidence for comparison result `na`, so the documented defect is v5-scoped.

The discriminating oracle is the `na(comparison)` half of the probe, not the
truthiness half. In Pine v5, boolean `na` casts false in a condition, so
`(x == 1) ? 1 : 0` returns `0` under both the documented legacy model and
TealScript's old collapsed-false helper model. `na(x == 1)` is different: it
returns `1` only when the comparison result itself remains boolean `na`, so it
fails under the collapsed-false model and passes under the documented v5 model.

Root cause shape:

- The compiled runtime emits all equality/inequality comparisons through
  `_eq/_neq` and all ordered comparisons through `_cmp`.
- Those helpers are not declared-version-aware:

```js
function _eq(a, b) { return _isNa(a) || _isNa(b) ? false : a === b; }
function _neq(a, b) { return _isNa(a) || _isNa(b) ? false : a !== b; }
function _cmp(a, b, op) {
  if (_isNa(a) || _isNa(b)) return false;
  ...
}
```

- That behavior is correct for v6 but collapses v5's boolean `na` result to
  false before `na(result)` can observe it.

Sibling check:

- v5 bool history already returns boolean `na` on the first bar:
  `na(flag[1])` -> `1,0,0`.
- v5 empty bool `if` and `switch` returns already produce `na`.
- v6 bool history and empty bool conditionals produce `false`.
- v6 `na()`, `nz()`, and `fixnan()` with bool arguments are semantically
  rejected, matching the v6 migration guide.

Conclusion: the cluster is not "all legacy bool `na`"; it is specifically the
comparison lowering helpers for declared v5 numeric comparisons.

## Pre-Fix Blast Radius

Measurement target: currently accepted declared-v5 scripts in the committed
external corpus report `external-pine-corpus-v5.report.json`.

Method:

- Start from rows with `declaredVersion: 5` and
  `outcome: produced-output-compiled`.
- Fetch the exact source blobs from each row's `sourceRepoUrl`, `commitSha`,
  and `sourceFilePath`, because the report's recorded `/tmp` input directory is
  not present in this worktree.
- Parse and semantically check each fetched source again.
- Count only observable uses of a comparison result: a comparison result passed
  to `na()`, `nz()`, or `fixnan()`, a comparison-result variable later passed to
  those helpers, or a comparison result consumed by arithmetic. Ordinary
  conditional/truthiness uses were intentionally not counted because v5 boolean
  `na` and collapsed `false` both choose the false branch.

Result:

```text
declared-v5 produced-output rows: 219
fetched rows: 219
parsed and semantically accepted rows in the local re-check: 207
observable behavior-changing candidates: 0
```

The v4 comparison-result rule remains manual-silent in this audit. The same
observable-consumer scan over declared-v4 produced-output rows found 0
candidates, but the implementation below does not extend the v5 fix to v4
without a v4-specific manual statement or trace.

Newly changed corpus rows: none found by this observable scan. The behavior fix
is still required for documented v5 correctness and guarded by a value vector.

## Fix

Implemented in the compiled runtime comparison lowering:

- Declared Pine v5 equality, inequality, and ordered comparisons now use
  legacy helpers that return Pine `na` (`NaN`) when either operand is
  unavailable.
- Declared Pine v6 and other versions keep the existing helpers that return
  `false` for unavailable operands. v6 matches the current type-system rule
  that bool values are never `na`; v4 is left unchanged because the v4 operators
  page did not provide the v5 comparison-result wording.
- Discriminant `switch` equality uses the same version-scoped helper; JavaScript
  ternary selection treats the legacy `NaN` result as false, preserving branch
  selection while still keeping direct comparison results observable where the
  expression itself is returned.

Added value vector:

- `language.v5-comparison-na-result-is-na`
- Provenance: documented.
- Discrimination: the first three plots use `na(x == 1)`, `na(x != 1)`, and
  `na(x > 1)` so the old collapsed-false helpers fail while the history value
  is unavailable. The last three plots use truthiness and stay false while
  history is unavailable, proving the fix does not confuse v5 boolean `na`
  observability with conditional selection. Once `close[10]` becomes available,
  the expected outputs follow the ordinary comparison results from the fixture
  bars, so the vector also proves the legacy helper does not leave comparisons
  permanently `na`.

## Verification

Red-first:

- Added `language.v5-comparison-na-result-is-na` before the runtime fix.
- Value-vector gate failed with that one unexpected failure and the standing
  expected-red `strategy.calc-on-order-fills-values`.

Post-fix gates:

```text
yarn vitest run packages/tealscript/src/runtime/codegen/execute.test.ts -t "legacy v5 boolean na comparison"
1 passed, 400 skipped

yarn workspace @tealstreet/tealscript pine:value-vectors
992 cases, 991 matches, 1 expected-red, 0 unexpected failures

yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate
12 rows, 12 outputRows, 12 achievableOutputRows

yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate
6 rows, 6 expectedRefusals, 0 outputRows

yarn vitest run packages/tealscript/src/semantic/checker.test.ts
419 passed

yarn workspace @tealstreet/tealscript typecheck
passed in 85.70s
```

## Unprobed / Trace-Required Remainder

The manual is explicit that some built-ins ignore `na` and that each function's
Reference Manual remarks must be checked individually. Existing value vectors
cover a large part of that surface, especially TA hostile middle-`na` rows, but
this report does not claim a blanket zero-defect result for every rolling or
aggregate `na` policy in the standard library.

Remaining unprobed areas:

- Per-builtin `na` ignore/include policies where the Reference Manual entry is
  silent or not represented in current value vectors.
- Realtime tick-level `varip`/barstate interaction with `na`, which remains
  trace-shaped for the same reason as previous realtime `varip` work.

## Summary

- Documented wrong or unenforced `na` rules found: 1 cluster.
- Cluster: declared Pine v5 numeric comparison results with unavailable
  operands collapse to `false` instead of boolean `na`.
- Current v6 global `na` semantics: no defects found in the probed accepted
  surface.
- v5 sibling behavior outside comparisons: bool history and empty bool
  `if`/`switch` returns already preserve legacy boolean `na`.
- Instrument note: this is version-scoped. A v6-only probe would report clean;
  a v5 probe using truthiness only would also report clean because legacy
  boolean `na` casts to false. The discriminating probe is `na(comparison)`.
