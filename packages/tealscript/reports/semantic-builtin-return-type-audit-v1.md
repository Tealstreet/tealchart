# Semantic Builtin Return Type Audit v1

Date: 2026-09-12

## Verdict

One return-type defect cluster was found.

TealScript's value-producing builtin return inference is consistent on the
audited scalar, tuple, dependent, collection, `na`, drawing-handle, and UDT
shapes. The remaining wrong return type is concentrated in one shared path:
documented side-effect builtins that return Pine `void` often fall through to
semantic `unknown`, and `unknown` is assignable to typed variables.

Follow-up note: the first draft of this audit over-classified
`matrix.remove_row()`, `matrix.remove_col()`, and `matrix.remove_column()` as
`void`. The manual/reference surface and an existing local matrix test show
those calls return row/column arrays. They are excluded from the corrected
`void` count below and now have explicit array return inference.

Counts:

- TealScript v6 callable signatures walked: 513.
- Derived documented side-effect/`void` candidates probed: 124.
- Candidates already refusing assignment as `void`: 10.
- Candidates incorrectly accepted as assignable values: 114.
- Wrong non-void return type clusters found: 0.
- Wrong return type clusters found overall: 1, the side-effect/`void` cluster.

The fix shape is shared, not member-by-member: return inference needs a derived
or centralized `void` path for side-effect builtins instead of allowing visual,
drawing, table, matrix, strategy, log, alert, and related calls to fall through
to `unknown`.

## Documentation Basis

TradingView's type system specifies that all expressions have a type/qualifier
pair determining where the value can be used. It also defines the `void` type
for functions that produce side effects without returning usable data. Such
calls cannot be assigned to variables or used in other calculations.

The same page names `plot()` and `hline()` as the plot-family calls that return
usable IDs, and says the other plot-related functions, including `plotchar()`,
`plotshape()`, `plotarrow()`, `plotbar()`, `plotcandle()`, `barcolor()`, and
`bgcolor()`, return `void`.

It also states the broader rule: functions that create alert triggers, generate
chart visuals, or modify collections without returning usable data have return
type `void`.

The report intentionally does not use PineTS or Pine-A-Script as return-type
evidence. This is a manual/checker/vector audit only.

## Derived Scope

The sweep walked the TealScript v6 signature table via
`builtinSignatureMapForCoverage({ pineVersion: 6 })` rather than hand-writing a
surface list.

The focused probes covered:

- fixed scalar returns: `math.*`, `str.*`, `color.*`, `time*`, `timeframe.*`,
  `syminfo.*`, `strategy.*` accessors, `ta.*` scalar families;
- argument-dependent returns: `math.abs`, `math.max`, `math.min`,
  `math.round`, `ta.change`, `ta.valuewhen`, `ta.highest`, `ta.lowest`,
  `ta.pivothigh`, `ta.pivotlow`, `input`, `input.source`, `input.enum`,
  `nz`, `fixnan`, `iff`, and casts;
- tuple returns: `ta.bb`, `ta.dmi`, `ta.kc`, `ta.kst`, `ta.macd`,
  `ta.supertrend`, and `ta.vwap` overloads with standard-deviation output;
- `na` typing carriers: typed assignment from `str.tonumber()` and other
  return-type paths where runtime `NaN`/`na` cannot distinguish the underlying
  Pine type;
- collections: typed `array.new*`, `array.from`, array element reads and
  helpers, `matrix.new*`, matrix reads/helpers including `matrix.mult`, and
  `map.new`, `map.get`, `map.remove`, `map.keys`, `map.values`;
- reference and special returns: drawing constructors, `chart.point.*`,
  `table.new`, `plot`, `hline`, UDT constructors, imported UDT constructors,
  and `*.copy` helpers where currently modeled.

The existing `src/semantic/semanticTypeInvariants.ts` checker was used as an
independent local cross-check for the value-producing subset, but not as the
only oracle. It independently re-derives many scalar, tuple, collection, and
handle return shapes.

The standalone bracket `ArrayExpression` ambiguity recorded during the
qualifier-propagation audit remains a scoped ambiguity in TealScript's AST
model for Pine tuple syntax. It is not counted in this return-type defect
total.

## Positive Probes

A focused semantic probe accepted the documented shapes below and rejected
incompatible assignments:

```pine
//@version=6
indicator("x")
[bbM, bbU, bbL] = ta.bb(close, 2, 2)
[macd, signal, hist] = ta.macd(close, 12, 26, 9)
[st, dir] = ta.supertrend(3.0, 10)
float a = bbM + macd + st
int b = dir
```

```pine
//@version=6
indicator("x")
array<int> ai = array.new_int(1, 1)
int i = array.get(ai, 0)
array<float> af = array.abs(array.new_int(1, -1))
matrix<float> mf = matrix.new<float>(2, 2, 1.0)
float mv = matrix.get(mf, 0, 0)
array<float> row = matrix.row(mf, 0)
matrix<float> inv = matrix.inv(mf)
array<float> prod = matrix.mult(mf, array.from(1.0, 2.0))
map<string, float> mp = map.new<string, float>()
float mg = map.get(mp, "a")
array<string> ks = map.keys(mp)
array<float> vs = map.values(mp)
```

```pine
//@version=6
indicator("x")
int a = math.abs(1)
float b = math.abs(1.0)
int c = math.round(1.2)
float d = math.round(1.2, 1)
int e = ta.change(bar_index)
float f = ta.change(close)
float g = str.tonumber("bad")
```

```pine
//@version=6
indicator("x")
plot p = plot(close)
hline h = hline(1)
label lab = label.new(bar_index, close, "x")
line ln = line.new(bar_index, close, bar_index + 1, close)
box bx = box.new(bar_index, high, bar_index + 1, low)
chart.point pt = chart.point.now(close)
table tbl = table.new(position.top_right, 1, 1)
```

The negative side of that same probe produced the expected type mismatches for
wrong assignments such as `string bad = math.sqrt(4)`,
`bool bad = str.tonumber("1")`, `int bad = label.get_text(...)`, and
`array<int> bad = array.new_float(...)`.

## Void Probe

The derived `void` probe selected side-effect candidates from the walked
signature table by namespace and operation role:

- visual/alert declarations and plot-family side effects;
- drawing `delete` and `set_*` calls;
- table creation-side mutators such as `table.cell`, `table.clear`,
  `table.delete`, `table.merge_cells`, and `table.*set*`;
- collection mutators documented by role;
- strategy order/risk commands;
- logging calls;
- `max_bars_back`.

Each candidate was checked with:

```pine
float x = <candidate-call>
```

Ten candidates already reject with the correct "returns no value" diagnostic:

```text
array.clear
array.fill
array.insert
array.push
array.reverse
array.set
array.sort
array.unshift
map.clear
map.put_all
```

The following 114 candidates incorrectly accept assignment to `float`:

```text
alert
alertcondition
barcolor
bgcolor
box.delete
box.set_bgcolor
box.set_border_color
box.set_border_style
box.set_border_width
box.set_bottom
box.set_bottom_right_point
box.set_extend
box.set_left
box.set_lefttop
box.set_right
box.set_rightbottom
box.set_text
box.set_text_color
box.set_text_font_family
box.set_text_formatting
box.set_text_halign
box.set_text_size
box.set_text_valign
box.set_text_wrap
box.set_top
box.set_top_left_point
box.set_xloc
fill
label.delete
label.set_color
label.set_point
label.set_size
label.set_style
label.set_text
label.set_text_font_family
label.set_text_formatting
label.set_textalign
label.set_textcolor
label.set_tooltip
label.set_x
label.set_xloc
label.set_xy
label.set_y
label.set_yloc
line.delete
line.set_color
line.set_extend
line.set_first_point
line.set_second_point
line.set_style
line.set_width
line.set_x1
line.set_x2
line.set_xloc
line.set_xy1
line.set_xy2
line.set_y1
line.set_y2
linefill.delete
linefill.set_color
log.error
log.info
log.warning
matrix.add_col
matrix.add_column
matrix.add_row
matrix.fill
matrix.reshape
matrix.reverse
matrix.set
matrix.sort
matrix.swap_columns
matrix.swap_rows
max_bars_back
plotarrow
plotbar
plotcandle
plotchar
plotshape
polyline.delete
strategy.cancel
strategy.cancel_all
strategy.close
strategy.close_all
strategy.entry
strategy.exit
strategy.order
strategy.risk.allow_entry_in
strategy.risk.max_cons_loss_days
strategy.risk.max_drawdown
strategy.risk.max_intraday_filled_orders
strategy.risk.max_intraday_loss
strategy.risk.max_position_size
table.cell
table.cell_set_bgcolor
table.cell_set_height
table.cell_set_text
table.cell_set_text_color
table.cell_set_text_font_family
table.cell_set_text_formatting
table.cell_set_text_halign
table.cell_set_text_size
table.cell_set_text_valign
table.cell_set_tooltip
table.cell_set_width
table.clear
table.delete
table.merge_cells
table.set_bgcolor
table.set_border_color
table.set_border_width
table.set_frame_color
table.set_frame_width
table.set_position
```

This is not evidence that these calls return a Pine `float`. It is evidence
that they do not currently return Pine `void` in TealScript's semantic model.
Most reach the final `unknown` return from `inferCallType()`, and typed
assignment accepts `unknown`.

## Cluster Answer

The failures cluster tightly:

- Namespace: visual/alert/drawing/table/matrix/strategy/log side-effect
  families.
- Return shape: `void` only.
- Root path: calls that do not have an explicit semantic return rule fall
  through to `unknown`.
- Already-correct siblings: array mutators and `map.clear`/`map.put_all` have
  explicit `void` inference and already refuse assignment.

No value-producing non-void cluster was found. The sampled fixed, tuple,
argument-dependent, collection, `na`, handle, and UDT-producing return paths
either accepted the documented target type or rejected an incompatible target
type.

## Classification Correction

Instrument suspicion paid here too. The derived void probe originally included
`matrix.remove_row()`, `matrix.remove_col()`, and `matrix.remove_column()` based
on mutating names alone. That was too strong: unlike insertion, reshaping,
swapping, sorting, and setting, the matrix removal calls return the removed
row/column array. The corrected non-void matrix removal return type means they
are not part of this `void` cluster.

## Limitations

TealScript does not currently carry a machine-readable official return-type
table in `PINE_V6_REFERENCE_SIGNATURES`; that table records names and
parameters. This audit therefore combines the walked signature surface with
manual-documented type rules, local semantic probes, existing documented value
vectors, and the independent `semanticTypeInvariants` return inferencer.

Runtime JavaScript values cannot distinguish every Pine type. In particular,
typed `na` values collapse to JavaScript `NaN`/sentinel values, so the decisive
check for `na` return typing is semantic compatibility, not runtime equality.

## Sources

- TradingView current type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- TradingView current user-defined functions:
  https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
