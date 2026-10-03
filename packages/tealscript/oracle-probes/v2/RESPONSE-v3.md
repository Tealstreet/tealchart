# TradingView capture response v3

Source bundle revision v3 pulled from master `8f95734802`. Numeric checkpoint committed/pushed as `0977b1cba9`; this response includes the isolated outcomes and supplemental compiler evidence. It supersedes the checkpoint’s plot-mapping/readiness claim in [RESPONSE-v2.md](RESPONSE-v2.md).

**All 52 supplied probes were attempted unchanged: 43 RUNS, seven COMPILE-ERROR, two RUNTIME-ERROR.** Numeric: 24 run and three fail compilation. Isolated outcomes: 19 run, four fail compilation, two fail at runtime. No scripts, normalized maps, postprocessor, runtime, or handoff were changed to get an accepted result.

There are 60 recorded attempts and 47 raw CSV files, including every uncertain/mismatched repeat. The supplied postprocessor reports 40 selected FILE-READY captures, one selected NEEDS-EVIDENCE plot capture, and two duplicate-header parse errors. FILE-READY validates a capture file; it does not establish Pine/TealScript parity or complete request-context replay.

Capture batch UTC: 2026-10-03T12:13:14.087265+00:00 to 2026-10-03T13:30:21.303397+00:00. Numeric checkpoint ended 2026-10-03T12:59:16.520217+00:00. First recorded isolated-outcome reset: 2026-10-03T13:01:23.055Z; this is not an inferred paste/start time. Supplemental evidence and integrity checks continued through 2026-10-03T13:36:46.118602+00:00.

## Capture method and evidence

Chrome MCP operated TradingView on BINANCE:BTCUSDT, standard two-minute candles, Etc/UTC, normal live mode, unchanged inputs/styles. Each source was installed into a new indicator and its entire Monaco buffer checked for equality. Previous indicators were removed. Successful exports were guarded by exactly one active expected indicator and native RUNS status.

A full page reload restored the native chart configuration with initial bar spacing 0.02, loading all available history before the recorded reset/capture. Selected successful captures start at Pine index0, 2026-08-31T00:00:00Z. No extra history requests or chart/input changes occurred between the selected reset and export. Live cutoff comes from the rendered rightmost-candle time-axis tooltip, with a setup screenshot and before/after live-candle checks. Raw live rows remain in the files; compare only timestamps strictly before that attempt’s observed cutoff.

CSV bytes were copied directly from browser downloads. All recorded hashes and download-byte comparisons passed. [capture-audit-v2.json](captures/v2/capture-audit-v2.json) checks all supplied source digests, CSV bytes, and evidence paths. [capture-notes-v3.json](captures/v2/capture-notes-v3.json) records per-attempt UI/reset/cutoff data, selected attempts, input changes, and paths. [manifest-v2.json](captures/v2/manifest-v2.json) is the unchanged supplied postprocessor’s derived result.

Each successful isolated outcome has at least 24,150 historical rows and all HOST/CF outputs. [outcome-observations-v1.json](captures/v2/outcome-observations-v1.json) additionally retains every raw string for bars0..99 plus the last historical row, preserving empty strings as missingness. Full native CSV precision is available for every intervening row. This is a native observation extract, not an A/B replay.

Pine Logs were enabled for the current indicator before reset. All native study log entries present at collection time are saved as exact message text plus JSON retaining source positions, fractional millisecond message times, and bar times; screenshots corroborate the panel. This does not claim to capture future live messages after collection. Every successful outcome has the exact HOST message `HOST tickerid=BINANCE:BTCUSDT period=2 mintick=0.01`. Batch1 CF024 is `1.123456789`; CF029 is `1.00`.

## Errors for probe authors

All failures below are native TradingView results from unchanged supplied sources. No success CSV was exported for a stopped/rejected probe. Compile-error repeats collect the complete Monaco diagnostic set, not only the first chart error. Raw native diagnostic/context, rendered UI text, source line/column, and screenshots are linked by each attempt in [outcomes-v2.json](captures/v2/outcomes-v2.json).

### coverage-strings-color-1-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/coverage-strings-color-1-v1-attempt2-error.txt), attempt 2.

- `CE10275` line 78, column 27, severity 8: timestamp(s): unrecognized datetime format

### coverage-time-2-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/coverage-time-2-v1-attempt2-error.txt), attempt 2.

- `CE10294` line 33, column 6, severity 8: resolution.trim is not a function

### coverage-drawing-2-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/coverage-drawing-2-v1-attempt2-error.txt), attempt 2.

- `CE10123` line 78, column 37, severity 8: Cannot call "operator ==" with argument "expr0"="call "array.get" (series linefill)". An argument of "series linefill" type was used but a "simple string"  is expected.
- `CE10123` line 78, column 94, severity 8: Cannot call "operator ==" with argument "expr1"="other". An argument of "series linefill" type was used but a "simple string"  is expected.

### conflicts-batch-4-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt), attempt 2.

- `CE10123` line 19, column 18, severity 8: Cannot call "array.every" with argument "id"="cf003_a". An argument of "array<int>" type was used but a "array<bool>"  is expected.
- `CE10123` line 20, column 17, severity 8: Cannot call "array.some" with argument "id"="cf003_a". An argument of "array<int>" type was used but a "array<bool>"  is expected.
- `CE10123` line 21, column 18, severity 8: Cannot call "array.every" with argument "id"="cf003_b". An argument of "array<float>" type was used but a "array<bool>"  is expected.

### conflicts-batch-9-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-9-v1-attempt1-error.txt), attempt 1.

- `CE10165` line 18, column 1, severity 8: No value assigned to the "text_formatting" parameter in box.set_text_formatting()

### conflicts-batch-10-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-10-v1-attempt1-error.txt), attempt 1.

- `CE10165` line 18, column 1, severity 8: No value assigned to the "text_formatting" parameter in label.set_text_formatting()

### conflicts-batch-11-v1.pine — COMPILE-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-11-v1-attempt1-error.txt), attempt 1.

- `CE10165` line 19, column 1, severity 8: No value assigned to the "text_formatting" parameter in table.cell_set_text_formatting()

### conflicts-batch-23-v1.pine — RUNTIME-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-23-v1-attempt1-error.txt), attempt 1.

- `CW10023` line 17, column 9, severity 4: The argument for the `formatString` parameter for `str.format` expects 0 value(s), but received 1 value(s).

Runtime: Error on bar 0: Unmatched braces in the pattern.

Failing call: source line17 (`str.format`); native stack trace and failing bar0 are retained.

### conflicts-batch-24-v1.pine — RUNTIME-ERROR

[Exact error evidence](captures/v2/evidence/conflicts-batch-24-v1-attempt1-error.txt), attempt 1.

Error on bar 0: Cannot format given Object as a Number

Failing call: source line17 (`str.format`); native stack trace and failing bar0 are retained.

## Isolated outcome observations

The values below are observations from the selected CSVs; the processors decide which claims they settle. Startup blanks and every numeric relation are preserved in the full files and the first100-row observation extract.

| Batch / claim | Outcome | Observed native values or evidence |
|---|---|---|
| 3 / CF001 | [RUNS, attempt1](captures/v2/conflicts-batch-3-v1.csv) | CF001_min_omitted=2; CF001_max_omitted=9; CF001_min_explicit=2 |
| 4 / CF003 | COMPILE-ERROR | Cannot call "array.every" with argument "id"="cf003_a". An argument of "array<int>" type was used but a "array<bool>"  is expected. |
| 5 / CF005 | [RUNS, attempt1](captures/v2/conflicts-batch-5-v1.csv) | CF005_search_string=1; CF005_left_string=1; CF005_right_string=1 |
| 6 / CF008 | [RUNS, attempt1](captures/v2/conflicts-batch-6-v1.csv) | CF008_enum_size=2; CF008_enum_value=1; CF008_udt_value=20 |
| 7 / CF010 | [RUNS, attempt1](captures/v2/conflicts-batch-7-v1.csv) | Input color red; sentinel1. Supplemental unchanged-install Inputs screenshot is identified in notes; it is not claimed simultaneous with the original export. |
| 8 / CF011 | [RUNS, attempt1](captures/v2/conflicts-batch-8-v1.csv) | Sentinel1; separate post-export screenshot visibly shows red at hline100 grading to blue at hline0. |
| 9 / CF012 | COMPILE-ERROR | No value assigned to the "text_formatting" parameter in box.set_text_formatting() |
| 10 / CF013 | COMPILE-ERROR | No value assigned to the "text_formatting" parameter in label.set_text_formatting() |
| 11 / CF014 | COMPILE-ERROR | No value assigned to the "text_formatting" parameter in table.cell_set_text_formatting() |
| 14 / CF016 const | [RUNS, attempt1](captures/v2/conflicts-batch-14-v1.csv) | CF016a_const_result=1.13 |
| 15 / CF016 input | [RUNS, attempt1](captures/v2/conflicts-batch-15-v1.csv) | Default Round input2.125 photographed; result2.13, consumer equals the native close in the raw rows. |
| 16 / CF017 | [RUNS, attempt1](captures/v2/conflicts-batch-16-v1.csv) | CF017_rows=3; CF017_columns=2; CF017_new_is_na=1 |
| 17 / CF018 | [RUNS, attempt1](captures/v2/conflicts-batch-17-v1.csv) | CF018_rows=2; CF018_columns=3; CF018_new_is_na=1 |
| 18 / CF019 | [RUNS, attempt1](captures/v2/conflicts-batch-18-v1.csv) | CF019_remaining_rows=1; CF019_remaining_columns=2; CF019_removed_size=2 |
| 19 / CF020 | [RUNS, attempt1](captures/v2/conflicts-batch-19-v1.csv) | CF020_remaining_rows=2; CF020_remaining_columns=1; CF020_removed_size=2 |
| 20 / CF022 | [RUNS, attempt1](captures/v2/conflicts-batch-20-v1.csv) | CF022_vector_size=2; CF022_first=17; CF022_second=39 |
| 21 / CF023 | [RUNS, attempt2](captures/v2/conflicts-batch-21-v1-attempt2.csv) | CF023_object_state=99; CF023_map_size=1; CF023_values_size=2 |
| 22 / CF025 | [RUNS, attempt1](captures/v2/conflicts-batch-22-v1.csv) | CF025_omitted_end=1; CF025_length=4 |
| 23 / CF027 | RUNTIME-ERROR | Error on bar 0: Unmatched braces in the pattern. |
| 24 / CF028 | RUNTIME-ERROR | Error on bar 0: Cannot format given Object as a Number |
| 25 / CF030 | [RUNS, attempt1](captures/v2/conflicts-batch-25-v1.csv) | CF030_m_length=1; CF030_s_length=3; CF030_m_whole=0; CF030_s_whole=1 |
| 26 / CF032 | [RUNS, attempt1](captures/v2/conflicts-batch-26-v1.csv) | ALMA omitted-floor, explicit-false and explicit-true values for every row; startup missingness retained. |
| 27 / CF033 | [RUNS, attempt1](captures/v2/conflicts-batch-27-v1.csv) | Change omitted-length, explicit-one and explicit-two values for every row; startup missingness retained. |
| 28 / CF037 | [RUNS, attempt1](captures/v2/conflicts-batch-28-v1.csv) | Keltner Channel upper values from omitted and explicit true useTrueRange arguments, for every row including startup missingness. |
| 29 / CF038 | [RUNS, attempt2](captures/v2/conflicts-batch-29-v1-attempt2.csv) | Keltner Channel width values from omitted and explicit true useTrueRange arguments, for every row including startup missingness. |

## Remaining evidence gaps

- `coverage-req-1-v1.csv` and `coverage-drawing-1-v1.csv` run and export 65 ordered fields, but repeat native/plot time and OHLC headers. The supplied postprocessor refuses them with `Empty rows or duplicate/missing headers`; it exits1. Raw bytes are retained. Separate [request positional metadata](captures/v2/evidence/coverage-req-1-v1-positional-metadata-v1.json) and [drawing positional metadata](captures/v2/evidence/coverage-drawing-1-v1-positional-metadata-v1.json) confirm full contiguous index0 history using unique explicit plotted index controls. They do not rename duplicate headers, repair the processor, or establish a complete field mapping.
- `coverage-plot-1-v1.csv` is NEEDS-EVIDENCE: Data Window repeats each OHLC plot title without channel labels. The handoff explicitly forbids assuming suffix/order, so column_map is empty and mapping UNKNOWN. Finite case0 screenshots, native metainfo, raw ordered export headers, and candidate label evidence are preserved in [mapping evidence v2](captures/v2/evidence/coverage-plot-1-v1-attempt1-mapping-v2.json). The earlier checkpoint accepted those candidate CSV labels; this response corrects that readiness claim.
- Native requested1m data starts 2026-09-14, later than the probes’ 2026-08-31 start. Original requested1m index/start is UNKNOWN and dependent replay remains blocked. Both request `.contexts-v2.json` files preserve this limitation. Native6m data is clipped to the requested index0/time/first-close witness; the original uncut datasets are in `evidence/native-contexts-v1.json`. No synthetic minute feed was substituted.
- Drawing3/4 index validation uses the supplied conditional getter relations. These do not create independent index controls. Numeric drawing/plot exports do not establish appearance, colors, fill rendering, or object-formatting parity. Batch8 has separate gradient appearance evidence; batches9–11 fail compilation, so no prior-bold-reset appearance result is claimed.
- Batch24 stops at bar0 before emitting a successful formatted-array result. Exact array text/length/nonempty success evidence is consequently unavailable; the runtime error itself is the result.

## Per-attempt return log

Capture UTC means successful export time or error-observation time; it is not inferred from a file modification time. Unknowns are explicit. Selected attempts are named in notes. All evidence filenames remain relative to this bundle.

| Probe / attempt | Selected | CSV or error evidence | Capture/error UTC | Reset UTC | Observed live open UTC | Status |
|---|---|---|---|---|---|---|
| primitives-sma-stdev-v1.pine / 1 | no | [evidence](captures/v2/primitives-sma-stdev-v1.csv) | unknown | 2026-10-03T12:17:30.495Z | 2026-10-03T12:16:00Z | NEEDS-EVIDENCE |
| primitives-sma-stdev-v1.pine / 2 | yes | [evidence](captures/v2/primitives-sma-stdev-v1-attempt2.csv) | 2026-10-03T12:22:58.308Z | 2026-10-03T12:22:51.349Z | 2026-10-03T12:22:00.000Z | FILE-READY |
| coverage-register-ta-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-register-ta-1-v1.csv) | 2026-10-03T12:24:39.851Z | 2026-10-03T12:24:33.727Z | 2026-10-03T12:24:00.000Z | FILE-READY |
| warmup-seed-ma-v2.pine / 1 | yes | [evidence](captures/v2/warmup-seed-ma-v2.csv) | 2026-10-03T12:25:19.962Z | 2026-10-03T12:25:13.923Z | 2026-10-03T12:24:00.000Z | FILE-READY |
| mfi-flat-flows-v2.pine / 1 | yes | [evidence](captures/v2/mfi-flat-flows-v2.csv) | 2026-10-03T12:26:12.259Z | 2026-10-03T12:26:05.971Z | 2026-10-03T12:26:00.000Z | FILE-READY |
| coverage-ta-2-v1.pine / 1 | yes | [evidence](captures/v2/coverage-ta-2-v1.csv) | 2026-10-03T12:26:41.125Z | 2026-10-03T12:26:33.838Z | 2026-10-03T12:26:00.000Z | FILE-READY |
| coverage-ta-3-v1.pine / 1 | yes | [evidence](captures/v2/coverage-ta-3-v1.csv) | 2026-10-03T12:27:13.832Z | 2026-10-03T12:27:06.637Z | 2026-10-03T12:26:00.000Z | FILE-READY |
| coverage-tad-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-tad-1-v1.csv) | 2026-10-03T12:28:22.618Z | 2026-10-03T12:28:15.257Z | 2026-10-03T12:28:00.000Z | FILE-READY |
| coverage-ta-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-ta-1-v1.csv) | 2026-10-03T12:28:56.143Z | 2026-10-03T12:28:45.969Z | 2026-10-03T12:28:00.000Z | FILE-READY |
| coverage-tab-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-tab-1-v1.csv) | 2026-10-03T12:30:10.781Z | 2026-10-03T12:30:00.689Z | 2026-10-03T12:30:00.000Z | FILE-READY |
| coverage-history-na-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-history-na-1-v1.csv) | 2026-10-03T12:30:50.284Z | 2026-10-03T12:30:43.921Z | 2026-10-03T12:30:00.000Z | FILE-READY |
| coverage-math-1-v1.pine / 1 | no | [evidence](captures/v2/coverage-math-1-v1.csv) | 2026-10-03T12:31:49.291Z | 2026-10-03T12:31:42.850Z | 2026-10-03T12:30:00.000Z | NEEDS-EVIDENCE / CAPTURE-MISMATCH |
| coverage-math-1-v1.pine / 2 | yes | [evidence](captures/v2/coverage-math-1-v1-attempt2.csv) | 2026-10-03T12:33:05.416Z | 2026-10-03T12:32:56.938Z | 2026-10-03T12:32:00.000Z | FILE-READY |
| coverage-math-2-v1.pine / 1 | yes | [evidence](captures/v2/coverage-math-2-v1.csv) | 2026-10-03T12:33:56.180Z | 2026-10-03T12:33:48.927Z | 2026-10-03T12:32:00.000Z | FILE-READY |
| coverage-request-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-request-1-v1.csv) | 2026-10-03T12:35:22.081Z | 2026-10-03T12:35:14.664Z | 2026-10-03T12:34:00.000Z | FILE-READY |
| coverage-req-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-req-1-v1.csv) | 2026-10-03T12:36:06.577Z | 2026-10-03T12:36:00.071Z | 2026-10-03T12:36:00.000Z | RUNS / POSTPROCESS-BLOCKED |
| coverage-collections-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-collections-1-v1.csv) | 2026-10-03T12:39:41.124Z | 2026-10-03T12:39:34.438Z | 2026-10-03T12:38:00.000Z | FILE-READY |
| coverage-collections-2-v1.pine / 1 | yes | [evidence](captures/v2/coverage-collections-2-v1.csv) | 2026-10-03T12:40:24.465Z | 2026-10-03T12:40:18.271Z | 2026-10-03T12:40:00.000Z | FILE-READY |
| coverage-strings-color-1-v1.pine / 1 | no | [evidence](captures/v2/evidence/coverage-strings-color-1-v1-attempt1-error.txt) | 2026-10-03T12:41:52.543Z | 2026-10-03T12:41:00.363Z | unknown | COMPILE-ERROR |
| coverage-plot-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-plot-1-v1.csv) | 2026-10-03T12:43:48.563Z | 2026-10-03T12:42:28.522Z | 2026-10-03T12:42:00.000Z | NEEDS-EVIDENCE |
| conflicts-batch-1-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-1-v1.csv) | 2026-10-03T12:47:44.094Z | 2026-10-03T12:46:23.878Z | 2026-10-03T12:46:00.000Z | FILE-READY |
| conflicts-batch-2-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-2-v1.csv) | 2026-10-03T12:48:30.024Z | 2026-10-03T12:48:22.076Z | 2026-10-03T12:48:00.000Z | FILE-READY |
| coverage-ta-4-v1.pine / 1 | yes | [evidence](captures/v2/coverage-ta-4-v1.csv) | 2026-10-03T12:51:46.991Z | 2026-10-03T12:51:38.814Z | 2026-10-03T12:50:00.000Z | FILE-READY |
| coverage-time-2-v1.pine / 1 | no | [evidence](captures/v2/evidence/coverage-time-2-v1-attempt1-error.txt) | 2026-10-03T12:52:41.626Z | 2026-10-03T12:52:38.599Z | unknown | COMPILE-ERROR |
| coverage-matrix-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-matrix-1-v1.csv) | 2026-10-03T12:53:13.242Z | 2026-10-03T12:53:05.841Z | 2026-10-03T12:52:00.000Z | FILE-READY |
| coverage-drawing-1-v1.pine / 1 | yes | [evidence](captures/v2/coverage-drawing-1-v1.csv) | 2026-10-03T12:54:13.357Z | 2026-10-03T12:54:06.122Z | 2026-10-03T12:54:00.000Z | RUNS / POSTPROCESS-BLOCKED |
| coverage-drawing-2-v1.pine / 1 | no | [evidence](captures/v2/evidence/coverage-drawing-2-v1-attempt1-error.txt) | 2026-10-03T12:55:19.600Z | 2026-10-03T12:55:16.696Z | unknown | COMPILE-ERROR |
| coverage-drawing-3-v1.pine / 1 | yes | [evidence](captures/v2/coverage-drawing-3-v1.csv) | 2026-10-03T12:55:59.125Z | 2026-10-03T12:55:52.208Z | 2026-10-03T12:54:00.000Z | FILE-READY |
| coverage-drawing-4-v1.pine / 1 | yes | [evidence](captures/v2/coverage-drawing-4-v1.csv) | 2026-10-03T12:57:10.571Z | 2026-10-03T12:57:03.304Z | 2026-10-03T12:56:00.000Z | FILE-READY |
| conflicts-batch-3-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-3-v1.csv) | 2026-10-03T13:01:29.713Z | 2026-10-03T13:01:23.055Z | 2026-10-03T13:00:00.000Z | FILE-READY |
| conflicts-batch-4-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-4-v1-attempt1-error.txt) | 2026-10-03T13:02:40.362Z | unknown | unknown | COMPILE-ERROR |
| conflicts-batch-5-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-5-v1.csv) | 2026-10-03T13:02:58.278Z | 2026-10-03T13:02:51.947Z | 2026-10-03T13:02:00.000Z | FILE-READY |
| conflicts-batch-6-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-6-v1.csv) | 2026-10-03T13:03:34.728Z | 2026-10-03T13:03:28.552Z | 2026-10-03T13:02:00.000Z | FILE-READY |
| conflicts-batch-7-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-7-v1.csv) | 2026-10-03T13:08:37.302Z | 2026-10-03T13:08:30.431Z | 2026-10-03T13:08:00.000Z | FILE-READY |
| conflicts-batch-8-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-8-v1.csv) | 2026-10-03T13:09:18.222Z | 2026-10-03T13:09:09.423Z | 2026-10-03T13:08:00.000Z | FILE-READY |
| conflicts-batch-9-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-9-v1-attempt1-error.txt) | 2026-10-03T13:10:26.047Z | unknown | unknown | COMPILE-ERROR |
| conflicts-batch-10-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-10-v1-attempt1-error.txt) | 2026-10-03T13:10:36.157Z | unknown | unknown | COMPILE-ERROR |
| conflicts-batch-11-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-11-v1-attempt1-error.txt) | 2026-10-03T13:10:46.726Z | unknown | unknown | COMPILE-ERROR |
| conflicts-batch-14-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-14-v1.csv) | 2026-10-03T13:11:24.877Z | 2026-10-03T13:11:17.779Z | 2026-10-03T13:10:00.000Z | FILE-READY |
| conflicts-batch-15-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-15-v1.csv) | 2026-10-03T13:12:09.454Z | 2026-10-03T13:11:59.884Z | 2026-10-03T13:12:00.000Z | FILE-READY |
| conflicts-batch-16-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-16-v1.csv) | 2026-10-03T13:14:11.605Z | 2026-10-03T13:13:59.807Z | 2026-10-03T13:14:00.000Z | FILE-READY |
| conflicts-batch-17-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-17-v1.csv) | 2026-10-03T13:15:01.272Z | 2026-10-03T13:14:51.763Z | 2026-10-03T13:14:00.000Z | FILE-READY |
| conflicts-batch-18-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-18-v1.csv) | 2026-10-03T13:15:51.256Z | 2026-10-03T13:15:42.687Z | 2026-10-03T13:14:00.000Z | FILE-READY |
| conflicts-batch-19-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-19-v1.csv) | 2026-10-03T13:16:33.472Z | 2026-10-03T13:16:25.279Z | 2026-10-03T13:16:00.000Z | FILE-READY |
| conflicts-batch-20-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-20-v1.csv) | 2026-10-03T13:17:25.835Z | 2026-10-03T13:17:19.669Z | 2026-10-03T13:16:00.000Z | FILE-READY |
| conflicts-batch-21-v1.pine / 1 | no | [evidence](captures/v2/conflicts-batch-21-v1.csv) | 2026-10-03T13:18:05.311Z | 2026-10-03T13:17:57.217Z | 2026-10-03T13:16:00.000Z | NEEDS-EVIDENCE |
| conflicts-batch-21-v1.pine / 2 | yes | [evidence](captures/v2/conflicts-batch-21-v1-attempt2.csv) | 2026-10-03T13:19:00.255Z | 2026-10-03T13:18:48.352Z | 2026-10-03T13:18:00.000Z | FILE-READY |
| conflicts-batch-22-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-22-v1.csv) | 2026-10-03T13:19:45.543Z | 2026-10-03T13:19:35.301Z | 2026-10-03T13:18:00.000Z | FILE-READY |
| conflicts-batch-23-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-23-v1-attempt1-error.txt) | 2026-10-03T13:20:32.892Z | unknown | unknown | RUNTIME-ERROR |
| conflicts-batch-24-v1.pine / 1 | no | [evidence](captures/v2/evidence/conflicts-batch-24-v1-attempt1-error.txt) | 2026-10-03T13:20:44.731Z | unknown | unknown | RUNTIME-ERROR |
| conflicts-batch-25-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-25-v1.csv) | 2026-10-03T13:21:17.959Z | 2026-10-03T13:21:11.682Z | 2026-10-03T13:20:00.000Z | FILE-READY |
| conflicts-batch-26-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-26-v1.csv) | 2026-10-03T13:21:57.273Z | 2026-10-03T13:21:51.476Z | 2026-10-03T13:20:00.000Z | FILE-READY |
| conflicts-batch-27-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-27-v1.csv) | 2026-10-03T13:22:42.417Z | 2026-10-03T13:22:35.476Z | 2026-10-03T13:22:00.000Z | FILE-READY |
| conflicts-batch-28-v1.pine / 1 | yes | [evidence](captures/v2/conflicts-batch-28-v1.csv) | 2026-10-03T13:23:20.228Z | 2026-10-03T13:23:14.154Z | 2026-10-03T13:22:00.000Z | FILE-READY |
| conflicts-batch-29-v1.pine / 1 | no | [evidence](captures/v2/conflicts-batch-29-v1.csv) | 2026-10-03T13:24:03.687Z | 2026-10-03T13:23:57.566Z | 2026-10-03T13:22:00.000Z | NEEDS-EVIDENCE |
| conflicts-batch-4-v1.pine / 2 | no | [evidence](captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt) | 2026-10-03T13:24:34.800Z | unknown | unknown | COMPILE-ERROR |
| conflicts-batch-29-v1.pine / 2 | yes | [evidence](captures/v2/conflicts-batch-29-v1-attempt2.csv) | 2026-10-03T13:25:14.004Z | 2026-10-03T13:25:07.820Z | 2026-10-03T13:24:00.000Z | FILE-READY |
| coverage-strings-color-1-v1.pine / 2 | no | [evidence](captures/v2/evidence/coverage-strings-color-1-v1-attempt2-error.txt) | 2026-10-03T13:26:49.649Z | unknown | unknown | COMPILE-ERROR |
| coverage-time-2-v1.pine / 2 | no | [evidence](captures/v2/evidence/coverage-time-2-v1-attempt2-error.txt) | 2026-10-03T13:27:00.277Z | unknown | unknown | COMPILE-ERROR |
| coverage-drawing-2-v1.pine / 2 | no | [evidence](captures/v2/evidence/coverage-drawing-2-v1-attempt2-error.txt) | 2026-10-03T13:27:10.333Z | unknown | unknown | COMPILE-ERROR |

Retained repeats: SMA attempt1 crossed a live boundary and its screenshot write failed; attempt2 selected. Math attempt1 exported the older saved Extrema indicator after an interrupted reload; it is CAPTURE-MISMATCH, rejected and retained; attempt2 selected. Isolated batches21/29 attempt1 crossed live boundaries; attempt2 selected. Batch4 and numeric compile failures have supplemental attempt2 complete diagnostics, with every original attempt retained. Sam’s provided linefill screenshot is preserved verbatim as `evidence/coverage-drawing-2-v1-user-screenshot-v1.png`; its original capture time is unknown.

All 27 numeric and25 isolated sources were attempted. Batches12/13/30/31 and coverage-time1 are outside the supplied schedule. A/B replay/adjudication belongs to the other machine; no runtime/baseline fixes or parity conclusions were made here.
