> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V3

Source report: `pine-value-vectors-coverage-v77.md`.

## Summary

- Total value-vector cases: 238.
- Added language-semantics cases: 4.
- Compiled matches: 234/238.
- Public compiled wrapper matches: 234/238.
- Expected failures: 4.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- Reassigned local history: `=` declaration followed by `:=` reassignment,
  then `value[1]`.
- Ternary expression history: `(... ? ... : ...)[1]`.
- Array method-result history: `values.get(...)[1]`.
- UDF-returned UDT object history before field access:
  `(makeWrap(close)[1]).value`.

Each added fixture stores the Pine rule and citation in the `rule` field beside
the expected series.

## highestSince / lowestSince Adjudication

`tradingview-ta.highestSince.v7` and `tradingview-ta.lowestSince.v7` are not new
defects and not renamed language-history failures. They are the existing
imported-library persistent-local-state defect:

- Official TradingView `ta` v7 source initializes a local `var float value = na`
  and then resets to `source` when `cond or na(value[1])`.
- Pine `var` declarations initialize once on the first execution of their
  block, so these functions should emit a non-`na` value on the first bar.
- Expected leading `na`: 0.
- Current actual leading `na`: 12.

Citations:

- TradingView published `ta` library:
  `https://www.tradingview.com/script/BICzyhq0-ta/`.
- TradingView v6 variable declarations:
  `https://www.tradingview.com/pine-script-docs/language/variable-declarations/`.

## Expected Failures

- `tradingview-ta.highestSince.v7`.
- `tradingview-ta.lowestSince.v7`.
- `hostile.atr.middle-na`.
- `hostile.atr.multi-middle-na`.
