# Ticker Data Design

This document tracks Pine `ticker.*` parity work. Ticker constructors create
opaque string IDs that scripts pass to `request.security()` and related
functions. The runtime treats those IDs as stable request datafeed keys; hosts
decide whether they can provide bars for each modified symbol.

## Current Scope

The current MVP supports session-specific ticker construction and deterministic
modifier propagation through `request.security()`:

- `session.regular` and `session.extended` constants.
- `adjustment.none`, `adjustment.splits`, and `adjustment.dividends`
  constants.
- `backadjustment.on`, `backadjustment.off`, and `backadjustment.inherit`
  constants.
- `settlement_as_close.on`, `settlement_as_close.off`, and
  `settlement_as_close.inherit` constants.
- `ticker.new(prefix, ticker, session?, adjustment?, backadjustment?,
  settlement_as_close?)`.
- `ticker.modify(tickerid, session?, adjustment?, backadjustment?,
  settlement_as_close?)`.
- `ticker.standard(tickerid)`.
- `ticker.inherit(from_tickerid, symbol)`.
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
session IDs append a deterministic `|session=extended` suffix. Split/dividend
adjusted IDs append `|adjustment=splits` or `|adjustment=dividends`.
Back-adjusted IDs append `|backadjustment=on` or `|backadjustment=off`.
Settlement-as-close IDs append `|settlement_as_close=on` or
`|settlement_as_close=off`. The `inherit` constants leave the corresponding
modifier unchanged or absent. These suffixes are
TealScript-internal fixture formats, not a TradingView serialization contract.

`ticker.standard()` strips TealScript ticker modifiers and returns the base
`PREFIX:TICKER` form. `ticker.inherit()` copies all modifiers from
`from_tickerid` to another symbol's base ticker, including session,
adjustment, back-adjustment, settlement-as-close, and chart modifiers.

Heikin-Ashi IDs append `|chart=heikinashi`; the in-memory fixture datafeed
derives synthetic OHLC using the standard recursive Heikin-Ashi formula while
preserving non-chart modifiers when locating the base ticker context.
Renko, Line Break, Kagi, and Point & Figure IDs append chart modifiers with
their constructor parameters. Unlike Heikin-Ashi, the in-memory datafeed does
not derive those synthetic bars; tests and hosts must provide exact fixture or
market-data contexts keyed by the constructed ticker ID.

## Synthetic Strategy And Backtest Caveats

Epic 9 supports indicator-style synthetic data requests. It does not implement
Pine strategy backtesting on synthetic chart feeds. Until strategy parity lands:

- `strategy.*` order placement, fills, positions, trades, and broker-emulator
  outputs remain unsupported regardless of ticker type.
- `ticker.heikinashi()`, `ticker.renko()`, `ticker.linebreak()`,
  `ticker.kagi()`, and `ticker.pointfigure()` are safe for deterministic
  indicator calculations only when the request datafeed can provide the
  requested context.
- Heikin-Ashi fixture data is locally derived for indicator tests; it should not
  be treated as executable market price data for order-fill simulation.
- Renko, Line Break, Kagi, and Point & Figure fixture data is host supplied.
  The runtime does not synthesize bricks/lines/reversals, so future strategy
  support must define whether fills use synthetic OHLC, underlying market OHLC,
  or a host-provided execution feed.
- Back-adjustment, settlement-as-close, and corporate-action adjustments are
  currently opaque request modifiers. Hosts decide whether the resulting bars
  are adjusted; the runtime does not adjust fills, PnL, or cash ledgers.

These caveats intentionally keep ticker constructors decoupled from strategy
semantics. Epic 14 owns broker-emulator behavior and should revisit synthetic
chart execution before enabling backtests over non-standard ticker IDs.
