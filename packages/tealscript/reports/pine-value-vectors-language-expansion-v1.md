> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V1

Source report: `pine-value-vectors-coverage-v73.md`.

## Summary

- Total value-vector cases: 223.
- Added language-semantics cases: 9.
- Compiled matches: 212/223.
- Public compiled wrapper matches: 212/223.
- New failing case: `language.nested-expression-history-offset2`.

## Added Coverage

- Non-identifier history with offset 2: `(close * 2 + open)[2]`.
- Tuple-return destructuring followed by history reads on each tuple variable.
- `if` and `switch` expressions assigned to series variables and history-read.
- `for` and `while` loops that update outer variables across bars.
- `for` with `break` over historical offsets.
- Nested `var` initialization inside a UDF conditional, checked per call site.
- UDF-local `var` updated inside a loop, checked per call site.

## Result

- Eight of nine new vectors match both compiled paths.
- `language.nested-expression-history-offset2` confirms the existing
  non-identifier series-history root cause at a different offset: expected
  leading `na` count is 2, actual leading `na` count is 12.

## Fixture Rule Discipline

New language cases carry a `rule` string in the fixture beside the expected
series. The generated report preserves that text so future oracle reviews can
inspect the Pine rule and citation at the row that defines the expectation.
