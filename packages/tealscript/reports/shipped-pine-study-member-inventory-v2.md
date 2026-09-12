# Shipped Pine Study Member Inventory V2

## Basis

- Measurement SHA: `9265ad760d`.
- Scope: checked-in Pine source strings shipped by Tealchart and apps/web defaults.
- Included: `packages/tealchart/src/indicators/builtinIndicators.ts` Pine `code` entries, the custom-study-page default, and the in-chart editor default.
- Excluded: `packages/studies/src` public studies are PineJS/TypeScript canvas studies or empty jailbreak entries, not Pine source strings.
- Limit: this measures the Pine source Tealstreet ships in the repo, not Pine scripts users write or persist outside the repo.
- Method: source text is stripped of comments and string literals, then matched against the 861-name official Pine v6 manual snapshot.

## Headline

- Shipped Pine sources: 29.
- Declared versions: 6=28, unspecified=1.
- Official members referenced: 57/861 (6.62%).
- Trace/host-required members used: 0.
- Unsettled TA missing-value policy members used: 10.
- Member exposure split: 8 source-cannot-be-`na`, 2 leading-warm-up-only, 0 interior-hole.
- Unsettled TA call sites checked for source holes: 16.
- Source cannot be `na`: 12 call sites.
- Leading warm-up `na` only: 4 call sites.
- Interior hole possible: 0 call sites.
- Property-only assertion members used: 8.
- Ran-only assertion members used: 3.
- Answer: yes, shipped Pine sources depend on unsettled value behavior.

## Trace Or Host Required Intersections

- none

## Unsettled TA Missing-Value Policy Intersections

- `ta.crossover` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.crossunder` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.dmi` - 1 references across 1 sources (adx)
- `ta.hma` - 1 references across 1 sources (hma)
- `ta.macd` - 2 references across 2 sources (macd, macd-signals)
- `ta.rsi` - 2 references across 2 sources (rsi, rsi-signals)
- `ta.sar` - 1 references across 1 sources (sar)
- `ta.stoch` - 1 references across 1 sources (stochastic)
- `ta.supertrend` - 1 references across 1 sources (supertrend)
- `ta.vwap` - 1 references across 1 sources (vwap)

## Unsettled TA Call-Site `na` Exposure

| Member | Source | Expression | Exposure | Reason |
| --- | --- | --- | --- | --- |
| `ta.hma` | `hma` | `ta.hma(close, length)` | source cannot be na | direct chart close has no interior holes and is not a derived warm-up series |
| `ta.supertrend` | `supertrend` | `ta.supertrend(factor, atrLength)` | source cannot be na | uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source |
| `ta.vwap` | `vwap` | `ta.vwap()` | source cannot be na | default source is direct chart hlc3/volume with no request gaps or conditional-na source |
| `ta.rsi` | `rsi` | `ta.rsi(close, length)` | source cannot be na | direct chart close has no interior holes and is not a derived warm-up series |
| `ta.macd` | `macd` | `ta.macd(close, fastLen, slowLen, signalLen)` | source cannot be na | direct chart close has no interior holes and is not a derived warm-up series |
| `ta.stoch` | `stochastic` | `ta.stoch(close, high, low, kLength)` | source cannot be na | direct chart OHLC has no interior holes and is not a derived warm-up series |
| `ta.dmi` | `adx` | `ta.dmi(length, adxSmoothing)` | source cannot be na | uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source |
| `ta.sar` | `sar` | `ta.sar(start, increment, maximum)` | source cannot be na | uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source |
| `ta.rsi` | `rsi-signals` | `ta.rsi(close, length)` | source cannot be na | direct chart close has no interior holes and is not a derived warm-up series |
| `ta.crossunder` | `rsi-signals` | `ta.crossunder(rsiValue, overbought)` | leading warm-up na only | the first argument is a derived RSI series; its source is direct close, so only leading warm-up na is reachable |
| `ta.crossover` | `rsi-signals` | `ta.crossover(rsiValue, oversold)` | leading warm-up na only | the first argument is a derived RSI series; its source is direct close, so only leading warm-up na is reachable |
| `ta.macd` | `macd-signals` | `ta.macd(close, fastLen, slowLen, signalLen)` | source cannot be na | direct chart close has no interior holes and is not a derived warm-up series |
| `ta.crossover` | `macd-signals` | `ta.crossover(macdLine, signalLine)` | leading warm-up na only | both arguments are derived MACD tuple members; their source is direct close, so only leading warm-up na is reachable |
| `ta.crossunder` | `macd-signals` | `ta.crossunder(macdLine, signalLine)` | leading warm-up na only | both arguments are derived MACD tuple members; their source is direct close, so only leading warm-up na is reachable |
| `ta.crossover` | `ma-cross-signals` | `ta.crossover(fastMA, slowMA)` | source cannot be na | EMA seeds from direct close and does not create leading warm-up holes in the settled vectors |
| `ta.crossunder` | `ma-cross-signals` | `ta.crossunder(fastMA, slowMA)` | source cannot be na | EMA seeds from direct close and does not create leading warm-up holes in the settled vectors |

## Unsettled TA Members Without Call-Site Exposure Classification

- none

## Property-Only Assertion Intersections

- `ta.crossover` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.crossunder` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.dmi` - 1 references across 1 sources (adx)
- `ta.macd` - 2 references across 2 sources (macd, macd-signals)
- `ta.rsi` - 2 references across 2 sources (rsi, rsi-signals)
- `ta.stoch` - 1 references across 1 sources (stochastic)
- `ta.supertrend` - 1 references across 1 sources (supertrend)
- `ta.vwap` - 1 references across 1 sources (vwap)

## Ran-Only Assertion Intersections

- `indicator` - 29 references across 29 sources (sma, ema, wma, hma, supertrend, sma-cross, ema-ribbon, vwap, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, sar, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, obv, volume-sma, defaultChartStudyCode, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `ta.hma` - 1 references across 1 sources (hma)
- `ta.sar` - 1 references across 1 sources (sar)

## Referenced Official Members By Frequency

- `color` - 161 references across 28 sources (sma, ema, wma, hma, supertrend, sma-cross, ema-ribbon, vwap, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, sar, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, obv, volume-sma, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `plot` - 57 references across 29 sources (sma, ema, wma, hma, supertrend, sma-cross, ema-ribbon, vwap, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, sar, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, obv, volume-sma, defaultChartStudyCode, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `input` - 44 references across 25 sources (sma, ema, wma, hma, supertrend, sma-cross, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, sar, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, volume-sma, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `input.int` - 35 references across 24 sources (sma, ema, wma, hma, supertrend, sma-cross, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, volume-sma, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `int` - 35 references across 24 sources (sma, ema, wma, hma, supertrend, sma-cross, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, volume-sma, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `close` - 31 references across 23 sources (sma, ema, wma, hma, sma-cross, ema-ribbon, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, roc, sar, rsi-signals, macd-signals, bollinger-bands, keltner-channels, keltner-filled, volume-sma, defaultChartStudyCode, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `indicator` - 29 references across 29 sources (sma, ema, wma, hma, supertrend, sma-cross, ema-ribbon, vwap, ma-cross-signals, bb-filled, rsi, macd, stochastic, momentum, cci, adx, roc, sar, rsi-signals, macd-signals, bollinger-bands, atr, keltner-channels, donchian-channels, keltner-filled, obv, volume-sma, defaultChartStudyCode, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `color.blue` - 19 references across 13 sources (sma, sma-cross, ema-ribbon, ma-cross-signals, bb-filled, macd, stochastic, adx, macd-signals, bollinger-bands, keltner-channels, donchian-channels, volume-sma)
- `color.red` - 17 references across 15 sources (supertrend, sma-cross, ma-cross-signals, rsi, macd, stochastic, cci, adx, sar, rsi-signals, macd-signals, bollinger-bands, keltner-channels, donchian-channels, volume-sma)
- `true` - 17 references across 17 sources (sma, ema, wma, hma, supertrend, sma-cross, ema-ribbon, vwap, ma-cross-signals, bb-filled, sar, bollinger-bands, keltner-channels, donchian-channels, keltner-filled, defaultChartStudyCode, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `color.green` - 16 references across 14 sources (supertrend, ma-cross-signals, rsi, macd, stochastic, cci, adx, sar, rsi-signals, macd-signals, bollinger-bands, keltner-channels, donchian-channels, volume-sma)
- `hline` - 14 references across 7 sources (rsi, stochastic, momentum, cci, adx, roc, rsi-signals)
- `ta.ema` - 11 references across 6 sources (ema, ema-ribbon, ma-cross-signals, keltner-channels, keltner-filled, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `color.orange` - 8 references across 8 sources (ema, ma-cross-signals, bb-filled, macd, stochastic, macd-signals, atr, keltner-filled)
- `color.teal` - 8 references across 6 sources (hma, momentum, roc, keltner-filled, obv, DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `float` - 8 references across 6 sources (supertrend, bb-filled, sar, bollinger-bands, keltner-channels, keltner-filled)
- `input.float` - 8 references across 6 sources (supertrend, bb-filled, sar, bollinger-bands, keltner-channels, keltner-filled)
- `ta.sma` - 8 references across 6 sources (sma, sma-cross, bb-filled, stochastic, bollinger-bands, volume-sma)
- `color.new` - 7 references across 3 sources (ema-ribbon, bb-filled, keltner-filled)
- `color.gray` - 6 references across 6 sources (rsi, momentum, cci, adx, roc, rsi-signals)
- `plotshape` - 6 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `color.purple` - 5 references across 5 sources (wma, vwap, rsi, cci, rsi-signals)
- `size.tiny` - 4 references across 2 sources (rsi-signals, macd-signals)
- `plot.style_histogram` - 3 references across 3 sources (macd, macd-signals, volume-sma)
- `shape.triangledown` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `shape.triangleup` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.atr` - 3 references across 3 sources (atr, keltner-channels, keltner-filled)
- `ta.crossover` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `ta.crossunder` - 3 references across 3 sources (ma-cross-signals, rsi-signals, macd-signals)
- `fill` - 2 references across 2 sources (bb-filled, keltner-filled)
- `high` - 2 references across 2 sources (stochastic, donchian-channels)
- `location.bottom` - 2 references across 2 sources (rsi-signals, macd-signals)
- `location.top` - 2 references across 2 sources (rsi-signals, macd-signals)
- `low` - 2 references across 2 sources (stochastic, donchian-channels)
- `size.small` - 2 references across 1 sources (ma-cross-signals)
- `ta.macd` - 2 references across 2 sources (macd, macd-signals)
- `ta.rsi` - 2 references across 2 sources (rsi, rsi-signals)
- `ta.stdev` - 2 references across 2 sources (bb-filled, bollinger-bands)
- `volume` - 2 references across 1 sources (volume-sma)
- `input.color` - 1 references across 1 sources (DEFAULT_TEALSCRIPT_EDITOR_CODE)
- `location.abovebar` - 1 references across 1 sources (ma-cross-signals)
- `location.belowbar` - 1 references across 1 sources (ma-cross-signals)
- `open` - 1 references across 1 sources (volume-sma)
- `plot.style_circles` - 1 references across 1 sources (sar)
- `ta.cci` - 1 references across 1 sources (cci)
- `ta.dmi` - 1 references across 1 sources (adx)
- `ta.highest` - 1 references across 1 sources (donchian-channels)
- `ta.hma` - 1 references across 1 sources (hma)
- `ta.lowest` - 1 references across 1 sources (donchian-channels)
- `ta.mom` - 1 references across 1 sources (momentum)
- `ta.obv` - 1 references across 1 sources (obv)
- `ta.roc` - 1 references across 1 sources (roc)
- `ta.sar` - 1 references across 1 sources (sar)
- `ta.stoch` - 1 references across 1 sources (stochastic)
- `ta.supertrend` - 1 references across 1 sources (supertrend)
- `ta.vwap` - 1 references across 1 sources (vwap)
- `ta.wma` - 1 references across 1 sources (wma)

## Shipped Pine Sources

- `sma` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `ema` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `wma` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `hma` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `supertrend` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `sma-cross` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `ema-ribbon` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `vwap` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `ma-cross-signals` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `bb-filled` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `rsi` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `macd` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `stochastic` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `momentum` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `cci` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `adx` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `roc` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `sar` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `rsi-signals` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `macd-signals` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `bollinger-bands` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `atr` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `keltner-channels` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `donchian-channels` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `keltner-filled` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `obv` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `volume-sma` - tealchart_builtin_indicator, version 6, packages/tealchart/src/indicators/builtinIndicators.ts
- `defaultChartStudyCode` - web_custom_study_page_default, version unspecified, apps/web/src/custom-chart-study-page-components/defaultChartStudy.ts
- `DEFAULT_TEALSCRIPT_EDITOR_CODE` - web_in_chart_editor_default, version 6, apps/web/src/atoms/tealscriptEditor.atoms.ts

## Unreferenced Trace/Host Required Members

- `ask`
- `barstate.islastconfirmedhistory`
- `barstate.isnew`
- `bid`
- `dividends.future_amount`
- `dividends.future_ex_date`
- `dividends.future_pay_date`
- `earnings.estimate`
- `earnings.future_eps`
- `earnings.future_period_end_time`
- `earnings.future_revenue`
- `earnings.future_time`
- `footprint.buy_volume`
- `footprint.delta`
- `footprint.get_row_by_price`
- `footprint.poc`
- `footprint.rows`
- `footprint.sell_volume`
- `footprint.total_volume`
- `footprint.vah`
- `footprint.val`
- `library`
- `math.random`
- `request.footprint`
- `request.quandl`
- `request.seed`
- `runtime.error`
- `session.isfirstbar`
- `session.islastbar`
- `strategy.margin_liquidation_price`
- `strategy.risk.max_cons_loss_days`
- `strategy.risk.max_drawdown`
- `strategy.risk.max_intraday_filled_orders`
- `strategy.risk.max_intraday_loss`
- `syminfo.recommendations_buy`
- `syminfo.recommendations_buy_strong`
- `syminfo.recommendations_date`
- `syminfo.recommendations_hold`
- `syminfo.recommendations_sell`
- `syminfo.recommendations_sell_strong`
- `syminfo.recommendations_total`
- `timenow`
- `volume_row.buy_volume`
- `volume_row.delta`
- `volume_row.down_price`
- `volume_row.has_buy_imbalance`
- `volume_row.has_sell_imbalance`
- `volume_row.sell_volume`
- `volume_row.total_volume`
- `volume_row.up_price`

