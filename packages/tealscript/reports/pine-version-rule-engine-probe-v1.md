# Pine Version Rule Engine Probe V1

Measurement commit: `601e8dfe9a`.

Scope: the 13 documented version changes missing from
`packages/tealscript/src/pineVersionRules.ts` in
`pine-version-rules-independent-audit-v1.md` were probed against the current
engine. Each probe used a script declaring the version named by TradingView's
migration guide and ran through parse, semantic check, compile and execution
where needed.

## Headline

| Outcome | Count | Meaning |
| --- | ---: | --- |
| Enforced correctly outside the table | 5 | Runtime/checker behavior matches the documented version edge, but the rule is not centralized. |
| Enforced wrongly | 4 | The engine has behavior for the rule, but it disagrees with the declared-version behavior. |
| Not enforced | 4 | The engine accepts a form the migration docs say should be rejected for that declared version. |

## Probe Results

| Rule | Probe | Result | Bucket |
| --- | --- | --- | --- |
| Lazy `and` / `or` evaluation in v6 | v6 `false and runtime.error(...)` and `true or runtime.error(...)` | Executes with no errors; plots `[0, 0, 0]` and `[1, 1, 1]`. Right operands are not evaluated. | enforced correctly outside table |
| v5 mandatory named constants for unique parameters | v5 `request.security(..., lookahead=true)`; v4 `security(..., lookahead=true)` | v5 rejects raw bool. v4 accepts it, but maps `true` to lookahead-off output `[null, null, 10, 10]` instead of lookahead-on `[10, 10, 20, 20]`. | enforced wrongly |
| v5 default session days | v5 and v4 `time(timeframe.period, "0930-1600", "UTC")` over Sunday plus weekdays | v5 includes Sunday as documented. v4 also includes Sunday; expected v4 weekday-only default would be `[0, 1, 1]`. | enforced wrongly |
| v5 `strategy.exit()` must do something | v5 and v4 `strategy.exit("x")` with no effectful parameters | v5 rejects correctly. v4 also rejects; expected v4 tolerated no-op exits. | enforced wrongly |
| v5 `iff()` removal | v5 `iff(...)`; v4 `iff(...)` | v5 rejects with migration diagnostic; v4 executes. | enforced correctly outside table |
| v5 `offset()` removal | v5 `offset(close, 1)`; v4 `offset(close, 1)` | v5 rejects as unknown function. v4 also rejects; expected v4 compatibility. | enforced wrongly |
| v5 split input type constants into typed functions | v5 `input(5, type=input.integer)`; v4 same | v5 executes and returns `5`; expected v5 rejection/directing to `input.int()`. v4 executes. | not enforced |
| v5 declaration parameter rename `resolution` -> `timeframe` | v5 `indicator(..., resolution="D")`; v4 `study(..., resolution="D")` | v5 rejects with rename hint; v4 accepts and records `timeframe: "D"`. | enforced correctly outside table |
| v5 namespace migration for built-ins | v5 `sma(close, 2)`; v4 same | v5 executes global `sma`; expected v5 to require `ta.sma()`. v4 executes. | not enforced |
| v4 explicit type required for `na` declarations | v4 `x = na`; v3 same | v4 executes and plots `na(x)` true; expected v4 rejection without explicit type/context. v3 executes. | not enforced |
| v4 built-in renames including `n` -> `bar_index` | v4 `plot(n)`; v3 same | v4 rejects unknown `n`; v3 executes `[0, 1, 2]`. | enforced correctly outside table |
| v3 `security()` lookahead default changed | v3 `security("TEST", "D", close)` with datafeed | Default output matches explicit lookahead-off `[null, null, 10, 10]`; explicit lookahead-on is `[10, 10, 20, 20]`. | enforced correctly outside table |
| v3 self/forward references and bool-to-number removal | v3 `plot(x); x = close` and v3 `(close > open) + 1` | Forward reference rejects unknown `x`; bool-to-number arithmetic executes `[1, 2, 2]` and should reject. | not enforced |

## Handoff Candidates

Wrongly enforced:

- v4 raw `security(..., lookahead=true)` accepts the syntax but treats `true` as
  lookahead-off instead of the v4 raw equivalent of lookahead-on.
- v4 bare session strings use v5+ all-days defaults instead of weekday-only
  defaults.
- v4 no-op `strategy.exit()` is rejected even though the v5 migration guide says
  the effectful-exit requirement was introduced in v5.
- v4 `offset()` is rejected even though the v5 migration guide lists it as a
  removed/replaced helper.

Not enforced:

- v5 generic `input(..., type=input.integer)` is still accepted.
- v5 global namespace aliases such as `sma()` are still accepted.
- v4 untyped `x = na` is still accepted.
- v3 bool-to-number arithmetic is still accepted.

Already enforced correctly but not centralized:

- v6 lazy `and`/`or`.
- v5 `iff()` removal.
- v5 `resolution`/`resolution_gaps` declaration rename.
- v4 `n` removal / `bar_index` rename.
- v3 `security()` default lookahead-off.
