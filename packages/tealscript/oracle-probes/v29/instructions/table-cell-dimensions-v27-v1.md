# V27 table-cell-dimensions-v27-v1 v1

Rank 321. Expected native phase, text and values: UNSPECIFIED.

Question: What runtime and rendered sizing follows negative, zero, missing and overflowed series percentage widths/heights in table.cell?

Use exact unchanged source on BINANCE:BTCUSDT 2-minute candles, standard candles, chart display timezone Etc/UTC and at least96 historical bars. Run ALL 10 input attempts, Case=0,1,2,3,4 for each Axis=Width,Height. Preserve each input pair as a separate attempt; failure in one attempt must not suppress the others. Case0 is the valid control for both axes. Case values in order: 10.0, -5.0, 0.0, float(na), dynamic 1e200*1e200. Target call occurs at PineIndex8 after valid setup; do not shorten history or change source to force an outcome.

Record source SHA256, full settings, symbol/timeframe/exchange timezone, viewport pixel dimensions/device pixel ratio, visible range, loaded start/cutoff and compile/runtime phase. Record exact diagnostic text/code/line/column and failing bar only if displayed. For RUNS export every named plot plus time/OHLC and capture table/settings/data-window screenshots. For failures retain diagnostic screenshots and any genuine partial output; never manufacture missing CSV values. CSV acceptance/return markers do not certify rendered width/height. Keep viewport dimensions fixed across attempts and retain raw screenshots; compare TEST geometry with CONTROL cell where visible.

Constructor remains fixed2x1 with an independently valid CONTROL cell. Width and height are isolated in separate attempts. Overflow expression is an observational discriminator; its native missingness/value is not predicted. A returned call alone does not establish actual pixel sizing: screenshots and viewport metadata are mandatory. The prior v7 float table.new rejection concerns integer counts and does not settle table.cell float percentages.

Authority question provenance: https://www.tradingview.com/pine-script-reference/v6/#fun_table.cell; https://www.tradingview.com/pine-script-docs/visuals/tables/. Current docs describe count/percentage domains; they are not predictions for invalid runtime values. Native capture is required for the disputed consequences.
