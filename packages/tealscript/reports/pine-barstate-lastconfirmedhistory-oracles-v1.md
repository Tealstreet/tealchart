# Pine Barstate Last Confirmed History Oracles V1

Measurement commit: `0b1f0bfc48`.

## Summary

TradingView's bar-states documentation gives a historical-boundary rule that
does not require a realtime trace for its historical half:
`barstate.islastconfirmedhistory` is true on the dataset's last bar when the
market is closed, or on the bar immediately preceding the realtime bar when the
market is open. The same page states that `barstate.islastconfirmedhistory[1]`
detects the first realtime bar.

Coverage v169 adds three vectors derived from that rule:

| Case | Host shape | Expected result |
| --- | --- | --- |
| `runtime.barstate-lastconfirmedhistory-closed-market` | No realtime options. | Only the final historical bar has `islastconfirmedhistory`; no bar sees `islastconfirmedhistory[1] == true`. |
| `runtime.barstate-lastconfirmedhistory-realtime-last-only` | Host supplies only `realtimeLastBar`. | The bar immediately before the realtime last bar has `islastconfirmedhistory`; the realtime bar sees `islastconfirmedhistory[1]`. |
| `runtime.barstate-lastconfirmedhistory-realtime-segment` | Host supplies `confirmedRealtimeBarStartIndex` and `realtimeLastBar`. | The bar before the realtime segment is the only last-confirmed-history bar; the first realtime bar sees `islastconfirmedhistory[1]`, and elapsed realtime bars do not move the marker. |

All three pass on the compiled and public paths.

## Boundary

This closes the documented historical-boundary half of purchase 2. Repeated
same-timestamp realtime updates, rollback, and live `barstate.isnew` /
`barstate.isrealtime` transitions still require the realtime Pine Logs trace.

## Source

- TradingView Pine Script v6 Bar states:
  `https://www.tradingview.com/pine-script-docs/concepts/bar-states/`
