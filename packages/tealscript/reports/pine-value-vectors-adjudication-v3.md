> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Adjudication V3

Source report: `pine-value-vectors-coverage-v72.md`.

Adjudication base: committed `v72` report plus the corrected `ta.nvi`/`ta.pvi`
oracle in `run-pine-value-vectors.ts`.

## NVI/PVI Dispute

- `ta.nvi`: oracle wrong, engine right for the disputed bars. Leading `na`: 0
  expected, 0 actual. Seeding rule: starts at `1.0`; when volume is lower than
  the previous bar, update from previous NVI using the close-price change
  relative to previous close. My prior oracle incorrectly skipped updates when
  the current close was zero; Pine's rule does not.
- `ta.pvi`: oracle wrong, engine right for the disputed bars. Leading `na`: 0
  expected, 0 actual. Seeding rule: starts at `1.0`; when volume is higher than
  the previous bar, update from previous PVI using the close-price change
  relative to previous close. My prior oracle incorrectly skipped updates when
  the current close was zero; Pine's rule does not.

ZX4RRG is right on these two. The prior "zero oracle corrections" statement was
false.

Verification on the current tree with the corrected oracle produced 204/214
matches for both compiled paths. `ta.nvi` and `ta.pvi` no longer fail; the
remaining red cases reflect the current engine state rather than the source
`v72` snapshot.

## Confirmed Engine Defects, Grouped By Root Cause

### Non-Identifier Series History, 3 cases

- `language.expression-history`: leading `na` expected 1, actual 12.
- `language.function-result-history`: leading `na` expected 1, actual 12.
- `language.function-result-history-call-sites`: leading `na` expected 1/1,
  actual 12/12.

Rule: the v6 `[]` history-referencing operator applies after a variable,
expression, or function call. Function calls and expression results are series
when evaluated on each bar, so their prior values must be retained.

### ALMA Weighting, 2 cases

- `ta.alma`: leading `na` expected 4, actual 4.
- `ta.alma.explicit-floor`: leading `na` expected 4, actual 4.

Rule: the v6 reference defines ALMA as a length-window Gaussian weighted average
using `m = offset * (length - 1)` or the floored `m` when the `floor` argument is
true. The seed point is correct; the weighted value is wrong.

### Imported Official-Library Persistent State, 2 cases

- `tradingview-ta.highestSince.v7`: leading `na` expected 0, actual 12.
- `tradingview-ta.lowestSince.v7`: leading `na` expected 0, actual 12.

Rule: the official `TradingView/ta` library source defines these with local
`var float value = na` and then resets when `cond or na(value[1])`; therefore the
first bar should initialize to the current source, not remain `na` forever.

### Interior-NA Fixed-Window Regression, 1 case

- `hostile.linreg.middle-na`: leading `na` expected 2, actual 2; mismatch starts
  at the interior-`na` window.

Rule: v6 `ta.linreg` is a fixed-length regression over the source window. A
window containing `na` cannot produce a finite regression value under Pine `na`
propagation.

### DMI Multi-Hole State, 1 case

- `hostile.dmi.multi-middle-na`: leading `na` expected 3/3/5, actual 5/5/7.

Rule: v6 `ta.dmi(diLength, adxSmoothing)` derives plus/minus directional
movement and ADX from RMA-smoothed directional movement and true range series.
Interior `na` bars should not reset the entire indicator state or delay all
three outputs by two bars.

### CCI Zero-Deviation Window, 1 case

- `hostile.cci.flat`: leading `na` expected 8, actual 2.

Rule: v6 `ta.cci(source, length)` divides the source deviation from its moving
average by `0.015 * meanDeviation`. On a zero-deviation flat window the
denominator is unavailable, so the result is `na`, not zero.

## Rechecked Prior UDF Pair

- `udf.barssince.call-sites-hostile` and `udf.valuewhen.call-sites-hostile` are
  still oracle-correct. The rule basis is the v6 function-call-scope rule: each
  written UDF call has its own local scope and independent history. They do not
  share the NVI/PVI oracle mistake.

## Sources

- TradingView Pine Script v6 Reference Manual: built-in signatures and formulas
  for `ta.alma`, `ta.cci`, `ta.dmi`, `ta.linreg`, `ta.nvi`, and `ta.pvi`.
- TradingView Pine Script v6 Operators documentation: `[]` history-referencing
  applies after variables, expressions, and function calls.
- TradingView Pine Script v6 User-defined functions documentation: each written
  function call has an independent local scope and history.
- TradingView support documentation for NVI/PVI: NVI/PVI seed from an initial
  value and update only on lower/higher volume bars using close-price change.
