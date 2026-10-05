# V27 table-constructor-dimensions-v27-v1 v1

Rank 271. Expected native phase, text and values: UNSPECIFIED.

Question: Do series column/row counts negative, zero and na admit, clamp or raise at the delayed table.new call?

Use exact unchanged source on BINANCE:BTCUSDT 2-minute candles, standard candles, chart display timezone Etc/UTC and at least96 historical bars. Run ALL 8 input attempts, Case=0,1,2,3 for each Axis=Columns,Rows. Preserve each input pair as a separate attempt; failure in one attempt must not suppress the others. Case0 is the valid control for both axes. Case values in order: 1, -1, 0, int(na) counts. Target call occurs at PineIndex8 after valid setup; do not shorten history or change source to force an outcome.

Record source SHA256, full settings, symbol/timeframe/exchange timezone, viewport pixel dimensions/device pixel ratio, visible range, loaded start/cutoff and compile/runtime phase. Record exact diagnostic text/code/line/column and failing bar only if displayed. For RUNS export every named plot plus time/OHLC and capture table/settings/data-window screenshots. For failures retain diagnostic screenshots and any genuine partial output; never manufacture missing CSV values. CSV acceptance/return markers do not certify rendered width/height. Keep viewport dimensions fixed across attempts and retain raw screenshots; compare TEST geometry with CONTROL cell where visible.

No table.cell call is made on the tested table: constructor consequence remains separate from cell-coordinate failures. Prior v7 negative/zero probes only initialize var table on the first loaded bar; this probe delays actual construction until PineIndex8, independently varies rows versus columns and adds a typed-missing count. The float-kind refusal already returned in v7 is not recaptured.

Authority question provenance: https://www.tradingview.com/pine-script-reference/v6/#fun_table.new; https://www.tradingview.com/pine-script-docs/visuals/tables/. Current docs describe count/percentage domains; they are not predictions for invalid runtime values. Native capture is required for the disputed consequences.
