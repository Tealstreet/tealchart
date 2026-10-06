# v40 substring-negative-start capture instructions v1

Question: Negative begin: clamp to zero (ab), from-end behavior, empty, another string, or refusal. Facet: `substring-invalid-start`. Reference: v6 `str.substring`, functions entry 331. All native phases and values are UNSPECIFIED; the candidate labels are alternative observations, not predictions.

Use BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, with at least 32 closed bars and no Bar Replay. Paste the exact source unchanged, add it to the chart, and record chart/account/build settings. Capture this script independently; never repair a rejected call.

If admitted and running, export public chart CSV with time/OHLCV and all available named columns: INDEX, TARGET_NA, TARGET_LENGTH, CANDIDATE_1_MATCH, CANDIDATE_2_MATCH, CANDIDATE_3_MATCH. Capture Pine Logs containing `TARGET=[...]` and a Data Window screenshot. Preserve exact target text (including apostrophes, spaces, zero padding and percent signs); copy the log text as well as a screenshot. Blank numeric cells are not empty string evidence: use TARGET_NA, TARGET_LENGTH where present, the candidate flags and the raw log together. Raw text unavailable leaves the unidentified string UNOBSERVED; do not infer it from length alone. Missing INDEX=0 need not block this bar-invariant literal, but retain the actual exported indices.

If compile/runtime refusal occurs, record the full earliest diagnostic text, displayed code/site and executing bar if exposed. Save a screenshot and exact source SHA; no output behind that refusal is observed. Capture `string-valid-controls-v40-v1.pine` separately to distinguish a native refusal here from setup or unavailable UI export. Other outputs and third outcomes remain valid answers.

Candidate mapping: {"CANDIDATE_1_MATCH": "ab", "CANDIDATE_2_MATCH": "bc", "CANDIDATE_3_MATCH": ""}. For numeric targets, raw CSV precision must distinguish alternatives; otherwise mark PRECISION-INSUFFICIENT. For string targets, CSV flags classify only the listed alternatives: all-zero flags require the raw log, not a guessed third answer.

Return source-bound artifacts to `v40/captures/v40/`, named `substring-negative-start-v40-v1-attempt1.csv` / `-logs.txt` / screenshots. Summarize RUNS or exact refusal and unavailable channels in `RESPONSE-v40.md`. Never compare CSV row ordinal with Pine INDEX or change source/defaults.
