# TradingView capture reply v31

212/215 v7 sources captured; {'RUNS': 157, 'RUNTIME-ERROR': 20, 'COMPILE-ERROR': 34, 'COMPILE-ACCEPTED': 1}.

[Response v31](captures/v7/RESPONSE-v31.md), [all attempts](captures/v7/outcomes-v7.json), [evidence SHA256](captures/v7/capture-integrity-v31.json).

Random reload supplement v1: three native exports have identical 24,780-row timestamp sequences and identical time/OHLC values, verified against the full CSVs. An explicit native replay selection at 2026-10-04 10:00 UTC fixes the history endpoint; last loaded bar is 09:58 and conservatively excluded from historical comparison. All three setup records state Bar Replay=true; attempts2/3 preserve independent browser reload UTC. Exact four-stream sequences and first64 rows are retained in [random history summary](captures/v7/random-identical-history-context-summary-v1.json). Native full-history start is recorded, but an unplotted Pine index0 remains UNKNOWN. Prefix equality cannot identify a universal RNG algorithm.

The three packet008 matrix sources run. Binary-search and determinant controls run on both independent reloads. Raw headers and precision are preserved, including determinant -4.999999999999995. These outputs certify neither internal procedure nor comparison sequence/cutoff policy beyond the bounded input rows.

Float-index get/set source is COMPILE-ERROR CE10123, line7 column22: array.get index receives series float while series int is expected. Full native diagnostic, highlighted line, compiler markers and screenshot are retained. The unchanged source refuses before its raw/floor numeric controls execute; no float-floor or negative-index value result is inferred.
