# External Pine Corpus TA-Length Codegen Fix Measurement 2026-09-11

Date: 2026-09-11

Measured commit: `7ee7a2c98b` on `tealscript-runtime`, after merging parity at
`987b606345`.

Pre-measurement prediction:
`external-pine-corpus-ta-length-codegen-fix-prediction-20260911.md` predicted
an output rebound of **+18 to +30 rows**, point estimate **+24 rows**, after
`6c66058cf4` fixed optimized `ta.sma(...)` expression-source ordering.

## Result

Measured against the committed `7c08371da1` daily reruns:

| Corpus | Before output | After output | Net output delta | TA-length rows restored to output | Unrelated rows lost |
| --- | ---: | ---: | ---: | ---: | ---: |
| v5 | 855 | 869 | +14 | 16 | 2 |
| v6 | 777 | 789 | +12 | 16 | 4 |
| v7 | 304 | 307 | +3 | 3 | 0 |
| **Total** | **1936** | **1965** | **+29** | **35** | **6** |

The prediction was correct on direction and landed at the upper end of the
predicted range. The useful refinement is that **35 rows** returned to output,
while **6 unrelated parity semantic changes** moved output-producing rows to
loud semantic refusals. The TA-length ordering bug therefore accounts for even
more row movement than the net +29 alone shows.

The six unrelated losses are attributed separately in
`external-pine-corpus-semantic-loss-attribution-20260911.md`. All six flipped at
`ba1395693a`, the semantic type invariant commit.

## Interpretation

The `4b915fcb75` corpus result made it look like 43 formerly-producing rows had
author-side invalid TA lengths. That was too broad. The current measurement
confirms the local reconstruction:

- A large majority of those rows were valid public scripts whose generated
  optimized SMA expression-source series was sampled before input-backed
  declarations had executed.
- The loud TA-length refusal from `39757006c2` exposed that codegen bug because
  it turned the old hidden `na` length into an error instead of silently
  normalizing it.
- After `6c66058cf4`, the remaining explicit TA-length failures are mostly the
  author-code shapes predicted in the attribution report: fractional dynamic
  lengths and literal zero cases.

Rows returning to output after `6c66058cf4` are correctness recoveries, not a
softening of the TA-length refusal.

## Rows Restored To Output

v5 restored 16 rows:

- `sources/0450__everget-tradingview-pinescript-indicators__stochastic.pine`
- `sources/0534__casoon-pine-scripts__oscillator_cycle_statistics.pine`
- `sources/0676__SammyEnigma-pine-scripts__vol-bbw-rsi-15m.pine`
- `sources/0698__dcaoyuan-vibetrader__kdj.pine`
- `sources/0755__hasnocool-tradingview-pine-scripts__kaya-indicator.pine`
- `sources/0761__benso87-Private-Pine-Scripts__BB-Swing-indicator.pine`
- `sources/0852__benso87-Private-Pine-Scripts__Stoch-crossovers.pine`
- `sources/0867__Leci37-tuisku_Web_selling__WklfMUhvdXJfMk1TMHR1aXNrdTNjYTFjMjNj.pine`
- `sources/0872__Leci37-tuisku_Web_selling__TklPXzFIb3VyXzJTVDB0dWlza3U0NWJjOTVmMw.pine`
- `sources/0875__Leci37-tuisku_Web_selling__UUNPTV8xSG91cl8yQ1MwdHVpc2t1NWZiNDJjMGQ.pine`
- `sources/0884__Leci37-tuisku_Web_selling__U09MVVNEVF8xRGF5XzFTMDB0dWlza3VjODcyNGM0ZQ.pine`
- `sources/0935__deepentropy-lightweight-charts-indicators__CDC-ActionZone-V3-2020.pine`
- `sources/0937__Leci37-tuisku_Web_selling__VV8xTWluXzJNUzB0dWlza3VhMTUzNWNjZQ.pine`
- `sources/0940__deepentropy-oakscriptJS__CDC-ActionZone-V3-2020.pine`
- `sources/0957__Leci37-tuisku_Web_selling__R09PR18xRGF5XzJTVjB0dWlza3U0ZmUyMmFhOQ.pine`
- `sources/0966__Leci37-tuisku_Web_selling__RVRIVVNEVF8xSG91cl8yTVMwdHVpc2t1NDg2ODBhYWI.pine`

v6 restored 16 rows:

- `sources/0120__rubbermetal-Pine__Quad-Rotation-40-4.pine`
- `sources/0184__benso87-Private-Pine-Scripts__KC-Combo.pine`
- `sources/0236__aeiioaeiio-XAUUSD_TradingView_Pine__XAUUSD_Strategy_V4_7_1_AutoEntry_SmartTPSL_Fixed.pine`
- `sources/0238__akash-yellgetti-api.web__algo-trade-indian-commodity.pine`
- `sources/0246__aboutblank007-alpha-os__Dual-SuperTrend.pine`
- `sources/0271__kingmalitha-SRI-Indicator-Ft.-MSB__final.pine`
- `sources/0412__benso87-Private-Pine-Scripts__Intermediate-Stoch.pine`
- `sources/0608__Ronterox-BoxBot__stochastic.pine`
- `sources/0619__sogutemir-PineScriptTradingViewIndicators__BBSRExtremeWithTableV2.pine`
- `sources/0693__TradersPost-pinescript-agents__momentum.pine`
- `sources/0711__tarasprystavskyj-top__Breakout-AVAAI-BITGET.pine`
- `sources/0723__blumax20-OptionsTradingStrategy__debit_spread_strategy.pine`
- `sources/0733__PapaPablano-Crypto-Test-FIle__EnhancedStrategy.pine`
- `sources/0776__deepentropy-lightweight-charts-indicators__Stochastic-Slow-Strategy.pine`
- `sources/0846__Borisder1-skalpel__SMC_Agent_v6.pine`
- `sources/0859__deepentropy-oakscriptJS__Stochastic-Slow-Strategy.pine`

v7 restored 3 rows:

- `sources/0254__deepentropy-lightweight-charts-indicators__Global-Liquidity-Index.pine`
- `sources/0260__deepentropy-oakscriptJS__Global-Liquidity-Index.pine`
- `sources/0368__darkforest-x-fable-trading__cuWPYbhn.pine`

## Remaining TA-Length Failures

Current explicit execute failures:

- v5: 5 rows
  - `got 27.5`
  - `got 0`
  - `got 0`
  - `got 1.5`
  - `got 0.25`
- v6: 4 rows
  - `got 2.5`
  - `got 0.25`
  - `got 4.5`
  - `ta.change ... got 0`
- v7: 2 rows
  - `got 27.5`
  - `got 32.5`

Two request-expression profile diagnostics remain non-fatal swallowed generated
errors:

- v5 `sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine`: request replay still records `got na`.
- v7 `sources/0359__regalouisei-collect-tradingview__eduvest-qqe-signal-v30-multi-timeframe-scoring-system.pine`: request replay records `got 4.5`.

These request-expression diagnostics did not account for the output rebound and
should be handled as separate row-level follow-up if they become visible
failures.

## Unrelated Output Losses During The Same Comparison

The fresh branch also includes parity semantic changes not caused by the
TA-length codegen fix. Six rows that produced output in the `7c08371da1` reports
now fail loudly:

- v5 `sources/0289__mihakralj-pinescript__conv.pine`: qualifier mismatch for
  series value passed to simple parameter `kernel`.
- v5 `sources/0728__gorx1-TradingView__Quantile-BasedAdaptiveDetection.pine`:
  qualifier mismatch for series value passed to simple parameter `weights`.
- v6 `sources/0242__MertYakar66-smart-wheel-engine__smart_wheel_signals.pine`:
  series string passed to `alertcondition()` message.
- v6 `sources/0459__KayembaIbrahim-zentechx__indicator.pine`: series string
  passed to `alertcondition()` message.
- v6 `sources/0488__Kiyoraka-TradingView-Script__magic_candle_advanced_features_v5.pine`:
  series string passed to `alertcondition()` message.
- v6 `sources/0575__krram712-stock-agent__elite-v3.pine`: series string passed
  to `alertcondition()` message.

These should not be attributed to TA-length refusal or the SMA expression-source
ordering fix.
