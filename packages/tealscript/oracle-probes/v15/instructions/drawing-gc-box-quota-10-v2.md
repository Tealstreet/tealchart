# Drawing GC box, quota 10, v2

Paste the exact indicator source. Use BINANCE:BTCUSDT on a 2-minute chart with default settings and at least 1,538 historical bars. Record the compile outcome and full diagnostics first. If accepted, export CSV containing VISIBLE_COUNT and OLDEST_INDEX; certify the historical cutoff and exclude the live row.

The source creates one box on every bar, starting at Pine index 0, and never explicitly deletes drawings. OLDEST_INDEX comes from the actual first ID in the built-in *.all array, rather than a presumed quota formula. For polylines, array.indexof(created, firstID) recovers that ID's creation index because the API has no coordinate getter.

Expected observation: numeric values and compile/runtime phases are unspecified until captured. Record the first count drop, the peak count immediately before collection, the retained count immediately after collection, and the oldest surviving creation index. Repeat for subsequent collections. At Pine index i, i + 1 objects have been created. Distinguish compile refusal, runtime error, and successful CSV. Preserve raw CSV, source hash, chart symbol/timeframe/settings, and enough history for at least two observed collections if possible. Do not substitute engine predictions for native values.

The earlier quota-3 label/line captures rose through 8, then creation 9 trimmed to 3 with oldest index 6. That observation applies only to those quota-3 streams. It is not the expected curve for this new quota.
