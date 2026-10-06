# v49 match-input-regex-active capture instructions v1

Copy `match-input-regex-active-v49-v1.pine` unchanged and verify its source SHA256. Use the common setup in HANDOFF-v49-v2.md. Leave every authored input at its default; retain a settings screenshot if the source runs. Native phase and values are UNSPECIFIED.

Question: What consumer boundary does str.match with input-regex arguments meet?

Discriminating power: input.bool active requires input-or-const bool. Combined with the comparison control, admission supports an input-compatible result; refusal must retain the actual qualifier. It does not by itself distinguish const from input.

If refused, save the FULL earliest diagnostic, its actual and required qualified types, code/location and screenshot. Do not repair the source. A failure at a different site does not settle this consumer. Runtime refusal and compile refusal are separate observations. If RUNS, export raw time/OHLCV and every plot column (CONSUMER, TARGET_LENGTH, TARGET_EQUAL, TARGET_NA, INDEX, CONTROL_CLOSE); retain historical INDEX 0..15 and source origin/cutoff/count. Preserve the actual dynamic plot title if applicable. Copy the literal first-bar Pine Logs TARGET text, including brackets and the empty string; length and flags alone do not establish text. Separate any live row. Return source-hash-bound artifacts under `v49/captures/v49/` with this probe ID and attempt number, and record them in RESPONSE-v49.md. No native qualifier is inferred from the local preflight.
