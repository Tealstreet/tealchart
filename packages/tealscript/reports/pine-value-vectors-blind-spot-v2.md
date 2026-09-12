> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V2

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v81.md`.

## Summary

- Independent-oracle value-vector cases: 257.
- Core `ta.*` cases: 181.
- Runtime/language semantics cases: 63.
- Other namespaces with value vectors: `math.*` 6, `str.*` 5, `array.*` 2.
- Expected engine defects still tracked: 1.
- Unexpected failures: 0.
- Unexpected passes: 0.

The corpus output differential does not provide semantic evidence in the
compiled-only tree. `executeScript()` and direct `executeCompiled()` are two
entry points into the same implementation. Their current agreement proves
wrapper consistency, not Pine correctness.

## Coverage Fractions

| Surface | Independent-oracle coverage | Fraction | What remains outside the oracle |
| --- | ---: | ---: | --- |
| Core committed `ta.*` names | 74 of 74 names | 100.00% | More hostile shapes per name, especially undocumented edge behaviour. |
| Official `TradingView/ta` library exports currently implemented | 13 of 13 names | 100.00% | Version-specific trace checks where docs omit exact edge behaviour. |
| Runtime/language checklist | 22 of 23 categories | 95.65% | Realtime `varip` replacement semantics needs a realtime value oracle. |
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
- Library-local `var`/persistent state across imported call sites.
- Global declaration side effects through strategy declaration settings used as
  value inputs.
- Collection history on arrays, matrices, and maps.
- Mutation ordering for arrays/maps/matrices across loop iterations.
- Object identity and copy semantics for UDTs stored in collections.
- Qualifier propagation across helper chains.

Not yet independently covered:

- Realtime `varip` intrabar replacement semantics under a value oracle.

## Current Finding

Independent value vectors are now the only semantic value oracle after the
compiled-only cutover. They cover the full committed `ta.*` name surface and
nearly all of the language checklist, but only 87/489 documented builtin members
have independent value checks. Agreement between corpus rows or wrapper paths
must not be read as Pine correctness unless the same construct has an
independent oracle.
