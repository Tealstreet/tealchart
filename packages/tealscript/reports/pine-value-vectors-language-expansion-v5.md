> Superseded by pine-value-vectors-language-expansion-v7.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Language Expansion V5

Source report: `pine-value-vectors-coverage-v79.md`.

## Summary

- Total value-vector cases: 246.
- Added language-semantics cases: 4.
- Compiled matches: 241/246.
- Public compiled wrapper matches: 241/246.
- Expected failures: 5.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Added Coverage

- Reverse `for` loop ranges.
- Tuple discard `_` preserving tuple positions.
- UDF default source parameter.
- Method parameter shadowing of builtin names.

## New Expected Defect

`language.reverse-for-loop-sum` is a confirmed engine defect. Pine `for` loops
can count downward when the start value is greater than the end value, while
TealScript currently executes zero iterations for `for i = 2 to 0`.

Citation: `https://www.tradingview.com/pine-script-docs/language/loops/`.

The other three new vectors pass both compiled paths.
