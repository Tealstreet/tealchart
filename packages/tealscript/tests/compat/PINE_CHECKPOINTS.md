# Pine Checkpoint Sources

This file tracks real Pine idiom checkpoints that back the compatibility suite.
The tests must remain offline and deterministic: each checkpoint uses local bars,
small reduced scripts, and hand-checked expected outputs.

Do not paste large public scripts into this repository. Preserve the behavior
shape, cite the source or source-search context, and reduce the script to the
smallest fixture that proves the semantic contract.

## Official Documentation Checkpoints

| Fixture | Source | Reduced Contract | Expected Outputs |
| --- | --- | --- | --- |
| `Official Built-ins Checkpoint` | https://www.tradingview.com/pine-script-docs/language/built-ins/ | Namespace access through `ta.sma()` and comparison against a derived average. | Hand-checked SMA and boolean trend series over `compatibilityBars`. |
| `Official Array Checkpoint` | https://www.tradingview.com/pine-script-docs/concepts/bar-states/ and https://www.tradingview.com/pine-script-docs/language/arrays/ | `barstate.isfirst` guarded array initialization plus per-bar dynamic growth. | First close remains stable; array size increments deterministically. |
| `Official Barcolor Checkpoint` | https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/ | Inside/outside candle classification drives `barcolor()` output. | Explicit four-bar color sequence over local OHLC bars. |

## Public Idiom Checkpoints

| Fixture | Source Context | Reduced Contract | Expected Outputs |
| --- | --- | --- | --- |
| `Public MTF Trend Checkpoint` | https://www.tradingview.com/scripts/search/mtf%20trend%20filter/ | Local price filtered by a higher-timeframe moving average requested with `request.security()`. | HTF average merge series and local trend gate over local/request bars. |
| `Public Divergence Checkpoint` | https://www.tradingview.com/scripts/search/rsi%20divergence/ | Sequential price pivots compared with lower oscillator pivots to flag bearish divergence. | Pivot series and one bearish divergence signal over local bars. |
| `Public Session Filter Checkpoint` | https://www.tradingview.com/scripts/search/session%20filter/ | Session membership gates a raw signal. | Session mask and filtered signal over `compatibilityBars`. |

## Adding A Checkpoint

1. Link the source page or source-search context.
2. Reduce the script to the minimum semantic shape; do not copy large examples.
3. Use `compatibilityBars` or a local `Bar[]` declared in the test.
4. Assert concrete plots, drawings, alerts, inputs, strategy fields, or
   diagnostics.
5. Keep the expected output hand-checked and stable. Do not call TradingView,
   fetch live data, or depend on network access in CI.
