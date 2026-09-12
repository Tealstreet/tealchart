> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V3

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v82.md`.

## Summary

- Independent-oracle value-vector cases: 261.
- Core `ta.*` cases: 181.
- Runtime/language semantics cases: 63.
- Strategy/order-facing cases: 4.
- Other namespaces with value vectors: `math.*` 6, `str.*` 5, `array.*` 2.
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
| Requested builtin completeness audit surface | 105 of 489 documented members have at least one value vector | 21.47% | Most non-TA namespaces are checked for existence/signature, not independent value semantics. |

The broader builtin fraction counts the previous 87 TA/official-TA value-covered
members plus 18 strategy declaration, order, ledger, and trade-accessor members
covered by the new strategy vectors. It is intentionally stricter than counting
every helper namespace mentioned incidentally inside language fixtures.

## Newly Covered High-Blast-Radius Builtins

- `strategy()` declaration values feeding `strategy.initial_capital` and
  `strategy.equity`.
- `strategy.entry()` and `strategy.close()` effects on `strategy.position_size`,
  `strategy.position_avg_price`, `strategy.netprofit`, and
  `strategy.closedtrades`.
- `strategy.exit()` price-order fills feeding `strategy.closedtrades` and
  `strategy.netprofit`.
- `strategy.closedtrades.entry_price()`, `exit_price()`, `profit()`, and
  `size()`.
- `strategy.opentrades.entry_price()`, `profit()`, `size()`, and
  `capital_held`.

## Current Finding

Independent value vectors are now the only semantic value oracle after the
compiled-only cutover. They cover the full committed `ta.*` name surface and
nearly all of the language checklist, but only 105/489 documented builtin
members have independent value checks. Agreement between corpus rows or wrapper
paths must not be read as Pine correctness unless the same construct has an
independent oracle.
