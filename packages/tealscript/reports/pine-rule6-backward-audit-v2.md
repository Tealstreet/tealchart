# Pine Rule 6 Backward Audit V2

Superseded by `pine-rule6-backward-audit-v3.md`. Historical measurement only.

Measurement commit: `3c2c00ac84`.

Rule 6 requires a fix oracle to come from outside the fix source: published
formula, reference composition, manual-specified result, hand-derived
arithmetic, or trace.

## Standing Form

Every future fix whose correctness matters must leave one evidence row:

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| `<commit or issue>` | `<fixer tests, invariants, corpus row, or self-check>` | `<published formula, reference composition, manual-specified result, hand-derived arithmetic, trace, or none>` | `<vector id, trace file, report path, or missing>` | `closed`, `partial`, or `open` |

If `External oracle` is `none`, the verification is open even when the fixer's
tests pass. If the oracle is trace-shaped, the row stays open until the trace is
captured or the trace purchase order marks it acquired.

## Current Open Verifications

| Item | Status | What closes it |
| --- | --- | --- |
| `language.switch-arm-arrow-continuation-values` | open expected-red | Parser fix confirmed by the existing value vector derived from documented switch arm and line-wrapping semantics. |
| `ticker.kagi-two-argument-values` | open expected-red | Semantic/runtime fix confirmed by the existing value vector derived from documented `ticker.kagi(symbol, reversal)` semantics. |
| `strategy.calc-on-order-fills-values` | open expected-red, trace-shaped | TradingView trace or documented fill-trigger re-entry model; do not infer from historical bars. |
| `ta.mfi` interior-`na` seed/hole/recovery | open, trace-required | Purchase one TA-hole trace covering `ta.mfi`, or published documentation that specifies hole recovery. Clean arithmetic is already closed. |
| Native `plotshape`/`plotchar` pixel placement, glyph metrics and styling | open, trace-required | TradingView visual trace or screenshot-level evidence for pixel placement and glyph/style behavior. Documented marker presence semantics are already closed. |

## Closed Or Partial Back-Audit Entries

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| Operator precedence `a == b > c` | Parser lane regression tests and AST invariant sweep. | Pine operator precedence documentation: equality binds below relational comparisons. | `src/compat/pineInvariantGate.test.ts`; `external-pine-corpus-ast-structure-invariants-20260911.md`. | closed |
| AST block-boundary unary return | Parser lane regression tests. | UDF final-expression and unary-operator semantics produce `-ta.sma(source, 2)`. | `language.block-boundary-unary-return-values` in `pine-value-vectors-coverage-v124.json`. | closed |
| AST block-boundary for body | Parser lane regression tests. | Loop indentation semantics: the dedented statement executes once after the loop. | `language.block-boundary-for-body-values` in `pine-value-vectors-coverage-v124.json`. | closed |
| AST block-boundary switch nested if | Parser lane regression tests and structural invariants. | Switch arm and nested `if` expression semantics require the selected nested branch value. | `language.block-boundary-switch-nested-if-values` value vector; fixed by `99fb4693b2`. | closed |
| Switch arm statement-block tails | Codegen regression tests for switch arms ending in expression, nested `if`, `for`, or nested `switch` tails. | Pine conditional-structure semantics: a selected switch arm returns its local block's final value; nested `if` blocks return the selected branch's final value; loop expressions return the last evaluated body value. The expected series are hand-derived from fixed closes `[2, 0.5, -1]`: `if` tail `[7, 5, 3]`; loop tail `[7, 5, 5]`; switch arm ending nested `if` `[7, 5, 3]`; switch arm ending nested `for` `[7, 5, 3]`; switch arm ending nested `switch` `[7, 5, 3]`. | `src/runtime/codegen/execute.test.ts`; fixed by `9458ae288e`. | closed |
| Semantic string concatenation and series/reference retention | Checker tests. | Pine operator, type-system, qualifier and reference-type rules. | Semantic checker tests plus `pineInvariantGate` type/qualifier invariants. | closed |
| `ta.mfi` bound | Runtime fix and property invariant. | Manual range: Money Flow Index is bounded `0..100`. | `invariant.mfi.*` cases in `pine-value-vectors-coverage-v124.json`. | closed for bound only |
| `ta.mfi` clean arithmetic | Value-vector source expectation. | `hlc3` definition plus signed source-volume money-flow ratio over the window. | `ta.mfi.clean-typical-price-values` in `pine-value-vectors-coverage-v124.json`. | closed |
| TA invalid length coercion | Runtime tests. | TradingView FAQ/reference: TA lengths must be positive integers. | `244/244` invalid-length cases in `pine-value-vectors-ta-invalid-length-v1.json`. | closed |
| Seven swallowed Pine errors | Runtime profile/error tests. | Pine-facing documented runtime error families and their triggering conditions. | `report-external-pine-corpus-current-error-rerun.ts`; runtime error-boundary tests. | closed for surfacing/classification |
| Request-expression Pine runtime error propagation | Runtime/codegen tests; one old execute test had asserted swallowed `array.get` out-of-bounds inside `request.security()` and was corrected. | Same Pine-facing runtime error families as main compiled execution; request-expression replay does not make TA length or array bounds errors non-Pine. | `pine-request-security.test.ts`; `execute.test.ts`; `approximationSurface.test.ts` classifier-before-swallow guard. | closed |
| Native `plotshape`/`plotchar` marker semantics | Native renderer tests and web comparison. | Text-and-shapes documentation: non-`na` series emits; `color=na` hides marker body, not text; `plotchar` emits supplied glyph. | `NativeIndicatorPlotLayer.test.tsx`. | closed for documented semantics, open for pixel/style trace |
| Partial-exit `strategy.position_avg_price` | Runtime ledger invariants. | Hand-derived cost-basis arithmetic from TradingView strategy docs. | `strategy.partial-exit-average-price-values` in `pine-value-vectors-coverage-v123.json` and later. | closed |
| Nested optimized `ta.sma(...)` source ordering | Runtime regression test. | `ta.sma` arithmetic mean formula applied to the nested expression source. | `ta.sma.nested-expression-source-order-values` in `pine-value-vectors-coverage-v123.json` and later. | closed |

## Reuse Rule

New fixes should update this report only when they change the current open list
or add a closed/partial/open evidence row. Do not copy lane-owned regression
tests into the `External oracle` column; those belong in `Author evidence`.
A test that asserts current behavior is not an external oracle: stale
expectations such as `ta.highest(close, 0)`, legacy bool/numeric fixtures, and
the old swallowed request-expression `array.get` case defended defects until an
independent reference, invariant, or trace displaced them.
