# Request Datafeed Contract

This contract is the deterministic bridge for Pine `request.*` parity work. It
lets runtime tests provide alternate symbol/timeframe contexts without depending
on TradingView, a live exchange, or Tealchart networking during CI.

## Current Scope

The contract supports deterministic fixtures and the current same-symbol or
host-provided other-symbol `request.security()` MVP. Lower-timeframe arrays,
dynamic/nested requests, synthetic tickers, and external request families remain
out of scope until later Epic 8 and Epic 9 phases.

## Contract

Callers request bars with a stable key:

- `symbol`: Pine-style ticker identifier such as `BINANCE:BTCUSDT`.
- `timeframe`: Pine timeframe string such as `60`, `240`, or `1D`.
- `currency`: optional requested currency routing hint. The MVP passes this to
  the datafeed and request context metadata but does not perform conversion.
- `calcBarsCount`: optional tail-window hint matching Pine's
  `calc_bars_count` intent.

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

## Integration Path

The engine can accept an optional `RequestDatafeed` in a future PR. Tealchart can
then provide request contexts from its chart datafeed/cache while tests continue
to use `InMemoryRequestDatafeed`.

Worker protocol changes are intentionally deferred. Once runtime behavior is
stable, the worker can carry request metadata or host-provided datafeed handles
without changing the fixture-level contract.

## Non-Goals

This contract does not yet cover dynamic/nested requests, other-symbol routing,
lower-timeframe intrabar arrays, currency conversion, corporate actions,
economic data, or synthetic ticker construction. Those belong to later Epic 8
and Epic 9 phases.

## Test Strategy

Every request feature PR should include:

- deterministic local bars for each requested context;
- expected mapped outputs over chart bars;
- negative diagnostics for missing or invalid contexts;
- reduced Pine idiom fixtures where the behavior mirrors common public scripts.
