# Pine Array Reference Inventory

This inventory tracks TealScript's current `array.*` coverage. It is a local
implementation checklist, not a replacement for the TradingView reference
manual. Keep it in sync when runtime helpers, semantic inference, or diagnostics
change.

## Runtime Helpers

Implemented constructors:

- `array.new`
- `array.new_bool`
- `array.new_box`
- `array.new_color`
- `array.new_float`
- `array.new_int`
- `array.new_label`
- `array.new_line`
- `array.new_linefill`
- `array.new_polyline`
- `array.new_string`
- `array.new_table`
- `array.from`

Implemented mutation and access helpers:

- `array.clear`
- `array.concat`
- `array.copy`
- `array.fill`
- `array.first`
- `array.get`
- `array.insert`
- `array.last`
- `array.pop`
- `array.push`
- `array.remove`
- `array.set`
- `array.shift`
- `array.size`
- `array.slice`
- `array.unshift`

Implemented search, predicate, and ordering helpers:

- `array.binary_search`
- `array.binary_search_leftmost`
- `array.binary_search_rightmost`
- `array.every`
- `array.includes`
- `array.indexof`
- `array.join`
- `array.lastindexof`
- `array.reverse`
- `array.some`
- `array.sort`
- `array.sort_indices`

Implemented numeric/statistical helpers:

- `array.abs`
- `array.avg`
- `array.covariance`
- `array.max`
- `array.median`
- `array.min`
- `array.mode`
- `array.percentile_linear_interpolation`
- `array.percentile_nearest_rank`
- `array.percentrank`
- `array.range`
- `array.standardize`
- `array.stdev`
- `array.sum`
- `array.variance`

## Semantic Coverage

Implemented:

- `array.new<T>()` generic constructor arity and qualifier diagnostics.
- Element type inference for `array.new<T>()` and typed constructors.
- Element type inference for homogeneous array literals and `array.from(...)`,
  including numeric `int` to `float` widening.
- Element type propagation through `array.copy`, `array.slice`, `array.concat`,
  `array.abs`, `array.standardize`, and `array.sort_indices`.
- Element type propagation through index reads and element-returning helpers:
  `get`, `first`, `last`, `pop`, `shift`, and `remove`.
- Primitive return inference for scalar helpers: boolean predicates, search
  indices, numeric/statistical helpers, and `join`.
- Conservative mutation diagnostics for known array element types:
  `push`, `unshift`, `set`, `insert`, and `fill`.
- Conservative `concat` diagnostics for known target/source element types.
- Known array/map collection loop value typing and numeric index/counter typing.

## Remaining Audit Items

- Reconcile this list against the official Pine v6 reference whenever the
  bundled reference data is easier to extract or a manual reference pass is
  performed.
- Tighten exact `na`/missing-value ordering semantics for sorting and binary
  search edge cases.
- Expand element diagnostics beyond primitive widening once the broader
  type-system can represent object/reference type assignability precisely.
- Track exact Pine qualifiers for array helper return values instead of only
  primitive kinds.
