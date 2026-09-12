# Pine v6 Accepted Surface Inversion V1

Generated at 2026-09-11T14:53:48.325Z. Measured at commit `933e277129`.

## Headline

Compared 513 checker-accepted callable signatures and 372 committed v6 reference signatures in the over-acceptance direction.

- Documented callable signatures with extra accepted parameters: 0
- Accepted named aliases absent from the committed reference signature: 41
- Accepted callable members without a committed reference signature: 121
- Accepted or committed members absent from the manual index: 23

Verdicts: 18 labelled local extensions, 167 need compile evidence, 0 unlabelled over-acceptance risks.

`iff()` is intentionally absent from the v6 accepted-signature count: the checker still carries the legacy signature for Pine v4, but declared Pine v5/v6 now reject it with the migration diagnostic.

`matrix.sort:sort_field` exposed this audit's population boundary: the comparison catches checker parameters absent from the committed reference snapshot, but it cannot catch a parameter invented inside that snapshot itself. That parameter was removed from both the v6 reference snapshot and checker after external vector-lane evidence that Pine v6 documents `matrix.sort(id, column, order)` only.

Manual absence alone is not treated as proof that TradingView rejects a form. Rows marked `needs-compile-evidence` are paste-test questions: accepted on TradingView means the manual snapshot is incomplete; rejected means TealScript is over-accepting ordinary Pine source.

## Unlabelled Over-Acceptance Risks

None.

## Compile Evidence Questions

- `alert` member `alert`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `alertcondition` member `alertcondition`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `bool` member `bool`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.copy` member `box.copy`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.delete` member `box.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.get_bottom` member `box.get_bottom`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.get_left` member `box.get_left`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.get_right` member `box.get_right`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.get_top` member `box.get_top`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_bgcolor` member `box.set_bgcolor`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_border_color` member `box.set_border_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_border_style` member `box.set_border_style`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_border_width` member `box.set_border_width`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_bottom` member `box.set_bottom`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_bottom_right_point` member `box.set_bottom_right_point`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_extend` member `box.set_extend`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_left` member `box.set_left`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_lefttop` member `box.set_lefttop`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_right` member `box.set_right`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_rightbottom` member `box.set_rightbottom`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text` member `box.set_text`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_color` member `box.set_text_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_font_family` member `box.set_text_font_family`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_formatting` member `box.set_text_formatting`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_halign` member `box.set_text_halign`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_size` member `box.set_text_size`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_valign` member `box.set_text_valign`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_text_wrap` member `box.set_text_wrap`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_top` member `box.set_top`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_top_left_point` member `box.set_top_left_point`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `box.set_xloc` member `box.set_xloc`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `dayofmonth` member `dayofmonth`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `dayofweek` member `dayofweek`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `fixnan` member `fixnan`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `float` member `float`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `hour` member `hour`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `indicator` member `indicator`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `int` member `int`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.copy` member `label.copy`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.delete` member `label.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.get_text` member `label.get_text`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.get_x` member `label.get_x`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.get_y` member `label.get_y`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_color` member `label.set_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_point` member `label.set_point`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_size` member `label.set_size`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_style` member `label.set_style`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_text` member `label.set_text`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_text_font_family` member `label.set_text_font_family`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_text_formatting` member `label.set_text_formatting`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_textalign` member `label.set_textalign`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_textcolor` member `label.set_textcolor`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_tooltip` member `label.set_tooltip`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_x` member `label.set_x`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_xloc` member `label.set_xloc`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_xy` member `label.set_xy`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_y` member `label.set_y`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `label.set_yloc` member `label.set_yloc`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.copy` member `line.copy`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.delete` member `line.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.get_price` member `line.get_price`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.get_x1` member `line.get_x1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.get_x2` member `line.get_x2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.get_y1` member `line.get_y1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.get_y2` member `line.get_y2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_color` member `line.set_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_extend` member `line.set_extend`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_first_point` member `line.set_first_point`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_second_point` member `line.set_second_point`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_style` member `line.set_style`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_width` member `line.set_width`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_x1` member `line.set_x1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_x2` member `line.set_x2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_xloc` member `line.set_xloc`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_xy1` member `line.set_xy1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_xy2` member `line.set_xy2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_y1` member `line.set_y1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `line.set_y2` member `line.set_y2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `linefill.delete` member `linefill.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `linefill.get_line1` member `linefill.get_line1`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `linefill.get_line2` member `linefill.get_line2`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `linefill.set_color` member `linefill.set_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `log.error` member `log.error`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `log.info` member `log.info`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `log.warning` member `log.warning`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `max_bars_back` member `max_bars_back`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `minute` member `minute`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `month` member `month`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `na` member `na`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `nz` member `nz`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `polyline.delete` member `polyline.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `runtime.error` member `runtime.error`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `second` member `second`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `string` member `string`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `syminfo.prefix` member `syminfo.prefix`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `syminfo.ticker` member `syminfo.ticker`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_bgcolor` member `table.cell_set_bgcolor`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_height` member `table.cell_set_height`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text` member `table.cell_set_text`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_color` member `table.cell_set_text_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_font_family` member `table.cell_set_text_font_family`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_formatting` member `table.cell_set_text_formatting`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_halign` member `table.cell_set_text_halign`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_size` member `table.cell_set_text_size`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_text_valign` member `table.cell_set_text_valign`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_tooltip` member `table.cell_set_tooltip`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.cell_set_width` member `table.cell_set_width`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.clear` member `table.clear`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.delete` member `table.delete`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.merge_cells` member `table.merge_cells`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_bgcolor` member `table.set_bgcolor`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_border_color` member `table.set_border_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_border_width` member `table.set_border_width`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_frame_color` member `table.set_frame_color`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_frame_width` member `table.set_frame_width`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `table.set_position` member `table.set_position`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `time` member `time`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `time_close` member `time_close`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `timestamp` member `timestamp`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `weekofyear` member `weekofyear`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `year` member `year`: The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.
- `array.covariance` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `color` alias `transparency` -> `transp`: The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only.
- `color.new` alias `transparency` -> `transp`: The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only.
- `color.rgb` alias `transparency` -> `transp`: The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only.
- `fill` alias `hline1` -> `plot1`: The checker accepts named alias 'hline1' for 'plot1', but the committed v6 reference signature documents 'plot1' only.
- `fill` alias `hline2` -> `plot2`: The checker accepts named alias 'hline2' for 'plot2', but the committed v6 reference signature documents 'plot2' only.
- `matrix.concat` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `matrix.diff` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `matrix.kron` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `matrix.mult` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `matrix.sum` alias `id` -> `id1`: The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only.
- `str.contains` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.contains` alias `substring` -> `str`: The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.contains` alias `target` -> `str`: The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.endswith` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.endswith` alias `substring` -> `str`: The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.endswith` alias `target` -> `str`: The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.length` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.lower` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.match` alias `pattern` -> `regex`: The checker accepts named alias 'pattern' for 'regex', but the committed v6 reference signature documents 'regex' only.
- `str.match` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.pos` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.pos` alias `substring` -> `str`: The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.pos` alias `target` -> `str`: The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.repeat` alias `count` -> `repeat`: The checker accepts named alias 'count' for 'repeat', but the committed v6 reference signature documents 'repeat' only.
- `str.repeat` alias `repeat_count` -> `repeat`: The checker accepts named alias 'repeat_count' for 'repeat', but the committed v6 reference signature documents 'repeat' only.
- `str.repeat` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.replace` alias `str` -> `target`: The checker accepts named alias 'str' for 'target', but the committed v6 reference signature documents 'target' only.
- `str.replace` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.replace` alias `substring` -> `target`: The checker accepts named alias 'substring' for 'target', but the committed v6 reference signature documents 'target' only.
- `str.replace_all` alias `str` -> `target`: The checker accepts named alias 'str' for 'target', but the committed v6 reference signature documents 'target' only.
- `str.replace_all` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.replace_all` alias `substring` -> `target`: The checker accepts named alias 'substring' for 'target', but the committed v6 reference signature documents 'target' only.
- `str.split` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.startswith` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.startswith` alias `substring` -> `str`: The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.startswith` alias `target` -> `str`: The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only.
- `str.substring` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.trim` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `str.upper` alias `string` -> `source`: The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only.
- `ta.mfi` alias `series` -> `source`: The checker accepts named alias 'series' for 'source', but the committed v6 reference signature documents 'source' only.
- `line.get_color` member `line.get_color`: The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.
- `line.get_extend` member `line.get_extend`: The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.
- `line.get_style` member `line.get_style`: The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.
- `line.get_width` member `line.get_width`: The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.
- `str.tointeger` member `str.tointeger`: The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.

## Labelled Local Extensions

- `box.get_bgcolor`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `box.get_border_color`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `box.get_text`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `box.get_text_halign`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `box.get_text_valign`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `color.none`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_color`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_size`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_style`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_textcolor`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_tooltip`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_xloc`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `label.get_yloc`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `linefill.copy`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `linefill.get_color`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `polyline.copy`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `strategy.percent_profitable`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.
- `syminfo.exchange`: Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage.

## Rows

| Kind | Member | Accepted | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| member-absent-from-manual | `box.get_bgcolor` | `box.get_bgcolor` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `box.get_border_color` | `box.get_border_color` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `box.get_text` | `box.get_text` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `box.get_text_halign` | `box.get_text_halign` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `box.get_text_valign` | `box.get_text_valign` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `color.none` | `color.none` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_color` | `label.get_color` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_size` | `label.get_size` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_style` | `label.get_style` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_textcolor` | `label.get_textcolor` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_tooltip` | `label.get_tooltip` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_xloc` | `label.get_xloc` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `label.get_yloc` | `label.get_yloc` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `linefill.copy` | `linefill.copy` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `linefill.get_color` | `linefill.get_color` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `polyline.copy` | `polyline.copy` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `strategy.percent_profitable` | `strategy.percent_profitable` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| member-absent-from-manual | `syminfo.exchange` | `syminfo.exchange` | labelled-local-extension | Implemented names that are useful compatibility aliases or local extensions, but are absent from the official v6 manual index and should not be counted as official v6 coverage. |
| callable-without-reference-signature | `alert` | `alert` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `alertcondition` | `alertcondition` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `bool` | `bool` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.copy` | `box.copy` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.delete` | `box.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.get_bottom` | `box.get_bottom` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.get_left` | `box.get_left` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.get_right` | `box.get_right` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.get_top` | `box.get_top` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_bgcolor` | `box.set_bgcolor` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_border_color` | `box.set_border_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_border_style` | `box.set_border_style` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_border_width` | `box.set_border_width` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_bottom` | `box.set_bottom` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_bottom_right_point` | `box.set_bottom_right_point` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_extend` | `box.set_extend` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_left` | `box.set_left` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_lefttop` | `box.set_lefttop` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_right` | `box.set_right` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_rightbottom` | `box.set_rightbottom` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text` | `box.set_text` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_color` | `box.set_text_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_font_family` | `box.set_text_font_family` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_formatting` | `box.set_text_formatting` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_halign` | `box.set_text_halign` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_size` | `box.set_text_size` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_valign` | `box.set_text_valign` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_text_wrap` | `box.set_text_wrap` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_top` | `box.set_top` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_top_left_point` | `box.set_top_left_point` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `box.set_xloc` | `box.set_xloc` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `dayofmonth` | `dayofmonth` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `dayofweek` | `dayofweek` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `fixnan` | `fixnan` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `float` | `float` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `hour` | `hour` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `indicator` | `indicator` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `int` | `int` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.copy` | `label.copy` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.delete` | `label.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.get_text` | `label.get_text` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.get_x` | `label.get_x` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.get_y` | `label.get_y` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_color` | `label.set_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_point` | `label.set_point` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_size` | `label.set_size` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_style` | `label.set_style` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_text` | `label.set_text` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_text_font_family` | `label.set_text_font_family` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_text_formatting` | `label.set_text_formatting` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_textalign` | `label.set_textalign` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_textcolor` | `label.set_textcolor` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_tooltip` | `label.set_tooltip` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_x` | `label.set_x` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_xloc` | `label.set_xloc` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_xy` | `label.set_xy` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_y` | `label.set_y` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `label.set_yloc` | `label.set_yloc` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.copy` | `line.copy` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.delete` | `line.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.get_price` | `line.get_price` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.get_x1` | `line.get_x1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.get_x2` | `line.get_x2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.get_y1` | `line.get_y1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.get_y2` | `line.get_y2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_color` | `line.set_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_extend` | `line.set_extend` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_first_point` | `line.set_first_point` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_second_point` | `line.set_second_point` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_style` | `line.set_style` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_width` | `line.set_width` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_x1` | `line.set_x1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_x2` | `line.set_x2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_xloc` | `line.set_xloc` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_xy1` | `line.set_xy1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_xy2` | `line.set_xy2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_y1` | `line.set_y1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `line.set_y2` | `line.set_y2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `linefill.delete` | `linefill.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `linefill.get_line1` | `linefill.get_line1` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `linefill.get_line2` | `linefill.get_line2` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `linefill.set_color` | `linefill.set_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `log.error` | `log.error` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `log.info` | `log.info` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `log.warning` | `log.warning` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `max_bars_back` | `max_bars_back` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `minute` | `minute` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `month` | `month` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `na` | `na` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `nz` | `nz` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `polyline.delete` | `polyline.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `runtime.error` | `runtime.error` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `second` | `second` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `string` | `string` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `syminfo.prefix` | `syminfo.prefix` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `syminfo.ticker` | `syminfo.ticker` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_bgcolor` | `table.cell_set_bgcolor` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_height` | `table.cell_set_height` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text` | `table.cell_set_text` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_color` | `table.cell_set_text_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_font_family` | `table.cell_set_text_font_family` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_formatting` | `table.cell_set_text_formatting` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_halign` | `table.cell_set_text_halign` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_size` | `table.cell_set_text_size` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_text_valign` | `table.cell_set_text_valign` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_tooltip` | `table.cell_set_tooltip` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.cell_set_width` | `table.cell_set_width` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.clear` | `table.clear` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.delete` | `table.delete` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.merge_cells` | `table.merge_cells` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_bgcolor` | `table.set_bgcolor` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_border_color` | `table.set_border_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_border_width` | `table.set_border_width` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_frame_color` | `table.set_frame_color` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_frame_width` | `table.set_frame_width` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `table.set_position` | `table.set_position` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `time` | `time` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `time_close` | `time_close` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `timestamp` | `timestamp` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `weekofyear` | `weekofyear` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| callable-without-reference-signature | `year` | `year` | needs-compile-evidence | The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against. |
| extra-alias | `array.covariance` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `color` | `transparency -> transp` | needs-compile-evidence | The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only. |
| extra-alias | `color.new` | `transparency -> transp` | needs-compile-evidence | The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only. |
| extra-alias | `color.rgb` | `transparency -> transp` | needs-compile-evidence | The checker accepts named alias 'transparency' for 'transp', but the committed v6 reference signature documents 'transp' only. |
| extra-alias | `fill` | `hline1 -> plot1` | needs-compile-evidence | The checker accepts named alias 'hline1' for 'plot1', but the committed v6 reference signature documents 'plot1' only. |
| extra-alias | `fill` | `hline2 -> plot2` | needs-compile-evidence | The checker accepts named alias 'hline2' for 'plot2', but the committed v6 reference signature documents 'plot2' only. |
| extra-alias | `matrix.concat` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `matrix.diff` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `matrix.kron` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `matrix.mult` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `matrix.sum` | `id -> id1` | needs-compile-evidence | The checker accepts named alias 'id' for 'id1', but the committed v6 reference signature documents 'id1' only. |
| extra-alias | `str.contains` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.contains` | `substring -> str` | needs-compile-evidence | The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.contains` | `target -> str` | needs-compile-evidence | The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.endswith` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.endswith` | `substring -> str` | needs-compile-evidence | The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.endswith` | `target -> str` | needs-compile-evidence | The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.length` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.lower` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.match` | `pattern -> regex` | needs-compile-evidence | The checker accepts named alias 'pattern' for 'regex', but the committed v6 reference signature documents 'regex' only. |
| extra-alias | `str.match` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.pos` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.pos` | `substring -> str` | needs-compile-evidence | The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.pos` | `target -> str` | needs-compile-evidence | The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.repeat` | `count -> repeat` | needs-compile-evidence | The checker accepts named alias 'count' for 'repeat', but the committed v6 reference signature documents 'repeat' only. |
| extra-alias | `str.repeat` | `repeat_count -> repeat` | needs-compile-evidence | The checker accepts named alias 'repeat_count' for 'repeat', but the committed v6 reference signature documents 'repeat' only. |
| extra-alias | `str.repeat` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.replace` | `str -> target` | needs-compile-evidence | The checker accepts named alias 'str' for 'target', but the committed v6 reference signature documents 'target' only. |
| extra-alias | `str.replace` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.replace` | `substring -> target` | needs-compile-evidence | The checker accepts named alias 'substring' for 'target', but the committed v6 reference signature documents 'target' only. |
| extra-alias | `str.replace_all` | `str -> target` | needs-compile-evidence | The checker accepts named alias 'str' for 'target', but the committed v6 reference signature documents 'target' only. |
| extra-alias | `str.replace_all` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.replace_all` | `substring -> target` | needs-compile-evidence | The checker accepts named alias 'substring' for 'target', but the committed v6 reference signature documents 'target' only. |
| extra-alias | `str.split` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.startswith` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.startswith` | `substring -> str` | needs-compile-evidence | The checker accepts named alias 'substring' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.startswith` | `target -> str` | needs-compile-evidence | The checker accepts named alias 'target' for 'str', but the committed v6 reference signature documents 'str' only. |
| extra-alias | `str.substring` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.trim` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `str.upper` | `string -> source` | needs-compile-evidence | The checker accepts named alias 'string' for 'source', but the committed v6 reference signature documents 'source' only. |
| extra-alias | `ta.mfi` | `series -> source` | needs-compile-evidence | The checker accepts named alias 'series' for 'source', but the committed v6 reference signature documents 'source' only. |
| member-absent-from-manual | `line.get_color` | `line.get_color` | needs-compile-evidence | The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it. |
| member-absent-from-manual | `line.get_extend` | `line.get_extend` | needs-compile-evidence | The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it. |
| member-absent-from-manual | `line.get_style` | `line.get_style` | needs-compile-evidence | The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it. |
| member-absent-from-manual | `line.get_width` | `line.get_width` | needs-compile-evidence | The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it. |
| member-absent-from-manual | `str.tointeger` | `str.tointeger` | needs-compile-evidence | The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it. |
