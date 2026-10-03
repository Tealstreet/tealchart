# Supertrend factor native discriminators v1

Three separate scripts distinguish first-value factor retention from sharing between dynamic and fixed calls. Existing coverage-tad-1-v1 capture has dynamic==fixed2 for every exported row; this is evidence to investigate, not a model to assume.

Host BINANCE:BTCUSDT, 2-minute standard candles, UTC, Bar Replay OFF. Remove other indicators, add exactly one unchanged script instance, and reload. Capture at least256 bars beginning at input_bar_index0; retain exact source hash, exported CSV, setup screenshot and live cutoff UTC. Separate attempts for each script; do not combine the scripts. Preserve any native diagnostic instead of repairing source.

## supertrend-factor-alone-v1.pine

SHA-256: `ddcbaaee153d6f33693fdd3b2ee285e1422bd5fb71ce653620f80dedcd724885`

```json
{
  "script": "supertrend-factor-alone-v1.pine",
  "sha256": "ddcbaaee153d6f33693fdd3b2ee285e1422bd5fb71ce653620f80dedcd724885",
  "pine_version": 6,
  "conflict_id": "SUPERTREND-FACTOR-ALONE-V1",
  "case_id": "supertrend-factor-alone-v1",
  "builtin": "ta.supertrend",
  "category": "native-series-factor-state",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.supertrend",
    "~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json fun_ta.supertrend",
    "packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv"
  ],
  "registered_owner": "codex-i5qr9c",
  "expected_outcome": {
    "phase": "RUNS",
    "columns": {},
    "rule": "Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed."
  },
  "settlement": "TRACE-REQUIRED-FACTOR-STATE",
  "columns": [
    "input_time_ms",
    "input_bar_index",
    "input_open",
    "input_high",
    "input_low",
    "input_close",
    "input_volume",
    "input_factor",
    "dynamic_line",
    "dynamic_direction"
  ],
  "minimum_history_bars": 256,
  "required_first_bar_index": 0,
  "capture_kind": "NUMERIC-CSV",
  "evidence_required": [
    "Untouched full CSV including factor and OHLC columns, first input_bar_index0",
    "Source SHA and setup screenshot",
    "Live cutoff UTC and reload UTC",
    "Exact diagnostics and failing bar/time if native compilation/runtime refuses"
  ],
  "hypotheses": [
    "Per-bar factor evaluation produces changing bands within one recurrent state.",
    "First-value retention depends on first factor2 versus3.",
    "Sharing is exposed only when dynamic and fixed2 calls coexist."
  ],
  "runtime_argument_review": "Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes."
}
```

```pine
//@version=6
indicator("Supertrend factor alone v1", overlay=false)
factor = bar_index % 2 == 0 ? 2.0 : 3.0
[line, direction] = ta.supertrend(factor, 3)
plot(time, "input_time_ms", display=display.data_window)
plot(bar_index, "input_bar_index", display=display.data_window)
plot(open, "input_open", display=display.data_window)
plot(high, "input_high", display=display.data_window)
plot(low, "input_low", display=display.data_window)
plot(close, "input_close", display=display.data_window)
plot(volume, "input_volume", display=display.data_window)
plot(factor, "input_factor", display=display.data_window)
plot(line, "dynamic_line", display=display.data_window)
plot(direction, "dynamic_direction", display=display.data_window)
```

## supertrend-factor-paired-fixed2-v1.pine

SHA-256: `d21cdc8ae28b7e646846c421c848b6d6795314827bf8641b901fe36eb302d879`

```json
{
  "script": "supertrend-factor-paired-fixed2-v1.pine",
  "sha256": "d21cdc8ae28b7e646846c421c848b6d6795314827bf8641b901fe36eb302d879",
  "pine_version": 6,
  "conflict_id": "SUPERTREND-FACTOR-PAIRED-FIXED2-V1",
  "case_id": "supertrend-factor-paired-fixed2-v1",
  "builtin": "ta.supertrend",
  "category": "native-series-factor-state",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.supertrend",
    "~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json fun_ta.supertrend",
    "packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv"
  ],
  "registered_owner": "codex-i5qr9c",
  "expected_outcome": {
    "phase": "RUNS",
    "columns": {},
    "rule": "Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed."
  },
  "settlement": "TRACE-REQUIRED-FACTOR-STATE",
  "columns": [
    "input_time_ms",
    "input_bar_index",
    "input_open",
    "input_high",
    "input_low",
    "input_close",
    "input_volume",
    "input_factor",
    "dynamic_line",
    "dynamic_direction",
    "fixed2_line",
    "fixed2_direction"
  ],
  "minimum_history_bars": 256,
  "required_first_bar_index": 0,
  "capture_kind": "NUMERIC-CSV",
  "evidence_required": [
    "Untouched full CSV including factor and OHLC columns, first input_bar_index0",
    "Source SHA and setup screenshot",
    "Live cutoff UTC and reload UTC",
    "Exact diagnostics and failing bar/time if native compilation/runtime refuses"
  ],
  "hypotheses": [
    "Per-bar factor evaluation produces changing bands within one recurrent state.",
    "First-value retention depends on first factor2 versus3.",
    "Sharing is exposed only when dynamic and fixed2 calls coexist."
  ],
  "runtime_argument_review": "Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes."
}
```

```pine
//@version=6
indicator("Supertrend factor paired-fixed2 v1", overlay=false)
factor = bar_index % 2 == 0 ? 2.0 : 3.0
[line, direction] = ta.supertrend(factor, 3)
[fixedLine, fixedDirection] = ta.supertrend(2.0, 3)
plot(time, "input_time_ms", display=display.data_window)
plot(bar_index, "input_bar_index", display=display.data_window)
plot(open, "input_open", display=display.data_window)
plot(high, "input_high", display=display.data_window)
plot(low, "input_low", display=display.data_window)
plot(close, "input_close", display=display.data_window)
plot(volume, "input_volume", display=display.data_window)
plot(factor, "input_factor", display=display.data_window)
plot(line, "dynamic_line", display=display.data_window)
plot(direction, "dynamic_direction", display=display.data_window)
plot(fixedLine, "fixed2_line", display=display.data_window)
plot(fixedDirection, "fixed2_direction", display=display.data_window)
```

## supertrend-factor-alone-first3-v1.pine

SHA-256: `cd4c4ee7b2d6f865fba61f52b360d0bfc68f23ab71bc8700827511f4e73dcb97`

```json
{
  "script": "supertrend-factor-alone-first3-v1.pine",
  "sha256": "cd4c4ee7b2d6f865fba61f52b360d0bfc68f23ab71bc8700827511f4e73dcb97",
  "pine_version": 6,
  "conflict_id": "SUPERTREND-FACTOR-ALONE-FIRST3-V1",
  "case_id": "supertrend-factor-alone-first3-v1",
  "builtin": "ta.supertrend",
  "category": "native-series-factor-state",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.supertrend",
    "~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json fun_ta.supertrend",
    "packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv"
  ],
  "registered_owner": "codex-i5qr9c",
  "expected_outcome": {
    "phase": "RUNS",
    "columns": {},
    "rule": "Series numeric factor admission is documented; exact factor update/retention and cross-call sharing require native evidence. No numerical model is presumed."
  },
  "settlement": "TRACE-REQUIRED-FACTOR-STATE",
  "columns": [
    "input_time_ms",
    "input_bar_index",
    "input_open",
    "input_high",
    "input_low",
    "input_close",
    "input_volume",
    "input_factor",
    "dynamic_line",
    "dynamic_direction"
  ],
  "minimum_history_bars": 256,
  "required_first_bar_index": 0,
  "capture_kind": "NUMERIC-CSV",
  "evidence_required": [
    "Untouched full CSV including factor and OHLC columns, first input_bar_index0",
    "Source SHA and setup screenshot",
    "Live cutoff UTC and reload UTC",
    "Exact diagnostics and failing bar/time if native compilation/runtime refuses"
  ],
  "hypotheses": [
    "Per-bar factor evaluation produces changing bands within one recurrent state.",
    "First-value retention depends on first factor2 versus3.",
    "Sharing is exposed only when dynamic and fixed2 calls coexist."
  ],
  "runtime_argument_review": "Constant positive ATR period3; series factor alternates literal positive floats2/3; calls execute unconditionally each bar; no requests, input changes, NA holes or error probes."
}
```

```pine
//@version=6
indicator("Supertrend factor alone-first3 v1", overlay=false)
factor = bar_index % 2 == 0 ? 3.0 : 2.0
[line, direction] = ta.supertrend(factor, 3)
plot(time, "input_time_ms", display=display.data_window)
plot(bar_index, "input_bar_index", display=display.data_window)
plot(open, "input_open", display=display.data_window)
plot(high, "input_high", display=display.data_window)
plot(low, "input_low", display=display.data_window)
plot(close, "input_close", display=display.data_window)
plot(volume, "input_volume", display=display.data_window)
plot(factor, "input_factor", display=display.data_window)
plot(line, "dynamic_line", display=display.data_window)
plot(direction, "dynamic_direction", display=display.data_window)
```
