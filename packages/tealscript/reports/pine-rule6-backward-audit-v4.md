Superseded by pine-rule6-backward-audit-v5.md. Historical measurement only.

# Pine Rule 6 Backward Audit V4

Measurement commit: `2b54a9be43` plus the value-vector additions in this
report batch.

Rule 6 requires a fix oracle to come from outside the fix source: published
formula, reference composition, manual-specified result, hand-derived
arithmetic, or trace. Self-consistency checks and fixer-owned regression tests
are author evidence, not closed verification.

## Current Open Verifications

| Item | Status | What closes it |
| --- | --- | --- |
| `language.global-history-offset-boundaries` | open expected-red, runtime-owned | Runtime fix confirmed by the existing value vector derived from documented history semantics. Built-in histories, missing offsets, negative/fractional offsets and collection histories are closed; local `n[1]` still returns the prior `bar_index` instead of the prior local-series value. |
| `language.switch-arm-arrow-continuation-values` | open expected-red, parser-owned | Parser fix confirmed by the existing value vector derived from documented switch arm and line-wrapping semantics. |
| `ticker.kagi-two-argument-values` | open expected-red, parser/semantic-owned | Fix confirmed by the existing value vector derived from documented `ticker.kagi(symbol, reversal)` semantics. |
| `strategy.calc-on-order-fills-values` | open expected-red, trace-shaped | TradingView trace or documented fill-trigger re-entry model; do not infer from historical bars. |
| `ta.mfi` interior-`na` seed/hole/recovery | open, trace-required | Purchase one TA-hole trace covering `ta.mfi`, or published documentation that specifies hole recovery. Clean arithmetic and bounds are already closed. |
| Native `plotshape`/`plotchar` pixel placement, glyph metrics and styling | open, trace-required | TradingView visual trace or screenshot-level evidence for pixel placement and glyph/style behavior. Documented marker presence semantics are already closed. |

## Shared-Path Fixes Since V3

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| Sparse UDF call-site history | Runtime lane tests. | TradingView UDF docs: every written call has independent history, and function-local series history is created through successive calls to that function; skipped bars do not add a function-history slot. | `language.sparse-udf-call-site-history` in `pine-value-vectors-coverage-v164.json`. | closed |
| Dynamic request loop scoping | Runtime lane tests. | TradingView dynamic request docs allow request contexts computed in loops; ordinary Pine lexical scoping resolves the loop-local `symbol` variable before any built-in alias. | `request.security-loop-local-symbol-values` in `pine-value-vectors-coverage-v164.json`. | closed |
| Block-local `var` name scoping | Runtime lane tests. | TradingView variable declaration docs: each local block has its own scope; `var` initializes once and persists for that scoped declaration, not an outer declaration with the same name. | `language.block-local-var-name-scope` in `pine-value-vectors-coverage-v164.json`. | closed |

## Shared-Path Fixes Retained From V3

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| `bf94362cd4` generated history reference semantics | Runtime lane tests over generated histories. | Pine history operator documentation: unavailable offsets return `na`; history offsets are integer bar offsets; local series history must read the prior value of that series, not another series with the same name. | `language.global-history-offset-boundaries`; `language.dynamic-history-max-bars-back-na`; `language.collection-history-offset-boundaries`. | partial: built-in, missing, dynamic and collection paths closed; local-series shadowing remains open |
| `c75fe419ec` historical tick visual output replacement | Runtime lane tests for `calc_on_every_history_tick`. | Strategy execution recalculates the current historical bar; output remains one value per chart bar, not one value per OHLC tick. | `strategy.calc-on-every-history-tick-values`. | closed |
| `f1a1c6d5d3` color transparency precision | Runtime lane color tests. | TradingView color documentation: transparency is `0..100` mapped to alpha bytes; documented `color.new(color.olive, 40)` equivalence anchors conversion and fractional transparency preserves precision before byte rounding. | `priority.color-fractional-transparency-values`. | closed |

## Member And Diagnostic Fixes Retained From V3

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| Sized `array.new_*()` without `initial_value` fills with Pine `na` | Runtime lane array tests. | TradingView reference: typed array constructors' optional `initial_value` defaults to `na`; `array.get()` returns the stored element. | `array.new-default-na-values`. | closed |
| Collection sort order enums | Runtime lane array/matrix sort tests. | TradingView collection sort signatures accept `order.ascending` and `order.descending`; sorted output follows the requested order. | `array.sort-reverse-join-values`; matrix sort vectors. | closed |
| Modern-Pine `iff()` refusal | Checker tests. | TradingView migration documentation: `iff()` was removed and modern Pine uses the ternary conditional operator. | Semantic diagnostic tests derived from the migration rule. | closed |
| Table dimension fallbacks | Runtime approximation tests. | TradingView does not specify exact behavior for invalid dynamic dimensions; TealScript exposes the approximation instead of silently claiming parity. | `PINE_TRACE_REQUIRED_v2.md`; runtime approximation profile tests. | closed as bounded/trace-undetermined |
| Enum lowering guards | Runtime lane tests. | Pine enum constants are documented symbolic values; vectors assert their public identity and family-specific use. | enum constant vectors. | closed |
| `array.slice(from > to)` domain | Runtime lane domain test. | TradingView array slice uses a half-open range; descending ranges have no documented valid meaning and should fail loudly instead of producing plausible output. | `domain.array-slice-descending-range-rejection`; `pine-input-domain-map-v1.json`. | closed |
| Invalid TA lookback lengths | Runtime lane length tests. | TradingView FAQ/reference: TA lengths are positive integers; zero, negative, fractional and non-finite lengths must not silently normalize. | `244/244` invalid-length vectors. | closed |
| Swallowed Pine runtime errors | Runtime profile/error tests. | Pine-facing runtime error families and their triggering conditions must surface as script errors, not disappear into generated-code swallow paths. | Runtime error-boundary tests; classifier-before-swallow guard. | closed |

## Reuse Rule

New fixes should update this report only when they change the current open list
or add a closed/partial/open evidence row. Do not copy lane-owned regression
tests into the `External oracle` column; those belong in `Author evidence`.
A test that asserts current behavior is not an external oracle. A trace-required
or undocumented behavior should be marked as trace-shaped or bounded, not turned
into a guessed value oracle.
