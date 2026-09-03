# Footprint Request Design

This note records the remaining boundary for Pine v6 `request.footprint()`
support. The request itself routes through the host request datafeed seam, but
footprint objects and row accessors should not be faked over normal OHLC bars.

Sources:

- TradingView Pine Script v6 Reference Manual:
  <https://www.tradingview.com/pine-script-reference/v6/#fun_request.footprint>
- TradingView Pine Script limitations:
  <https://www.tradingview.com/pine-script-docs/writing/limitations/>

## Pine Shape

`request.footprint(ticks_per_row, va_percent, imbalance_percent)` returns a
`footprint` object ID for the current chart bar, or `na` when footprint data is
not available. Scripts then use the `footprint.*()` and `volume_row.*()`
namespaces to inspect volume rows, value area, categorized volume, delta, and
buy/sell imbalance state.

The public Pine contract has important constraints:

- `ticks_per_row` is a simple integer row-size argument expressed in ticks.
- `va_percent` and `imbalance_percent` are optional simple numeric settings.
- TradingView limits scripts to a single `request.footprint()` call.
- Availability is account/data-feed gated.

## Required TealScript Model

The host datafeed provides a footprint context with at least:

- chart-bar timestamp and symbol/timeframe identity;
- rows ordered by price range;
- bid/sell volume, ask/buy volume, total volume, and delta per row;
- value-area classification for the requested percentage;
- imbalance classification for the requested percentage;
- stable row object IDs whose accessors are deterministic across historical and
  realtime recalculation;
- a missing-data result that maps to Pine `na`.

The runtime still needs first-class `footprint` and `volume_row` reference
types, the `footprint.*()` accessor namespace, the `volume_row.*()` accessor
namespace, and enforcement for the one-call-per-script limit.

## Current TealScript Behavior

`request.footprint()` accepts positional and named v6 arguments in the
interpreter and compiled path. It resolves seeded footprint contexts through
`RequestDatafeed.getFootprint()` and returns Pine `na` when no context is
available.

The returned value is currently only a data-availability sentinel. TealScript
does not synthesize footprint rows from OHLCV bars because Pine footprint
scripts reason about intrabar bid/ask volume distribution. Fake rows would make
order-flow indicators appear to work while producing misleading outputs.

## Implementation Phases

1. [x] Extend the request datafeed contract with footprint contexts and deterministic
   fixture builders.
2. Add parser/semantic coverage for `footprint` and `volume_row` reference
   types plus the associated accessor namespaces.
3. [x] Implement `request.footprint()` argument validation and provider-backed
   missing-data behavior.
4. Implement one-call limit enforcement.
5. Implement deterministic footprint-row accessors and negative missing-data
   behavior.
6. Add reduced public-idiom fixtures for volume delta, value-area, and imbalance
   scripts.
