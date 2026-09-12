> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V8

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v87.md`.

## Summary

- Independent-oracle value-vector cases: 309.
- Core `ta.*` cases: 181.
- Runtime/language semantics cases: 63.
- Strategy/order-facing cases: 4.
- Request/host-data cases: 5.
- Drawing/object cases: 5.
- Other namespaces with value vectors: `math.*` 27, `str.*` 18, `array.*` 4, `matrix.*` 1, `map.*` 1.
- Expected engine defects still tracked: 2.
- Unexpected failures: 0.
- Unexpected passes: 0.

The corpus output differential does not provide semantic evidence in the
compiled-only tree. `executeScript()` and direct `executeCompiled()` are two
entry points into the same implementation. Their agreement proves wrapper
consistency, not Pine correctness.

## Coverage Fractions

| Surface | Independent-oracle coverage | Fraction | What remains outside the oracle |
| --- | ---: | ---: | --- |
| Core committed `ta.*` names | 74 of 74 names | 100.00% | More hostile shapes per name, especially undocumented edge behaviour. |
| Official `TradingView/ta` library exports currently implemented | 13 of 13 names | 100.00% | Version-specific trace checks where docs omit exact edge behaviour. |
| Runtime/language checklist | 22 of 23 categories | 95.65% | Realtime `varip` replacement semantics needs a realtime value oracle. |
| Requested builtin completeness audit surface | 209 of 489 documented members have at least one value vector | 42.74% | Most visual metadata, table, input, session, ticker, timeframe and strategy accessors are still checked for existence/signature, not independent value semantics. |

The broader builtin fraction counts the previous 189 value-covered members plus
20 drawing/object members: line construction/getters, box construction/getters,
label construction/getters, linefill construction/getters, and two
`chart.point.*` members.

## Current Finding

The drawing expansion found a new expected engine defect:
`chart.point.copy()` returns a copied point whose `index` and `price` fields
read as `na`. The case remains in the green gate as an expected failure, so a
fix will report as an unexpected pass until the list entry is removed with the
fix.
