# TealScript Operator Semantics Audit v1

Date: 2026-09-12

Owner: TealScript runtime parity lane.

## Verdict

Three documented defect clusters found.

1. **Negative modulo uses JavaScript remainder semantics.** Pine v5/v6 define
   `%` through `a - b * math.floor(a / b)`, so the result follows the divisor
   side of the floor-quotient calculation. TealScript emits JavaScript `%`,
   which follows the dividend sign.
2. **Declared v4/v5 integer division is treated as v6 division.** The v4/v5
   operators pages say arithmetic with two integer operands returns an integer
   result. TealScript's semantic inference and runtime both return fractional
   values for `int / int` in v4/v5. The exact old-version quotient value for
   non-even division needs a separate oracle before fixing, because the old
   pages specify the return type but not the rounding direction.
3. **Operator operand/type diagnostics have holes.** The checker infers result
   types for valid operator pairs but does not generally reject invalid pairs
   when the result falls through as `unknown` or directly reaches runtime.
   Several v6-documented invalid operator shapes compile and execute through
   JavaScript coercion/comparison.

No defects found in the probed surfaces for unary `na`, explicit `int()`
conversion, mixed `int`/`float` equality, string+string concatenation, logical
`and`/`or` returning bool rather than operands, and compatible ternary type
unification.

PineTS was not used as evidence.

## Scope

Derived from the version-specific operators pages and the type-system pages:

- Arithmetic binary operators: `+`, `-`, `*`, `/`, `%`.
- Unary arithmetic operators: unary `+`, unary `-`.
- String concatenation through `+`.
- Comparison operators: `<`, `<=`, `!=`, `==`, `>`, `>=`.
- Logical operators: `not`, `and`, `or`.
- Ternary `?:` result selection and branch type unification.
- Compound assignment result typing for `+=`, `-=`, `*=`, `/=`, `%=`.
- Type-casting edges needed to adjudicate operator results, especially `int()`.
- Integer overflow / large-value behavior: manual-silent in the pages consulted,
  so unprobed rather than inferred from JavaScript number behavior.

Parser precedence was out of scope because that surface is already owned by the
parser lane. `na` propagation was out of scope except where needed to avoid
double-counting the previous `na` audit.

## Manual Evidence

TradingView v6 operators:

- Arithmetic operators are `+`, `-`, `*`, `/`, `%`; `+` also concatenates
  strings.
- Numeric arithmetic returns `float` if a float operand is present and `int` if
  both operands are int, but v6 explicitly notes that `5 / 2` is `2.5`.
- `%` is calculated by rounding down the quotient to the lowest possible value:
  `a - b * math.floor(nz(a / b))`.
- Equality and inequality work with fundamental types such as colors and
  strings; ordered comparisons are only applicable to numbers, so `"a" > "b"`
  is invalid.
- Logical operators are `not`, `and`, and `or` and their truth tables return
  bool values.

Source: https://www.tradingview.com/pine-script-docs/language/operators/

TradingView v5 operators:

- Arithmetic with at least one float operand returns float; arithmetic with two
  int operands returns int; arithmetic with `na` returns `na`.
- `+` concatenates strings when both operands are strings.
- `%` uses the same floor-quotient formula: `a - b * math.floor(nz(a/b))`.
- Comparisons with numeric operands return bool values, including legacy bool
  `na`.
- Ternary returns the false arm when the condition is false or `na`.

Source: https://www.tradingview.com/pine-script-docs/v5/language/operators/

TradingView v4 operators:

- Arithmetic with two integer operands returns integer; arithmetic with `na`
  returns `na`; `+` also concatenates strings.
- Comparisons over numeric operands return bool, and logical operators return
  bool.
- The v4 page does not give the v5/v6 negative modulo formula, so negative
  modulo is not claimed as v4-documented by this audit.

Source: https://www.tradingview.com/pine-script-docs/v4/language/operators/

TradingView v6 type system:

- The only automatic numeric cast is int to float; float to int requires an
  explicit cast.
- `int()` removes fractional information without rounding; `int(10.5)` returns
  `10`.
- Compatible operation results inherit the strongest qualifier. Literal-only
  expressions remain const; any series operand promotes the expression to
  series.

Source: https://www.tradingview.com/pine-script-docs/language/type-system/

TradingView v5 type system:

- Automatic casts include int to float and, for backward compatibility, numeric
  to bool in bool contexts.
- The v5 page does not document automatic string-to-number or number-to-string
  casting.
- `na` should be tested with `na(value)`, not direct equality.

Source: https://www.tradingview.com/pine-script-docs/v5/language/type-system/

## Probes

All probes used TealScript's parser, semantic checker, compiled runtime, and a
fixed synthetic bar set. They are local TealScript probes, not external-engine
votes.

### Defect Cluster 1: Negative Modulo

Probe:

```pine
//@version=6
indicator("modulo")
plot(-1 % 100, "a")
plot(1 % -100, "b")
plot(-101 % 100, "c")
```

Expected from the v6/v5 formula:

```text
-1 % 100   = 99
1 % -100   = -99
-101 % 100 = 99
```

Observed in v4, v5, and v6:

```text
-1, 1, -1
```

Classification:

- v5/v6: documented wrong.
- v4: observed same behavior, but manual-silent on the negative formula in this
  report.
- Cluster: one runtime lowering choice, JavaScript `%`, not per-member defects.
- Future vector discrimination: a positive-only modulo vector would pass under
  both models. A red-first vector must include negative operands on both sides
  of the operator.

### Defect Cluster 2: v4/v5 Integer Division

Probe:

```pine
//@version=5
indicator("division")
plot(5 / 2, "direct")
int b = bar_index
plot(b / 2, "series")
int x = b / 2
plot(x, "assigned")
```

Observed for v4/v5:

- `5 / 2` plots `2.5`.
- `bar_index / 2` plots `0, 0.5, 1, 1.5, 2`.
- `int x = b / 2` is refused as assigning float to int.

Observed for v6:

- Same fractional runtime values and float assignment refusal.
- This matches the v6 page's explicit `5/2 = 2.5` note.

Classification:

- v4/v5: documented wrong type/fractionality. The old pages say two-int
  arithmetic returns int.
- v6: correct.
- Exact old-version quotient value is unprobed. The docs used here say the
  result is int, but do not say whether non-even division truncates toward zero,
  floors, or follows another historical rule.
- Cluster: the codebase already has
  `PineVersionRules.constIntDivisionCanReturnFractional`, but semantic binary
  inference always returns float for `/`, and emitted runtime division always
  uses JavaScript `/`.
- Future vector discrimination: `5 / 2` alone distinguishes v6 from old-version
  integer result typing, but does not settle old-version rounding. A fix vector
  should first prove a trace or a manual-backed exact old-version quotient.

### Defect Cluster 3: Invalid Operator Operand Pairs Accepted

Representative v6 probes:

```pine
//@version=6
indicator("invalid operators")
plot("5" - 2)
plot("A" + 1)
plot(1 + "A")
plot("b" > "a" ? 1 : 0)
plot(color.red > color.blue ? 1 : 0)
plot(-"5")
plot(not 1 ? 1 : 0)
plot(close > open ? "x" : 1)
```

Observed:

- No semantic diagnostics for any representative above.
- Runtime executes through JavaScript:
  - `"5" - 2` plots `3`.
  - `"A" + 1` and `1 + "A"` produce string payloads that plot as `na`.
  - `"b" > "a"` plots `1`.
  - `color.red > color.blue` plots `1` due string comparison of color tokens.
  - `-"5"` plots `-5`.
  - `not 1` plots falsey/`0`.
  - Mixed string/number ternary reaches `plot()` instead of being rejected at
    branch type unification.

Manual basis:

- v6 ordered comparisons are only applicable to numerical values.
- v6 logical operators operate on bool truth tables; v6 numeric bool contexts
  are already otherwise rejected by the checker.
- Arithmetic operators are numeric, except string+string `+`.
- The type-system page documents automatic int-to-float casting and explicit
  casts; it does not document string/number coercion.

Classification:

- v6: documented wrong acceptance for the representative invalid shapes.
- v5/v4: partially documented wrong. v5 documents numeric-to-bool compatibility
  in bool contexts, so `not 1` is not a v5 defect. String/number arithmetic and
  ordered non-numeric comparison have no documented automatic cast; these should
  refuse under the same type-system rule that already refuses
  `array.percentile_*("50")`.
- Cluster: missing shared semantic operator-operand validation. Valid result
  inference exists; invalid pair refusal does not.
- Future vector discrimination: these should be refusal vectors, not output
  vectors. An output vector over `"5" - 2 == 3` would encode JavaScript
  contamination as canon; a correct vector must be red-first on the absence of
  a semantic diagnostic.

## Correct / No Defect Found

- v6 `int / int` runtime values are fractional and assignment to `int` is
  refused; this matches the v6 explicit division note and float-to-int casting
  rule.
- `int(10.9)` and `int(-10.9)` return `10` and `-10`, matching the documented
  "remove fractional information without rounding" rule.
- `1 == 1.0` returns true and is accepted, matching int-to-float promotion.
- `color.red == color.red` and `"a" == "a"` are accepted, matching v6 equality
  over fundamental types.
- `"EUR" + "USD"` returns `"EURUSD"`, matching string concatenation.
- Unary `+`/`-` over numeric operands, including `na`, follows numeric/`na`
  propagation.
- v5 numeric logical operands produce bool results and cannot be assigned to an
  int variable; this matches the v5 numeric-to-bool compatibility and logical
  truth-table result.
- Compatible ternary branches merge int/float to float and reject assignment to
  int. Incompatible branch-pair refusal belongs to defect cluster 3.

## Unprobed / Manual-Silent

- Integer overflow and large integer range behavior. The pages consulted do not
  state a Pine integer range or overflow policy, so this audit does not infer
  one from JavaScript `number`.
- Exact v4/v5 quotient value for non-even integer division. The old pages state
  the result type but not the rounding direction. A trace or stronger reference
  is needed before landing a value change.
- v4 negative modulo with negative operands. The v4 page names `%` as remainder
  but does not include the v5/v6 floor-quotient formula.

## Summary

Documented wrong operator behavior clusters: 3.

- Negative modulo: v5/v6 documented wrong runtime value; one runtime operator
  lowering.
- Old-version integer division: v4/v5 documented wrong type/fractionality; one
  version-rule hook exists but is not wired into semantic inference or runtime
  emission.
- Invalid operator operand pairs: v6 documented wrong acceptance, with v5/v4
  string/coercion siblings supported by type-system casting docs; one missing
  shared semantic validation path.

Rows are not the finding here. The causes are shared: JavaScript arithmetic and
comparison operators are being trusted where Pine defines different semantics,
and semantic operator validation is partial in the same way previous builtin
call-surface rules were partial.
