# Synthetic NVI holes and magnitude capture v1

Source `nvi-formula-holes-magnitude-v6-v1.pine` SHA256 `13ef354f125e70dc1e96565fcb9aa973d0c3e5136e499420bb55c9d2276faee2`. Paste exact bytes into Pine Editor unchanged. Retain Pine v6; compilation/runtime refusal is a valid outcome, do not repair.

Reset BINANCE:BTCUSDT, standard candles,2-minute timeframe,UTC. Export all10 plot columns plus Time from bar_index0 through at least24000 completed historical bars. Record chart settings, input/Style changes and live-bar cutoff. The formulas and64-bar synthetic stimuli are copied unchanged from captured v2 `coverage-register-ta-1-v1.pine`; chart close/volume are not the formula inputs.

Compare raw `nvi_na_synthetic_doc` and `nvi_na_synthetic_legacy` to their scaled values and `source is NA` flags. Capture Data Window and chart screenshots around the first raw-output gap while scaled values remain available, plus the nearest finite raw bar on each side. Record displayed values separately from CSV blanks and missing glyphs. Locate rows using Input bar index/cycle phase and exported synthetic price/volume. If history is insufficient to reach the gap, retain that limitation explicitly.

This probe separates actual source missingness or formula/history behavior from large-value plot suppression. Read alongside `plot-magnitude-cutoff-signed-v6-v1.pine` (threshold bracket) and shipped v4 `native-float-magnitude-output-v1.pine` (coarse magnitude controls). Native phases/values and cutoff remain UNSPECIFIED. Neither formula control certifies native `ta.nvi` arithmetic. No changes to the captured formulas or existing engine are implied.


Save evidence under v10/captures/v10/ and record the source hash, attempt, observed phase, diagnostic text/location, chart context, history extent and limitations in v10/captures/v10/RESPONSE-v10.md.
