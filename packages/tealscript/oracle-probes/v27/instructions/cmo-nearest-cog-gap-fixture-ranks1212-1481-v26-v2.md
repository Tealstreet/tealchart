# Capture instructions v1

Run this unchanged Pine v6 indicator on BINANCE:BTCUSDT standard 2-minute candles with chart display timezone Etc/UTC. Record source SHA, native account/build, chart first timestamp, dataset origin, historical cutoff and exported endpoint. Obtain at least 128 closed historical bars, including the first source bars and four complete 32-bar cycles. Export every named plot as raw CSV, preserving empty cells. Save CSV SHA. Do not edit the source, round values, replace missing cells with zero, or align bar_index to a different dataset origin.

Native compile/runtime phase and values are UNSPECIFIED. If it fails, preserve exact diagnostic code/text/line and failing bar; the failure is itself the observation. Local preflight is instrument-only and does not predict TradingView acceptance.

The phase/source assignments are byte-identical to D's direction-long-gap-recovery-ranks1011-1034-v26-v1.pine. Phases 0–2 are leading holes, 7–10 and 26–29 are four-bar gaps, 16 is an isolated hole, 11–15 and 17–25 are recovery/equality/reversal segments. Four-bar gaps exceed the three-bar Dev/CMO/nearest/COG windows; HMA uses length 9. Compare the same INPUT_BAR_INDEX, INPUT_PHASE32 and INPUT_SOURCE controls across the paired captures. Retain all bars, especially gaps and first recovered outputs.

Question: CMO raw adjacent differences versus finite-value bridging; nearest-rank physical/valid horizon; COG physical versus compact weights.

Each rank has exactly one primary R column. MODEL columns are explicit competing constructions, not expected answers. Record the target's missingness and values at startup, holes and recovery; its equality to one model only certifies that bounded source/model relation. Tolerance 1e-9 in the CMO match mask is for structural classification, not binary64 precision certification. Both missing values count as a match, so mask 3 on leading empty rows is uninformative; inspect the raw and bridged model columns on their separating bars.

R1212 is builtin CMO3. R1214 is mask 1 for equality to the literal raw-adjacent change/sum construction and mask 2 for equality to the finite-source bridge construction. Both model values and differences are exported. The source formulas retain math.sum's own native behavior; do not infer an abstract sum algorithm from a match. R1318 is nearest rank length3 percentile40; complete three-value models select the middle value, while the raw-skip model selects the minimum for one/two finite values. R1481 is COG3; raw physical-age weights and compact valid-rank weights are separately visible.

Historical source-specific scope only. No native live/tick, universal missing-value policy, precision, shared-kernel algorithm, or whole-clause closure credit before capture adjudication. Archived official reference citations describe the missing-value remarks; these captures ask about consequences the remarks leave unsettled.
