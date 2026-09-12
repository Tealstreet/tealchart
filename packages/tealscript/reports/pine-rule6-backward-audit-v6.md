Superseded by `pine-rule6-backward-audit-v7.md`. Historical measurement only.

# Pine Rule 6 Backward Audit V6

Measurement commit: `f841cb16c5`.

Supersedes `pine-rule6-backward-audit-v5.md`.

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

## Local-Over-Builtin Resolver Audit

| Shape | External oracle | Artifact | Status |
| --- | --- | --- | --- |
| Root if-expression local declaration with history | Conditional structures, variable declarations and operators docs: branch-local `n` shadows any built-in fallback and `n[1]` reads local series history. | `language.root-if-local-shadows-builtin-history` in `pine-value-vectors-coverage-v167.json`. | closed by runtime merge; expected-red removed |
| Nested if-expression local declaration with history | Nested conditional local blocks return final expressions; local declaration scope controls `n[1]`. | `language.nested-if-local-shadows-builtin-history` in `pine-value-vectors-coverage-v167.json`. | closed by runtime merge; expected-red removed |
| One branch shadows a name while the other does not | Branch scopes resolve independently; a declaration shadows only inside its local block. | `language.if-branch-local-shadows-builtin-current` in `pine-value-vectors-coverage-v165.json`. | closed |
| Conditional declaration exists only on some bars | Executed branch-local declaration returns its local value; non-executed numeric branch returns `na`. | `language.conditional-local-shadows-builtin-current` in `pine-value-vectors-coverage-v165.json`. | closed |
| Block-local `var` shadows outer/built-in name | `var` persists in its declaration scope; block-local `var n` is distinct from outer `var n` or a built-in fallback. | `language.block-local-var-shadows-builtin-current` in `pine-value-vectors-coverage-v165.json`. | closed |

## Shared-Path Fixes Retained From V5

| Fix | Author evidence | External oracle | Artifact | Status |
| --- | --- | --- | --- | --- |
| Sparse UDF call-site history | Runtime lane tests. | TradingView UDF docs: every written call has independent history, and function-local series history is created through successive calls to that function; skipped bars do not add a function-history slot. | `language.sparse-udf-call-site-history`. | closed |
| Dynamic request loop scoping | Runtime lane tests. | TradingView dynamic request docs allow request contexts computed in loops; ordinary Pine lexical scoping resolves the loop-local `symbol` variable before any built-in alias. | `request.security-loop-local-symbol-values`. | closed |
| Block-local `var` name scoping | Runtime lane tests. | TradingView variable declaration docs: each local block has its own scope; `var` initializes once and persists for that scoped declaration, not an outer declaration with the same name. | `language.block-local-var-name-scope`. | closed |
| Generated history reference semantics | Runtime lane tests over generated histories. | Pine history operator documentation: unavailable offsets return `na`; history offsets are integer bar offsets; local series history must read the prior value of that series, not another series with the same name. | `language.global-history-offset-boundaries`; `language.dynamic-history-max-bars-back-na`; `language.collection-history-offset-boundaries`. | partial |
| Historical tick visual output replacement | Runtime lane tests for `calc_on_every_history_tick`. | Strategy execution recalculates the current historical bar; output remains one value per bar, not one value per OHLC tick. | `strategy.calc-on-every-history-tick-values`. | closed |

## Version Migration Rule Reds

Coverage v167 adds eight red-first version vectors derived from TradingView's
migration guides before parser-lane fixes:

- `version.v4-security-raw-lookahead-true`
- `version.v4-default-session-days-weekdays`
- `version.v4-strategy-exit-noop-allowed`
- `version.v4-offset-allowed`
- `version.v5-generic-input-type-rejected`
- `version.v5-global-sma-rejected`
- `version.v4-untyped-na-declaration-rejected`
- `version.v3-bool-to-number-rejected`

Each vector declares the version under test. These are parser-lane handoff
reds, not Rule 6 closures yet.

## Reuse Rule

New fixes should update this report only when they change the current open list
or add a closed/partial/open evidence row. Do not copy lane-owned regression
tests into the `External oracle` column; those belong in `Author evidence`.
A test that asserts current behavior is not an external oracle. A trace-required
or undocumented behavior should be marked as trace-shaped or bounded, not turned
into a guessed value oracle.
