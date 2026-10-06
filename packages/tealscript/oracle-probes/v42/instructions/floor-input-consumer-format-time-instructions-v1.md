# V42 floor-input-consumer-format-time capture v1

Run `floor-input-consumer-format-time-v42-v1.pine` independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars. Preserve every source byte. Record source SHA, account/build, chart settings, first/last historical index and cutoff. Native compile/runtime phase and values are UNSPECIFIED.

Question: Determine the native consumer boundary and diagnostic actual qualifier for this input-qualified format-time result. Specific signature floors are candidates, not predictions.

The consumer requires const string. Both input and simple may refuse, so refusal alone does not settle the return floor. Preserve actual qualified result type from the native diagnostic if available; otherwise qualifier is UNOBSERVED.

If refused, copy the earliest complete compiler/runtime diagnostic verbatim: message, qualified actual/required types when present, code, line/column and first executing bar. Save a public screenshot. Do not edit the source to make it compile. An earlier constructor/input refusal leaves the later formatting or consumer facet UNOBSERVED; it is not a refusal of an unexecuted target.

If RUNS, export chart CSV with time/OHLCV, SOURCE_INDEX and every named numeric output. Preserve NA cells and exported precision, excluding live rows from historical comparisons. Copy the complete first-bar Pine Logs string and save its screenshot for representation probes; numeric LENGTH alone does not settle string contents. SOURCE_INDEX is Pine bar_index, not the CSV ordinal. If text or initial index is unavailable, say UNOBSERVED rather than infer it.

Return source-bound artifacts under `captures/v42/` with `RESPONSE-v42.md`. Acceptance of a weak-qualified consumer shows compatibility only; refusal without the actual qualified result type cannot discriminate input from simple when both exceed const. Constructor admission, conversion admission, runtime output and consumer qualifier are separate facets.
