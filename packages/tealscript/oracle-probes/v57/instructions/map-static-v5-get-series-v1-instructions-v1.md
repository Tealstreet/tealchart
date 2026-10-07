# map-static-v5-get-series-v1 instructions v1

Paste this exact source in TradingView Pine Editor as a separate indicator. Use BINANCE:BTCUSDT, 2-minute ordinary candles, UTC, at least 32 closed bars. Default settings; no inputs or libraries. Do not alter qualifiers or source bytes. Capture each script independently.

If Save/Add to chart refuses: screenshot the full exact compiler text, line/column and highlighted source; record symbol/timeframe and whether this is compile-time or runtime. A refusal in the simple script must not prevent capturing the series companion.

If it runs: export chart data CSV containing VALUE and BAR_INDEX, and screenshot the indicator/Data Window with the two named outputs visible. Record capture time and closed-bar count. If runtime errors occur, capture exact text and error bar before any partial CSV.

Question: does a v5 map.get on a literal-seeded map admit a series int destination? Compare the simple source's admission with its independently captured series control. Candidate answers: simple admits (static result may keep a weaker qualifier); simple refuses while series runs (series floor); both refuse (other native refusal, qualifier not settled). Runtime VALUE is a secondary control, not a qualifier inference. The const-destination facet is NOT measured by this pair. No candidate answer is presumed; native status UNOBSERVED, outcome UNSPECIFIED.

## Round v57 record

Source: `map-static-v5-get-series-v1.pine`; SHA256 `5f105e7656b2b186a4c2c9d42716788f1f27aa103e7a713e54e45fe3631b41cd`. Capture independently; preserve all source bytes and default inputs. Native phase and values are UNSPECIFIED. Record contrary values, zero, missing cells and refusals without editing the source. Hidden columns remain UNOBSERVED.

Runtime value alone does not establish qualifier. Both refusals can leave qualifier unsettled. Const destination remains unmeasured.

Return artifacts beneath `captures/v57/map-static-v5-get-series-v1/` and reference them in `captures/v57/RESPONSE-v57.md`. Include exact source hash, symbol/ticker modifiers, timeframe, chart type/timezone, input values, capture time, closed/realtime cutoff, raw CSV, diagnostics, settings and Data Window screenshot. Preserve request symbols such as REMOTE:ALT or REMOTE:VERIFY; unavailable-symbol diagnostics are outcomes, not permission to substitute a feed.
