# V27 V27-OmittedElseStrings-v1 v1

Ranks: 238, 244. Native expected phase and values: UNSPECIFIED.

Question: Does a dynamically unselected string if without else produce NA, empty string or retained prior content, and do input/UDF contexts agree?

Use exact source bytes on BINANCE:BTCUSDT, 2-minute candles, display zone Etc/UTC. Retain at least96 historical bars. Record source SHA256, symbol/exchange/timeframe/timezone, all input values, loaded chart range and indicator version. Export all named plots with time/OHLC. Keep initial rows; they distinguish initialization and sparse history. Do not shorten the CSV to the visible viewport or change code to force a result.

Record compile/runtime outcome first, including exact native code/text/line/column and failing bar if present. If it runs, export every column; if it fails, retain the complete diagnostic and screenshot rather than substituting NA cells. A failure in one source must not suppress capture of the other two sources.

Prior V3/V7 conditional-01-unmatched-string-if uses only global literalfalse. This source alternates selected/unselected bars, includes an input-conditioned branch and a UDF-local branch, and exports independent NA/empty/chosen/length observations beside explicit else controls. Capture InputEnabled=false and true as separate attempts without source changes.

Capture a settings screenshot and indicator data-window screenshot. Keep chart source/history fixed across input variants. No Pine source edits between variants.

Scope limits: V6 omitted-else string outcomes only. No cast-qualifier240-243, live input availability or other primitive defaults. Length/empty observations must be interpreted with the separately exported NA flag.

Authority candidates: https://www.tradingview.com/pine-script-docs/language/conditional-structures/; https://www.tradingview.com/pine-script-reference/v6/#kw_if; https://www.tradingview.com/pine-script-docs/language/type-system/#bool. These are the question's provenance, not a prediction of TV behavior.

Make two attempts with the same source/chart: InputEnabled=false (default), then InputEnabled=true. Both are required; preserve default and selected-input controls. Record the bool setting in each attempt metadata.
