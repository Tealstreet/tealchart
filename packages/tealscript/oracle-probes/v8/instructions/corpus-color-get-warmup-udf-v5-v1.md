# corpus-color-get-warmup-udf-v5-v1 native capture v1

Source SHA256: `91ca15efbb2194f400c2a008ccb425abd676748caceadcaf4c92faf7bbd1d083`. Pine version5. Native result UNSPECIFIED.

Run this exact isolated script alone on the bundle chart. Record compile diagnostics, runtime errors including line/bar, logs, TV build and chart metadata before classifying. On success export all columns from bar0, including size and color_code; capture a second attempt. color_code is -1 for missing,0 for blue,100 for red,999 for another color. The UDF probe uses missing percent on bars0-2 and finite100 thereafter. Finite OOB is a separate negative control: preserve its runtime diagnostic rather than expecting an export. The NA-size probe independently retains the originals' legacy constructor; it cannot settle the defined-array index case alone. Record source and evidence hashes. Do not infer version5 from version6 captures.

Routing: collection semantics owner codex-776dnu; overseer requested capture handoff to codex-6y3sjh for v56:1183 and v56:1411. Documentation review and original source hashes: /home/sam/cs/docs/tealscript-parity-archive/collection-packet-001-e-v1/v5-color-index-probes-v1/HANDOFF-v1.json.
