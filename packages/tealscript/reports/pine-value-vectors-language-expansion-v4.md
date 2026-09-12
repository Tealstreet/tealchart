> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V4

Source report: `pine-value-vectors-coverage-v78.md`.

## Summary

- Total value-vector cases: 242.
- Added language-semantics cases: 4.
- Compiled matches: 238/242.
- Public compiled wrapper matches: 238/242.
- Expected failures: 4.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- Lazy `or` skips an erroring right operand when the left operand is true.
- Lazy `and` skips an erroring right operand when the left operand is false.
- `if` returns only the selected branch value.
- `switch` returns only the selected branch value.

Each fixture puts the cited Pine rule next to the expected vector through its
`rule` field.
