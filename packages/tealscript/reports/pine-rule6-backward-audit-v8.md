# Pine Rule 6 Backward Audit V8

Measurement commit: `0b1f0bfc48`.

Supersedes `pine-rule6-backward-audit-v7.md`.

Rule 6 requires a fix oracle to come from outside the fix source: published
formula, reference composition, manual-specified result, hand-derived
arithmetic, or trace. Self-consistency checks and fixer-owned regression tests
are author evidence, not closed verification.

Related entry points:

- Overall parity state and operating rules: `../PINE_PARITY_STATE.md`
- Corpus acceptance and reconstruction: `../PINE_CORPUS_BRIEFING.md`
- Corpus-ranked build targets: `pine-corpus-priority-queue-v1.md`
- TradingView-terminal work: `pine-tradingview-terminal-queue-v1.md`

## Current Open Verifications

| Item | Status | What closes it |
| --- | --- | --- |
| `language.switch-arm-arrow-continuation-values` | open expected-red, parser-owned | Parser fix confirmed by the existing value vector derived from documented switch arm and line-wrapping semantics. |
| `ticker.kagi-two-argument-values` | open expected-red, parser/semantic-owned | Fix confirmed by the existing value vector derived from documented `ticker.kagi(symbol, reversal)` semantics. |
| `priority.visual-output-metadata-values` | open expected-red, runtime-owned | Runtime fix confirmed by the existing vector derived from documented legacy `bgcolor(transp=...)` transparency semantics. |
| `host-default.chart-fg-color-light-background` | open expected-red, runtime-owned | Runtime fix confirmed by the existing vector derived from documented `chart.fg_color` contrast values for light and dark chart backgrounds. |
| `version.v4-security-raw-lookahead-true` | open expected-red, parser-owned | Parser/checker fix confirmed by the existing vector derived from the v5 migration guide's named-constant change. |
| `version.v4-default-session-days-weekdays` | open expected-red, parser-owned | Parser/runtime rule fix confirmed by the existing vector derived from the v5 migration guide's session day default change. |
| `version.v4-strategy-exit-noop-allowed` | open expected-red, parser-owned | Checker fix confirmed by the existing vector derived from the v5 migration guide's effectful `strategy.exit()` requirement. |
| `version.v4-offset-allowed` | open expected-red, parser-owned | Checker/runtime fix confirmed by the existing vector derived from the v5 migration guide's `offset()` removal. |
| `version.v5-generic-input-type-rejected` | open expected-red, parser-owned | Checker fix confirmed by the existing vector derived from the v5 migration guide's typed-input split. |
| `version.v5-global-sma-rejected` | open expected-red, parser-owned | Checker fix confirmed by the existing vector derived from the v5 migration guide's namespace migration. |
| `version.v4-untyped-na-declaration-rejected` | open expected-red, parser-owned | Checker fix confirmed by the existing vector derived from the v4 migration guide's typed-`na` declaration rule. |
| `version.v3-bool-to-number-rejected` | open expected-red, parser-owned | Checker fix confirmed by the existing vector derived from the v3 migration guide's bool-to-number removal. |
| `strategy.calc-on-order-fills-values` | open expected-red, trace-shaped | TradingView trace or documented fill-trigger re-entry model; do not infer from historical bars. |
| `ta.mfi` interior-`na` seed/hole/recovery | open, trace-required | Purchase one TA-hole trace covering `ta.mfi`, or published documentation that specifies hole recovery. Clean arithmetic and bounds are already closed. |
| Native `plotshape`/`plotchar` pixel placement, glyph metrics and styling | open, trace-required | TradingView visual trace or screenshot-level evidence for pixel placement and glyph/style behavior. Documented marker presence semantics are already closed. |

## Closed External Oracles

| Item | External oracle | Artifact | Status |
| --- | --- | --- | --- |
| `language.root-if-local-shadows-builtin-history` | Conditional structures, variable declarations and operators docs: branch-local `n` shadows any built-in fallback and `n[1]` reads local series history. | `pine-value-vectors-coverage-v168.json` | closed by runtime merge; expected-red removed |
| `language.nested-if-local-shadows-builtin-history` | Nested conditional local blocks return final expressions; local declaration scope controls `n[1]`. | `pine-value-vectors-coverage-v168.json` | closed by runtime merge; expected-red removed |
| `language.global-history-offset-boundaries` | Pine history operator documentation: unavailable offsets return `na`; local series history reads the prior value of that series. | `pine-value-vectors-coverage-v168.json` | closed before V168; no longer expected-red |
| `barstate.islastconfirmedhistory` historical boundary | TradingView bar-states docs: on closed markets it is true on the dataset last bar; on open markets it is true on the bar immediately preceding the realtime bar; `barstate.islastconfirmedhistory[1]` detects the first realtime bar. | `pine-value-vectors-coverage-v169.json` | closed by `runtime.barstate-lastconfirmedhistory-*` vectors across historical-only, realtime-last-only, and multi-bar realtime segment options |

## Host-Default Audit

Coverage v168 adds five host-default vectors. Four are shape-only and green:
`host-default.syminfo-shape`, `host-default.timeframe-shape`,
`host-default.chart-shape`, and `host-default.session-shape`. Exact
symbol/timeframe/chart/session values remain host- or trace-bound unless the
docs specify a derivation. The one value red is
`host-default.chart-fg-color-light-background`.

## Reuse Rule

New fixes should update this report only when they change the current open list
or add a closed/partial/open evidence row. Do not copy lane-owned regression
tests into the `External oracle` column; those belong in `Author evidence`.
A test that asserts current behavior is not an external oracle. A trace-required
or undocumented behavior should be marked as trace-shaped or bounded, not turned
into a guessed value oracle.
