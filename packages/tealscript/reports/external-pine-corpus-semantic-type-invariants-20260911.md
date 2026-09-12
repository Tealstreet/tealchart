> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Semantic Type Invariants — 2026-09-11

## Scope

This pass checks the semantic-stage blind spot left by acceptance censuses: a
script can parse, pass semantic analysis, compile, and still carry the wrong
inferred type or qualifier. The invariant checker is intentionally independent
of the semantic checker for the rules it claims:

- arithmetic/comparison/logical result types and numeric promotion from the
  TradingView operators documentation:
  https://www.tradingview.com/pine-script-docs/language/operators/
- qualifier ordering and reference-type `series` behavior from the TradingView
  type-system documentation:
  https://www.tradingview.com/pine-script-docs/language/type-system/

The checker is conservative. It validates root semantic symbols only, and only
for expressions whose type and qualifier can be derived from the documentation
without calling back into TealScript's checker. Unmodeled calls, control-flow
conditions with unknown qualifiers, and declarations depending on reassigned
state are skipped rather than reported. A clean result therefore means no
doc-derived root-symbol disagreement in the modeled surface; it is not a claim
that every local temporary or user-defined function return is independently
typed.

## Known-Good Validation

Added `checkSemanticTypeInvariants()` regression coverage in
`src/semantic/checker.test.ts` for:

- integer and float arithmetic, including `/` returning `float`
- string concatenation
- comparison and logical operators
- input, simple, const, and series qualifier propagation
- tuple initializer arity and element types
- mixed numeric conditional arms
- reference constructors such as `label.new()`

Focused validation:

```text
yarn workspace @tealstreet/tealscript exec vitest run src/semantic/checker.test.ts --testNamePattern "semantic type invariant|Semantic Invariants"
Test Files  1 passed
Tests       407 passed
```

## Findings

The first validated invariant pass exposed two real semantic type drifts:

1. String concatenation inferred `unknown` for `"A" + "B"` even though Pine's
   `+` operator returns `string` for string operands.
2. Reference/special types and collection values were missing their inherited
   `series` qualifier in several semantic paths: constructors, typed
   annotations, UDT constructors, `plot()`/`hline()` handles, and collection
   helpers returning arrays, maps, or matrices.

Both were corrected before the corpus sweep. The instrument also found and
discarded its own overclaims before reporting: it no longer seeds expected
types from final checker symbols, no longer treats casts of unknown expressions
as known, and skips declarations affected by reassignment or unmodeled
control-flow qualifier inputs.

## Corpus Sweep

Measured over all committed v5/v6 manifests plus the targeted v7 hard-tail
manifest, using the cached source trees and official TradingView libraries:

| Corpus | Total | Parse failed | Semantic failed | Semantic passed | Invariant rows | Invariant issues |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| v5 | 1000 | 10 | 94 | 896 | 0 | 0 |
| v6 | 1000 | 11 | 123 | 866 | 0 | 0 |
| v7 | 456 | 16 | 99 | 341 | 0 | 0 |
| **Total** | **2456** | **37** | **316** | **2103** | **0** | **0** |

Result: zero doc-derived semantic type invariant failures across the modeled
surface of the 2,103 scripts that currently pass semantic analysis.

## Standing Gate

The semantic type invariant now runs in the normal TealScript Vitest suite via
`src/compat/pineInvariantGate.test.ts`. The fast corpus-derived subset covers
the classes that produced real checker drift in this pass: string
concatenation, numeric promotion, conditional numeric merging, and the `series`
qualifier on reference/special values, collections, UDT constructors, `plot()`,
and `hline()`.

## Boundary

This instrument complements, but does not replace, the semantic acceptance
census. The acceptance census answers "did semantic analysis reject the script?"
This invariant answers "for accepted scripts, do the root symbols we can judge
independently agree with documented Pine type and qualifier rules?"

Remaining blind spots are deliberately named:

- local temporaries and UDF return types are only checked when they flow into a
  root symbol whose initializer is fully modeled
- most built-in function result typing is skipped unless the rule is explicit
  in this invariant
- runtime/value parity is out of scope
