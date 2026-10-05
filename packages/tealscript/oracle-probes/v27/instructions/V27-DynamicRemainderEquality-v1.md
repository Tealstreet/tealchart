# V27 V27-DynamicRemainderEquality-v1 v1

Ranks: 1630, 1631, 1644. Native expected phase and values: UNSPECIFIED.

Question: How do v6 series-valued signed/fractional remainders and %= select results, and where does == switch on a +/-5e-10 grid?

Use exact source bytes on BINANCE:BTCUSDT, 2-minute candles, display zone Etc/UTC. Retain at least96 historical bars. Record source SHA256, symbol/exchange/timeframe/timezone, all input values, loaded chart range and indicator version. Export all named plots with time/OHLC. Keep initial rows; they distinguish initialization and sparse history. Do not shorten the CSV to the visible viewport or change code to force a result.

Record compile/runtime outcome first, including exact native code/text/line/column and failing bar if present. If it runs, export every column; if it fails, retain the complete diagnostic and screenshot rather than substituting NA cells. A failure in one source must not suppress capture of the other two sources.

Prior V7 negative-remainder-v6-v1 tests only const integer -5/3 and %=; this source changes operand values each bar, includes fractional/large operands, and exports inputs plus competing floor/truncation calculations. They are observational controls, not assertions about the native result. Equality has its own eleven-point per-bar delta grid plus const/series sum controls.

Capture a settings screenshot and indicator data-window screenshot. Keep chart source/history fixed across input variants. No Pine source edits between variants.

Scope limits: V6 finite nonzero divisors only. No zero-divisor, v5 const arithmetic or arbitrary precision/kernel closure. Equal rounded CSV inputs alone cannot settle hidden-input-bit equivalence.

Authority candidates: https://www.tradingview.com/pine-script-docs/language/operators/; https://www.tradingview.com/pine-script-reference/v6/#op_%; https://www.tradingview.com/pine-script-reference/v6/#op_==. These are the question's provenance, not a prediction of TV behavior.
