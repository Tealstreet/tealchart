# Ticker Data Design

This document tracks Pine `ticker.*` parity work. Ticker constructors create
opaque string IDs that scripts pass to `request.security()` and related
functions. The runtime treats those IDs as stable request datafeed keys; hosts
decide whether they can provide bars for each modified symbol.

## Current Scope

The current MVP supports session-specific ticker construction:

- `session.regular` and `session.extended` constants.
- `ticker.new(prefix, ticker, session?)`.
- `ticker.modify(tickerid, session?)`.
- `ticker.heikinashi(tickerid)`.
- `ticker.renko(tickerid, style, param, request_wicks?, source?)`.
- `ticker.linebreak(tickerid, number_of_lines)`.
- `ticker.kagi(tickerid, style, param)`.
- `ticker.pointfigure(tickerid, source, style, param, reversal)`.
- Request propagation by passing the resulting ticker ID string through the
  existing request datafeed contract.
- Deterministic Heikin-Ashi bar derivation in `InMemoryRequestDatafeed` when a
  matching base ticker context exists.

Regular session IDs normalize to the unmodified `PREFIX:TICKER` form. Extended
session IDs append a deterministic `|session=extended` suffix. This suffix is a
TealScript-internal fixture format, not a TradingView serialization contract.
Heikin-Ashi IDs append `|chart=heikinashi`; the in-memory fixture datafeed
derives synthetic OHLC using the standard recursive Heikin-Ashi formula.
Renko, Line Break, Kagi, and Point & Figure IDs append chart modifiers with
their constructor parameters. Unlike Heikin-Ashi, the in-memory datafeed does
not derive those synthetic bars; tests and hosts must provide exact fixture or
market-data contexts keyed by the constructed ticker ID.

## Later Scope

Future Epic 9 phases should add:

- Additional modifier parameters such as adjustment and settlement handling.
- Documentation for strategy/backtest caveats on synthetic chart data.
