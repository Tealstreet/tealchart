# group-03 — capture instructions v1

Does omitted-anchor VWAP skip or poison an interior finite-volume source hole? Native201 settles only the explicit-anchor overload.

Record native phase and values without prediction: both are UNSPECIFIED. Preserve every diagnostic, warning, code, line/column, runtime bar and source location. Capture successful CSVs with timestamps, OHLCV, all observer columns, settings, inputs, capture time and the last confirmed-bar cutoff. Keep open-row updates separate from historical rows.

Preserve exact source bytes. Unavailable REMOTE/REMOTE:ALT or unpublished-library diagnostics must be retained; do not silently substitute a symbol or helper. Earlier errors mask later value questions. Preserve duplicate unnamed plot headers and their column positions. Local engine observations and controls do not predict native admission or values.

For an authorized library capture, first record prerequisite admission/publication and its exact source hash plus actual owner/title/version. Bind paired consumers to the SAME immutable publication; change only the import identity, save the executed source, its SHA256 and the import-only diff. Keep the original template hash. A refused or unavailable prerequisite is PUBLICATION-BLOCKED, not consumer-form evidence. Do not rewrite an exported method as a function or inline helper to get admission.

This assembled v58 capture order supersedes the submitted packets' staging-only/no-assembly directions. Publication has not been performed by the assembler. Record any unmet physical/live context as CONTEXT-UNMET; do not invent a feed or infer realtime behavior from historical CSVs.

Run the explicit/omitted pair separately on the SAME physical 32-row source/volume/time window; the scripts declare literal calc_bars_count=32 and have no Calculated bars input. Observe source hole 10 and recovery/poison 10–15 separately from explicit anchor 16. The omitted script’s anchor readout is stimulus only. A mismatched window leaves this comparison CONTEXT-UNMET.

## Assets

- [vwap-explicit-anchor-source-hole-v58-v1.pine](../vwap-explicit-anchor-source-hole-v58-v1.pine) — consumer; [instructions](./vwap-explicit-anchor-source-hole-v58-v1-instructions-v1.md).
- [vwap-omitted-anchor-source-hole-v58-v1.pine](../vwap-omitted-anchor-source-hole-v58-v1.pine) — consumer; [instructions](./vwap-omitted-anchor-source-hole-v58-v1-instructions-v1.md).

## Pair and capture plan v1

The hash-bound plan below resolves retained assets by bundle path; original absolute paths are submission provenance.

```json
{
  "captureOrder": "Explicit first, omitted second, one indicator at a time to avoid duplicate same-title CSV headers. Hold comparison if the physical32bar window shifts.",
  "pairDiff": "Omitted source changes only the two ta.vwap calls by removing their anchor argument; both retain the exact201 title, physical inputs, hole10 and anchor readout0/16. Omitted source anchor readout is stimulus metadata only, not its reset condition.",
  "explicitReferenceReuse": [
    {
      "round": 54,
      "path": "packages/tealscript/oracle-probes/v54/vwap-source-actual-volume-hole-state-v54-v1.pine",
      "sha256": "871242f99d02a6471122ef62f6a712313f51e3adeed7c2990ca4a1936a4366a7",
      "commit": "d9b79a02a38065629ba3a100d42cff1a5dd31247",
      "bundlePath": "vwap-explicit-anchor-source-hole-v58-v1.pine"
    }
  ],
  "reuseBoundary": "Explicit anchor source is a byte-identical previously captured control. Stage it for a matched physical-input pair only; no new explicit-overload credit. The omitted-anchor source remains native-pending."
}
```
