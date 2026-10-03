# Copy-ready TradingView probes v4

76 unchanged source blocks in operator priority order. Use [HANDOFF-v4.md](HANDOFF-v4.md). Predictions below are hypotheses/authority readings, not captures.

## statistical-native-moments-order-v1.pine

SHA-256: `eebafda38556e415a407420cab238e8520266bcfcd64c14af1a6aae448a9e899`

Minimum history: 512 bars.



Expected readings and required evidence:

```json
{
  "script": "statistical-native-moments-order-v1.pine",
  "sha256": "eebafda38556e415a407420cab238e8520266bcfcd64c14af1a6aae448a9e899",
  "pine_version": 6,
  "conflict_id": "STATISTICAL-NATIVE-MOMENTS-ORDER-V1",
  "case_id": "statistical-native-moments-order-v1",
  "builtin": "math.sum/ta.sma/ta.stdev/ta.variance",
  "category": "native-numeric-accumulation",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_math.sum",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.stdev",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.variance"
  ],
  "registered_owner": "codex-ymk07v",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "NA ignoring and population/sample estimates are documented; exact accumulation/cancellation order is unspecified. Capture all native components without choosing a numerical model."
  },
  "settlement": "TRACE-REQUIRED-ARITHMETIC",
  "columns": [
    "input_time",
    "input_bar_index",
    "input_open",
    "input_high",
    "input_low",
    "input_close",
    "input_volume",
    "input_wave",
    "input_shifted",
    "close_len2_mean",
    "close_len2_square_mean",
    "close_len2_sum",
    "close_len2_square_sum",
    "close_len2_stdev_population",
    "close_len2_stdev_sample",
    "close_len2_variance_population",
    "close_len2_variance_sample",
    "close_len3_mean",
    "close_len3_square_mean",
    "close_len3_sum",
    "close_len3_square_sum",
    "close_len3_stdev_population",
    "close_len3_stdev_sample",
    "close_len3_variance_population",
    "close_len3_variance_sample",
    "close_len7_mean",
    "close_len7_square_mean",
    "close_len7_sum",
    "close_len7_square_sum",
    "close_len7_stdev_population",
    "close_len7_stdev_sample",
    "close_len7_variance_population",
    "close_len7_variance_sample",
    "close_len14_mean",
    "close_len14_square_mean",
    "close_len14_sum",
    "close_len14_square_sum",
    "close_len14_stdev_population",
    "close_len14_stdev_sample",
    "close_len14_variance_population",
    "close_len14_variance_sample",
    "close_len31_mean",
    "close_len31_square_mean",
    "close_len31_sum",
    "close_len31_square_sum",
    "close_len31_stdev_population",
    "close_len31_stdev_sample",
    "close_len31_variance_population",
    "close_len31_variance_sample",
    "shifted_len14_mean",
    "shifted_len14_square_mean",
    "shifted_len14_sum",
    "shifted_len14_square_sum",
    "shifted_len14_stdev_population",
    "shifted_len14_stdev_sample",
    "shifted_len14_variance_population",
    "shifted_len14_variance_sample",
    "wave_len14_mean",
    "wave_len14_square_mean",
    "wave_len14_variance_population"
  ],
  "minimum_history_bars": 512,
  "required_first_bar_index": 0,
  "capture_kind": "NUMERIC-CSV",
  "record": [
    "Export all60 mapped indicator columns across the longest available chart history frombar0, including blanks and the last row.",
    "Record chart setup/reset/export times and observed live cutoff; preserve original source and exact native diagnostic if refused."
  ]
}
```

```pine
//@version=6
indicator("Statistical native moments order v1", precision=16, max_bars_back=100)
squareClose = close * close
wave = 50.0 + (bar_index % 11) * 0.25 + (bar_index % 3 == 0 ? 0.125 : -0.375)
shifted = 100000000.0 + wave
squareShifted = shifted * shifted
squareWave = wave * wave
plot(time, "input_time", display=display.data_window)
plot(bar_index, "input_bar_index", display=display.data_window)
plot(open, "input_open", display=display.data_window)
plot(high, "input_high", display=display.data_window)
plot(low, "input_low", display=display.data_window)
plot(close, "input_close", display=display.data_window)
plot(volume, "input_volume", display=display.data_window)
plot(wave, "input_wave", display=display.data_window)
plot(shifted, "input_shifted", display=display.data_window)
plot(ta.sma(close, 2), "close_len2_mean", display=display.data_window)
plot(ta.sma(squareClose, 2), "close_len2_square_mean", display=display.data_window)
plot(math.sum(close, 2), "close_len2_sum", display=display.data_window)
plot(math.sum(squareClose, 2), "close_len2_square_sum", display=display.data_window)
plot(ta.stdev(close, 2, true), "close_len2_stdev_population", display=display.data_window)
plot(ta.stdev(close, 2, false), "close_len2_stdev_sample", display=display.data_window)
plot(ta.variance(close, 2, true), "close_len2_variance_population", display=display.data_window)
plot(ta.variance(close, 2, false), "close_len2_variance_sample", display=display.data_window)
plot(ta.sma(close, 3), "close_len3_mean", display=display.data_window)
plot(ta.sma(squareClose, 3), "close_len3_square_mean", display=display.data_window)
plot(math.sum(close, 3), "close_len3_sum", display=display.data_window)
plot(math.sum(squareClose, 3), "close_len3_square_sum", display=display.data_window)
plot(ta.stdev(close, 3, true), "close_len3_stdev_population", display=display.data_window)
plot(ta.stdev(close, 3, false), "close_len3_stdev_sample", display=display.data_window)
plot(ta.variance(close, 3, true), "close_len3_variance_population", display=display.data_window)
plot(ta.variance(close, 3, false), "close_len3_variance_sample", display=display.data_window)
plot(ta.sma(close, 7), "close_len7_mean", display=display.data_window)
plot(ta.sma(squareClose, 7), "close_len7_square_mean", display=display.data_window)
plot(math.sum(close, 7), "close_len7_sum", display=display.data_window)
plot(math.sum(squareClose, 7), "close_len7_square_sum", display=display.data_window)
plot(ta.stdev(close, 7, true), "close_len7_stdev_population", display=display.data_window)
plot(ta.stdev(close, 7, false), "close_len7_stdev_sample", display=display.data_window)
plot(ta.variance(close, 7, true), "close_len7_variance_population", display=display.data_window)
plot(ta.variance(close, 7, false), "close_len7_variance_sample", display=display.data_window)
plot(ta.sma(close, 14), "close_len14_mean", display=display.data_window)
plot(ta.sma(squareClose, 14), "close_len14_square_mean", display=display.data_window)
plot(math.sum(close, 14), "close_len14_sum", display=display.data_window)
plot(math.sum(squareClose, 14), "close_len14_square_sum", display=display.data_window)
plot(ta.stdev(close, 14, true), "close_len14_stdev_population", display=display.data_window)
plot(ta.stdev(close, 14, false), "close_len14_stdev_sample", display=display.data_window)
plot(ta.variance(close, 14, true), "close_len14_variance_population", display=display.data_window)
plot(ta.variance(close, 14, false), "close_len14_variance_sample", display=display.data_window)
plot(ta.sma(close, 31), "close_len31_mean", display=display.data_window)
plot(ta.sma(squareClose, 31), "close_len31_square_mean", display=display.data_window)
plot(math.sum(close, 31), "close_len31_sum", display=display.data_window)
plot(math.sum(squareClose, 31), "close_len31_square_sum", display=display.data_window)
plot(ta.stdev(close, 31, true), "close_len31_stdev_population", display=display.data_window)
plot(ta.stdev(close, 31, false), "close_len31_stdev_sample", display=display.data_window)
plot(ta.variance(close, 31, true), "close_len31_variance_population", display=display.data_window)
plot(ta.variance(close, 31, false), "close_len31_variance_sample", display=display.data_window)
plot(ta.sma(shifted, 14), "shifted_len14_mean", display=display.data_window)
plot(ta.sma(squareShifted, 14), "shifted_len14_square_mean", display=display.data_window)
plot(math.sum(shifted, 14), "shifted_len14_sum", display=display.data_window)
plot(math.sum(squareShifted, 14), "shifted_len14_square_sum", display=display.data_window)
plot(ta.stdev(shifted, 14, true), "shifted_len14_stdev_population", display=display.data_window)
plot(ta.stdev(shifted, 14, false), "shifted_len14_stdev_sample", display=display.data_window)
plot(ta.variance(shifted, 14, true), "shifted_len14_variance_population", display=display.data_window)
plot(ta.variance(shifted, 14, false), "shifted_len14_variance_sample", display=display.data_window)
plot(ta.sma(wave, 14), "wave_len14_mean", display=display.data_window)
plot(ta.sma(squareWave, 14), "wave_len14_square_mean", display=display.data_window)
plot(ta.variance(wave, 14, true), "wave_len14_variance_population", display=display.data_window)
```

## ranked-window-missing-slots-v2.pine

SHA-256: `82d45781f7b60f6615e3f3366a809a092f913fd2539550e83f7d00fed6ee3578`

Minimum history: 256 bars.



Expected readings and required evidence:

```json
{
  "script": "ranked-window-missing-slots-v2.pine",
  "sha256": "82d45781f7b60f6615e3f3366a809a092f913fd2539550e83f7d00fed6ee3578",
  "pine_version": 6,
  "conflict_id": "RANKED-WINDOW-MISSING-SLOTS-V2",
  "category": "numeric-native-discriminator",
  "authority": [],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native outcome unobserved. Preserve missing-slot ordering and array/TA differences without assuming an algorithm."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "input_bar_index",
    "input_clean",
    "nearest_rank_len4_pct25_clean",
    "nearest_rank_len4_pct50_clean",
    "nearest_rank_len4_pct75_clean",
    "linear_interpolation_len4_pct25_clean",
    "linear_interpolation_len4_pct50_clean",
    "linear_interpolation_len4_pct75_clean",
    "rci_len4_clean",
    "nearest_rank_len14_pct25_clean",
    "nearest_rank_len14_pct50_clean",
    "nearest_rank_len14_pct75_clean",
    "linear_interpolation_len14_pct25_clean",
    "linear_interpolation_len14_pct50_clean",
    "linear_interpolation_len14_pct75_clean",
    "rci_len14_clean",
    "input_hole20_21",
    "nearest_rank_len4_pct25_hole20_21",
    "nearest_rank_len4_pct50_hole20_21",
    "nearest_rank_len4_pct75_hole20_21",
    "linear_interpolation_len4_pct25_hole20_21",
    "linear_interpolation_len4_pct50_hole20_21",
    "linear_interpolation_len4_pct75_hole20_21",
    "rci_len4_hole20_21",
    "nearest_rank_len14_pct25_hole20_21",
    "nearest_rank_len14_pct50_hole20_21",
    "nearest_rank_len14_pct75_hole20_21",
    "linear_interpolation_len14_pct25_hole20_21",
    "linear_interpolation_len14_pct50_hole20_21",
    "linear_interpolation_len14_pct75_hole20_21",
    "rci_len14_hole20_21",
    "input_lead0_4",
    "nearest_rank_len4_pct25_lead0_4",
    "nearest_rank_len4_pct50_lead0_4",
    "nearest_rank_len4_pct75_lead0_4",
    "linear_interpolation_len4_pct25_lead0_4",
    "linear_interpolation_len4_pct50_lead0_4",
    "linear_interpolation_len4_pct75_lead0_4",
    "rci_len4_lead0_4",
    "nearest_rank_len14_pct25_lead0_4",
    "nearest_rank_len14_pct50_lead0_4",
    "nearest_rank_len14_pct75_lead0_4",
    "linear_interpolation_len14_pct25_lead0_4",
    "linear_interpolation_len14_pct50_lead0_4",
    "linear_interpolation_len14_pct75_lead0_4",
    "rci_len14_lead0_4",
    "array_nearest_rank_len14_pct50_clean",
    "array_nearest_rank_len14_pct75_clean",
    "array_linear_interpolation_len14_pct50_clean",
    "array_linear_interpolation_len14_pct75_clean",
    "array_nearest_rank_len14_pct50_hole20_21",
    "array_nearest_rank_len14_pct75_hole20_21",
    "array_linear_interpolation_len14_pct50_hole20_21",
    "array_linear_interpolation_len14_pct75_hole20_21",
    "array_nearest_rank_len14_pct50_lead0_4",
    "array_nearest_rank_len14_pct75_lead0_4",
    "array_linear_interpolation_len14_pct50_lead0_4",
    "array_linear_interpolation_len14_pct75_lead0_4"
  ],
  "minimum_history_bars": 256,
  "record": [
    "Full untouched CSV; exact diagnostics if refused; reset/export UTC and independently observed live cutoff.",
    "Preserve all specified logs and column order."
  ]
}
```

```pine
//@version=6
indicator("Ranked window missing slots v2", precision=16)
phase = bar_index % 64
clean = 10.0 + phase % 7
hole = phase == 20 or phase == 21
holeSource = hole ? na : clean
leadingSource = bar_index < 5 ? na : clean
plot(bar_index, "input_bar_index", display=display.data_window)
plot(clean, "input_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 25), "nearest_rank_len4_pct25_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 50), "nearest_rank_len4_pct50_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 75), "nearest_rank_len4_pct75_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 25), "linear_interpolation_len4_pct25_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 50), "linear_interpolation_len4_pct50_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 75), "linear_interpolation_len4_pct75_clean", display=display.data_window)
plot(ta.rci(clean, 4), "rci_len4_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 25), "nearest_rank_len14_pct25_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 50), "nearest_rank_len14_pct50_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 75), "nearest_rank_len14_pct75_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 25), "linear_interpolation_len14_pct25_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 50), "linear_interpolation_len14_pct50_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 75), "linear_interpolation_len14_pct75_clean", display=display.data_window)
plot(ta.rci(clean, 14), "rci_len14_clean", display=display.data_window)
plot(holeSource, "input_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 25), "nearest_rank_len4_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 50), "nearest_rank_len4_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 75), "nearest_rank_len4_pct75_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 25), "linear_interpolation_len4_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 50), "linear_interpolation_len4_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 75), "linear_interpolation_len4_pct75_hole20_21", display=display.data_window)
plot(ta.rci(holeSource, 4), "rci_len4_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 25), "nearest_rank_len14_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 50), "nearest_rank_len14_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 75), "nearest_rank_len14_pct75_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 25), "linear_interpolation_len14_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 50), "linear_interpolation_len14_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 75), "linear_interpolation_len14_pct75_hole20_21", display=display.data_window)
plot(ta.rci(holeSource, 14), "rci_len14_hole20_21", display=display.data_window)
plot(leadingSource, "input_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 25), "nearest_rank_len4_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 50), "nearest_rank_len4_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 75), "nearest_rank_len4_pct75_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 25), "linear_interpolation_len4_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 50), "linear_interpolation_len4_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 75), "linear_interpolation_len4_pct75_lead0_4", display=display.data_window)
plot(ta.rci(leadingSource, 4), "rci_len4_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 25), "nearest_rank_len14_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 50), "nearest_rank_len14_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 75), "nearest_rank_len14_pct75_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 25), "linear_interpolation_len14_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 50), "linear_interpolation_len14_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 75), "linear_interpolation_len14_pct75_lead0_4", display=display.data_window)
plot(ta.rci(leadingSource, 14), "rci_len14_lead0_4", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(clean, clean[1], clean[2], clean[3], clean[4], clean[5], clean[6], clean[7], clean[8], clean[9], clean[10], clean[11], clean[12], clean[13]), 50), "array_nearest_rank_len14_pct50_clean", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(clean, clean[1], clean[2], clean[3], clean[4], clean[5], clean[6], clean[7], clean[8], clean[9], clean[10], clean[11], clean[12], clean[13]), 75), "array_nearest_rank_len14_pct75_clean", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(clean, clean[1], clean[2], clean[3], clean[4], clean[5], clean[6], clean[7], clean[8], clean[9], clean[10], clean[11], clean[12], clean[13]), 50), "array_linear_interpolation_len14_pct50_clean", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(clean, clean[1], clean[2], clean[3], clean[4], clean[5], clean[6], clean[7], clean[8], clean[9], clean[10], clean[11], clean[12], clean[13]), 75), "array_linear_interpolation_len14_pct75_clean", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(holeSource, holeSource[1], holeSource[2], holeSource[3], holeSource[4], holeSource[5], holeSource[6], holeSource[7], holeSource[8], holeSource[9], holeSource[10], holeSource[11], holeSource[12], holeSource[13]), 50), "array_nearest_rank_len14_pct50_hole20_21", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(holeSource, holeSource[1], holeSource[2], holeSource[3], holeSource[4], holeSource[5], holeSource[6], holeSource[7], holeSource[8], holeSource[9], holeSource[10], holeSource[11], holeSource[12], holeSource[13]), 75), "array_nearest_rank_len14_pct75_hole20_21", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(holeSource, holeSource[1], holeSource[2], holeSource[3], holeSource[4], holeSource[5], holeSource[6], holeSource[7], holeSource[8], holeSource[9], holeSource[10], holeSource[11], holeSource[12], holeSource[13]), 50), "array_linear_interpolation_len14_pct50_hole20_21", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(holeSource, holeSource[1], holeSource[2], holeSource[3], holeSource[4], holeSource[5], holeSource[6], holeSource[7], holeSource[8], holeSource[9], holeSource[10], holeSource[11], holeSource[12], holeSource[13]), 75), "array_linear_interpolation_len14_pct75_hole20_21", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(leadingSource, leadingSource[1], leadingSource[2], leadingSource[3], leadingSource[4], leadingSource[5], leadingSource[6], leadingSource[7], leadingSource[8], leadingSource[9], leadingSource[10], leadingSource[11], leadingSource[12], leadingSource[13]), 50), "array_nearest_rank_len14_pct50_lead0_4", display=display.data_window)
plot(array.percentile_nearest_rank(array.from(leadingSource, leadingSource[1], leadingSource[2], leadingSource[3], leadingSource[4], leadingSource[5], leadingSource[6], leadingSource[7], leadingSource[8], leadingSource[9], leadingSource[10], leadingSource[11], leadingSource[12], leadingSource[13]), 75), "array_nearest_rank_len14_pct75_lead0_4", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(leadingSource, leadingSource[1], leadingSource[2], leadingSource[3], leadingSource[4], leadingSource[5], leadingSource[6], leadingSource[7], leadingSource[8], leadingSource[9], leadingSource[10], leadingSource[11], leadingSource[12], leadingSource[13]), 50), "array_linear_interpolation_len14_pct50_lead0_4", display=display.data_window)
plot(array.percentile_linear_interpolation(array.from(leadingSource, leadingSource[1], leadingSource[2], leadingSource[3], leadingSource[4], leadingSource[5], leadingSource[6], leadingSource[7], leadingSource[8], leadingSource[9], leadingSource[10], leadingSource[11], leadingSource[12], leadingSource[13]), 75), "array_linear_interpolation_len14_pct75_lead0_4", display=display.data_window)
```

## ranked-window-missing-slots-v1.pine

SHA-256: `fdea580363fe392ca07820cc58fb03d4d2ae074d9e0e9fae3786b89d4ad9b2f4`

Minimum history: 256 bars.



**SUPERSEDED: capture ranked-window v2 instead.**

Expected readings and required evidence:

```json
{
  "script": "ranked-window-missing-slots-v1.pine",
  "sha256": "fdea580363fe392ca07820cc58fb03d4d2ae074d9e0e9fae3786b89d4ad9b2f4",
  "pine_version": 6,
  "conflict_id": "RANKED-WINDOW-MISSING-SLOTS-V1",
  "category": "numeric-native-discriminator",
  "authority": [],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native outcome unobserved. Preserve missing-slot ordering and array/TA differences without assuming an algorithm."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "input_bar_index",
    "input_clean",
    "nearest_rank_len4_pct25_clean",
    "nearest_rank_len4_pct50_clean",
    "nearest_rank_len4_pct75_clean",
    "linear_interpolation_len4_pct25_clean",
    "linear_interpolation_len4_pct50_clean",
    "linear_interpolation_len4_pct75_clean",
    "rci_len4_clean",
    "nearest_rank_len14_pct25_clean",
    "nearest_rank_len14_pct50_clean",
    "nearest_rank_len14_pct75_clean",
    "linear_interpolation_len14_pct25_clean",
    "linear_interpolation_len14_pct50_clean",
    "linear_interpolation_len14_pct75_clean",
    "rci_len14_clean",
    "input_hole20_21",
    "nearest_rank_len4_pct25_hole20_21",
    "nearest_rank_len4_pct50_hole20_21",
    "nearest_rank_len4_pct75_hole20_21",
    "linear_interpolation_len4_pct25_hole20_21",
    "linear_interpolation_len4_pct50_hole20_21",
    "linear_interpolation_len4_pct75_hole20_21",
    "rci_len4_hole20_21",
    "nearest_rank_len14_pct25_hole20_21",
    "nearest_rank_len14_pct50_hole20_21",
    "nearest_rank_len14_pct75_hole20_21",
    "linear_interpolation_len14_pct25_hole20_21",
    "linear_interpolation_len14_pct50_hole20_21",
    "linear_interpolation_len14_pct75_hole20_21",
    "rci_len14_hole20_21",
    "input_lead0_4",
    "nearest_rank_len4_pct25_lead0_4",
    "nearest_rank_len4_pct50_lead0_4",
    "nearest_rank_len4_pct75_lead0_4",
    "linear_interpolation_len4_pct25_lead0_4",
    "linear_interpolation_len4_pct50_lead0_4",
    "linear_interpolation_len4_pct75_lead0_4",
    "rci_len4_lead0_4",
    "nearest_rank_len14_pct25_lead0_4",
    "nearest_rank_len14_pct50_lead0_4",
    "nearest_rank_len14_pct75_lead0_4",
    "linear_interpolation_len14_pct25_lead0_4",
    "linear_interpolation_len14_pct50_lead0_4",
    "linear_interpolation_len14_pct75_lead0_4",
    "rci_len14_lead0_4"
  ],
  "minimum_history_bars": 256,
  "record": [
    "Full untouched CSV; exact diagnostics if refused; reset/export UTC and independently observed live cutoff.",
    "Preserve all specified logs and column order."
  ],
  "operator_note": "Preserved earlier revision. Capture v2 instead; v1 remains registered and copy-ready for explicit follow-up."
}
```

```pine
//@version=6
indicator("Ranked window missing slots v1", precision=16)
phase = bar_index % 64
clean = 10.0 + phase % 7
hole = phase == 20 or phase == 21
holeSource = hole ? na : clean
leadingSource = bar_index < 5 ? na : clean
plot(bar_index, "input_bar_index", display=display.data_window)
plot(clean, "input_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 25), "nearest_rank_len4_pct25_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 50), "nearest_rank_len4_pct50_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 4, 75), "nearest_rank_len4_pct75_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 25), "linear_interpolation_len4_pct25_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 50), "linear_interpolation_len4_pct50_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 4, 75), "linear_interpolation_len4_pct75_clean", display=display.data_window)
plot(ta.rci(clean, 4), "rci_len4_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 25), "nearest_rank_len14_pct25_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 50), "nearest_rank_len14_pct50_clean", display=display.data_window)
plot(ta.percentile_nearest_rank(clean, 14, 75), "nearest_rank_len14_pct75_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 25), "linear_interpolation_len14_pct25_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 50), "linear_interpolation_len14_pct50_clean", display=display.data_window)
plot(ta.percentile_linear_interpolation(clean, 14, 75), "linear_interpolation_len14_pct75_clean", display=display.data_window)
plot(ta.rci(clean, 14), "rci_len14_clean", display=display.data_window)
plot(holeSource, "input_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 25), "nearest_rank_len4_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 50), "nearest_rank_len4_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 4, 75), "nearest_rank_len4_pct75_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 25), "linear_interpolation_len4_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 50), "linear_interpolation_len4_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 4, 75), "linear_interpolation_len4_pct75_hole20_21", display=display.data_window)
plot(ta.rci(holeSource, 4), "rci_len4_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 25), "nearest_rank_len14_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 50), "nearest_rank_len14_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_nearest_rank(holeSource, 14, 75), "nearest_rank_len14_pct75_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 25), "linear_interpolation_len14_pct25_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 50), "linear_interpolation_len14_pct50_hole20_21", display=display.data_window)
plot(ta.percentile_linear_interpolation(holeSource, 14, 75), "linear_interpolation_len14_pct75_hole20_21", display=display.data_window)
plot(ta.rci(holeSource, 14), "rci_len14_hole20_21", display=display.data_window)
plot(leadingSource, "input_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 25), "nearest_rank_len4_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 50), "nearest_rank_len4_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 4, 75), "nearest_rank_len4_pct75_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 25), "linear_interpolation_len4_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 50), "linear_interpolation_len4_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 4, 75), "linear_interpolation_len4_pct75_lead0_4", display=display.data_window)
plot(ta.rci(leadingSource, 4), "rci_len4_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 25), "nearest_rank_len14_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 50), "nearest_rank_len14_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_nearest_rank(leadingSource, 14, 75), "nearest_rank_len14_pct75_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 25), "linear_interpolation_len14_pct25_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 50), "linear_interpolation_len14_pct50_lead0_4", display=display.data_window)
plot(ta.percentile_linear_interpolation(leadingSource, 14, 75), "linear_interpolation_len14_pct75_lead0_4", display=display.data_window)
plot(ta.rci(leadingSource, 14), "rci_len14_lead0_4", display=display.data_window)
```

## v5-float-length-ema-v1.pine

SHA-256: `38e8fe9eab820a5f49edda4b69748d9a97eb03d0dbd6330cd3c992176b6e59e3`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-ema-v1.pine",
  "sha256": "38e8fe9eab820a5f49edda4b69748d9a97eb03d0dbd6330cd3c992176b6e59e3",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-EMA-V1",
  "case_id": "v5-float-length-ema-v1",
  "builtin": "ta.ema",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "FLOOR_CONTROL",
    "CEIL_CONTROL",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-EMA-V1")
targetValue = ta.ema(close, 7.5)
floorValue = ta.ema(close, 7)
ceilValue = ta.ema(close, 8)
plot(targetValue, title="OUTCOME", display=display.data_window)
plot(floorValue, title="FLOOR_CONTROL", display=display.data_window)
plot(ceilValue, title="CEIL_CONTROL", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-highest-v1.pine

SHA-256: `0334f8d75fe02c908b52529c6cc47c039bf5393f122aacc5ac46c69245141f56`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-highest-v1.pine",
  "sha256": "0334f8d75fe02c908b52529c6cc47c039bf5393f122aacc5ac46c69245141f56",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-HIGHEST-V1",
  "case_id": "v5-float-length-highest-v1",
  "builtin": "ta.highest",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "FLOOR_CONTROL",
    "CEIL_CONTROL",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-HIGHEST-V1")
targetValue = ta.highest(7.5)
floorValue = ta.highest(7)
ceilValue = ta.highest(8)
plot(targetValue, title="OUTCOME", display=display.data_window)
plot(floorValue, title="FLOOR_CONTROL", display=display.data_window)
plot(ceilValue, title="CEIL_CONTROL", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-macd-fastlen-v1.pine

SHA-256: `2841fdc125295ac8f4bce5a45dbfc698c0c67092a8878b864651543cdeae5034`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-macd-fastlen-v1.pine",
  "sha256": "2841fdc125295ac8f4bce5a45dbfc698c0c67092a8878b864651543cdeae5034",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-MACD-FASTLEN-V1",
  "case_id": "v5-float-length-macd-fastlen-v1",
  "builtin": "ta.macd",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "TARGET_SIGNAL",
    "TARGET_HIST",
    "FLOOR_MACD",
    "FLOOR_SIGNAL",
    "FLOOR_HIST",
    "CEIL_MACD",
    "CEIL_SIGNAL",
    "CEIL_HIST",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-MACD-FASTLEN-V1")
[targetMacd, targetSignal, targetHist] = ta.macd(close, 1.5, 26, 9)
[floorMacd, floorSignal, floorHist] = ta.macd(close, 1, 26, 9)
[ceilMacd, ceilSignal, ceilHist] = ta.macd(close, 2, 26, 9)
plot(targetMacd, title="OUTCOME", display=display.data_window)
plot(targetSignal, title="TARGET_SIGNAL", display=display.data_window)
plot(targetHist, title="TARGET_HIST", display=display.data_window)
plot(floorMacd, title="FLOOR_MACD", display=display.data_window)
plot(floorSignal, title="FLOOR_SIGNAL", display=display.data_window)
plot(floorHist, title="FLOOR_HIST", display=display.data_window)
plot(ceilMacd, title="CEIL_MACD", display=display.data_window)
plot(ceilSignal, title="CEIL_SIGNAL", display=display.data_window)
plot(ceilHist, title="CEIL_HIST", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-macd-siglen-v1.pine

SHA-256: `6240d8ed6b7bdb744b5b319acfdc313df9fdd4560cce6429b233465cd27846f1`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-macd-siglen-v1.pine",
  "sha256": "6240d8ed6b7bdb744b5b319acfdc313df9fdd4560cce6429b233465cd27846f1",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-MACD-SIGLEN-V1",
  "case_id": "v5-float-length-macd-siglen-v1",
  "builtin": "ta.macd",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "TARGET_SIGNAL",
    "TARGET_HIST",
    "FLOOR_MACD",
    "FLOOR_SIGNAL",
    "FLOOR_HIST",
    "CEIL_MACD",
    "CEIL_SIGNAL",
    "CEIL_HIST",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-MACD-SIGLEN-V1")
[targetMacd, targetSignal, targetHist] = ta.macd(close, 12, 26, 9.5)
[floorMacd, floorSignal, floorHist] = ta.macd(close, 12, 26, 9)
[ceilMacd, ceilSignal, ceilHist] = ta.macd(close, 12, 26, 10)
plot(targetMacd, title="OUTCOME", display=display.data_window)
plot(targetSignal, title="TARGET_SIGNAL", display=display.data_window)
plot(targetHist, title="TARGET_HIST", display=display.data_window)
plot(floorMacd, title="FLOOR_MACD", display=display.data_window)
plot(floorSignal, title="FLOOR_SIGNAL", display=display.data_window)
plot(floorHist, title="FLOOR_HIST", display=display.data_window)
plot(ceilMacd, title="CEIL_MACD", display=display.data_window)
plot(ceilSignal, title="CEIL_SIGNAL", display=display.data_window)
plot(ceilHist, title="CEIL_HIST", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-macd-slowlen-v1.pine

SHA-256: `949808fb14996aec6c0fb52c3f84905d831bbe442e669e0b952746c80523937f`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-macd-slowlen-v1.pine",
  "sha256": "949808fb14996aec6c0fb52c3f84905d831bbe442e669e0b952746c80523937f",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-MACD-SLOWLEN-V1",
  "case_id": "v5-float-length-macd-slowlen-v1",
  "builtin": "ta.macd",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "TARGET_SIGNAL",
    "TARGET_HIST",
    "FLOOR_MACD",
    "FLOOR_SIGNAL",
    "FLOOR_HIST",
    "CEIL_MACD",
    "CEIL_SIGNAL",
    "CEIL_HIST",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-MACD-SLOWLEN-V1")
[targetMacd, targetSignal, targetHist] = ta.macd(close, 12, 26.5, 9)
[floorMacd, floorSignal, floorHist] = ta.macd(close, 12, 26, 9)
[ceilMacd, ceilSignal, ceilHist] = ta.macd(close, 12, 27, 9)
plot(targetMacd, title="OUTCOME", display=display.data_window)
plot(targetSignal, title="TARGET_SIGNAL", display=display.data_window)
plot(targetHist, title="TARGET_HIST", display=display.data_window)
plot(floorMacd, title="FLOOR_MACD", display=display.data_window)
plot(floorSignal, title="FLOOR_SIGNAL", display=display.data_window)
plot(floorHist, title="FLOOR_HIST", display=display.data_window)
plot(ceilMacd, title="CEIL_MACD", display=display.data_window)
plot(ceilSignal, title="CEIL_SIGNAL", display=display.data_window)
plot(ceilHist, title="CEIL_HIST", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-percentile-linear-interpolation-v1.pine

SHA-256: `190cc35c041f595de1381eafd272d88f2f0ee92116d637241fcbbb0934ebf311`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-percentile-linear-interpolation-v1.pine",
  "sha256": "190cc35c041f595de1381eafd272d88f2f0ee92116d637241fcbbb0934ebf311",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-PERCENTILE-LINEAR-INTERPOLATION-V1",
  "case_id": "v5-float-length-percentile-linear-interpolation-v1",
  "builtin": "ta.percentile_linear_interpolation",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "FLOOR_CONTROL",
    "CEIL_CONTROL",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-PERCENTILE-LINEAR-INTERPOLATION-V1")
targetValue = ta.percentile_linear_interpolation(close, 2.5, 50)
floorValue = ta.percentile_linear_interpolation(close, 2, 50)
ceilValue = ta.percentile_linear_interpolation(close, 3, 50)
plot(targetValue, title="OUTCOME", display=display.data_window)
plot(floorValue, title="FLOOR_CONTROL", display=display.data_window)
plot(ceilValue, title="CEIL_CONTROL", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-sma-v1.pine

SHA-256: `41f9bac020524cc448086b36650b140449132ba093ce84bf329105ab419a8fc4`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-sma-v1.pine",
  "sha256": "41f9bac020524cc448086b36650b140449132ba093ce84bf329105ab419a8fc4",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-SMA-V1",
  "case_id": "v5-float-length-sma-v1",
  "builtin": "ta.sma",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "FLOOR_CONTROL",
    "CEIL_CONTROL",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-SMA-V1")
targetValue = ta.sma(close, 7.5)
floorValue = ta.sma(close, 7)
ceilValue = ta.sma(close, 8)
plot(targetValue, title="OUTCOME", display=display.data_window)
plot(floorValue, title="FLOOR_CONTROL", display=display.data_window)
plot(ceilValue, title="CEIL_CONTROL", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## v5-float-length-wma-v1.pine

SHA-256: `ec12f1cbadc061f3793f8d7053376caadda714e44cb244421112f292ab73966f`

Minimum history: 500 bars.



Expected readings and required evidence:

```json
{
  "script": "v5-float-length-wma-v1.pine",
  "sha256": "ec12f1cbadc061f3793f8d7053376caadda714e44cb244421112f292ab73966f",
  "pine_version": 5,
  "conflict_id": "V5-FLOAT-LENGTH-WMA-V1",
  "case_id": "v5-float-length-wma-v1",
  "builtin": "ta.wma",
  "category": "v5-float-length-outcome",
  "authority": [
    "Native TradingView v5 observation required; no v6 rule extrapolated."
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Determine native refusal or fractional length handling using integer floor/ceiling controls."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "FLOOR_CONTROL",
    "CEIL_CONTROL",
    "INPUT_CLOSE",
    "BAR_INDEX"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-qbppf4",
  "minimum_history_bars": 500,
  "record": [
    "Preserve exact observed compile/runtime phase and diagnostic with line/bar/time and screenshot.",
    "If accepted, export all target/control/input columns including startup and missingness.",
    "Do not alter source or infer native behavior from local engine results."
  ]
}
```

```pine
//@version=5
indicator("V5-FLOAT-LENGTH-WMA-V1")
targetValue = ta.wma(close, 7.5)
floorValue = ta.wma(close, 7)
ceilValue = ta.wma(close, 8)
plot(targetValue, title="OUTCOME", display=display.data_window)
plot(floorValue, title="FLOOR_CONTROL", display=display.data_window)
plot(ceilValue, title="CEIL_CONTROL", display=display.data_window)
plot(close, title="INPUT_CLOSE", display=display.data_window)
plot(bar_index, title="BAR_INDEX", display=display.data_window)
```

## native-float-comparison-boundary-v1.pine

SHA-256: `c16b04f7d8075253df69ef8dd27d9c4d8b7dfbe098246c3cf4510ffa58c85eb7`

Minimum history: 12 bars.



Expected readings and required evidence:

```json
{
  "script": "native-float-comparison-boundary-v1.pine",
  "sha256": "c16b04f7d8075253df69ef8dd27d9c4d8b7dfbe098246c3cf4510ffa58c85eb7",
  "pine_version": 6,
  "conflict_id": "NATIVE-FLOAT-COMPARISON-BOUNDARY-V1",
  "category": "numeric-native-discriminator",
  "authority": [],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native outcome unobserved. Preserve exact comparison mask, magnitude missingness, scaled values and logs without assuming comparison precision or export clipping."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "minimum_history_bars": 12,
  "record": [
    "Full untouched CSV; exact diagnostics if refused; reset/export UTC and independently observed live cutoff.",
    "Preserve all specified logs and column order."
  ]
}
```

```pine
//@version=6
indicator("V4-NATIVE-FLOAT-COMPARISON-BOUNDARY")
phase = bar_index % 12
x = switch phase
    0 => 9e-11
    1 => 1e-10
    2 => 1.1e-10
    3 => 4.9e-10
    4 => -9e-11
    5 => -1.1e-10
    6 => 1.00000000009
    7 => 1.00000000011
    8 => 1.00000000049
    9 => 100000000.00000001
    10 => 0.0
    => -0.0
base = phase >= 6 and phase <= 8 ? 1.0 : phase == 9 ? 100000000.0 : 0.0
outcome = (x == base ? 1 : 0) + (x != base ? 2 : 0) + (x < base ? 4 : 0) + (x > base ? 8 : 0) + (x <= base ? 16 : 0) + (x >= base ? 32 : 0)
plot(outcome, "OUTCOME")
if bar_index < 12
    log.info("phase={0}; x={1}; base={2}; comparison-mask={3}", phase, x, base, outcome)
```

## native-float-magnitude-output-v1.pine

SHA-256: `3fabe6f76e9461c1ad1ec7d7cba3029c07be9f3e34b10cb8e840c8a87be5d5df`

Minimum history: 8 bars.



Expected readings and required evidence:

```json
{
  "script": "native-float-magnitude-output-v1.pine",
  "sha256": "3fabe6f76e9461c1ad1ec7d7cba3029c07be9f3e34b10cb8e840c8a87be5d5df",
  "pine_version": 6,
  "conflict_id": "NATIVE-FLOAT-MAGNITUDE-OUTPUT-V1",
  "category": "numeric-native-discriminator",
  "authority": [],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native outcome unobserved. Preserve exact comparison mask, magnitude missingness, scaled values and logs without assuming comparison precision or export clipping."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME",
    "SOURCE_NA",
    "SCALED_SOURCE",
    "PREVIOUS_NA"
  ],
  "minimum_history_bars": 8,
  "record": [
    "Full untouched CSV; exact diagnostics if refused; reset/export UTC and independently observed live cutoff.",
    "Preserve all specified logs and column order."
  ]
}
```

```pine
//@version=6
indicator("V4-NATIVE-FLOAT-MAGNITUDE-OUTPUT")
phase = bar_index % 8
magnitude = switch phase
    0 => 9e99
    1 => 1e100
    2 => 1.1e100
    3 => -1.1e100
    4 => 1e101
    5 => 1e200
    6 => 1e300
    => 0.0
calculated = magnitude * 1.0
plot(calculated, "OUTCOME")
plot(na(calculated) ? 1 : 0, "SOURCE_NA")
plot(calculated / 1e100, "SCALED_SOURCE")
plot(na(calculated[1]) ? 1 : 0, "PREVIOUS_NA")
if bar_index < 8
    log.info("phase={0}; source-na={1}; scaled={2}; previous-na={3}", phase, na(calculated), calculated / 1e100, na(calculated[1]))
```

## trace-plotbar-inconsistent-ohlc-visual-v6.pine

SHA-256: `983e478662a5336ae6cfd7de04c34ced3b3a8b67135683e5a41395711590a253`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-plotbar-inconsistent-ohlc-visual-v6.pine",
  "sha256": "983e478662a5336ae6cfd7de04c34ced3b3a8b67135683e5a41395711590a253",
  "pine_version": 6,
  "conflict_id": "V4-PLOTBAR-RAW-OHLC-GEOMETRY",
  "case_id": "trace-plotbar-inconsistent-ohlc-visual-v6",
  "builtin": "plotbar",
  "category": "visual-geometry-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_plotbar"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native v2 CSV establishes raw supplied OHLC exports, not inconsistent-OHLC rendering. Four-extrema normalization is HOLD pending actual native visual evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "TARGET_RAW_OHLC (Open)",
    "TARGET_RAW_OHLC (High)",
    "TARGET_RAW_OHLC (Low)",
    "TARGET_RAW_OHLC (Close)",
    "CASE_index",
    "CTRL_bar_index",
    "CTRL_time",
    "SUPPLIED_open",
    "SUPPLIED_high",
    "SUPPLIED_low",
    "SUPPLIED_close",
    "OUTCOME"
  ],
  "target_lines": [
    13
  ],
  "registered_owner": "codex-6y3sjh",
  "record": [
    "On RUNS retain untouched CSV with target OHLC fields, supplied raw fields,CASE_index,bar_index/time, andOUTCOME. CSV alone does not settle geometry.",
    "Save unobstructed full indicator-pane screenshot of latest18 bars, including case labelsC0\u2013C5 and90/130 axis guides; enlarge pane and zoom to wide individual bars.",
    "For cases1\u20134 retain close-up screenshots with wick/stem endpoints, candle body or bar open/close ticks, axis values and case labels visible. Record whether target absent, normalized, raw, clipped, or another observed shape; no prediction is selected.",
    "Record case5 visibility separately; do not infer missing-field geometry from case1\u20134.",
    "If refused retain exact phase/diagnostic/code/line/bar/time and screenshot. Do not alter source to obtain success; missing screenshot means geometry remainsUNSETTLED."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=6
indicator("V4-PLOTBAR-RAW-OHLC-VISUAL", overlay=false, max_labels_count=32)
// Screenshot evidence is REQUIRED: CSV raw fields cannot settle geometry.
// Repeating cases: 0 consistent, 1 high<close, 2 low>open,
// 3 reversed high/low, 4 both open/close outside supplied range, 5 missing high.
phase = bar_index % 6
o = phase == 2 ? 105.0 : phase == 4 ? 123.0 : 110.0
h = phase == 1 ? 112.0 : phase == 3 ? 103.0 : phase == 4 ? 114.0 : phase == 5 ? float(na) : 120.0
l = phase == 2 ? 110.0 : phase == 3 ? 119.0 : phase == 4 ? 106.0 : 100.0
c = phase == 1 ? 118.0 : phase == 4 ? 97.0 : 115.0
hline(90, "LABEL_LEVEL", color=color.gray)
hline(130, "SCALE_TOP", color=color.gray)
plotbar(o, h, l, c, title="TARGET_RAW_OHLC", color=color.fuchsia, show_last=18)
if bar_index >= last_bar_index - 17
    label.new(bar_index, 90, "C" + str.tostring(phase), style=label.style_none, textcolor=color.white, size=size.small)
plot(phase, "CASE_index", display=display.data_window)
plot(bar_index, "CTRL_bar_index", display=display.data_window)
plot(time, "CTRL_time", display=display.data_window)
plot(o, "SUPPLIED_open", display=display.data_window)
plot(h, "SUPPLIED_high", display=display.data_window)
plot(l, "SUPPLIED_low", display=display.data_window)
plot(c, "SUPPLIED_close", display=display.data_window)
plot(1, "OUTCOME", display=display.data_window)
```

## trace-plotcandle-inconsistent-ohlc-visual-v6.pine

SHA-256: `da452055cf03244da93a37c113e5032970fdb9cc8bfbf3ba6563c444117f4f84`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-plotcandle-inconsistent-ohlc-visual-v6.pine",
  "sha256": "da452055cf03244da93a37c113e5032970fdb9cc8bfbf3ba6563c444117f4f84",
  "pine_version": 6,
  "conflict_id": "V4-PLOTCANDLE-RAW-OHLC-GEOMETRY",
  "case_id": "trace-plotcandle-inconsistent-ohlc-visual-v6",
  "builtin": "plotcandle",
  "category": "visual-geometry-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_plotcandle"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native v2 CSV establishes raw supplied OHLC exports, not inconsistent-OHLC rendering. Four-extrema normalization is HOLD pending actual native visual evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "TARGET_RAW_OHLC (Open)",
    "TARGET_RAW_OHLC (High)",
    "TARGET_RAW_OHLC (Low)",
    "TARGET_RAW_OHLC (Close)",
    "CASE_index",
    "CTRL_bar_index",
    "CTRL_time",
    "SUPPLIED_open",
    "SUPPLIED_high",
    "SUPPLIED_low",
    "SUPPLIED_close",
    "OUTCOME"
  ],
  "target_lines": [
    13
  ],
  "registered_owner": "codex-6y3sjh",
  "record": [
    "On RUNS retain untouched CSV with target OHLC fields, supplied raw fields,CASE_index,bar_index/time, andOUTCOME. CSV alone does not settle geometry.",
    "Save unobstructed full indicator-pane screenshot of latest18 bars, including case labelsC0\u2013C5 and90/130 axis guides; enlarge pane and zoom to wide individual bars.",
    "For cases1\u20134 retain close-up screenshots with wick/stem endpoints, candle body or bar open/close ticks, axis values and case labels visible. Record whether target absent, normalized, raw, clipped, or another observed shape; no prediction is selected.",
    "Record case5 visibility separately; do not infer missing-field geometry from case1\u20134.",
    "If refused retain exact phase/diagnostic/code/line/bar/time and screenshot. Do not alter source to obtain success; missing screenshot means geometry remainsUNSETTLED."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=6
indicator("V4-PLOTCANDLE-RAW-OHLC-VISUAL", overlay=false, max_labels_count=32)
// Screenshot evidence is REQUIRED: CSV raw fields cannot settle geometry.
// Repeating cases: 0 consistent, 1 high<close, 2 low>open,
// 3 reversed high/low, 4 both open/close outside supplied range, 5 missing high.
phase = bar_index % 6
o = phase == 2 ? 105.0 : phase == 4 ? 123.0 : 110.0
h = phase == 1 ? 112.0 : phase == 3 ? 103.0 : phase == 4 ? 114.0 : phase == 5 ? float(na) : 120.0
l = phase == 2 ? 110.0 : phase == 3 ? 119.0 : phase == 4 ? 106.0 : 100.0
c = phase == 1 ? 118.0 : phase == 4 ? 97.0 : 115.0
hline(90, "LABEL_LEVEL", color=color.gray)
hline(130, "SCALE_TOP", color=color.gray)
plotcandle(o, h, l, c, title="TARGET_RAW_OHLC", color=color.new(color.orange, 60), wickcolor=color.fuchsia, bordercolor=color.white, show_last=18)
if bar_index >= last_bar_index - 17
    label.new(bar_index, 90, "C" + str.tostring(phase), style=label.style_none, textcolor=color.white, size=size.small)
plot(phase, "CASE_index", display=display.data_window)
plot(bar_index, "CTRL_bar_index", display=display.data_window)
plot(time, "CTRL_time", display=display.data_window)
plot(o, "SUPPLIED_open", display=display.data_window)
plot(h, "SUPPLIED_high", display=display.data_window)
plot(l, "SUPPLIED_low", display=display.data_window)
plot(c, "SUPPLIED_close", display=display.data_window)
plot(1, "OUTCOME", display=display.data_window)
```

## trace-bgcolor-offset-v3-series.pine

SHA-256: `605ab6938f7b6f0940c5300c11f9efe5c6ac710dd5c9d862e1bff02b60f557fe`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v3-series.pine",
  "sha256": "605ab6938f7b6f0940c5300c11f9efe5c6ac710dd5c9d862e1bff02b60f557fe",
  "pine_version": 3,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V3-SERIES",
  "case_id": "trace-bgcolor-offset-v3-series",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Historical bgcolor placement is not supplied by numeric source columns. Capture screenshots/crosshair at phase5..16 in at least3 completed32-bar cycles; map colors to timestamp and BAR_INDEX. Preserve compile warning/error. Generic plot last-offset prose is a hypothesis for bgcolor, not the observed answer."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    199
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v3-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=3
study("trace-bgcolor-offset-v3-series", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? red : source_code == 2 ? blue : source_code == 3 ? lime : source_code == 4 ? orange : na
bgcolor(tint, offset=series_offset, transp=0)
plot(bar_index, "BAR_INDEX", transp=100)
plot(phase, "PHASE", transp=100)
plot(source_code, "SOURCE_CODE", transp=100)
plot(series_offset, "SERIES_OFFSET", transp=100)
```

## trace-bgcolor-offset-v3-zero-control.pine

SHA-256: `1be260a87df772d3d4e2bb92b0f7cfe4b24043a378b423bf7dfee999ac38ceec`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v3-zero-control.pine",
  "sha256": "1be260a87df772d3d4e2bb92b0f7cfe4b24043a378b423bf7dfee999ac38ceec",
  "pine_version": 3,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V3-ZERO-CONTROL",
  "case_id": "trace-bgcolor-offset-v3-zero-control",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Zero-offset control: red phase8,blue phase9,lime phase11,orange phase12. Confirm observed backgrounds and unshifted code/time correspondence before judging series probe."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "DOCUMENTED-CONTROL",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    199
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v3-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=3
study("trace-bgcolor-offset-v3-zero-control", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? red : source_code == 2 ? blue : source_code == 3 ? lime : source_code == 4 ? orange : na
bgcolor(tint, offset=0, transp=0)
plot(bar_index, "BAR_INDEX", transp=100)
plot(phase, "PHASE", transp=100)
plot(source_code, "SOURCE_CODE", transp=100)
plot(series_offset, "SERIES_OFFSET", transp=100)
```

## trace-bgcolor-offset-v4-series.pine

SHA-256: `b3e3d6dd5800c42532c165795ab826df4910049806a27a83578ccb026d0c3244`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v4-series.pine",
  "sha256": "b3e3d6dd5800c42532c165795ab826df4910049806a27a83578ccb026d0c3244",
  "pine_version": 4,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V4-SERIES",
  "case_id": "trace-bgcolor-offset-v4-series",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Historical bgcolor placement is not supplied by numeric source columns. Capture screenshots/crosshair at phase5..16 in at least3 completed32-bar cycles; map colors to timestamp and BAR_INDEX. Preserve compile warning/error. Generic plot last-offset prose is a hypothesis for bgcolor, not the observed answer."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    200
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v4-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=4
study("trace-bgcolor-offset-v4-series", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? color.red : source_code == 2 ? color.blue : source_code == 3 ? color.lime : source_code == 4 ? color.orange : na
bgcolor(tint, offset=series_offset, transp=0)
plot(bar_index, "BAR_INDEX", transp=100)
plot(phase, "PHASE", transp=100)
plot(source_code, "SOURCE_CODE", transp=100)
plot(series_offset, "SERIES_OFFSET", transp=100)
```

## trace-bgcolor-offset-v4-zero-control.pine

SHA-256: `63ae14acdaf97440468c1d7afcfc483e391d0790e3696c80c765bd2d34ddae13`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v4-zero-control.pine",
  "sha256": "63ae14acdaf97440468c1d7afcfc483e391d0790e3696c80c765bd2d34ddae13",
  "pine_version": 4,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V4-ZERO-CONTROL",
  "case_id": "trace-bgcolor-offset-v4-zero-control",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Zero-offset control: red phase8,blue phase9,lime phase11,orange phase12. Confirm observed backgrounds and unshifted code/time correspondence before judging series probe."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "DOCUMENTED-CONTROL",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    200
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v4-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=4
study("trace-bgcolor-offset-v4-zero-control", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? color.red : source_code == 2 ? color.blue : source_code == 3 ? color.lime : source_code == 4 ? color.orange : na
bgcolor(tint, offset=0, transp=0)
plot(bar_index, "BAR_INDEX", transp=100)
plot(phase, "PHASE", transp=100)
plot(source_code, "SOURCE_CODE", transp=100)
plot(series_offset, "SERIES_OFFSET", transp=100)
```

## trace-bgcolor-offset-v5-series.pine

SHA-256: `8f7f59dfe6674c2d8ac0d5150b8541a6bd5744621392e9d069a33933d3756061`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v5-series.pine",
  "sha256": "8f7f59dfe6674c2d8ac0d5150b8541a6bd5744621392e9d069a33933d3756061",
  "pine_version": 5,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V5-SERIES",
  "case_id": "trace-bgcolor-offset-v5-series",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Historical bgcolor placement is not supplied by numeric source columns. Capture screenshots/crosshair at phase5..16 in at least3 completed32-bar cycles; map colors to timestamp and BAR_INDEX. Preserve compile warning/error. Generic plot last-offset prose is a hypothesis for bgcolor, not the observed answer."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    198
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v5-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=5
indicator("trace-bgcolor-offset-v5-series", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? color.red : source_code == 2 ? color.blue : source_code == 3 ? color.lime : source_code == 4 ? color.orange : na
bgcolor(tint, offset=series_offset)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(phase, "PHASE", display=display.data_window)
plot(source_code, "SOURCE_CODE", display=display.data_window)
plot(series_offset, "SERIES_OFFSET", display=display.data_window)
```

## trace-bgcolor-offset-v5-zero-control.pine

SHA-256: `73f1a64da230734afd8380b95b5008091ce12fe0c992c14e99c277d7da7a40a6`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-bgcolor-offset-v5-zero-control.pine",
  "sha256": "73f1a64da230734afd8380b95b5008091ce12fe0c992c14e99c277d7da7a40a6",
  "pine_version": 5,
  "conflict_id": "TRACE-BGCOLOR-OFFSET-V5-ZERO-CONTROL",
  "case_id": "trace-bgcolor-offset-v5-zero-control",
  "builtin": "bgcolor",
  "category": "historical-visual-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Zero-offset control: red phase8,blue phase9,lime phase11,orange phase12. Confirm observed backgrounds and unshifted code/time correspondence before judging series probe."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "DOCUMENTED-CONTROL",
  "columns": [
    "BAR_INDEX",
    "PHASE",
    "SOURCE_CODE",
    "SERIES_OFFSET"
  ],
  "target_lines": [
    7
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    198
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "visual_capture_required": true,
  "numeric_columns_do_not_observe_background_placement": true,
  "comparison_control": "trace-bgcolor-offset-v5-zero-control.pine",
  "screenshot_window": "PHASE5..16 in3 completed cycles; show crosshair time/price and DataWindow BAR_INDEX. Save full-chart latest offset/context."
}
```

```pine
//@version=5
indicator("trace-bgcolor-offset-v5-zero-control", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? color.red : source_code == 2 ? color.blue : source_code == 3 ? color.lime : source_code == 4 ? color.orange : na
bgcolor(tint, offset=0)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(phase, "PHASE", display=display.data_window)
plot(source_code, "SOURCE_CODE", display=display.data_window)
plot(series_offset, "SERIES_OFFSET", display=display.data_window)
```

## corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine

SHA-256: `648a40f61bd4fa0dd8ad8fb77c9cf158334291e7258f658e79b790fccd836a79`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus1-matrix-sum-omitted-id2-namespace-float-v1.pine",
  "sha256": "648a40f61bd4fa0dd8ad8fb77c9cf158334291e7258f658e79b790fccd836a79",
  "pine_version": 6,
  "conflict_id": "V4-MATRIX-SUM-OMITTED-ID2-NAMESPACE-FLOAT",
  "case_id": "corpus1:matrix-sum-omitted-id2:namespace-float",
  "builtin": "matrix.sum",
  "category": "corpus1-omitted-operand-result",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sum"
  ],
  "registered_owner": "codex-pjlp6t",
  "corpus_indices": [
    154,
    166,
    167,
    200,
    201,
    202,
    203,
    204,
    205,
    206
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe the exact native phase and omitted-id2 result shape/value. Acceptance and result semantics are separate. No scalar reduction or matrix default is assumed."
  },
  "claim_a": {
    "text": "If omitted id2 denotes an element reduction, independent arithmetic gives the total below. This is a conditional hypothesis, not native evidence.",
    "expected_outcome": {
      "phase": "UNSPECIFIED",
      "conditional_scalar_reduction": 1.8125
    }
  },
  "claim_b": {
    "text": "The documented binary overload requires id2. An upstream v6 regression fixture reports native missing-id2 refusal in June2026. Capture a conflicting acceptance/result without altering the source.",
    "expected_outcome": {
      "phase": "COMPILE-REJECTION",
      "columns": {}
    }
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    8
  ],
  "minimum_history_bars": 100,
  "result_observation": {
    "text_label": "RESULT=",
    "table_cell": [
      0,
      0
    ],
    "log_bar": "first"
  },
  "record": [
    "Keep unchanged v6 source and SHA256. Capture full native compile/runtime diagnostic, code if exposed, line/column, screenshot and first failing bar/time.",
    "For RUNS, copy the complete first-bar RESULT= log message, including whitespace/newlines; save a table screenshot showing the exact result. Preserve matrix/string formatting as text, without forcing a numeric interpretation.",
    "Export the complete OUTCOME CSV. OUTCOME=1 is an acceptance/execution sentinel; it is not the omitted-id2 result.",
    "A str.tostring/log/table failure is an instrumentation result. Preserve it and the accepted target line if exposed; do not classify it as matrix.sum refusal or invent the masked value."
  ],
  "adjudication": "Namespace, receiver and returned-receiver are separate attempts. Finite constants distinguish signed element reduction from a matrix return. These observations do not settle empty/all-na inputs, return qualifier/type contracts, reference sharing or unsupported element types.",
  "provenance": "matrix-sum-provenance-v2.json in the corpus-1 replay archive retains exact ten-source hashes/versions/call shapes. The recorded sources are GitHub runtime/compiler fixtures; no exact-source TradingView publication/acceptance record has been located."
}
```

```pine
//@version=6
indicator("V4-MATRIX-SUM-OMITTED-ID2-NAMESPACE-FLOAT")
var values = matrix.new<float>(2, 2, 0)
matrix.set(values, 0, 0, 2.5)
matrix.set(values, 0, 1, 5.25)
matrix.set(values, 1, 0, 11.125)
matrix.set(values, 1, 1, -17.0625)
result = matrix.sum(values)
observedText = "RESULT=" + str.tostring(result)
var results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    log.info(observedText)
    table.cell(results, 0, 0, observedText)
plot(1, "OUTCOME")
```

## corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine

SHA-256: `7a9b43ead84e059ec1f2e1a9b5b1b124a02c6419ce2971ab2c0d2059207340e1`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus1-matrix-sum-omitted-id2-receiver-int-v1.pine",
  "sha256": "7a9b43ead84e059ec1f2e1a9b5b1b124a02c6419ce2971ab2c0d2059207340e1",
  "pine_version": 6,
  "conflict_id": "V4-MATRIX-SUM-OMITTED-ID2-RECEIVER-INT",
  "case_id": "corpus1:matrix-sum-omitted-id2:receiver-int",
  "builtin": "matrix.sum",
  "category": "corpus1-omitted-operand-result",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sum"
  ],
  "registered_owner": "codex-pjlp6t",
  "corpus_indices": [
    154,
    166,
    167,
    200,
    201,
    202,
    203,
    204,
    205,
    206
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe the exact native phase and omitted-id2 result shape/value. Acceptance and result semantics are separate. No scalar reduction or matrix default is assumed."
  },
  "claim_a": {
    "text": "If omitted id2 denotes an element reduction, independent arithmetic gives the total below. This is a conditional hypothesis, not native evidence.",
    "expected_outcome": {
      "phase": "UNSPECIFIED",
      "conditional_scalar_reduction": 1
    }
  },
  "claim_b": {
    "text": "The documented binary overload requires id2. An upstream v6 regression fixture reports native missing-id2 refusal in June2026. Capture a conflicting acceptance/result without altering the source.",
    "expected_outcome": {
      "phase": "COMPILE-REJECTION",
      "columns": {}
    }
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    8
  ],
  "minimum_history_bars": 100,
  "result_observation": {
    "text_label": "RESULT=",
    "table_cell": [
      0,
      0
    ],
    "log_bar": "first"
  },
  "record": [
    "Keep unchanged v6 source and SHA256. Capture full native compile/runtime diagnostic, code if exposed, line/column, screenshot and first failing bar/time.",
    "For RUNS, copy the complete first-bar RESULT= log message, including whitespace/newlines; save a table screenshot showing the exact result. Preserve matrix/string formatting as text, without forcing a numeric interpretation.",
    "Export the complete OUTCOME CSV. OUTCOME=1 is an acceptance/execution sentinel; it is not the omitted-id2 result.",
    "A str.tostring/log/table failure is an instrumentation result. Preserve it and the accepted target line if exposed; do not classify it as matrix.sum refusal or invent the masked value."
  ],
  "adjudication": "Namespace, receiver and returned-receiver are separate attempts. Finite constants distinguish signed element reduction from a matrix return. These observations do not settle empty/all-na inputs, return qualifier/type contracts, reference sharing or unsupported element types.",
  "provenance": "matrix-sum-provenance-v2.json in the corpus-1 replay archive retains exact ten-source hashes/versions/call shapes. The recorded sources are GitHub runtime/compiler fixtures; no exact-source TradingView publication/acceptance record has been located."
}
```

```pine
//@version=6
indicator("V4-MATRIX-SUM-OMITTED-ID2-RECEIVER-INT")
var values = matrix.new<int>(2, 2, 0)
matrix.set(values, 0, 0, 2)
matrix.set(values, 0, 1, 5)
matrix.set(values, 1, 0, 11)
matrix.set(values, 1, 1, -17)
result = values.sum()
observedText = "RESULT=" + str.tostring(result)
var results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    log.info(observedText)
    table.cell(results, 0, 0, observedText)
plot(1, "OUTCOME")
```

## corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine

SHA-256: `0574e171678061e4cb07a809c988a101d326d55d4f7998e3016f2964f6bf3c1f`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus1-matrix-sum-omitted-id2-returned-receiver-float-v1.pine",
  "sha256": "0574e171678061e4cb07a809c988a101d326d55d4f7998e3016f2964f6bf3c1f",
  "pine_version": 6,
  "conflict_id": "V4-MATRIX-SUM-OMITTED-ID2-RETURNED-RECEIVER-FLOAT",
  "case_id": "corpus1:matrix-sum-omitted-id2:returned-receiver-float",
  "builtin": "matrix.sum",
  "category": "corpus1-omitted-operand-result",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sum"
  ],
  "registered_owner": "codex-pjlp6t",
  "corpus_indices": [
    154,
    166,
    167,
    200,
    201,
    202,
    203,
    204,
    205,
    206
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe the exact native phase and omitted-id2 result shape/value. Acceptance and result semantics are separate. No scalar reduction or matrix default is assumed."
  },
  "claim_a": {
    "text": "If omitted id2 denotes an element reduction, independent arithmetic gives the total below. This is a conditional hypothesis, not native evidence.",
    "expected_outcome": {
      "phase": "UNSPECIFIED",
      "conditional_scalar_reduction": 1.8125
    }
  },
  "claim_b": {
    "text": "The documented binary overload requires id2. An upstream v6 regression fixture reports native missing-id2 refusal in June2026. Capture a conflicting acceptance/result without altering the source.",
    "expected_outcome": {
      "phase": "COMPILE-REJECTION",
      "columns": {}
    }
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    8
  ],
  "minimum_history_bars": 100,
  "result_observation": {
    "text_label": "RESULT=",
    "table_cell": [
      0,
      0
    ],
    "log_bar": "first"
  },
  "record": [
    "Keep unchanged v6 source and SHA256. Capture full native compile/runtime diagnostic, code if exposed, line/column, screenshot and first failing bar/time.",
    "For RUNS, copy the complete first-bar RESULT= log message, including whitespace/newlines; save a table screenshot showing the exact result. Preserve matrix/string formatting as text, without forcing a numeric interpretation.",
    "Export the complete OUTCOME CSV. OUTCOME=1 is an acceptance/execution sentinel; it is not the omitted-id2 result.",
    "A str.tostring/log/table failure is an instrumentation result. Preserve it and the accepted target line if exposed; do not classify it as matrix.sum refusal or invent the masked value."
  ],
  "adjudication": "Namespace, receiver and returned-receiver are separate attempts. Finite constants distinguish signed element reduction from a matrix return. These observations do not settle empty/all-na inputs, return qualifier/type contracts, reference sharing or unsupported element types.",
  "provenance": "matrix-sum-provenance-v2.json in the corpus-1 replay archive retains exact ten-source hashes/versions/call shapes. The recorded sources are GitHub runtime/compiler fixtures; no exact-source TradingView publication/acceptance record has been located."
}
```

```pine
//@version=6
indicator("V4-MATRIX-SUM-OMITTED-ID2-RETURNED-RECEIVER-FLOAT")
var values = matrix.new<float>(2, 2, 0)
matrix.set(values, 0, 0, 2.5)
matrix.set(values, 0, 1, 5.25)
matrix.set(values, 1, 0, 11.125)
matrix.set(values, 1, 1, -17.0625)
result = matrix.copy(values).sum()
observedText = "RESULT=" + str.tostring(result)
var results = table.new(position.top_right, 1, 1)
if barstate.isfirst
    log.info(observedText)
    table.cell(results, 0, 0, observedText)
plot(1, "OUTCOME")
```

## corpus5-change-negative-v1.pine

SHA-256: `a78c744ea3a4a1a52ef03f15e4a499f2d5f48eb98cf9fc724481b2ec9162d1eb`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-change-negative-v1.pine",
  "sha256": "a78c744ea3a4a1a52ef03f15e4a499f2d5f48eb98cf9fc724481b2ec9162d1eb",
  "pine_version": 5,
  "conflict_id": "CORPUS5-CHANGE-NEGATIVE-V1",
  "case_id": "corpus5-change-negative-v1",
  "builtin": "ta.change",
  "category": "corpus5-runtime-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.change"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Negative offset domain is not explicitly specified. Preserve exact target outcome."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": null,
  "corpus_indices": [
    1667
  ],
  "record": [
    "Keep exact native compile/runtime stage, diagnostic, line/bar/time and evidence; otherwise export all OUTCOME values/na.",
    "Never alter the source to obtain success. Local result is not native evidence."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=5
indicator("CORPUS5-CHANGE-NEGATIVE-V1")
value = ta.change(close, -1)
plot(value, "OUTCOME")
```

## corpus5-change-zero-v1.pine

SHA-256: `0b125c6cf46664f2d8225a1995c2bbeffa3fa495d2ab0216615e39dca99068f3`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-change-zero-v1.pine",
  "sha256": "0b125c6cf46664f2d8225a1995c2bbeffa3fa495d2ab0216615e39dca99068f3",
  "pine_version": 5,
  "conflict_id": "CORPUS5-CHANGE-ZERO-V1",
  "case_id": "corpus5-change-zero-v1",
  "builtin": "ta.change",
  "category": "corpus5-runtime-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.change"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Zero offset domain is not explicitly specified. Preserve acceptance/zero/na/error without guessing."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": null,
  "corpus_indices": [
    1667
  ],
  "record": [
    "Keep exact native compile/runtime stage, diagnostic, line/bar/time and evidence; otherwise export all OUTCOME values/na.",
    "Never alter the source to obtain success. Local result is not native evidence."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=5
indicator("CORPUS5-CHANGE-ZERO-V1")
value = ta.change(close, 0)
plot(value, "OUTCOME")
```

## corpus5-exp-price-overflow-v1.pine

SHA-256: `cc9441af5efc1be09308a9eb2db5c6b46c3a9485891fb86d08485cbacb7db436`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-exp-price-overflow-v1.pine",
  "sha256": "cc9441af5efc1be09308a9eb2db5c6b46c3a9485891fb86d08485cbacb7db436",
  "pine_version": 5,
  "conflict_id": "CORPUS5-EXP-PRICE-OVERFLOW-V1",
  "case_id": "corpus5-exp-price-overflow-v1",
  "builtin": "math.exp",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_math.exp"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "BTC exponent overflows local finite representation. Exact native overflow/missingness not specified; capture all OUTCOME values."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [
    160,
    162
  ],
  "minimum_history_bars": 100,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=5
indicator("corpus5-exp-price-overflow-v1")
plot(math.exp(close), "OUTCOME")
```

## corpus5-matrix-negative-identity-power-v1.pine

SHA-256: `1b770d87ce52689dc5bf49b6dd23656f7de2310724af9fae996d5abe192063ec`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-matrix-negative-identity-power-v1.pine",
  "sha256": "1b770d87ce52689dc5bf49b6dd23656f7de2310724af9fae996d5abe192063ec",
  "pine_version": 6,
  "conflict_id": "CORPUS5-MATRIX-NEGATIVE-IDENTITY-POWER-V1",
  "case_id": "corpus5-matrix-negative-identity-power-v1",
  "builtin": "matrix.pow",
  "category": "corpus5-runtime-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.pow"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Negative matrix power domain is not specified in current reference remarks."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-776dnu",
  "corpus_indices": [
    1167
  ],
  "record": [
    "Keep exact native compile/runtime stage, diagnostic, line/bar/time and evidence; otherwise export all OUTCOME values/na.",
    "Never alter the source to obtain success. Local result is not native evidence."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=6
indicator("CORPUS5-MATRIX-NEGATIVE-IDENTITY-POWER-V1")
value = matrix.pow(matrix.new<float>(1, 1, 1.0), -1)
plot(matrix.get(value, 0, 0), "OUTCOME")
```

## corpus5-pivot-request-counter-v1.pine

SHA-256: `d91765c9517a779ff170b0b6632d4941fac93206a3c48be8015b4758e5d6cf20`

Minimum history: 1500 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-pivot-request-counter-v1.pine",
  "sha256": "d91765c9517a779ff170b0b6632d4941fac93206a3c48be8015b4758e5d6cf20",
  "pine_version": 5,
  "conflict_id": "CORPUS5-PIVOT-REQUEST-COUNTER-V1",
  "case_id": "corpus5:pivot-request-counter",
  "builtin": "request.security/ta.pivot_point_levels",
  "category": "corpus5-composed-request-counter",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Capture daily-context counter alongside pivot array. Preserve values/na/errors; this primitive does not certify the three entire corpus scripts."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "registered_owner": "codex-p4250m",
  "corpus_indices": [
    991,
    1635,
    1644
  ],
  "minimum_history_bars": 1500,
  "record": [
    "Use at least1500 2-minute bars spanning two daily boundaries. Retain chart time and nativebar evidence.",
    "Save exact native diagnostics or full OUTCOME CSV. No zero/nonzero inference from chart history length alone."
  ]
}
```

```pine
//@version=5
indicator("CORPUS5-PIVOT-REQUEST-COUNTER-V1")
f_counter(bool changed) =>
    var count = 0
    if changed
        count += 1
    count
[pivots, count] = request.security(syminfo.tickerid, "1D", [ta.pivot_point_levels("Traditional", timeframe.change("1D")), f_counter(timeframe.change("1D"))], lookahead=barmerge.lookahead_on)
plot(count, "OUTCOME")
```

## corpus5-table-na-row-v1.pine

SHA-256: `e97d9e68935579c2ee635de221b9a45c8abd7430bbd059463256515da94b088a`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-table-na-row-v1.pine",
  "sha256": "e97d9e68935579c2ee635de221b9a45c8abd7430bbd059463256515da94b088a",
  "pine_version": 5,
  "conflict_id": "CORPUS5-TABLE-NA-ROW-V1",
  "case_id": "corpus5-table-na-row-v1",
  "builtin": "table.cell",
  "category": "corpus5-runtime-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_table.cell"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Missing row index exact outcome is not specified; bounds domain alone does not settle na consequence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-3rye5w",
  "corpus_indices": [
    944
  ],
  "record": [
    "Keep exact native compile/runtime stage, diagnostic, line/bar/time and evidence; otherwise export all OUTCOME values/na.",
    "Never alter the source to obtain success. Local result is not native evidence."
  ],
  "minimum_history_bars": 100
}
```

```pine
//@version=5
indicator("CORPUS5-TABLE-NA-ROW-V1")
value = table.new(position.top_right, 1, 1)
table.cell(value, 0, int(na), "X")
plot(1, "OUTCOME")
```

## corpus5-v5-float-highest-length-v1.pine

SHA-256: `401208f49ef80df3471e0aa89814009651d0136fa21b6049c15b1c286b410d37`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-v5-float-highest-length-v1.pine",
  "sha256": "401208f49ef80df3471e0aa89814009651d0136fa21b6049c15b1c286b410d37",
  "pine_version": 5,
  "conflict_id": "CORPUS5-V5-FLOAT-HIGHEST-LENGTH-V1",
  "case_id": "corpus5-v5-float-highest-length-v1",
  "builtin": "ta.highest",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/v5/language/type-system/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "On chart2 ratio7.5 is float; documented integer signature forbids implicit float-to-int cast. Preserve source/version."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [
    986,
    1338
  ],
  "minimum_history_bars": 100,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=5
indicator("corpus5-v5-float-highest-length-v1")
length = timeframe.in_seconds("15") / timeframe.in_seconds(timeframe.period)
plot(ta.highest(length), "OUTCOME")
```

## corpus5-v5-history-price-offset-v1.pine

SHA-256: `8ae4fc7a5addb3e81f781db818dd7b078499ffc73cb5910fe42e92782433fd13`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-v5-history-price-offset-v1.pine",
  "sha256": "8ae4fc7a5addb3e81f781db818dd7b078499ffc73cb5910fe42e92782433fd13",
  "pine_version": 5,
  "conflict_id": "CORPUS5-V5-HISTORY-PRICE-OFFSET-V1",
  "case_id": "corpus5-v5-history-price-offset-v1",
  "builtin": "history",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/writing/limitations/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Original v5 price-derived float offset compatibility negative test. Capture native type/limit diagnostic rather than attribute to buffer500."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [
    1377,
    1588
  ],
  "minimum_history_bars": 100,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=5
indicator("corpus5-v5-history-price-offset-v1")
offset = close
plot(close[offset], "OUTCOME")
```

## corpus5-v5-local-request-v1.pine

SHA-256: `ec2610424aed269f904f9f513f97529f9e179bd508d1f42d9da8f6d2cbfcd159`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-v5-local-request-v1.pine",
  "sha256": "ec2610424aed269f904f9f513f97529f9e179bd508d1f42d9da8f6d2cbfcd159",
  "pine_version": 5,
  "conflict_id": "CORPUS5-V5-LOCAL-REQUEST-V1",
  "case_id": "corpus5-v5-local-request-v1",
  "builtin": "request.security",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "v5 direct local requests without dynamic_requests are documented compiler-invalid. Capture exact native phase."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4,
    5,
    6
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [
    1472
  ],
  "minimum_history_bars": 100,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=5
indicator("corpus5-v5-local-request-v1")
x = 0.0
if bar_index >= 0
    x := request.security(syminfo.tickerid, "2", close)
plot(x, "OUTCOME")
```

## corpus5-v6-dynamic-history600-v1.pine

SHA-256: `956903d86530d739ae2ba5384f84b27b215bf13d3647d8b0355dd42f7497982a`

Minimum history: 1200 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-v6-dynamic-history600-v1.pine",
  "sha256": "956903d86530d739ae2ba5384f84b27b215bf13d3647d8b0355dd42f7497982a",
  "pine_version": 6,
  "conflict_id": "CORPUS5-V6-DYNAMIC-HISTORY600-V1",
  "case_id": "corpus5-v6-dynamic-history600-v1",
  "builtin": "history",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/writing/limitations/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Current engine refuses offset501 although OHLC history ceiling10000. Record native sizing/outputs; minimum1200bars."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [],
  "minimum_history_bars": 1200,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=6
indicator("corpus5-v6-dynamic-history600-v1")
offset = bar_index % 601
plot(close[offset], "OUTCOME")
```

## corpus5-v6-equal-lower-timeframe-v1.pine

SHA-256: `03534f71d4f1e41996b5f9beaf34845eb944a3e2b065a13708aeac2b1ace3eba`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "corpus5-v6-equal-lower-timeframe-v1.pine",
  "sha256": "03534f71d4f1e41996b5f9beaf34845eb944a3e2b065a13708aeac2b1ace3eba",
  "pine_version": 6,
  "conflict_id": "CORPUS5-V6-EQUAL-LOWER-TIMEFRAME-V1",
  "case_id": "corpus5-v6-equal-lower-timeframe-v1",
  "builtin": "request.security_lower_tf",
  "category": "corpus5-challenge-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Current docs accept lower OR EQUAL chart timeframe; engine equal refuses. No invented native intrabar count."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "NATIVE-OUTCOME-PENDING",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4
  ],
  "registered_owner": "codex-uoot08",
  "corpus_indices": [
    1054
  ],
  "minimum_history_bars": 100,
  "record": [
    "Record exact native phase/diagnostic/line/bar/time; otherwise export every OUTCOME value including na.",
    "Documented prediction is not native observation."
  ]
}
```

```pine
//@version=6
indicator("corpus5-v6-equal-lower-timeframe-v1")
values = request.security_lower_tf(syminfo.tickerid, "2", close)
plot(array.size(values), "OUTCOME")
```

## drawing-box-eq-v2.pine

SHA-256: `54da4ed5444cc206b2d76d4e7a9b7f5b8c4e5db275840cb43d4ee0172d683252`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-box-eq-v2.pine",
  "sha256": "54da4ed5444cc206b2d76d4e7a9b7f5b8c4e5db275840cb43d4ee0172d683252",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-BOX-EQ",
  "case_id": "drawing:box:==:alias-and-distinct",
  "builtin": "box",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_box"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native box == admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 1; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-BOX-EQ",overlay=true)
var a=box.new(bar_index,high,bar_index+1,low)
b=a
var other=box.new(bar_index,high,bar_index+1,low)
plot((a == b ? 1 : 0) + 2 * (a == other ? 1 : 0),"OUTCOME")
```

## drawing-box-ne-v2.pine

SHA-256: `e55abe016c37ba07d6a80e65800f5e02244cc7992f269ab0636e7ff313e68297`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-box-ne-v2.pine",
  "sha256": "e55abe016c37ba07d6a80e65800f5e02244cc7992f269ab0636e7ff313e68297",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-BOX-NE",
  "case_id": "drawing:box:!=:alias-and-distinct",
  "builtin": "box",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_box"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native box != admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 2; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-BOX-NE",overlay=true)
var a=box.new(bar_index,high,bar_index+1,low)
b=a
var other=box.new(bar_index,high,bar_index+1,low)
plot((a != b ? 1 : 0) + 2 * (a != other ? 1 : 0),"OUTCOME")
```

## drawing-chart-point-eq-v2.pine

SHA-256: `122b8fa7d9a976210dbce9a45ca18c6312b1abbb222e0aebae61c1d554883eb3`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-chart-point-eq-v2.pine",
  "sha256": "122b8fa7d9a976210dbce9a45ca18c6312b1abbb222e0aebae61c1d554883eb3",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-CHART-POINT-EQ",
  "case_id": "drawing:chart.point:==:alias-and-distinct",
  "builtin": "chart.point",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_chart.point"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native chart.point == admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 1; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-CHART-POINT-EQ",overlay=true)
var a=chart.point.from_index(bar_index,high)
b=a
var other=chart.point.from_index(bar_index,high)
plot((a == b ? 1 : 0) + 2 * (a == other ? 1 : 0),"OUTCOME")
```

## drawing-chart-point-ne-v2.pine

SHA-256: `4e3f806d4b9c6da217966e1467ed6912a94e4b3325b5daf57577ab0617793cfa`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-chart-point-ne-v2.pine",
  "sha256": "4e3f806d4b9c6da217966e1467ed6912a94e4b3325b5daf57577ab0617793cfa",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-CHART-POINT-NE",
  "case_id": "drawing:chart.point:!=:alias-and-distinct",
  "builtin": "chart.point",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_chart.point"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native chart.point != admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 2; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-CHART-POINT-NE",overlay=true)
var a=chart.point.from_index(bar_index,high)
b=a
var other=chart.point.from_index(bar_index,high)
plot((a != b ? 1 : 0) + 2 * (a != other ? 1 : 0),"OUTCOME")
```

## drawing-default-blue-v5-v1.pine

SHA-256: `9efce44b981125a099e8a27101a3711820006ee3f2bc40fc3989dbe85e9a2bae`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-default-blue-v5-v1.pine",
  "sha256": "9efce44b981125a099e8a27101a3711820006ee3f2bc40fc3989dbe85e9a2bae",
  "pine_version": 5,
  "conflict_id": "V4-DRAWING-DEFAULT-BLUE-V5",
  "case_id": "drawing-default-blue-v5-v1",
  "builtin": "box.new/polyline.new",
  "category": "drawing-default-color-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_box.new",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_polyline.new"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Reference predicts omitted border_color/bgcolor/line_color match color.blue. Native explicit-v6 CF009 alone is not an omitted-default capture. Capture actual side-by-side colors without choosing either literal in advance."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Retain unmodified source and exact compile/runtime outcome. Export OUTCOME close as anchor control.",
    "Capture screenshot with all five rows and four columns visible: DEFAULT, color.blue, #2196F3, #2962FF. Do not derive drawing colors from OUTCOME; it is only an execution/price control.",
    "Rows isolate coordinate/point box border and background defaults, plus polyline line_color. Record browser/theme/background and lossless screenshot. Exact pixel dimensions are not under test."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=5
indicator("Drawing default blue v5 v1", overlay=true, max_boxes_count=30, max_polylines_count=10, max_labels_count=30)
if barstate.islast
    box.new(bar_index - 36, close * 1.080 + close * 0.004, bar_index - 36 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF)
    label.new(bar_index - 36, close * 1.080 + close * 0.004, "border-coordinate: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 28, close * 1.080 + close * 0.004, bar_index - 28 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=color.blue)
    label.new(bar_index - 28, close * 1.080 + close * 0.004, "border-coordinate: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 20, close * 1.080 + close * 0.004, bar_index - 20 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=#2196F3)
    label.new(bar_index - 20, close * 1.080 + close * 0.004, "border-coordinate: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 12, close * 1.080 + close * 0.004, bar_index - 12 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=#2962FF)
    label.new(bar_index - 12, close * 1.080 + close * 0.004, "border-coordinate: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 36, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF)
    label.new(bar_index - 36, close * 1.065 + close * 0.004, "border-point: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 28, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=color.blue)
    label.new(bar_index - 28, close * 1.065 + close * 0.004, "border-point: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 20, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=#2196F3)
    label.new(bar_index - 20, close * 1.065 + close * 0.004, "border-point: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 12, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=#2962FF)
    label.new(bar_index - 12, close * 1.065 + close * 0.004, "border-point: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 36, close * 1.050 + close * 0.004, bar_index - 36 + 5, close * 1.050 - close * 0.004, border_color=#000000)
    label.new(bar_index - 36, close * 1.050 + close * 0.004, "background-coordinate: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 28, close * 1.050 + close * 0.004, bar_index - 28 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=color.blue)
    label.new(bar_index - 28, close * 1.050 + close * 0.004, "background-coordinate: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 20, close * 1.050 + close * 0.004, bar_index - 20 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=#2196F3)
    label.new(bar_index - 20, close * 1.050 + close * 0.004, "background-coordinate: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 12, close * 1.050 + close * 0.004, bar_index - 12 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=#2962FF)
    label.new(bar_index - 12, close * 1.050 + close * 0.004, "background-coordinate: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 36, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.035 - close * 0.004), border_color=#000000)
    label.new(bar_index - 36, close * 1.035 + close * 0.004, "background-point: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 28, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=color.blue)
    label.new(bar_index - 28, close * 1.035 + close * 0.004, "background-point: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 20, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=#2196F3)
    label.new(bar_index - 20, close * 1.035 + close * 0.004, "background-point: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 12, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=#2962FF)
    label.new(bar_index - 12, close * 1.035 + close * 0.004, "background-point: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 36, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.020 + close * 0.004)), line_width=5)
    label.new(bar_index - 36, close * 1.020 + close * 0.004, "polyline: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 28, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=color.blue)
    label.new(bar_index - 28, close * 1.020 + close * 0.004, "polyline: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 20, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=#2196F3)
    label.new(bar_index - 20, close * 1.020 + close * 0.004, "polyline: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 12, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=#2962FF)
    label.new(bar_index - 12, close * 1.020 + close * 0.004, "polyline: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
plot(close, title="OUTCOME", display=display.data_window)
```

## drawing-default-blue-v6-v1.pine

SHA-256: `bf87c46a400bd2e62a0904f0d21bb99482fa01cf667c7e4d1b844f046e6726b4`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-default-blue-v6-v1.pine",
  "sha256": "bf87c46a400bd2e62a0904f0d21bb99482fa01cf667c7e4d1b844f046e6726b4",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-DEFAULT-BLUE-V6",
  "case_id": "drawing-default-blue-v6-v1",
  "builtin": "box.new/polyline.new",
  "category": "drawing-default-color-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_box.new",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_polyline.new"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Reference predicts omitted border_color/bgcolor/line_color match color.blue. Native explicit-v6 CF009 alone is not an omitted-default capture. Capture actual side-by-side colors without choosing either literal in advance."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Retain unmodified source and exact compile/runtime outcome. Export OUTCOME close as anchor control.",
    "Capture screenshot with all five rows and four columns visible: DEFAULT, color.blue, #2196F3, #2962FF. Do not derive drawing colors from OUTCOME; it is only an execution/price control.",
    "Rows isolate coordinate/point box border and background defaults, plus polyline line_color. Record browser/theme/background and lossless screenshot. Exact pixel dimensions are not under test."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("Drawing default blue v6 v1", overlay=true, max_boxes_count=30, max_polylines_count=10, max_labels_count=30)
if barstate.islast
    box.new(bar_index - 36, close * 1.080 + close * 0.004, bar_index - 36 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF)
    label.new(bar_index - 36, close * 1.080 + close * 0.004, "border-coordinate: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 28, close * 1.080 + close * 0.004, bar_index - 28 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=color.blue)
    label.new(bar_index - 28, close * 1.080 + close * 0.004, "border-coordinate: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 20, close * 1.080 + close * 0.004, bar_index - 20 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=#2196F3)
    label.new(bar_index - 20, close * 1.080 + close * 0.004, "border-coordinate: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 12, close * 1.080 + close * 0.004, bar_index - 12 + 5, close * 1.080 - close * 0.004, border_width=5, bgcolor=#FFFFFF, border_color=#2962FF)
    label.new(bar_index - 12, close * 1.080 + close * 0.004, "border-coordinate: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 36, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF)
    label.new(bar_index - 36, close * 1.065 + close * 0.004, "border-point: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 28, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=color.blue)
    label.new(bar_index - 28, close * 1.065 + close * 0.004, "border-point: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 20, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=#2196F3)
    label.new(bar_index - 20, close * 1.065 + close * 0.004, "border-point: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 12, close * 1.065 + close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.065 - close * 0.004), border_width=5, bgcolor=#FFFFFF, border_color=#2962FF)
    label.new(bar_index - 12, close * 1.065 + close * 0.004, "border-point: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 36, close * 1.050 + close * 0.004, bar_index - 36 + 5, close * 1.050 - close * 0.004, border_color=#000000)
    label.new(bar_index - 36, close * 1.050 + close * 0.004, "background-coordinate: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 28, close * 1.050 + close * 0.004, bar_index - 28 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=color.blue)
    label.new(bar_index - 28, close * 1.050 + close * 0.004, "background-coordinate: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 20, close * 1.050 + close * 0.004, bar_index - 20 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=#2196F3)
    label.new(bar_index - 20, close * 1.050 + close * 0.004, "background-coordinate: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(bar_index - 12, close * 1.050 + close * 0.004, bar_index - 12 + 5, close * 1.050 - close * 0.004, border_color=#000000, bgcolor=#2962FF)
    label.new(bar_index - 12, close * 1.050 + close * 0.004, "background-coordinate: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 36, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.035 - close * 0.004), border_color=#000000)
    label.new(bar_index - 36, close * 1.035 + close * 0.004, "background-point: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 28, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=color.blue)
    label.new(bar_index - 28, close * 1.035 + close * 0.004, "background-point: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 20, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=#2196F3)
    label.new(bar_index - 20, close * 1.035 + close * 0.004, "background-point: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    box.new(chart.point.from_index(bar_index - 12, close * 1.035 + close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.035 - close * 0.004), border_color=#000000, bgcolor=#2962FF)
    label.new(bar_index - 12, close * 1.035 + close * 0.004, "background-point: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 36, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 36 + 5, close * 1.020 + close * 0.004)), line_width=5)
    label.new(bar_index - 36, close * 1.020 + close * 0.004, "polyline: DEFAULT", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 28, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 28 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=color.blue)
    label.new(bar_index - 28, close * 1.020 + close * 0.004, "polyline: color.blue", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 20, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 20 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=#2196F3)
    label.new(bar_index - 20, close * 1.020 + close * 0.004, "polyline: #2196F3", style=label.style_none, textcolor=#000000, size=size.tiny)
    polyline.new(array.from(chart.point.from_index(bar_index - 12, close * 1.020 - close * 0.004), chart.point.from_index(bar_index - 12 + 5, close * 1.020 + close * 0.004)), line_width=5, line_color=#2962FF)
    label.new(bar_index - 12, close * 1.020 + close * 0.004, "polyline: #2962FF", style=label.style_none, textcolor=#000000, size=size.tiny)
plot(close, title="OUTCOME", display=display.data_window)
```

## drawing-polyline-eq-v2.pine

SHA-256: `060f2380d57b54ea8d2ae43bd05d5f1205049e79f03dc73ed0b6fa9b8de35aa7`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-polyline-eq-v2.pine",
  "sha256": "060f2380d57b54ea8d2ae43bd05d5f1205049e79f03dc73ed0b6fa9b8de35aa7",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-POLYLINE-EQ",
  "case_id": "drawing:polyline:==:alias-and-distinct",
  "builtin": "polyline",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_polyline"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native polyline == admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 1; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-POLYLINE-EQ",overlay=true)
var a=polyline.new(array.from(chart.point.from_index(bar_index,high),chart.point.from_index(bar_index+1,low)))
b=a
var other=polyline.new(array.from(chart.point.from_index(bar_index,high),chart.point.from_index(bar_index+1,low)))
plot((a == b ? 1 : 0) + 2 * (a == other ? 1 : 0),"OUTCOME")
```

## drawing-polyline-ne-v2.pine

SHA-256: `e2a244f605c99e77deea62770e15cff9e71a105b3af83b70733666325a367b0c`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-polyline-ne-v2.pine",
  "sha256": "e2a244f605c99e77deea62770e15cff9e71a105b3af83b70733666325a367b0c",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-POLYLINE-NE",
  "case_id": "drawing:polyline:!=:alias-and-distinct",
  "builtin": "polyline",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_polyline"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native polyline != admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 2; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-POLYLINE-NE",overlay=true)
var a=polyline.new(array.from(chart.point.from_index(bar_index,high),chart.point.from_index(bar_index+1,low)))
b=a
var other=polyline.new(array.from(chart.point.from_index(bar_index,high),chart.point.from_index(bar_index+1,low)))
plot((a != b ? 1 : 0) + 2 * (a != other ? 1 : 0),"OUTCOME")
```

## drawing-table-eq-v2.pine

SHA-256: `3139d9e4ed7f874fb8f920a0fc983044702b66fe00fe794ef5d0fcae24d96351`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-table-eq-v2.pine",
  "sha256": "3139d9e4ed7f874fb8f920a0fc983044702b66fe00fe794ef5d0fcae24d96351",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-TABLE-EQ",
  "case_id": "drawing:table:==:alias-and-distinct",
  "builtin": "table",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_table"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native table == admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 1; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-TABLE-EQ",overlay=true)
var a=table.new(position.top_left,1,1)
b=a
var other=table.new(position.top_left,1,1)
plot((a == b ? 1 : 0) + 2 * (a == other ? 1 : 0),"OUTCOME")
```

## drawing-table-ne-v2.pine

SHA-256: `0e7d85757c0939956e1dc76edbccdda68dda9eb16510bd7a41c9f50051052dd7`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "drawing-table-ne-v2.pine",
  "sha256": "0e7d85757c0939956e1dc76edbccdda68dda9eb16510bd7a41c9f50051052dd7",
  "pine_version": 6,
  "conflict_id": "V4-DRAWING-TABLE-NE",
  "case_id": "drawing:table:!=:alias-and-distinct",
  "builtin": "table",
  "category": "drawing-id-equality-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#type_table"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Native table != admission is unresolved. Record native compile refusal or all OUTCOME values. If identity comparison is accepted, alias/distinct encoding conditionally predicts 2; this is not native evidence."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    6
  ],
  "registered_owner": "codex-3rye5w",
  "record": [
    "Keep unmodified source/hash and exact native phase, code, text and line; if accepted export OUTCOME values/na.",
    "Other family/operator probes are independent. Linefill CE10123 cannot settle this family. Never modify rejected source to obtain success.",
    "Both drawing references persist via var; allocation stays at two objects and cannot mask accepted operator behavior with per-bar table/object resource exhaustion."
  ],
  "minimum_history_bars": 3
}
```

```pine
//@version=6
indicator("V4-DRAWING-TABLE-NE",overlay=true)
var a=table.new(position.top_left,1,1)
b=a
var other=table.new(position.top_left,1,1)
plot((a != b ? 1 : 0) + 2 * (a != other ? 1 : 0),"OUTCOME")
```

## input-generic-computed-source-v1.pine

SHA-256: `3840cb602b73d6c19a612009e4a7087194038d484cd00812ed902726050ff369`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "input-generic-computed-source-v1.pine",
  "sha256": "3840cb602b73d6c19a612009e4a7087194038d484cd00812ed902726050ff369",
  "pine_version": 6,
  "conflict_id": "INPUT-GENERIC-SOURCE-DEFAULT-AUTHORITY",
  "case_id": "input-generic-computed-source-v1",
  "builtin": "input",
  "category": "input-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_input",
    "https://www.tradingview.com/pine-script-docs/concepts/inputs/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Generic defval display description limits source-type builtins, whereas numeric overload allowed types include arbitrary series float. Record unmodified compile/runtime acceptance and input widget/default; no rejection or acceptance assumed."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "AUTHORITY-CONFLICT",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-g6qooy",
  "record": [
    "Retain exact source, compile/runtime phase, diagnostic text and bar/time if rejected.",
    "If accepted, export OUTCOME CSV and capture Inputs settings, status line and Data Window with labels visible.",
    "Generic defval display description limits source-type builtins, whereas numeric overload allowed types include arbitrary series float. Record unmodified compile/runtime acceptance and input widget/default; no rejection or acceptance assumed."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("INPUT-GENERIC-SOURCE-DEFAULT-AUTHORITY")
selected=input(close*2,"ComputedSource")
plot(close,"OUTCOME")
```

## input-source-positional-order-v1.pine

SHA-256: `5645a58133d042bba67adce5963cd10bedce99162798abcdd98ab07be3205162`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "input-source-positional-order-v1.pine",
  "sha256": "5645a58133d042bba67adce5963cd10bedce99162798abcdd98ab07be3205162",
  "pine_version": 6,
  "conflict_id": "INPUT-GENERIC-SOURCE-POSITIONAL-AUTHORITY",
  "case_id": "input-source-positional-order-v1",
  "builtin": "input",
  "category": "input-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_input",
    "https://www.tradingview.com/pine-script-docs/concepts/inputs/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Generic series-float signature orders inline/group/tooltip; argument metadata orders tooltip/inline/group. Record which SLOT string becomes tooltip/group/inline without assuming either order."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "AUTHORITY-CONFLICT",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-g6qooy",
  "record": [
    "Retain exact source, compile/runtime phase, diagnostic text and bar/time if rejected.",
    "If accepted, export OUTCOME CSV and capture Inputs settings, status line and Data Window with labels visible.",
    "Generic series-float signature orders inline/group/tooltip; argument metadata orders tooltip/inline/group. Record which SLOT string becomes tooltip/group/inline without assuming either order."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("INPUT-GENERIC-SOURCE-POSITIONAL-AUTHORITY")
selected=input(close,"SourceTitle","SLOT3","SLOT4","SLOT5",display.none,true)
plot(close,"OUTCOME")
```

## input-textarea-default-display-v1.pine

SHA-256: `d2a029cd95e27fd996a9853c074d2bcf74dc8ea162b5a2c192682a6ee5d5066a`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "input-textarea-default-display-v1.pine",
  "sha256": "d2a029cd95e27fd996a9853c074d2bcf74dc8ea162b5a2c192682a6ee5d5066a",
  "pine_version": 6,
  "conflict_id": "INPUT-TEXTAREA-DISPLAY-AUTHORITY",
  "case_id": "input-textarea-default-display-v1",
  "builtin": "input.text_area",
  "category": "input-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_input.text_area",
    "https://www.tradingview.com/pine-script-docs/concepts/inputs/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Compare default input information against explicit all/none in status line and Data Window; reference says none, manual says all."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "AUTHORITY-CONFLICT",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4,
    5
  ],
  "registered_owner": "codex-g6qooy",
  "record": [
    "Retain exact source, compile/runtime phase, diagnostic text and bar/time if rejected.",
    "If accepted, export OUTCOME CSV and capture Inputs settings, status line and Data Window with labels visible.",
    "Compare default input information against explicit all/none in status line and Data Window; reference says none, manual says all."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("INPUT-TEXTAREA-DISPLAY-AUTHORITY")
omitted=input.text_area("DEFAULT","TextDefault")
shown=input.text_area("ALL","TextAll",display=display.all)
hidden=input.text_area("NONE","TextNone",display=display.none)
plot(close,"OUTCOME")
```

## input-time-default-display-v1.pine

SHA-256: `8698446da2ae22b02a01ae2d68419fdaf13507d189d4dcc65043ad83e584c19c`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "input-time-default-display-v1.pine",
  "sha256": "8698446da2ae22b02a01ae2d68419fdaf13507d189d4dcc65043ad83e584c19c",
  "pine_version": 6,
  "conflict_id": "INPUT-TIME-DISPLAY-AUTHORITY",
  "case_id": "input-time-default-display-v1",
  "builtin": "input.time",
  "category": "input-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_input.time",
    "https://www.tradingview.com/pine-script-docs/concepts/inputs/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Compare default input information against explicit all/none in status line and Data Window; reference says none, manual says all."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "AUTHORITY-CONFLICT",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3,
    4,
    5
  ],
  "registered_owner": "codex-g6qooy",
  "record": [
    "Retain exact source, compile/runtime phase, diagnostic text and bar/time if rejected.",
    "If accepted, export OUTCOME CSV and capture Inputs settings, status line and Data Window with labels visible.",
    "Compare default input information against explicit all/none in status line and Data Window; reference says none, manual says all."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("INPUT-TIME-DISPLAY-AUTHORITY")
omitted=input.time(1700000000000,"TimeDefault")
shown=input.time(1700000060000,"TimeAll",display=display.all)
hidden=input.time(1700000120000,"TimeNone",display=display.none)
plot(close,"OUTCOME")
```

## input-time-marker-kind-v1.pine

SHA-256: `5203d8ca2e71427bebe7b71e77fbe3536888529a8863b2b57d177e3a40bccf10`

Minimum history: 100 bars.



Expected readings and required evidence:

```json
{
  "script": "input-time-marker-kind-v1.pine",
  "sha256": "5203d8ca2e71427bebe7b71e77fbe3536888529a8863b2b57d177e3a40bccf10",
  "pine_version": 6,
  "conflict_id": "INPUT-TIME-MARKER-AUTHORITY",
  "case_id": "input-time-marker-kind-v1",
  "builtin": "input.time",
  "category": "input-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_input.time",
    "https://www.tradingview.com/pine-script-docs/concepts/inputs/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Reference description mentions price/price line while remarks/manual describe time/vertical marker. Record actual confirmed placement interaction and marker orientation; no price-line expectation chosen."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "AUTHORITY-CONFLICT",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-g6qooy",
  "record": [
    "Retain exact source, compile/runtime phase, diagnostic text and bar/time if rejected.",
    "If accepted, export OUTCOME CSV and capture Inputs settings, status line and Data Window with labels visible.",
    "Reference description mentions price/price line while remarks/manual describe time/vertical marker. Record actual confirmed placement interaction and marker orientation; no price-line expectation chosen."
  ],
  "minimum_history_bars": 100,
  "capture_mode": "SCREENSHOT-AND-CSV"
}
```

```pine
//@version=6
indicator("INPUT-TIME-MARKER-AUTHORITY")
selected=input.time(1700000000000,"TimeMarker",confirm=true)
plot(close,"OUTCOME")
```

## ledger-1091-matrix-columns-profile-v1.pine

SHA-256: `ff34f8cf9e8f363883bb08c85af8007b9e2752f5b945f69863312c7a3f8131e9`

Minimum history: 2 bars.



Expected readings and required evidence:

```json
{
  "script": "ledger-1091-matrix-columns-profile-v1.pine",
  "sha256": "ff34f8cf9e8f363883bb08c85af8007b9e2752f5b945f69863312c7a3f8131e9",
  "pine_version": 6,
  "conflict_id": "LEDGER-1091-MATRIX-COLUMNS-PROFILE-V1",
  "case_id": "ledger-1091-matrix-columns-profile-v1",
  "builtin": "matrix.add_col",
  "category": "ledger-profiler-observation",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_col"
  ],
  "expected_outcome": {
    "phase": "ACCEPTED",
    "columns": {
      "OUTCOME": 1292801
    },
    "rule": "Functional shape/last-element control is predicted from documented matrix operations. The reference gives qualitative efficiency advice, no numeric timing or ratio. Profiling observations apply only to this128x128 experiment."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    5,
    8
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 1091,
  "record": [
    "Export OUTCOME and capture Pine Profiler screenshot with full source/line execution counts.",
    "Run all three scripts separately on identical symbol/timeframe/history and reload each; repeat five times, retaining every result including timer noise.",
    "Record browser/device/session/history count. Uniform checksum is expected from constant data, but verify constructor/loop execution counts and matrix dimensions independently.",
    "A missing/zero-resolution profiler measurement cannot establish an ordering; never infer relative speed from OUTCOME or timenow inside one execution.",
    "This is a scoped benchmark, not a universal performance bound or semantic mismatch."
  ],
  "minimum_history_bars": 2,
  "ledger_ranks": [
    1091,
    1092
  ]
}
```

```pine
//@version=6
indicator("Ledger1091 matrix columns profiling", overlay=false)
var matrix<float> m = na
if barstate.isfirst
    m := matrix.new<float>()
    array<float> values = array.new<float>(128, 1.0)
    for i = 0 to 127
        matrix.add_col(m, i, values)
plot(matrix.rows(m) * 10000 + matrix.columns(m) * 100 + matrix.get(m, 127, 127), "OUTCOME")
```

## ledger-1091-matrix-constructor-profile-v1.pine

SHA-256: `90e1b84f52c501be209ac9a9eb1dbda84a88ddd69b8547762bcd561f0a56afca`

Minimum history: 2 bars.



Expected readings and required evidence:

```json
{
  "script": "ledger-1091-matrix-constructor-profile-v1.pine",
  "sha256": "90e1b84f52c501be209ac9a9eb1dbda84a88ddd69b8547762bcd561f0a56afca",
  "pine_version": 6,
  "conflict_id": "LEDGER-1091-MATRIX-CONSTRUCTOR-PROFILE-V1",
  "case_id": "ledger-1091-matrix-constructor-profile-v1",
  "builtin": "matrix.add_col",
  "category": "ledger-profiler-observation",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_col"
  ],
  "expected_outcome": {
    "phase": "ACCEPTED",
    "columns": {
      "OUTCOME": 1292801
    },
    "rule": "Functional shape/last-element control is predicted from documented matrix operations. The reference gives qualitative efficiency advice, no numeric timing or ratio. Profiling observations apply only to this128x128 experiment."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 1091,
  "record": [
    "Export OUTCOME and capture Pine Profiler screenshot with full source/line execution counts.",
    "Run all three scripts separately on identical symbol/timeframe/history and reload each; repeat five times, retaining every result including timer noise.",
    "Record browser/device/session/history count. Uniform checksum is expected from constant data, but verify constructor/loop execution counts and matrix dimensions independently.",
    "A missing/zero-resolution profiler measurement cannot establish an ordering; never infer relative speed from OUTCOME or timenow inside one execution.",
    "This is a scoped benchmark, not a universal performance bound or semantic mismatch."
  ],
  "minimum_history_bars": 2,
  "ledger_ranks": [
    1091,
    1092
  ]
}
```

```pine
//@version=6
indicator("Ledger1091 matrix constructor profiling", overlay=false)
var matrix<float> m = na
if barstate.isfirst
    m := matrix.new<float>(128, 128, 1.0)
plot(matrix.rows(m) * 10000 + matrix.columns(m) * 100 + matrix.get(m, 127, 127), "OUTCOME")
```

## ledger-1091-matrix-rows-profile-v1.pine

SHA-256: `4a52e00a2c43a36a98ed02053edd7e645541516f3630a115274112bc49c07f64`

Minimum history: 2 bars.



Expected readings and required evidence:

```json
{
  "script": "ledger-1091-matrix-rows-profile-v1.pine",
  "sha256": "4a52e00a2c43a36a98ed02053edd7e645541516f3630a115274112bc49c07f64",
  "pine_version": 6,
  "conflict_id": "LEDGER-1091-MATRIX-ROWS-PROFILE-V1",
  "case_id": "ledger-1091-matrix-rows-profile-v1",
  "builtin": "matrix.add_col",
  "category": "ledger-profiler-observation",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_col"
  ],
  "expected_outcome": {
    "phase": "ACCEPTED",
    "columns": {
      "OUTCOME": 1292801
    },
    "rule": "Functional shape/last-element control is predicted from documented matrix operations. The reference gives qualitative efficiency advice, no numeric timing or ratio. Profiling observations apply only to this128x128 experiment."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    5,
    8
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 1091,
  "record": [
    "Export OUTCOME and capture Pine Profiler screenshot with full source/line execution counts.",
    "Run all three scripts separately on identical symbol/timeframe/history and reload each; repeat five times, retaining every result including timer noise.",
    "Record browser/device/session/history count. Uniform checksum is expected from constant data, but verify constructor/loop execution counts and matrix dimensions independently.",
    "A missing/zero-resolution profiler measurement cannot establish an ordering; never infer relative speed from OUTCOME or timenow inside one execution.",
    "This is a scoped benchmark, not a universal performance bound or semantic mismatch."
  ],
  "minimum_history_bars": 2,
  "ledger_ranks": [
    1091,
    1092
  ]
}
```

```pine
//@version=6
indicator("Ledger1091 matrix rows profiling", overlay=false)
var matrix<float> m = na
if barstate.isfirst
    m := matrix.new<float>()
    array<float> values = array.new<float>(128, 1.0)
    for i = 0 to 127
        matrix.add_row(m, i, values)
plot(matrix.rows(m) * 10000 + matrix.columns(m) * 100 + matrix.get(m, 127, 127), "OUTCOME")
```

## ledger-1094-asin-number-v5-v1.pine

SHA-256: `aaa71170f0a917987c7344904aab5c8c484b240cb1a7f2f9e320f0ae72161e32`

Minimum history: 2 bars.



Expected readings and required evidence:

```json
{
  "script": "ledger-1094-asin-number-v5-v1.pine",
  "sha256": "aaa71170f0a917987c7344904aab5c8c484b240cb1a7f2f9e320f0ae72161e32",
  "pine_version": 5,
  "conflict_id": "LEDGER-1094-ASIN-NUMBER-V5-V1",
  "case_id": "ledger-1094-asin-number-v5-v1",
  "builtin": "math.asin",
  "category": "ledger-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_math.asin"
  ],
  "expected_outcome": {
    "phase": "ACCEPTED",
    "columns": {
      "OUTCOME": 0.5235987755982989
    },
    "rule": "V5 migration guide names number; current v6 reference names angle. V5 is an accepted-control prediction. For v6, record exact acceptance/refusal without promoting either reading."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 1094,
  "record": [
    "Preserve exact compile/runtime diagnostic, error code/text/line, or export all OUTCOME values.",
    "Record source version separately; v5 migration text does not explicitly specify v6 admission."
  ],
  "minimum_history_bars": 2,
  "expected_readings": {
    "migration_v5": "V5 predicts acceptance with asin0.5; carrying number to v6 is an inference.",
    "reference_v6": "Lists angle; under a closed-slot interpretation number is refused. V6 reference does not apply to v5."
  }
}
```

```pine
//@version=5
indicator("Ledger1094 asin number v5", overlay=false)
float value = math.asin(number=0.5)
plot(value, "OUTCOME")
```

## ledger-1094-asin-number-v6-v1.pine

SHA-256: `c4b5c58c2d65815da9f0b84c206fcc6ba680c9f69a0577269b0cd25732b781ce`

Minimum history: 2 bars.



Expected readings and required evidence:

```json
{
  "script": "ledger-1094-asin-number-v6-v1.pine",
  "sha256": "c4b5c58c2d65815da9f0b84c206fcc6ba680c9f69a0577269b0cd25732b781ce",
  "pine_version": 6,
  "conflict_id": "LEDGER-1094-ASIN-NUMBER-V6-V1",
  "case_id": "ledger-1094-asin-number-v6-v1",
  "builtin": "math.asin",
  "category": "ledger-authority-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/",
    "https://www.tradingview.com/pine-script-reference/v6/#fun_math.asin"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "V5 migration guide names number; current v6 reference names angle. V5 is an accepted-control prediction. For v6, record exact acceptance/refusal without promoting either reading."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    3
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 1094,
  "record": [
    "Preserve exact compile/runtime diagnostic, error code/text/line, or export all OUTCOME values.",
    "Record source version separately; v5 migration text does not explicitly specify v6 admission."
  ],
  "minimum_history_bars": 2,
  "expected_readings": {
    "migration_v5": "V5 predicts acceptance with asin0.5; carrying number to v6 is an inference.",
    "reference_v6": "Lists angle; under a closed-slot interpretation number is refused. V6 reference does not apply to v5."
  }
}
```

```pine
//@version=6
indicator("Ledger1094 asin number v6", overlay=false)
float value = math.asin(number=0.5)
plot(value, "OUTCOME")
```

## trace-698-timenow-observations-v1.pine

SHA-256: `d5051bbe11371d5578e164d6d5a0eebfe0acca7cf81856ae8ab2f13a2af7de62`

Minimum history: 1 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-698-timenow-observations-v1.pine",
  "sha256": "d5051bbe11371d5578e164d6d5a0eebfe0acca7cf81856ae8ab2f13a2af7de62",
  "pine_version": 6,
  "conflict_id": "LEDGER-698-TRACE-V1",
  "case_id": "trace-698-timenow-observations-v1",
  "builtin": "timenow",
  "category": "ledger-trace-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-docs/concepts/time/#timenow"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Current docs settle execution-time clock semantics, but do not pin exact provider timestamp or transmission latency. Observe raw epoch values and tick cadence; no provider arrival timestamp is exposed by this script."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 698,
  "record": [
    "Export OUTCOME and exact Pine Logs for at least ten realtime updates spanning a new bar, plus reload.",
    "Record contemporaneous browser UTC and an idle interval; no tick means no expected new execution.",
    "Do not interpret timenow-time or browser-clock differences as provider latency. Provider latency remains unobservable here."
  ],
  "minimum_history_bars": 1
}
```

```pine
//@version=6
indicator("TRACE698 execution clock", overlay=false)
varip int previous = na
plot(timenow, "OUTCOME")
if barstate.isrealtime
    log.info("bar=" + str.tostring(bar_index) + " time=" + str.tostring(time, "#") + " time_close=" + str.tostring(time_close, "#") + " timenow=" + str.tostring(timenow, "#") + " previous=" + str.tostring(previous, "#") + " new=" + str.tostring(barstate.isnew))
    previous := timenow
```

## trace-705-chart-fg-solid-background-v1.pine

SHA-256: `c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6`

Minimum history: 1 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-705-chart-fg-solid-background-v1.pine",
  "sha256": "c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6",
  "pine_version": 6,
  "conflict_id": "LEDGER-705-TRACE-V1",
  "case_id": "trace-705-chart-fg-solid-background-v1",
  "builtin": "chart.fg_color",
  "category": "ledger-trace-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#var_chart.fg_color"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Current reference describes foreground color by chart background darkness but gives no numeric cutoff. Record native foreground under controlled chart settings; do not substitute an engine threshold."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 705,
  "record": [
    "Use chart Appearance settings with SOLID background; bgcolor() does not set chart.bg_color.",
    "Capture separately for #000000 and #FFFFFF controls, then #7F7F7F, #808080, #818181. Record exact configured background, theme, logs, OUTCOME and screenshot each time.",
    "Repeat light-theme/dark-background and dark-theme/light-background to distinguish theme from background. A single uniform run cannot settle cutoff."
  ],
  "minimum_history_bars": 1
}
```

```pine
//@version=6
indicator("TRACE705 chart foreground", overlay=false)
int encoded = int(color.r(chart.fg_color)) * 65536 + int(color.g(chart.fg_color)) * 256 + int(color.b(chart.fg_color))
plot(encoded, "OUTCOME")
if barstate.islast
    log.info("background=" + str.tostring(chart.bg_color) + " foreground=" + str.tostring(chart.fg_color) + " rgb=" + str.tostring(encoded, "#"))
```

## trace-720-hma-mature-hole-length16-v1.pine

SHA-256: `cfb1c20fc53e802dcc3f190c1c58635e6498fddca3c96b575bfe875bc37171ec`

Minimum history: 46 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-720-hma-mature-hole-length16-v1.pine",
  "sha256": "cfb1c20fc53e802dcc3f190c1c58635e6498fddca3c96b575bfe875bc37171ec",
  "pine_version": 6,
  "conflict_id": "LEDGER-720-TRACE-V1",
  "case_id": "trace-720-hma-mature-hole-length16-v1",
  "builtin": "ta.hma",
  "category": "ledger-trace-outcome",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_ta.hma"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Ignoring source na is documented. Exact nested-window advancement and hole-bar publication are not specified. Length16 avoids half/sqrt rounding ambiguity; new capture complements existing v2 HMA2/5 holes without claiming those remain uncaptured."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4,
    5
  ],
  "registered_owner": "codex-be9795",
  "ledger_rank": 720,
  "record": [
    "Export all OUTCOME values/na with at least46 historical bars and source-pinned bar indices.",
    "Preserve exact values at bars37-45, particularly39/40/41; do not round CSV values or infer a value from a green local test.",
    "Record source hash, chart settings, historical/live cutoff and exact compiler/runtime diagnostics if any."
  ],
  "minimum_history_bars": 46
}
```

```pine
//@version=6
indicator("TRACE720 mature HMA hole", overlay=false)
float source = bar_index == 40 ? na : float(bar_index * bar_index + 7 * (bar_index % 5))
float value = ta.hma(source, 16)
plot(value, "OUTCOME")
if bar_index >= 37 and bar_index <= 45
    log.info("bar=" + str.tostring(bar_index) + " source=" + str.tostring(source, "#.################") + " hma=" + str.tostring(value, "#.################"))
```

## trace-array-nearest-rank-float-boundaries-control-v6.pine

SHA-256: `0e78eb309302ed805cf6a16099963c366d199511bde0d9a656d539262e5b46ef`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-float-boundaries-control-v6.pine",
  "sha256": "0e78eb309302ed805cf6a16099963c366d199511bde0d9a656d539262e5b46ef",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-FLOAT-BOUNDARIES-CONTROL-V6",
  "case_id": "trace-array-nearest-rank-float-boundaries-control-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Documented valid-domain endpoints/middle control: inspect0/50/100%; 50% is30 (int) or30.5(float). Native captured endpoints are controls, not inference for invalid input."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "DOCUMENTED-CONTROL",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "element_kind": "float"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-float-boundaries-control-v6")
a = array.from(10.5, 20.5, 30.5, 40.5, 50.5)
percentage = bar_index % 3 == 0 ? 0.0 : bar_index % 3 == 1 ? 50.0 : 100.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-float-dynamic-high-v6.pine

SHA-256: `8aae401a2b9ef829e44ec19f96e1d9da96b9437f90d950fe185fc6d5e5072b2f`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-float-dynamic-high-v6.pine",
  "sha256": "8aae401a2b9ef829e44ec19f96e1d9da96b9437f90d950fe185fc6d5e5072b2f",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-FLOAT-DYNAMIC-HIGH-V6",
  "case_id": "trace-array-nearest-rank-float-dynamic-high-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "float"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-float-dynamic-high-v6")
a = array.from(10.5, 20.5, 30.5, 40.5, 50.5)
percentage = bar_index < 40 ? 50.0 : 101.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-float-dynamic-low-v6.pine

SHA-256: `c6648656934e683f328a26b834750f337309a0ad5dae02596a502281ceb56755`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-float-dynamic-low-v6.pine",
  "sha256": "c6648656934e683f328a26b834750f337309a0ad5dae02596a502281ceb56755",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-FLOAT-DYNAMIC-LOW-V6",
  "case_id": "trace-array-nearest-rank-float-dynamic-low-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "float"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-float-dynamic-low-v6")
a = array.from(10.5, 20.5, 30.5, 40.5, 50.5)
percentage = bar_index < 40 ? 50.0 : -1.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-float-dynamic-na-v6.pine

SHA-256: `55058730f5e525cfecc41034ca2e9e810aa27c758a53685e94e0fc2494505c6b`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-float-dynamic-na-v6.pine",
  "sha256": "55058730f5e525cfecc41034ca2e9e810aa27c758a53685e94e0fc2494505c6b",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-FLOAT-DYNAMIC-NA-V6",
  "case_id": "trace-array-nearest-rank-float-dynamic-na-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "float"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-float-dynamic-na-v6")
a = array.from(10.5, 20.5, 30.5, 40.5, 50.5)
percentage = bar_index < 40 ? 50.0 : float(na)
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-int-boundaries-control-v6.pine

SHA-256: `b6d75c63d1a2fd11bfe207544a5d819a6ccfc1e3e274beaf72f45443fb37f166`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-int-boundaries-control-v6.pine",
  "sha256": "b6d75c63d1a2fd11bfe207544a5d819a6ccfc1e3e274beaf72f45443fb37f166",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-INT-BOUNDARIES-CONTROL-V6",
  "case_id": "trace-array-nearest-rank-int-boundaries-control-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Documented valid-domain endpoints/middle control: inspect0/50/100%; 50% is30 (int) or30.5(float). Native captured endpoints are controls, not inference for invalid input."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "DOCUMENTED-CONTROL",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "element_kind": "int"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-int-boundaries-control-v6")
a = array.from(10, 20, 30, 40, 50)
percentage = bar_index % 3 == 0 ? 0.0 : bar_index % 3 == 1 ? 50.0 : 100.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-int-dynamic-high-v6.pine

SHA-256: `b02a1adeadef967cad0eafed932fdf776b694e93567ffe54fef8aa5558e50dab`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-int-dynamic-high-v6.pine",
  "sha256": "b02a1adeadef967cad0eafed932fdf776b694e93567ffe54fef8aa5558e50dab",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-INT-DYNAMIC-HIGH-V6",
  "case_id": "trace-array-nearest-rank-int-dynamic-high-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "int"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-int-dynamic-high-v6")
a = array.from(10, 20, 30, 40, 50)
percentage = bar_index < 40 ? 50.0 : 101.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-int-dynamic-low-v6.pine

SHA-256: `dc78ca43f335849619b067500f76cce67c73512705bffc461252792dbc7eb6fe`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-int-dynamic-low-v6.pine",
  "sha256": "dc78ca43f335849619b067500f76cce67c73512705bffc461252792dbc7eb6fe",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-INT-DYNAMIC-LOW-V6",
  "case_id": "trace-array-nearest-rank-int-dynamic-low-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "int"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-int-dynamic-low-v6")
a = array.from(10, 20, 30, 40, 50)
percentage = bar_index < 40 ? 50.0 : -1.0
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-nearest-rank-int-dynamic-na-v6.pine

SHA-256: `35184058f0a22ba850fdd290fcb1af0d7f30959b5748f6dbd25be2b07b3ae84b`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-nearest-rank-int-dynamic-na-v6.pine",
  "sha256": "35184058f0a22ba850fdd290fcb1af0d7f30959b5748f6dbd25be2b07b3ae84b",
  "pine_version": 6,
  "conflict_id": "TRACE-ARRAY-NEAREST-RANK-INT-DYNAMIC-NA-V6",
  "case_id": "trace-array-nearest-rank-int-dynamic-na-v6",
  "builtin": "array.percentile_nearest_rank",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Bars0..39 are valid50% controls; first invalid/missing percentage is bar40. Preserve exact compile/runtime/na/value outcome; do not predict clamp, error, or availability. Int/float are isolated so a failure cannot mask the other type."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "PERCENTAGE",
    "OUTCOME"
  ],
  "target_lines": [
    5
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    786
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ],
  "first_invalid_bar_index": 40,
  "element_kind": "int"
}
```

```pine
//@version=6
indicator("trace-array-nearest-rank-int-dynamic-na-v6")
a = array.from(10, 20, 30, 40, 50)
percentage = bar_index < 40 ? 50.0 : float(na)
result = array.percentile_nearest_rank(a, percentage)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(percentage, "PERCENTAGE", display=display.data_window)
plot(result, "OUTCOME", display=display.data_window)
```

## trace-array-string-every-namespace-v5.pine

SHA-256: `c0f15c335cbb00065cad68413236892171affb5d5186471612a07b3161fe2a91`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-every-namespace-v5.pine",
  "sha256": "c0f15c335cbb00065cad68413236892171affb5d5186471612a07b3161fe2a91",
  "pine_version": 5,
  "conflict_id": "V4-ARRAY-STRING-EVERY-NAMESPACE-V5",
  "case_id": "array:string-every:namespace:v5",
  "builtin": "array.every",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v5/#fun_array.every"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=5
indicator("V4-ARRAY-STRING-EVERY-NAMESPACE-V5")
values = array.from("", "alpha")
result = array.every(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-every-namespace-v6.pine

SHA-256: `0554a7d9d5f457a978e780cb8dc7cbb2f2aad99e1882651819014bc29fc9ad2f`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-every-namespace-v6.pine",
  "sha256": "0554a7d9d5f457a978e780cb8dc7cbb2f2aad99e1882651819014bc29fc9ad2f",
  "pine_version": 6,
  "conflict_id": "V4-ARRAY-STRING-EVERY-NAMESPACE-V6",
  "case_id": "array:string-every:namespace:v6",
  "builtin": "array.every",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_array.every"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=6
indicator("V4-ARRAY-STRING-EVERY-NAMESPACE-V6")
values = array.from("", "alpha")
result = array.every(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-every-receiver-v5.pine

SHA-256: `0315a57585011d2d4dea5f84dbf8f1714b24b72f87cf51fa97c286338821eebb`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-every-receiver-v5.pine",
  "sha256": "0315a57585011d2d4dea5f84dbf8f1714b24b72f87cf51fa97c286338821eebb",
  "pine_version": 5,
  "conflict_id": "V4-ARRAY-STRING-EVERY-RECEIVER-V5",
  "case_id": "array:string-every:receiver:v5",
  "builtin": "array.every",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v5/#fun_array.every"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=5
indicator("V4-ARRAY-STRING-EVERY-RECEIVER-V5")
values = array.from("", "alpha")
result = values.every()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-every-receiver-v6.pine

SHA-256: `52b733435c34698d0bffc8ba6be3203e754f1398cbf48e8c332dd4eb388baa20`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-every-receiver-v6.pine",
  "sha256": "52b733435c34698d0bffc8ba6be3203e754f1398cbf48e8c332dd4eb388baa20",
  "pine_version": 6,
  "conflict_id": "V4-ARRAY-STRING-EVERY-RECEIVER-V6",
  "case_id": "array:string-every:receiver:v6",
  "builtin": "array.every",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_array.every"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=6
indicator("V4-ARRAY-STRING-EVERY-RECEIVER-V6")
values = array.from("", "alpha")
result = values.every()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-some-namespace-v5.pine

SHA-256: `f05311d1ae976076d790dd71b4bc74e8065217322cd0b2edfab5e9b826a71651`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-some-namespace-v5.pine",
  "sha256": "f05311d1ae976076d790dd71b4bc74e8065217322cd0b2edfab5e9b826a71651",
  "pine_version": 5,
  "conflict_id": "V4-ARRAY-STRING-SOME-NAMESPACE-V5",
  "case_id": "array:string-some:namespace:v5",
  "builtin": "array.some",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v5/#fun_array.some"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=5
indicator("V4-ARRAY-STRING-SOME-NAMESPACE-V5")
values = array.from("", "alpha")
result = array.some(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-some-namespace-v6.pine

SHA-256: `8f68f60685b971765d762b8f90a7852d5bab24423a767e67c74a1bb9ad6b49ef`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-some-namespace-v6.pine",
  "sha256": "8f68f60685b971765d762b8f90a7852d5bab24423a767e67c74a1bb9ad6b49ef",
  "pine_version": 6,
  "conflict_id": "V4-ARRAY-STRING-SOME-NAMESPACE-V6",
  "case_id": "array:string-some:namespace:v6",
  "builtin": "array.some",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_array.some"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=6
indicator("V4-ARRAY-STRING-SOME-NAMESPACE-V6")
values = array.from("", "alpha")
result = array.some(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-some-receiver-v5.pine

SHA-256: `0af919315b1604529f917d7662f9ae873b40068657aaf4fcd1af10f612502af2`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-some-receiver-v5.pine",
  "sha256": "0af919315b1604529f917d7662f9ae873b40068657aaf4fcd1af10f612502af2",
  "pine_version": 5,
  "conflict_id": "V4-ARRAY-STRING-SOME-RECEIVER-V5",
  "case_id": "array:string-some:receiver:v5",
  "builtin": "array.some",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v5/#fun_array.some"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=5
indicator("V4-ARRAY-STRING-SOME-RECEIVER-V5")
values = array.from("", "alpha")
result = values.some()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-array-string-some-receiver-v6.pine

SHA-256: `d9a28d74b2e0ac4961bc280d26165cb7d1f4a8d62e0b0e640bb11038d5240028`

Minimum history: 3 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-array-string-some-receiver-v6.pine",
  "sha256": "d9a28d74b2e0ac4961bc280d26165cb7d1f4a8d62e0b0e640bb11038d5240028",
  "pine_version": 6,
  "conflict_id": "V4-ARRAY-STRING-SOME-RECEIVER-V6",
  "case_id": "array:string-some:receiver:v6",
  "builtin": "array.some",
  "category": "string-array-predicate-admission",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/#fun_array.some"
  ],
  "registered_owner": "codex-776dnu",
  "related_adjudication": "CF003",
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Observe string-array admission and exact result for this version/member/call form. CF003 numeric-array refusal in v6 does not settle strings or earlier versions."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "OUTCOME"
  ],
  "target_lines": [
    4
  ],
  "minimum_history_bars": 3,
  "input_values": [
    "",
    "alpha"
  ],
  "output_encoding": {
    "true": 1,
    "false": 0,
    "neither_true_nor_false": -1
  },
  "record": [
    "Capture exact native COMPILE-ERROR, RUNTIME-ERROR or RUNS, full diagnostic/code if exposed, line/column, screenshot and failing bar/time.",
    "If accepted, export the complete OUTCOME CSV including missingness. Encoding is 1 for true, 0 for false and -1 when neither equality condition is true; preserve unexpected values unchanged.",
    "Keep the complete source, title, version and SHA256. Do not replace string inputs with numeric or bool values to obtain success.",
    "Treat target line4 and plot line5 separately: an output-instrument diagnostic does not prove the predicate was refused. Other versions/members/forms require their own captures."
  ],
  "adjudication": "Local admission and truthiness are instrument observations only. No native phase/error/result is predicted; successful mixed-string output does not certify empty/all-na arrays, other string values or qualifiers."
}
```

```pine
//@version=6
indicator("V4-ARRAY-STRING-SOME-RECEIVER-V6")
values = array.from("", "alpha")
result = values.some()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
```

## trace-equal-key-sort-indices-v6.pine

SHA-256: `dba23eb8acb6f13ed1a0bbd7ad127d67c12df34017a1da9e35ec15fe01b8e37d`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-equal-key-sort-indices-v6.pine",
  "sha256": "dba23eb8acb6f13ed1a0bbd7ad127d67c12df34017a1da9e35ec15fe01b8e37d",
  "pine_version": 6,
  "conflict_id": "TRACE-EQUAL-KEY-SORT-INDICES-V6",
  "case_id": "trace-equal-key-sort-indices-v6",
  "builtin": "array.sort_indices",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Capture full index permutations for each seed. Stable/unstable ties are hypotheses, not predicted values; ascending/descending key groups and permutation validity are controls. Primitive sort_indices does not establish UDT array.sort tie stability."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "SOURCE_KEY_0",
    "SOURCE_KEY_1",
    "SOURCE_KEY_2",
    "SOURCE_KEY_3",
    "SOURCE_KEY_4",
    "SOURCE_KEY_5",
    "ASC_INDEX_0",
    "ASC_INDEX_1",
    "ASC_INDEX_2",
    "ASC_INDEX_3",
    "ASC_INDEX_4",
    "ASC_INDEX_5",
    "DESC_INDEX_0",
    "DESC_INDEX_1",
    "DESC_INDEX_2",
    "DESC_INDEX_3",
    "DESC_INDEX_4",
    "DESC_INDEX_5"
  ],
  "target_lines": [
    8,
    9
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    782,
    783
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ]
}
```

```pine
//@version=6
indicator("trace-equal-key-sort-indices-v6")
seed = bar_index % 3
base = array.from(2, 1, 2, 1, 2, 3)
a = array.new_int(0)
for i = 0 to 5
    array.push(a, array.get(base, (i + seed) % 6))
asc = array.sort_indices(a, order.ascending)
desc = array.sort_indices(a, order.descending)
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.get(a, 0), "SOURCE_KEY_0", display=display.data_window)
plot(array.get(a, 1), "SOURCE_KEY_1", display=display.data_window)
plot(array.get(a, 2), "SOURCE_KEY_2", display=display.data_window)
plot(array.get(a, 3), "SOURCE_KEY_3", display=display.data_window)
plot(array.get(a, 4), "SOURCE_KEY_4", display=display.data_window)
plot(array.get(a, 5), "SOURCE_KEY_5", display=display.data_window)
plot(array.get(asc, 0), "ASC_INDEX_0", display=display.data_window)
plot(array.get(asc, 1), "ASC_INDEX_1", display=display.data_window)
plot(array.get(asc, 2), "ASC_INDEX_2", display=display.data_window)
plot(array.get(asc, 3), "ASC_INDEX_3", display=display.data_window)
plot(array.get(asc, 4), "ASC_INDEX_4", display=display.data_window)
plot(array.get(asc, 5), "ASC_INDEX_5", display=display.data_window)
plot(array.get(desc, 0), "DESC_INDEX_0", display=display.data_window)
plot(array.get(desc, 1), "DESC_INDEX_1", display=display.data_window)
plot(array.get(desc, 2), "DESC_INDEX_2", display=display.data_window)
plot(array.get(desc, 3), "DESC_INDEX_3", display=display.data_window)
plot(array.get(desc, 4), "DESC_INDEX_4", display=display.data_window)
plot(array.get(desc, 5), "DESC_INDEX_5", display=display.data_window)
```

## trace-equal-key-udt-sort-v6.pine

SHA-256: `fc6fb85870f35d059597ff46872eab01584093290cc8ef18d4fa4ab5f8a95254`

Minimum history: 160 bars.



Expected readings and required evidence:

```json
{
  "script": "trace-equal-key-udt-sort-v6.pine",
  "sha256": "fc6fb85870f35d059597ff46872eab01584093290cc8ef18d4fa4ab5f8a95254",
  "pine_version": 6,
  "conflict_id": "TRACE-EQUAL-KEY-UDT-SORT-V6",
  "case_id": "trace-equal-key-udt-sort-v6",
  "builtin": "array.sort",
  "category": "ledger-trace",
  "authority": [
    "https://www.tradingview.com/pine-script-reference/v6/"
  ],
  "expected_outcome": {
    "phase": "UNSPECIFIED",
    "columns": {},
    "rule": "Tagged equal-key identities are numeric fields; never compare UDT/drawing IDs. Explicit key selector prevents default-field ambiguity. Export complete source/key/tag permutations, both directions and all-equal case. Unknown acceptance/stability stays unknown if native refuses."
  },
  "expected_error_code": null,
  "expected_error_text": null,
  "settlement": "TRACE-REQUIRED",
  "columns": [
    "BAR_INDEX",
    "SOURCE_KEY_0",
    "SOURCE_KEY_1",
    "SOURCE_KEY_2",
    "SOURCE_KEY_3",
    "SOURCE_KEY_4",
    "SOURCE_KEY_5",
    "SOURCE_TAG_0",
    "SOURCE_TAG_1",
    "SOURCE_TAG_2",
    "SOURCE_TAG_3",
    "SOURCE_TAG_4",
    "SOURCE_TAG_5",
    "ASC_KEY_0",
    "ASC_KEY_1",
    "ASC_KEY_2",
    "ASC_KEY_3",
    "ASC_KEY_4",
    "ASC_KEY_5",
    "ASC_TAG_0",
    "ASC_TAG_1",
    "ASC_TAG_2",
    "ASC_TAG_3",
    "ASC_TAG_4",
    "ASC_TAG_5",
    "DESC_KEY_0",
    "DESC_KEY_1",
    "DESC_KEY_2",
    "DESC_KEY_3",
    "DESC_KEY_4",
    "DESC_KEY_5",
    "DESC_TAG_0",
    "DESC_TAG_1",
    "DESC_TAG_2",
    "DESC_TAG_3",
    "DESC_TAG_4",
    "DESC_TAG_5",
    "EQUAL_TAG_0",
    "EQUAL_TAG_1",
    "EQUAL_TAG_2",
    "EQUAL_TAG_3",
    "EQUAL_TAG_4",
    "EQUAL_TAG_5"
  ],
  "target_lines": [
    23,
    24,
    25
  ],
  "registered_owner": "codex-cnf04e",
  "ledger_ranks": [
    782,
    783
  ],
  "minimum_history_bars": 160,
  "record": [
    "Untouched source/defaults, standard BINANCE:BTCUSDT 2-minute UTC.",
    "Save exact native compile/runtime diagnostics, bar/time/line and warnings. Otherwise full CSV including na.",
    "Predictions/local runs are not native observations. No source repair to obtain success."
  ]
}
```

```pine
//@version=6
indicator("trace-equal-key-udt-sort-v6")
type Tagged
    int key
    int tag
get_key(array<Tagged> a, int i) =>
    Tagged item = array.get(a, i)
    item.key
get_tag(array<Tagged> a, int i) =>
    Tagged item = array.get(a, i)
    item.tag
seed = bar_index % 3
base_keys = array.from(2, 1, 2, 1, 2, 3)
base_tags = array.from(90, 12, 45, 3, 88, 7)
a = array.new<Tagged>(0)
equal = array.new<Tagged>(0)
for i = 0 to 5
    k = (i + seed) % 6
    array.push(a, Tagged.new(array.get(base_keys, k), array.get(base_tags, k)))
    array.push(equal, Tagged.new(1, array.get(base_tags, k)))
asc = array.copy(a)
desc = array.copy(a)
array.sort(asc, order.ascending, sort_field="key")
array.sort(desc, order.descending, sort_field="key")
array.sort(equal, order.ascending, sort_field="key")
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(get_key(a, 0), "SOURCE_KEY_0", display=display.data_window)
plot(get_key(a, 1), "SOURCE_KEY_1", display=display.data_window)
plot(get_key(a, 2), "SOURCE_KEY_2", display=display.data_window)
plot(get_key(a, 3), "SOURCE_KEY_3", display=display.data_window)
plot(get_key(a, 4), "SOURCE_KEY_4", display=display.data_window)
plot(get_key(a, 5), "SOURCE_KEY_5", display=display.data_window)
plot(get_tag(a, 0), "SOURCE_TAG_0", display=display.data_window)
plot(get_tag(a, 1), "SOURCE_TAG_1", display=display.data_window)
plot(get_tag(a, 2), "SOURCE_TAG_2", display=display.data_window)
plot(get_tag(a, 3), "SOURCE_TAG_3", display=display.data_window)
plot(get_tag(a, 4), "SOURCE_TAG_4", display=display.data_window)
plot(get_tag(a, 5), "SOURCE_TAG_5", display=display.data_window)
plot(get_key(asc, 0), "ASC_KEY_0", display=display.data_window)
plot(get_key(asc, 1), "ASC_KEY_1", display=display.data_window)
plot(get_key(asc, 2), "ASC_KEY_2", display=display.data_window)
plot(get_key(asc, 3), "ASC_KEY_3", display=display.data_window)
plot(get_key(asc, 4), "ASC_KEY_4", display=display.data_window)
plot(get_key(asc, 5), "ASC_KEY_5", display=display.data_window)
plot(get_tag(asc, 0), "ASC_TAG_0", display=display.data_window)
plot(get_tag(asc, 1), "ASC_TAG_1", display=display.data_window)
plot(get_tag(asc, 2), "ASC_TAG_2", display=display.data_window)
plot(get_tag(asc, 3), "ASC_TAG_3", display=display.data_window)
plot(get_tag(asc, 4), "ASC_TAG_4", display=display.data_window)
plot(get_tag(asc, 5), "ASC_TAG_5", display=display.data_window)
plot(get_key(desc, 0), "DESC_KEY_0", display=display.data_window)
plot(get_key(desc, 1), "DESC_KEY_1", display=display.data_window)
plot(get_key(desc, 2), "DESC_KEY_2", display=display.data_window)
plot(get_key(desc, 3), "DESC_KEY_3", display=display.data_window)
plot(get_key(desc, 4), "DESC_KEY_4", display=display.data_window)
plot(get_key(desc, 5), "DESC_KEY_5", display=display.data_window)
plot(get_tag(desc, 0), "DESC_TAG_0", display=display.data_window)
plot(get_tag(desc, 1), "DESC_TAG_1", display=display.data_window)
plot(get_tag(desc, 2), "DESC_TAG_2", display=display.data_window)
plot(get_tag(desc, 3), "DESC_TAG_3", display=display.data_window)
plot(get_tag(desc, 4), "DESC_TAG_4", display=display.data_window)
plot(get_tag(desc, 5), "DESC_TAG_5", display=display.data_window)
plot(get_tag(equal, 0), "EQUAL_TAG_0", display=display.data_window)
plot(get_tag(equal, 1), "EQUAL_TAG_1", display=display.data_window)
plot(get_tag(equal, 2), "EQUAL_TAG_2", display=display.data_window)
plot(get_tag(equal, 3), "EQUAL_TAG_3", display=display.data_window)
plot(get_tag(equal, 4), "EQUAL_TAG_4", display=display.data_window)
plot(get_tag(equal, 5), "EQUAL_TAG_5", display=display.data_window)
```
