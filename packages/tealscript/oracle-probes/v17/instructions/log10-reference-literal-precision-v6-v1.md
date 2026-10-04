# Log10 reference literal precision v1

Paste the exact SHA-pinned indicator on standard BINANCE:BTCUSDT 2-minute candles. Keep Argument=1.75. Export every Data Window column and retain the selected input screenshot, first diagnostic/runtime error if any, and untouched CSV including blanks. No required execution origin; constants and arithmetic are stable on every bar. Preserve BAR_INDEX and TIME_MS to join observations. At least 100 historical rows before the live cutoff suffice.

Record REFERENCE_LITERAL, REFERENCE_SHORT, LOG10_VALUE and both scaled differences together. This distinguishes a log10 result difference from literal/subtraction behavior. A and B distinguish integer-fraction/decimal-scale parsing from fixed16-decimal-place rounding; B_SCI separately controls scientific notation. LOG_REFERENCE_LITERAL/LOG_RESIDUAL retain the captured natural-log comparison.

Native outcomes are UNOBSERVED. No literal parsing, rounding or subtraction model is promoted by this probe. Retain full precision CSV strings and avoid interpreting rounded chart labels as binary64 values.
