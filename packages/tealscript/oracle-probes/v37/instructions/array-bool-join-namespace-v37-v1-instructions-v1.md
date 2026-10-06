# v37 bool-join namespace capture v1

Run this source independently, unchanged, on BINANCE:BTCUSDT 2-minute standard candles, regular session, Etc/UTC, no Bar Replay. Load at least 128 closed bars. Record account/build/settings and the actual historical origin/count/cutoff. Native phase and values are UNSPECIFIED; exact native error text is UNOBSERVED.

Question: Does array<bool> join compile, refuse the element type, or run with another string conversion?

Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_array.join. The local official v6 reference lists sort_field as const int/string and join elements as int/float/string. These documented contracts motivate the probe; they are not a substituted native observation.

For a refusal, record the earliest exact text/code/line/column and runtime bar if applicable; masked outputs remain UNOBSERVED. Do not alter the source to make it compile. If RUNS, export public CSV with time/OHLCV and all named columns: INDEX, TEXT_LENGTH, MATCH_LITERAL. Preserve raw missing values and precision. Include INDEX=0 and at least the first 128 closed indices; if unavailable, report INITIAL-WINDOW-UNAVAILABLE, never substitute CSV ordinal. Exclude live rows. Retain first/last Data Window screenshots. For join sources also retain the exact JOIN_TEXT Pine Logs entry and its timestamp. Unavailable exports are not compile refusals.

The string control literal has length 15 and MATCH_LITERAL=1. If bool conversion uses lowercase textual values it yields the same string. Record the actual JOIN_TEXT log even if the flags match. Other representations remain third outcomes.

This settles only this version, element type, call form and explicit fixture. It does not establish all array overloads or historical/live mutation semantics.
