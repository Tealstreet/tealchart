# Pine Builtin Default Oracle Sweep v1

Generated at 2026-09-12T07:34:11.166Z. Measured at commit `f2177285a6`.

## Scope

- Live reference source: https://www.tradingview.com/pine-script-reference/v6/
- Signature snapshot: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`
- Corpus ranking source: `packages/tealscript/reports/pine-corpus-optional-argument-usage-v1.json`

This report addresses the optional-default hole left by the argument-binding sweep. It does not infer defaults from TealScript behavior. Defaults are sourced only from literal text in TradingView's live v6 reference argument descriptions. Defaults that resolve only to doc placeholders such as `mdInternalRef`, inherited chart settings, or manual silence remain unprobed.

The corpus rank is best-effort: the available corpus report ranks the 222 vector-untested optional slots, so current optional slots absent from that report are treated as zero observed usage rather than invented exposure.

## Summary

| Metric | Count |
| --- | ---: |
| Current optional slots | 510 |
| Literal documented defaults extracted | 283 |
| Documented defaults blocked by unresolved references | 52 |
| Manual-silent optional slots | 175 |
| Executable omission-vs-explicit probes | 270 |
| Matched executable probes | 270 |
| Mismatched executable probes | 0 |
| Not executable or still unprobed | 240 |
| Needs richer setup after literal default extraction | 13 |

## Remaining Unprobed Buckets

| Bucket | Count | Verdict |
| --- | ---: | --- |
| Docs silent | 175 | Blocked on TradingView/compiler evidence; no default is inferred locally. |
| Unresolved refs / inherited settings | 52 | Reference text names another setting or dynamic source rather than a literal omission oracle. |
| Needs richer setup | 13 | Literal default is documented, but the current probe needs request data, UDT fields, lower-timeframe data, or another richer fixture. |

## Verdict

Measured default surface closed: every slot with a literal documented default that the harness could execute matched omitted-vs-explicit behavior. This is not a claim that all optional defaults are verified; 240 slots remain unverified for the blockers below.

## Mismatches

None.

## Resumable Queues

These rows are ranked by observed corpus script count, then hit count. They are closable in principle, but this pass stops here because the 141 slots unlocked by fixing the oracle produced zero mismatches.

### Unresolved Refs / Inherited Settings

| Member | Param | Scripts | Hits | Evidence | Blocker |
| --- | --- | ---: | ---: | --- | --- |
| `strategy` | `shorttitle` | 143 | 143 | the argument used for `title` | No literal documented default expression is available. |
| `strategy.entry` | `stop` | 113 | 168 | [na](#var_na), which means the resulting order is not of the stop or stop-limit type | No literal documented default expression is available. |
| `timeframe.in_seconds` | `timeframe` | 106 | 346 | [timeframe.period](#var_timeframe.period) | No literal documented default expression is available. |
| `strategy` | `precision` | 37 | 37 | inherited from the precision of the chart's symbol | No literal documented default expression is available. |
| `ta.vwap` | `anchor` | 26 | 42 | equivalent to passing [timeframe.change()](#fun_timeframe.change) with "1D" as its argument | No literal documented default expression is available. |
| `ta.vwap` | `stdev_mult` | 20 | 27 | [na](#var_na), in which case the function returns a single value, not a tuple | No literal documented default expression is available. |
| `request.earnings` | `lookahead` | 15 | 20 | [barmerge.lookahead_off](#const_barmerge.lookahead_off) starting from version 3 | No literal documented default expression is available. |
| `request.security` | `calc_bars_count` | 14 | 91 | the same as the number of [chart bars](https://www.tradingview.com/pine-script-docs/writing/limitations/#chart-bars) available for the symbol and timeframe | No literal documented default expression is available. |
| `strategy.exit` | `qty` | 13 | 65 | [na](#var_na), which means the order size depends on the `qty_percent` value | No literal documented default expression is available. |
| `request.dividends` | `lookahead` | 12 | 12 | [barmerge.lookahead_off](#const_barmerge.lookahead_off) starting from version 3 | No literal documented default expression is available. |
| `request.splits` | `lookahead` | 12 | 12 | [barmerge.lookahead_off](#const_barmerge.lookahead_off) starting from version 3 | No literal documented default expression is available. |
| `strategy.order` | `stop` | 10 | 23 | [na](#var_na), which means the resulting order is not of the stop or stop-limit type | No literal documented default expression is available. |
| `strategy.order` | `limit` | 10 | 16 | [na](#var_na), which means the resulting order is not of the limit or stop-limit type | No literal documented default expression is available. |
| `ticker.modify` | `backadjustment` | 2 | 6 | [backadjustment.inherit](#var_backadjustment.inherit), meaning that the modified ticker ID inherits the setting from the ticker ID passed to the `tickerid` parameter, or it inherits the symbol's default if the `tickerid` does not specify this setting | No literal documented default expression is available. |
| `ticker.modify` | `settlement_as_close` | 2 | 6 | [settlement_as_close.inherit](#var_settlement_as_close.inherit), meaning that the modified ticker ID inherits the setting from the `tickerid` passed into the function, or it inherits the chart symbol's default if the `tickerid` does not specify this setting | No literal documented default expression is available. |
| `request.security_lower_tf` | `calc_bars_count` | 1 | 1 | the same as the number of [chart bars](https://www.tradingview.com/pine-script-docs/writing/limitations/#chart-bars) available for the symbol and timeframe | No literal documented default expression is available. |
| `box.new` | `text_size` | 0 | 0 | [size.auto](#const_size.auto) or 0 | No literal documented default expression is available. |
| `chart.point.now` | `price` | 0 | 0 | [close](#var_close) | No literal documented default expression is available. |
| `label.new` | `size` | 0 | 0 | [size.normal](#const_size.normal), which represents the numeric size of 12 | No literal documented default expression is available. |
| `matrix.add_col` | `column` | 0 | 0 | `matrix.columns(id)` | No literal documented default expression is available. |
| `matrix.add_row` | `row` | 0 | 0 | `matrix.rows(id)` | No literal documented default expression is available. |
| `matrix.fill` | `to_column` | 0 | 0 | [matrix.columns()](#fun_matrix.columns) | No literal documented default expression is available. |
| `matrix.fill` | `to_row` | 0 | 0 | [matrix.rows()](#fun_matrix.rows) | No literal documented default expression is available. |
| `matrix.submatrix` | `to_column` | 0 | 0 | [matrix.columns()](#fun_matrix.columns) | No literal documented default expression is available. |
| `matrix.submatrix` | `to_row` | 0 | 0 | [matrix.rows()](#fun_matrix.rows) | No literal documented default expression is available. |
| `plot` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plot` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotarrow` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotarrow` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotbar` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotbar` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotcandle` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotcandle` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotchar` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotchar` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotshape` | `format` | 0 | 0 | the `format` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `plotshape` | `precision` | 0 | 0 | the `precision` value used by the [indicator()](#fun_indicator)/[strategy()](#fun_strategy) function | No literal documented default expression is available. |
| `request.security` | `lookahead` | 0 | 0 | [barmerge.lookahead_off](#const_barmerge.lookahead_off) starting from Pine Script® v3 | No literal documented default expression is available. |
| `request.seed` | `calc_bars_count` | 0 | 0 | the same as the number of [chart bars](https://www.tradingview.com/pine-script-docs/writing/limitations/#chart-bars) available for the symbol and timeframe | No literal documented default expression is available. |
| `str.substring` | `end_pos` | 0 | 0 | the length of the `source` string | No literal documented default expression is available. |
| `str.tostring` | `format` | 0 | 0 | '#.##########' | No literal documented default expression is available. |
| `strategy.close` | `qty` | 0 | 0 | [na](#var_na), which means the order size depends on the `qty_percent` value | No literal documented default expression is available. |
| `strategy.entry` | `limit` | 0 | 0 | [na](#var_na), which means the resulting order is not of the limit or stop-limit type | No literal documented default expression is available. |
| `strategy.entry` | `qty` | 0 | 0 | [na](#var_na), which means that the command uses the `default_qty_type` and `default_qty_value` parameters of the [strategy()](#fun_strategy) declaration statement to determine the quantity | No literal documented default expression is available. |
| `strategy.order` | `qty` | 0 | 0 | [na](#var_na), which means that the command uses the `default_qty_type` and `default_qty_value` parameters of the [strategy()](#fun_strategy) declaration statement to determine the quantity | No literal documented default expression is available. |
| `table.cell` | `bgcolor` | 0 | 0 | no color | No literal documented default expression is available. |
| `table.cell` | `text_size` | 0 | 0 | [size.normal](#const_size.normal) or 14 | No literal documented default expression is available. |
| `table.new` | `bgcolor` | 0 | 0 | no color | No literal documented default expression is available. |
| `table.new` | `border_color` | 0 | 0 | no color | No literal documented default expression is available. |
| `table.new` | `frame_color` | 0 | 0 | no color | No literal documented default expression is available. |
| `ticker.new` | `backadjustment` | 0 | 0 | [backadjustment.inherit](#var_backadjustment.inherit), meaning that the new ticker ID inherits the symbol's default setting | No literal documented default expression is available. |
| `ticker.new` | `settlement_as_close` | 0 | 0 | [settlement_as_close.inherit](#var_settlement_as_close.inherit), meaning that the new ticker ID inherits the chart symbol's default setting | No literal documented default expression is available. |

### Needs Richer Setup

| Member | Param | Scripts | Hits | Evidence | Blocker |
| --- | --- | ---: | ---: | --- | --- |
| `request.security` | `currency` | 3 | 76 | [syminfo.currency](#var_syminfo.currency) | omitted form did not execute: runtime errors: request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed |
| `array.sort_indices` | `sort_field` | 3 | 3 | 0 | explicit default form did not execute: runtime errors: Array sort_field requires user-defined type values |
| `array.sort` | `sort_field` | 1 | 1 | 0 | explicit default form did not execute: runtime errors: Array sort_field requires user-defined type values |
| `array.binary_search_leftmost` | `sort_field` | 0 | 0 | 0 | explicit default form did not execute: runtime errors: Array sort_field requires user-defined type values |
| `array.binary_search_rightmost` | `sort_field` | 0 | 0 | 0 | explicit default form did not execute: runtime errors: Array sort_field requires user-defined type values |
| `array.binary_search` | `sort_field` | 0 | 0 | 0 | explicit default form did not execute: runtime errors: Array sort_field requires user-defined type values |
| `matrix.sort` | `sort_field` | 0 | 0 | 0 | explicit default form did not execute: runtime errors: Matrix sort_field requires user-defined type values in the selected column |
| `request.security_lower_tf` | `currency` | 0 | 0 | [syminfo.currency](#var_syminfo.currency) | omitted form did not execute: runtime errors: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| `request.security_lower_tf` | `ignore_invalid_symbol` | 0 | 0 | [false](#const_false) | omitted form did not execute: runtime errors: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| `request.security_lower_tf` | `ignore_invalid_timeframe` | 0 | 0 | [false](#const_false) | omitted form did not execute: runtime errors: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| `request.security` | `gaps` | 0 | 0 | [barmerge.gaps_off](#const_barmerge.gaps_off) | omitted form did not execute: runtime errors: request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed |
| `request.security` | `ignore_invalid_symbol` | 0 | 0 | [false](#const_false) | omitted form did not execute: runtime errors: request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed; request.security requires a request datafeed |
| `request.seed` | `ignore_invalid_symbol` | 0 | 0 | [false](#const_false) | omitted form did not execute: runtime errors: request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed; request.seed requires a request datafeed |

## Top Ranked Optional Slots

| Member | Param | Scripts | Hits | Default evidence | Probe verdict |
| --- | --- | ---: | ---: | --- | --- |
| `input.int` | `group` | 656 | 5905 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.bool` | `group` | 612 | 8651 | manual-silent | unprobed: No literal documented default expression is available. |
| `label.new` | `style` | 601 | 2859 | literal `[label.style_label_down](#const_label.style_label_down)` | matched omitted vs explicit default |
| `label.new` | `textcolor` | 589 | 2722 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy` | `overlay` | 526 | 534 | literal `[false](#const_false)` | matched omitted vs explicit default |
| `input.string` | `group` | 514 | 3329 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.float` | `group` | 512 | 4063 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.int` | `tooltip` | 468 | 1543 | manual-silent | unprobed: No literal documented default expression is available. |
| `input` | `title` | 350 | 3901 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.bool` | `tooltip` | 345 | 2585 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.color` | `group` | 344 | 3097 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy.exit` | `stop` | 316 | 971 | literal `[na](#var_na)` | matched omitted vs explicit default |
| `input.float` | `tooltip` | 299 | 1025 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.string` | `tooltip` | 238 | 893 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.bool` | `inline` | 227 | 3373 | manual-silent | unprobed: No literal documented default expression is available. |
| `box.new` | `bgcolor` | 224 | 801 | literal `[color.blue](#const_color.blue)` | matched omitted vs explicit default |
| `input.color` | `inline` | 206 | 2107 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.int` | `inline` | 206 | 1566 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy` | `slippage` | 200 | 205 | literal `0` | matched omitted vs explicit default |
| `label.new` | `xloc` | 197 | 738 | literal `[xloc.bar_index](#const_xloc.bar_index)` | matched omitted vs explicit default |
| `line.new` | `xloc` | 187 | 1015 | literal `[xloc.bar_index](#const_xloc.bar_index)` | matched omitted vs explicit default |
| `input.string` | `inline` | 184 | 1540 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.timeframe` | `group` | 149 | 348 | manual-silent | unprobed: No literal documented default expression is available. |
| `input.source` | `group` | 145 | 240 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy` | `shorttitle` | 143 | 143 | unresolved `the argument used for `title`` | unprobed: No literal documented default expression is available. |
| `label.new` | `tooltip` | 137 | 569 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy.close_all` | `comment` | 132 | 179 | literal `an empty string` | matched omitted vs explicit default |
| `input.float` | `inline` | 117 | 987 | manual-silent | unprobed: No literal documented default expression is available. |
| `input` | `group` | 116 | 1842 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy` | `margin_long` | 116 | 116 | literal `100, in which case the strategy only uses its own funds and the long positions cannot be margin called` | matched omitted vs explicit default |
| `strategy.entry` | `stop` | 113 | 168 | unresolved `[na](#var_na), which means the resulting order is not of the stop or stop-limit type` | unprobed: No literal documented default expression is available. |
| `strategy` | `margin_short` | 113 | 113 | literal `100, in which case the strategy only uses its own funds` | matched omitted vs explicit default |
| `array.new` | `size` | 112 | 656 | literal `0` | matched omitted vs explicit default |
| `timeframe.in_seconds` | `timeframe` | 106 | 346 | unresolved `[timeframe.period](#var_timeframe.period)` | unprobed: No literal documented default expression is available. |
| `box.new` | `xloc` | 104 | 268 | literal `[xloc.bar_index](#const_xloc.bar_index)` | matched omitted vs explicit default |
| `strategy.exit` | `comment` | 95 | 301 | literal `an empty string` | matched omitted vs explicit default |
| `input.session` | `group` | 91 | 267 | manual-silent | unprobed: No literal documented default expression is available. |
| `strategy` | `calc_on_every_tick` | 90 | 90 | literal `[false](#const_false)` | matched omitted vs explicit default |
| `label.new` | `textalign` | 86 | 194 | literal `[text.align_center](#const_text.align_center)` | matched omitted vs explicit default |
| `input` | `inline` | 83 | 1480 | manual-silent | unprobed: No literal documented default expression is available. |

Full rows are in `reports/pine-builtin-default-oracle-sweep-v1.json`.
