# round-negative-half-ties-v41-v1 capture instructions v1

Question: For exactly representable negative half ties, does math.round follow reference ties-up prose or the previously captured away-from-zero rule? Compare integer and decimal precision independently.

Compile this exact source independently in TradingView Pine v6. Keep the source and default inputs unchanged. Use BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, at least 32 closed historical bars. Record symbol, timeframe, syminfo.mintick, chart timezone, Pine build/account, inputs, and attempted source SHA256. No Bar Replay or live ticks required.

If it compiles and runs, export public chart CSV with time/OHLCV and every named column: Const_negative_half, Const_negative_one_half, Series_negative_one_half, Positive_one_half_control, Negative_precision_two, Named_negative_precision_two, Positive_precision_two_control, Negative_non_tie_control. Include the Data Window and relevant input/style screenshot. Preserve raw numeric strings and empty cells; do not infer hidden digits from display rounding. Record whether the constrained declaration or linewidth consumer was accepted.

If compilation or runtime refuses it, save the earliest full diagnostic code/text/line/column and screenshot, with attempted source SHA256. Do not remove the consumer or repair the source. Its refusal leaves numeric outputs UNOBSERVED; the separate numeric source still runs independently. An unavailable export is not a compiler refusal.

Native phase and values are UNSPECIFIED. Prior captures and local preflight are provenance, not predicted outcomes. This source settles only its exact v6 consumer/numeric facets, not all versions or arbitrary precision. Return artifacts beneath v41/captures/v41/ and index them in RESPONSE-v41.md.
