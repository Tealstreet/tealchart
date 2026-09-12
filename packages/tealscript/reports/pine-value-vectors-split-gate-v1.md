> Superseded by pine-value-vectors-split-gate-v10.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Split Gate V1

Source report: `pine-value-vectors-coverage-v75.md`.

## Summary

- Total value-vector cases: 227.
- Passing vectors protected by green gate: 220.
- Expected engine defects: 7.
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

- `hostile.linreg.middle-na`: fixed-window regression with interior `na`.
- `tradingview-ta.highestSince.v7`: imported-library persistent local state.
- `tradingview-ta.lowestSince.v7`: imported-library persistent local state.
- `hostile.atr.middle-na`: ATR/RMA interior-`na` state.
- `hostile.atr.multi-middle-na`: ATR/RMA multi-hole state.
- `hostile.dmi.multi-middle-na`: DMI/RMA multi-hole state.
- `hostile.cci.flat`: CCI zero-deviation window should return `na`.

## Newly Fixed By Implementation Work

The split gate initially flagged five expected failures as now passing:

- `language.expression-history`
- `language.function-result-history`
- `language.function-result-history-call-sites`
- `language.nested-expression-history-offset2`
- `language.method-result-history`

Those are removed from the expected-failure manifest in this checkpoint, so the
green gate now protects them as ordinary passing vectors.
