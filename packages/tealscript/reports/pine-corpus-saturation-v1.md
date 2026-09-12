# Pine Corpus Saturation V1

Navigation note: this corpus-frontier measurement feeds the current corpus
evidence synthesis. For tomorrow's actionable build order, start at
`pine-corpus-priority-queue-v1.md`.

Generated at 2026-09-11T11:47:06.318Z. Measured at commit `73dddcb5f2`.

## Headline

The v5 + v6 + accepted v7 + v7 size-recovery corpus union reaches 827/861 official members (96.05%).

Members touched by nothing in 2,506 real scripts: 34.

Trace/host-required among untouched-by-corpus: 0. Non-trace untouched: 34.

Corpus member coverage is saturated for broad GitHub-style public Pine harvesting: the only official members untouched by 2,506 real scripts are obscure currency constants, not trace-required runtime surfaces.

The remaining corpus-untouched set is all `currency.*` constants. That is a real fourth-harvest spec if someone specifically wants currency constant evidence, but it is not a broad Pine-engine frontier and it is unlikely to be reached by harvesting more GitHub indicators or strategies.

## Basis

- Official denominator: 861 names from `pine-value-vector-member-map-v29.json`.
- V5/V6 base: `pine-corpus-member-map-v1.json`. V1 predates v7 but stores the pinned v5/v6 corpus hit map. The v5/v6 sources are unchanged; this report rescans accepted v7 and recovered size-rejection sources directly.
- V7 accepted sources rescanned: 456.
- V7 size-recovered sources rescanned: 50.
- Method: Explicit source references after stripping // comments and double-quoted strings. This measures structural source coverage, not runtime reachability, correctness, or value assertion.

## Movement After V5/V6

V5/V6 alone reached 658/861. Adding accepted v7 and the 50 recovered size rejects reaches 827/861, a net +169 members.

The 50 recovered size rejects add zero members beyond accepted v7; that result is recorded separately in `external-pine-corpus-v7-size-recovery-v1.md`.

## Namespace Counts

| Namespace | Official | Corpus union | Untouched by corpus |
| --- | --- | --- | --- |
| (global) | 59 | 59 | 0 |
| adjustment | 3 | 3 | 0 |
| alert | 3 | 3 | 0 |
| array | 55 | 55 | 0 |
| backadjustment | 3 | 3 | 0 |
| barmerge | 4 | 4 | 0 |
| barstate | 7 | 7 | 0 |
| box | 30 | 30 | 0 |
| chart | 16 | 16 | 0 |
| color | 24 | 24 | 0 |
| currency | 56 | 22 | 34 |
| dayofweek | 7 | 7 | 0 |
| display | 7 | 7 | 0 |
| dividends | 5 | 5 | 0 |
| earnings | 7 | 7 | 0 |
| extend | 4 | 4 | 0 |
| font | 2 | 2 | 0 |
| footprint | 9 | 9 | 0 |
| format | 5 | 5 | 0 |
| hline | 3 | 3 | 0 |
| input | 13 | 13 | 0 |
| label | 43 | 43 | 0 |
| line | 28 | 28 | 0 |
| linefill | 6 | 6 | 0 |
| location | 5 | 5 | 0 |
| log | 3 | 3 | 0 |
| map | 11 | 11 | 0 |
| math | 29 | 29 | 0 |
| matrix | 49 | 49 | 0 |
| order | 2 | 2 | 0 |
| plot | 14 | 14 | 0 |
| polyline | 3 | 3 | 0 |
| position | 9 | 9 | 0 |
| request | 11 | 11 | 0 |
| runtime | 1 | 1 | 0 |
| scale | 3 | 3 | 0 |
| session | 9 | 9 | 0 |
| settlement_as_close | 3 | 3 | 0 |
| shape | 12 | 12 | 0 |
| size | 6 | 6 | 0 |
| splits | 2 | 2 | 0 |
| str | 18 | 18 | 0 |
| strategy | 96 | 96 | 0 |
| syminfo | 40 | 40 | 0 |
| ta | 67 | 67 | 0 |
| table | 23 | 23 | 0 |
| text | 10 | 10 | 0 |
| ticker | 9 | 9 | 0 |
| timeframe | 14 | 14 | 0 |
| volume_row | 8 | 8 | 0 |
| xloc | 2 | 2 | 0 |
| yloc | 3 | 3 | 0 |

## Untouched By Corpus

- `currency.AED`
- `currency.ARS`
- `currency.BDT`
- `currency.BHD`
- `currency.BRL`
- `currency.CLP`
- `currency.CNY`
- `currency.COP`
- `currency.CZK`
- `currency.DKK`
- `currency.EGP`
- `currency.HUF`
- `currency.IDR`
- `currency.ILS`
- `currency.ISK`
- `currency.KES`
- `currency.KWD`
- `currency.LKR`
- `currency.MAD`
- `currency.MXN`
- `currency.NGN`
- `currency.PEN`
- `currency.PHP`
- `currency.PKR`
- `currency.PLN`
- `currency.QAR`
- `currency.RON`
- `currency.RSD`
- `currency.SAR`
- `currency.THB`
- `currency.TND`
- `currency.TWD`
- `currency.VES`
- `currency.VND`

## Newly Reached After V5/V6

- `array.abs`
- `array.every`
- `array.lastindexof`
- `array.mode`
- `array.percentile_nearest_rank`
- `box.set_text_font_family`
- `box.set_text_formatting`
- `box.set_text_wrap`
- `box.set_xloc`
- `chart.is_kagi`
- `chart.is_linebreak`
- `chart.is_pnf`
- `chart.is_range`
- `chart.is_renko`
- `chart.point.copy`
- `currency.AUD`
- `currency.BTC`
- `currency.CAD`
- `currency.ETH`
- `currency.EUR`
- `currency.GBP`
- `currency.HKD`
- `currency.INR`
- `currency.JPY`
- `currency.KRW`
- `currency.MYR`
- `currency.NOK`
- `currency.NONE`
- `currency.NZD`
- `currency.RUB`
- `currency.SEK`
- `currency.SGD`
- `currency.TRY`
- `currency.ZAR`
- `display.pine_screener`
- `dividends.future_amount`
- `dividends.future_ex_date`
- `dividends.future_pay_date`
- `dividends.net`
- `earnings.future_period_end_time`
- `footprint.buy_volume`
- `footprint.delta`
- `footprint.get_row_by_price`
- `footprint.poc`
- `footprint.rows`
- `footprint.sell_volume`
- `footprint.total_volume`
- `footprint.vah`
- `footprint.val`
- `label.set_point`
- `label.set_text_font_family`
- `label.set_text_formatting`
- `label.style_cross`
- `line.set_first_point`
- `line.set_second_point`
- `linefill.get_line2`
- `map.copy`
- `map.put_all`
- `map.values`
- `math.rphi`
- `math.toradians`
- `matrix.avg`
- `matrix.eigenvalues`
- `matrix.eigenvectors`
- `matrix.is_identity`
- `matrix.is_square`
- `matrix.is_symmetric`
- `matrix.median`
- `matrix.pinv`
- `matrix.remove_col`
- `matrix.sum`
- `matrix.swap_columns`
- `matrix.trace`
- `plot.linestyle_solid`
- `request.currency_rate`
- `request.economic`
- `request.footprint`
- `request.quandl`
- `scale.left`
- `session.islastbar_regular`
- `session.ispostmarket`
- `splits.numerator`
- `strategy.account_currency`
- `strategy.avg_losing_trade`
- `strategy.avg_losing_trade_percent`
- `strategy.avg_trade`
- `strategy.avg_trade_percent`
- `strategy.avg_winning_trade`
- `strategy.avg_winning_trade_percent`
- `strategy.closedtrades.commission`
- `strategy.closedtrades.entry_comment`
- `strategy.closedtrades.first_index`
- `strategy.closedtrades.max_drawdown_percent`
- `strategy.closedtrades.max_runup_percent`
- `strategy.closedtrades.profit_percent`
- `strategy.convert_to_account`
- `strategy.convert_to_symbol`
- `strategy.default_entry_qty`
- `strategy.direction.all`
- `strategy.direction.short`
- `strategy.eventrades`
- `strategy.grossloss_percent`
- `strategy.grossprofit_percent`
- `strategy.margin_liquidation_price`
- `strategy.max_contracts_held_all`
- `strategy.max_contracts_held_long`
- `strategy.max_contracts_held_short`
- `strategy.max_drawdown_percent`
- `strategy.max_runup_percent`
- `strategy.netprofit_percent`
- `strategy.oca.none`
- `strategy.openprofit_percent`
- `strategy.opentrades.capital_held`
- `strategy.opentrades.commission`
- `strategy.opentrades.entry_comment`
- `strategy.opentrades.max_drawdown`
- `strategy.opentrades.max_drawdown_percent`
- `strategy.opentrades.max_runup`
- `strategy.opentrades.max_runup_percent`
- `strategy.opentrades.profit_percent`
- `strategy.position_entry_name`
- `strategy.risk.max_cons_loss_days`
- `syminfo.country`
- `syminfo.current_contract`
- `syminfo.employees`
- `syminfo.expiration_date`
- `syminfo.isin`
- `syminfo.main_tickerid`
- `syminfo.minmove`
- `syminfo.pricescale`
- `syminfo.recommendations_buy`
- `syminfo.recommendations_buy_strong`
- `syminfo.recommendations_date`
- `syminfo.recommendations_hold`
- `syminfo.recommendations_sell`
- `syminfo.recommendations_sell_strong`
- `syminfo.recommendations_total`
- `syminfo.sector`
- `syminfo.shareholders`
- `syminfo.shares_outstanding_float`
- `syminfo.shares_outstanding_total`
- `syminfo.target_price_average`
- `syminfo.target_price_date`
- `syminfo.target_price_estimates`
- `syminfo.target_price_high`
- `syminfo.target_price_low`
- `syminfo.target_price_median`
- `syminfo.volumetype`
- `ta.kcw`
- `ta.mode`
- `table.all`
- `table.cell_set_bgcolor`
- `table.cell_set_text_font_family`
- `table.cell_set_text_formatting`
- `table.cell_set_text_valign`
- `table.cell_set_tooltip`
- `table.cell_set_width`
- `text.format_none`
- `text.wrap_auto`
- `text.wrap_none`
- `volume_row.buy_volume`
- `volume_row.delta`
- `volume_row.down_price`
- `volume_row.has_buy_imbalance`
- `volume_row.has_sell_imbalance`
- `volume_row.sell_volume`
- `volume_row.total_volume`
- `volume_row.up_price`
- `weekofyear`
