# Pine Compile Evidence Request v1

Date: 2026-09-12
Prepared from parser/semantic census work at `349bb973a3`, accepted-surface
usage priority measured at `f2f1464342`, and grammar production coverage
measured at `ba9d31550a`. Readability and batching pass updated at
`b9374d14b8`.

## Purpose

These rows stayed deliberately unclassified because source-only judgement was
not enough. Each question below is answerable by pasting the minimal Pine
snippet into TradingView and checking whether the compiler accepts it for the
declared version.

For each snippet, record:

- `accepted`
- `rejected`
- exact TradingView diagnostic text if rejected
- Pine version tested

Accepted means the corresponding TealScript row becomes parser/semantic-owned.
Rejected means the row is invalid Pine by declared version. Do not infer value
parity from compile success; this request settles acceptance only.

## Start Here: Run Order And Cost

This request is batched. Do not paste one row at a time.

For every paste:

1. Paste the complete script exactly as shown.
2. Record `accepted` or `rejected`.
3. If rejected, record the exact TradingView diagnostic and the line it points
   to.
4. If a batch rejects, comment out only the failing line, then re-run the same
   batch until the rest either compiles or exposes the next rejection.

All paste scripts below declare their Pine version. Do not change the version
while testing; that would answer a different question.

Recommended first sitting:

| Step | Paste scripts | Rows answered | Why first |
| --- | ---: | ---: | --- |
| 1 | 1 | 29 | P0A: highest corpus exposure; declarations, casts, time helpers, logging, alerts. |
| 2 | 1 | 2 | P0B: `fill()` hline aliases used by 387 scripts. |
| 3 | 1 | 67 | P0C: drawing methods, the largest accepted-surface cluster. |
| 4 | 1 | 20 | P0D: table methods. |
| 5 | 1 | 5 | P0E: linefill/polyline methods. |
| 6 | 3 | 28 | P0S-A/B/C: snapshot-extra syntax TealScript accepts but the live v6 callable bundle does not document. |

The first five paste scripts settle all 123 Priority 0 accepted-surface rows.
If only one sitting is available, run P0A-P0E first. If there is time for one
more chunk, run all three P0S scripts next; they settle the inverse-risk bucket
from the snapshot-extra review.

The P0S snapshot-extra work is the inverse risk: TealScript accepts these
members/parameters today, but the live v6 callable bundle does not document
them. Run it after P0A-P0E if one sitting allows; accepted means the live bundle
or docs are incomplete and the row should stay, rejected means TealScript is
over-accepting a form TradingView refuses.

Remaining isolated questions:

| Group | Pastes | Why isolated |
| --- | ---: | --- |
| Q1 namespace questions | 4 | One rejection would mask a distinct namespace rule. |
| Q2 parse-shape questions | 3 | Each asks about a different syntax boundary. |
| Q3 semantic/receiver questions | 5 | Each has a different acceptance consequence; Q3D and Q3E also need runtime/value follow-up if accepted. |
| Q4 indentation candidates | 2 | Each asks whether a malformed-looking indentation shape is accepted. |
| Q5 invalid-cluster checks | 2 | Each checks a separate repeated invalid-Pine cluster. |
| Q6 grammar-production inversion | 2 | Each checks grammar accepted by TealScript but reached by no snippet or corpus script. |
| Q7 legacy const-int division value | 2 | Acceptance is documented, but negative quotient rounding needs compiler/runtime evidence before implementation. |

Whole request cost: 26 initial pastes total, normally two sittings. The
high-exposure accepted-surface work costs 5 batch pastes and should be run
first if only one sitting is available; the snapshot-extra inverse-risk batch
adds 3 more pastes and should be next if time remains.

Closed since the first version of this request:

- `ticker.kagi(symbol, reversal)` / v7 semantic census row `0249` is no longer
  an open compile-evidence question. It now has live-signature support and a
  passing value-vector case, so it was removed from the isolated paste list.

## Priority 0: Used Accepted-Surface Rows Missing From The Manual Snapshot

Source: `pine-v6-accepted-surface-usage-priority-v1.md`.

The v6 accepted-surface inversion had 167 rows needing compiler evidence. The
2,506-script corpus exercises 123 of them: 121 callable rows with no reference
signature in the committed manual snapshot, plus 2 `fill()` argument aliases
proved by corpus argument shapes. The remaining 44 rows have no committed corpus
usage and are intentionally not part of this paste request.

This is most of the evidence queue, not a handful. The finding is that the
committed v6 manual signature snapshot is materially thinner than the accepted
language surface real scripts touch. Manual-derived oracles remain useful, but
absence from the snapshot should route to compiler evidence before it becomes a
rejection rule.

For the rows below, accepted means the manual/signature snapshot is incomplete
and TealScript should keep accepting the construct. Rejected means TealScript is
over-accepting ordinary Pine source and must tighten the corresponding v6
callable or alias.

### P0A: Core declarations, casts, time helpers and diagnostics

Rows settled if accepted/rejected:

- `indicator` (1833 scripts), `float` (1797), `int` (1776), `na` (1642),
  `bool` (1195), `string` (869), `nz` (838), `time` (589),
  `alertcondition` (465), `runtime.error` (433), `max_bars_back` (298),
  `alert` (255), `timestamp` (238), `log.info` (171), `hour` (149),
  `year` (146), `syminfo.ticker` (146), `month` (144), `dayofweek` (130),
  `minute` (124), `dayofmonth` (115), `weekofyear` (95), `log.error` (71),
  `time_close` (70), `fixnan` (43), `syminfo.prefix` (37), `second` (34),
  `log.warning` (11).

Paste:

```pine
//@version=6
indicator("compile evidence accepted surface core")
max_bars_back(close, 100)
value = fixnan(nz(float(int(close)), 0.0))
flag = bool(value > 0)
text = string(syminfo.prefix) + ":" + syminfo.ticker
stamp = timestamp(year, month, dayofmonth, hour, minute, second)
inSession = not na(time(timeframe.period, "0930-1600")) or not na(time_close(timeframe.period, "0930-1600"))
calendar = dayofweek + weekofyear
alertcondition(flag, "core condition", text)
if false
    alert(text)
    log.info(text)
    log.error(text)
    log.warning(text)
    runtime.error(text)
plot(value + stamp * 0 + calendar * 0 + (inSession ? 1 : 0))
```

### P0B: `fill()` hline aliases

Rows settled if accepted/rejected:

- `fill:hline1 -> plot1` (argument-shape proxy, `fill()` appears in 387
  scripts), `fill:hline2 -> plot2` (argument-shape proxy, `fill()` appears in
  387 scripts).

Paste:

```pine
//@version=6
indicator("compile evidence fill aliases")
top = hline(1)
bottom = hline(0)
fill(hline1 = top, hline2 = bottom, color = color.new(color.blue, 80), title = "band")
plot(close)
```

### P0C: Drawing object callables

Rows settled if accepted/rejected:

- `label.delete` (274), `line.delete` (240), `box.delete` (143),
  `label.set_text` (123), `box.set_right` (92), `line.set_x2` (87),
  `line.set_color` (85), `label.set_xy` (83), `line.set_xy2` (80),
  `line.set_xy1` (77), `label.set_textcolor` (66), `box.set_bgcolor` (65),
  `label.set_x` (61), `label.set_y` (60), `box.set_top` (60),
  `label.set_color` (57), `box.set_bottom` (55), `box.set_border_color` (53),
  `line.set_y2` (50), `line.set_y1` (45), `line.set_width` (42),
  `label.set_style` (41), `line.get_y1` (39), `line.set_style` (38),
  `box.get_top` (37), `line.set_extend` (37), `box.get_bottom` (36),
  `box.set_rightbottom` (35), `label.set_size` (34), `box.set_lefttop` (33),
  `label.set_tooltip` (32), `line.get_x1` (31), `box.set_text` (30),
  `line.get_y2` (27), `box.set_extend` (27), `line.get_x2` (27),
  `box.set_text_color` (23), `box.set_text_size` (23), `line.set_x1` (22),
  `line.set_second_point` (22), `box.set_text_valign` (21),
  `line.set_first_point` (21), `box.set_left` (20), `box.get_right` (19),
  `box.set_text_halign` (19), `box.set_border_width` (18),
  `box.get_left` (17), `label.get_x` (17), `box.copy` (16),
  `label.get_text` (13), `label.get_y` (13), `box.set_border_style` (13),
  `label.set_xloc` (13), `line.get_price` (12), `line.copy` (12),
  `box.set_text_font_family` (11), `label.set_textalign` (11),
  `line.set_xloc` (11), `label.copy` (10), `label.set_text_font_family` (9),
  `box.set_text_wrap` (7), `box.set_top_left_point` (6),
  `label.set_yloc` (6), `box.set_bottom_right_point` (6),
  `label.set_point` (5), `box.set_xloc` (4),
  `label.set_text_formatting` (4), `box.set_text_formatting` (4).

Paste:

```pine
//@version=6
indicator("compile evidence accepted surface drawings", overlay = true)
var line ln = line.new(bar_index, close, bar_index + 1, close + 1)
var label lb = label.new(bar_index, close, "x")
var box bx = box.new(bar_index, close + 1, bar_index + 1, close)
if barstate.islast
    first = chart.point.now(close)
    secondPoint = chart.point.from_index(bar_index + 1, close + 1)
    line.set_first_point(ln, first)
    line.set_second_point(ln, secondPoint)
    line.set_x1(ln, bar_index)
    line.set_x2(ln, bar_index + 1)
    line.set_y1(ln, close)
    line.set_y2(ln, close + 1)
    line.set_xy1(ln, bar_index, close)
    line.set_xy2(ln, bar_index + 1, close + 1)
    line.set_color(ln, color.blue)
    line.set_width(ln, 2)
    line.set_style(ln, line.style_dashed)
    line.set_extend(ln, extend.right)
    line.set_xloc(ln, xloc.bar_index)
    price = line.get_price(ln, bar_index)
    x1 = line.get_x1(ln)
    x2 = line.get_x2(ln)
    y1 = line.get_y1(ln)
    y2 = line.get_y2(ln)
    copiedLine = line.copy(ln)
    line.delete(copiedLine)
    label.set_point(lb, first)
    label.set_x(lb, bar_index)
    label.set_y(lb, close)
    label.set_xy(lb, bar_index, close)
    label.set_xloc(lb, xloc.bar_index)
    label.set_yloc(lb, yloc.price)
    label.set_text(lb, "price " + str.tostring(price + x1 + x2 + y1 + y2))
    label.set_textcolor(lb, color.white)
    label.set_color(lb, color.blue)
    label.set_style(lb, label.style_label_up)
    label.set_size(lb, size.small)
    label.set_tooltip(lb, "tip")
    label.set_textalign(lb, text.align_center)
    label.set_text_font_family(lb, font.family_monospace)
    label.set_text_formatting(lb, text.format_bold)
    lx = label.get_x(lb)
    ly = label.get_y(lb)
    lt = label.get_text(lb)
    copiedLabel = label.copy(lb)
    label.delete(copiedLabel)
    box.set_lefttop(bx, bar_index, close + 1)
    box.set_rightbottom(bx, bar_index + 1, close)
    box.set_top_left_point(bx, first)
    box.set_bottom_right_point(bx, secondPoint)
    box.set_left(bx, bar_index)
    box.set_right(bx, bar_index + 1)
    box.set_top(bx, close + 1)
    box.set_bottom(bx, close)
    box.set_bgcolor(bx, color.new(color.blue, 80))
    box.set_border_color(bx, color.blue)
    box.set_border_width(bx, 1)
    box.set_border_style(bx, line.style_solid)
    box.set_extend(bx, extend.none)
    box.set_xloc(bx, xloc.bar_index)
    box.set_text(bx, lt)
    box.set_text_color(bx, color.white)
    box.set_text_size(bx, size.small)
    box.set_text_halign(bx, text.align_center)
    box.set_text_valign(bx, text.align_center)
    box.set_text_font_family(bx, font.family_monospace)
    box.set_text_wrap(bx, text.wrap_auto)
    box.set_text_formatting(bx, text.format_bold)
    bt = box.get_top(bx)
    bb = box.get_bottom(bx)
    bl = box.get_left(bx)
    br = box.get_right(bx)
    copiedBox = box.copy(bx)
    box.delete(copiedBox)
plot(close)
```

### P0D: Table callables

Rows settled if accepted/rejected:

- `table.merge_cells` (87), `table.clear` (54), `table.delete` (28),
  `table.set_border_color` (12), `table.set_frame_color` (12),
  `table.cell_set_text_size` (11), `table.set_frame_width` (11),
  `table.cell_set_bgcolor` (10), `table.cell_set_text` (10),
  `table.set_border_width` (10), `table.set_bgcolor` (9),
  `table.cell_set_height` (8), `table.cell_set_text_color` (7),
  `table.cell_set_tooltip` (7), `table.set_position` (7),
  `table.cell_set_text_halign` (6), `table.cell_set_text_font_family` (6),
  `table.cell_set_text_valign` (6), `table.cell_set_width` (6),
  `table.cell_set_text_formatting` (3).

Paste:

```pine
//@version=6
indicator("compile evidence accepted surface tables")
var table panel = table.new(position.top_right, 3, 3)
if barstate.islast
    table.set_position(panel, position.bottom_right)
    table.set_bgcolor(panel, color.new(color.black, 80))
    table.set_frame_color(panel, color.gray)
    table.set_frame_width(panel, 1)
    table.set_border_color(panel, color.gray)
    table.set_border_width(panel, 1)
    table.cell(panel, 0, 0, "A")
    table.cell(panel, 1, 0, "B")
    table.merge_cells(panel, 0, 1, 1, 1)
    table.cell_set_text(panel, 0, 0, "close")
    table.cell_set_bgcolor(panel, 0, 0, color.blue)
    table.cell_set_text_color(panel, 0, 0, color.white)
    table.cell_set_text_size(panel, 0, 0, size.small)
    table.cell_set_text_halign(panel, 0, 0, text.align_center)
    table.cell_set_text_valign(panel, 0, 0, text.align_center)
    table.cell_set_text_font_family(panel, 0, 0, font.family_monospace)
    table.cell_set_text_formatting(panel, 0, 0, text.format_bold)
    table.cell_set_width(panel, 0, 0, 10)
    table.cell_set_height(panel, 0, 0, 5)
    table.cell_set_tooltip(panel, 0, 0, "tip")
    table.clear(panel, 2, 2)
    doomed = table.new(position.bottom_left, 1, 1)
    table.delete(doomed)
plot(close)
```

### P0E: Linefill and polyline callables

Rows settled if accepted/rejected:

- `linefill.delete` (25), `polyline.delete` (21), `linefill.set_color` (6),
  `linefill.get_line1` (6), `linefill.get_line2` (4).

Paste:

```pine
//@version=6
indicator("compile evidence accepted surface linefill polyline", overlay = true)
var line top = line.new(bar_index, close + 1, bar_index + 1, close + 1)
var line bottom = line.new(bar_index, close, bar_index + 1, close)
var linefill band = linefill.new(top, bottom, color.new(color.blue, 80))
if barstate.islast
    linefill.set_color(band, color.new(color.green, 80))
    l1 = linefill.get_line1(band)
    l2 = linefill.get_line2(band)
    temporaryFill = linefill.new(l1, l2, color.new(color.red, 90))
    linefill.delete(temporaryFill)
    pts = array.from(chart.point.now(close), chart.point.from_index(bar_index + 1, close + 1))
    pl = polyline.new(pts)
    polyline.delete(pl)
plot(close)
```

## Priority 0S: Snapshot-Extra Rows Missing From Live Callable Entries

Source: `pine-v6-reference-snapshot-integrity-v1.md` and
`pine-v6-snapshot-extra-live-review-v1.md`.

The live v6 callable bundle does not document these 28 TealScript-accepted
members or parameters. That is not enough to remove them: `matrix.sort:sort_field`
proved that a partial source can omit real Pine syntax. These batches ask the
compiler directly.

For the rows below, accepted means TealScript should keep accepting the row and
the live-reference/snapshot audit needs an allowlist or better extractor.
Rejected means TealScript is over-accepting source that TradingView refuses.

### P0S-A: Extra parameters and named aliases

Rows settled if accepted/rejected:

- `bgcolor:transp`
- `input.text_area:inline`
- `str.length:source`
- `str.split:source`

Paste:

```pine
//@version=6
indicator("compile evidence snapshot extra params")
area = input.text_area("body", "Area", inline = "areaRow")
lengthBySource = str.length(source = "abc")
partsBySource = str.split(source = "A:B", separator = ":")
bgcolor(color.blue, transp = 50)
plot(lengthBySource + array.size(partsBySource) + str.length(area) * 0)
```

### P0S-B: Array, matrix, math and timeframe extra members

Rows settled if accepted/rejected:

- `array.new_chart_point`, `array.new_polyline`
- `matrix.add_column`, `matrix.column`, `matrix.is_valid`,
  `matrix.new_bool`, `matrix.new_color`, `matrix.new_float`,
  `matrix.new_int`, `matrix.new_string`, `matrix.remove_column`
- `math.clamp`, `math.tanh`, `math.trunc`
- `timeframe.to_seconds`

Paste:

```pine
//@version=6
indicator("compile evidence snapshot extra collections math", overlay = true)
points = array.new_chart_point(1, chart.point.now(close))
polys = array.new_polyline(0)
boolMatrix = matrix.new_bool(1, 1, true)
colorMatrix = matrix.new_color(1, 1, color.blue)
floatMatrix = matrix.new_float(2, 2, 1.0)
intMatrix = matrix.new_int(1, 1, 1)
stringMatrix = matrix.new_string(1, 1, "x")
matrix.add_column(floatMatrix, 1, array.from(2.0, 3.0))
columnValues = matrix.column(floatMatrix, 0)
removedColumn = matrix.remove_column(floatMatrix, 0)
validMatrix = matrix.is_valid(floatMatrix)
mathValue = math.clamp(close, 1.0, 2.0) + math.tanh(close) + math.trunc(close)
seconds = timeframe.to_seconds("1D")
plot(mathValue + seconds * 0 + (validMatrix ? 1 : 0) + array.size(points) + array.size(polys) + array.size(columnValues) + array.size(removedColumn) + matrix.rows(boolMatrix) + matrix.rows(colorMatrix) + matrix.rows(intMatrix) + matrix.rows(stringMatrix))
```

### P0S-C: TA extra callable members

Rows settled if accepted/rejected:

- `ta.adx`, `ta.bar_index`, `ta.covariance`, `ta.dema`, `ta.kst`,
  `ta.obv` callable form, `ta.smma`, `ta.sum`, `ta.tema`

Paste:

```pine
//@version=6
indicator("compile evidence snapshot extra ta")
[kstLine, kstSignal] = ta.kst(close, 10, 15, 20, 30, 10, 10, 10, 15, 9)
value =
     ta.adx(14)
   + ta.bar_index(close)
   + ta.covariance(close, open, 5)
   + ta.dema(close, 5)
   + kstLine
   + kstSignal
   + ta.obv(close, volume)
   + ta.smma(close, 5)
   + ta.sum(close, 5)
   + ta.tema(close, 5)
plot(value)
```

## Priority 1: Function/Type Names Reused As Values

This is highest value because namespace separation already produced real fixes
today in published TradingView/LuxAlgo rows. One compiler answer here settles
most of the remaining semantic unknowns.

### Q1A: Function and result variable share the same name, v6

Rows settled if accepted/rejected:

- v5 semantic census: `0053`, `0066`, `0249`, `0371`, `0372`
- v6 semantic census: `0061`

Paste:

```pine
//@version=6
indicator("compile evidence function value v6")
calc(simple int length = 14) =>
    length + 1
calc = calc(2)
plot(calc)
```

Accepted means TealScript must allow a function and a value declaration with
the same identifier when the value initializer calls the function. Rejected
means these rows are invalid Pine.

### Q1B: Function and value share the same name, v5

Rows settled if accepted/rejected:

- v5 semantic census: `0780`, `0840`
- v6 semantic census: `0297`, `0418`, `0419`, `0420`, `0422`, `0423`, `0424`,
  `0453`, `0483`, `0537`
- v7 semantic census: `0058`, `0131`, `0342`, `0418`, `0419`, `0420`, `0422`,
  `0423`, `0424`, `0440`

Paste:

```pine
//@version=5
indicator("compile evidence function value v5")
ma(source, simple int length) =>
    ta.sma(source, length)
ma = ma(close, 10)
plot(ma)
```

Accepted means TealScript must allow the v5 function/value collision family.
Rejected means the rows are invalid Pine. This does not settle duplicate global
value/value rows; see Q1D.

### Q1C: Type and factory function share the same name, v5

Rows settled if accepted/rejected:

- v6 semantic census: `0426`

Paste:

```pine
//@version=5
indicator("compile evidence type factory")
type coneValues
    float value
coneValues(float source) =>
    coneValues.new(source)
item = coneValues(close)
plot(item.value)
```

Accepted means TealScript must allow a user-defined type and factory function
with the same identifier. Rejected means row `0426` is invalid Pine.

### Q1D: Plain duplicate global values, control

Rows this controls:

- v5/v6 duplicate bucket rows that appear to be plain global redeclarations:
  v5 `0484`, v6 `0199`, v6 `0970`

Paste:

```pine
//@version=6
indicator("compile evidence duplicate value control")
a = 1
a = 2
plot(a)
```

Rejected confirms these are invalid duplicate globals and should not be folded
into the function/value namespace question. Accepted would be surprising and
would mean the duplicate-symbol rule needs a broader review.

## Priority 2: V7 Parse Shapes

### Q2A: Condition-only switch arm with `=>` on the following indented line

Rows settled if accepted/rejected:

- v7 parse census: `0078`, `0079`, `0080`

Paste:

```pine
//@version=5
indicator("compile evidence switch arrow continuation")
f(x) =>
    switch
        x > 0
            => 1
        => 0
plot(f(close))
```

Accepted means TealScript has a parser gap for switch arm continuations.
Rejected means the three rows are invalid Pine/source-copy artifacts.

### Q2B: Comma-separated import declarations on one line

Rows settled if accepted/rejected:

- v7 parse census: `0181`

Paste:

```pine
//@version=5
indicator("compile evidence comma imports")
import PineCoders/Time/3 as pct, import TradingView/TechnicalRating/1 as rating
plot(close)
```

Accepted means TealScript should parse comma-separated import declarations.
Rejected means row `0181` is invalid Pine or a source-copy artifact.

### Q2C: Tuple declaration with `=` after a blank continuation line

Rows settled if accepted/rejected:

- v7 parse census: `0253`

Paste:

```pine
//@version=5
indicator("compile evidence blank tuple equals")
pair() =>
    [1, 2]

[left, right]

  = pair()
plot(left + right)
```

Accepted means TealScript has a parser gap for tuple declaration continuations
across blank lines. Rejected means row `0253` is invalid Pine/source-copy
artifact.

## Priority 3: Semantic Scoping And Receiver Questions

### Q3A: Forward global reference inside a function body

Rows settled if accepted/rejected:

- v5/v6 semantic census: v5 `0489`, v5 `0495`

Paste:

```pine
//@version=6
indicator("compile evidence forward global in function")
f() =>
    close > limit
value = f()
limit = input.float(10)
plot(value ? 1 : 0)
```

Accepted means TealScript must allow function bodies to reference globals
declared later in source order. Rejected means the two rows are invalid Pine.

### Q3B: Comma-chain assignment plus `break` keeps outer local visible

Rows settled if accepted/rejected:

- v5/v6 semantic census: v6 `0486`
- v7 semantic census: `0441`, `0442`

Paste:

```pine
//@version=5
indicator("compile evidence comma break scope")
check(values) =>
    swept = false
    for value in values
        if value > 1
            swept := true, break
    swept
plot(check(array.from(0, 2)) ? 1 : 0)
```

Accepted means any remaining TealScript `Unknown identifier: swept` result is
a semantic scoping bug. Rejected means the rows are invalid Pine despite the
parser now preserving the AST boundary.

### Q3C: Nested local declaration remains visible after an inner loop

Rows settled if accepted/rejected:

- v7 semantic census: `0243`

Paste:

```pine
//@version=6
indicator("compile evidence nested local visibility")
values = array.from(1, 2)
seen = array.new<int>()
for i = 0 to array.size(values) - 1
    found = false
    for k = 0 to array.size(seen) - 1
        if array.get(seen, k) == i
            found := true, break
    if not found
        array.push(seen, i)
plot(array.size(seen))
```

Accepted means TealScript must keep same-block locals visible after an inner
loop. Rejected means row `0243` is invalid Pine due block/local scoping.

### Q3D: Collection mutating receiver method on a call result

Rows settled if accepted/rejected:

- v7 semantic census: `0010`

Paste:

```pine
//@version=6
indicator("compile evidence array call-result method")
values = array.from(1, 2, 3)
array.copy(values).fill(9)
plot(array.copy(values).get(0))
```

Accepted means TealScript should bind receiver methods such as `fill()` on
collection call results. Rejected means row `0010` is invalid Pine. Compile
success does not answer whether mutations on the temporary should affect later
values; that would be a runtime/value question.

### Q3E: `request.security()` lookahead ternary with `na`

Rows settled if accepted/rejected:

- v5/v6 semantic census: v6 `0368`

Paste:

```pine
//@version=6
indicator("compile evidence lookahead ternary na")
useLookahead = input.bool(true)
value = request.security(syminfo.tickerid, "D", close, lookahead = useLookahead ? barmerge.lookahead_on : na)
plot(value)
```

Accepted means TealScript's barmerge-mode qualifier check is too strict for
this `na` fallback shape. Rejected confirms the current loud refusal. Compile
success only settles acceptance; exact lookahead behavior would still need
runtime/value evidence.

## Priority 4: Malformed Indentation Candidates

### Q4A: Same-indent `if` body

Rows settled if accepted/rejected:

- AST structure invariant sweep: v5 `0651`

Paste:

```pine
//@version=5
strategy("compile evidence same-indent if body")
entryBarIndex = bar_index
maxHoldBarsInput = 1
if not na(entryBarIndex) and (bar_index - entryBarIndex) >= maxHoldBarsInput
strategy.close_all(comment="timeout")
plot(close)
```

Accepted means the parser/invariant must account for same-indent statement
bodies. Rejected means row `0651` is malformed indentation, not a TealScript
parser gap.

### Q4B: Same-indent `for` after `if`

Rows settled if accepted/rejected:

- AST structure invariant sweep: v7 `0438`

Paste:

```pine
//@version=6
indicator("compile evidence same-indent for")
levels = array.from(1, 2, 3)
if array.size(levels) > 0
for i = 0 to array.size(levels) - 1
    plot(array.get(levels, i))
```

Accepted means the parser/invariant must account for this indentation style.
Rejected means row `0438` is malformed indentation, not a TealScript parser
gap.

## Rows And Questions Index

| Source | Rows | Question |
| --- | --- | --- |
| v6 accepted-surface usage priority | 123 corpus-exercised manual-snapshot gaps from `pine-v6-accepted-surface-usage-priority-v1.md` | P0A, P0B, P0C, P0D, P0E |
| v5/v6 semantic census duplicate function/value/type family | v5 `0053`, `0066`, `0249`, `0371`, `0372`, `0780`, `0840`; v6 `0061`, `0297`, `0418`, `0419`, `0420`, `0422`, `0423`, `0424`, `0426`, `0453`, `0483`, `0537`, `0622` | Q1A, Q1B, Q1C |
| v5/v6 semantic census duplicate global controls | v5 `0484`; v6 `0199`, `0970` | Q1D |
| v5/v6 semantic census unknown identifiers | v5 `0489`, `0495`; v6 `0486` | Q3A, Q3B |
| v5/v6 semantic census barmerge lookahead | v6 `0368` | Q3E |
| v7 parse census | `0078`, `0079`, `0080`, `0181`, `0253` | Q2A, Q2B, Q2C |
| v7 semantic census | `0010`, `0058`, `0131`, `0243`, `0342`, `0418`, `0419`, `0420`, `0422`, `0423`, `0424`, `0440`, `0441`, `0442` | Q1B, Q3B, Q3C, Q3D |
| AST structure invariant sweep | v5 `0651`, v7 `0438` | Q4A, Q4B |
| grammar production coverage inversion | `UntypedTypeFieldDeclaration`; `LambdaLookahead`, `LambdaExpression`, `LambdaParams` from `pine-grammar-production-coverage-v1.md` | Q6A, Q6B |

## Not Settled By Compile Alone

These questions have an acceptance component, but compile success does not
settle runtime/value parity:

- Q3D: receiver method calls on temporary collection values. Accepted means the
  method is legal syntax/semantics; separate value evidence is needed if later
  behavior matters.
- Q3E: `lookahead = condition ? barmerge.lookahead_on : na`. Accepted means the
  argument shape is legal; exact requested-bar behavior remains a runtime/value
  question.

## Priority 5: Invalid-Pine Cluster Acceptance Questions

These questions come from `pine-corpus-invalid-clusters-v1.md`: rows previously classified invalid Pine, clustered by repeated shape and independent repos. They are acceptance checks only; rejected means the invalid classification holds.

### Q5A: `request.footprint()` one-argument form

Rows settled if accepted/rejected:

- v7 invalid cluster: `0103` (folknor/pine-tools)
- v7 invalid cluster: `0227` (raybird/pine-trading-strategies)
- v7 invalid cluster: `0239` (piecioshka/tradingview-pine-scripts)
- v7 invalid cluster: `0248` (ferranbt/pinecone)

Paste:

```pine
//@version=6
indicator("compile evidence footprint arity")
fp = request.footprint(10)
plot(footprint.total_volume(fp))
```

Accepted means `request.footprint` has a legal one-argument overload. Rejected confirms the cluster is invalid Pine.

### Q5B: `matrix.sum()` zero/one-argument aggregate forms

Rows settled if accepted/rejected:

- v7 invalid cluster: `0155` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0167` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0168` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0201` (folknor/pine-tools)
- v7 invalid cluster: `0202` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0203` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0204` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0205` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0206` (helenananaa/pine-compat-runtime)
- v7 invalid cluster: `0207` (helenananaa/pine-compat-runtime)

Paste:

```pine
//@version=6
indicator("compile evidence matrix sum arity")
m = matrix.new<float>(2, 2, 1.0)
plot(matrix.sum(m))
```

Accepted means TealScript is missing a legal aggregate overload. Rejected confirms that the repeated v7 rows are invalid Pine.

### Cluster Ranking

| Shape | Rows | Repos | Authors | Priority |
| --- | --- | --- | --- | --- |
| request.footprint one-argument form | 4 | 4 | 4 | recommended |
| matrix.sum used as zero/one-argument aggregate | 10 | 2 | 2 | recommended |

### Lower-Independence Watch

These shapes look acceptance-like but are concentrated in one repo or otherwise lack independent-source support. They should be pasted only after the multi-repo questions above, or if nearby compile evidence is already being collected.

| Shape | Rows | Repos | Authors | Why not promoted |
| --- | --- | --- | --- | --- |
| camelCase strategy declaration arguments | 7 | 1 | 1 | single source/repo family |
| table.cell_set_text_wrap helper/member | 7 | 1 | 1 | single source/repo family |
| block-local variable used outside scope | 3 | 2 | 2 | lower-frequency acceptance shape |
| v6 enum fields with numeric values | 4 | 1 | 1 | single source/repo family |
| nested collection template type | 3 | 1 | 1 | single source/repo family |
| comma-chained import statements | 1 | 1 | 1 | single source/repo family |
| exported library parameter captured by request.security expression | 1 | 1 | 1 | single source/repo family |
| function-call expression used as tuple lvalue | 1 | 1 | 1 | single source/repo family |
| generic input step argument under v5 | 1 | 1 | 1 | single source/repo family |
| strategy.close_all when argument | 1 | 1 | 1 | single source/repo family |
| table.cell text_wrap argument | 1 | 1 | 1 | single source/repo family |
| unknown math.cbrt builtin | 1 | 1 | 1 | single source/repo family |
| unknown runtime.log builtin | 1 | 1 | 1 | single source/repo family |

## Priority 6: Grammar Production Inversion Questions

These questions come from `pine-grammar-production-coverage-v1.md`: productions
accepted by TealScript's grammar but reached by neither the 85 committed grammar
snippets nor the 2,506 pinned corpus scripts. They are acceptance checks only.
Accepted means the grammar surface is real Pine and needs snippet coverage;
rejected means TealScript is over-accepting ordinary Pine source.

### Q6A: Untyped UDT field declaration

Rows settled if accepted/rejected:

- grammar production coverage: `UntypedTypeFieldDeclaration`

Paste:

```pine
//@version=6
indicator("compile evidence untyped UDT field")
type Holder
    value = 1
h = Holder.new()
plot(h.value)
```

Accepted means Pine allows UDT fields without an explicit type annotation and
TealScript should add grammar snippet coverage for that form. Rejected means
TealScript should reject untyped UDT fields for v6.

### Q6B: Parenthesized lambda expression

Rows settled if accepted/rejected:

- grammar production coverage: `LambdaLookahead`
- grammar production coverage: `LambdaExpression`
- grammar production coverage: `LambdaParams`

Paste:

```pine
//@version=6
indicator("compile evidence lambda expression")
f = (x) => x + 1
plot(f(close))
```

Accepted means Pine has a legal lambda-expression form and TealScript needs
snippet coverage for it. Rejected means TealScript is over-accepting
JavaScript-style lambda syntax and should reject `(params) => expr`.

## Priority 7: Legacy Const-Int Division Value Question

The v5 migration guide documents that v5 divides two `const int` values using
integer division, while `input`, `simple`, or `series` int division preserves a
fractional remainder. It gives positive examples and does not settle the
negative quotient direction. The v5 operators page documents only the `int`
result type for `int / int`, and the v4 operators page likewise states only the
type. The v5 operators page does carry a floor-quotient formula nearby, but it
is for `%`, not `/`; do not copy that modulo rule into division. The migration
guide says integer division "discards" fractional remainders, which may suggest
truncation, but its examples are positive, so do not implement truncation from
that wording either. Do not infer floor or truncation from the modulo rule or
from positive examples.

These are value checks, not acceptance checks. Paste each script and record the
Data Window values on the last bar:

- `negativeConstQuotient`
- `positiveConstQuotient`
- `runtimeQuotient`, where present
- Pine version tested

### Q7A: v5 negative const-int division quotient

```pine
//@version=5
indicator("compile evidence v5 const int division quotient")
negativeConstQuotient = -7 / 2
positiveConstQuotient = 7 / 2
runtimeQuotient = bar_index >= 0 ? -7 / 2 : na
plot(negativeConstQuotient, "negativeConstQuotient")
plot(positiveConstQuotient, "positiveConstQuotient")
plot(runtimeQuotient, "runtimeQuotient")
```

If `negativeConstQuotient` is `-3`, v5 const-int division truncates toward zero.
If it is `-4`, it floors toward negative infinity. If `runtimeQuotient`
preserves `-3.5`, the const-only distinction is confirmed separately from the
rounding direction.

### Q7B: v4 negative int division quotient

```pine
//@version=4
study("compile evidence v4 int division quotient")
negativeQuotient = -7 / 2
positiveQuotient = 7 / 2
plot(negativeQuotient, title="negativeQuotient")
plot(positiveQuotient, title="positiveQuotient")
```

The v4 operators page states only the `integer` result type for integer
operands. If accepted, record the plotted values before applying any v4 quotient
rule in TealScript.
