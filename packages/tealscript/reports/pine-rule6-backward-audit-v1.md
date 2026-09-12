> Superseded by pine-rule6-backward-audit-v2.md. Historical measurement only; use the superseding report for current open verifications.

# Pine Rule 6 Backward Audit V1

Measurement commit: `b9b0f66a83`.

Rule 6 requires a fix oracle to come from outside the fix source: published
formula, reference composition, manual-specified result, hand-derived
arithmetic, or trace.

## Closed

- Operator precedence `a == b > c`: closed by the Pine operator precedence
  ladder and AST/value invariant checks. Equality binds below relational
  comparisons.
- Semantic string concatenation and series/reference retention: closed by Pine
  operator, type-system, qualifier and reference-type rules.
- TA invalid length coercion: closed by `244/244` rejection vectors derived from
  the documented positive-integer length requirement.
- Seven swallowed Pine errors: closed for surfacing/classification. The tests
  execute the error conditions and assert the runtime profile or error boundary;
  message families are Pine-facing documented runtime failures.
- Partial-exit `strategy.position_avg_price`: closed by a hand-derived
  multi-entry partial-exit cost-basis vector.
- Nested optimized `ta.sma(...)` source ordering: closed by a formula-derived
  nested-SMA vector.
- `ta.mfi` clean-data arithmetic: closed by `ta.mfi.clean-typical-price-values`,
  derived from `hlc3` and signed source-volume money flow over the window.

## Partial

- AST block-boundary behavior: partially closed. `language.block-boundary-unary-return-values`
  and `language.block-boundary-for-body-values` pass against documented UDF,
  unary operator, loop and indentation semantics. `language.block-boundary-switch-nested-if-values`
  is a new expected-red: a selected switch arm returning a nested `if` expression
  currently produces `na` where the documented selected branch value is `7` or
  `5`.
- Native `plotshape` / `plotchar`: partially closed. Native now has direct
  assertions for documented marker semantics: non-`na` series emits, `color=na`
  hides the marker while preserving text, and `plotchar` emits its supplied
  glyph. Pixel-exact placement, glyph metrics and visual styling remain
  unclosed without a TradingView visual trace.

## Still Open

- `ta.mfi` interior-`na` seed, hole and recovery policy: still trace-required.
  The clean arithmetic and range invariant are closed; hole behavior is not.
