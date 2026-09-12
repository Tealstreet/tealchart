> Superseded by pine-value-vectors-adjudication-v3.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Adjudication v2

## Warm-up Evidence

The previous adjudication of `ta.highest` and `ta.lowest` is independently
confirmed by two official TradingView v6 documentation statements:

- [Execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/): “The first 19 bars of the chart have a plotted value of `na`” for the `ta.highest(high, 20)` example. The same example plots `ta.lowest(low, 20)` from the identical current-plus-19-history window.
- [Time series](https://www.tradingview.com/pine-script-docs/language/time-series/): the `ta.sma(close, 20)` call “returns the average of the latest 20 close values as of the current bar, or `na` if fewer than 20 bars are available.”

Therefore the length-3 vector must contain exactly two leading `na` values for
both extrema functions, matching the corrected oracle and the current runtime
fix. The earlier partial-window oracle was wrong; the original engine output
was wrong; the current `23/23` TA vector result is consistent with the v6
warm-up rule.

The v6 reference does not provide a separate prose equation for the EMA seed;
that case remains governed by the Pine series convention recorded in
[adjudication v1](./pine-value-vectors-adjudication-v1.md), not by the rolling
window rule above.
