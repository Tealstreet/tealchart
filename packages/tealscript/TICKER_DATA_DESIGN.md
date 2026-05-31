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
- Request propagation by passing the resulting ticker ID string through the
  existing request datafeed contract.
- Deterministic Heikin-Ashi bar derivation in `InMemoryRequestDatafeed` when a
  matching base ticker context exists.

Regular session IDs normalize to the unmodified `PREFIX:TICKER` form. Extended
session IDs append a deterministic `|session=extended` suffix. This suffix is a
TealScript-internal fixture format, not a TradingView serialization contract.
Heikin-Ashi IDs append `|chart=heikinashi`; the in-memory fixture datafeed
derives synthetic OHLC using the standard recursive Heikin-Ashi formula.

## Later Scope

Future Epic 9 phases should add:

- `ticker.renko()`, `ticker.linebreak()`, `ticker.kagi()`, and
  `ticker.pointfigure()` once hosts can supply deterministic synthetic bars.
- Additional modifier parameters such as adjustment and settlement handling.
- Documentation for strategy/backtest caveats on synthetic chart data.
