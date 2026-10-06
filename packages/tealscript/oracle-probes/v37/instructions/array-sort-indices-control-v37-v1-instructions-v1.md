# v37 sort-indices control capture v1

Run this source independently, unchanged, on BINANCE:BTCUSDT 2-minute standard candles, regular session, Etc/UTC, no Bar Replay. Load at least 128 closed bars. Record account/build/settings and the actual historical origin/count/cutoff. Native phase and values are UNSPECIFIED; exact native error text is UNOBSERVED.

Question: Does the equivalent const-int sort_field control compile and return indices [1,0]?

Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_array.sort_indices. The local official v6 reference lists sort_field as const int/string and join elements as int/float/string. These documented contracts motivate the probe; they are not a substituted native observation.

For a refusal, record the earliest exact text/code/line/column and runtime bar if applicable; masked outputs remain UNOBSERVED. Do not alter the source to make it compile. If RUNS, export public CSV with time/OHLCV and all named columns: INDEX, FIELD, FIRST_INDEX, SECOND_INDEX. Preserve raw missing values and precision. Include INDEX=0 and at least the first 128 closed indices; if unavailable, report INITIAL-WINDOW-UNAVAILABLE, never substitute CSV ordinal. Exclude live rows. Retain first/last Data Window screenshots. For join sources also retain the exact JOIN_TEXT Pine Logs entry and its timestamp. Unavailable exports are not compile refusals.

If dynamic field selection is accepted: even INDEX returns [1,0], odd INDEX [0,1]. First-field retention returns [1,0] throughout. The const control selects field zero throughout. These are discriminating models, not observed native answers.

This settles only this version, element type, call form and explicit fixture. It does not establish all array overloads or historical/live mutation semantics.
