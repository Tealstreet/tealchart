# TradingView capture handoff v4

Bundle root: `packages/tealscript/oracle-probes/v4/`. All paths below are relative to this root. Return operator notes at `captures/v4/RESPONSE-v4.md`. This snapshot contains **76 source-pinned scripts**: 13 numeric CSV, 8 OHLC/bgcolor screenshot probes, and 55 remaining outcome probes. Ranked-window v1 is superseded by v2: preserve both sources, capture v2 first and omit v1 unless explicitly requested. Predictions are not native observations.

## Start here

Use [PROBES-v4.md](PROBES-v4.md) to copy each entire unchanged source. [bundle-manifest-v4.json](bundle-manifest-v4.json) pins hashes; [expected-outcome-v4.json](expected-outcome-v4.json) records predictions and per-probe evidence requirements. Use BINANCE:BTCUSDT, 2-minute, standard candles, UTC; Bar Replay OFF. Retain default inputs/styles unless the specific probe requires controlled changes. Save a setup screenshot with tickerid, timeframe, mintick and settings. Use the per-probe history minimum, otherwise at least 100 historical bars; the daily counter needs 1500 bars spanning two daily boundaries. Prefer the longest loaded history. Record dataset start independently: CSV row number is not Pine bar_index.

## Each attempt

1. Remove other indicators. Paste the complete unchanged source, save its exact filename and add exactly one instance. Record exact indicator title and source SHA.
2. Load sufficient history, clear/filter Pine Logs, then fully reload the browser. Record reset UTC. Avoid settings/history changes afterward, except explicitly required controlled experiments; those are separate attempts.
3. Observe COMPILE-ERROR, RUNTIME-ERROR or RUNS. Preserve full diagnostic text/code if exposed, line/column, first failing bar/time, and screenshot. Unknown code stays null; do not infer RE10001. Do not repair a failing source.
4. For RUNS, screenshot the current live candle opening UTC immediately before export. Export all loaded data with indicator values and UNIX timestamps. Save the untouched download at `captures/v4/<stem>-attempt<N>.csv`, recording the original filename. Chart-only exports are not successful indicator captures; preserve failed partial exports separately. Confirm whether reset/export crossed a live candle boundary.
5. Preserve exact logs, tables, drawings and required screenshots at `captures/v4/evidence/<stem>-attempt<N>-...`. OUTCOME=1 alone does not settle strings, visual placement or intrabar behavior. Keep CSV blanks and column headers unchanged.
6. Add a record for every attempt to `captures/v4/outcomes-v4.json`. Continue through target refusals; service/entitlement/setup failures remain unresolved and are not target diagnostics.

## Priority 1: numeric CSV

Capture in the following order. Statistical and ranked-window scripts require `input_bar_index=0` in the first exported row and their adjacent ordered column maps. Ranked v2 has 58 columns; statistical has 60. Retain historical rows and independently observed live cutoff separately. Float-length probes require 500 historical bars and all target/floor/ceiling columns. Magnitude/comparison probes also require their exact initial logs; never infer clipping or arithmetic from missing exported values alone.

- [ ] `statistical-native-moments-order-v1.pine` — minimum 512 bars; retain 60 declared columns and all required evidence.
- [ ] `ranked-window-missing-slots-v2.pine` — minimum 256 bars; retain 58 declared columns and all required evidence.
- [ ] `ranked-window-missing-slots-v1.pine` — minimum 256 bars; SUPERSEDED: capture v2 instead.
- [ ] `v5-float-length-ema-v1.pine` — minimum 500 bars; retain 5 declared columns and all required evidence.
- [ ] `v5-float-length-highest-v1.pine` — minimum 500 bars; retain 5 declared columns and all required evidence.
- [ ] `v5-float-length-macd-fastlen-v1.pine` — minimum 500 bars; retain 11 declared columns and all required evidence.
- [ ] `v5-float-length-macd-siglen-v1.pine` — minimum 500 bars; retain 11 declared columns and all required evidence.
- [ ] `v5-float-length-macd-slowlen-v1.pine` — minimum 500 bars; retain 11 declared columns and all required evidence.
- [ ] `v5-float-length-percentile-linear-interpolation-v1.pine` — minimum 500 bars; retain 5 declared columns and all required evidence.
- [ ] `v5-float-length-sma-v1.pine` — minimum 500 bars; retain 5 declared columns and all required evidence.
- [ ] `v5-float-length-wma-v1.pine` — minimum 500 bars; retain 5 declared columns and all required evidence.
- [ ] `native-float-comparison-boundary-v1.pine` — minimum 12 bars; retain 1 declared columns and all required evidence.
- [ ] `native-float-magnitude-output-v1.pine` — minimum 8 bars; retain 4 declared columns and all required evidence.

## Priority 2: OHLC visual and bgcolor screenshots

CSV acceptance cannot establish geometry or displacement. For plotbar/plotcandle, enlarge the indicator pane and capture case 1–4 close-ups with case/time/price labels and full CSV. For each bgcolor version, preserve zero-offset control and series-offset screenshots with timestamped placement across both signs and the latest update.

- [ ] `trace-plotbar-inconsistent-ohlc-visual-v6.pine` — minimum 100 bars; retain 12 declared columns and all required evidence.
- [ ] `trace-plotcandle-inconsistent-ohlc-visual-v6.pine` — minimum 100 bars; retain 12 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v3-series.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v3-zero-control.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v4-series.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v4-zero-control.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v5-series.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.
- [ ] `trace-bgcolor-offset-v5-zero-control.pine` — minimum 160 bars; retain 4 declared columns and all required evidence.

## Priority 3: remaining outcomes

- [ ] `corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-change-negative-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-change-zero-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-exp-price-overflow-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-matrix-negative-identity-power-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-pivot-request-counter-v1.pine` — minimum 1500 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-table-na-row-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-v5-float-highest-length-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-v5-history-price-offset-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-v5-local-request-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-v6-dynamic-history600-v1.pine` — minimum 1200 bars; retain 1 declared columns and all required evidence.
- [ ] `corpus5-v6-equal-lower-timeframe-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-box-eq-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-box-ne-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-chart-point-eq-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-chart-point-ne-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-default-blue-v5-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-default-blue-v6-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-polyline-eq-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-polyline-ne-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-table-eq-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `drawing-table-ne-v2.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `input-generic-computed-source-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `input-source-positional-order-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `input-textarea-default-display-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `input-time-default-display-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `input-time-marker-kind-v1.pine` — minimum 100 bars; retain 1 declared columns and all required evidence.
- [ ] `ledger-1091-matrix-columns-profile-v1.pine` — minimum 2 bars; retain 1 declared columns and all required evidence.
- [ ] `ledger-1091-matrix-constructor-profile-v1.pine` — minimum 2 bars; retain 1 declared columns and all required evidence.
- [ ] `ledger-1091-matrix-rows-profile-v1.pine` — minimum 2 bars; retain 1 declared columns and all required evidence.
- [ ] `ledger-1094-asin-number-v5-v1.pine` — minimum 2 bars; retain 1 declared columns and all required evidence.
- [ ] `ledger-1094-asin-number-v6-v1.pine` — minimum 2 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-698-timenow-observations-v1.pine` — minimum 1 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-705-chart-fg-solid-background-v1.pine` — minimum 1 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-720-hma-mature-hole-length16-v1.pine` — minimum 46 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-float-boundaries-control-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-float-dynamic-high-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-float-dynamic-low-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-float-dynamic-na-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-int-boundaries-control-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-int-dynamic-high-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-int-dynamic-low-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-nearest-rank-int-dynamic-na-v6.pine` — minimum 160 bars; retain 3 declared columns and all required evidence.
- [ ] `trace-array-string-every-namespace-v5.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-every-namespace-v6.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-every-receiver-v5.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-every-receiver-v6.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-some-namespace-v5.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-some-namespace-v6.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-some-receiver-v5.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-array-string-some-receiver-v6.pine` — minimum 3 bars; retain 1 declared columns and all required evidence.
- [ ] `trace-equal-key-sort-indices-v6.pine` — minimum 160 bars; retain 19 declared columns and all required evidence.
- [ ] `trace-equal-key-udt-sort-v6.pine` — minimum 160 bars; retain 43 declared columns and all required evidence.

## Additional evidence requirements

**LIVE ticks required:** `trace-698-timenow-observations-v1.pine`. Collect at least 10 realtime updates, a new-bar transition, reload, and idle observations with browser UTC; preserve exact logs and CSV. These observations do not measure provider arrival latency.

**Screenshots required beyond routine setup/error evidence:** `trace-plotbar-inconsistent-ohlc-visual-v6.pine`, `trace-plotcandle-inconsistent-ohlc-visual-v6.pine`, `trace-bgcolor-offset-v3-series.pine`, `trace-bgcolor-offset-v3-zero-control.pine`, `trace-bgcolor-offset-v4-series.pine`, `trace-bgcolor-offset-v4-zero-control.pine`, `trace-bgcolor-offset-v5-series.pine`, `trace-bgcolor-offset-v5-zero-control.pine`, `drawing-default-blue-v5-v1.pine`, `drawing-default-blue-v6-v1.pine`, `input-generic-computed-source-v1.pine`, `input-source-positional-order-v1.pine`, `input-textarea-default-display-v1.pine`, `input-time-default-display-v1.pine`, `input-time-marker-kind-v1.pine`, `ledger-1091-matrix-columns-profile-v1.pine`, `ledger-1091-matrix-constructor-profile-v1.pine`, `ledger-1091-matrix-rows-profile-v1.pine`, `trace-705-chart-fg-solid-background-v1.pine`. For foreground-color probes retain the requested solid background/theme settings; for default-blue probes retain visible colors and logs; for input probes retain Inputs settings/status line/Data Window and requested marker interaction; for matrix profile probes capture Pine Profiler over identical history/settings with five reloads per source. CSV cannot establish relative runtime. Follow each entry’s `record` instructions below for any additional logs/table values.

## Return protocol

Return unchanged sources plus the entire `captures/v4/` folder, original CSVs, all attempts, evidence, and outcomes JSON. Write `captures/v4/RESPONSE-v4.md` with operator, batch start/end UTC, actual chart setup, attempted/completed scripts, skipped superseded v1, missing evidence, service failures and uncertain reset/live boundaries. Do not alter predictions to match results. Keep v2/v3 returns separate. Return through the same handoff channel; the overseer adjudicates afterward. No repository push or merge is part of capture.

## Per-attempt record

```json
{
  "script": "<original>.pine",
  "attempt": 1,
  "source_sha256": "<PROBES-v4 hash>",
  "indicator_title": "<exact title>",
  "status": "UNKNOWN",
  "csv_file": null,
  "original_download_filename": null,
  "partial_csv_file": null,
  "diagnostic": {
    "code": null,
    "text": null,
    "line": null,
    "column": null,
    "first_bar_index": null,
    "first_bar_time_utc": null
  },
  "setup": {
    "tickerid": "BINANCE:BTCUSDT",
    "timeframe": "2",
    "chart_type": "standard candles",
    "timezone": "UTC",
    "bar_replay": false,
    "mintick": null,
    "defaults_confirmed": null,
    "dataset_start_utc": null
  },
  "reset_utc": null,
  "live_candle_open_utc": null,
  "export_utc": null,
  "live_boundary_confirmed_unchanged": null,
  "evidence_files": [],
  "notes": null
}
```

Use observed status only; leave unknowns null. Paths are relative to the bundle root. No success CSV is required for a target refusal before output; complete diagnostics are primary evidence. Local validation establishes bundle integrity, not native correctness.
