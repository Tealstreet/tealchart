> Superseded by pine-value-vector-member-map-v29.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Member Map V1

## Basis

- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Denominator: 861 names from the committed TradingView Pine v6 reference manual index snapshot.
- Method: each vector case is mapped to the official members used by its Pine source; harness scaffolding such as `indicator()` and `plot()` is counted because it is executed and asserted when the case checks output metadata.
- Limit: member execution is not the same as exhaustive argument/value coverage for every overload.

## Headline

- Vector cases: 378; passing 376; expected-red 2.
- Official members covered by at least one vector case: 667/861 (77.47%).
- Unmapped official members: 194.
- Unmapped but locally verifiable without TradingView traces: 158.
- Unmapped trace/host-required: 36.
- Practical no-trace coverage: 667/825 (80.85%).

## Namespace Counts

| Namespace | Official | Covered | Unmapped |
| --- | ---: | ---: | ---: |
| `(global)` | 59 | 43 | 16 |
| `adjustment` | 3 | 0 | 3 |
| `alert` | 3 | 3 | 0 |
| `array` | 55 | 54 | 1 |
| `backadjustment` | 3 | 0 | 3 |
| `barmerge` | 4 | 4 | 0 |
| `barstate` | 7 | 4 | 3 |
| `box` | 30 | 30 | 0 |
| `chart` | 16 | 16 | 0 |
| `color` | 24 | 22 | 2 |
| `currency` | 56 | 56 | 0 |
| `dayofweek` | 7 | 2 | 5 |
| `display` | 7 | 2 | 5 |
| `dividends` | 5 | 2 | 3 |
| `earnings` | 7 | 2 | 5 |
| `extend` | 4 | 1 | 3 |
| `font` | 2 | 1 | 1 |
| `footprint` | 9 | 0 | 9 |
| `format` | 5 | 1 | 4 |
| `hline` | 3 | 1 | 2 |
| `input` | 13 | 13 | 0 |
| `label` | 43 | 43 | 0 |
| `line` | 28 | 28 | 0 |
| `linefill` | 6 | 6 | 0 |
| `location` | 5 | 2 | 3 |
| `log` | 3 | 3 | 0 |
| `map` | 11 | 11 | 0 |
| `math` | 29 | 25 | 4 |
| `matrix` | 49 | 13 | 36 |
| `order` | 2 | 1 | 1 |
| `plot` | 14 | 1 | 13 |
| `polyline` | 3 | 3 | 0 |
| `position` | 9 | 3 | 6 |
| `request` | 11 | 8 | 3 |
| `runtime` | 1 | 0 | 1 |
| `scale` | 3 | 0 | 3 |
| `session` | 9 | 6 | 3 |
| `settlement_as_close` | 3 | 0 | 3 |
| `shape` | 12 | 1 | 11 |
| `size` | 6 | 3 | 3 |
| `splits` | 2 | 2 | 0 |
| `str` | 18 | 18 | 0 |
| `strategy` | 96 | 86 | 10 |
| `syminfo` | 40 | 32 | 8 |
| `ta` | 67 | 67 | 0 |
| `table` | 23 | 23 | 0 |
| `text` | 10 | 6 | 4 |
| `ticker` | 9 | 2 | 7 |
| `timeframe` | 14 | 14 | 0 |
| `volume_row` | 8 | 0 | 8 |
| `xloc` | 2 | 2 | 0 |
| `yloc` | 3 | 1 | 2 |

## Trace Or Host Required Unmapped Members

- `barstate.islastconfirmedhistory` - live realtime event stream semantics
- `barstate.isnew` - live realtime event stream semantics
- `dividends.future_amount` - provider-backed event or fundamental data
- `dividends.future_ex_date` - provider-backed event or fundamental data
- `dividends.future_pay_date` - provider-backed event or fundamental data
- `earnings.estimate` - provider-backed event or fundamental data
- `earnings.future_eps` - provider-backed event or fundamental data
- `earnings.future_period_end_time` - provider-backed event or fundamental data
- `earnings.future_revenue` - provider-backed event or fundamental data
- `earnings.future_time` - provider-backed event or fundamental data
- `footprint.buy_volume` - provider footprint row data
- `footprint.delta` - provider footprint row data
- `footprint.get_row_by_price` - provider footprint row data
- `footprint.poc` - provider footprint row data
- `footprint.rows` - provider footprint row data
- `footprint.sell_volume` - provider footprint row data
- `footprint.total_volume` - provider footprint row data
- `footprint.vah` - provider footprint row data
- `footprint.val` - provider footprint row data
- `request.quandl` - provider-backed event or fundamental data
- `syminfo.recommendations_buy` - host/exchange symbol metadata
- `syminfo.recommendations_buy_strong` - host/exchange symbol metadata
- `syminfo.recommendations_date` - host/exchange symbol metadata
- `syminfo.recommendations_hold` - host/exchange symbol metadata
- `syminfo.recommendations_sell` - host/exchange symbol metadata
- `syminfo.recommendations_sell_strong` - host/exchange symbol metadata
- `syminfo.recommendations_total` - host/exchange symbol metadata
- `timenow` - wall-clock execution time
- `volume_row.buy_volume` - provider footprint row data
- `volume_row.delta` - provider footprint row data
- `volume_row.down_price` - provider footprint row data
- `volume_row.has_buy_imbalance` - provider footprint row data
- `volume_row.has_sell_imbalance` - provider footprint row data
- `volume_row.sell_volume` - provider footprint row data
- `volume_row.total_volume` - provider footprint row data
- `volume_row.up_price` - provider footprint row data

## Locally Verifiable Unmapped Members

- `adjustment.dividends`
- `adjustment.none`
- `adjustment.splits`
- `array.abs`
- `ask`
- `backadjustment.inherit`
- `backadjustment.off`
- `backadjustment.on`
- `barstate.ishistory`
- `bid`
- `color.from_gradient`
- `color.new`
- `dayofmonth`
- `dayofweek.friday`
- `dayofweek.saturday`
- `dayofweek.sunday`
- `dayofweek.thursday`
- `dayofweek.wednesday`
- `display.none`
- `display.pane`
- `display.pine_screener`
- `display.price_scale`
- `display.status_line`
- `extend.both`
- `extend.left`
- `extend.none`
- `fixnan`
- `font.family_default`
- `format.inherit`
- `format.mintick`
- `format.percent`
- `format.volume`
- `hl2`
- `hlc3`
- `hlcc4`
- `hline.style_dotted`
- `hline.style_solid`
- `last_bar_index`
- `last_bar_time`
- `library`
- `location.absolute`
- `location.bottom`
- `location.top`
- `math.random`
- `math.round_to_mintick`
- `math.rphi`
- `math.tanh`
- `matrix.add_col`
- `matrix.add_row`
- `matrix.col`
- `matrix.concat`
- `matrix.copy`
- `matrix.diff`
- `matrix.eigenvalues`
- `matrix.eigenvectors`
- `matrix.inv`
- `matrix.is_antidiagonal`
- `matrix.is_antisymmetric`
- `matrix.is_binary`
- `matrix.is_diagonal`
- `matrix.is_identity`
- `matrix.is_square`
- `matrix.is_stochastic`
- `matrix.is_symmetric`
- `matrix.is_triangular`
- `matrix.is_zero`
- `matrix.kron`
- `matrix.median`
- `matrix.mode`
- `matrix.mult`
- `matrix.pinv`
- `matrix.pow`
- `matrix.rank`
- `matrix.remove_col`
- `matrix.remove_row`
- `matrix.reshape`
- `matrix.reverse`
- `matrix.row`
- `matrix.submatrix`
- `matrix.sum`
- `matrix.swap_columns`
- `matrix.swap_rows`
- `matrix.transpose`
- `max_bars_back`
- `ohlc4`
- `order.descending`
- `plot.linestyle_dashed`
- `plot.linestyle_dotted`
- `plot.linestyle_solid`
- `plot.style_area`
- `plot.style_areabr`
- `plot.style_circles`
- `plot.style_columns`
- `plot.style_cross`
- `plot.style_histogram`
- `plot.style_line`
- `plot.style_linebr`
- `plot.style_stepline_diamond`
- `plot.style_steplinebr`
- `position.bottom_center`
- `position.bottom_right`
- `position.middle_left`
- `position.middle_right`
- `position.top_center`
- `position.top_left`
- `request.footprint`
- `request.seed`
- `runtime.error`
- `scale.left`
- `scale.none`
- `scale.right`
- `session.isfirstbar`
- `session.islastbar`
- `session.regular`
- `settlement_as_close.inherit`
- `settlement_as_close.off`
- `settlement_as_close.on`
- `shape.arrowdown`
- `shape.arrowup`
- `shape.circle`
- `shape.cross`
- `shape.diamond`
- `shape.flag`
- `shape.labeldown`
- `shape.labelup`
- `shape.square`
- `shape.triangledown`
- `shape.xcross`
- `size.auto`
- `size.normal`
- `size.tiny`
- `strategy.closedtrades.first_index`
- `strategy.closedtrades.max_drawdown_percent`
- `strategy.closedtrades.max_runup_percent`
- `strategy.margin_liquidation_price`
- `strategy.opentrades.max_drawdown_percent`
- `strategy.opentrades.max_runup_percent`
- `strategy.risk.max_cons_loss_days`
- `strategy.risk.max_drawdown`
- `strategy.risk.max_intraday_filled_orders`
- `strategy.risk.max_intraday_loss`
- `syminfo.minmove`
- `text.align_center`
- `text.format_italic`
- `text.format_none`
- `text.wrap_none`
- `ticker.heikinashi`
- `ticker.inherit`
- `ticker.kagi`
- `ticker.linebreak`
- `ticker.new`
- `ticker.pointfigure`
- `ticker.renko`
- `time_close`
- `time_tradingday`
- `weekofyear`
- `yloc.abovebar`
- `yloc.belowbar`

## Expected-Red Cases

- `array.distribution-values`
- `strategy.calc-on-order-fills-values`

## Case Member Map

- `ta.sma`: `close`, `indicator`, `plot`, `ta.sma`
- `ta.ema`: `close`, `indicator`, `plot`, `ta.ema`
- `ta.dema`: `close`, `indicator`, `plot`
- `ta.tema`: `close`, `indicator`, `plot`
- `ta.hma`: `close`, `indicator`, `plot`, `ta.hma`
- `ta.tsi`: `close`, `indicator`, `plot`, `ta.tsi`
- `ta.rma`: `close`, `indicator`, `plot`, `ta.rma`
- `ta.smma`: `close`, `indicator`, `plot`
- `ta.rsi`: `close`, `indicator`, `plot`, `ta.rsi`
- `ta.stdev`: `close`, `indicator`, `plot`, `ta.stdev`
- `ta.variance`: `close`, `indicator`, `plot`, `ta.variance`
- `ta.atr`: `indicator`, `plot`, `ta.atr`
- `ta.wma`: `close`, `indicator`, `plot`, `ta.wma`
- `ta.dev`: `close`, `indicator`, `plot`, `ta.dev`
- `ta.highest`: `high`, `indicator`, `plot`, `ta.highest`
- `ta.lowest`: `indicator`, `low`, `plot`, `ta.lowest`
- `ta.vwma`: `close`, `indicator`, `plot`, `ta.vwma`
- `ta.cum`: `close`, `indicator`, `plot`, `ta.cum`
- `ta.change`: `close`, `indicator`, `plot`, `ta.change`
- `ta.barssince`: `close`, `indicator`, `plot`, `ta.barssince`
- `ta.valuewhen`: `close`, `indicator`, `plot`, `ta.valuewhen`
- `ta.crossover`: `close`, `indicator`, `plot`, `ta.crossover`
- `ta.crossunder`: `close`, `indicator`, `plot`, `ta.crossunder`
- `ta.cross`: `close`, `indicator`, `plot`, `ta.cross`
- `ta.rising`: `close`, `indicator`, `plot`, `ta.rising`
- `ta.falling`: `close`, `indicator`, `plot`, `ta.falling`
- `ta.max`: `close`, `indicator`, `plot`, `ta.max`
- `ta.min`: `close`, `indicator`, `plot`, `ta.min`
- `ta.cci`: `close`, `indicator`, `plot`, `ta.cci`
- `ta.wpr`: `indicator`, `plot`, `ta.wpr`
- `hostile.wpr.zero-range`: `indicator`, `plot`, `ta.wpr`
- `ta.pivot_point_levels.size`: `array.size`, `indicator`, `plot`, `ta.pivot_point_levels`
- `ta.bb`: `close`, `indicator`, `plot`, `ta.bb`
- `hostile.bb.middle-na`: `close`, `indicator`, `plot`, `ta.bb`
- `ta.bbw`: `close`, `indicator`, `plot`, `ta.bbw`
- `hostile.bbw.flat`: `close`, `indicator`, `plot`, `ta.bbw`
- `ta.median`: `close`, `indicator`, `plot`, `ta.median`
- `hostile.median.middle-na`: `close`, `indicator`, `plot`, `ta.median`
- `hostile.median.flat`: `close`, `indicator`, `plot`, `ta.median`
- `ta.linreg`: `close`, `indicator`, `plot`, `ta.linreg`
- `hostile.linreg.middle-na`: `close`, `indicator`, `plot`, `ta.linreg`
- `hostile.linreg.flat`: `close`, `indicator`, `plot`, `ta.linreg`
- `ta.alma`: `close`, `indicator`, `plot`, `ta.alma`
- `ta.alma.explicit-floor`: `close`, `indicator`, `plot`, `ta.alma`, `true`
- `ta.macd`: `close`, `indicator`, `line`, `plot`, `ta.macd`
- `hostile.macd.middle-na`: `close`, `indicator`, `line`, `plot`, `ta.macd`
- `ta.kc`: `close`, `indicator`, `plot`, `ta.kc`
- `hostile.kc.middle-na`: `close`, `indicator`, `plot`, `ta.kc`
- `ta.kcw`: `close`, `indicator`, `plot`, `ta.kcw`
- `ta.stoch`: `close`, `high`, `indicator`, `low`, `plot`, `ta.stoch`
- `hostile.stoch.zero-range`: `close`, `high`, `indicator`, `low`, `plot`, `ta.stoch`
- `ta.obv`: `indicator`, `plot`, `ta.obv`
- `hostile.obv.middle-na`: `indicator`, `plot`, `ta.obv`
- `ta.cmo`: `close`, `indicator`, `plot`, `ta.cmo`
- `hostile.cmo.middle-na`: `close`, `indicator`, `plot`, `ta.cmo`
- `ta.mfi`: `close`, `indicator`, `plot`, `ta.mfi`
- `hostile.mfi.middle-na`: `close`, `indicator`, `plot`, `ta.mfi`
- `ta.wad`: `indicator`, `plot`, `ta.wad`
- `hostile.wad.middle-na`: `indicator`, `plot`, `ta.wad`
- `ta.iii`: `indicator`, `plot`, `ta.iii`
- `ta.nvi`: `indicator`, `plot`, `ta.nvi`
- `ta.pvi`: `indicator`, `plot`, `ta.pvi`
- `ta.pvt`: `indicator`, `plot`, `ta.pvt`
- `ta.accdist`: `indicator`, `plot`, `ta.accdist`
- `ta.wvad`: `indicator`, `plot`, `ta.wvad`
- `ta.cog`: `close`, `indicator`, `plot`, `ta.cog`
- `ta.percentrank`: `close`, `indicator`, `plot`, `ta.percentrank`
- `ta.mode`: `close`, `indicator`, `plot`, `ta.mode`
- `ta.rci`: `close`, `indicator`, `plot`, `ta.rci`
- `ta.sum`: `close`, `indicator`, `plot`
- `hostile.sum.middle-na`: `close`, `indicator`, `plot`
- `tradingview-ta.changePercent.v7`: `close`, `indicator`, `plot`
- `tradingview-ta.aroon.v7`: `indicator`, `plot`
- `tradingview-ta.donchian.v7`: `indicator`, `plot`
- `tradingview-ta.highestSince.v7`: `close`, `high`, `indicator`, `plot`
- `tradingview-ta.lowestSince.v7`: `close`, `indicator`, `low`, `plot`
- `tradingview-ta.trima.v7`: `close`, `indicator`, `plot`
- `tradingview-ta.cagr.v1`: `close`, `indicator`, `plot`, `time`
- `tradingview-ta.er.v12`: `close`, `indicator`, `plot`
- `tradingview-ta.kama.v12`: `close`, `indicator`, `plot`
- `tradingview-ta.chandelier.v12`: `indicator`, `plot`
- `tradingview-ta.ppo.v12`: `close`, `indicator`, `line`, `plot`
- `tradingview-ta.trix.v12`: `close`, `indicator`, `line`, `plot`
- `tradingview-ta.ulcerIndex.v12`: `close`, `indicator`, `plot`
- `math.abs`: `close`, `indicator`, `math.abs`, `plot`
- `math.max`: `close`, `indicator`, `math.max`, `open`, `plot`
- `math.min`: `close`, `indicator`, `math.min`, `open`, `plot`
- `math.sign`: `close`, `indicator`, `math.sign`, `plot`
- `math.sqrt`: `close`, `indicator`, `math.abs`, `math.sqrt`, `plot`
- `math.pow`: `close`, `indicator`, `math.abs`, `math.pow`, `plot`
- `math.avg`: `high`, `indicator`, `low`, `math.avg`, `open`, `plot`
- `math.round`: `close`, `indicator`, `math.round`, `plot`
- `math.trunc`: `close`, `indicator`, `plot`
- `math.floor`: `close`, `indicator`, `math.floor`, `plot`
- `math.ceil`: `close`, `indicator`, `math.ceil`, `plot`
- `math.log`: `close`, `indicator`, `math.abs`, `math.log`, `plot`
- `math.log10`: `close`, `indicator`, `math.abs`, `math.log10`, `plot`
- `math.exp`: `close`, `indicator`, `math.exp`, `plot`
- `math.sin`: `close`, `indicator`, `math.sin`, `plot`
- `math.cos`: `close`, `indicator`, `math.cos`, `plot`
- `math.tan`: `close`, `indicator`, `math.tan`, `plot`
- `math.asin`: `close`, `indicator`, `math.asin`, `math.max`, `math.min`, `plot`
- `math.acos`: `close`, `indicator`, `math.acos`, `math.max`, `math.min`, `plot`
- `math.atan`: `close`, `indicator`, `math.atan`, `plot`
- `math.toradians`: `close`, `indicator`, `math.toradians`, `plot`
- `math.todegrees`: `close`, `indicator`, `math.todegrees`, `plot`
- `math.sum`: `close`, `indicator`, `math.sum`, `plot`
- `math.clamp`: `close`, `indicator`, `plot`
- `math.pi`: `indicator`, `math.pi`, `plot`
- `math.e`: `indicator`, `math.e`, `plot`
- `math.phi`: `indicator`, `math.phi`, `plot`
- `str.length`: `indicator`, `plot`, `str.length`
- `str.pos`: `indicator`, `plot`, `str.pos`
- `str.tonumber`: `indicator`, `plot`, `str.tonumber`
- `str.contains`: `indicator`, `plot`, `str.contains`
- `str.startswith`: `indicator`, `plot`, `str.startswith`
- `str.endswith`: `indicator`, `plot`, `str.endswith`
- `str.format`: `indicator`, `plot`, `str.format`
- `str.format_time`: `indicator`, `plot`, `str.format_time`, `timestamp`
- `str.lower`: `indicator`, `plot`, `str.lower`
- `str.match`: `indicator`, `plot`, `str.match`
- `str.repeat`: `indicator`, `plot`, `str.repeat`
- `str.replace`: `indicator`, `plot`, `str.replace`
- `str.replace_all`: `indicator`, `plot`, `str.replace_all`
- `str.split`: `array.size`, `indicator`, `plot`, `str.split`
- `str.substring`: `indicator`, `plot`, `str.substring`
- `str.tostring`: `indicator`, `plot`, `str.tostring`
- `str.trim`: `indicator`, `plot`, `str.trim`
- `str.upper`: `indicator`, `plot`, `str.upper`
- `array.persistent-size`: `array.new_float`, `array.push`, `array.size`, `close`, `float`, `indicator`, `plot`
- `array.persistent-get`: `array.get`, `array.new_float`, `array.push`, `close`, `float`, `indicator`, `plot`
- `array.mutation-accessors`: `array.clear`, `array.copy`, `array.first`, `array.from`, `array.get`, `array.insert`, `array.last`, `array.new_float`, `array.new_int`, `array.pop`, `array.push`, `array.remove`, `array.set`, `array.shift`, `array.size`, `array.unshift`, `indicator`, `plot`
- `array.statistics`: `array.avg`, `array.from`, `array.max`, `array.median`, `array.min`, `array.mode`, `array.range`, `array.sum`, `indicator`, `plot`
- `array.search-sort-values`: `array.from`, `array.get`, `array.includes`, `array.indexof`, `array.lastindexof`, `array.reverse`, `array.sort`, `array.sort_indices`, `indicator`, `order.ascending`, `plot`
- `array.slice-reverse-join-values`: `array.from`, `array.get`, `array.join`, `array.reverse`, `array.size`, `array.slice`, `indicator`, `plot`
- `array.advanced-search-fill-values`: `array.binary_search`, `array.binary_search_leftmost`, `array.binary_search_rightmost`, `array.concat`, `array.fill`, `array.from`, `array.get`, `array.new_float`, `array.size`, `fill`, `indicator`, `plot`
- `array.bool-and-constructor-values`: `array.every`, `array.new_bool`, `array.new_box`, `array.new_color`, `array.new_label`, `array.new_line`, `array.new_linefill`, `array.new_string`, `array.new_table`, `array.set`, `array.size`, `array.some`, `color`, `color.red`, `false`, `indicator`, `plot`, `true`
- `array.distribution-values`: `array.covariance`, `array.from`, `array.percentile_linear_interpolation`, `array.percentile_nearest_rank`, `array.percentrank`, `array.standardize`, `array.stdev`, `array.variance`, `indicator`, `plot`
- `matrix.basic-aggregates`: `float`, `indicator`, `matrix.avg`, `matrix.columns`, `matrix.det`, `matrix.elements_count`, `matrix.get`, `matrix.max`, `matrix.min`, `matrix.new`, `matrix.rows`, `matrix.set`, `matrix.trace`, `plot`
- `matrix.fill-sort-values`: `fill`, `float`, `indicator`, `matrix.fill`, `matrix.get`, `matrix.new`, `matrix.set`, `matrix.sort`, `order.ascending`, `plot`
- `map.mutation-accessors`: `array.size`, `float`, `indicator`, `map.clear`, `map.contains`, `map.copy`, `map.get`, `map.keys`, `map.new`, `map.put`, `map.put_all`, `map.remove`, `map.size`, `map.values`, `nz`, `plot`, `string`
- `visual.plot-hline-fill-metadata-values`: `close`, `color`, `color.rgb`, `display.data_window`, `false`, `fill`, `format.price`, `hline`, `hline.style_dashed`, `indicator`, `open`, `plot`, `plot.style_stepline`, `true`
- `visual.marker-candle-metadata-values`: `close`, `color`, `color.rgb`, `high`, `indicator`, `location.abovebar`, `location.belowbar`, `low`, `open`, `plotarrow`, `plotbar`, `plotcandle`, `plotchar`, `plotshape`, `shape.triangleup`, `size.large`, `true`
- `visual.bgcolor-barcolor-metadata-values`: `barcolor`, `bgcolor`, `close`, `color`, `color.rgb`, `display.all`, `false`, `indicator`, `plot`, `true`
- `output.alertcondition-values`: `alertcondition`, `close`, `indicator`, `plot`
- `output.alert-frequency-values`: `alert`, `alert.freq_all`, `alert.freq_once_per_bar`, `alert.freq_once_per_bar_close`, `bar_index`, `close`, `indicator`, `plot`, `str.tostring`
- `output.log-format-values`: `bar_index`, `close`, `high`, `indicator`, `log.error`, `log.info`, `log.warning`, `plot`
- `drawing.line-getters`: `bar_index`, `close`, `indicator`, `line`, `line.get_price`, `line.get_x1`, `line.get_x2`, `line.get_y1`, `line.get_y2`, `line.new`, `plot`, `true`
- `drawing.line-mutation-copy-values`: `indicator`, `line`, `line.copy`, `line.get_x1`, `line.get_x2`, `line.get_y1`, `line.get_y2`, `line.new`, `line.set_x1`, `line.set_x2`, `line.set_xy1`, `line.set_xy2`, `line.set_y1`, `line.set_y2`, `plot`, `true`
- `drawing.line-style-payload-values`: `array.size`, `bar_index`, `color`, `color.rgb`, `extend.right`, `indicator`, `line`, `line.all`, `line.new`, `line.set_color`, `line.set_extend`, `line.set_style`, `line.set_width`, `line.style_dotted`, `na`, `plot`, `true`
- `drawing.line-style-getter-values`: `color`, `color.b`, `color.g`, `color.r`, `color.rgb`, `extend.right`, `indicator`, `line`, `line.new`, `line.style_dotted`, `plot`, `true`
- `drawing.box-getters`: `bar_index`, `box`, `box.get_bottom`, `box.get_left`, `box.get_right`, `box.get_top`, `box.new`, `high`, `indicator`, `low`, `plot`, `true`
- `drawing.box-mutation-copy-values`: `box`, `box.copy`, `box.get_bottom`, `box.get_left`, `box.get_right`, `box.get_top`, `box.new`, `box.set_bottom`, `box.set_left`, `box.set_lefttop`, `box.set_right`, `box.set_rightbottom`, `box.set_top`, `indicator`, `plot`, `true`
- `drawing.label-getters`: `bar_index`, `close`, `indicator`, `label`, `label.get_text`, `label.get_x`, `label.get_y`, `label.new`, `plot`, `true`
- `drawing.label-mutation-copy-values`: `indicator`, `label`, `label.copy`, `label.get_text`, `label.get_x`, `label.get_y`, `label.new`, `label.set_text`, `label.set_x`, `label.set_xy`, `label.set_y`, `plot`, `true`
- `drawing.label-style-metadata-values`: `bar_index`, `chart.point.from_index`, `color`, `color.b`, `color.g`, `color.r`, `color.rgb`, `indicator`, `label`, `label.get_x`, `label.get_y`, `label.new`, `label.set_color`, `label.set_point`, `label.set_size`, `label.set_style`, `label.set_textcolor`, `label.set_tooltip`, `label.set_xloc`, `label.set_yloc`, `label.style_label_up`, `plot`, `size.large`, `true`, `xloc.bar_index`, `yloc.price`
- `drawing.linefill-getters`: `bar_index`, `color`, `color.blue`, `fill`, `high`, `indicator`, `line`, `line.new`, `linefill`, `linefill.get_line1`, `linefill.get_line2`, `linefill.new`, `low`, `plot`, `true`
- `drawing.linefill-color-copy-values`: `color`, `color.b`, `color.g`, `color.r`, `color.rgb`, `fill`, `indicator`, `line`, `line.new`, `linefill`, `linefill.get_line1`, `linefill.get_line2`, `linefill.new`, `linefill.set_color`, `plot`, `true`
- `drawing.delete-all-values`: `array.size`, `bar_index`, `box`, `box.all`, `box.delete`, `box.new`, `color`, `color.rgb`, `indicator`, `label`, `label.all`, `label.delete`, `label.new`, `line`, `line.all`, `line.delete`, `line.new`, `linefill`, `linefill.all`, `linefill.delete`, `linefill.new`, `na`, `plot`, `true`
- `drawing.box-style-text-values`: `box`, `box.new`, `box.set_bgcolor`, `box.set_border_color`, `box.set_text`, `box.set_text_halign`, `box.set_text_valign`, `color`, `color.b`, `color.g`, `color.r`, `color.rgb`, `indicator`, `plot`, `text.align_bottom`, `text.align_right`, `true`
- `drawing.table-payload-values`: `array.size`, `bar_index`, `barstate.islast`, `bgcolor`, `color`, `color.rgb`, `indicator`, `plot`, `position.bottom_left`, `position.middle_center`, `position.top_right`, `size.large`, `table`, `table.all`, `table.cell`, `table.cell_set_bgcolor`, `table.cell_set_text`, `table.cell_set_text_color`, `table.delete`, `table.merge_cells`, `table.new`, `table.set_bgcolor`, `table.set_border_color`, `table.set_border_width`, `table.set_frame_color`, `table.set_frame_width`, `table.set_position`, `text.align_bottom`, `text.align_right`, `true`
- `drawing.table-cell-setter-clear-values`: `array.size`, `barstate.islast`, `font.family_monospace`, `indicator`, `plot`, `position.top_right`, `size.small`, `table`, `table.all`, `table.cell`, `table.cell_set_height`, `table.cell_set_text_font_family`, `table.cell_set_text_formatting`, `table.cell_set_text_halign`, `table.cell_set_text_size`, `table.cell_set_text_valign`, `table.cell_set_tooltip`, `table.cell_set_width`, `table.clear`, `table.new`, `text.align_left`, `text.align_top`, `text.format_bold`, `true`
- `drawing.polyline-payload-values`: `array.from`, `array.size`, `bar_index`, `chart.point.from_index`, `color`, `color.rgb`, `indicator`, `line`, `line.style_dashed`, `na`, `plot`, `polyline.all`, `polyline.delete`, `polyline.new`, `true`, `xloc.bar_index`
- `drawing.chart-point-values`: `bar_index`, `chart.point.from_index`, `close`, `indicator`, `plot`, `true`
- `drawing.chart-point-constructor-values`: `bar_index`, `chart.point.copy`, `chart.point.from_time`, `chart.point.new`, `chart.point.now`, `close`, `indicator`, `plot`, `time`, `true`
- `drawing.line-point-style-values`: `array.size`, `bar_index`, `chart.point.from_index`, `indicator`, `line`, `line.all`, `line.new`, `line.set_first_point`, `line.set_second_point`, `line.set_style`, `line.set_xloc`, `line.style_arrow_both`, `line.style_arrow_left`, `line.style_arrow_right`, `line.style_solid`, `na`, `plot`, `time`, `true`, `xloc.bar_time`
- `drawing.box-point-style-values`: `array.size`, `bar_index`, `box`, `box.all`, `box.new`, `box.set_border_style`, `box.set_border_width`, `box.set_bottom_right_point`, `box.set_extend`, `box.set_text_color`, `box.set_text_font_family`, `box.set_text_formatting`, `box.set_text_size`, `box.set_text_wrap`, `box.set_top_left_point`, `box.set_xloc`, `chart.point.from_index`, `color`, `color.rgb`, `extend.right`, `font.family_monospace`, `indicator`, `line`, `line.style_dashed`, `line.style_dotted`, `na`, `plot`, `size.huge`, `text.format_bold`, `text.wrap_auto`, `time`, `true`, `xloc.bar_time`
- `drawing.label-style-constant-values`: `indicator`, `label`, `label.style_arrowdown`, `label.style_arrowup`, `label.style_circle`, `label.style_cross`, `label.style_diamond`, `label.style_flag`, `label.style_label_center`, `label.style_label_down`, `label.style_label_left`, `label.style_label_lower_left`, `label.style_label_lower_right`, `label.style_label_right`, `label.style_label_up`, `label.style_label_upper_left`, `label.style_label_upper_right`, `label.style_none`, `label.style_square`, `label.style_text_outline`, `label.style_triangledown`, `label.style_triangleup`, `label.style_xcross`, `plot`, `true`
- `drawing.label-text-style-values`: `array.size`, `bar_index`, `font.family_monospace`, `indicator`, `label`, `label.all`, `label.new`, `label.set_style`, `label.set_text_font_family`, `label.set_text_formatting`, `label.set_textalign`, `label.style_arrowup`, `na`, `plot`, `text.align_right`, `text.format_bold`, `true`
- `ta.dmi`: `indicator`, `plot`, `ta.dmi`
- `ta.adx`: `indicator`, `plot`
- `ta.supertrend`: `indicator`, `plot`, `ta.supertrend`
- `hostile.supertrend.zero-range`: `indicator`, `plot`, `ta.supertrend`
- `hostile.supertrend.middle-na`: `indicator`, `plot`, `ta.supertrend`
- `ta.kst`: `close`, `indicator`, `line`, `plot`
- `ta.sar`: `indicator`, `plot`, `ta.sar`
- `hostile.sar.flat`: `indicator`, `plot`, `ta.sar`
- `ta.covariance`: `close`, `indicator`, `plot`, `volume`
- `ta.correlation`: `close`, `indicator`, `plot`, `ta.correlation`, `volume`
- `ta.percentile_nearest_rank`: `close`, `indicator`, `plot`, `ta.percentile_nearest_rank`
- `ta.percentile_linear_interpolation`: `close`, `indicator`, `plot`, `ta.percentile_linear_interpolation`
- `ta.pivothigh`: `close`, `indicator`, `plot`, `ta.pivothigh`
- `ta.pivotlow`: `close`, `indicator`, `plot`, `ta.pivotlow`
- `ta.highestbars`: `close`, `indicator`, `plot`, `ta.highestbars`
- `ta.lowestbars`: `close`, `indicator`, `plot`, `ta.lowestbars`
- `ta.range`: `close`, `indicator`, `plot`, `ta.range`
- `ta.mom`: `close`, `indicator`, `plot`, `ta.mom`
- `ta.roc`: `close`, `indicator`, `plot`, `ta.roc`
- `ta.tr`: `indicator`, `plot`, `ta.tr`, `true`
- `ta.vwap`: `close`, `indicator`, `plot`, `ta.vwap`
- `hostile.vwap.middle-na`: `close`, `indicator`, `plot`, `ta.vwap`
- `ta.swma`: `close`, `indicator`, `plot`, `ta.swma`
- `hostile.vwma.middle-na`: `close`, `indicator`, `plot`, `ta.vwma`
- `hostile.sma.length1`: `close`, `indicator`, `plot`, `ta.sma`
- `hostile.sma.overlong`: `close`, `indicator`, `plot`, `ta.sma`
- `hostile.stdev.flat`: `close`, `indicator`, `plot`, `ta.stdev`
- `hostile.range.flat`: `close`, `indicator`, `plot`, `ta.range`
- `hostile.variance.flat`: `close`, `indicator`, `plot`, `ta.variance`
- `hostile.dev.flat`: `close`, `indicator`, `plot`, `ta.dev`
- `hostile.rsi.signed`: `close`, `indicator`, `plot`, `ta.rsi`
- `hostile.rsi.flat`: `close`, `indicator`, `plot`, `ta.rsi`
- `hostile.rma.overlong`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.atr.overlong`: `indicator`, `plot`, `ta.atr`
- `hostile.atr.middle-na`: `indicator`, `plot`, `ta.atr`
- `hostile.wvad.zero-range`: `indicator`, `plot`, `ta.wvad`
- `hostile.ema.long`: `close`, `indicator`, `plot`, `ta.ema`
- `hostile.rma.long`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.max.middle-na`: `close`, `indicator`, `plot`, `ta.max`
- `hostile.sma.middle-na`: `close`, `indicator`, `plot`, `ta.sma`
- `hostile.ema.middle-na`: `close`, `indicator`, `plot`, `ta.ema`
- `hostile.rma.middle-na`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.sma.multi-middle-na`: `close`, `indicator`, `plot`, `ta.sma`
- `hostile.ema.multi-middle-na`: `close`, `indicator`, `plot`, `ta.ema`
- `hostile.rma.multi-middle-na`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.stdev.multi-middle-na`: `close`, `indicator`, `plot`, `ta.stdev`
- `hostile.highest.multi-middle-na`: `high`, `indicator`, `plot`, `ta.highest`
- `hostile.range.multi-middle-na`: `close`, `indicator`, `plot`, `ta.range`
- `hostile.barssince.multi-middle-na`: `close`, `indicator`, `plot`, `ta.barssince`
- `hostile.crossover.multi-middle-na`: `close`, `indicator`, `plot`, `ta.crossover`
- `hostile.pivothigh.multi-middle-na`: `close`, `indicator`, `plot`, `ta.pivothigh`
- `hostile.pivotlow.multi-middle-na`: `close`, `indicator`, `plot`, `ta.pivotlow`
- `hostile.rsi.multi-middle-na`: `close`, `indicator`, `plot`, `ta.rsi`
- `hostile.atr.multi-middle-na`: `indicator`, `plot`, `ta.atr`
- `hostile.valuewhen.multi-middle-na`: `close`, `indicator`, `plot`, `ta.valuewhen`
- `hostile.crossunder.multi-middle-na`: `close`, `indicator`, `plot`, `ta.crossunder`
- `hostile.dmi.multi-middle-na`: `indicator`, `plot`, `ta.dmi`
- `hostile.tr.multi-middle-na`: `indicator`, `plot`, `ta.tr`, `true`
- `hostile.rma.synthetic.multi-middle-na`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.highest.length1-plateau`: `close`, `indicator`, `plot`, `ta.highest`
- `hostile.lowest.length1-plateau`: `close`, `indicator`, `plot`, `ta.lowest`
- `hostile.range.length1-plateau`: `close`, `indicator`, `plot`, `ta.range`
- `hostile.highestbars.plateau`: `close`, `indicator`, `plot`, `ta.highestbars`
- `hostile.lowestbars.plateau`: `close`, `indicator`, `plot`, `ta.lowestbars`
- `hostile.pivothigh.plateau`: `close`, `indicator`, `plot`, `ta.pivothigh`
- `hostile.pivotlow.plateau`: `close`, `indicator`, `plot`, `ta.pivotlow`
- `hostile.ema.long-middle-na`: `close`, `indicator`, `plot`, `ta.ema`
- `hostile.rma.long-middle-na`: `close`, `indicator`, `plot`, `ta.rma`
- `hostile.wma.middle-na`: `close`, `indicator`, `plot`, `ta.wma`
- `hostile.stdev.middle-na`: `close`, `indicator`, `plot`, `ta.stdev`
- `hostile.variance.middle-na`: `close`, `indicator`, `plot`, `ta.variance`
- `hostile.dev.middle-na`: `close`, `indicator`, `plot`, `ta.dev`
- `hostile.cci.flat`: `close`, `indicator`, `plot`, `ta.cci`
- `hostile.cog.flat`: `close`, `indicator`, `plot`, `ta.cog`
- `hostile.correlation.flat`: `close`, `indicator`, `plot`, `ta.correlation`, `volume`
- `hostile.correlation.middle-na`: `close`, `indicator`, `plot`, `ta.correlation`, `volume`
- `hostile.covariance.middle-na`: `close`, `indicator`, `plot`, `volume`
- `hostile.percentile_nearest_rank.middle-na`: `close`, `indicator`, `plot`, `ta.percentile_nearest_rank`
- `hostile.percentile_linear_interpolation.middle-na`: `close`, `indicator`, `plot`, `ta.percentile_linear_interpolation`
- `hostile.highest.middle-na`: `high`, `indicator`, `plot`, `ta.highest`
- `hostile.lowest.middle-na`: `indicator`, `low`, `plot`, `ta.lowest`
- `hostile.highestbars.middle-na`: `close`, `indicator`, `plot`, `ta.highestbars`
- `hostile.lowestbars.middle-na`: `close`, `indicator`, `plot`, `ta.lowestbars`
- `hostile.range.middle-na`: `close`, `indicator`, `plot`, `ta.range`
- `hostile.barssince.middle-na`: `close`, `indicator`, `plot`, `ta.barssince`
- `hostile.valuewhen.middle-na`: `close`, `indicator`, `plot`, `ta.valuewhen`
- `hostile.crossover.middle-na`: `close`, `indicator`, `plot`, `ta.crossover`
- `hostile.crossunder.middle-na`: `close`, `indicator`, `plot`, `ta.crossunder`
- `hostile.cross.middle-na`: `close`, `indicator`, `plot`, `ta.cross`
- `hostile.pivothigh.middle-na`: `close`, `indicator`, `plot`, `ta.pivothigh`
- `hostile.pivotlow.middle-na`: `close`, `indicator`, `plot`, `ta.pivotlow`
- `hostile.barssince.direct-middle-na`: `close`, `indicator`, `plot`, `ta.barssince`
- `hostile.valuewhen.direct-middle-na`: `close`, `indicator`, `plot`, `ta.valuewhen`
- `hostile.mom.middle-na`: `close`, `indicator`, `plot`, `ta.mom`
- `hostile.roc.middle-na`: `close`, `indicator`, `plot`, `ta.roc`
- `hostile.tr.middle-na`: `indicator`, `plot`, `ta.tr`, `true`
- `hostile.swma.middle-na`: `close`, `indicator`, `plot`, `ta.swma`
- `runtime.barstate-historical-flags`: `barstate.isconfirmed`, `barstate.isfirst`, `barstate.islast`, `barstate.isrealtime`, `indicator`, `plot`
- `runtime.input-default-values`: `bool`, `float`, `indicator`, `input`, `input.bool`, `input.float`, `input.int`, `input.source`, `int`, `open`, `plot`, `true`
- `runtime.input-expanded-default-values`: `color`, `color.b`, `color.g`, `color.r`, `color.rgb`, `color.t`, `indicator`, `input`, `input.color`, `input.enum`, `input.price`, `input.session`, `input.string`, `input.symbol`, `input.text_area`, `input.time`, `input.timeframe`, `plot`, `string`, `time`
- `runtime.currency-constants-values`: `currency.AED`, `currency.ARS`, `currency.AUD`, `currency.BDT`, `currency.BHD`, `currency.BRL`, `currency.BTC`, `currency.CAD`, `currency.CHF`, `currency.CLP`, `currency.CNY`, `currency.COP`, `currency.CZK`, `currency.DKK`, `currency.EGP`, `currency.ETH`, `currency.EUR`, `currency.GBP`, `currency.HKD`, `currency.HUF`, `currency.IDR`, `currency.ILS`, `currency.INR`, `currency.ISK`, `currency.JPY`, `currency.KES`, `currency.KRW`, `currency.KWD`, `currency.LKR`, `currency.MAD`, `currency.MXN`, `currency.MYR`, `currency.NGN`, `currency.NOK`, `currency.NONE`, `currency.NZD`, `currency.PEN`, `currency.PHP`, `currency.PKR`, `currency.PLN`, `currency.QAR`, `currency.RON`, `currency.RSD`, `currency.RUB`, `currency.SAR`, `currency.SEK`, `currency.SGD`, `currency.THB`, `currency.TND`, `currency.TRY`, `currency.TWD`, `currency.USD`, `currency.USDT`, `currency.VES`, `currency.VND`, `currency.ZAR`, `indicator`, `plot`
- `runtime.color-constants-values`: `color`, `color.aqua`, `color.b`, `color.black`, `color.blue`, `color.fuchsia`, `color.g`, `color.gray`, `color.green`, `color.lime`, `color.maroon`, `color.navy`, `color.olive`, `color.orange`, `color.purple`, `color.r`, `color.red`, `color.silver`, `color.teal`, `color.white`, `color.yellow`, `indicator`, `plot`
- `runtime.syminfo-values`: `indicator`, `plot`, `syminfo.basecurrency`, `syminfo.currency`, `syminfo.mintick`, `syminfo.pricescale`, `syminfo.ticker`
- `runtime.syminfo-metadata-values`: `indicator`, `plot`, `syminfo.country`, `syminfo.description`, `syminfo.mincontract`, `syminfo.pointvalue`, `syminfo.prefix`, `syminfo.root`, `syminfo.sector`, `syminfo.session`, `syminfo.tickerid`, `syminfo.timezone`, `syminfo.type`, `syminfo.volumetype`
- `runtime.syminfo-provider-metadata-values`: `indicator`, `plot`, `syminfo.current_contract`, `syminfo.employees`, `syminfo.expiration_date`, `syminfo.industry`, `syminfo.isin`, `syminfo.main_tickerid`, `syminfo.shareholders`, `syminfo.shares_outstanding_float`, `syminfo.shares_outstanding_total`, `syminfo.target_price_average`, `syminfo.target_price_date`, `syminfo.target_price_estimates`, `syminfo.target_price_high`, `syminfo.target_price_low`, `syminfo.target_price_median`
- `runtime.chart-context-values`: `chart.bg_color`, `chart.fg_color`, `chart.is_heikinashi`, `chart.is_kagi`, `chart.is_linebreak`, `chart.is_pnf`, `chart.is_range`, `chart.is_renko`, `chart.is_standard`, `chart.left_visible_bar_time`, `chart.right_visible_bar_time`, `color`, `color.b`, `color.g`, `color.r`, `indicator`, `plot`
- `runtime.timeframe-values`: `indicator`, `plot`, `timeframe.in_seconds`, `timeframe.isintraday`, `timeframe.isminutes`, `timeframe.main_period`, `timeframe.multiplier`, `timeframe.period`
- `runtime.timeframe-conversion-change-values`: `indicator`, `plot`, `timeframe.change`, `timeframe.from_seconds`, `timeframe.isdaily`, `timeframe.isdwm`, `timeframe.isminutes`, `timeframe.ismonthly`, `timeframe.isseconds`, `timeframe.isticks`, `timeframe.isweekly`, `timeframe.multiplier`, `timeframe.period`
- `runtime.ticker-transform-values`: `indicator`, `plot`, `session.extended`, `str.contains`, `syminfo.tickerid`, `ticker.modify`, `ticker.standard`
- `runtime.calendar-fields`: `dayofweek`, `dayofweek.monday`, `dayofweek.tuesday`, `hour`, `indicator`, `minute`, `month`, `plot`, `second`, `year`
- `runtime.timestamp-and-time-values`: `indicator`, `na`, `plot`, `time`, `timeframe.period`, `timestamp`
- `runtime.session-state-values`: `indicator`, `plot`, `session.isfirstbar_regular`, `session.islastbar_regular`, `session.ismarket`, `session.ispostmarket`, `session.ispremarket`
- `var.persistence`: `close`, `float`, `indicator`, `plot`
- `varip.persistence`: `close`, `float`, `indicator`, `plot`
- `language.local-history`: `close`, `indicator`, `open`, `plot`
- `language.expression-history`: `close`, `indicator`, `open`, `plot`
- `language.dynamic-history-offset`: `close`, `indicator`, `plot`
- `language.function-result-history`: `close`, `indicator`, `plot`
- `language.function-result-history-call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `language.nested-expression-history-offset2`: `close`, `indicator`, `open`, `plot`
- `language.tuple-destructured-history`: `close`, `indicator`, `open`, `plot`
- `language.if-expression-history`: `close`, `indicator`, `open`, `plot`
- `language.switch-expression-history`: `close`, `high`, `indicator`, `open`, `plot`
- `language.for-loop-history-sum`: `close`, `float`, `indicator`, `plot`
- `language.for-loop-break-history-search`: `close`, `float`, `indicator`, `na`, `plot`
- `language.for-loop-continue-history-sum`: `close`, `float`, `indicator`, `nz`, `plot`
- `language.while-loop-history-sum`: `close`, `float`, `indicator`, `int`, `plot`
- `language.while-loop-break-history-search`: `close`, `float`, `indicator`, `int`, `na`, `plot`
- `language.nested-var-call-sites`: `close`, `float`, `indicator`, `na`, `open`, `plot`
- `language.udf-var-loop-call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udt-history-field-read`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udt-method-resolution`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udt-field-var-persistence`: `close`, `float`, `indicator`, `plot`
- `language.method-result-history`: `close`, `float`, `indicator`, `open`, `plot`
- `language.method-local-var-call-sites`: `close`, `float`, `high`, `indicator`, `open`, `plot`
- `language.udt-method-result-field-history`: `close`, `float`, `indicator`, `open`, `plot`
- `language.bool-history-missing-is-false`: `close`, `indicator`, `open`, `plot`
- `language.if-bool-no-branch-is-false`: `close`, `indicator`, `open`, `plot`
- `language.if-number-no-branch-is-na`: `close`, `indicator`, `plot`
- `language.float-accepts-int-expression`: `bar_index`, `float`, `indicator`, `int`, `plot`
- `language.for-loop-return-expression`: `close`, `indicator`, `plot`
- `language.while-loop-return-expression`: `close`, `indicator`, `int`, `plot`
- `language.switch-local-var-result`: `close`, `high`, `indicator`, `low`, `open`, `plot`
- `language.udf-var-first-execution-per-branch`: `close`, `float`, `indicator`, `na`, `plot`
- `language.var-initializes-once`: `close`, `float`, `indicator`, `plot`
- `language.udf-var-initializes-per-call-site`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udf-param-shadows-builtin`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udf-param-history-call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udf-local-shadows-outer`: `close`, `indicator`, `plot`
- `language.udf-local-history-call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `language.udf-local-shadow-history`: `close`, `high`, `indicator`, `plot`
- `language.udf-varip-call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `language.conditional-var-first-execution`: `close`, `float`, `indicator`, `na`, `plot`
- `language.reassigned-local-history`: `close`, `indicator`, `open`, `plot`
- `language.ternary-expression-history`: `close`, `indicator`, `open`, `plot`
- `language.array-method-result-history`: `array.new_float`, `close`, `float`, `indicator`, `plot`
- `language.udf-returned-udt-field-history`: `close`, `float`, `indicator`, `plot`
- `language.or-short-circuit-skips-error`: `array.get`, `array.new_float`, `close`, `indicator`, `plot`
- `language.and-short-circuit-skips-error`: `array.get`, `array.new_float`, `close`, `indicator`, `plot`
- `language.if-branch-skips-error`: `array.get`, `array.new_float`, `close`, `indicator`, `plot`
- `language.switch-branch-skips-error`: `array.get`, `array.new_float`, `close`, `indicator`, `plot`
- `language.reverse-for-loop-sum`: `close`, `float`, `indicator`, `plot`
- `language.tuple-discard-keeps-position`: `close`, `high`, `indicator`, `open`, `plot`
- `language.udf-default-parameter-source`: `close`, `float`, `indicator`, `open`, `plot`
- `language.method-param-shadows-builtin`: `close`, `float`, `high`, `indicator`, `open`, `plot`
- `language.library-local-state-call-sites`: `close`, `high`, `indicator`, `low`, `plot`
- `language.strategy-declaration-value-inputs`: `plot`, `strategy`, `strategy.equity`, `strategy.initial_capital`
- `language.collection-history-containers`: `array.get`, `array.new_float`, `array.push`, `array.size`, `bar_index`, `close`, `float`, `high`, `indicator`, `map.get`, `map.new`, `map.put`, `matrix.get`, `matrix.new`, `matrix.set`, `na`, `open`, `plot`, `string`
- `language.collection-mutation-ordering-loops`: `array.get`, `array.new_float`, `array.push`, `array.sum`, `close`, `float`, `indicator`, `map.get`, `map.new`, `map.put`, `matrix.get`, `matrix.new`, `matrix.set`, `nz`, `plot`, `string`
- `language.udt-collection-copy-identity`: `array.get`, `array.new`, `array.push`, `close`, `float`, `high`, `indicator`, `plot`
- `language.qualifier-helper-chain`: `close`, `float`, `indicator`, `int`, `plot`, `ta.highest`
- `strategy.entry-close-ledger-values`: `bar_index`, `close`, `plot`, `strategy`, `strategy.close`, `strategy.entry`, `strategy.long`, `strategy.netprofit`, `strategy.position_avg_price`, `strategy.position_size`
- `strategy.exit-limit-ledger-values`: `bar_index`, `close`, `plot`, `strategy`, `strategy.closedtrades`, `strategy.entry`, `strategy.exit`, `strategy.long`, `strategy.netprofit`, `strategy.position_size`
- `strategy.closedtrades-accessor-values`: `bar_index`, `close`, `na`, `plot`, `strategy`, `strategy.close`, `strategy.closedtrades`, `strategy.closedtrades.entry_price`, `strategy.closedtrades.exit_price`, `strategy.closedtrades.profit`, `strategy.closedtrades.size`, `strategy.entry`, `strategy.long`, `true`
- `strategy.opentrades-accessor-values`: `bar_index`, `na`, `plot`, `strategy`, `strategy.entry`, `strategy.opentrades`, `strategy.opentrades.capital_held`, `strategy.opentrades.entry_price`, `strategy.opentrades.profit`, `strategy.opentrades.size`, `strategy.short`, `true`
- `strategy.openprofit-and-opentrade-commission-values`: `bar_index`, `na`, `plot`, `str.length`, `strategy`, `strategy.commission.cash_per_contract`, `strategy.entry`, `strategy.openprofit`, `strategy.opentrades`, `strategy.opentrades.commission`, `strategy.opentrades.entry_comment`, `strategy.opentrades.entry_id`, `strategy.short`, `true`
- `strategy.aggregate-performance-values`: `bar_index`, `close`, `na`, `plot`, `strategy`, `strategy.avg_losing_trade`, `strategy.avg_trade`, `strategy.avg_winning_trade`, `strategy.close`, `strategy.closedtrades`, `strategy.entry`, `strategy.eventrades`, `strategy.grossloss`, `strategy.grossprofit`, `strategy.long`, `strategy.losstrades`, `strategy.netprofit`, `strategy.wintrades`, `true`
- `strategy.trade-percent-values`: `bar_index`, `close`, `na`, `plot`, `strategy`, `strategy.avg_losing_trade_percent`, `strategy.avg_trade_percent`, `strategy.avg_winning_trade_percent`, `strategy.close`, `strategy.closedtrades`, `strategy.closedtrades.profit_percent`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.opentrades.profit_percent`, `strategy.short`, `true`
- `strategy.aggregate-percent-contract-values`: `bar_index`, `close`, `plot`, `strategy`, `strategy.close`, `strategy.entry`, `strategy.grossloss_percent`, `strategy.grossprofit_percent`, `strategy.long`, `strategy.max_contracts_held_all`, `strategy.max_contracts_held_long`, `strategy.max_contracts_held_short`, `strategy.netprofit_percent`, `strategy.openprofit_percent`, `strategy.short`, `true`
- `strategy.closedtrades-timing-commission-values`: `bar_index`, `close`, `na`, `plot`, `strategy`, `strategy.close`, `strategy.closedtrades`, `strategy.closedtrades.commission`, `strategy.closedtrades.entry_bar_index`, `strategy.closedtrades.entry_time`, `strategy.closedtrades.exit_bar_index`, `strategy.closedtrades.exit_time`, `strategy.commission.cash_per_order`, `strategy.entry`, `strategy.long`, `true`
- `strategy.percent-commission-values`: `bar_index`, `close`, `na`, `plot`, `str.length`, `strategy`, `strategy.close`, `strategy.closedtrades`, `strategy.closedtrades.commission`, `strategy.closedtrades.entry_comment`, `strategy.closedtrades.entry_id`, `strategy.closedtrades.exit_comment`, `strategy.closedtrades.exit_id`, `strategy.commission.percent`, `strategy.entry`, `strategy.long`, `strategy.netprofit`, `true`
- `strategy.enum-constant-values`: `plot`, `strategy`, `strategy.commission.cash_per_contract`, `strategy.commission.percent`, `strategy.direction.all`, `strategy.direction.short`, `strategy.oca.cancel`, `strategy.oca.none`, `strategy.oca.reduce`
- `strategy.opentrades-timing-percent-values`: `bar_index`, `na`, `plot`, `strategy`, `strategy.entry`, `strategy.opentrades`, `strategy.opentrades.entry_bar_index`, `strategy.opentrades.entry_time`, `strategy.opentrades.profit_percent`, `strategy.short`, `true`
- `strategy.risk-allow-entry-direction-values`: `bar_index`, `plot`, `strategy`, `strategy.closedtrades`, `strategy.direction.long`, `strategy.entry`, `strategy.long`, `strategy.netprofit`, `strategy.position_size`, `strategy.risk.allow_entry_in`, `strategy.short`, `true`
- `strategy.risk-max-position-size-values`: `bar_index`, `plot`, `strategy`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.position_size`, `strategy.risk.max_position_size`, `true`
- `strategy.cancel-pending-order-values`: `bar_index`, `plot`, `strategy`, `strategy.cancel`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.position_size`
- `strategy.order-reduce-position-values`: `bar_index`, `plot`, `strategy`, `strategy.long`, `strategy.netprofit`, `strategy.opentrades`, `strategy.order`, `strategy.position_size`, `strategy.short`, `true`
- `strategy.close-all-position-values`: `bar_index`, `plot`, `strategy`, `strategy.close_all`, `strategy.closedtrades`, `strategy.entry`, `strategy.long`, `strategy.netprofit`, `strategy.position_size`, `true`
- `strategy.cancel-all-pending-values`: `bar_index`, `plot`, `strategy`, `strategy.cancel_all`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.position_size`
- `strategy.currency-conversion-values`: `currency.JPY`, `plot`, `strategy`, `strategy.convert_to_account`, `strategy.convert_to_symbol`
- `strategy.default-entry-quantity-values`: `plot`, `strategy`, `strategy.default_entry_qty`, `strategy.percent_of_equity`
- `strategy.default-cash-fixed-values`: `plot`, `strategy`, `strategy.cash`, `strategy.default_entry_qty`, `strategy.fixed`
- `strategy.account-position-name-values`: `bar_index`, `currency.EUR`, `plot`, `strategy`, `strategy.account_currency`, `strategy.entry`, `strategy.long`, `strategy.position_entry_name`, `true`
- `strategy.trade-runup-drawdown-values`: `bar_index`, `close`, `na`, `plot`, `strategy`, `strategy.close`, `strategy.closedtrades`, `strategy.closedtrades.max_drawdown`, `strategy.closedtrades.max_runup`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.opentrades.max_drawdown`, `strategy.opentrades.max_runup`, `strategy.short`, `true`
- `strategy.aggregate-runup-drawdown-values`: `bar_index`, `close`, `plot`, `strategy`, `strategy.close`, `strategy.entry`, `strategy.long`, `strategy.max_drawdown`, `strategy.max_runup`, `true`
- `strategy.aggregate-runup-percent-values`: `bar_index`, `close`, `plot`, `strategy`, `strategy.close`, `strategy.entry`, `strategy.long`, `strategy.max_drawdown_percent`, `strategy.max_runup_percent`, `true`
- `strategy.pyramiding-cap-values`: `bar_index`, `plot`, `str.tostring`, `strategy`, `strategy.entry`, `strategy.long`, `strategy.opentrades`, `strategy.position_size`, `true`
- `strategy.calc-on-order-fills-values`: `bar_index`, `plot`, `strategy`, `strategy.entry`, `strategy.long`, `true`
- `strategy.calc-on-every-history-tick-values`: `plot`, `strategy`, `true`
- `request.security-barmerge-modes`: `barmerge.gaps_off`, `barmerge.gaps_on`, `barmerge.lookahead_off`, `barmerge.lookahead_on`, `close`, `indicator`, `plot`, `request.security`
- `request.security-lower-tf-lookahead`: `barmerge.lookahead_off`, `barmerge.lookahead_on`, `close`, `indicator`, `plot`, `request.security`
- `request.security-lower-tf-array-values`: `array.first`, `array.last`, `array.size`, `array.sum`, `close`, `indicator`, `na`, `plot`, `request.security_lower_tf`
- `request.currency-rate-points`: `indicator`, `plot`, `request.currency_rate`
- `request.corporate-actions-points`: `barmerge.gaps_on`, `currency.USD`, `dividends.gross`, `dividends.net`, `earnings.actual`, `earnings.standardized`, `indicator`, `plot`, `request.dividends`, `request.earnings`, `request.splits`, `splits.denominator`, `splits.numerator`
- `request.financial-economic-points`: `indicator`, `plot`, `request.economic`, `request.financial`
- `udf.ta.call-sites`: `close`, `float`, `indicator`, `int`, `plot`, `ta.sma`
- `udf.var.call-sites`: `close`, `float`, `indicator`, `open`, `plot`
- `udf.barssince.call-sites-hostile`: `close`, `high`, `indicator`, `low`, `plot`, `ta.barssince`
- `udf.valuewhen.call-sites-hostile`: `close`, `high`, `indicator`, `low`, `plot`, `ta.valuewhen`
