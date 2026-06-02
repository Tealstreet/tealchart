# Request Datafeed Contract

This contract is the deterministic bridge for Pine `request.*` parity work. It
lets runtime tests provide alternate symbol/timeframe contexts without depending
on TradingView, a live exchange, or Tealchart networking during CI.
`request.footprint()` is tracked separately in
[`FOOTPRINT_REQUEST_DESIGN.md`](./FOOTPRINT_REQUEST_DESIGN.md) because it
requires intrabar volume-row data rather than OHLC/request-series fixtures.

## Current Scope

The contract supports deterministic fixtures, same-symbol or host-provided
other-symbol `request.security()` requests,
`request.security_lower_tf()` intrabar arrays, and Pine v6 dynamic request
behavior for supported `request.security*` calls. It also supports
fixture-backed `request.currency_rate()`, corporate action point series,
financial/economic point series, and deterministic `request.seed()` contexts.
The dynamic MVP enables local scope and nested supported requests by default,
while rejecting those forms when scripts explicitly set
`dynamic_requests=false`. Full simple/series qualifier analysis remains owned
by the qualified type-system epic. Synthetic ticker identifiers from Epic 9
flow through this same request key contract.

## Contract

Callers request bars with a stable key:

- `symbol`: Pine-style ticker identifier such as `BINANCE:BTCUSDT`.
- `timeframe`: Pine timeframe string such as `60`, `240`, or `1D`.
- `currency`: optional requested currency routing hint. The MVP passes this to
  the datafeed and request context metadata but does not perform conversion.
- `calcBarsCount`: optional tail-window hint matching Pine's
  `calc_bars_count` intent.

Callers request scalar series with:

- `family`: the external series family. The current MVP supports
  `currency_rate`.
- `key`: a stable family-specific key. Currency rate keys use
  `{fromCurrency}\0{toCurrency}`.

The datafeed returns a discriminated result:

- `ok: true` with a cloned `RequestDataContext` containing bars and optional
  `syminfo` / `currency` metadata.
- `ok: false` with a non-throwing error code and message.

Supported error codes are:

- `missing_context`: no fixture or host context exists for the requested key.
- `invalid_symbol`: the host rejected a symbol before lookup.
- `invalid_timeframe`: the host rejected a timeframe before lookup.
- `unsupported_context`: the host recognizes the request but cannot supply that
  data family.

The in-memory fixture implementation clones bars on write and read so tests
cannot accidentally share mutable bar state across contexts.
It also clones scalar series points for external request fixtures.

For synthetic ticker fixtures, the in-memory datafeed derives Heikin-Ashi bars
when a matching base context exists. Other non-standard chart contexts, such as
Renko, Line Break, Kagi, and Point & Figure, must be provided by the host or
test fixture under the constructed ticker ID.

## `request.security()` MVP

The current runtime implementation supports same-symbol and host-provided
other-symbol higher-timeframe requests.

1. Resolve the requested data context from the datafeed using
   `{ symbol, timeframe, calcBarsCount }`.
2. Evaluate the requested expression in that context with isolated series
   history and symbol/timeframe metadata.
3. Map requested-context values back to the chart bars by time.
4. Implement `gaps`, `lookahead`, `ignore_invalid_symbol`, and
   `calc_bars_count` semantics with deterministic fixtures.
5. Preserve repaint-safe higher-timeframe behavior in reduced Pine idiom tests.

## `request.security_lower_tf()` MVP

The current runtime implementation supports deterministic lower-timeframe
requests that return Pine arrays of expression values for each chart bar.

1. Resolve the requested lower-timeframe context from the datafeed using
   `{ symbol, timeframe, calcBarsCount, currency }`.
2. Reject equal or higher requested timeframes unless
   `ignore_invalid_timeframe=true`, matching Pine's lower-timeframe-only
   contract.
3. Evaluate the requested expression in the lower-timeframe context with
   isolated series history and symbol/timeframe metadata.
4. Collect all requested bars whose timestamps fall inside the current chart bar
   interval and return their values as a Pine array ordered from earliest to
   latest.
5. Support `ignore_invalid_symbol`, `currency`, and `calc_bars_count` routing
   hints with deterministic fixtures.

## Dynamic Requests MVP

Pine v6 enables dynamic requests by default. The current runtime follows that
default and supports request calls in local scopes plus nested request execution
for supported `request.security*` calls. When scripts explicitly set
`dynamic_requests=false` in `indicator()`, the runtime rejects:

- supported `request.*` calls in conditional/loop local scopes;
- supported `request.*` calls in conditional-expression and `and`/`or`
  operands;
- nested supported `request.*` execution inside a requested context.

This MVP does not yet implement Pine's full simple/series qualifier analysis for
request parameters. That belongs to the qualified type-system epic.

## Point-Series Request MVP

The current runtime implementation supports deterministic point series supplied
by the request datafeed for:

- `request.currency_rate()`
- `request.dividends()`
- `request.earnings()`
- `request.splits()`
- `request.financial()`
- `request.economic()`

Currency conversion series use the following behavior:

1. Resolve `{ from, to }` currency codes and return `1` when both currencies
   match.
2. Request fixture points from the `currency_rate` series family using a stable
   from/to key.
3. Merge the latest point at or before the current chart bar time.
4. Support `ignore_invalid_currency=true` for missing or invalid fixture
   contexts.
5. Provide common `currency.*` constants used by public Pine examples.

Corporate action, financial, and economic series use stable family-specific
keys and the same latest-point merge rule. `gaps=barmerge.gaps_on` keeps point
events sparse, while the default mode carries the latest known value forward.
`lookahead_on` is still rejected for these point-series families because Pine's
future event behavior needs a dedicated repaint-safety pass.

## `request.seed()` MVP

The current runtime implementation supports deterministic seed contexts without
fetching GitHub data at runtime.

1. Resolve `{ source, symbol }` into an opaque seed-backed request symbol.
2. Evaluate the expression against host-provided seed bars using the same
   isolated request-context execution path as `request.security()`.
3. Support `ignore_invalid_symbol` and `calc_bars_count` with deterministic
   fixtures.

## Integration Path

The engine accepts an optional `RequestDatafeed` through
`TealscriptEngineOptions`. Tealchart or another host can provide request
contexts from its chart datafeed/cache while tests continue to use
`InMemoryRequestDatafeed`.

Worker protocol changes are intentionally deferred. Once runtime behavior is
stable, the worker can carry request metadata or host-provided datafeed handles
without changing the fixture-level contract.

## Non-Goals

This contract does not yet cover full simple/series qualifier diagnostics,
provider-side fetching for host data, `request.footprint()` data, or
strategy/backtest execution over synthetic ticker data. Those belong to the
qualified type-system epic, the footprint design, and Epic 14.

## Test Strategy

Every request feature PR should include:

- deterministic local bars for each requested context;
- expected mapped outputs over chart bars;
- negative diagnostics for missing or invalid contexts;
- reduced Pine idiom fixtures where the behavior mirrors common public scripts.

The compatibility suite includes reduced higher-timeframe repaint fixtures based
on TradingView's documented pattern of using `lookahead=barmerge.lookahead_on`
with an expression history offset such as `close[1]`. Those tests intentionally
compare the future-leaking unoffset series with the confirmed-only offset series
so later request-engine changes cannot silently regress the no-repaint idiom.
