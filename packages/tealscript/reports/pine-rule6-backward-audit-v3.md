Superseded by pine-rule6-backward-audit-v4.md. Historical measurement only.

# Pine Rule 6 Backward Audit V3

Measurement commit: `67abac4e78`.

Rule 6 requires a fix oracle to come from outside the fix source: published
formula, reference composition, manual-specified result, hand-derived
arithmetic, or trace. Self-consistency checks and fixer-owned regression tests
are author evidence, not closed verification.

## Standing Form

Every future fix whose correctness matters must leave one evidence row:

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| `<commit or issue>` | `<fixer tests, invariants, corpus row, or self-check>` | `<published formula, reference composition, manual-specified result, hand-derived arithmetic, trace, or none>` | `<vector id, trace file, report path, or missing>` | `closed`, `partial`, or `open` |

If `External oracle` is `none`, the verification is open even when the fixer's
tests pass. If the oracle is trace-shaped, the row stays open until the trace is
captured or the trace purchase order marks it acquired. If the implementation
intentionally exposes or refuses trace-undetermined behavior instead of guessing
a value, close the row as bounded rather than leaving permanent noise in the
open list.

## Current Open Verifications

| Item | Status | What closes it |
| --- | --- | --- |
| `language.global-history-offset-boundaries` | open expected-red, runtime-owned | Runtime fix confirmed by the existing value vector derived from documented history semantics. Built-in histories, missing offsets, negative/fractional offsets and collection histories are closed; local `n[1]` still returns the prior `bar_index` instead of the prior local-series value. |
| `language.switch-arm-arrow-continuation-values` | open expected-red, parser-owned | Parser fix confirmed by the existing value vector derived from documented switch arm and line-wrapping semantics. |
| `ticker.kagi-two-argument-values` | open expected-red, parser/semantic-owned | Fix confirmed by the existing value vector derived from documented `ticker.kagi(symbol, reversal)` semantics. |
| `strategy.calc-on-order-fills-values` | open expected-red, trace-shaped | TradingView trace or documented fill-trigger re-entry model; do not infer from historical bars. |
| `ta.mfi` interior-`na` seed/hole/recovery | open, trace-required | Purchase one TA-hole trace covering `ta.mfi`, or published documentation that specifies hole recovery. Clean arithmetic and bounds are already closed. |
| Native `plotshape`/`plotchar` pixel placement, glyph metrics and styling | open, trace-required | TradingView visual trace or screenshot-level evidence for pixel placement and glyph/style behavior. Documented marker presence semantics are already closed. |

## Shared-Path Fixes

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| `bf94362cd4` generated history reference semantics | Runtime lane tests over generated histories. | Pine history operator documentation: unavailable offsets return `na`; history offsets are integer bar offsets; local series history must read the prior value of that series, not another series with the same name. | `language.global-history-offset-boundaries`; `language.dynamic-history-max-bars-back-na`; `language.collection-history-offset-boundaries` in `pine-value-vectors-coverage-v161.json`. | partial: built-in, missing, dynamic and collection paths closed; local-series shadowing remains open |
| `c75fe419ec` historical tick visual output replacement | Runtime lane tests for `calc_on_every_history_tick`. | Strategy execution recalculates the current historical bar; output remains one point per bar, not one point per OHLC tick. | `strategy.calc-on-every-history-tick-values` in `pine-value-vectors-coverage-v161.json`. | closed |
| `f1a1c6d5d3` color transparency precision | Runtime lane color tests. | TradingView color documentation: transparency is `0..100` mapped to alpha bytes; documented `color.new(color.olive, 40)` equivalence anchors conversion and fractional transparency preserves precision before byte rounding. | `priority.color-fractional-transparency-values` in `pine-value-vectors-coverage-v161.json`. | closed |

## Member And Diagnostic Fixes Since V2

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| `e0714c404b` sized `array.new_*()` without `initial_value` fills with Pine `na` | Runtime lane array tests. | TradingView reference: typed array constructors' optional `initial_value` defaults to `na`; `array.get()` returns the stored element. | `array.new-default-na-values` in `pine-value-vectors-coverage-v161.json`. | closed |
| `07e89eac16` collection sort order enums | Runtime lane array/matrix sort tests. | TradingView collection sort signatures accept `order.ascending` and `order.descending`; sorted output follows the requested order. | `array.sort-reverse-join-values`; matrix sort vectors in current value suite. | closed |
| `e7136357a8` modern-Pine `iff()` refusal | Checker tests. | TradingView migration documentation: `iff()` was removed and modern Pine uses the ternary conditional operator. | Semantic diagnostic tests derived from the migration rule. | closed for documented refusal |
| `85085c6c16` table dimension fallbacks | Runtime approximation tests. | TradingView does not specify exact behavior for invalid dynamic dimensions; TealScript exposes the approximation instead of silently claiming parity. | `PINE_TRACE_REQUIRED_v2.md`; runtime approximation profile tests. | closed as bounded/trace-undetermined |
| `6746da7fb2` enum lowering guards | Runtime lane tests. | Pine enum constants are documented symbolic values; vectors assert their public identity and family-specific use. | enum constant vectors in `pine-value-vectors-coverage-v161.json`. | closed |
| `3cbadb64dd` `array.slice(from > to)` domain | Runtime lane domain test. | TradingView array slice uses a half-open range; descending ranges have no documented valid meaning and should fail loudly instead of producing plausible output. | `domain.array-slice-descending-range-rejection`; `pine-input-domain-map-v1.json`. | closed for documented domain refusal |
| `39757006c2` invalid TA lookback lengths | Runtime lane length tests. | TradingView FAQ/reference: TA lengths are positive integers; zero, negative, fractional and non-finite lengths must not silently normalize. | `244/244` invalid-length vectors in `pine-value-vectors-ta-invalid-length-v1.json`. | closed |
| `1e52cd8518` swallowed Pine runtime errors | Runtime profile/error tests. | Pine-facing runtime error families and their triggering conditions must surface as script errors, not disappear into generated-code swallow paths. | Runtime error-boundary tests; classifier-before-swallow guard. | closed for surfacing/classification |

## Closed Entries Retained From V2

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| Operator precedence `a == b > c` | Parser lane regression tests and AST invariant sweep. | Pine operator precedence documentation: equality binds below relational comparisons. | `src/compat/pineInvariantGate.test.ts`; `external-pine-corpus-ast-structure-invariants-20260911.md`. | closed |
| AST block-boundary unary return | Parser lane regression tests. | UDF final-expression and unary-operator semantics produce `-ta.sma(source, 2)`. | `language.block-boundary-unary-return-values` in the value-vector suite. | closed |
| AST block-boundary for body | Parser lane regression tests. | Loop indentation semantics: the dedented statement executes once after the loop. | `language.block-boundary-for-body-values` in the value-vector suite. | closed |
| AST block-boundary switch nested if | Parser lane regression tests and structural invariants. | Switch arm and nested `if` expression semantics require the selected nested branch value. | `language.block-boundary-switch-nested-if-values`; fixed by `99fb4693b2`. | closed |
| Switch arm statement-block tails | Codegen regression tests. | Pine conditional-structure semantics: a selected switch arm returns its local block's final value. | Switch tail value vectors and `src/runtime/codegen/execute.test.ts`; fixed by `9458ae288e`. | closed |
| Semantic string concatenation and series/reference retention | Checker tests. | Pine operator, type-system, qualifier and reference-type rules. | Semantic checker tests plus `pineInvariantGate` type/qualifier invariants. | closed |
| `ta.mfi` bound | Runtime fix and property invariant. | Manual range: Money Flow Index is bounded `0..100`. | `invariant.mfi.*` cases. | closed for bound only |
| `ta.mfi` clean arithmetic | Value-vector source expectation. | `hlc3` definition plus signed source-volume money-flow ratio over the window. | `ta.mfi.clean-typical-price-values`. | closed |
| Request-expression Pine runtime error propagation | Runtime/codegen tests. | Pine-facing runtime error families remain Pine errors inside request-expression replay. | `pine-request-security.test.ts`; `execute.test.ts`; `approximationSurface.test.ts`. | closed |
| Native `plotshape`/`plotchar` marker semantics | Native renderer tests and web comparison. | Text-and-shapes documentation: non-`na` series emits; `color=na` hides marker body, not text; `plotchar` emits supplied glyph. | `NativeIndicatorPlotLayer.test.tsx`. | closed for documented semantics, open for pixel/style trace |
| Partial-exit `strategy.position_avg_price` | Runtime ledger invariants. | Hand-derived cost-basis arithmetic from TradingView strategy docs. | `strategy.partial-exit-average-price-values`. | closed |
| Nested optimized `ta.sma(...)` source ordering | Runtime regression test. | `ta.sma` arithmetic mean formula applied to the nested expression source. | `ta.sma.nested-expression-source-order-values`. | closed |

## Reuse Rule

New fixes should update this report only when they change the current open list
or add a closed/partial/open evidence row. Do not copy lane-owned regression
tests into the `External oracle` column; those belong in `Author evidence`.
A test that asserts current behavior is not an external oracle. A trace-required
or undocumented behavior should be marked as trace-shaped or bounded, not turned
into a guessed value oracle.
