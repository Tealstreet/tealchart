> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V2

Source report: `pine-value-vectors-coverage-v76.md`.

## Summary

- Total value-vector cases: 234.
- Added language-semantics cases: 7.
- Compiled matches: 227/234.
- Public compiled wrapper matches: 227/234.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- Missing bool history returns `false`, not `na`.
- Bool `if` expressions with no executed branch return `false`.
- Int expressions widen to float variables.
- `for` and `while` loop return expressions.
- `switch` branch blocks with local declarations and returned expressions.
- `var` declarations in separate UDF branches initialize on first execution of
  their own declaration.

## Result

All seven new vectors pass both compiled paths. The only remaining failures are
the seven expected TA/imported-library defects listed in
`EXPECTED_VALUE_VECTOR_FAILURES`.

## Fixture Rule Discipline

Each added fixture stores the exact Pine rule and citation beside the expected
series through the `rule` field, and the generated JSON report preserves it.
