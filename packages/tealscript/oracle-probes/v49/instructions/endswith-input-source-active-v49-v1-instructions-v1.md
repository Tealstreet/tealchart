# v49 endswith-input-source-active capture instructions v1

Copy `endswith-input-source-active-v49-v1.pine` unchanged and verify its source SHA256. Use the common setup in HANDOFF-v49-v2.md. Leave every authored input at its default; retain a settings screenshot if the source runs. Native phase and values are UNSPECIFIED.

Question: What is the consumer boundary of str.endswith when only its source argument is input-qualified?

Discriminating power: The direct bool result is passed to input.bool active, which requires input-or-const bool. Success establishes that boundary, not exact input versus const identity. A refusal with actual simple/series bool distinguishes stronger floors.

If refused, save the FULL earliest diagnostic, its actual and required qualified types, code/location and screenshot. Do not repair the source. A failure at a different site does not settle this consumer. Runtime refusal and compile refusal are separate observations. If RUNS, export raw time/OHLCV and every plot column (CONSUMER, TARGET, INDEX, CONTROL_CLOSE); retain historical INDEX 0..15 and source origin/cutoff/count. Preserve the actual dynamic plot title if applicable. Separate any live row. Return source-hash-bound artifacts under `v49/captures/v49/` with this probe ID and attempt number, and record them in RESPONSE-v49.md. No native qualifier is inferred from the local preflight.
