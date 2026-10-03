# Standalone SMA/stdev primitive probe v1

60 plots; all `display.data_window`, no series colors, precision 16. Export every column with the same symbol/timeframe/history start as the oscillator batch where possible. Record chart identity, historical cutoff, and CSV hash. No invalid lengths or sample length-one division are used.

Purpose: isolate SMA sum/division bits and standalone population/sample stdev bits from BB composition. Lengths 2/3/7/14/31 distinguish denominator/order effects. `math.sum` reveals whether SMA equals native sum divided by length. Close leading/hole sources test sample selection and held state. Binary-exact bounded wave separates input rounding from arithmetic; its +100,000,000 translation exposes moment cancellation. Negative candidate moment variance deliberately outputs missing rather than clamping it.

Manual means compare newest/oldest order, divide-each vs sum-then-divide, three running operation orders, and Kahan subtraction then addition. They are clean-source fixed-window candidates, not NA-aware reference implementations. Manual centered population stdev and fresh moments keep their mean source explicit. Native BB/BBW controls connect standalone results to previous composition captures. Do not infer standalone stdev bits by subtracting rounded bands.

Leading source is reconstructible as `bar_index < 3 ? na : input_close`; holes are indices 40/41. Warmup is determined by each native call and must be captured, not discarded. Native columns supply authority; local execution only validates that the probe runs.

| Column | Export title | Pine expression |
|---:|---|---|
| 1 | `input_time_ms` | `time` |
| 2 | `input_bar_index` | `bar_index` |
| 3 | `input_close` | `close` |
| 4 | `input_wave` | `wave` |
| 5 | `input_shifted_wave` | `shifted` |
| 6 | `input_close_hole40_41` | `hole` |
| 7 | `sma_len2_close_clean` | `ta.sma(close, 2)` |
| 8 | `sum_len2_close_clean` | `math.sum(close, 2)` |
| 9 | `stdev_population_len2_close_clean` | `ta.stdev(close, 2, true)` |
| 10 | `stdev_sample_len2_close_clean` | `ta.stdev(close, 2, false)` |
| 11 | `sma_len3_close_clean` | `ta.sma(close, 3)` |
| 12 | `sum_len3_close_clean` | `math.sum(close, 3)` |
| 13 | `stdev_population_len3_close_clean` | `ta.stdev(close, 3, true)` |
| 14 | `stdev_sample_len3_close_clean` | `ta.stdev(close, 3, false)` |
| 15 | `sma_len7_close_clean` | `ta.sma(close, 7)` |
| 16 | `sum_len7_close_clean` | `math.sum(close, 7)` |
| 17 | `stdev_population_len7_close_clean` | `ta.stdev(close, 7, true)` |
| 18 | `stdev_sample_len7_close_clean` | `ta.stdev(close, 7, false)` |
| 19 | `sma_len14_close_clean` | `ta.sma(close, 14)` |
| 20 | `sum_len14_close_clean` | `math.sum(close, 14)` |
| 21 | `stdev_population_len14_close_clean` | `ta.stdev(close, 14, true)` |
| 22 | `stdev_sample_len14_close_clean` | `ta.stdev(close, 14, false)` |
| 23 | `sma_len31_close_clean` | `ta.sma(close, 31)` |
| 24 | `sum_len31_close_clean` | `math.sum(close, 31)` |
| 25 | `stdev_population_len31_close_clean` | `ta.stdev(close, 31, true)` |
| 26 | `stdev_sample_len31_close_clean` | `ta.stdev(close, 31, false)` |
| 27 | `sma_len14_close_hole40_41` | `ta.sma(hole, 14)` |
| 28 | `sum_len14_close_hole40_41` | `math.sum(hole, 14)` |
| 29 | `stdev_population_len14_close_hole40_41` | `ta.stdev(hole, 14, true)` |
| 30 | `stdev_sample_len14_close_hole40_41` | `ta.stdev(hole, 14, false)` |
| 31 | `sma_len14_close_lead0_2` | `ta.sma(leading, 14)` |
| 32 | `sum_len14_close_lead0_2` | `math.sum(leading, 14)` |
| 33 | `stdev_population_len14_close_lead0_2` | `ta.stdev(leading, 14, true)` |
| 34 | `stdev_sample_len14_close_lead0_2` | `ta.stdev(leading, 14, false)` |
| 35 | `sma_len14_wave_clean` | `ta.sma(wave, 14)` |
| 36 | `sum_len14_wave_clean` | `math.sum(wave, 14)` |
| 37 | `stdev_population_len14_wave_clean` | `ta.stdev(wave, 14, true)` |
| 38 | `stdev_sample_len14_wave_clean` | `ta.stdev(wave, 14, false)` |
| 39 | `sma_len14_shifted_wave_clean` | `ta.sma(shifted, 14)` |
| 40 | `sum_len14_shifted_wave_clean` | `math.sum(shifted, 14)` |
| 41 | `stdev_population_len14_shifted_wave_clean` | `ta.stdev(shifted, 14, true)` |
| 42 | `stdev_sample_len14_shifted_wave_clean` | `ta.stdev(shifted, 14, false)` |
| 43 | `mean_sum_newest_first_len14_close_clean` | `f_sum(close, 14, false, false)` |
| 44 | `mean_sum_oldest_first_len14_close_clean` | `f_sum(close, 14, true, false)` |
| 45 | `mean_divide_each_newest_first_len14_close_clean` | `f_sum(close, 14, false, true)` |
| 46 | `mean_divide_each_oldest_first_len14_close_clean` | `f_sum(close, 14, true, true)` |
| 47 | `mean_running_subtract_add_len14_close_clean` | `f_running(close, 14, 0)` |
| 48 | `mean_running_add_subtract_len14_close_clean` | `f_running(close, 14, 1)` |
| 49 | `mean_running_difference_len14_close_clean` | `f_running(close, 14, 2)` |
| 50 | `mean_running_kahan_subtract_add_len14_close_clean` | `f_kahan(close, 14)` |
| 51 | `stdev_centered_ownmean_len14_close_clean` | `f_centered(close, 14, false)` |
| 52 | `stdev_fresh_moment_ownmean_len14_close_clean` | `f_moment(close, 14, false)` |
| 53 | `stdev_centered_ownmean_len14_wave_clean` | `f_centered(wave, 14, false)` |
| 54 | `stdev_centered_nativemean_len14_wave_clean` | `f_centered(wave, 14, true)` |
| 55 | `stdev_moment_ownmean_len14_shifted_wave_clean` | `f_moment(shifted, 14, false)` |
| 56 | `stdev_moment_nativemean_len14_shifted_wave_clean` | `f_moment(shifted, 14, true)` |
| 57 | `bb_basis_len14_mult2_close_clean` | `bbBasis` |
| 58 | `bb_upper_len14_mult2_close_clean` | `bbUpper` |
| 59 | `bb_lower_len14_mult2_close_clean` | `bbLower` |
| 60 | `bbw_len14_mult2_close_clean` | `ta.bbw(close, 14, 2.0)` |

Validation artifacts: `check-primitives-sma-stdev-v1.ts` and `primitives-sma-stdev-v1-validation.json`. Runtime results are compatibility checks, not TradingView parity evidence.

Local validation: 1,100 bars, 60 unique plots, zero semantic diagnostics/runtime errors. Fifteen independent arithmetic checks at bars 13/20/41/1001/1099 match the three clean-close manual mean/variance forms exactly. SHA-256: `1b89dc1fbe7fcef8ce71331791210b1026d1deb8ed71b8b85cba38adf62d80f1`. Manual variance helpers inline their own mean loops: an initial nested helper shape produced an all-missing moment column locally, so that shape was removed before handoff. These checks validate the capture instrument only.
