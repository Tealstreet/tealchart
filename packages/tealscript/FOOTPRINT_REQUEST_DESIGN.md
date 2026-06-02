# Footprint Request Design

This note records the explicit deferral boundary for Pine v6
`request.footprint()` support. It is a parity target, but it should not be
implemented as a placeholder over normal OHLC bars.

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

Before runtime support lands, the host datafeed needs a footprint context with
at least:

- chart-bar timestamp and symbol/timeframe identity;
- rows ordered by price range;
- bid/sell volume, ask/buy volume, total volume, and delta per row;
- value-area classification for the requested percentage;
- imbalance classification for the requested percentage;
- stable row object IDs whose accessors are deterministic across historical and
  realtime recalculation;
- a missing-data result that maps to Pine `na`.

The runtime then needs first-class `footprint` and `volume_row` reference types,
the `footprint.*()` accessor namespace, the `volume_row.*()` accessor namespace,
and enforcement for the one-call-per-script limit.

## Current TealScript Behavior

`request.footprint()` is intentionally rejected with a specific diagnostic:

```text
request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model
```

This is preferable to returning synthetic data from OHLCV bars because Pine
footprint scripts reason about intrabar bid/ask volume distribution. Fake rows
would make order-flow indicators appear to work while producing misleading
outputs.

## Implementation Phases

1. Extend the request datafeed contract with footprint contexts and deterministic
   fixture builders.
2. Add parser/semantic coverage for `footprint` and `volume_row` reference
   types plus the associated accessor namespaces.
3. Implement `request.footprint()` with argument validation and one-call limit
   enforcement.
4. Implement deterministic footprint-row accessors and negative missing-data
   behavior.
5. Add reduced public-idiom fixtures for volume delta, value-area, and imbalance
   scripts.
