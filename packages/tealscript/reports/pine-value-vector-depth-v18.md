> Superseded by pine-value-vector-depth-v19.{md,json}. Historical measurement only.

# Pine Value Vector Depth Coverage V1

## Basis

- Source cases: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Signature source: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`.
- Scope: official members already covered by at least one value-vector case and present in the committed signature table.
- Overload coverage is strict when a call uniquely selects that overload; lenient coverage means at least one call is compatible with it.
- Optional argument coverage is by `member:param` slot, reached by either positional or named use.

## Headline

- Covered callable members measured for depth: 327.
- Parse-skipped vector cases: 1 (`language.switch-arm-arrow-continuation-values`).
- Documented overload rows: 10; lenient covered 10/10 (100.00%); strict covered 10/10 (100.00%).
- Documented optional argument slots: 339/465 covered (72.90%); 126 untouched.

## Untouched Optional Argument Slots By Namespace

| Namespace | Untouched optional slots |
| --- | ---: |
| `array` | 5 |
| `barcolor` | 1 |
| `bgcolor` | 2 |
| `box` | 3 |
| `color` | 1 |
| `fill` | 1 |
| `hline` | 1 |
| `input` | 32 |
| `label` | 1 |
| `line` | 1 |
| `matrix` | 1 |
| `plotarrow` | 7 |
| `plotbar` | 4 |
| `plotcandle` | 4 |
| `plotchar` | 7 |
| `plotshape` | 3 |
| `request` | 7 |
| `strategy` | 36 |
| `ta` | 4 |
| `table` | 3 |
| `ticker` | 2 |

## Untouched Strict Overload Rows

- none

## Untouched Optional Argument Slots

- `array.new_label:initial_value`
- `array.new_linefill:initial_value`
- `array.new_table:initial_value`
- `array.sort:sort_field`
- `array.sort_indices:sort_field`
- `barcolor:offset`
- `bgcolor:offset`
- `bgcolor:transp`
- `box.new:text_font_family`
- `box.new:force_overlay`
- `box.new:text_formatting`
- `color:transp`
- `fill:display`
- `hline:display`
- `input:display`
- `input:active`
- `input.bool:confirm`
- `input.color:confirm`
- `input.enum:tooltip`
- `input.enum:inline`
- `input.enum:group`
- `input.enum:confirm`
- `input.enum:display`
- `input.enum:active`
- `input.float:confirm`
- `input.int:confirm`
- `input.price:tooltip`
- `input.price:inline`
- `input.price:group`
- `input.price:confirm`
- `input.price:display`
- `input.price:active`
- `input.session:display`
- `input.session:active`
- `input.source:confirm`
- `input.string:confirm`
- `input.symbol:display`
- `input.text_area:tooltip`
- `input.text_area:inline`
- `input.text_area:group`
- `input.text_area:confirm`
- `input.text_area:display`
- `input.text_area:active`
- `input.time:display`
- `input.time:active`
- `input.timeframe:active`
- `label.new:text_formatting`
- `line.new:force_overlay`
- `matrix.sort:sort_field`
- `plotarrow:offset`
- `plotarrow:editable`
- `plotarrow:show_last`
- `plotarrow:display`
- `plotarrow:format`
- `plotarrow:precision`
- `plotarrow:force_overlay`
- `plotbar:editable`
- `plotbar:show_last`
- `plotbar:display`
- `plotbar:force_overlay`
- `plotcandle:editable`
- `plotcandle:show_last`
- `plotcandle:display`
- `plotcandle:force_overlay`
- `plotchar:offset`
- `plotchar:editable`
- `plotchar:show_last`
- `plotchar:display`
- `plotchar:format`
- `plotchar:precision`
- `plotchar:force_overlay`
- `plotshape:editable`
- `plotshape:format`
- `plotshape:precision`
- `request.dividends:lookahead`
- `request.earnings:lookahead`
- `request.security:currency`
- `request.security:calc_bars_count`
- `request.security_lower_tf:currency`
- `request.security_lower_tf:calc_bars_count`
- `request.splits:lookahead`
- `strategy:format`
- `strategy:scale`
- `strategy:explicit_plot_zorder`
- `strategy:risk_free_rate`
- `strategy:use_bar_magnifier`
- `strategy:fill_orders_on_standard_ohlc`
- `strategy:max_polylines_count`
- `strategy:dynamic_requests`
- `strategy:behind_chart`
- `strategy.close:alert_message`
- `strategy.close:immediately`
- `strategy.close:disable_alert`
- `strategy.close_all:alert_message`
- `strategy.close_all:immediately`
- `strategy.close_all:disable_alert`
- `strategy.entry:oca_type`
- `strategy.entry:disable_alert`
- `strategy.exit:qty`
- `strategy.exit:trail_price`
- `strategy.exit:trail_points`
- `strategy.exit:trail_offset`
- `strategy.exit:oca_name`
- `strategy.exit:comment_profit`
- `strategy.exit:comment_loss`
- `strategy.exit:comment_trailing`
- `strategy.exit:alert_message`
- `strategy.exit:alert_profit`
- `strategy.exit:alert_loss`
- `strategy.exit:alert_trailing`
- `strategy.exit:disable_alert`
- `strategy.order:stop`
- `strategy.order:comment`
- `strategy.order:alert_message`
- `strategy.order:disable_alert`
- `strategy.risk.max_drawdown:alert_message`
- `strategy.risk.max_intraday_loss:alert_message`
- `ta.max:source2`
- `ta.min:source2`
- `ta.pivot_point_levels:developing`
- `ta.vwap:stdev_mult`
- `table.cell:text_font_family`
- `table.cell:text_formatting`
- `table.new:force_overlay`
- `ticker.modify:backadjustment`
- `ticker.modify:settlement_as_close`
