> Superseded by pine-value-vectors-split-gate-v10.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Split Gate V4

Source report: `pine-value-vectors-coverage-v82.md`.

## Summary

- Total value-vector cases: 261.
- Passing vectors protected by green gate: 260.
- Expected engine defects: 1.
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

- `language.collection-history-containers`: collection history reads return the
  current mutable collection handle instead of the prior collection instance.

## Newly Covered Since V3

- Four high-blast-radius strategy/order-facing value vectors now protect broker
  emulator outputs and trade accessor values under an independent oracle.
