# array-percentrank-holes-v29-v1 capture instructions v1

Question: For NA elements, does rank use full size or finite count, and what is the missing-reference outcome? Observe empty/all-NA outcomes in isolated attempts.

Use BINANCE:BTCUSDT, 2-minute chart, chart display timezone Etc/UTC. Paste the unchanged indicator; do not add a strategy wrapper. Run one separate attempt per CASE input:

- CASE=0: empty; source `array.new_float(0)`.
- CASE=1: all-na; source `array.from(float(na), float(na), float(na))`.
- CASE=2: leading-na; source `array.from(float(na), 1.0, 2.0, 4.0)`.
- CASE=3: middle-na; source `array.from(1.0, float(na), 2.0, 4.0)`.
- CASE=4: mostly-na; source `array.from(1.0, float(na), float(na))`.
- CASE=5: positive-control; source `array.from(1.0, 2.0, 4.0)`.

For each attempt, save the exact source, CASE settings, compile outcome, runtime outcome, chart context and full raw CSV. Save a screenshot only as supplementary context. If an attempt refuses, record the verbatim diagnostic/error and continue with the next CASE; never combine CASE results into one CSV. Each source runs only its selected CASE, so empty/singleton/all-NA refusal cannot hide the other attempts. Index zero is deliberately invoked even for the empty case. Higher index plots are skipped outside valid size; those are not invalid-index tests.

Expected native phase and values: UNSPECIFIED. Compare namespace/method columns without rounding the export. Source columns and CASE/SIZE/INPUT_BAR_INDEX/TIME identify each observation; preserve missing CSV fields. Exclude live/future tails from historical conclusions and record the cutoff. These sources complement shipped v7 midpoint/missing-index and v14 positive-minimum/middle-tie captures; only the positive-control attempt and middle-tie reference slots deliberately repeat prior controls. They do not establish a universal formula, version boundary, or tolerance.

Local preflight: static source/column/settings review only. The sole v29 assembler owns exact-T compile preflight; no local engine replay was run.
