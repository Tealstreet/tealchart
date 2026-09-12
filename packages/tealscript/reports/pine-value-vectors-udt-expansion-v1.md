> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors UDT Expansion V1

Source report: `pine-value-vectors-coverage-v74.md`.

## Summary

- Total value-vector cases: 227.
- Added UDT/method language cases: 4.
- Compiled matches: 215/227.
- Public compiled wrapper matches: 215/227.
- New failing case: `language.method-result-history`.

## Added Coverage

- UDT object history followed by field access: `(pair[1]).price`.
- UDT receiver-method dispatch: `wrap.add(open)`.
- Persistent `var` UDT field reassignment across bars.
- Method-call result history: `wrap.add(open)[1]`.

## Result

- UDT object history, receiver-method dispatch, and persistent UDT field
  reassignment match both compiled paths.
- `language.method-result-history` confirms the existing non-identifier
  series-history root cause for method-call results: expected leading `na` count
  is 1, actual leading `na` count is 12.

## Fixture Rule Discipline

All four cases carry a `rule` string in the fixture beside the expected series,
including the v6 migration rule that UDT field history must be written as
object history followed by field access.
