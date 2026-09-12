> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors highestSince / lowestSince Readjudication V1

Source report: `pine-value-vectors-coverage-v79.md`.

## Verdict

`tradingview-ta.highestSince.v7` and `tradingview-ta.lowestSince.v7` are still
confirmed engine defects. If a separate adjudication reported imported-library
persistent state as already correct for these two case IDs, that adjudication
was wrong or was evaluating a different shape.

## Pine Rule

TradingView's published `ta` library documents:

- `highestSince(cond, source)`: tracks the highest value since the last
  occurrence of `cond`; `cond` resets tracking.
- `lowestSince(cond, source)`: tracks the lowest value since the last
  occurrence of `cond`; `cond` resets tracking.

The library source initializes `var float value = na` and uses the `na(value[1])`
case to seed from `source` on the first executed bar. Pine `var` declarations
initialize once on first execution of their block and then persist.

Citations:

- TradingView `ta` library: `https://www.tradingview.com/script/BICzyhq0-ta/`.
- TradingView v6 variable declarations:
  `https://www.tradingview.com/pine-script-docs/language/variable-declarations/`.

## Actual Series

`tradingview-ta.highestSince.v7`:

- Expected leading `na`: 0.
- Actual leading `na`: 12.
- Expected: `[1, -1, 1, 3, 0, 4, 4, -2, 2, 2, -1, 3]`.
- Compiled: `[na, na, na, na, na, na, na, na, na, na, na, na]`.
- Public path: `[na, na, na, na, na, na, na, na, na, na, na, na]`.

`tradingview-ta.lowestSince.v7`:

- Expected leading `na`: 0.
- Actual leading `na`: 12.
- Expected: `[-1, -3, -3, -3, -3, 2, -1, -4, -4, -4, -4, -4]`.
- Compiled: `[na, na, na, na, na, na, na, na, na, na, na, na]`.
- Public path: `[na, na, na, na, na, na, na, na, na, na, na, na]`.

## Cause

The failure is imported-library persistent local state. These functions depend
on a persistent local `var` slot inside an imported library function. TealScript
leaves the slot at `na` across every bar instead of seeding it from `source` on
the first execution.
