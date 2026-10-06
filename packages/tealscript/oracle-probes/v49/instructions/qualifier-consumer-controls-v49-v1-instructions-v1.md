# v49 qualifier-consumer-controls capture instructions v1

Copy `qualifier-consumer-controls-v49-v1.pine` unchanged and verify its source SHA256. Use the common setup in HANDOFF-v49-v1.md. Leave every authored input at its default; retain a settings screenshot if the source runs. Native phase and values are UNSPECIFIED.

Question: Are the direct input-active, input-width and simple-parameter consumer shapes admitted on this native build?

Discriminating power: Instrument companion only. The input-string comparison active control independently checks the qualifier propagation used by string-result probes.

If refused, save the FULL earliest diagnostic, its actual and required qualified types, code/location and screenshot. Do not repair the source. A failure at a different site does not settle this consumer. Runtime refusal and compile refusal are separate observations. If RUNS, export raw time/OHLCV and every plot column (WIDTH_CONTROL, SIMPLE_CONST_STRING, SIMPLE_INPUT_STRING, SIMPLE_SYMBOL_STRING, SIMPLE_INPUT_INT, SIMPLE_INPUT_BOOL, ACTIVE_DIRECT, ACTIVE_COMPARISON, INDEX, CONTROL_CLOSE); retain historical INDEX 0..15 and source origin/cutoff/count. Preserve the actual dynamic plot title if applicable. Separate any live row. Return source-hash-bound artifacts under `v49/captures/v49/` with this probe ID and attempt number, and record them in RESPONSE-v49.md. No native qualifier is inferred from the local preflight.
