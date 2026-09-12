> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot v1

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v80.md`.

## Summary

- Independent-oracle value-vector cases: 251.
- Core `ta.*` cases: 181.
- Runtime/language semantics cases: 57.
- Other namespaces with value vectors: `math.*` 6, `str.*` 5, `array.*` 2.
- Expected engine defects still tracked: 3.
- Unexpected failures: 0.
- Unexpected passes: 0.

The corpus output differential no longer provides semantic evidence. The
current tree is compiled-only, so `executeScript()` and direct
`executeCompiled()` are two entry points into the same implementation. Their
864/864 agreement proves wrapper consistency, not Pine correctness.

## Coverage Fractions

| Surface | Independent-oracle coverage | Fraction | What remains outside the oracle |
| --- | ---: | ---: | --- |
| Core committed `ta.*` names | 74 of 74 names | 100.00% | More hostile shapes per name, especially undocumented edge behaviour. |
| Official `TradingView/ta` library exports currently implemented | 13 of 13 names | 100.00% | Version-specific trace checks where docs omit exact edge behaviour. |
| Runtime/language checklist | 16 of 23 categories | 69.57% | More scope/history combinations, declarations, collections, and object identity cases. |
| Requested builtin completeness audit surface | 87 of 489 documented members have at least one value vector | 17.79% | Most non-TA namespaces are checked for existence/signature, not independent value semantics. |

The `ta.*` fraction is exact against the committed 74-name `ta` surface. The
language fraction is an explicit local checklist because Pine language semantics
do not have a builtin-style finite member table in this repo.

## Language Checklist

Covered by independent-oracle vectors:

- History operator on identifiers and locals.
- History operator on expressions, ternaries, function results, method results,
  and UDT/object histories.
- Dynamic history offsets.
- Tuple destructuring and `_` discard position.
- `if` and `switch` as expressions.
- Bool no-branch and numeric no-branch conditional results.
- `for` and `while` loop return values, side effects, `break`, `continue`, and
  reverse ranges.
- UDF parameter/local shadowing and per-call-site local history.
- UDF `var`/`varip` state per written call.
- Method receiver dispatch and method-local persistent state.
- UDT field persistence and method-returned UDT field history.
- Short-circuit and branch laziness for skipped runtime errors.
- Default UDF source parameters.
- Basic type widening from `int` to `float`.
- Persistent globals with `var` and `varip`.
- Array method result history.

Not yet independently covered:

- Library-local `var`/`varip` state across multiple imported call sites.
- Global declaration side effects beyond plots, including strategy declaration
  settings as value inputs.
- Collection history on arrays, matrices, maps, and nested UDT collection fields.
- Mutation ordering for arrays/maps/matrices across loop iterations.
- Object identity and copy semantics for UDTs stored in collections.
- Realtime `varip` intrabar replacement semantics under a value oracle.
- Qualifier propagation across user-defined generic-looking helper chains.

## Current Finding

The only semantic value oracle that survives the compiled-only cutover is the
independent value-vector suite. It covers the full committed `ta.*` name surface,
but only a minority of the broader builtin surface and an explicit subset of
language semantics. Agreement between corpus rows or wrapper paths must not be
read as Pine correctness unless the same construct has an independent oracle.
