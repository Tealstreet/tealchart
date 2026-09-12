# Pine Manual-Silence Refusal Audit v1

Date: 2026-09-11

Measurement commit: `fc3dabb20b47`

Prompt: after `pine-v6-accepted-surface-usage-priority-v1` found that 123 of
167 manual-absent accepted-surface rows are used by real corpus scripts, audit
whether any TealScript refusals introduced today rest only on manual silence.

Rule used here: a refusal stands only when it has corroborating evidence beyond
"the v6 manual/signature snapshot does not list it." If the only evidence is
manual silence, the construct belongs in `pine-compile-evidence-request-v1.md`
instead of in a checker/runtime rejection.

## Result

No live source-acceptance refusal found in this pass rests only on manual
silence.

One compile-evidence row was already the right place for an unsettled
manual-silence-adjacent question: Q3F,
`request.security(..., lookahead = condition ? barmerge.lookahead_on : na)`.
This report corrects that paste-ready snippet from `//@version=5` to
`//@version=6` because the row it settles is v6 `0368`.

## Audited Decisions

| Surface | Current behavior | Corroborating evidence beyond manual silence | Verdict |
| --- | --- | --- | --- |
| Dynamic `request.*` calls and wrapper functions | v3-v5 allow non-exported request wrappers and global conditional request operands without `dynamic_requests=true`; v6 requires `dynamic_requests=true` for wrapped requests invoked from local blocks, and explicit `dynamic_requests=false` stays strict. | Version rules are encoded in `src/pineVersionRules.ts`; `CLAUDE.md` records the v3-v5/v6 split; regression coverage checks declared-version behavior in `src/runtime/codegen/execute.test.ts`. | Stands. This is a versioned rule, not a manual-silence-only rejection. |
| Runtime-series-computed `barmerge` gaps/lookahead modes | Rejects series-dependent `gaps`/`lookahead`; accepts direct `barmerge.*` constants, legacy v4 boolean `security()` switches, and non-series conditionals selecting between allowed constants. | `CLAUDE.md` records the qualifier rule and the TradingView-published accepted forms. `checker.test.ts` has both rejection coverage for series-computed modes and acceptance coverage for official-style wrappers that choose constants from a simple/input value. | Stands for series-computed modes. The unsettled `na` fallback ternary is already Q3F in the compile-evidence request. |
| Legacy visual `transp` in v6 | Most v6 visual calls reject `transp`; v6 `bgcolor` compatibility is accepted; v3-v5 legacy forms are accepted with compatibility diagnostics. | This is a version-migration rule in `pineVersionRules.ts` and `CLAUDE.md`, not a manual-absence-only rule. The implementation also keeps the known `bgcolor` compatibility carve-out instead of uniformly rejecting. | Stands. No additional compile-evidence row from this audit. |
| Color channel/runtime color questions | Color construction and channel extraction are accepted; uncertain value details are kept as value-vector/trace questions, not source refusals. | `CLAUDE.md` records the `color(...)` overload split and tests cover `color.rgb`, `color.r/g/b/t`, `color.new`, and `color.from_gradient` value behavior. | Not a refusal. Keep value uncertainty in trace/vector work rather than compile evidence. |
| `array.slice(id, from, to)` | Accepts the call shape and `from == to` empty slices. Runtime rejects `from > to`, non-finite indices, and out-of-bounds slices. | `CLAUDE.md` records that `from == to` is accepted and only `from > to` is an invalid range; runtime tests cover the empty-slice value path and descending-range runtime error. This is runtime behavior, so compile acceptance would not settle it. | No compile-stage over-refusal. Runtime/value exactness remains trace/vector-owned if challenged. |
| `table.new()` dimensions | The checker accepts numeric `columns`/`rows`; runtime falls back to 1 and records an approximation when dynamic invalid dimensions are non-positive or non-finite, then enforces the table cell capacity limit. | `CLAUDE.md` says `positiveInteger()` only feeds `table.new()` columns/rows and to treat that as a one-off. Runtime approximation reporting explicitly says exact TradingView behavior for dynamic invalid table dimensions is trace-required. | Not a compile refusal. The remaining uncertainty is runtime/value behavior, not manual-silence acceptance. |
| `map.put()` | Accepted by name and position, including named-prefix-with-positional forms. Type mismatches and bad argument names still reject. | The v6 manual snapshot includes `map.put`; checker/runtime tests cover accepted binding, type mismatch, and invalid argument names. The user-mentioned uncertainty is value/behavior, not source acceptance. | Not a manual-silence refusal. |
| `strategy(calc_on_order_fills=true)` | The checker currently reports a trace-required diagnostic for `true`. | This is not manual silence: the argument is documented in the signature table. The refusal is a deliberate runtime-parity guard because fill-triggered strategy re-entry is trace-required. Compile evidence would only confirm TradingView accepts the flag; it would not settle execution parity. | Out of scope for this audit; leave to trace/runtime parity policy. |

## Follow-up

The manual-signature snapshot should remain an oracle when it speaks, but manual
silence should not be used as negative evidence. This audit found no extra
manual-silence-only source refusal to move into the compile-evidence request.
Q3F remains the only current source-acceptance question from this pass.
