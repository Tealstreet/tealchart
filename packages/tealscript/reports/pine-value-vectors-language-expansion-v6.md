> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V6

Source report: `pine-value-vectors-coverage-v80.md`.

## Summary

- Total value-vector cases: 251.
- Added language-semantics cases: 5.
- Runtime/language cases: 57.
- Compiled matches: 248/251.
- Public compiled wrapper matches: 248/251.
- Expected failures: 3.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- `for` loop `continue` with history reads.
- `while` loop `break` with history reads.
- Method-local `var` state per written method call site.
- UDT method result field history.
- Numeric `if` expression with no selected branch returning `na`.

Each added fixture records the v6 rule and TradingView citation beside the
expected series in `scripts/run-pine-value-vectors.ts`.

## Finding

All five new language vectors pass. The split value-vector gate remains green:
new unexpected failures and expected failures that start passing both fail the
package test until the expectation list is intentionally updated.
