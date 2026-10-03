# TradingView capture handoff v3

Capture 104 outcome-only source-pinned Pine v3-v6 scripts, one unchanged source and one OUTCOME plot per attempt (the fill witness also has two handle plots). This archive bundle is staged for dispatch after v2 returns. No native v3 observations exist yet. Successful compilation/export is not parity proof.

Start here:

- Bundle root: `packages/tealscript/oracle-probes/v3/` on master. Save returned evidence under `packages/tealscript/oracle-probes/v3/captures/v3/` and commit it, plus a `RESPONSE-v4.md` reply beside this handoff. Keep this revision separate from v2.
- Copy-ready sources, indicator titles, hashes, predictions and evidence requirements are in [PROBES-v3.md](PROBES-v3.md). Each code block matches its `.pine` file byte for byte.
- Capture on BINANCE:BTCUSDT, 2-minute standard candles, UTC, normal live mode (Bar Replay off). Keep default inputs/styles. Save a setup/Inputs screenshot and record actual tickerid, timeframe, minimum tick and chart type.
- Load at least 100 historical bars before the reset; retain all loaded history. This is a capture floor, not proof every edge predicate was exercised. These minimal scripts have no bar-index control plot. Record the chart's dataset start separately; do not infer Pine bar_index from CSV row number.
- Save returned evidence under `captures/v3/` inside the shipped bundle. This capture directory and the per-attempt record are created by the operator; no v2 postprocessor or prefilled run status is bundled.

For each source:

1. Remove the previous probe and all other indicator instances. Open Pine Editor → new blank indicator; replace the entire buffer with the unchanged source from PROBES-v3.md, save using its filename, Add to chart. Verify exactly one active instance and its exact title.
2. Wait for recalculation. Clear/filter Pine Logs for this indicator, then perform a full browser page reload after history loading. Wait for the indicator to finish again; record reset UTC time. Do not change history, chart or settings before capture.
3. Compile error means Pine Editor rejection; runtime error means an indicator stop after addition. Record the observed status as COMPILE-ERROR, RUNTIME-ERROR or RUNS regardless of the prediction. Save full text, screenshot, code if exposed, line/call/argument and failing bar/time if provided. Keep unavailable fields null; never invent RE10001. An unrelated setup, entitlement, service or helper failure remains unresolved evidence for the target.
4. For RUNS, record the current live candle opening from the rightmost candle/crosshair tooltip on the UTC axis, with a chart/setup screenshot. Use chart menu → Export chart data (older label Download chart data), UNIX timestamps, including the current indicator and all loaded data. Screenshot export options. Confirm OUTCOME is actually included. A chart-only CSV after a failed indicator is not a success export.
5. Move/rename the untouched Downloads file to `captures/v3/<probe-stem>-attempt<N>.csv`. Preserve raw bytes, decimals, tiny signed values and blanks. Record original downloaded filename. Keep partial/failed exports as `<probe-stem>-attempt<N>-partial.csv`, explicitly marked failed evidence. Never replace a previous attempt.
6. Save diagnostics, Pine Logs and screenshots under `captures/v3/evidence/<probe-stem>-attempt<N>-...`. For RUNS retain the full OUTCOME sequence including blanks/na and relevant table/drawing screenshots. Acceptance or OUTCOME=1 alone does not establish clamping, formatting, appearance or intrabar persistence.
7. Append one record per attempt to `captures/v3/outcomes-v3.json` using the template below. Verify title, unchanged source/hash, exact outcome, output evidence and links before moving on. Record live opening and export times separately; if a live boundary/reset changed, mark uncertain and retain/recapture. Missing evidence remains UNKNOWN, never inferred from file modification time.
8. Continue through all 104 scripts even when a source fails. Do not combine scripts, change input defaults, repair a source, or convert generic constructors to typed ones. The first error in a combined script would hide later targets.

Numeric checklist:

None. All 104 scripts are outcome probes. RUNS attempts still need success CSV/value evidence; this is not a 60-field numeric replay batch.

Special evidence:

- Twelve bounds probes have unspecified outside-domain consequences. Observe compile refusal, runtime refusal, finite result or na. A documented domain does not specify the refusal stage or clamping rule.
- The 25 scalar/request/drawing contracts predict runtime rejection from current documentation, but exact native error code/text is unknown. Preserve a conflicting compile/success result rather than forcing the expected label. HMA length 1 is excluded because its native error is already captured.
- Malformed formatting probes must retain exact brace diagnostics and filtered Pine Logs. Woodie/developing must identify that combination. Time-coordinate line.get_price must identify the coordinate restriction.
- The original repeated-merge scalar probe has no intervening anchor reset. Its second merge is the target. The separate anchor-reset probe redefines the persistent table anchor every bar before repeating the same range: it needs at least two executions, preferably the full 100-bar floor. A first-bar success cannot settle it; save the table screenshot and any bar-1 diagnostic.
- Request errors must identify the deliberately invalid symbol/provider key or currency with the explicit false ignore-invalid flag. A network/service/subscription failure does not settle that contract.
- Drawing probes put one bar-index coordinate 501 bars into the future. Preserve the exact offending coordinate diagnostic and successful drawing evidence if accepted.
- Six varip probes test declaration eligibility for chart.point, footprint, volume_row, an enum, array<chart.point>, and map<int,float>. Record native compile/runtime/success before choosing between reference and manual predictions. Footprint/volume_row remain typed na; no feed/entitlement request is made. Their success does not prove persistence of populated objects or intrabar rollback behavior. The chart.point plot holds the first execution's close; keep the first chart OHLC/time and full OUTCOME CSV.
- Generic `array.new<bool>(3)` intentionally omits an initializer. Keep that exact constructor. Ternary OUTCOME=0 does not distinguish false from hypothetical na treated as false. Record acceptance/diagnostic and output without claiming the element's internal identity.

- String-format precision: record exact PRICE and THIRD from the table and both first-bar log.info messages. Copy Pine Logs text and take a table screenshot. The reference predicts THIRD=0.3333333333; the Strings manual predicts THIRD=0.33333333. Both predict PRICE=78477.5908. OUTCOME=1 and numeric CSV formatting cannot settle these strings.

- Missing array indices are isolated in two scripts: literal na and math.round(na). Record exact diagnostic or OUTCOME value/na. If math.round itself fails, retain that stage and do not attribute it to array.get.

- Empty-separator string splitting: copy the exact first-bar EMPTY and ABC size messages from Pine Logs. OUTCOME is an execution sentinel, not either size. Preserve any failure that masks the second observation.

Outcome checklist:

Each item requires the exact native status plus the success/error evidence in PROBES-v3.md. Expected outcomes are predictions; mark completion from evidence, not from agreement with the prediction.

1. [ ] `bounds-01-ta-percentile-nearest-rank-percentage--1-0.pine` — V3-BOUNDS-01; exact outcome + specified success/error evidence.
2. [ ] `bounds-02-ta-percentile-nearest-rank-percentage-101-0.pine` — V3-BOUNDS-02; exact outcome + specified success/error evidence.
3. [ ] `bounds-03-ta-percentile-linear-interpolation-percentage--1-0.pine` — V3-BOUNDS-03; exact outcome + specified success/error evidence.
4. [ ] `bounds-04-ta-percentile-linear-interpolation-percentage-101-0.pine` — V3-BOUNDS-04; exact outcome + specified success/error evidence.
5. [ ] `bounds-05-ta-valuewhen-occurrence--1.pine` — V3-BOUNDS-05; exact outcome + specified success/error evidence.
6. [ ] `bounds-06-str-repeat-repeat--1.pine` — V3-BOUNDS-06; exact outcome + specified success/error evidence.
7. [ ] `bounds-07-ta-pivot-point-levels-invalid-type.pine` — V3-BOUNDS-07; exact outcome + specified success/error evidence.
8. [ ] `bounds-08-color-rgb-component-or-transparency.pine` — V3-BOUNDS-08; exact outcome + specified success/error evidence.
9. [ ] `bounds-09-color-new-component-or-transparency.pine` — V3-BOUNDS-09; exact outcome + specified success/error evidence.
10. [ ] `bounds-10-label-set-size-text-size--1.pine` — V3-BOUNDS-10; exact outcome + specified success/error evidence.
11. [ ] `bounds-11-table-cell-text-size--1.pine` — V3-BOUNDS-11; exact outcome + specified success/error evidence.
12. [ ] `bounds-12-table-cell-set-text-size-text-size--1.pine` — V3-BOUNDS-12; exact outcome + specified success/error evidence.
13. [ ] `scalar-01-str-format-unbalanced-left-brace.pine` — V3-SCALAR-01; exact outcome + specified success/error evidence.
14. [ ] `scalar-02-log-info-unbalanced-left-brace.pine` — V3-SCALAR-02; exact outcome + specified success/error evidence.
15. [ ] `scalar-03-log-warning-unbalanced-left-brace.pine` — V3-SCALAR-03; exact outcome + specified success/error evidence.
16. [ ] `scalar-04-log-error-unbalanced-left-brace.pine` — V3-SCALAR-04; exact outcome + specified success/error evidence.
17. [ ] `scalar-05-ta-pivot-point-levels-Woodie-developing.pine` — V3-SCALAR-05; exact outcome + specified success/error evidence.
18. [ ] `scalar-06-line-get-price-time-xloc.pine` — V3-SCALAR-06; exact outcome + specified success/error evidence.
19. [ ] `scalar-07-table-merge-cells-merge-already-merged.pine` — V3-SCALAR-07; exact outcome + specified success/error evidence.
20. [ ] `request-01-request-financial-invalid-provider-key.pine` — V3-REQUEST-01; exact outcome + specified success/error evidence.
21. [ ] `request-02-request-quandl-invalid-provider-key.pine` — V3-REQUEST-02; exact outcome + specified success/error evidence.
22. [ ] `request-03-request-earnings-invalid-provider-key.pine` — V3-REQUEST-03; exact outcome + specified success/error evidence.
23. [ ] `request-04-request-dividends-invalid-provider-key.pine` — V3-REQUEST-04; exact outcome + specified success/error evidence.
24. [ ] `request-05-request-splits-invalid-provider-key.pine` — V3-REQUEST-05; exact outcome + specified success/error evidence.
25. [ ] `request-06-request-economic-invalid-provider-key.pine` — V3-REQUEST-06; exact outcome + specified success/error evidence.
26. [ ] `request-07-request-currency-rate-invalid-provider-key.pine` — V3-REQUEST-07; exact outcome + specified success/error evidence.
27. [ ] `drawing-01-line-new-future-index-501.pine` — V3-DRAWING-01; exact outcome + specified success/error evidence.
28. [ ] `drawing-02-line-set-x1-future-index-501.pine` — V3-DRAWING-02; exact outcome + specified success/error evidence.
29. [ ] `drawing-03-line-set-xy1-future-index-501.pine` — V3-DRAWING-03; exact outcome + specified success/error evidence.
30. [ ] `drawing-04-line-set-x2-future-index-501.pine` — V3-DRAWING-04; exact outcome + specified success/error evidence.
31. [ ] `drawing-05-box-set-left-future-index-501.pine` — V3-DRAWING-05; exact outcome + specified success/error evidence.
32. [ ] `drawing-06-box-set-right-future-index-501.pine` — V3-DRAWING-06; exact outcome + specified success/error evidence.
33. [ ] `drawing-07-label-new-future-index-501.pine` — V3-DRAWING-07; exact outcome + specified success/error evidence.
34. [ ] `drawing-08-label-set-x-future-index-501.pine` — V3-DRAWING-08; exact outcome + specified success/error evidence.
35. [ ] `drawing-09-label-set-xy-future-index-501.pine` — V3-DRAWING-09; exact outcome + specified success/error evidence.
36. [ ] `drawing-10-line-set-xy2-future-index-501.pine` — V3-DRAWING-10; exact outcome + specified success/error evidence.
37. [ ] `drawing-11-box-new-future-index-501.pine` — V3-DRAWING-11; exact outcome + specified success/error evidence.
38. [ ] `varip-01-chart-point.pine` — V3-VARIP-01; exact outcome + specified success/error evidence.
39. [ ] `varip-02-footprint.pine` — V3-VARIP-02; exact outcome + specified success/error evidence.
40. [ ] `varip-03-volume-row.pine` — V3-VARIP-03; exact outcome + specified success/error evidence.
41. [ ] `varip-04-enum.pine` — V3-VARIP-04; exact outcome + specified success/error evidence.
42. [ ] `varip-05-array-chart-point.pine` — V3-VARIP-05; exact outcome + specified success/error evidence.
43. [ ] `varip-06-map-int-float.pine` — V3-VARIP-06; exact outcome + specified success/error evidence.
44. [ ] `scalar-08-table-anchor-reset-identical-remerge.pine` — V3-TABLE-ANCHOR-RESET; exact outcome + specified success/error evidence.
45. [ ] `array-01-generic-bool-default.pine` — V3-GENERIC-BOOL-DEFAULT; exact outcome + specified success/error evidence.
46. [ ] `strings-01-tostring-default-precision.pine` — V3-TOSTRING-DEFAULT-PRECISION; exact outcome + specified success/error evidence.
47. [ ] `array-02-get-index-literal-na.pine` — V3-ARRAY-NA-INDEX-01; exact outcome + specified success/error evidence.
48. [ ] `array-03-get-index-math-round-na.pine` — V3-ARRAY-NA-INDEX-02; exact outcome + specified success/error evidence.
104. [ ] `strings-02-split-empty-separator-sizes.pine` — V3-SPLIT-EMPTY-SEPARATOR-SIZES; exact outcome + specified success/error evidence.
50. [ ] `history-01-negative-offset.pine` — V3-HISTORY-NEGATIVE-OFFSET; exact outcome + specified success/error evidence.
51. [ ] `history-02-unavailable-offset.pine` — V3-HISTORY-UNAVAILABLE-OFFSET; exact outcome + specified success/error evidence.
52. [ ] `plot-01-series-offset-v3.pine` — V3-PLOT-SERIES-OFFSET-PINE3; exact outcome + specified success/error evidence.
53. [ ] `plot-02-series-offset-v4.pine` — V3-PLOT-SERIES-OFFSET-PINE4; exact outcome + specified success/error evidence.
54. [ ] `ledger-division-v5-positive-const.pine` — LEDGER-613-DIV-POSITIVE-CONST; exact outcome + specified success/error evidence.
55. [ ] `ledger-division-v5-negative-numerator.pine` — LEDGER-613-DIV-NEGATIVE-NUMERATOR; exact outcome + specified success/error evidence.
56. [ ] `ledger-division-v5-negative-denominator.pine` — LEDGER-613-DIV-NEGATIVE-DENOMINATOR; exact outcome + specified success/error evidence.
57. [ ] `ledger-division-v5-both-negative.pine` — LEDGER-613-DIV-BOTH-NEGATIVE; exact outcome + specified success/error evidence.
58. [ ] `ledger-division-v5-negative-exact.pine` — LEDGER-613-DIV-NEGATIVE-EXACT; exact outcome + specified success/error evidence.
59. [ ] `ledger-division-v5-float-control.pine` — LEDGER-613-DIV-FLOAT-CONTROL; exact outcome + specified success/error evidence.
60. [ ] `ledger-division-v5-input-control.pine` — LEDGER-613-DIV-INPUT-CONTROL; exact outcome + specified success/error evidence.
61. [ ] `ledger-division-v4-positive-const.pine` — LEDGER-614-DIV-POSITIVE-CONST; exact outcome + specified success/error evidence.
62. [ ] `ledger-division-v4-negative-numerator.pine` — LEDGER-614-DIV-NEGATIVE-NUMERATOR; exact outcome + specified success/error evidence.
63. [ ] `ledger-division-v4-negative-denominator.pine` — LEDGER-614-DIV-NEGATIVE-DENOMINATOR; exact outcome + specified success/error evidence.
64. [ ] `ledger-division-v4-both-negative.pine` — LEDGER-614-DIV-BOTH-NEGATIVE; exact outcome + specified success/error evidence.
65. [ ] `ledger-division-v4-negative-exact.pine` — LEDGER-614-DIV-NEGATIVE-EXACT; exact outcome + specified success/error evidence.
66. [ ] `ledger-division-v4-float-control.pine` — LEDGER-614-DIV-FLOAT-CONTROL; exact outcome + specified success/error evidence.
67. [ ] `ledger-division-v4-input-control.pine` — LEDGER-614-DIV-INPUT-CONTROL; exact outcome + specified success/error evidence.
68. [ ] `strings-04-na-initializer.pine` — V3-STRING-NA-INITIALIZER; exact outcome + specified success/error evidence.
69. [ ] `strings-03-tostring-eleven-decimal-rounding.pine` — V3-TOSTRING-ELEVEN-DECIMAL-ROUNDING; exact outcome + specified success/error evidence.
70. [ ] `conditional-01-unmatched-string-if.pine` — V3-UNMATCHED-STRING-IF; exact outcome + specified success/error evidence.
71. [ ] `const-reference-array-accept-mutate.pine` — V3-CONST-REF-ARRAY-ACCEPT-MUTATE; exact outcome + specified success/error evidence.
72. [ ] `const-reference-array-qualifier-diagnostic.pine` — V3-CONST-REF-ARRAY-QUALIFIER-DIAGNOSTIC; exact outcome + specified success/error evidence.
73. [ ] `const-reference-array-replace-id.pine` — V3-CONST-REF-ARRAY-REPLACE-ID; exact outcome + specified success/error evidence.
74. [ ] `const-reference-matrix-accept-mutate.pine` — V3-CONST-REF-MATRIX-ACCEPT-MUTATE; exact outcome + specified success/error evidence.
75. [ ] `const-reference-matrix-qualifier-diagnostic.pine` — V3-CONST-REF-MATRIX-QUALIFIER-DIAGNOSTIC; exact outcome + specified success/error evidence.
76. [ ] `const-reference-matrix-replace-id.pine` — V3-CONST-REF-MATRIX-REPLACE-ID; exact outcome + specified success/error evidence.
77. [ ] `const-reference-map-accept-mutate.pine` — V3-CONST-REF-MAP-ACCEPT-MUTATE; exact outcome + specified success/error evidence.
78. [ ] `const-reference-map-qualifier-diagnostic.pine` — V3-CONST-REF-MAP-QUALIFIER-DIAGNOSTIC; exact outcome + specified success/error evidence.
79. [ ] `const-reference-map-replace-id.pine` — V3-CONST-REF-MAP-REPLACE-ID; exact outcome + specified success/error evidence.
80. [ ] `const-reference-line-accept-mutate.pine` — V3-CONST-REF-LINE-ACCEPT-MUTATE; exact outcome + specified success/error evidence.
81. [ ] `const-reference-line-qualifier-diagnostic.pine` — V3-CONST-REF-LINE-QUALIFIER-DIAGNOSTIC; exact outcome + specified success/error evidence.
82. [ ] `const-reference-line-replace-id.pine` — V3-CONST-REF-LINE-REPLACE-ID; exact outcome + specified success/error evidence.
83. [ ] `colors-new-dynamic-low-v1.pine` — V3-COLOR-NEW-DYNAMIC-LOW; exact outcome + specified success/error evidence.
84. [ ] `colors-new-dynamic-high-v1.pine` — V3-COLOR-NEW-DYNAMIC-HIGH; exact outcome + specified success/error evidence.
85. [ ] `colors-blue-constant-v1.pine` — V3-COLOR-BLUE-CONSTANT; exact outcome + specified success/error evidence.
86. [ ] `corpus-matrix-sum-namespace.pine` — V3-CORPUS-MATRIX-SUM-NAMESPACE; exact outcome + specified success/error evidence.
87. [ ] `corpus-matrix-sum-method.pine` — V3-CORPUS-MATRIX-SUM-METHOD; exact outcome + specified success/error evidence.
88. [ ] `corpus-matrix-float-to-int-id.pine` — V3-CORPUS-MATRIX-FLOAT-TO-INT-ID; exact outcome + specified success/error evidence.
89. [ ] `corpus-matrix-string-element.pine` — V3-CORPUS-MATRIX-STRING-ELEMENT; exact outcome + specified success/error evidence.
90. [ ] `corpus-array-string-element.pine` — V3-CORPUS-ARRAY-STRING-ELEMENT; exact outcome + specified success/error evidence.
91. [ ] `corpus-array-string-percentile.pine` — V3-CORPUS-ARRAY-STRING-PERCENTILE; exact outcome + specified success/error evidence.
92. [ ] `corpus-v6-na-bool.pine` — V3-CORPUS-V6-NA-BOOL; exact outcome + specified success/error evidence.
93. [ ] `corpus-fill-optional-color.pine` — V3-CORPUS-FILL-OPTIONAL-COLOR; exact outcome + specified success/error evidence.
94. [ ] `corpus-hline-chart-point.pine` — V3-CORPUS-HLINE-CHART-POINT; exact outcome + specified success/error evidence.
95. [ ] `corpus-hline-matrix.pine` — V3-CORPUS-HLINE-MATRIX; exact outcome + specified success/error evidence.
96. [ ] `corpus-fractional-series-division-int.pine` — V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT; exact outcome + specified success/error evidence.
97. [ ] `corpus-fractional-timeframe-division-int.pine` — V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT; exact outcome + specified success/error evidence.
98. [ ] `corpus-v5-tuple-call-target.pine` — V3-CORPUS-V5-TUPLE-CALL-TARGET; exact outcome + specified success/error evidence.
99. [ ] `corpus-v5-ellipsis-placeholder.pine` — V3-CORPUS-V5-ELLIPSIS-PLACEHOLDER; exact outcome + specified success/error evidence.
100. [ ] `corpus-v5-unary-plus-string.pine` — V3-CORPUS-V5-UNARY-PLUS-STRING; exact outcome + specified success/error evidence.
101. [ ] `corpus-v5-unknown-cbrt.pine` — V3-CORPUS-V5-UNKNOWN-CBRT; exact outcome + specified success/error evidence.
102. [ ] `corpus-v5-unknown-hypot.pine` — V3-CORPUS-V5-UNKNOWN-HYPOT; exact outcome + specified success/error evidence.
103. [ ] `corpus-footprint-missing-ticks.pine` — V3-CORPUS-FOOTPRINT-MISSING-TICKS; exact outcome + specified success/error evidence.
104. [ ] `corpus-function-value-shared-name.pine` — V3-CORPUS-FUNCTION-VALUE-SHARED-NAME; exact outcome + specified success/error evidence.

Return protocol:

- Return the unchanged source bundle plus the entire `captures/v3/` folder, including every attempt, original CSVs, diagnostics, screenshots and `outcomes-v3.json`. Do not edit the handoff or expected predictions to match observations.
- Include `captures/v3/RESPONSE-v3.md` with operator, batch start/end UTC, chart setup, scripts attempted/completed, missing evidence, service failures and any uncertain reset/live boundary. Unknowns stay explicit. Keep v2 returns separate.
- Send the archive folder/zip back through the same handoff channel. This staging task does not authorize a repository push or merge. The parity overseer adjudicates native results against each documented claim afterward.

Per-attempt record template (create an array of 104 or more records in `captures/v3/outcomes-v3.json`; one record for every actual attempt):

```json
{
  "script": "<original filename>.pine",
  "attempt": 1,
  "source_sha256": "<hash from PROBES-v3.md>",
  "indicator_title": "<exact title>",
  "status": "UNKNOWN",
  "csv_file": null,
  "original_download_filename": null,
  "partial_csv_file": null,
  "diagnostic": {"code": null, "text": null, "line": null, "column": null, "first_bar_index": null, "first_bar_time_utc": null},
  "setup": {"tickerid": "BINANCE:BTCUSDT", "timeframe": "2", "chart_type": "standard candles", "timezone": "UTC", "bar_replay": false, "mintick": null, "defaults_confirmed": null, "dataset_start_utc": null},
  "reset_utc": null,
  "live_candle_open_utc": null,
  "export_utc": null,
  "live_boundary_confirmed_unchanged": null,
  "evidence_files": [],
  "notes": null
}
```

Replace UNKNOWN with COMPILE-ERROR, RUNTIME-ERROR or RUNS only after observing the attempt. Use paths relative to the bundle root. Leave csv_file null when no successful indicator export exists. An error before OUTCOME creates no success CSV requirement; the complete diagnostic is its primary evidence. Preserve partial exports separately.

Bundle integrity: [bundle-manifest-v3.json](bundle-manifest-v3.json) records source hashes; [expected-outcome-v3.json](expected-outcome-v3.json) preserves per-authority predictions. [validation-v3.json](validation-v3.json) records earlier local parsing/hash/one-plot checks, not native approval; corpus-local-validation-v3.json separately records intentionally rejected corpus probes. There is no `postprocess-v3.py`; byte/hash/header inspection and adjudication are performed after return. Do not run v2's numeric processor on these minimal outcome exports.

- Gaps6 rounding probe: copy exact POSITIVE and NEGATIVE table/log strings; OUTCOME=1 only records execution. The eleven-fractional-digit literal distinguishes the archived eight/ten-place predictions. See [LEDGER-GAPS-6-v3.md](LEDGER-GAPS-6-v3.md).

- Gaps6 unmatched string: OUTCOME=1 identifies na, 2 identifies the defined empty string, 3 another defined string. Retain the full CSV plus exact RESULT table/log text. Preserve instrumentation errors separately from a masked conditional result.

- Separate gaps6 rank240 initializer conflict: keep const string absent = na unchanged. OUTCOME=1 identifies missing text, 2 defined empty text, 3 another defined string. Retain exact INITIALIZER log/table evidence; this isolates the premise of the conditional cast witness.

- Ledger history/offset probes: keep Pine v3/v4 study declarations and v6 history declarations unchanged. Capture literal negative and unavailable history outcomes without assuming an error or na. For accepted series plot offsets, retain timestamp/price placement screenshots across both offset signs and the latest offset/update; CSV acceptance alone does not establish rendered displacement.

- Nineteen non-host corpus witnesses: see [CORPUS-REJECTS-v3.md](CORPUS-REJECTS-v3.md) for row/owner mapping and original hashes. These probes are intentionally allowed to fail compilation. Preserve source versions and exact diagnostics. The fill probe has two additional handle plots FILL_FIRST/FILL_SECOND and one OUTCOME sentinel; its total plot budget is three. The other eighteen have one plot. A missing footprint entitlement does not establish a missing-argument diagnostic. Ten host-import rows remain BLOCKED-HOST on Sam's library-source decision and are excluded.

## Supplementary scripts (7, not in the 104-script manifest)

Run these after the 104, with the same procedure and the same per-attempt `outcomes-v3.json` records.

- Six conflict probes `conflicts-CF0*-v3.pine`: follow [conflicts-capture-guide-v3.md](conflicts-capture-guide-v3.md). These need numeric CSV exports (several plots each), not just an outcome. Sources/hashes: `conflicts-outcomes-manifest-v3.json`; competing predictions: `conflicts-expected-outcome-v3.json`. They decide doc conflicts the v2 captures could not (matrix default row/column, text wrap vs size, ATR guards, WMA hole runs).
- `scalar-09-nz-legacy-bool-default-v1.pine`: outcome probe; OUTCOME 0 = false, -1 = na, 1 = true. Prediction in `nz-legacy-bool-default-outcome-v1.json`.

## What these settle

Docs-vs-docs conflicts, corpus scripts we refuse that TradingView may accept, const reference handles, varip eligibility, ledger rows whose behaviour no document pins down. Priority if time is short: the 6 conflict probes, then `const-reference-*`, then `corpus-*`, then the rest in checklist order.
