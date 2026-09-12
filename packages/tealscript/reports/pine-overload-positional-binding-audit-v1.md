# Pine Overload Positional Binding Audit V1

Generated at 2026-09-11T12:25:23.893Z. Measured at commit `6980895790`.

## Headline

Audited 22 overloaded-member positional binding and validation cases across input range/options, drawing coordinate/chart-point constructors, time/time_close, and timestamp.

Result: 22 OK, 0 failed.

The sweep checks the class opened by the input range-form bug: a positional argument at index N must validate against the overload actually selected for that call, not another overload sharing the member name. Success rows either expose the bound value through compiled execution metadata/drawings or match a diagnostic whose parameter name proves the selected overload was used.

## Failures

None.

## Groups

- `box.new`: 3/3 OK
- `input.float`: 2/2 OK
- `input.int`: 2/2 OK
- `label.new`: 3/3 OK
- `line.new`: 3/3 OK
- `time`: 3/3 OK
- `time_close`: 2/2 OK
- `timestamp`: 4/4 OK

## Rows

| Member | Overload | Property | Status | Evidence |
| --- | --- | --- | --- | --- |
| `input.int` | range | positional metadata binds as tooltip/inline/group/confirm/display/active | ok | parse ok; semantic ok; runtime-visible binding matched |
| `input.int` | options | positional metadata binds after options | ok | parse ok; semantic ok; runtime-visible binding matched |
| `input.float` | range | positional metadata binds as tooltip/inline/group/confirm/display/active | ok | parse ok; semantic ok; runtime-visible binding matched |
| `input.float` | options | positional metadata binds after options | ok | parse ok; semantic ok; runtime-visible binding matched |
| `label.new` | coordinate | positional style/textcolor/size/textalign/tooltip bind to coordinate slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `label.new` | chart-point | positional xloc/style/textcolor/size bind to point slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `line.new` | coordinate | positional xloc/extend/color/style/width/force_overlay bind to coordinate slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `line.new` | chart-point | positional xloc/extend/color/style/width/force_overlay bind to point slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `box.new` | coordinate | positional xloc/bgcolor/text/text_color/text_halign/text_valign bind to coordinate slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `box.new` | chart-point | positional xloc/bgcolor/text/text_color/text_halign/text_valign bind to point slots | ok | parse ok; semantic ok; runtime-visible binding matched |
| `time` | timezone | third positional string is timezone; later numbers are bars_back/timeframe_bars_back | ok | parse ok; semantic ok; compiled execution ok |
| `time` | no-timezone | third positional number is bars_back, not timezone | ok | parse ok; semantic ok; compiled execution ok |
| `time_close` | timezone | third positional string is timezone; later numbers are bars_back/timeframe_bars_back | ok | parse ok; semantic ok; compiled execution ok |
| `time_close` | no-timezone | third positional number is bars_back, not timezone | ok | parse ok; semantic ok; compiled execution ok |
| `timestamp` | dateString | single string binds as dateString | ok | parse ok; semantic ok; compiled execution ok |
| `timestamp` | numeric | first positional number binds as year | ok | parse ok; semantic ok; compiled execution ok |
| `timestamp` | timezone+numeric | first positional string plus numeric date binds as timezone/year/month/day | ok | parse ok; semantic ok; compiled execution ok |
| `label.new` | chart-point | invalid positional size blames selected point-overload size slot | ok | selected-overload diagnostic matched: Invalid label.new size: giant |
| `line.new` | chart-point | invalid positional width blames selected point-overload width slot | ok | selected-overload diagnostic matched: line.new width must be a number, got string |
| `box.new` | chart-point | invalid positional text_halign blames selected point-overload text_halign slot | ok | selected-overload diagnostic matched: Invalid box.new text_halign: sideways |
| `time` | no-timezone | invalid fourth positional blames timeframe_bars_back after no-timezone selection | ok | selected-overload diagnostic matched: time timeframe_bars_back must be a number, got string |
| `timestamp` | numeric | invalid second positional blames month after numeric-overload selection | ok | selected-overload diagnostic matched: timestamp month must be a number, got string |
