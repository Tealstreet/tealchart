# External Pine Corpus Current Error Rerun v1

Navigation note: this current acceptance/error attribution report explains the
latest v5/v6/v7 corpus output movement. For tomorrow's actionable build order,
start at `pine-corpus-priority-queue-v1.md`.

Date: 2026-09-11
Measurement commit: `7c08371da19c918e42e591c4f461f3183e2a0d58`
Machine-readable companion: `reports/external-pine-corpus-current-error-rerun-v1.json`

## Headline

Across v5/v6/v7, 0 previously silent/no-error rows now emit one of the seven newly propagated Pine runtime errors.

Separately, 2 previously silent/no-error rows now emit the stricter TA-length refusal, 9 formerly producing rows now stop on one of the seven propagated errors, and 43 formerly producing rows now stop on invalid TA lengths.

Net raw output movement is -25 rows. Net achievable output movement is -25 rows.

## Corpus Movement

| Corpus | Previous | Current | Raw output | Achievable output | Old silent/no-error | Silent -> seven errors | Silent -> TA length | Output -> seven errors | Output -> TA length | Output gains |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v5 | a75ebd88d7 | 7c08371da1 | 872/1000 -> 855/1000 (-17) | 872/923 -> 855/925 (-17) | 14 | 0 | 1 | 1 | 20 | 4 |
| v6 | a75ebd88d7 | 7c08371da1 | 796/1000 -> 777/1000 (-19) | 796/930 -> 777/935 (-19) | 47 | 0 | 1 | 6 | 19 | 6 |
| v7 | bbcbf3d220 | 7c08371da1 | 293/456 -> 304/456 (+11) | 293/401 -> 304/400 (+11) | 5 | 0 | 0 | 2 | 4 | 17 |

## Silent Rows Now Seven Errors

None.

## Silent Rows Now TA-Length Refusals

| Corpus | Row | Cause | Diagnostic |
| --- | --- | --- | --- |
| v5 | sources/0987__deepentropy-lightweight-charts-indicators__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine | ta-invalid-length | TA length must be a positive integer |

## Produced Rows Now Seven Errors

| Corpus | Row | Cause | Diagnostic |
| --- | --- | --- | --- |
| v5 | sources/0945__haydarkadioglu-tradingview-indicators__trend_strength.pine | table-coordinates | Table cell coordinates out of bounds: column 1, row NaN |
| v6 | sources/0317__helenananaa-pine-compat-runtime__table_cell_set_text_color_coordinate_bounds.pine | table-coordinates | Table cell coordinates out of bounds: column 2, row 0 |
| v6 | sources/0382__helenananaa-pine-compat-runtime__user_methods.pine | plot-output-limit | Too many plot outputs: maximum is 64 |
| v6 | sources/0441__helenananaa-pine-compat-runtime__ticker.pine | plot-output-limit | Too many plot outputs: maximum is 64 |
| v6 | sources/0444__helenananaa-pine-compat-runtime__table_cell_set_text_coordinate_row_bounds.pine | table-coordinates | Table cell coordinates out of bounds: column 0, row 1 |
| v6 | sources/0513__helenananaa-pine-compat-runtime__table_merge_coordinate_bounds.pine | table-coordinates | Table cell coordinates out of bounds: column 2, row 0 |
| v6 | sources/0681__helenananaa-pine-compat-runtime__table_cell_set_text_size_coordinate_row_bounds.pine | table-coordinates | Table cell coordinates out of bounds: column 0, row 1 |
| v7 | sources/0252__regalouisei-collect-tradingview__short-volume-stamper.pine | table-cell-limit | Too many table cells: maximum is 10000 |
| v7 | sources/0367__himeshramjee-chaiwala-invest__two-thirty-100pip-scalp.pine | table-cell-limit | Too many table cells: maximum is 10000 |

## Produced Rows Now TA-Length Refusals

| Corpus | Row | Cause | Diagnostic |
| --- | --- | --- | --- |
| v5 | sources/0450__everget-tradingview-pinescript-indicators__stochastic.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0534__casoon-pine-scripts__oscillator_cycle_statistics.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0676__SammyEnigma-pine-scripts__vol-bbw-rsi-15m.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0698__dcaoyuan-vibetrader__kdj.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0750__mphinance-mphinance__ghost_flow.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0755__hasnocool-tradingview-pine-scripts__kaya-indicator.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0761__benso87-Private-Pine-Scripts__BB-Swing-indicator.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0809__helenananaa-pine-compat-runtime__stoch.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0811__helenananaa-pine-compat-runtime__bb_edge_cases.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0812__helenananaa-pine-compat-runtime__unsupported_ta_macd_fastlen.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0852__benso87-Private-Pine-Scripts__Stoch-crossovers.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0867__Leci37-tuisku_Web_selling__WklfMUhvdXJfMk1TMHR1aXNrdTNjYTFjMjNj.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0872__Leci37-tuisku_Web_selling__TklPXzFIb3VyXzJTVDB0dWlza3U0NWJjOTVmMw.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0875__Leci37-tuisku_Web_selling__UUNPTV8xSG91cl8yQ1MwdHVpc2t1NWZiNDJjMGQ.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0884__Leci37-tuisku_Web_selling__U09MVVNEVF8xRGF5XzFTMDB0dWlza3VjODcyNGM0ZQ.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0935__deepentropy-lightweight-charts-indicators__CDC-ActionZone-V3-2020.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0937__Leci37-tuisku_Web_selling__VV8xTWluXzJNUzB0dWlza3VhMTUzNWNjZQ.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0940__deepentropy-oakscriptJS__CDC-ActionZone-V3-2020.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0957__Leci37-tuisku_Web_selling__R09PR18xRGF5XzJTVjB0dWlza3U0ZmUyMmFhOQ.pine | ta-invalid-length | TA length must be a positive integer |
| v5 | sources/0966__Leci37-tuisku_Web_selling__RVRIVVNEVF8xSG91cl8yTVMwdHVpc2t1NDg2ODBhYWI.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0120__rubbermetal-Pine__Quad-Rotation-40-4.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0184__benso87-Private-Pine-Scripts__KC-Combo.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0236__aeiioaeiio-XAUUSD_TradingView_Pine__XAUUSD_Strategy_V4_7_1_AutoEntry_SmartTPSL_Fixed.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0238__akash-yellgetti-api.web__algo-trade-indian-commodity.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0246__aboutblank007-alpha-os__Dual-SuperTrend.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0271__kingmalitha-SRI-Indicator-Ft.-MSB__final.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0318__helenananaa-pine-compat-runtime__unsupported_ta_percentile_linear_interpolation_length.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0412__benso87-Private-Pine-Scripts__Intermediate-Stoch.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0608__Ronterox-BoxBot__stochastic.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0619__sogutemir-PineScriptTradingViewIndicators__BBSRExtremeWithTableV2.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0651__AkashSasikumar47-pine-strategy-indicators-v6__Hull-Moving-Average.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0668__helenananaa-pine-compat-runtime__change_edge_cases.pine | ta-invalid-length | ta.change length must be a positive integer |
| v6 | sources/0693__TradersPost-pinescript-agents__momentum.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0711__tarasprystavskyj-top__Breakout-AVAAI-BITGET.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0723__blumax20-OptionsTradingStrategy__debit_spread_strategy.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0733__PapaPablano-Crypto-Test-FIle__EnhancedStrategy.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0776__deepentropy-lightweight-charts-indicators__Stochastic-Slow-Strategy.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0846__Borisder1-skalpel__SMC_Agent_v6.pine | ta-invalid-length | TA length must be a positive integer |
| v6 | sources/0859__deepentropy-oakscriptJS__Stochastic-Slow-Strategy.pine | ta-invalid-length | TA length must be a positive integer |
| v7 | sources/0254__deepentropy-lightweight-charts-indicators__Global-Liquidity-Index.pine | ta-invalid-length | TA length must be a positive integer |
| v7 | sources/0260__deepentropy-oakscriptJS__Global-Liquidity-Index.pine | ta-invalid-length | TA length must be a positive integer |
| v7 | sources/0290__hasnocool-tradingview-pine-scripts__Position-Investing-by-SirSeff.pine | ta-invalid-length | TA length must be a positive integer |
| v7 | sources/0380__etnt-stocks__15M.pine | ta-invalid-length | TA length must be a positive integer |

## Method

- Re-ran v5, v6, and v7 daily-profile corpora at the current merge commit.
- Compared each current row to the prior daily-profile report by `localPath`.
- The seven-error question only counts rows whose previous outcome was `no-output-compiled` and had neither `compiledBarErrors` nor `swallowedErrors`.
- TA invalid-length refusals are reported separately because commit `39757006c2` intentionally changed zero, negative, fractional, and non-finite TA lengths from silent coercion to Pine-style runtime refusal.
- Output gains are listed only as a balancing term for the headline movement; they are not attributed to the swallowed-error or TA-length changes.
