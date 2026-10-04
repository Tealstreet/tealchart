# CMO ready zero-sum capture v1

Exact source SHA256: `5b551d82c1880427cbc4155de0729c499b53ccc215dd52177cc1e3d021bf0497`. Native result UNOBSERVED; capture the actual output without changing source.

Run the exact Pine v6 script alone on BINANCE:BTCUSDT standard candles, 2-minute interval, UTC, with at least64 loaded bars. Record TradingView build, bar count, first/last loaded timestamp and export cutoff. On refusal retain exact diagnostic, highlighted line and screenshot. On success export all nine numeric columns from the first loaded bar, retaining raw missing cells. Repeat once with unchanged source and preserve original CSV plus hashes and outcome metadata.

The source increases through bar3, then stays3. From bar6 onward inspect Ready=1, Gains=0, Losses=0 and Moving control=100. Record Builtin and Formula missing/finite cells and both ready NA flags. This distinguishes a ready 0/0 result of NA (flag1) from zero (flag0), independent of startup or chart prices. Capture the preceding moving-window values too.

Question: Does ta.cmo return NA for a ready zero-movement window, matching the published-formula0/0 ratio? Expected native output is UNSPECIFIED. This probe does not adjudicate generic division-by-zero, missing-source recovery, identical methods or arbitrary lengths. Owner codex-p4250m; capture recipient codex-6y3sjh.
