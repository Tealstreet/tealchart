> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Expansion V1

Measurement base: `c0c6b907a4` plus the vector additions committed with this
report.

Source report: `pine-value-vectors-coverage-v72.md`.

## Summary

- Total value-vector cases: 214.
- Namespaces covered: `ta` 181, `runtime` 20, `math` 6, `str` 5, `array` 2.
- Compiled matches: 202/214.
- Public compiled wrapper matches: 202/214.
- Current failed cases: 12.

## Added Coverage

- Hostile TA inputs added by default: flat/zero-variance windows, interior `na`,
  overlong windows, length-1 windows, plateau ties, and long recursive series.
- Imported official `TradingView/ta` cases now run through real
  version-pinned imports: v1 `cagr`, v7 `changePercent`/`aroon`/`donchian`/
  `highestSince`/`lowestSince`/`trima`, and v12
  `er`/`kama`/`chandelier`/`ppo`/`ulcerIndex`.
- Language-semantics cases now cover local history, function-result history,
  UDF parameter/local shadowing, `var`/`varip` persistence inside UDFs, and
  per-call-site local history.

## Confirmed Engine Defects

- `hostile.linreg.middle-na`: `ta.linreg` emits finite values through an
  interior-`na` source window where the fixed-length regression window should be
  unavailable.
- `ta.alma`: `ta.alma` seeds at bar 4 for length 5 but uses the wrong weighting
  direction after seed.
- `tradingview-ta.highestSince.v7`: imported `TradingView/ta/7.highestSince`
  returns `na` on every bar instead of resetting from `na(value[1])` to the
  current source.
- `tradingview-ta.lowestSince.v7`: imported `TradingView/ta/7.lowestSince`
  returns `na` on every bar instead of resetting from `na(value[1])` to the
  current source.
- `ta.alma.explicit-floor`: the explicit-floor overload is now covered and
  fails with the same wrong weighting class as the four-argument `ta.alma` case.
- `hostile.dmi.multi-middle-na`: `ta.dmi` seeds late and computes different
  directional/ADX values through multiple interior `na` bars.
- `hostile.cci.flat`: `ta.cci` returns zero on zero-deviation windows where the
  denominator is unavailable and the result should be `na`.
- `language.expression-history`: history on a parenthesized expression returns
  `na` instead of the previous expression value.
- `language.function-result-history`: history on a function-call result returns
  `na` for every prior bar instead of preserving the call result series.
- `language.function-result-history-call-sites`: the same function-result
  history defect affects multiple call sites independently.

## Corrected Oracle Entries

- `tradingview-ta.aroon.v7`: the first attempted oracle used the older
  duplicate-high tie direction. It was corrected to match the existing
  hostile `ta.highestbars` tie policy before recording `v71`.
- `ta.nvi`: the `v72` oracle incorrectly skipped volume-triggered updates when
  the current close was zero. Pine's NVI update uses the previous close as the
  denominator; the engine output is correct for the disputed bars.
- `ta.pvi`: the `v72` oracle had the same current-close-zero guard defect as
  `ta.nvi`. Pine's PVI update uses the previous close as the denominator; the
  engine output is correct for the disputed bars.

## Remaining TA Coverage Holes

- `ta.allTimeHigh` and `ta.allTimeLow`: trace required before adding an oracle;
  the committed library surface currently exposes them, but the exact documented
  behaviour needs TradingView value traces rather than inference.
- `ta.requestVolumeDelta`: product/request-data required; it depends on
  `request.security_lower_tf()` provider data, so a fixed local OHLCV vector is
  not a complete oracle.
- `ta.bar_index`: internal compatibility alias, not a manual TA builtin; covered
  by ordinary language/history vectors through `bar_index`, not as `ta.*`.

## Rules Used

- TradingView's v6 operators documentation states that the `[]`
  history-referencing operator applies after a variable, expression, or function
  call, and references past values of that series.
- TradingView's v6 user-defined-functions documentation states that each
  written function call has its own local scope and independent history.
- TradingView's v6 variable-declarations documentation defines `var` as
  initialized once and then preserved across bars; `varip` is preserved across
  realtime updates as well.
- TradingView's v6 techniques FAQ states that local variables may shadow global
  names.
- TradingView's v6 reference manual is the source for `ta.*` signatures and
  documented built-in behaviour.
