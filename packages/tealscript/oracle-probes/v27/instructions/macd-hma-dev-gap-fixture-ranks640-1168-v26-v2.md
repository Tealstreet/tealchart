# Capture instructions v1

Run this unchanged Pine v6 indicator on BINANCE:BTCUSDT standard 2-minute candles with chart display timezone Etc/UTC. Record source SHA, native account/build, chart first timestamp, dataset origin, historical cutoff and exported endpoint. Obtain at least 128 closed historical bars, including the first source bars and four complete 32-bar cycles. Export every named plot as raw CSV, preserving empty cells. Save CSV SHA. Do not edit the source, round values, replace missing cells with zero, or align bar_index to a different dataset origin.

Native compile/runtime phase and values are UNSPECIFIED. If it fails, preserve exact diagnostic code/text/line and failing bar; the failure is itself the observation. Local preflight is instrument-only and does not predict TradingView acceptance.

The phase/source assignments are byte-identical to D's direction-long-gap-recovery-ranks1011-1034-v26-v1.pine. Phases 0–2 are leading holes, 7–10 and 26–29 are four-bar gaps, 16 is an isolated hole, 11–15 and 17–25 are recovery/equality/reversal segments. Four-bar gaps exceed the three-bar Dev/CMO/nearest/COG windows; HMA uses length 9. Compare the same INPUT_BAR_INDEX, INPUT_PHASE32 and INPUT_SOURCE controls across the paired captures. Retain all bars, especially gaps and first recovered outputs.

Question: MACD hold/reset and tuple-stage seed timing; HMA physical versus compact windows; Dev strict raw, raw-skip and last-valid windows.

Each rank has exactly one primary R column. MODEL columns are explicit competing constructions, not expected answers. Record the target's missingness and values at startup, holes and recovery; its equality to one model only certifies that bounded source/model relation. Tolerance 1e-9 in the CMO match mask is for structural classification, not binary64 precision certification. Both missing values count as a match, so mask 3 on leading empty rows is uninformative; inspect the raw and bridged model columns on their separating bars.

R0640 is the MACD line for lengths 2/5/3; hold and reset EMA constructions are plotted independently. R0641 is a presence mask: MACD bit 1, signal bit 2, histogram bit 4. Seed-mask candidates explicitly use source counts 1/3 and 5/7; they are alternative startup hypotheses, not the documented implementation. Signal and histogram numeric columns remain visible. HMA models use half-length 4, full length 9 and final length 3; raw requires complete physical windows, compact uses last valid samples and advances the inner series only on finite source bars. Dev models distinguish complete raw3, finite samples within raw3, and last3 valid observations.

Historical source-specific scope only. No native live/tick, universal missing-value policy, precision, shared-kernel algorithm, or whole-clause closure credit before capture adjudication. Archived official reference citations describe the missing-value remarks; these captures ask about consequences the remarks leave unsettled.
