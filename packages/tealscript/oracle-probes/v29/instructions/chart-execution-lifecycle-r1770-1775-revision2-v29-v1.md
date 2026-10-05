# chart-execution-lifecycle-r1770-1775-revision2-v29-v1

Ranks: [1770, 1771, 1772, 1774, 1775].

Exact unproven facet: Observable reinitialization/re-execution or prior output reuse after dataset changes, Logs/Profiler toggles, input roundtrip, refresh and source update.

Native outcome is UNSPECIFIED. Keep the source unchanged, record source SHA, account/build, symbol, timeframe, timezone, chart type, inputs and every requested UI setting. Retain full compile/runtime diagnostic, line/column and error bar for any refusal. A different earlier error does not answer the target question.

Use a stable closed dataset, preserving full source and export hashes before each action. (1770) Record baseline, change symbol/timeframe or load additional history, then return to the original dataset; retain origin/bar-count/checksum and UI action times. (1771) Open/close Pine Logs once in each direction; save pre/post exported init stamps and INIT/PREFIX log inventories. (1772) Enable/disable Profiler, retaining its visible execution count/time plus the same outputs. (1774) Switch Configuration identity1->2->1 on unchanged data; compare source/input/dataset identity and init stamps. (1775) Refresh and update the SAME saved script entry from revision1 source to revision2 companion; do not add a second indicator. Hash both exact sources. Repeat snapshots immediately before/after each single action, excluding live ticks or marking them explicitly.

Bounds: Init stamps, logs and fingerprints can discriminate fresh execution from prior observed output reuse on a frozen dataset. Equal outputs alone do not prove an internal cache hit, lifetime or storage policy. Cache internal mechanics remain HELD when no native UI evidence exposes them. Each UI action requires its own paired observation.

Local engine parse/check/compile/execute: NOT RUN by J, per no-engine-compute instruction. Static source/metadata/hash review only. Sole v29 assembler performs any later preflight.
