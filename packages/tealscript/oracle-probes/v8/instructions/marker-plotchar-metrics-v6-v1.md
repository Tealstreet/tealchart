# marker-plotchar-metrics-v6-v1 capture v1

Source SHA256: `80190dd00aaa2f6b9244e4eb7dcc7fdd6f32935913f7fee74b39bb9dccdfe0db`. Native outcome and pixel metrics: UNSPECIFIED.

1. Paste the exact source into a new Pine script without edits. Run alone on BINANCE:BTCUSDT, 2-minute standard candles, UTC, with at least64 history bars.
2. Record TV version/build, browser/version, OS, devicePixelRatio, browser zoom, chart CSS dimensions, pane bounds and y-scale. Record source hash and last loaded bar/time; the12 marker cases use confirmed bars13 through2 before the last loaded bar.
3. Preserve compile/runtime diagnostics with phase and highlighted source line on refusal. If running, export all numeric columns and take original PNG with all12 markers and the0/1/2 scale anchors visible. The cases are tiny, normal, huge from oldest to newest; each size block contains the four literal cases in source order.
4. Take a second PNG after changing only horizontal zoom; record both pixel scales and pane ranges. Record plotted bar center and absolute-y1 position from the exported bar times and scale anchors. Keep source/cutoff fixed; repeat if a new bar changes last_bar_index.
5. Save original CSV/PNG/diagnostic and metadata under captures/v8/evidence with probe name/attempt; record evidence SHA256. Measure each marker bounding box and its displacement from source bar center and y1. Preserve separate observations for each environment/zoom.

Limits: finite stimulus for plotshape/plotchar, not drawing-label metrics. Raster observations certify only the recorded browser/font/scale context. No internal font, glyph or interpolation algorithm is inferred.
