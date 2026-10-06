# v50 tostring-onearg-string-input-title capture instructions v1

Copy `tostring-onearg-string-input-title-v50-v1.pine` without changing any bytes; source SHA256 is `93e9d65d32504414dfef17e771eaa648bde5c6d96e0d28cd1b3e9c96c5951c34`. Follow HANDOFF-v50-v1.md. Native phase, qualified type and values are UNSPECIFIED.

Question: Does one-argument str.tostring with a input string argument satisfy the const string title consumer, and what exact qualified type does native report if it refuses?

Discriminating power: RUNS establishes compatibility with the const string title consumer for this exact argument. A title-site diagnostic naming the actual qualified type distinguishes const/input/simple/series; a generic refusal or a failure at str.tostring itself does not establish the result qualifier. This source does not distinguish stronger qualifiers without that diagnostic.

Use BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC and at least 32 closed bars, with no Bar Replay. Leave every input at its authored default. Record exchange timezone, TradingView build/account, source origin/cutoff/count and settings. Capture the independent enum control first, then this source on its own.

If refused, retain the complete earliest diagnostic, actual and required qualified types, code/location and screenshot. Identify whether the failing site is str.tostring or plot(title=result); do not repair the source, add a wrapper, cast, const annotation, or change inputs. Keep compile and runtime refusal separate, recording the earliest runtime bar if applicable.

If RUNS, export raw time/OHLCV and both plot columns; preserve the actual title produced by result and SOURCE_INDEX. Retain historical SOURCE_INDEX 0..15 and all exported rows, separating live rows. Capture the plot title and input/settings screenshots. There is no TARGET log in this source; do not add logging. Numeric close values alone do not establish the returned string or its qualifier.

Verify SHA256SUMS from v50. Return source-hash-bound CSV and screenshots under `v50/captures/v50/`, with this probe ID and attempt number in RESPONSE-v50.md. A local TealScript preflight has no native qualifier credit.
