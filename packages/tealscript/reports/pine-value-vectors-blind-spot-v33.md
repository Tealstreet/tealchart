> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V33

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-blind-spot-v33.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v32.md`

## Summary

- Independent-oracle value-vector cases: `365`.
- Context-sensitive cases run under a second chart context: `64`.
- Expected engine defects or trace-required surfaces tracked by id: `5`.
- New covered members in this batch: `17`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `463/489` | `94.68%` | Adds all documented predefined `color.*` constants from the TradingView v6 Colors constant table. |
| Practical no-trace ceiling | `463/471` | `98.30%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain high-yield; this batch stayed on builtin member coverage. |

## Remaining Surface Shape

- Remaining raw uncovered members: `26`.
- Remaining no-trace-verifiable members: `8`.
- Practical no-trace ceiling remains `471/489`: `18` members currently require TradingView traces or host/provider exactness.
- The remaining uncovered set is now dominated by trace/provider-exact members. The practical local ceiling is close: only `8` locally-verifiable members remain without independent-oracle vectors.

## New Coverage

- `runtime.color-constants-values` covers the `17` predefined color constants documented by TradingView v6: `color.aqua`, `color.black`, `color.blue`, `color.fuchsia`, `color.gray`, `color.green`, `color.lime`, `color.maroon`, `color.navy`, `color.olive`, `color.orange`, `color.purple`, `color.red`, `color.silver`, `color.teal`, `color.white`, and `color.yellow`.
- The vector asserts concrete RGB-derived numeric values through `color.r()`, `color.g()`, and `color.b()`, so it fails if the constant resolves to `na`, the wrong channel values, or a non-color value.
- Source: TradingView v6 Colors documentation, constant colors table: `https://www.tradingview.com/pine-script-docs/visuals/colors/#constant-colors`.

## Gate Status

- Value-vector gate: `365` cases, `360` compiled/public matches, `5` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
- `strategy.aggregate-percent-contract-values` remains a strategy aggregate/max-contract value defect.
- `strategy.aggregate-runup-percent-values` remains a strategy aggregate percent excursion defect.
