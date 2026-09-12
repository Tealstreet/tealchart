> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V6

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v85.md`.

## Summary

- Independent-oracle value-vector cases: 300.
- Core `ta.*` cases: 181.
- Runtime/language semantics cases: 63.
- Strategy/order-facing cases: 4.
- Request/host-data cases: 5.
- Other namespaces with value vectors: `math.*` 27, `str.*` 18, `array.*` 2.
- Expected engine defects still tracked: 1.
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
| Requested builtin completeness audit surface | 144 of 489 documented members have at least one value vector | 29.45% | Most non-TA namespaces are checked for existence/signature, not independent value semantics. |

The broader builtin fraction counts the previous 131 value-covered members plus
all 13 remaining documented `str.*` members.

## Current Finding

Independent value vectors are now the only semantic value oracle after the
compiled-only cutover. They cover the full committed `ta.*` name surface, nearly
all of the language checklist, first-order request merge/event behaviour, 25 of
28 documented `math.*` members, and the full documented `str.*` surface.
