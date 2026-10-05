# array-percentrank-negative-v29-v1 capture instructions v1

Question: Does each negative/signed-zero input use the same rank convention as the captured nonnegative inputs?

Use BINANCE:BTCUSDT, 2-minute chart, chart display timezone Etc/UTC. Paste the unchanged indicator; do not add a strategy wrapper. Run one separate attempt per CASE input:

- CASE=0: mixed-sign; source `array.from(-4.0, 2.0, 6.0)`.
- CASE=1: all-negative; source `array.from(-6.0, -2.0, -1.0)`.
- CASE=2: mixed-sign-middle-tie; source `array.from(-4.0, 2.0, 2.0, 6.0)`.
- CASE=3: signed-zero; source `array.from(-0.0, 1.0, 2.0)`.

For each attempt, save the exact source, CASE settings, compile outcome, runtime outcome, chart context and full raw CSV. Save a screenshot only as supplementary context. If an attempt refuses, record the verbatim diagnostic/error and continue with the next CASE; never combine CASE results into one CSV. Each source runs only its selected CASE, so empty/singleton/all-NA refusal cannot hide the other attempts. Index zero is deliberately invoked even for the empty case. Higher index plots are skipped outside valid size; those are not invalid-index tests.

Expected native phase and values: UNSPECIFIED. Compare namespace/method columns without rounding the export. Source columns and CASE/SIZE/INPUT_BAR_INDEX/TIME identify each observation; preserve missing CSV fields. Exclude live/future tails from historical conclusions and record the cutoff. These sources complement shipped v7 midpoint/missing-index and v14 positive-minimum/middle-tie captures; only the positive-control attempt and middle-tie reference slots deliberately repeat prior controls. They do not establish a universal formula, version boundary, or tolerance.

Local preflight: static source/column/settings review only. The sole v29 assembler owns exact-T compile preflight; no local engine replay was run.
