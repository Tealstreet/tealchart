> Superseded by pine-value-vector-depth-v12.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Depth Coverage V1

## Basis

- Source cases: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Signature source: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`.
- Scope: official members already covered by at least one value-vector case and present in the committed signature table.
- Overload coverage is strict when a call uniquely selects that overload; lenient coverage means at least one call is compatible with it.
- Optional argument coverage is by `member:param` slot, reached by either positional or named use.

## Headline

- Covered callable members measured for depth: 325.
- Documented overload rows: 10; lenient covered 10/10 (100.00%); strict covered 10/10 (100.00%).
- Documented optional argument slots: 240/463 covered (51.84%); 223 untouched.

## Untouched Optional Argument Slots By Namespace

| Namespace | Untouched optional slots |
| --- | ---: |
| `array` | 9 |
| `barcolor` | 1 |
| `bgcolor` | 2 |
| `box` | 9 |
| `color` | 1 |
| `fill` | 1 |
| `hline` | 1 |
| `input` | 84 |
| `label` | 7 |
| `line` | 2 |
| `matrix` | 1 |
| `plotarrow` | 7 |
| `plotbar` | 4 |
| `plotcandle` | 4 |
| `plotchar` | 8 |
| `plotshape` | 4 |
| `request` | 7 |
| `strategy` | 59 |
| `ta` | 5 |
| `table` | 3 |
| `ticker` | 3 |
| `timeframe` | 1 |

## Untouched Strict Overload Rows

- none

## Untouched Optional Argument Slots

- `array.new:size`
- `array.new:initial_value`
- `array.new_box:initial_value`
- `array.new_label:initial_value`
- `array.new_line:initial_value`
- `array.new_linefill:initial_value`
- `array.new_table:initial_value`
- `array.sort:sort_field`
- `array.sort_indices:sort_field`
- `barcolor:offset`
- `bgcolor:offset`
- `bgcolor:transp`
- `box.new:xloc`
- `box.new:bgcolor`
- `box.new:text`
- `box.new:text_color`
- `box.new:text_halign`
- `box.new:text_valign`
- `box.new:text_font_family`
- `box.new:force_overlay`
- `box.new:text_formatting`
- `color:transp`
- `fill:display`
- `hline:display`
- `input:title`
- `input:tooltip`
- `input:inline`
- `input:group`
- `input:display`
- `input:active`
- `input.bool:tooltip`
- `input.bool:inline`
- `input.bool:group`
- `input.bool:confirm`
- `input.bool:display`
- `input.bool:active`
- `input.color:tooltip`
- `input.color:inline`
- `input.color:group`
- `input.color:confirm`
- `input.color:display`
- `input.color:active`
- `input.enum:tooltip`
- `input.enum:inline`
- `input.enum:group`
- `input.enum:confirm`
- `input.enum:display`
- `input.enum:active`
- `input.float:tooltip`
- `input.float:inline`
- `input.float:group`
- `input.float:confirm`
- `input.float:display`
- `input.float:active`
- `input.int:tooltip`
- `input.int:inline`
- `input.int:group`
- `input.int:confirm`
- `input.int:display`
- `input.int:active`
- `input.price:tooltip`
- `input.price:inline`
- `input.price:group`
- `input.price:confirm`
- `input.price:display`
- `input.price:active`
- `input.session:tooltip`
- `input.session:inline`
- `input.session:group`
- `input.session:confirm`
- `input.session:display`
- `input.session:active`
- `input.source:tooltip`
- `input.source:inline`
- `input.source:group`
- `input.source:confirm`
- `input.source:display`
- `input.source:active`
- `input.string:tooltip`
- `input.string:inline`
- `input.string:group`
- `input.string:confirm`
- `input.string:display`
- `input.string:active`
- `input.symbol:tooltip`
- `input.symbol:inline`
- `input.symbol:group`
- `input.symbol:confirm`
- `input.symbol:display`
- `input.symbol:active`
- `input.text_area:tooltip`
- `input.text_area:inline`
- `input.text_area:group`
- `input.text_area:confirm`
- `input.text_area:display`
- `input.text_area:active`
- `input.time:tooltip`
- `input.time:inline`
- `input.time:group`
- `input.time:confirm`
- `input.time:display`
- `input.time:active`
- `input.timeframe:tooltip`
- `input.timeframe:inline`
- `input.timeframe:group`
- `input.timeframe:confirm`
- `input.timeframe:display`
- `input.timeframe:active`
- `label.new:xloc`
- `label.new:style`
- `label.new:textcolor`
- `label.new:textalign`
- `label.new:tooltip`
- `label.new:force_overlay`
- `label.new:text_formatting`
- `line.new:xloc`
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
- `plotchar:size`
- `plotchar:show_last`
- `plotchar:display`
- `plotchar:format`
- `plotchar:precision`
- `plotchar:force_overlay`
- `plotshape:editable`
- `plotshape:display`
- `plotshape:format`
- `plotshape:precision`
- `request.dividends:lookahead`
- `request.earnings:lookahead`
- `request.security:currency`
- `request.security:calc_bars_count`
- `request.security_lower_tf:currency`
- `request.security_lower_tf:calc_bars_count`
- `request.splits:lookahead`
- `strategy:shorttitle`
- `strategy:overlay`
- `strategy:format`
- `strategy:precision`
- `strategy:scale`
- `strategy:calc_on_every_tick`
- `strategy:max_bars_back`
- `strategy:backtest_fill_limits_assumption`
- `strategy:slippage`
- `strategy:close_entries_rule`
- `strategy:margin_long`
- `strategy:margin_short`
- `strategy:explicit_plot_zorder`
- `strategy:max_lines_count`
- `strategy:max_labels_count`
- `strategy:max_boxes_count`
- `strategy:risk_free_rate`
- `strategy:use_bar_magnifier`
- `strategy:fill_orders_on_standard_ohlc`
- `strategy:max_polylines_count`
- `strategy:dynamic_requests`
- `strategy:behind_chart`
- `strategy.close:alert_message`
- `strategy.close:immediately`
- `strategy.close:disable_alert`
- `strategy.close_all:comment`
- `strategy.close_all:alert_message`
- `strategy.close_all:immediately`
- `strategy.close_all:disable_alert`
- `strategy.entry:stop`
- `strategy.entry:oca_name`
- `strategy.entry:oca_type`
- `strategy.entry:alert_message`
- `strategy.entry:disable_alert`
- `strategy.exit:qty`
- `strategy.exit:qty_percent`
- `strategy.exit:profit`
- `strategy.exit:loss`
- `strategy.exit:stop`
- `strategy.exit:trail_price`
- `strategy.exit:trail_points`
- `strategy.exit:trail_offset`
- `strategy.exit:oca_name`
- `strategy.exit:comment`
- `strategy.exit:comment_profit`
- `strategy.exit:comment_loss`
- `strategy.exit:comment_trailing`
- `strategy.exit:alert_message`
- `strategy.exit:alert_profit`
- `strategy.exit:alert_loss`
- `strategy.exit:alert_trailing`
- `strategy.exit:disable_alert`
- `strategy.order:limit`
- `strategy.order:stop`
- `strategy.order:oca_name`
- `strategy.order:oca_type`
- `strategy.order:comment`
- `strategy.order:alert_message`
- `strategy.order:disable_alert`
- `ta.max:source2`
- `ta.min:source2`
- `ta.pivot_point_levels:developing`
- `ta.vwap:anchor`
- `ta.vwap:stdev_mult`
- `table.cell:text_font_family`
- `table.cell:text_formatting`
- `table.new:force_overlay`
- `ticker.modify:adjustment`
- `ticker.modify:backadjustment`
- `ticker.modify:settlement_as_close`
- `timeframe.in_seconds:timeframe`
