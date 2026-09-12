# Pine Optional Argument Binding Audit V1

Generated at 2026-09-11T12:15:46.578Z. Measured at commit `9421c41a46`.

## Headline

Audited 139 high-use optional-argument forms from the 75 corpus-ranked slots used by at least 25 scripts.

Result: 139 OK, 0 failed, 0 skipped.

Callable slots are checked in both named and positional form; declaration slots are checked as declaration metadata. The check is intentionally acceptance/binding only: every row parses, passes semantic checking, compiles, and exposes the expected argument value at the runtime-visible call surface or metadata field. It does not assert the downstream value semantics that the vector lane owns.

## Failures

None.

## Skipped

None.

## Groups

- `input.int`: 5 slots, 10/10 forms OK
- `input.bool`: 4 slots, 8/8 forms OK
- `label.new`: 6 slots, 12/12 forms OK
- `strategy`: 11 slots, 11/11 forms OK
- `input.string`: 5 slots, 10/10 forms OK
- `input.float`: 4 slots, 8/8 forms OK
- `input`: 4 slots, 8/8 forms OK
- `input.color`: 3 slots, 6/6 forms OK
- `strategy.exit`: 5 slots, 10/10 forms OK
- `box.new`: 6 slots, 12/12 forms OK
- `line.new`: 1 slots, 2/2 forms OK
- `input.timeframe`: 3 slots, 6/6 forms OK
- `input.source`: 3 slots, 6/6 forms OK
- `strategy.close_all`: 1 slots, 2/2 forms OK
- `strategy.entry`: 3 slots, 6/6 forms OK
- `array.new`: 2 slots, 4/4 forms OK
- `timeframe.in_seconds`: 1 slots, 2/2 forms OK
- `input.session`: 2 slots, 4/4 forms OK
- `input.time`: 2 slots, 4/4 forms OK
- `input.symbol`: 1 slots, 2/2 forms OK
- `plotchar`: 1 slots, 2/2 forms OK
- `array.new_box`: 1 slots, 2/2 forms OK
- `ta.vwap`: 1 slots, 2/2 forms OK

## Rows

| Slot | Scripts | Form | Status | Evidence |
| --- | ---: | --- | --- | --- |
| `input.int:group` | 656 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:group` | 656 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:group` | 612 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:group` | 612 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:style` | 601 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:style` | 601 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:textcolor` | 589 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:textcolor` | 589 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:overlay` | 526 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:group` | 514 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:group` | 514 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:group` | 512 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:group` | 512 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:tooltip` | 468 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:tooltip` | 468 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:title` | 350 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:title` | 350 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:tooltip` | 345 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:tooltip` | 345 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:group` | 344 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:group` | 344 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:stop` | 316 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:stop` | 316 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:tooltip` | 299 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:tooltip` | 299 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:tooltip` | 238 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:tooltip` | 238 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:inline` | 227 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:inline` | 227 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:bgcolor` | 224 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:bgcolor` | 224 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:inline` | 206 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:inline` | 206 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:inline` | 206 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:inline` | 206 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:slippage` | 200 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:xloc` | 197 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:xloc` | 197 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `line.new:xloc` | 187 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `line.new:xloc` | 187 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:inline` | 184 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:inline` | 184 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:group` | 149 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:group` | 149 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:group` | 145 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:group` | 145 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:shorttitle` | 143 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:tooltip` | 137 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:tooltip` | 137 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.close_all:comment` | 132 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.close_all:comment` | 132 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:inline` | 117 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:inline` | 117 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:group` | 116 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:group` | 116 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:margin_long` | 116 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:margin_short` | 113 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:stop` | 113 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:stop` | 113 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new:size` | 112 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new:size` | 112 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `timeframe.in_seconds:timeframe` | 106 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `timeframe.in_seconds:timeframe` | 106 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:xloc` | 104 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:xloc` | 104 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:comment` | 95 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:comment` | 95 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.session:group` | 91 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.session:group` | 91 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:calc_on_every_tick` | 90 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:textalign` | 86 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:textalign` | 86 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:inline` | 83 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:inline` | 83 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:max_bars_back` | 82 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:loss` | 79 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:loss` | 79 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:profit` | 79 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:profit` | 79 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.time:group` | 75 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.time:group` | 75 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text` | 74 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text` | 74 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_color` | 73 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_color` | 73 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:tooltip` | 65 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.color:tooltip` | 65 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.time:confirm` | 62 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.time:confirm` | 62 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new:initial_value` | 61 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new:initial_value` | 61 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:max_labels_count` | 55 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:display` | 54 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:display` | 54 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_halign` | 51 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_halign` | 51 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:tooltip` | 51 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:tooltip` | 51 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:tooltip` | 48 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:tooltip` | 48 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:inline` | 47 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.timeframe:inline` | 47 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.symbol:group` | 46 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.symbol:group` | 46 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:max_lines_count` | 46 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:display` | 45 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:display` | 45 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `plotchar:size` | 45 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `plotchar:size` | 45 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_valign` | 42 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `box.new:text_valign` | 42 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:tooltip` | 38 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input:tooltip` | 38 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:precision` | 37 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:inline` | 34 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.source:inline` | 34 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:force_overlay` | 34 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `label.new:force_overlay` | 34 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:alert_message` | 33 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:alert_message` | 33 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:qty_percent` | 32 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.exit:qty_percent` | 32 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:display` | 31 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.bool:display` | 31 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:display` | 29 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.float:display` | 29 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy:max_boxes_count` | 28 | declaration | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new_box:initial_value` | 27 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `array.new_box:initial_value` | 27 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:active` | 27 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.int:active` | 27 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:active` | 27 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.string:active` | 27 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:oca_name` | 27 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `strategy.entry:oca_name` | 27 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.session:inline` | 26 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `input.session:inline` | 26 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `ta.vwap:anchor` | 26 | named | ok | parse ok; semantic ok; compiled execution exposes the expected value |
| `ta.vwap:anchor` | 26 | positional | ok | parse ok; semantic ok; compiled execution exposes the expected value |
