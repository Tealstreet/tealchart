# Statistical moments native discriminator v1

One numeric CSV probe: `statistical-native-moments-order-v1.pine`,60 unique data-window columns, precision16. This exposes native means of both source and source-squared, native sums, and native population/sample variance and standard deviation for close lengths2/3/7/14/31 and translated binary-exact wave length14.

Capture BINANCE:BTCUSDT /2-minute /standard candles /UTC, unchanged defaults, all available history beginning at `input_bar_index=0`; minimum512 historical bars. Remove the previous indicator, reset/re-add this entire source, and export all60 indicator columns. Preserve exact native diagnostics if refused; do not alter source. Record the live cutoff and setup/reset/export times. Save under `captures/v4/statistical-native-moments-order-v1-attempt<N>.csv`.

No numerical prediction is asserted. On each matched historical row, compare variance with `square_mean - mean*mean`, standard deviation with `sqrt(max(0,variance))`, and sample scaling separately. Include cases of negative raw moment estimates and translated cancellation; never replace missingness with zero. Check `sum / length == mean` independently for source and source-squared. These observed components distinguish accumulator precision from the variance formula; the existing v2 probe does not expose the native source-squared mean.

Column order/source SHA: adjacent `.columns.json`. Synthetic wave inputs repeat every33 chart bars and remain binary-exact. Repeated identical windows with different results identify state/history effects, not a mathematical definition difference. Local execution is an instrumentation gate only; it cannot settle the native algorithm.
