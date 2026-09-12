> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V32

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-blind-spot-v32.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v31.md`

## Summary

- Independent-oracle value-vector cases: `364`.
- Context-sensitive cases run under a second chart context: `64`.
- Expected engine defects or trace-required surfaces tracked by id: `5`.
- New covered members in this batch: `15`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `446/489` | `91.21%` | Adds concrete host chart metadata and strategy aggregate runup/drawdown vectors. |
| Practical no-trace ceiling | `446/471` | `94.69%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain high-yield; this batch stayed on builtin member coverage. |

## Remaining Surface Shape

- Remaining raw uncovered members: `43`.
- Remaining no-trace-verifiable members: `25`.
- The remaining raw set is not dominated by provider-only members. It is mostly visual/drawing/table object residues and strategy risk or broker-edge surfaces.
- Practical no-trace ceiling remains `471/489`: only `18` members currently require TradingView traces or host/provider exactness.

## New Coverage

- `runtime.chart-context-values` covers `13` chart metadata members from explicit host runtime options: `chart.bg_color`, `chart.fg_color`, `chart.left_visible_bar_time`, `chart.right_visible_bar_time`, `chart.is_standard`, `chart.is_renko`, `chart.is_heikinashi`, `chart.is_linebreak`, `chart.is_kagi`, `chart.is_pnf`, and `chart.is_range`.
- `strategy.aggregate-runup-drawdown-values` covers `strategy.max_runup` and `strategy.max_drawdown` using deterministic closed-trade equity excursions.
- `strategy.aggregate-runup-percent-values` is now a tracked expected defect: cash runup/drawdown pass, but `strategy.max_runup_percent` and `strategy.max_drawdown_percent` stay zero.

## Gate Status

- Value-vector gate: `364` cases, `359` compiled/public matches, `5` expected failures, `0` unexpected failures, `0` unexpected passes.
- Focused gate: `yarn vitest run packages/tealscript/tests/value-vectors.test.ts` passed.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
- `strategy.aggregate-percent-contract-values` remains a strategy aggregate/max-contract value defect.
- `strategy.aggregate-runup-percent-values` remains a strategy aggregate percent excursion defect.
