> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V7

Source report: `pine-value-vectors-coverage-v81.md`.

## Summary

- Total value-vector cases: 257.
- Added language-semantics cases: 6.
- Runtime/language cases: 63.
- Compiled matches: 256/257.
- Public compiled wrapper matches: 256/257.
- Expected failures: 1.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- Imported-library local state across multiple written call sites.
- Strategy declaration settings used as value inputs through strategy built-ins.
- Collection history on arrays, matrices, and maps.
- Collection mutation ordering across loop iterations.
- UDT object copy identity after storage in collections.
- Qualifier propagation through helper chains into TA length arguments.

Each added fixture records the v6 rule and TradingView citation beside the
expected series in `scripts/run-pine-value-vectors.ts`.

## Finding

Five of the six new historical language vectors pass. The collection-history
case is a confirmed engine defect candidate: `array`, `matrix`, and `map`
history reads return the current mutable collection handle rather than the prior
collection instance. It is now tracked as an expected value-vector failure by
case id so the green gate still protects every other vector.

The remaining language checklist category is realtime `varip` intrabar
replacement semantics. It cannot be proved by the fixed historical value-vector
runner and needs a dedicated realtime value oracle.
