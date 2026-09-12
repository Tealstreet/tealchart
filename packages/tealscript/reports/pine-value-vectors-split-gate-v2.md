> Superseded by pine-value-vectors-split-gate-v10.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Split Gate V2

Source report: `pine-value-vectors-coverage-v80.md`.

## Summary

- Total value-vector cases: 251.
- Passing vectors protected by green gate: 248.
- Expected engine defects: 3.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Gate Rule

`packages/tealscript/tests/value-vectors.test.ts` runs the value-vector suite
through `validateValueVectorGate()`.

- A passing vector that starts failing fails the package test.
- A known engine defect that starts passing also fails the package test until
  the expected-failure manifest is updated.
- Expected failures are keyed by case id in
  `EXPECTED_VALUE_VECTOR_FAILURES`, with cause and Pine citation.

## Expected Failures Still Open

- `hostile.atr.middle-na`: ATR/RMA interior-`na` state.
- `hostile.atr.multi-middle-na`: ATR/RMA multi-hole state.
- `language.reverse-for-loop-sum`: reverse `for` loop iteration should include
  both range endpoints and accumulate exactly once per iteration.

## Newly Covered Since V1

- 24 additional value-vector cases.
- Expected defect count reduced from 7 to 3.
- Five new language-semantics vectors cover loop `continue`, loop `break`,
  method-local `var` state, UDT method-result history, and numeric no-branch
  `if` expressions.
