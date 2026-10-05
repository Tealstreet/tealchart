# Context acquisition v1

Exact requested5m/15m OHLC/time datasets and nested transport missing. Chart2m OHLC and native INNER/OUTER/DIRECT alone cannot construct the requested feed.

Export unchanged source on BTCUSDT2m, then5m and15m across the same interval. Preserve raw time/OHLC, dataset starts, chart settings, sourceSHA and historical cutoff for each. Capture requested5m/15m history covering every evaluated2m bar. Never synthesize requested prices from chart2m. Record exact symbol/session/adjustments. Preserve errors verbatim. Companion data establishes only this recorded context.

Expected phase/values: UNSPECIFIED for supplemental facets. Existing observations remain separate; no universal closure.
