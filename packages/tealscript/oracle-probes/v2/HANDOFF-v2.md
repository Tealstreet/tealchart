# TradingView capture handoff v2

Bundle revision v3. Capture27 numeric probes plus25 outcome scripts below. An authorized agent or a person can follow this procedure; successful compilation/export is not parity proof.

Start here:

- Bundle root: `packages/tealscript/oracle-probes/v2/` on master (this folder). Put CSVs in `v2/captures/v2/`. Source paths, filenames and indicator titles are in [PROBES-v2.md](PROBES-v2.md); normalized maps are in maps-v3/.
- Capture on BINANCE:BTCUSDT,2-minute standard candles, UTC, normal live mode (Bar Replay off). Keep default inputs/styles. Save an Inputs/setup screenshot; record any change and restart the unchanged-default attempt.
- Every numeric CSV needs full execution history from Pine bar_index0 and the per-probe historical minimum/index/phase ranges in PROBES-v2.md. Scroll left/drag the time axis to load older bars before the reset; no history/settings changes afterward.

For each source:

1. Remove the previous probe and all other indicator instances. Open Pine Editor → new blank indicator; replace the entire buffer with the unchanged source, save using its filename, Add to chart. Verify exactly one active instance and its title.
2. Wait for recalculation. Clear/filter Pine Logs for this indicator, then perform a full browser page reload after history loading. Wait for that indicator to finish again; record reset UTC time. Do not change chart/history/settings before export.
3. Compile error means Pine Editor rejection; runtime error means a chart indicator stop after addition. Save complete text + screenshot, line/call/argument and failing bar if present. Preserve partial CSV separately as failed evidence; continue to the next unchanged source.
4. Record current live candle opening time from the rightmost candle/crosshair time tooltip on the UTC time axis (not wall-clock export time). Capture a screenshot with the chart setup/time. Operator/agent can record ISO UTC in notes; processor converts it to Unix seconds.
5. Use chart menu → Export chart data (older label Download chart data). Choose UNIX timestamp format, include the current indicator, screenshot export options, and download all loaded data.
6. Move/rename the browser Downloads file into this bundle’s captures/v2/<probe-stem>.csv without opening/resaving it. Preserve original decimals, signed tiny values and blanks. Repeats use <probe>-attempt<N>.csv; keep every attempt.
7. Record per-attempt live cutoff and UI notes/evidence in captures/v2/capture-notes-v3.json; UI-only capture/reset times may be unknown, never inferred from file time. Confirm the live candle did not change between observation and export. If a boundary/reset changed, mark uncertain and recapture.
8. Run python3 postprocess-v2.py. Verify all mapped fields, raw inputs, source identity, first index0, required historical ranges and FILE-READY status before the next probe. Unverified index/mapping/truncated history is NEEDS-EVIDENCE; retain it without claiming replay readiness.

Postprocess computes hashes, sizes, ordered headers, row counts, index/time ranges, observed decimal lengths and a conservative cutoff excluding the last CSV row. An observed live cutoff overrides this fallback. The fallback is labelled and is not evidence of the actual live opening. All live rows remain in raw files; agents compare only timestamps strictly before the recorded cutoff.

Numeric checklist (details/minimums in PROBES-v2.md):

1. [ ] `primitives-sma-stdev-v1.pine` — 60 fields; 600 historical rows; `captures/v2/primitives-sma-stdev-v1.csv`.
2. [ ] `coverage-register-ta-1-v1.pine` — 60 fields; 256 historical rows; `captures/v2/coverage-register-ta-1-v1.csv`.
3. [ ] `warmup-seed-ma-v2.pine` — 59 fields; 165 historical rows; `captures/v2/warmup-seed-ma-v2.csv`.
4. [ ] `mfi-flat-flows-v2.pine` — 60 fields; 600 historical rows; `captures/v2/mfi-flat-flows-v2.csv`.
5. [ ] `coverage-ta-2-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-ta-2-v1.csv`.
6. [ ] `coverage-ta-3-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-ta-3-v1.csv`.
7. [ ] `coverage-tad-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-tad-1-v1.csv`.
8. [ ] `coverage-ta-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-ta-1-v1.csv`.
9. [ ] `coverage-tab-1-v1.pine` — 60 fields; 80 historical rows; `captures/v2/coverage-tab-1-v1.csv`.
10. [ ] `coverage-history-na-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-history-na-1-v1.csv`.
11. [ ] `coverage-math-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-math-1-v1.csv`.
12. [ ] `coverage-math-2-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-math-2-v1.csv`.
13. [ ] `coverage-request-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-request-1-v1.csv`.
14. [ ] `coverage-req-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-req-1-v1.csv`.
15. [ ] `coverage-collections-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-collections-1-v1.csv`.
16. [ ] `coverage-collections-2-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-collections-2-v1.csv`.
17. [ ] `coverage-strings-color-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-strings-color-1-v1.csv`.
18. [ ] `coverage-plot-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-plot-1-v1.csv`.
19. [ ] `conflicts-batch-1-v1.pine` — 55 fields; 600 historical rows; `captures/v2/conflicts-batch-1-v1.csv`.
20. [ ] `conflicts-batch-2-v1.pine` — 39 fields; 600 historical rows; `captures/v2/conflicts-batch-2-v1.csv`.
21. [ ] `coverage-ta-4-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-ta-4-v1.csv`.
22. [ ] `coverage-time-2-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-time-2-v1.csv`.
23. [ ] `coverage-matrix-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-matrix-1-v1.csv`.
24. [ ] `coverage-drawing-1-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-drawing-1-v1.csv`.
25. [ ] `coverage-drawing-2-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-drawing-2-v1.csv`.
26. [ ] `coverage-drawing-3-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-drawing-3-v1.csv`.
27. [ ] `coverage-drawing-4-v1.pine` — 60 fields; 600 historical rows; `captures/v2/coverage-drawing-4-v1.csv`.

Special evidence:

- Warmup requires full dataset and every historical phase−5..100; first phase may be earlier than−5. Record frozen anchor/phase controls. Loading history or crossing a new bar after reset can move the anchor; recapture if the export does not match the frozen reset.
- SMA/MFI need their own complete chart inputs; matching older oscillator calendar start is optional. Preserve MFI sums, prior sums, tiny signed values, blanks and hole40.
- Plotbar/candle require actual Data Window label→CSV header mapping, with witness screenshot; see PROBES-v2.md. Never infer the four channels from suffix order or presumed high/low normalization.
- Request probes need native1m/6m histories for replay. Preserve requested timestamps/index/count controls and unknown availability; do not substitute synthetic fixtures. Register TA synthetic NVI/PVI controls do not exercise native builtin zero-close/prior-volume predicates.
- Numeric plotting/drawing captures settle only numeric/getter observations. Appearance/colors/fill rendering require separate targeted evidence. Keep already-settled columns in frozen conflict exports; adjudication belongs to the processors.
- For conflict batches1/2 copy all HOST/CF Pine Logs; batch1 needs exact CF024/CF029 strings. See the explicit per-script success/error instructions in PROBES-v2.md.

Outcome checklist:

Paste, Add to chart, record exact COMPILE-ERROR / RUNTIME-ERROR / RUNS in captures/v2/outcomes-v2.json by script+attempt. For RUNS, retain the values/relations/logs/screenshots listed per script in PROBES-v2.md (success CSV or Data Window evidence). A RUNS status alone does not complete the value/appearance portion. Minimum100 historical bars for value observations; unknowns remain unresolved.

1. [ ] `outcome-only/conflicts-batch-3-v1.pine` — CF001; exact outcome + specified success evidence.
2. [ ] `outcome-only/conflicts-batch-4-v1.pine` — CF003; exact outcome + specified success evidence.
3. [ ] `outcome-only/conflicts-batch-5-v1.pine` — CF005; exact outcome + specified success evidence.
4. [ ] `outcome-only/conflicts-batch-6-v1.pine` — CF008; exact outcome + specified success evidence.
5. [ ] `outcome-only/conflicts-batch-7-v1.pine` — CF010; exact outcome + specified success evidence.
6. [ ] `outcome-only/conflicts-batch-8-v1.pine` — CF011; exact outcome + specified success evidence.
7. [ ] `outcome-only/conflicts-batch-9-v1.pine` — CF012; exact outcome + specified success evidence.
8. [ ] `outcome-only/conflicts-batch-10-v1.pine` — CF013; exact outcome + specified success evidence.
9. [ ] `outcome-only/conflicts-batch-11-v1.pine` — CF014; exact outcome + specified success evidence.
10. [ ] `outcome-only/conflicts-batch-14-v1.pine` — CF016; exact outcome + specified success evidence.
11. [ ] `outcome-only/conflicts-batch-15-v1.pine` — CF016; exact outcome + specified success evidence.
12. [ ] `outcome-only/conflicts-batch-16-v1.pine` — CF017; exact outcome + specified success evidence.
13. [ ] `outcome-only/conflicts-batch-17-v1.pine` — CF018; exact outcome + specified success evidence.
14. [ ] `outcome-only/conflicts-batch-18-v1.pine` — CF019; exact outcome + specified success evidence.
15. [ ] `outcome-only/conflicts-batch-19-v1.pine` — CF020; exact outcome + specified success evidence.
16. [ ] `outcome-only/conflicts-batch-20-v1.pine` — CF022; exact outcome + specified success evidence.
17. [ ] `outcome-only/conflicts-batch-21-v1.pine` — CF023; exact outcome + specified success evidence.
18. [ ] `outcome-only/conflicts-batch-22-v1.pine` — CF025; exact outcome + specified success evidence.
19. [ ] `outcome-only/conflicts-batch-23-v1.pine` — CF027; exact outcome + specified success evidence.
20. [ ] `outcome-only/conflicts-batch-24-v1.pine` — CF028; exact outcome + specified success evidence.
21. [ ] `outcome-only/conflicts-batch-25-v1.pine` — CF030; exact outcome + specified success evidence.
22. [ ] `outcome-only/conflicts-batch-26-v1.pine` — CF032; exact outcome + specified success evidence.
23. [ ] `outcome-only/conflicts-batch-27-v1.pine` — CF033; exact outcome + specified success evidence.
24. [ ] `outcome-only/conflicts-batch-28-v1.pine` — CF037; exact outcome + specified success evidence.
25. [ ] `outcome-only/conflicts-batch-29-v1.pine` — CF038; exact outcome + specified success evidence.

Batches12/13/30/31 are not scheduled; coverage-time1 remains blocked by timenow. CF016 batch14 and15 test different consumers.

Return protocol:

- Fill [RESPONSE-v2.md](RESPONSE-v2.md) with per-attempt filenames, exact errors, metadata/evidence gaps and batch start/end. Do not edit this handoff. For a repository copy the destination is packages/tealscript/oracle-probes/RESPONSE-v2.md beside HANDOFF.md/HANDOFF-v2.md.
- When done: commit the whole `v2/captures/v2/` folder plus filled `v2/RESPONSE-v2.md` to master and push (Sam authorizes this, as for v1). The parity overseer replays them.
