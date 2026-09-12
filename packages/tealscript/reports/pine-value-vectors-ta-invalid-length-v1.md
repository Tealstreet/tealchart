# Pine Value Vectors TA Invalid Length V1

Source report: `pine-value-vectors-coverage-v116.json`.

Rule: TradingView documents TA lengths as non-zero/positive lengths, and v6 reference signatures type length parameters as `int`/`simple int`. These vectors assert loud rejection for invalid lengths rather than silent coercion.

Citations:

- https://www.tradingview.com/pine-script-docs/faq/functions/
- https://www.tradingview.com/pine-script-reference/v6/

## Summary

| Metric | Count |
| --- | ---: |
| TA length slots covered | 61 |
| Invalid classes per slot | 4 |
| Rejection vectors | 244 |
| Compiled-path matches | 244/244 |
| Public-wrapper matches | 244/244 |
| Unexpected failures | 0 |

Invalid classes: zero, negative, fractional, non-finite.

Excluded: `ta.pivothigh`/`ta.pivotlow` left/right bars. Those parameters are pivot strengths, not documented TA length parameters, so they need separate TradingView evidence before entering this oracle.

## Covered Slots

- `adx.diLength`
- `adx.adxSmoothing`
- `alma`
- `atr`
- `bb`
- `bbw`
- `cci`
- `change`
- `cmo`
- `cog`
- `correlation`
- `covariance`
- `dema`
- `dev`
- `dmi.diLength`
- `dmi.adxSmoothing`
- `ema`
- `falling`
- `highest`
- `highestbars`
- `hma`
- `kc`
- `kcw`
- `kst.roclength1`
- `kst.roclength2`
- `kst.roclength3`
- `kst.roclength4`
- `kst.smalen1`
- `kst.smalen2`
- `kst.smalen3`
- `kst.smalen4`
- `kst.signalLength`
- `linreg`
- `lowest`
- `lowestbars`
- `median`
- `mfi`
- `mode`
- `mom`
- `percentile_linear_interpolation`
- `percentile_nearest_rank`
- `percentrank`
- `range`
- `rci`
- `rising`
- `rma`
- `roc`
- `rsi`
- `sma`
- `smma`
- `stdev`
- `stoch`
- `sum`
- `supertrend.atrPeriod`
- `tema`
- `tsi.short_length`
- `tsi.long_length`
- `variance`
- `vwma`
- `wma`
- `wpr`
